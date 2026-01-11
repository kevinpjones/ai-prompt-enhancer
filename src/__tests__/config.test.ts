/**
 * Unit tests for src/config.ts
 *
 * Tests configuration loading, validation, environment overrides, and prompt building.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We need to mock fs and os before importing config
// Use vi.hoisted to define mock functions that can be referenced
const mocks = vi.hoisted(() => {
  return {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    accessSync: vi.fn(),
    homedir: vi.fn(() => "/mock/home"),
  };
});

vi.mock("fs", () => ({
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync,
  accessSync: mocks.accessSync,
  constants: { R_OK: 4 },
}));

vi.mock("os", () => ({
  homedir: mocks.homedir,
}));

// Import after mocks are set up
import { loadConfig, validateConfig, buildPrompt } from "../config.js";

describe("config.ts", () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.PROMPT_ENHANCER_PROVIDER;
    delete process.env.PROMPT_ENHANCER_MODEL;
    delete process.env.PROMPT_ENHANCER_PROMPT;
    delete process.env.PROMPT_ENHANCER_AUGGIE_PATH;
    delete process.env.PROMPT_ENHANCER_CLAUDE_PATH;
    delete process.env.PROMPT_ENHANCER_RULES;
    delete process.env.PROMPT_ENHANCER_CLI_ARGS;
    delete process.env.PROMPT_ENHANCER_MAX_TOKENS;
    delete process.env.PROMPT_ENHANCER_API_KEY;
    delete process.env.PROMPT_ENHANCER_SHOW_STDERR;
    delete process.env.ANTHROPIC_API_KEY;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("loadConfig", () => {
    describe("when config file does not exist", () => {
      beforeEach(() => {
        mocks.existsSync.mockReturnValue(false);
      });

      it("should return default Auggie config", () => {
        const config = loadConfig();

        expect(config.provider).toBe("auggie");
        expect(config.wrapperPrompt).toContain("{input}");
        if (config.provider === "auggie") {
          expect(config.model).toBe("sonnet4.5");
          expect(config.auggiePath).toBe("auggie");
          expect(config.rules).toEqual([]);
          expect(config.cliArgs).toEqual([]);
        }
      });

      it("should respect environment variable overrides", () => {
        process.env.PROMPT_ENHANCER_MODEL = "haiku4.5";
        process.env.PROMPT_ENHANCER_AUGGIE_PATH = "/custom/auggie";

        const config = loadConfig();

        if (config.provider === "auggie") {
          expect(config.model).toBe("haiku4.5");
          expect(config.auggiePath).toBe("/custom/auggie");
        }
      });
    });

    describe("when config file exists with valid JSON", () => {
      beforeEach(() => {
        mocks.existsSync.mockReturnValue(true);
        mocks.accessSync.mockReturnValue(undefined);
      });

      it("should load Auggie config from file", () => {
        const fileConfig = {
          provider: "auggie",
          model: "gpt5",
          wrapperPrompt: "Custom prompt: {input}",
          auggiePath: "/path/to/auggie",
          rules: ["/rule1.md", "/rule2.md"],
        };
        mocks.readFileSync.mockReturnValue(JSON.stringify(fileConfig));

        const config = loadConfig();

        expect(config.provider).toBe("auggie");
        if (config.provider === "auggie") {
          expect(config.model).toBe("gpt5");
          expect(config.wrapperPrompt).toBe("Custom prompt: {input}");
          expect(config.auggiePath).toBe("/path/to/auggie");
          expect(config.rules).toEqual(["/rule1.md", "/rule2.md"]);
        }
      });

      it("should load Claude CLI config from file", () => {
        const fileConfig = {
          provider: "claude-cli",
          wrapperPrompt: "Claude prompt: {input}",
          claudePath: "/path/to/claude",
          model: "custom-model",
        };
        mocks.readFileSync.mockReturnValue(JSON.stringify(fileConfig));

        const config = loadConfig();

        expect(config.provider).toBe("claude-cli");
        if (config.provider === "claude-cli") {
          expect(config.wrapperPrompt).toBe("Claude prompt: {input}");
          expect(config.claudePath).toBe("/path/to/claude");
          expect(config.model).toBe("custom-model");
        }
      });

      it("should load Claude API config from file", () => {
        const fileConfig = {
          provider: "claude-api",
          wrapperPrompt: "API prompt: {input}",
          model: "claude-opus-4-5-20251101",
          apiKey: "test-api-key",
          maxTokens: 8192,
        };
        mocks.readFileSync.mockReturnValue(JSON.stringify(fileConfig));

        const config = loadConfig();

        expect(config.provider).toBe("claude-api");
        if (config.provider === "claude-api") {
          expect(config.model).toBe("claude-opus-4-5-20251101");
          expect(config.apiKey).toBe("test-api-key");
          expect(config.maxTokens).toBe(8192);
        }
      });

      it("should handle legacy config format (no provider field)", () => {
        const legacyConfig = {
          model: "sonnet4",
          wrapperPrompt: "Legacy prompt: {input}",
          auggiePath: "/legacy/auggie",
        };
        mocks.readFileSync.mockReturnValue(JSON.stringify(legacyConfig));

        const config = loadConfig();

        expect(config.provider).toBe("auggie"); // Default provider
        if (config.provider === "auggie") {
          expect(config.model).toBe("sonnet4");
          expect(config.wrapperPrompt).toBe("Legacy prompt: {input}");
        }
      });

      it("should handle empty config file", () => {
        mocks.readFileSync.mockReturnValue("");

        const config = loadConfig();

        expect(config.provider).toBe("auggie");
      });

      it("should handle empty JSON object", () => {
        mocks.readFileSync.mockReturnValue("{}");

        const config = loadConfig();

        expect(config.provider).toBe("auggie");
        if (config.provider === "auggie") {
          expect(config.model).toBe("sonnet4.5"); // Default
        }
      });
    });

    describe("when config file has invalid JSON", () => {
      beforeEach(() => {
        mocks.existsSync.mockReturnValue(true);
        mocks.accessSync.mockReturnValue(undefined);
        mocks.readFileSync.mockReturnValue("{ invalid json }");
      });

      it("should return default config and log warning", () => {
        const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

        const config = loadConfig();

        expect(config.provider).toBe("auggie");
        expect(stderrSpy).toHaveBeenCalled();
      });
    });

    describe("when config file has permission issues", () => {
      beforeEach(() => {
        mocks.existsSync.mockReturnValue(true);
        const permError = new Error("Permission denied") as NodeJS.ErrnoException;
        permError.code = "EACCES";
        mocks.accessSync.mockImplementation(() => {
          throw permError;
        });
      });

      it("should return default config and log warning", () => {
        const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

        const config = loadConfig();

        expect(config.provider).toBe("auggie");
        expect(stderrSpy).toHaveBeenCalled();
      });
    });

    describe("environment variable overrides", () => {
      beforeEach(() => {
        mocks.existsSync.mockReturnValue(false);
      });

      it("should override provider via PROMPT_ENHANCER_PROVIDER", () => {
        process.env.PROMPT_ENHANCER_PROVIDER = "claude-cli";

        const config = loadConfig();

        expect(config.provider).toBe("claude-cli");
      });

      it("should override wrapperPrompt via PROMPT_ENHANCER_PROMPT", () => {
        process.env.PROMPT_ENHANCER_PROMPT = "Env prompt: {input}";

        const config = loadConfig();

        expect(config.wrapperPrompt).toBe("Env prompt: {input}");
      });

      it("should override Auggie model via PROMPT_ENHANCER_MODEL", () => {
        process.env.PROMPT_ENHANCER_MODEL = "gpt5";

        const config = loadConfig();

        if (config.provider === "auggie") {
          expect(config.model).toBe("gpt5");
        }
      });

      it("should override auggiePath via PROMPT_ENHANCER_AUGGIE_PATH", () => {
        process.env.PROMPT_ENHANCER_AUGGIE_PATH = "/env/auggie";

        const config = loadConfig();

        if (config.provider === "auggie") {
          expect(config.auggiePath).toBe("/env/auggie");
        }
      });

      it("should override claudePath via PROMPT_ENHANCER_CLAUDE_PATH", () => {
        process.env.PROMPT_ENHANCER_PROVIDER = "claude-cli";
        process.env.PROMPT_ENHANCER_CLAUDE_PATH = "/env/claude";

        const config = loadConfig();

        if (config.provider === "claude-cli") {
          expect(config.claudePath).toBe("/env/claude");
        }
      });

      it("should parse PROMPT_ENHANCER_RULES as comma-separated", () => {
        process.env.PROMPT_ENHANCER_RULES = "/rule1.md, /rule2.md, /rule3.md";

        const config = loadConfig();

        if (config.provider === "auggie") {
          expect(config.rules).toEqual(["/rule1.md", "/rule2.md", "/rule3.md"]);
        }
      });

      it("should parse PROMPT_ENHANCER_CLI_ARGS as comma-separated", () => {
        process.env.PROMPT_ENHANCER_CLI_ARGS = "--arg1, --arg2";

        const config = loadConfig();

        if (config.provider === "auggie") {
          expect(config.cliArgs).toEqual(["--arg1", "--arg2"]);
        }
      });

      it("should override maxTokens via PROMPT_ENHANCER_MAX_TOKENS", () => {
        process.env.PROMPT_ENHANCER_PROVIDER = "claude-api";
        process.env.PROMPT_ENHANCER_MAX_TOKENS = "16384";

        const config = loadConfig();

        if (config.provider === "claude-api") {
          expect(config.maxTokens).toBe(16384);
        }
      });

      it("should override apiKey via PROMPT_ENHANCER_API_KEY", () => {
        process.env.PROMPT_ENHANCER_PROVIDER = "claude-api";
        process.env.PROMPT_ENHANCER_API_KEY = "env-api-key";

        const config = loadConfig();

        if (config.provider === "claude-api") {
          expect(config.apiKey).toBe("env-api-key");
        }
      });

      it("should parse PROMPT_ENHANCER_SHOW_STDERR correctly", () => {
        process.env.PROMPT_ENHANCER_SHOW_STDERR = "true";

        const config = loadConfig();

        expect(config.showStderr).toBe(true);
      });

      it("should parse PROMPT_ENHANCER_SHOW_STDERR=1 as true", () => {
        process.env.PROMPT_ENHANCER_SHOW_STDERR = "1";

        const config = loadConfig();

        expect(config.showStderr).toBe(true);
      });

      it("should parse PROMPT_ENHANCER_SHOW_STDERR=yes as true", () => {
        process.env.PROMPT_ENHANCER_SHOW_STDERR = "yes";

        const config = loadConfig();

        expect(config.showStderr).toBe(true);
      });

      it("should ignore invalid PROMPT_ENHANCER_SHOW_STDERR values", () => {
        process.env.PROMPT_ENHANCER_SHOW_STDERR = "invalid";

        const config = loadConfig();

        expect(config.showStderr).toBe(false);
      });
    });
  });

  describe("validateConfig", () => {
    it("should return valid for null config", () => {
      const result = validateConfig(null);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return valid for undefined config", () => {
      const result = validateConfig(undefined);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return error for non-object config", () => {
      const result = validateConfig("string");
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("root");
    });

    it("should return error for array config", () => {
      const result = validateConfig([1, 2, 3]);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("root");
    });

    it("should return error for invalid provider", () => {
      const result = validateConfig({ provider: "invalid-provider" });
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("provider");
    });

    it("should return error for non-string provider", () => {
      const result = validateConfig({ provider: 123 });
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("provider");
    });

    it("should return valid for valid Auggie config", () => {
      const config = {
        provider: "auggie",
        model: "sonnet4.5",
        wrapperPrompt: "Test {input}",
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it("should return error for invalid Auggie model", () => {
      const config = {
        provider: "auggie",
        model: "invalid-model",
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "model")).toBe(true);
    });

    it("should return error for wrapperPrompt missing {input}", () => {
      const config = {
        provider: "auggie",
        wrapperPrompt: "No placeholder here",
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "wrapperPrompt")).toBe(true);
    });

    it("should return error for non-array rules", () => {
      const config = {
        provider: "auggie",
        rules: "not-an-array",
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rules")).toBe(true);
    });

    it("should return error for rules with non-string items", () => {
      const config = {
        provider: "auggie",
        rules: ["/valid.md", 123, null],
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rules")).toBe(true);
    });

    it("should return error for empty string in rules", () => {
      const config = {
        provider: "auggie",
        rules: ["/valid.md", ""],
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "rules")).toBe(true);
    });

    it("should return error for non-array cliArgs", () => {
      const config = {
        provider: "auggie",
        cliArgs: "--arg",
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "cliArgs")).toBe(true);
    });

    it("should return error for empty auggiePath", () => {
      const config = {
        provider: "auggie",
        auggiePath: "",
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "auggiePath")).toBe(true);
    });

    it("should return valid for valid Claude CLI config", () => {
      const config = {
        provider: "claude-cli",
        wrapperPrompt: "Test {input}",
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it("should return error for empty claudePath", () => {
      const config = {
        provider: "claude-cli",
        claudePath: "   ",
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "claudePath")).toBe(true);
    });

    it("should return valid for valid Claude API config", () => {
      const config = {
        provider: "claude-api",
        model: "claude-sonnet-4-5",
        wrapperPrompt: "Test {input}",
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it("should return error for invalid maxTokens", () => {
      const config = {
        provider: "claude-api",
        maxTokens: -100,
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "maxTokens")).toBe(true);
    });

    it("should return error for non-integer maxTokens", () => {
      const config = {
        provider: "claude-api",
        maxTokens: 100.5,
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "maxTokens")).toBe(true);
    });

    it("should return warning for unknown fields", () => {
      const config = {
        provider: "auggie",
        unknownField: "value",
        anotherUnknown: 123,
      };
      const result = validateConfig(config);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.field === "unknownField")).toBe(true);
    });
  });

  describe("buildPrompt", () => {
    it("should replace {input} placeholder with input text", () => {
      const wrapperPrompt = "Enhance this: {input}";
      const input = "My prompt text";

      const result = buildPrompt(wrapperPrompt, input);

      expect(result).toBe("Enhance this: My prompt text");
    });

    it("should handle multiple lines in input", () => {
      const wrapperPrompt = "Original:\n{input}\nEnd";
      const input = "Line 1\nLine 2\nLine 3";

      const result = buildPrompt(wrapperPrompt, input);

      expect(result).toBe("Original:\nLine 1\nLine 2\nLine 3\nEnd");
    });

    it("should handle special characters in input", () => {
      const wrapperPrompt = "Code: {input}";
      const input = "function() { return $var; }";

      const result = buildPrompt(wrapperPrompt, input);

      expect(result).toBe("Code: function() { return $var; }");
    });

    it("should only replace first occurrence of {input}", () => {
      const wrapperPrompt = "{input} and {input} again";
      const input = "TEXT";

      const result = buildPrompt(wrapperPrompt, input);

      expect(result).toBe("TEXT and {input} again");
    });

    it("should handle empty input", () => {
      const wrapperPrompt = "Prompt: {input}";
      const input = "";

      const result = buildPrompt(wrapperPrompt, input);

      expect(result).toBe("Prompt: ");
    });
  });
});
