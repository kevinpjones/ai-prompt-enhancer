/**
 * Claude API provider implementation
 *
 * This provider uses the Anthropic API directly to enhance prompts.
 * Requires an API key (from config or ANTHROPIC_API_KEY environment variable).
 */

import type { Provider, ProviderContext, ProviderResult } from "./base.js";
import type { ClaudeApiProviderConfig } from "../types.js";

/**
 * Default maximum tokens for Claude API responses
 */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Default model if not specified
 */
const DEFAULT_MODEL = "claude-sonnet-4-5";

/**
 * Provider implementation using the Anthropic API
 */
class ClaudeApiProvider implements Provider {
  readonly name = "claude-api";
  private config: ClaudeApiProviderConfig;
  private client: unknown = null;

  constructor(config: ClaudeApiProviderConfig) {
    this.config = config;
  }

  /**
   * Lazily initialize the Anthropic client
   * Uses dynamic import to handle the optional dependency
   */
  private async getClient(): Promise<unknown> {
    if (this.client) {
      return this.client;
    }

    // Get API key from config or environment
    const apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Claude API provider requires an API key. " +
          "Set 'apiKey' in config or ANTHROPIC_API_KEY environment variable."
      );
    }

    try {
      // Dynamic import to handle optional dependency
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      this.client = new Anthropic({ apiKey });
      return this.client;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Cannot find module")) {
        throw new Error(
          "Claude API provider requires the @anthropic-ai/sdk package. " +
            "Install it with: npm install @anthropic-ai/sdk"
        );
      }
      throw error;
    }
  }

  async enhance(context: ProviderContext): Promise<ProviderResult> {
    try {
      const client = await this.getClient();
      const model = this.config.model || DEFAULT_MODEL;
      const maxTokens = this.config.maxTokens ?? DEFAULT_MAX_TOKENS;

      // Type assertion for the Anthropic client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anthropic = client as any;

      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: "user",
            content: context.fullPrompt,
          },
        ],
      });

      // Extract text from response
      const textContent = response.content.find((block: { type: string }) => block.type === "text");

      if (!textContent || textContent.type !== "text") {
        return {
          success: false,
          text: context.input,
          error: "No text content in Claude API response",
        };
      }

      return {
        success: true,
        text: textContent.text,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        text: context.input,
        error: errorMessage,
      };
    }
  }

  async close(): Promise<void> {
    // Anthropic SDK doesn't require explicit cleanup
    this.client = null;
  }
}

/**
 * Factory function to create a Claude API provider instance
 * @param config - Claude API provider configuration
 * @returns Promise resolving to the created provider
 */
export async function createClaudeApiProvider(config: ClaudeApiProviderConfig): Promise<Provider> {
  return new ClaudeApiProvider(config);
}
