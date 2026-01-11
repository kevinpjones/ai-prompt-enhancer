/**
 * Provider abstraction layer for vim-prompt-enhancer
 *
 * This module defines the common interface that all AI providers must implement,
 * enabling the prompt enhancer to work with multiple backends (Auggie, Claude CLI, Claude API, etc.)
 */

/**
 * Context passed to providers for prompt enhancement
 */
export interface ProviderContext {
  /** The original input text to enhance */
  input: string;
  /** Full prompt with wrapper template applied */
  fullPrompt: string;
  /** Workspace root directory for codebase context */
  workspaceRoot: string;
}

/**
 * Result returned by providers after enhancement
 */
export interface ProviderResult {
  /** Whether the enhancement succeeded */
  success: boolean;
  /** The enhanced text (or original text on failure) */
  text: string;
  /** Error message if enhancement failed */
  error?: string;
}

/**
 * Base interface that all providers must implement
 */
export interface Provider {
  /** Unique provider identifier */
  readonly name: string;

  /**
   * Enhance a prompt using this provider
   * @param context - Common context for enhancement
   * @returns Promise resolving to enhancement result
   */
  enhance(context: ProviderContext): Promise<ProviderResult>;

  /**
   * Clean up any resources (connections, clients, processes, etc.)
   */
  close(): Promise<void>;
}

/**
 * Factory function type for creating providers
 * @template TConfig - Provider-specific configuration type
 */
export type ProviderFactory<TConfig> = (config: TConfig) => Promise<Provider>;
