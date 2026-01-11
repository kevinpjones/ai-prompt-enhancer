import { readFileSync, existsSync, accessSync, constants } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { Config, ValidationResult, ValidationError, ConfigLoadError, ConfigErrorType } from "./types.js";
import { VALID_MODELS } from "./types.js";

const DEFAULT_WRAPPER_PROMPT = `You are a prompt enhancement assistant. Given the following rough prompt idea,
expand it into a clear, detailed, and actionable prompt for an AI coding assistant.

Consider:
- The workspace context and relevant files
- Specific, clear instructions
- Expected output format

Original prompt to enhance:
{input}

Provide an enhanced version that is comprehensive and context-aware. Output ONLY the enhanced prompt, no explanations or preamble.`;

const DEFAULT_MODEL = "sonnet4.5";
const DEFAULT_AUGGIE_PATH = "auggie";

const CONFIG_FILE_PATH = join(homedir(), ".prompt-enhancer.json");

/**
 * Log a warning message to stderr
 */
function logWarning(message: string): void {
  process.stderr.write(`Warning: ${message}\n`);
}

/**
 * Validate the model field
 */
function validateModel(model: unknown): ValidationError | null {
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
  if (!VALID_MODELS.includes(model as typeof VALID_MODELS[number])) {
    return {
      field: "model",
      message: `Invalid model "${model}". Valid options: ${VALID_MODELS.join(", ")}`,
      value: model,
    };
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
      message: "wrapperPrompt must contain the {input} placeholder for the original text to be inserted",
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
      message: `All rules must be strings (file paths). Invalid items at indices: ${invalidItems.map(i => i.index).join(", ")}`,
      value: invalidItems.map(i => i.item),
    };
  }

  // Check for empty strings
  const emptyItems = rules
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => typeof item === "string" && item.trim() === "");

  if (emptyItems.length > 0) {
    return {
      field: "rules",
      message: `Rule paths cannot be empty strings. Empty items at indices: ${emptyItems.map(i => i.index).join(", ")}`,
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
      message: `All CLI arguments must be strings. Invalid items at indices: ${invalidItems.map(i => i.index).join(", ")}`,
      value: invalidItems.map(i => i.item),
    };
  }
  return null;
}

/**
 * Validate the auggiePath field
 */
function validateAuggiePath(auggiePath: unknown): ValidationError | null {
  if (auggiePath === undefined || auggiePath === null) {
    return null; // Optional, will use default
  }
  if (typeof auggiePath !== "string") {
    return {
      field: "auggiePath",
      message: `Expected a string, got ${typeof auggiePath}`,
      value: auggiePath,
    };
  }
  if (auggiePath.trim() === "") {
    return {
      field: "auggiePath",
      message: "auggiePath cannot be an empty string",
      value: auggiePath,
    };
  }
  return null;
}

/**
 * Validate a loaded configuration object
 * Returns validation result with errors and warnings
 */
