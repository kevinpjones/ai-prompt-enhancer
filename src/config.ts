import { readFileSync, existsSync, accessSync, constants } from "fs";
import { homedir } from "os";
import { join } from "path";
import type {
  Config,
  AuggieProviderConfig,
  ClaudeCliProviderConfig,
  ClaudeApiProviderConfig,
  GeminiCliProviderConfig,
  LegacyConfig,
  ProviderType,
  ValidationResult,
  ValidationError,
  ConfigLoadError,
  ConfigErrorType,
} from "./types.js";
import { VALID_PROVIDERS, VALID_AUGGIE_MODELS, VALID_CLAUDE_API_MODELS } from "./types.js";

const DEFAULT_WRAPPER_PROMPT = `You are a prompt enhancement assistant. Given the following rough prompt idea,
expand it into a clear, detailed, and actionable prompt for an AI coding assistant.

Consider:
- The workspace context and relevant files
- Specific, clear instructions
- Expected output format

Output:
 - Be concise, but thorough.
 - Provide actionable steps but do not include implementation details.
 - Include measures of success -- objective criteria to verify task completion
 - Include a detailed list of deliverables.

IMPORTANT: Provide an enhanced version that is comprehensive and context-aware.  Output ONLY the enhanced prompt, no explanations or preamble.

Original prompt to enhance:
--------------------------------
{input}
--------------------------------
`;

const DEFAULT_AUGGIE_MODEL = "sonnet4.6";
const DEFAULT_AUGGIE_PATH = "auggie";
const DEFAULT_CLAUDE_PATH = "claude";
const DEFAULT_GEMINI_PATH = "gemini";
const DEFAULT_CLAUDE_API_MODEL = "claude-sonnet-4-6";
const DEFAULT_PROVIDER: ProviderType = "auggie";

const CONFIG_FILE_PATH = join(homedir(), ".prompt-enhancer.json");

/**
 * Log a warning message to stderr
 */
function logWarning(message: string): void {
  process.stderr.write(`Warning: ${message}\n`);
}

// ============================================
// Legacy Config Detection and Migration
// ============================================

/**
 * Check if a config object is in legacy format (no provider field)
 */
function isLegacyConfig(config: unknown): config is LegacyConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    !Array.isArray(config) &&
    !("provider" in config)
  );
}

/**
 * Migrate legacy config format to new Auggie provider config
 */
