/**
 * Valid Auggie model types
 */
export type AuggieModel = "haiku4.5" | "sonnet4.5" | "sonnet4" | "gpt5";

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
 * Result from the enhancement process
 */
export interface EnhanceResult {
  success: boolean;
  text: string;
  error?: string;
}
