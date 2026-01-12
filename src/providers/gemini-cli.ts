/**
 * Gemini CLI provider implementation
 *
 * This provider uses the Google Gemini CLI tool to enhance prompts.
 * No API key is required - it uses Google Cloud authentication.
 */

import { spawn } from "child_process";
import type { Provider, ProviderContext, ProviderResult } from "./base.js";
import type { GeminiCliProviderConfig } from "../types.js";

/**
 * Default path to the Gemini CLI executable
 */
const DEFAULT_GEMINI_PATH = "gemini";

/**
 * Provider implementation using the Google Gemini CLI
 */
class GeminiCliProvider implements Provider {
  readonly name = "gemini-cli";
  private config: GeminiCliProviderConfig;

  constructor(config: GeminiCliProviderConfig) {
    this.config = config;
  }

  async enhance(context: ProviderContext): Promise<ProviderResult> {
    try {
      const geminiPath = this.config.geminiPath || DEFAULT_GEMINI_PATH;

      // Build CLI arguments
      const args: string[] = [];

      // Add model if specified
      if (this.config.model) {
        args.push("--model", this.config.model);
      }

      // Add any additional CLI arguments from config
      if (this.config.cliArgs && this.config.cliArgs.length > 0) {
        args.push(...this.config.cliArgs);
      }

      // Add the prompt as the final positional argument
      args.push(context.fullPrompt);

      // Spawn the gemini process
      const result = await this.runGemini(geminiPath, args, context.workspaceRoot);

      if (result.exitCode !== 0) {
        return {
          success: false,
          text: context.input,
          error: result.stderr || `Gemini CLI exited with code ${result.exitCode}`,
        };
      }

      // Clean up the output (trim whitespace)
      const enhancedText = result.stdout.trim();

      if (!enhancedText) {
        return {
          success: false,
          text: context.input,
          error: "Gemini CLI returned empty output",
        };
      }

      return {
        success: true,
        text: enhancedText,
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

  /**
   * Run the Gemini CLI process
   */
  private runGemini(
    geminiPath: string,
    args: string[],
    cwd: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(geminiPath, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"], // Ignore stdin since prompt is passed as argument
        env: {
          ...globalThis.process.env,
          // Ensure non-interactive mode
          CI: "true",
        },
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("error", (error) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          reject(
            new Error(
              `Gemini CLI not found at "${geminiPath}". ` +
                "Make sure the Gemini CLI is installed and the path is correct."
            )
          );
        } else {
          reject(error);
        }
      });

      proc.on("close", (exitCode) => {
        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr,
        });
      });
    });
  }

  async close(): Promise<void> {
    // No cleanup needed for CLI-based provider
  }
}

/**
 * Factory function to create a Gemini CLI provider instance
 * @param config - Gemini CLI provider configuration
 * @returns Promise resolving to the created provider
 */
export async function createGeminiCliProvider(config: GeminiCliProviderConfig): Promise<Provider> {
  return new GeminiCliProvider(config);
}