function migrateLegacyConfig(legacy: LegacyConfig): AuggieProviderConfig {
  return {
    provider: "auggie",
    model: legacy.model || DEFAULT_AUGGIE_MODEL,
    wrapperPrompt: legacy.wrapperPrompt || DEFAULT_WRAPPER_PROMPT,
    auggiePath: legacy.auggiePath,
    rules: legacy.rules,
    cliArgs: legacy.cliArgs,
    tools: legacy.tools,
    showStderr: legacy.showStderr,
  };
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate provider field
 */
function validateProvider(provider: unknown): ValidationError | null {
  if (provider === undefined || provider === null) {
    return null; // Will use default
  }
  if (typeof provider !== "string") {
    return {
      field: "provider",
      message: `Expected a string, got ${typeof provider}`,
      value: provider,
    };
  }
  if (!VALID_PROVIDERS.includes(provider as ProviderType)) {
    return {
      field: "provider",
      message: `Invalid provider "${provider}". Valid options: ${VALID_PROVIDERS.join(", ")}`,
      value: provider,
    };
  }
  return null;
}

/**
 * Validate the model field for Auggie provider
 */
function validateAuggieModel(model: unknown): ValidationError | null {
  if (model === undefined || model === null) {
    return null; // Optional, will use default
  }
  if (typeof model !== "string") {
    return {
      field: "model",
      message: `Expected a string, got ${typeof model}`,
      value: model,
    };
  }
  if (!VALID_AUGGIE_MODELS.includes(model as (typeof VALID_AUGGIE_MODELS)[number])) {
    return {
      field: "model",
      message: `Invalid Auggie model "${model}". Valid options: ${VALID_AUGGIE_MODELS.join(", ")}`,
      value: model,
    };
  }
  return null;
}

/**
 * Validate the model field for Claude API provider
 */
function validateClaudeApiModel(model: unknown): ValidationError | null {
  if (model === undefined || model === null) {
    return null; // Optional, will use default
  }
  if (typeof model !== "string") {
    return {
      field: "model",
      message: `Expected a string, got ${typeof model}`,
      value: model,
    };
  }
  // Allow any model string for Claude API (they add new models frequently)
  // but warn if not in known list
  if (!VALID_CLAUDE_API_MODELS.includes(model as (typeof VALID_CLAUDE_API_MODELS)[number])) {
    logWarning(
      `Model "${model}" is not in the known Claude API models list. It may still work if valid.`
    );
  }
  return null;
}

/**
 * Validate the wrapperPrompt field
 */
function validateWrapperPrompt(wrapperPrompt: unknown): ValidationError | null {
  if (wrapperPrompt === undefined || wrapperPrompt === null) {
    return null; // Optional, will use default
  }
  if (typeof wrapperPrompt !== "string") {
    return {
      field: "wrapperPrompt",
      message: `Expected a string, got ${typeof wrapperPrompt}`,
      value: wrapperPrompt,
    };
  }
  if (!wrapperPrompt.includes("{input}")) {
    return {
      field: "wrapperPrompt",
      message:
        "wrapperPrompt must contain the {input} placeholder for the original text to be inserted",
      value: wrapperPrompt.substring(0, 100) + (wrapperPrompt.length > 100 ? "..." : ""),
    };
  }
  return null;
}

/**
 * Validate the rules field
 */
function validateRules(rules: unknown): ValidationError | null {
  if (rules === undefined || rules === null) {
    return null; // Optional
  }
  if (!Array.isArray(rules)) {
    return {
      field: "rules",
      message: `Expected an array of file paths, got ${typeof rules}`,
      value: rules,
    };
  }
  const invalidItems = rules
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => typeof item !== "string");

  if (invalidItems.length > 0) {
    return {
      field: "rules",
      message: `All rules must be strings (file paths). Invalid items at indices: ${invalidItems.map((i) => i.index).join(", ")}`,
      value: invalidItems.map((i) => i.item),
    };
  }

  const emptyItems = rules
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => typeof item === "string" && item.trim() === "");

  if (emptyItems.length > 0) {
    return {
      field: "rules",
      message: `Rule paths cannot be empty strings. Empty items at indices: ${emptyItems.map((i) => i.index).join(", ")}`,
      value: emptyItems,
    };
  }

  return null;
}

/**
 * Validate the cliArgs field
 */
function validateCliArgs(cliArgs: unknown): ValidationError | null {
  if (cliArgs === undefined || cliArgs === null) {
    return null; // Optional
  }
  if (!Array.isArray(cliArgs)) {
    return {
      field: "cliArgs",
      message: `Expected an array of strings, got ${typeof cliArgs}`,
      value: cliArgs,
    };
  }
  const invalidItems = cliArgs
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => typeof item !== "string");

  if (invalidItems.length > 0) {
    return {
      field: "cliArgs",
      message: `All CLI arguments must be strings. Invalid items at indices: ${invalidItems.map((i) => i.index).join(", ")}`,
      value: invalidItems.map((i) => i.item),
    };
  }
  return null;
}

/**
 * Validate a path field (auggiePath, claudePath)
 */
function validatePath(path: unknown, fieldName: string): ValidationError | null {
  if (path === undefined || path === null) {
    return null; // Optional, will use default
  }
  if (typeof path !== "string") {
    return {
      field: fieldName,
      message: `Expected a string, got ${typeof path}`,
      value: path,
    };
  }
  if (path.trim() === "") {
    return {
      field: fieldName,
      message: `${fieldName} cannot be an empty string`,
      value: path,
    };
  }
  return null;
}

/**
 * Validate maxTokens field for Claude API
 */
function validateMaxTokens(maxTokens: unknown): ValidationError | null {
  if (maxTokens === undefined || maxTokens === null) {
    return null; // Optional
  }
  if (typeof maxTokens !== "number" || !Number.isInteger(maxTokens) || maxTokens <= 0) {
    return {
      field: "maxTokens",
      message: `maxTokens must be a positive integer, got ${typeof maxTokens === "number" ? maxTokens : typeof maxTokens}`,
      value: maxTokens,
    };
  }
  return null;
}

/**
 * Get known fields for a provider type
 */
