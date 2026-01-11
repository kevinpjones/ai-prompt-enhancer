/**
 * Claude Code CLI provider implementation
 *
 * This provider uses the Claude Code CLI tool to enhance prompts.
 * No API key is required - it uses Claude Code's built-in authentication.
 */

import { spawn } from "child_process";
import type { Provider, ProviderContext, ProviderResult } from "./base.js";
import type { ClaudeCliProviderConfig } from "../types.js";

/**
 * Default path to the Claude CLI executable
 */
const DEFAULT_CLAUDE_PATH = "claude";

/**
 * Provider implementation using the Claude Code CLI
 */
class ClaudeCliProvider implements Provider {
  readonly name = "claude-cli";
  private config: ClaudeCliProviderConfig;

  constructor(config: ClaudeCliProviderConfig) {
    this.config = config;
  }

  async enhance(context: ProviderContext): Promise<ProviderResult> {
    try {
      const claudePath = this.config.claudePath || DEFAULT_CLAUDE_PATH;

      // Build CLI arguments
      const args: string[] = [
        "--print", // Non-interactive output mode
      ];

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

      // Spawn the claude process
      const result = await this.runClaude(claudePath, args, context.workspaceRoot);

      if (result.exitCode !== 0) {
        return {
          success: false,
          text: context.input,
          error: result.stderr || `Claude CLI exited with code ${result.exitCode}`,
        };
      }

      // Clean up the output (trim whitespace)
      const enhancedText = result.stdout.trim();

      if (!enhancedText) {
        return {
          success: false,
          text: context.input,
          error: "Claude CLI returned empty output",
        };
      }

      return {
        success: true,
        text: enhancedText,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        text: context.input,
        error: errorMessage,
      };
    }
  }

  /**
   * Run the Claude CLI process
   */
  private runClaude(
    claudePath: string,
    args: string[],
    cwd: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(claudePath, args, {
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
              `Claude CLI not found at "${claudePath}". ` +
                "Make sure Claude Code is installed and the path is correct."
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
 * Factory function to create a Claude CLI provider instance
 * @param config - Claude CLI provider configuration
 * @returns Promise resolving to the created provider
 */
export async function createClaudeCliProvider(
  config: ClaudeCliProviderConfig
): Promise<Provider> {
  return new ClaudeCliProvider(config);
}
