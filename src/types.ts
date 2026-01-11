/**
 * Valid Auggie model types
 */
export type AuggieModel = "haiku4.5" | "sonnet4.5" | "sonnet4" | "gpt5";

/**
 * Array of valid model values for runtime validation
 */
export const VALID_MODELS: readonly AuggieModel[] = ["haiku4.5", "sonnet4.5", "sonnet4", "gpt5"] as const;

/**
 * Configuration for the prompt enhancer
 */
export interface Config {
  /** Model to use for enhancement: "haiku4.5" | "sonnet4.5" | "sonnet4" | "gpt5" */
  model: string;
  /** Wrapper prompt template. Use {input} as placeholder for the original text */
  wrapperPrompt: string;
  /** Optional custom tools for Auggie SDK */
  tools?: Record<string, unknown>;
  /** Path to the Auggie executable (default: "auggie") */
  auggiePath?: string;
  /** Rule file paths to pass to Auggie */
  rules?: string[];
  /** Additional CLI arguments to pass to Auggie */
  cliArgs?: string[];
}

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

/**
 * Result from the enhancement process
 */
export interface EnhanceResult {
  success: boolean;
  text: string;
  error?: string;
}