function getKnownFieldsForProvider(provider: ProviderType): Set<string> {
  const commonFields = ["provider", "wrapperPrompt", "showStderr"];

  switch (provider) {
    case "auggie":
      return new Set([...commonFields, "model", "auggiePath", "rules", "cliArgs", "tools"]);
    case "claude-cli":
      return new Set([...commonFields, "model", "claudePath", "cliArgs"]);
    case "gemini-cli":
      return new Set([...commonFields, "model", "geminiPath", "cliArgs"]);
    case "claude-api":
      return new Set([...commonFields, "model", "apiKey", "maxTokens"]);
    default:
      return new Set(commonFields);
  }
}

/**
 * Validate a loaded configuration object based on provider
 */
export function validateConfig(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (config === null || config === undefined) {
    return { valid: true, errors: [], warnings: [] };
  }

  if (typeof config !== "object" || Array.isArray(config)) {
    errors.push({
      field: "root",
      message: `Configuration must be a JSON object, got ${Array.isArray(config) ? "array" : typeof config}`,
      value: config,
    });
    return { valid: false, errors, warnings };
  }

  const configObj = config as Record<string, unknown>;

  // Validate provider field first
  const providerError = validateProvider(configObj.provider);
  if (providerError) {
    errors.push(providerError);
    return { valid: false, errors, warnings };
  }

  const provider = (configObj.provider as ProviderType) || DEFAULT_PROVIDER;

  // Common validation
  const wrapperPromptError = validateWrapperPrompt(configObj.wrapperPrompt);
  if (wrapperPromptError) errors.push(wrapperPromptError);

  // Provider-specific validation
  switch (provider) {
    case "auggie": {
      const modelError = validateAuggieModel(configObj.model);
      if (modelError) errors.push(modelError);

      const pathError = validatePath(configObj.auggiePath, "auggiePath");
      if (pathError) errors.push(pathError);

      const rulesError = validateRules(configObj.rules);
      if (rulesError) errors.push(rulesError);

      const cliArgsError = validateCliArgs(configObj.cliArgs);
      if (cliArgsError) errors.push(cliArgsError);
      break;
    }

    case "claude-cli": {
      const pathError = validatePath(configObj.claudePath, "claudePath");
      if (pathError) errors.push(pathError);

      const cliArgsError = validateCliArgs(configObj.cliArgs);
      if (cliArgsError) errors.push(cliArgsError);
      break;
    }

    case "gemini-cli": {
      const pathError = validatePath(configObj.geminiPath, "geminiPath");
      if (pathError) errors.push(pathError);

      const cliArgsError = validateCliArgs(configObj.cliArgs);
      if (cliArgsError) errors.push(cliArgsError);
      break;
    }

    case "claude-api": {
      const modelError = validateClaudeApiModel(configObj.model);
      if (modelError) errors.push(modelError);

      const maxTokensError = validateMaxTokens(configObj.maxTokens);
      if (maxTokensError) errors.push(maxTokensError);
      break;
    }
  }

  // Check for unknown fields
  const knownFields = getKnownFieldsForProvider(provider);
  for (const key of Object.keys(configObj)) {
    if (!knownFields.has(key)) {
      warnings.push({
        field: key,
        message: `Unknown configuration field "${key}" for provider "${provider}" will be ignored`,
        value: configObj[key],
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// Error Handling
// ============================================

/**
 * Classify an error into a ConfigErrorType
 */
function classifyError(error: unknown): ConfigErrorType {
  if (error instanceof SyntaxError) {
    return "JSON_PARSE";
  }

  if (error instanceof Error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return "FILE_NOT_FOUND";
    }
    if (nodeError.code === "EACCES" || nodeError.code === "EPERM") {
      return "FILE_PERMISSION";
    }
    if (nodeError.code === "EISDIR" || nodeError.code === "EIO" || nodeError.code === "EMFILE") {
      return "FILE_READ";
    }
  }

  return "UNKNOWN";
}

/**
 * Create a detailed error message based on error type
 */
function createErrorDetails(
  error: unknown,
  errorType: ConfigErrorType,
  filePath: string
): ConfigLoadError {
  const baseError: ConfigLoadError = {
    type: errorType,
    message: "",
    filePath,
  };

  switch (errorType) {
    case "JSON_PARSE":
      baseError.message = `Failed to parse configuration file as JSON`;
      if (error instanceof SyntaxError) {
        baseError.details = `${error.message}. Please check JSON syntax (missing commas, quotes, brackets, etc.)`;
      }
      break;

    case "FILE_PERMISSION":
      baseError.message = `Permission denied reading configuration file`;
      baseError.details = `Check that you have read permissions for ${filePath}`;
      break;

    case "FILE_READ":
      baseError.message = `Failed to read configuration file`;
      if (error instanceof Error) {
        baseError.details = error.message;
      }
      break;

    case "FILE_NOT_FOUND":
      baseError.message = `Configuration file not found`;
      break;

    default:
      baseError.message = `Unexpected error loading configuration`;
      if (error instanceof Error) {
        baseError.details = error.message;
      }
      break;
  }

  return baseError;
}

/**
 * Parse and validate JSON content, handling edge cases
 */
function parseConfigContent(content: string): {
  config: Record<string, unknown> | null;
  error: ConfigLoadError | null;
} {
  const trimmed = content.trim();
  if (trimmed === "") {
    return { config: {}, error: null };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return { config: parsed, error: null };
  } catch (error) {
    return {
      config: null,
      error: createErrorDetails(error, "JSON_PARSE", CONFIG_FILE_PATH),
    };
  }
}

// ============================================
// Default Config Builders
// ============================================

/**
 * Create default Auggie provider config
 */
function createDefaultAuggieConfig(): AuggieProviderConfig {
  return {
    provider: "auggie",
    model: DEFAULT_AUGGIE_MODEL,
    wrapperPrompt: DEFAULT_WRAPPER_PROMPT,
    auggiePath: DEFAULT_AUGGIE_PATH,
    rules: [],
    cliArgs: [],
    tools: {},
    showStderr: false,
  };
}

/**
 * Create default Claude CLI provider config
 */
function createDefaultClaudeCliConfig(): ClaudeCliProviderConfig {
  return {
    provider: "claude-cli",
    wrapperPrompt: DEFAULT_WRAPPER_PROMPT,
    claudePath: DEFAULT_CLAUDE_PATH,
    cliArgs: [],
    showStderr: false,
  };
}

/**
 * Create default Gemini CLI provider config
 */
function createDefaultGeminiCliConfig(): GeminiCliProviderConfig {
  return {
    provider: "gemini-cli",
    wrapperPrompt: DEFAULT_WRAPPER_PROMPT,
    geminiPath: DEFAULT_GEMINI_PATH,
    cliArgs: [],
    showStderr: false,
  };
}

/**
 * Create default Claude API provider config
 */
function createDefaultClaudeApiConfig(): ClaudeApiProviderConfig {
  return {
    provider: "claude-api",
    model: DEFAULT_CLAUDE_API_MODEL,
    wrapperPrompt: DEFAULT_WRAPPER_PROMPT,
    maxTokens: 4096,
    showStderr: false,
  };
}

/**
 * Create default config for a provider type
 */
function createDefaultConfig(provider: ProviderType): Config {
  switch (provider) {
    case "auggie":
      return createDefaultAuggieConfig();
    case "claude-cli":
      return createDefaultClaudeCliConfig();
    case "gemini-cli":
      return createDefaultGeminiCliConfig();
    case "claude-api":
      return createDefaultClaudeApiConfig();
    default:
      return createDefaultAuggieConfig();
  }
}

// ============================================
// Config Merging
// ============================================

/**
 * Merge parsed Auggie config with defaults
 */
function mergeAuggieConfig(
  defaults: AuggieProviderConfig,
  parsed: Record<string, unknown>,
  invalidFields: Set<string>
): AuggieProviderConfig {
  return {
    provider: "auggie",
    model:
      !invalidFields.has("model") && parsed.model !== undefined
        ? String(parsed.model)
        : defaults.model,
    wrapperPrompt:
      !invalidFields.has("wrapperPrompt") && parsed.wrapperPrompt !== undefined
        ? String(parsed.wrapperPrompt)
        : defaults.wrapperPrompt,
    auggiePath:
      !invalidFields.has("auggiePath") && parsed.auggiePath !== undefined
        ? String(parsed.auggiePath)
        : defaults.auggiePath,
    rules:
      !invalidFields.has("rules") && Array.isArray(parsed.rules)
        ? (parsed.rules as string[])
        : defaults.rules,
    cliArgs:
      !invalidFields.has("cliArgs") && Array.isArray(parsed.cliArgs)
        ? (parsed.cliArgs as string[])
        : defaults.cliArgs,
    tools: parsed.tools !== undefined ? (parsed.tools as Record<string, unknown>) : defaults.tools,
    showStderr: typeof parsed.showStderr === "boolean" ? parsed.showStderr : defaults.showStderr,
  };
}

/**
 * Merge parsed Claude CLI config with defaults
 */
function mergeClaudeCliConfig(
  defaults: ClaudeCliProviderConfig,
  parsed: Record<string, unknown>,
  invalidFields: Set<string>
): ClaudeCliProviderConfig {
  return {
    provider: "claude-cli",
    wrapperPrompt:
      !invalidFields.has("wrapperPrompt") && parsed.wrapperPrompt !== undefined
        ? String(parsed.wrapperPrompt)
        : defaults.wrapperPrompt,
    claudePath:
      !invalidFields.has("claudePath") && parsed.claudePath !== undefined
        ? String(parsed.claudePath)
        : defaults.claudePath,
    model: parsed.model !== undefined ? String(parsed.model) : defaults.model,
    cliArgs:
      !invalidFields.has("cliArgs") && Array.isArray(parsed.cliArgs)
        ? (parsed.cliArgs as string[])
        : defaults.cliArgs,
    showStderr: typeof parsed.showStderr === "boolean" ? parsed.showStderr : defaults.showStderr,
  };
}

/**
 * Merge parsed Gemini CLI config with defaults
 */
function mergeGeminiCliConfig(
  defaults: GeminiCliProviderConfig,
  parsed: Record<string, unknown>,
  invalidFields: Set<string>
): GeminiCliProviderConfig {
  return {
    provider: "gemini-cli",
    wrapperPrompt:
      !invalidFields.has("wrapperPrompt") && parsed.wrapperPrompt !== undefined
        ? String(parsed.wrapperPrompt)
        : defaults.wrapperPrompt,
    geminiPath:
      !invalidFields.has("geminiPath") && parsed.geminiPath !== undefined
        ? String(parsed.geminiPath)
        : defaults.geminiPath,
    model: parsed.model !== undefined ? String(parsed.model) : defaults.model,
    cliArgs:
      !invalidFields.has("cliArgs") && Array.isArray(parsed.cliArgs)
        ? (parsed.cliArgs as string[])
        : defaults.cliArgs,
    showStderr: typeof parsed.showStderr === "boolean" ? parsed.showStderr : defaults.showStderr,
  };
}

/**
 * Merge parsed Claude API config with defaults
 */
function mergeClaudeApiConfig(
  defaults: ClaudeApiProviderConfig,
  parsed: Record<string, unknown>,
  invalidFields: Set<string>
): ClaudeApiProviderConfig {
  return {
    provider: "claude-api",
    wrapperPrompt:
      !invalidFields.has("wrapperPrompt") && parsed.wrapperPrompt !== undefined
        ? String(parsed.wrapperPrompt)
        : defaults.wrapperPrompt,
    model:
      !invalidFields.has("model") && parsed.model !== undefined
        ? String(parsed.model)
        : defaults.model,
    apiKey: parsed.apiKey !== undefined ? String(parsed.apiKey) : defaults.apiKey,
    maxTokens:
      !invalidFields.has("maxTokens") && typeof parsed.maxTokens === "number"
        ? parsed.maxTokens
        : defaults.maxTokens,
    showStderr: typeof parsed.showStderr === "boolean" ? parsed.showStderr : defaults.showStderr,
  };
}

/**
 * Merge parsed config with defaults based on provider
 */
function mergeConfigWithDefaults(
  parsed: Record<string, unknown>,
  validation: ValidationResult
): Config {
  const invalidFields = new Set(validation.errors.map((e) => e.field));
  const provider = (parsed.provider as ProviderType) || DEFAULT_PROVIDER;

  switch (provider) {
    case "auggie":
      return mergeAuggieConfig(createDefaultAuggieConfig(), parsed, invalidFields);
    case "claude-cli":
      return mergeClaudeCliConfig(createDefaultClaudeCliConfig(), parsed, invalidFields);
    case "gemini-cli":
      return mergeGeminiCliConfig(createDefaultGeminiCliConfig(), parsed, invalidFields);
    case "claude-api":
      return mergeClaudeApiConfig(createDefaultClaudeApiConfig(), parsed, invalidFields);
    default:
      return mergeAuggieConfig(createDefaultAuggieConfig(), parsed, invalidFields);
  }
}

// ============================================
// Environment Overrides
// ============================================

/**
 * Apply environment variable overrides to configuration
 */
function applyEnvironmentOverrides(config: Config): Config {
  // Check for provider override first
  const envProvider = process.env.PROMPT_ENHANCER_PROVIDER as ProviderType | undefined;
  if (envProvider && VALID_PROVIDERS.includes(envProvider) && envProvider !== config.provider) {
    // Provider changed via environment, create new default config for that provider
    config = createDefaultConfig(envProvider);
  }

  // Common overrides
  if (process.env.PROMPT_ENHANCER_PROMPT) {
    const envPrompt = process.env.PROMPT_ENHANCER_PROMPT;
    const promptError = validateWrapperPrompt(envPrompt);
    if (promptError) {
      logWarning(`Environment PROMPT_ENHANCER_PROMPT: ${promptError.message}`);
    } else {
      config.wrapperPrompt = envPrompt;
    }
  }

  // showStderr override (accepts "true", "1", "yes" as truthy values)
  if (process.env.PROMPT_ENHANCER_SHOW_STDERR) {
    const value = process.env.PROMPT_ENHANCER_SHOW_STDERR.toLowerCase();
    config.showStderr = value === "true" || value === "1" || value === "yes";
  }

  // Provider-specific overrides
  switch (config.provider) {
    case "auggie": {
      const auggieConfig = config as AuggieProviderConfig;

      if (process.env.PROMPT_ENHANCER_MODEL) {
        const envModel = process.env.PROMPT_ENHANCER_MODEL;
        const modelError = validateAuggieModel(envModel);
        if (modelError) {
          logWarning(`Environment PROMPT_ENHANCER_MODEL: ${modelError.message}`);
        } else {
          auggieConfig.model = envModel;
        }
      }

      if (process.env.PROMPT_ENHANCER_AUGGIE_PATH) {
        auggieConfig.auggiePath = process.env.PROMPT_ENHANCER_AUGGIE_PATH;
      }

      if (process.env.PROMPT_ENHANCER_RULES) {
        auggieConfig.rules = process.env.PROMPT_ENHANCER_RULES.split(",")
          .map((r) => r.trim())
          .filter((r) => r !== "");
      }

      if (process.env.PROMPT_ENHANCER_CLI_ARGS) {
        auggieConfig.cliArgs = process.env.PROMPT_ENHANCER_CLI_ARGS.split(",")
          .map((a) => a.trim())
          .filter((a) => a !== "");
      }
      break;
    }

    case "claude-cli": {
      const claudeCliConfig = config as ClaudeCliProviderConfig;

      if (process.env.PROMPT_ENHANCER_CLAUDE_PATH) {
        claudeCliConfig.claudePath = process.env.PROMPT_ENHANCER_CLAUDE_PATH;
      }

      if (process.env.PROMPT_ENHANCER_MODEL) {
        claudeCliConfig.model = process.env.PROMPT_ENHANCER_MODEL;
      }

      if (process.env.PROMPT_ENHANCER_CLI_ARGS) {
        claudeCliConfig.cliArgs = process.env.PROMPT_ENHANCER_CLI_ARGS.split(",")
          .map((a) => a.trim())
          .filter((a) => a !== "");
      }
      break;
    }

    case "gemini-cli": {
      const geminiCliConfig = config as GeminiCliProviderConfig;

      if (process.env.PROMPT_ENHANCER_GEMINI_PATH) {
        geminiCliConfig.geminiPath = process.env.PROMPT_ENHANCER_GEMINI_PATH;
      }

      if (process.env.PROMPT_ENHANCER_MODEL) {
        geminiCliConfig.model = process.env.PROMPT_ENHANCER_MODEL;
      }

      if (process.env.PROMPT_ENHANCER_CLI_ARGS) {
        geminiCliConfig.cliArgs = process.env.PROMPT_ENHANCER_CLI_ARGS.split(",")
          .map((a) => a.trim())
          .filter((a) => a !== "");
      }
      break;
    }

    case "claude-api": {
      const claudeApiConfig = config as ClaudeApiProviderConfig;

      if (process.env.PROMPT_ENHANCER_MODEL) {
        claudeApiConfig.model = process.env.PROMPT_ENHANCER_MODEL;
      }

      // Note: ANTHROPIC_API_KEY is handled by the provider itself
      if (process.env.PROMPT_ENHANCER_API_KEY) {
        claudeApiConfig.apiKey = process.env.PROMPT_ENHANCER_API_KEY;
      }

      if (process.env.PROMPT_ENHANCER_MAX_TOKENS) {
        const maxTokens = parseInt(process.env.PROMPT_ENHANCER_MAX_TOKENS, 10);
        if (!isNaN(maxTokens) && maxTokens > 0) {
          claudeApiConfig.maxTokens = maxTokens;
        }
      }
      break;
    }
  }

  return config;
}

// ============================================
// Main Config Loader
// ============================================

/**
 * Load configuration with priority:
 * 1. Environment variables (highest priority)
 * 2. Config file (~/.prompt-enhancer.json)
 * 3. Defaults (lowest priority)
 *
 * Supports multiple providers: auggie, claude-cli, gemini-cli, claude-api
 * Maintains backward compatibility with legacy config format (defaults to auggie)
 */
export function loadConfig(): Config {
  // Default to Auggie provider
  let config: Config = createDefaultAuggieConfig();

  // Try to load from config file
  if (existsSync(CONFIG_FILE_PATH)) {
    let fileContent: string;

    // Step 1: Check file permissions
    try {
      accessSync(CONFIG_FILE_PATH, constants.R_OK);
    } catch (error) {
      const errorType = classifyError(error);
      const configError = createErrorDetails(error, errorType, CONFIG_FILE_PATH);
      logWarning(`${configError.message}${configError.details ? `: ${configError.details}` : ""}`);
      logWarning("Using default configuration");
      return applyEnvironmentOverrides(config);
    }

    // Step 2: Read file content
    try {
      fileContent = readFileSync(CONFIG_FILE_PATH, "utf-8");
    } catch (error) {
      const errorType = classifyError(error);
      const configError = createErrorDetails(error, errorType, CONFIG_FILE_PATH);
      logWarning(`${configError.message}${configError.details ? `: ${configError.details}` : ""}`);
      logWarning("Using default configuration");
      return applyEnvironmentOverrides(config);
    }

    // Step 3: Parse JSON content
    const { config: parsedConfig, error: parseError } = parseConfigContent(fileContent);
    if (parseError) {
      logWarning(`${parseError.message}${parseError.details ? `: ${parseError.details}` : ""}`);
      logWarning("Using default configuration");
      return applyEnvironmentOverrides(config);
    }

    if (parsedConfig) {
      // Step 4: Handle legacy config format (no provider field)
      if (isLegacyConfig(parsedConfig)) {
        const migratedConfig = migrateLegacyConfig(parsedConfig as LegacyConfig);
        // Validate the migrated config
        const validationResult = validateConfig(migratedConfig);
        for (const warning of validationResult.warnings) {
          logWarning(`Config: ${warning.message}`);
        }
        if (!validationResult.valid) {
          for (const error of validationResult.errors) {
            logWarning(`Config error in "${error.field}": ${error.message}`);
          }
          logWarning("Invalid fields will use default values");
        }
        config = mergeConfigWithDefaults(
          migratedConfig as unknown as Record<string, unknown>,
          validationResult
        );
      } else {
        // Step 5: Validate new format configuration
        const validationResult = validateConfig(parsedConfig);

        for (const warning of validationResult.warnings) {
          logWarning(`Config: ${warning.message}`);
        }

        if (!validationResult.valid) {
          for (const error of validationResult.errors) {
            logWarning(`Config error in "${error.field}": ${error.message}`);
          }

          const hasCriticalError = validationResult.errors.some(
            (e) => e.field === "root" || e.field === "provider"
          );

          if (hasCriticalError) {
            logWarning("Using default configuration due to invalid config structure");
            return applyEnvironmentOverrides(config);
          }

          logWarning("Invalid fields will use default values");
        }

        config = mergeConfigWithDefaults(parsedConfig, validationResult);
      }
    }
  }

  // Apply environment variable overrides
  return applyEnvironmentOverrides(config);
}

/**
 * Build the full prompt by inserting the input into the wrapper template
 */
export function buildPrompt(wrapperPrompt: string, input: string): string {
  return wrapperPrompt.replace("{input}", input);
}
