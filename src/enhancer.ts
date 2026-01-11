/**
 * Prompt enhancer facade
 *
 * This module provides the main entry point for prompt enhancement.
 * It delegates to the appropriate provider based on configuration.
 */

import type { Config, EnhanceResult } from "./types.js";
import { buildPrompt } from "./config.js";
import { createProvider } from "./providers/index.js";
import type { Provider } from "./providers/base.js";

/**
 * Enhance a prompt using the configured provider
 *
 * @param input - The original prompt text to enhance
 * @param workspaceRoot - The current working directory for workspace context
 * @param config - Configuration options including provider selection
 * @returns Enhanced prompt result
 */
export async function enhancePrompt(
  input: string,
  workspaceRoot: string,
  config: Config
): Promise<EnhanceResult> {
  let provider: Provider | null = null;

  try {
    // Build the full prompt with wrapper
    const fullPrompt = buildPrompt(config.wrapperPrompt, input);

    // Create provider based on config
    provider = await createProvider(config);

    // Enhance using the provider
    const result = await provider.enhance({
      input,
      fullPrompt,
      workspaceRoot,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return {
      success: false,
      text: input, // Return original text on error
      error: errorMessage,
    };
  } finally {
    // Always clean up the provider
    if (provider) {
      try {
        await provider.close();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
