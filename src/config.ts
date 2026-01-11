import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { Config } from "./types.js";

const DEFAULT_WRAPPER_PROMPT = `You are a prompt enhancement assistant. Given the following rough prompt idea,
expand it into a clear, detailed, and actionable prompt for an AI coding assistant.

Consider:
- The workspace context and relevant files
- Specific, clear instructions
- Expected output format

Original prompt to enhance:
{input}

Provide an enhanced version that is comprehensive and context-aware. Output ONLY the enhanced prompt, no explanations or preamble.`;

const DEFAULT_MODEL = "sonnet4.5";
const DEFAULT_AUGGIE_PATH = "auggie";

const CONFIG_FILE_PATH = join(homedir(), ".prompt-enhancer.json");

/**
 * Load configuration with priority:
 * 1. Environment variables (highest priority)
 * 2. Config file (~/.prompt-enhancer.json)
 * 3. Defaults (lowest priority)
 */
export function loadConfig(): Config {
  // Start with defaults
  let config: Config = {
    model: DEFAULT_MODEL,
    wrapperPrompt: DEFAULT_WRAPPER_PROMPT,
    tools: {},
    auggiePath: DEFAULT_AUGGIE_PATH,
    rules: [],
    cliArgs: [],
  };

  // Try to load from config file
  if (existsSync(CONFIG_FILE_PATH)) {
    try {
      const fileContent = readFileSync(CONFIG_FILE_PATH, "utf-8");
      const fileConfig = JSON.parse(fileContent) as Partial<Config>;
      config = { ...config, ...fileConfig };
    } catch (error) {
      // Silently ignore config file errors, use defaults
      console.error(`Warning: Could not parse ${CONFIG_FILE_PATH}`);
    }
  }

  // Environment variables override everything
  if (process.env.PROMPT_ENHANCER_MODEL) {
    config.model = process.env.PROMPT_ENHANCER_MODEL;
  }

  if (process.env.PROMPT_ENHANCER_PROMPT) {
    config.wrapperPrompt = process.env.PROMPT_ENHANCER_PROMPT;
  }

  if (process.env.PROMPT_ENHANCER_AUGGIE_PATH) {
    config.auggiePath = process.env.PROMPT_ENHANCER_AUGGIE_PATH;
  }

  // Rules can be comma-separated in env var
  if (process.env.PROMPT_ENHANCER_RULES) {
    config.rules = process.env.PROMPT_ENHANCER_RULES.split(",").map(r => r.trim());
  }

  // CLI args can be comma-separated in env var
  if (process.env.PROMPT_ENHANCER_CLI_ARGS) {
    config.cliArgs = process.env.PROMPT_ENHANCER_CLI_ARGS.split(",").map(a => a.trim());
  }

  return config;
}

/**
 * Build the full prompt by inserting the input into the wrapper template
 */
export function buildPrompt(wrapperPrompt: string, input: string): string {
  return wrapperPrompt.replace("{input}", input);
}
