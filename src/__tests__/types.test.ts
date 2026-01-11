/**
 * Unit tests for src/types.ts
 *
 * Tests type definitions, constants, and type guards.
 */

import { describe, it, expect } from "vitest";
import {
  VALID_PROVIDERS,
  VALID_AUGGIE_MODELS,
  VALID_CLAUDE_API_MODELS,
  VALID_MODELS,
  type Config,
  type AuggieProviderConfig,
  type ClaudeCliProviderConfig,
  type ClaudeApiProviderConfig,
  type LegacyConfig,
  type EnhanceResult,
  type ValidationError,
  type ValidationResult,
  type ConfigErrorType,
  type ConfigLoadError,
} from "../types.js";

describe("types.ts", () => {
  describe("VALID_PROVIDERS", () => {
    it("should contain all expected provider types", () => {
      expect(VALID_PROVIDERS).toContain("auggie");
      expect(VALID_PROVIDERS).toContain("claude-cli");
      expect(VALID_PROVIDERS).toContain("claude-api");
    });

    it("should have exactly 3 providers", () => {
      expect(VALID_PROVIDERS).toHaveLength(3);
    });

    it("should be a readonly array (typed as const)", () => {
      // TypeScript readonly doesn't make it frozen, but it's typed as readonly
      expect(Array.isArray(VALID_PROVIDERS)).toBe(true);
    });
  });

  describe("VALID_AUGGIE_MODELS", () => {
    it("should contain all expected Auggie model types", () => {
      expect(VALID_AUGGIE_MODELS).toContain("haiku4.5");
      expect(VALID_AUGGIE_MODELS).toContain("sonnet4.5");
      expect(VALID_AUGGIE_MODELS).toContain("sonnet4");
      expect(VALID_AUGGIE_MODELS).toContain("gpt5");
    });

    it("should have exactly 4 models", () => {
      expect(VALID_AUGGIE_MODELS).toHaveLength(4);
    });

    it("should be a readonly array (typed as const)", () => {
      expect(Array.isArray(VALID_AUGGIE_MODELS)).toBe(true);
    });
  });

  describe("VALID_MODELS (deprecated alias)", () => {
    it("should equal VALID_AUGGIE_MODELS for backward compatibility", () => {
      expect(VALID_MODELS).toBe(VALID_AUGGIE_MODELS);
    });
  });

  describe("VALID_CLAUDE_API_MODELS", () => {
    it("should contain Claude 4.5 models (latest)", () => {
      expect(VALID_CLAUDE_API_MODELS).toContain("claude-sonnet-4-5-20250929");
      expect(VALID_CLAUDE_API_MODELS).toContain("claude-haiku-4-5-20251001");
      expect(VALID_CLAUDE_API_MODELS).toContain("claude-opus-4-5-20251101");
    });

    it("should contain Claude 4.5 version-agnostic aliases", () => {
      expect(VALID_CLAUDE_API_MODELS).toContain("claude-sonnet-4-5");
      expect(VALID_CLAUDE_API_MODELS).toContain("claude-haiku-4-5");
      expect(VALID_CLAUDE_API_MODELS).toContain("claude-opus-4-5");
    });

    it("should contain Claude 3.5 models (legacy)", () => {
      expect(VALID_CLAUDE_API_MODELS).toContain("claude-3-5-sonnet-20241022");
      expect(VALID_CLAUDE_API_MODELS).toContain("claude-3-5-haiku-20241022");
    });

    it("should contain Claude 3 models (legacy)", () => {
      expect(VALID_CLAUDE_API_MODELS).toContain("claude-3-opus-20240229");
      expect(VALID_CLAUDE_API_MODELS).toContain("claude-3-sonnet-20240229");
      expect(VALID_CLAUDE_API_MODELS).toContain("claude-3-haiku-20240307");
    });

    it("should have exactly 11 models (3 versioned + 3 aliases + 5 legacy)", () => {
      expect(VALID_CLAUDE_API_MODELS).toHaveLength(11);
    });

    it("should be a readonly array (typed as const)", () => {
      expect(Array.isArray(VALID_CLAUDE_API_MODELS)).toBe(true);
    });
  });

  describe("Type structure validation", () => {
    it("should allow valid AuggieProviderConfig", () => {
      const config: AuggieProviderConfig = {
        provider: "auggie",
        model: "sonnet4.5",
        wrapperPrompt: "test {input}",
        auggiePath: "/path/to/auggie",
        rules: ["/path/to/rule.md"],
        cliArgs: ["--arg"],
        tools: { tool1: {} },
        showStderr: false,
      };
      expect(config.provider).toBe("auggie");
    });

    it("should allow valid ClaudeCliProviderConfig", () => {
      const config: ClaudeCliProviderConfig = {
        provider: "claude-cli",
        wrapperPrompt: "test {input}",
        claudePath: "/path/to/claude",
        model: "claude-3-opus",
        cliArgs: ["--arg"],
        showStderr: true,
      };
      expect(config.provider).toBe("claude-cli");
    });

    it("should allow valid ClaudeApiProviderConfig", () => {
      const config: ClaudeApiProviderConfig = {
        provider: "claude-api",
        wrapperPrompt: "test {input}",
        model: "claude-sonnet-4-5",
        apiKey: "test-key",
        maxTokens: 8192,
        showStderr: false,
      };
      expect(config.provider).toBe("claude-api");
    });

    it("should allow valid LegacyConfig without provider field", () => {
      const config: LegacyConfig = {
        model: "sonnet4.5",
        wrapperPrompt: "test {input}",
        auggiePath: "/path/to/auggie",
        rules: [],
        cliArgs: [],
        showStderr: false,
      };
      expect(config).not.toHaveProperty("provider");
    });

    it("should allow valid EnhanceResult", () => {
      const successResult: EnhanceResult = {
        success: true,
        text: "enhanced text",
      };
      expect(successResult.success).toBe(true);
      expect(successResult.error).toBeUndefined();

      const errorResult: EnhanceResult = {
        success: false,
        text: "original text",
        error: "Something went wrong",
      };
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBe("Something went wrong");
    });

    it("should allow valid ValidationError", () => {
      const error: ValidationError = {
        field: "model",
        message: "Invalid model",
        value: "invalid-model",
      };
      expect(error.field).toBe("model");
    });

    it("should allow valid ValidationResult", () => {
      const result: ValidationResult = {
        valid: false,
        errors: [{ field: "model", message: "Invalid" }],
        warnings: [{ field: "extra", message: "Unknown field" }],
      };
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
    });

    it("should allow valid ConfigLoadError", () => {
      const error: ConfigLoadError = {
        type: "JSON_PARSE",
        message: "Failed to parse",
        details: "Unexpected token",
        filePath: "/path/to/config.json",
      };
      expect(error.type).toBe("JSON_PARSE");
    });

    it("should support all ConfigErrorType values", () => {
      const errorTypes: ConfigErrorType[] = [
        "FILE_NOT_FOUND",
        "FILE_PERMISSION",
        "FILE_READ",
        "JSON_PARSE",
        "VALIDATION",
        "UNKNOWN",
      ];
      expect(errorTypes).toHaveLength(6);
    });
  });

  describe("Config union type", () => {
    it("should discriminate based on provider field", () => {
      const auggieConfig: Config = {
        provider: "auggie",
        model: "sonnet4.5",
        wrapperPrompt: "{input}",
      };

      const claudeCliConfig: Config = {
        provider: "claude-cli",
        wrapperPrompt: "{input}",
      };

      const claudeApiConfig: Config = {
        provider: "claude-api",
        model: "claude-sonnet-4-5",
        wrapperPrompt: "{input}",
      };

      expect(auggieConfig.provider).toBe("auggie");
      expect(claudeCliConfig.provider).toBe("claude-cli");
      expect(claudeApiConfig.provider).toBe("claude-api");
    });
  });
});
