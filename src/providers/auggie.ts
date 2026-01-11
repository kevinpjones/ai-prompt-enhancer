/**
 * Auggie provider implementation
 *
 * This provider uses the Auggie SDK to enhance prompts. It supports workspace indexing,
 * rule files, and custom CLI arguments.
 */

import { Auggie } from "@augmentcode/auggie-sdk";
import type { Provider, ProviderContext, ProviderResult } from "./base.js";
import type { AuggieProviderConfig, AuggieModel } from "../types.js";

/**
 * Provider implementation using the Auggie SDK
 */
class AuggieProvider implements Provider {
  readonly name = "auggie";
  private client: Auggie | null = null;
  private config: AuggieProviderConfig;
  private workspaceRoot: string | null = null;

  constructor(config: AuggieProviderConfig) {
    this.config = config;
  }

  async enhance(context: ProviderContext): Promise<ProviderResult> {
    try {
      // Store workspace root for potential reuse
      this.workspaceRoot = context.workspaceRoot;

      // Initialize Auggie SDK with all config options
      this.client = await Auggie.create({
        model: this.config.model as AuggieModel,
        workspaceRoot: context.workspaceRoot,
        allowIndexing: true,
        auggiePath: this.config.auggiePath,
        rules: this.config.rules,
        cliArgs: this.config.cliArgs,
      });

      // Send prompt and get response (returns string directly)
      const enhancedText = await this.client.prompt(context.fullPrompt, {
        isAnswerOnly: true,
      });

      return {
        success: true,
        text: enhancedText,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        text: context.input, // Return original text on error
        error: errorMessage,
      };
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // Ignore cleanup errors
      }
      this.client = null;
    }
  }
}

/**
 * Factory function to create an Auggie provider instance
 * @param config - Auggie provider configuration
 * @returns Promise resolving to the created provider
 */
export async function createAuggieProvider(config: AuggieProviderConfig): Promise<Provider> {
  return new AuggieProvider(config);
}