export function validateConfig(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check if config is an object
  if (config === null || config === undefined) {
    return { valid: true, errors: [], warnings: [] }; // Empty config is valid, will use defaults
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

  // Validate each field
  const modelError = validateModel(configObj.model);
  if (modelError) errors.push(modelError);

  const wrapperPromptError = validateWrapperPrompt(configObj.wrapperPrompt);
  if (wrapperPromptError) errors.push(wrapperPromptError);

  const rulesError = validateRules(configObj.rules);
  if (rulesError) errors.push(rulesError);

  const cliArgsError = validateCliArgs(configObj.cliArgs);
  if (cliArgsError) errors.push(cliArgsError);

  const auggiePathError = validateAuggiePath(configObj.auggiePath);
  if (auggiePathError) errors.push(auggiePathError);

  // Check for unknown fields (warning only)
  const knownFields = new Set(["model", "wrapperPrompt", "tools", "auggiePath", "rules", "cliArgs"]);
  for (const key of Object.keys(configObj)) {
    if (!knownFields.has(key)) {
      warnings.push({
        field: key,
        message: `Unknown configuration field "${key}" will be ignored`,
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
function createErrorDetails(error: unknown, errorType: ConfigErrorType, filePath: string): ConfigLoadError {
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
function parseConfigContent(content: string): { config: Partial<Config> | null; error: ConfigLoadError | null } {
  // Handle empty or whitespace-only content
  const trimmed = content.trim();
  if (trimmed === "") {
    return { config: {}, error: null }; // Empty file is valid, use defaults
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

/**
 * Load configuration with priority:
 * 1. Environment variables (highest priority)
 * 2. Config file (~/.prompt-enhancer.json)
 * 3. Defaults (lowest priority)
 *
 * Provides detailed error messages for different failure modes while
 * maintaining backward compatibility by falling back to defaults.
 */
export function loadConfig(): Config {
  // Start with defaults
  let config: Config = {
    model: DEFAULT_MODEL,
    wrapperPrompt: DEFAULT_WRAPPER_PROMPT,
    tools: {},
    auggiePath: DEFAULT_AUGGIE_PATH,
    rules: [],
    cliArgs: [],
  };

  // Try to load from config file
  if (existsSync(CONFIG_FILE_PATH)) {
    let fileContent: string;

    // Step 1: Check file permissions before reading
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

    // Step 4: Validate configuration structure
    const validationResult = validateConfig(parsedConfig);

    // Log any warnings (unknown fields, etc.)
    for (const warning of validationResult.warnings) {
      logWarning(`Config: ${warning.message}`);
    }

    // Handle validation errors
    if (!validationResult.valid) {
      for (const error of validationResult.errors) {
        logWarning(`Config error in "${error.field}": ${error.message}`);
      }

      // For non-critical errors (like invalid model), we can still use partial config
      // Only fail completely if the config structure is fundamentally broken
      const hasCriticalError = validationResult.errors.some(e => e.field === "root");

      if (hasCriticalError) {
        logWarning("Using default configuration due to invalid config structure");
        return applyEnvironmentOverrides(config);
      }

      // For field-level errors, use defaults for invalid fields but apply valid ones
      logWarning("Invalid fields will use default values");
    }

    // Step 5: Merge valid configuration with defaults
    if (parsedConfig) {
      config = mergeConfigWithDefaults(config, parsedConfig, validationResult);
    }
  }

  // Apply environment variable overrides
  return applyEnvironmentOverrides(config);
}

/**
 * Merge parsed config with defaults, skipping invalid fields
 */
function mergeConfigWithDefaults(
  defaults: Config,
  parsed: Partial<Config>,
  validation: ValidationResult
): Config {
  const invalidFields = new Set(validation.errors.map(e => e.field));
  const result = { ...defaults };

  // Only apply fields that passed validation
  if (parsed.model !== undefined && !invalidFields.has("model")) {
    result.model = parsed.model;
  }
  if (parsed.wrapperPrompt !== undefined && !invalidFields.has("wrapperPrompt")) {
    result.wrapperPrompt = parsed.wrapperPrompt;
  }
  if (parsed.auggiePath !== undefined && !invalidFields.has("auggiePath")) {
    result.auggiePath = parsed.auggiePath;
  }
  if (parsed.rules !== undefined && !invalidFields.has("rules")) {
    result.rules = parsed.rules;
  }
  if (parsed.cliArgs !== undefined && !invalidFields.has("cliArgs")) {
    result.cliArgs = parsed.cliArgs;
  }
  if (parsed.tools !== undefined) {
    result.tools = parsed.tools;
  }

  return result;
}

/**
 * Apply environment variable overrides to configuration
 */
function applyEnvironmentOverrides(config: Config): Config {
  const result = { ...config };

  if (process.env.PROMPT_ENHANCER_MODEL) {
    const envModel = process.env.PROMPT_ENHANCER_MODEL;
    const modelError = validateModel(envModel);
    if (modelError) {
      logWarning(`Environment PROMPT_ENHANCER_MODEL: ${modelError.message}`);
    } else {
      result.model = envModel;
    }
  }

  if (process.env.PROMPT_ENHANCER_PROMPT) {
    const envPrompt = process.env.PROMPT_ENHANCER_PROMPT;
    const promptError = validateWrapperPrompt(envPrompt);
    if (promptError) {
      logWarning(`Environment PROMPT_ENHANCER_PROMPT: ${promptError.message}`);
    } else {
      result.wrapperPrompt = envPrompt;
    }
  }

  if (process.env.PROMPT_ENHANCER_AUGGIE_PATH) {
    result.auggiePath = process.env.PROMPT_ENHANCER_AUGGIE_PATH;
  }

  // Rules can be comma-separated in env var
  if (process.env.PROMPT_ENHANCER_RULES) {
    const rules = process.env.PROMPT_ENHANCER_RULES.split(",").map(r => r.trim()).filter(r => r !== "");
    result.rules = rules;
  }

  // CLI args can be comma-separated in env var
  if (process.env.PROMPT_ENHANCER_CLI_ARGS) {
    const cliArgs = process.env.PROMPT_ENHANCER_CLI_ARGS.split(",").map(a => a.trim()).filter(a => a !== "");
    result.cliArgs = cliArgs;
  }

  return result;
}

/**
 * Build the full prompt by inserting the input into the wrapper template
 */
export function buildPrompt(wrapperPrompt: string, input: string): string {
  return wrapperPrompt.replace("{input}", input);
}
