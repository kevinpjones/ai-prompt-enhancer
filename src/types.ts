/**
 * Type definitions for ai-prompt-enhancer
 *
 * This module defines the types for configuration, validation, and enhancement results.
 * The configuration system uses a discriminated union based on the `provider` field.
 */

// ============================================
// Provider Types
// ============================================

/**
 * Supported provider identifiers
 */
export type ProviderType = "auggie" | "claude-cli" | "claude-api";

/**
 * Array of valid provider types for runtime validation
 */
export const VALID_PROVIDERS: readonly ProviderType[] = [
  "auggie",
  "claude-cli",
  "claude-api",
] as const;

// ============================================
// Common Options
// ============================================

/**
 * Options shared across all providers
 */
export interface CommonOptions {
  /** Show stderr output instead of filtering it (default: false) */
  showStderr?: boolean;
}

// ============================================
// Auggie Provider Types
// ============================================

/**
 * Valid Auggie model types
 */
export type AuggieModel = "haiku4.5" | "sonnet4.5" | "sonnet4" | "gpt5";

/**
 * Array of valid Auggie model values for runtime validation
 */
export const VALID_AUGGIE_MODELS: readonly AuggieModel[] = [
  "haiku4.5",
  "sonnet4.5",
  "sonnet4",
  "gpt5",
] as const;

/**
 * @deprecated Use VALID_AUGGIE_MODELS instead. Kept for backward compatibility.
 */
export const VALID_MODELS = VALID_AUGGIE_MODELS;

/**
 * Configuration for Auggie provider
 */
export interface AuggieProviderConfig extends CommonOptions {
  /** Provider type discriminator */
  provider: "auggie";
  /** Model to use for enhancement */
  model: AuggieModel | string;
  /** Wrapper prompt template. Use {input} as placeholder for the original text */
  wrapperPrompt: string;
  /** Path to the Auggie executable (default: "auggie") */
  auggiePath?: string;
  /** Rule file paths to pass to Auggie */
  rules?: string[];
  /** Additional CLI arguments to pass to Auggie */
  cliArgs?: string[];
  /** Optional custom tools for Auggie SDK */
  tools?: Record<string, unknown>;
}

// ============================================
// Claude CLI Provider Types
// ============================================

/**
 * Configuration for Claude Code CLI provider
 * Uses the `claude` CLI tool - no API key required
 */
export interface ClaudeCliProviderConfig extends CommonOptions {
  /** Provider type discriminator */
  provider: "claude-cli";
  /** Wrapper prompt template. Use {input} as placeholder for the original text */
  wrapperPrompt: string;
  /** Path to the Claude CLI executable (default: "claude") */
  claudePath?: string;
  /** Model to use (optional, uses Claude Code's default if not specified) */
  model?: string;
  /** Additional CLI arguments to pass to Claude CLI */
  cliArgs?: string[];
}

// ============================================
// Claude API Provider Types
// ============================================

/**
 * Valid Claude API model types
 * Includes both versioned IDs (with date) and version-agnostic aliases
 */
export type ClaudeApiModel =
  // Claude 4.5 models (latest)
  | "claude-sonnet-4-5-20250929"
  | "claude-haiku-4-5-20251001"
  | "claude-opus-4-5-20251101"
  // Version-agnostic aliases (recommended for auto-updates)
  | "claude-sonnet-4-5"
  | "claude-haiku-4-5"
  | "claude-opus-4-5"
  // Claude 3.5 models (legacy, kept for backward compatibility)
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-haiku-20241022"
  // Claude 3 models (legacy, kept for backward compatibility)
  | "claude-3-opus-20240229"
  | "claude-3-sonnet-20240229"
  | "claude-3-haiku-20240307";

/**
 * Array of valid Claude API model values for runtime validation
 * Ordered by: latest versioned → aliases → legacy models
 */
export const VALID_CLAUDE_API_MODELS: readonly ClaudeApiModel[] = [
  // Claude 4.5 models (latest)
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-5-20251101",
  // Version-agnostic aliases
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-opus-4-5",
  // Claude 3.5 models (legacy)
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  // Claude 3 models (legacy)
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
] as const;

/**
 * Configuration for Claude API provider
 * Requires an API key (from config or ANTHROPIC_API_KEY env var)
 */
export interface ClaudeApiProviderConfig extends CommonOptions {
  /** Provider type discriminator */
  provider: "claude-api";
  /** Wrapper prompt template. Use {input} as placeholder for the original text */
  wrapperPrompt: string;
  /** Claude model to use */
  model: ClaudeApiModel | string;
  /** Anthropic API key (can also use ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** Maximum tokens for response (default: 4096) */
  maxTokens?: number;
}

// ============================================
// Union Config Type
// ============================================

/**
 * Full configuration - discriminated union based on provider field
 */
export type Config = AuggieProviderConfig | ClaudeCliProviderConfig | ClaudeApiProviderConfig;

/**
 * Legacy config format (for backward compatibility)
 * When provider is not specified, defaults to "auggie"
 */
export interface LegacyConfig extends CommonOptions {
  /** Model to use (Auggie model) */
  model?: string;
  /** Wrapper prompt template */
  wrapperPrompt?: string;
  /** Path to Auggie executable */
  auggiePath?: string;
  /** Rule file paths */
  rules?: string[];
  /** CLI arguments */
  cliArgs?: string[];
  /** Custom tools */
  tools?: Record<string, unknown>;
}

// ============================================
// Validation Types
// ============================================

/**
 * Validation error with field-specific details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Result of configuration validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Types of configuration loading errors
 */
export type ConfigErrorType =
  | "FILE_NOT_FOUND"
  | "FILE_PERMISSION"
  | "FILE_READ"
  | "JSON_PARSE"
  | "VALIDATION"
  | "UNKNOWN";

/**
 * Detailed configuration loading error
 */
export interface ConfigLoadError {
  type: ConfigErrorType;
  message: string;
  details?: string;
  filePath?: string;
}

// ============================================
// Enhancement Types
// ============================================

/**
 * Result from the enhancement process
 */
export interface EnhanceResult {
  success: boolean;
  text: string;
  error?: string;
}
