import { Auggie } from "@augmentcode/auggie-sdk";
import type { Config, EnhanceResult } from "./types.js";
import { buildPrompt } from "./config.js";

// Valid model types from Auggie SDK
type AuggieModel = "haiku4.5" | "sonnet4.5" | "sonnet4" | "gpt5";

/**
 * Enhance a prompt using the Auggie SDK
 *
 * @param input - The original prompt text to enhance
 * @param workspaceRoot - The current working directory for workspace context
 * @param config - Configuration options
 * @returns Enhanced prompt result
 */
export async function enhancePrompt(
  input: string,
  workspaceRoot: string,
  config: Config
): Promise<EnhanceResult> {
  let client: Auggie | null = null;

  try {
    // Build the full prompt with wrapper
    const fullPrompt = buildPrompt(config.wrapperPrompt, input);

    // Initialize Auggie SDK with all config options
    client = await Auggie.create({
      model: config.model as AuggieModel,
      workspaceRoot,
      allowIndexing: true,
      auggiePath: config.auggiePath,
      rules: config.rules,
      cliArgs: config.cliArgs,
    });

    // Send prompt and get response (returns string directly)
    const enhancedText = await client.prompt(fullPrompt, { isAnswerOnly: true });

    return {
      success: true,
      text: enhancedText,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return {
      success: false,
      text: input, // Return original text on error
      error: errorMessage,
    };
  } finally {
    // Always clean up the client
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
