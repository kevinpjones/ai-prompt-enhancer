/**
 * Unit tests for src/providers/claude-api.ts
 *
 * Tests the Claude API provider implementation.
 * 
 * Note: The Anthropic SDK is dynamically imported in the provider,
 * which makes it challenging to mock with Vitest's static hoisting.
 * These tests focus on observable behavior and API key validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ClaudeApiProviderConfig } from "../../src/types.js";
import type { ProviderContext } from "../../src/providers/base.js";

// Store original env
const originalEnv = { ...process.env };

// Use vi.hoisted for the mock to ensure proper hoisting
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: mockCreate,
    };
  },
}));

// Import after mocks
import { createClaudeApiProvider } from "../../src/providers/claude-api.js";

describe("providers/claude-api.ts", () => {
  const defaultConfig: ClaudeApiProviderConfig = {
    provider: "claude-api",
    model: "claude-sonnet-4-20250514",
    wrapperPrompt: "Enhance: {input}",
    apiKey: "test-api-key",
    maxTokens: 4096,
  };

  const defaultContext: ProviderContext = {
    input: "original text",
    fullPrompt: "Enhance: original text",
    workspaceRoot: "/workspace",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;

    // Default mock response
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "enhanced text" }],
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createClaudeApiProvider", () => {
    it("should create a provider with name claude-api", async () => {
      const provider = await createClaudeApiProvider(defaultConfig);
      expect(provider.name).toBe("claude-api");
    });

    it("should return a provider with enhance method", async () => {
      const provider = await createClaudeApiProvider(defaultConfig);
      expect(typeof provider.enhance).toBe("function");
    });

    it("should return a provider with close method", async () => {
      const provider = await createClaudeApiProvider(defaultConfig);
      expect(typeof provider.close).toBe("function");
    });
  });

  describe("enhance", () => {
    it("should return success result with enhanced text", async () => {
      const provider = await createClaudeApiProvider(defaultConfig);
      const result = await provider.enhance(defaultContext);

      expect(result.success).toBe(true);
      expect(result.text).toBe("enhanced text");
      expect(result.error).toBeUndefined();
    });

    it("should use ANTHROPIC_API_KEY env var when config apiKey not set", async () => {
      process.env.ANTHROPIC_API_KEY = "env-api-key";
      const configNoKey: ClaudeApiProviderConfig = {
        provider: "claude-api",
        model: "claude-sonnet-4-20250514",
        wrapperPrompt: "{input}",
      };

      const provider = await createClaudeApiProvider(configNoKey);
      const result = await provider.enhance(defaultContext);

      // Should succeed since env var provides the key
      expect(result.success).toBe(true);
    });

    it("should return error when no API key is available", async () => {
      const configNoKey: ClaudeApiProviderConfig = {
        provider: "claude-api",
        model: "claude-sonnet-4-20250514",
        wrapperPrompt: "{input}",
      };

      const provider = await createClaudeApiProvider(configNoKey);
      const result = await provider.enhance(defaultContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("API key");
    });

    it("should call messages.create with correct parameters", async () => {
      const provider = await createClaudeApiProvider(defaultConfig);
      await provider.enhance(defaultContext);

      expect(mockCreate).toHaveBeenCalledWith({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: "Enhance: original text",
          },
        ],
      });
    });

    it("should use default model when not specified", async () => {
      const configNoModel: ClaudeApiProviderConfig = {
        provider: "claude-api",
        wrapperPrompt: "{input}",
        apiKey: "test-key",
      } as ClaudeApiProviderConfig;

      const provider = await createClaudeApiProvider(configNoModel);
      await provider.enhance(defaultContext);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-sonnet-4-20250514",
        })
      );
    });

    it("should use default maxTokens when not specified", async () => {
      const configNoTokens: ClaudeApiProviderConfig = {
        ...defaultConfig,
        maxTokens: undefined,
      };

      const provider = await createClaudeApiProvider(configNoTokens);
      await provider.enhance(defaultContext);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 4096,
        })
      );
    });

    it("should return error when no text content in response", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "tool_use", id: "123" }],
      });

      const provider = await createClaudeApiProvider(defaultConfig);
      const result = await provider.enhance(defaultContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No text content");
    });

    it("should return error when API call fails", async () => {
      mockCreate.mockRejectedValueOnce(new Error("API Error"));

      const provider = await createClaudeApiProvider(defaultConfig);
      const result = await provider.enhance(defaultContext);

      expect(result.success).toBe(false);
      expect(result.text).toBe("original text");
      expect(result.error).toBe("API Error");
    });

    it("should handle custom maxTokens", async () => {
      const configCustomTokens: ClaudeApiProviderConfig = {
        ...defaultConfig,
        maxTokens: 8192,
      };

      const provider = await createClaudeApiProvider(configCustomTokens);
      await provider.enhance(defaultContext);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 8192,
        })
      );
    });

    it("should handle custom model", async () => {
      const configCustomModel: ClaudeApiProviderConfig = {
        ...defaultConfig,
        model: "claude-opus-4-20250514",
      };

      const provider = await createClaudeApiProvider(configCustomModel);
      await provider.enhance(defaultContext);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-opus-4-20250514",
        })
      );
    });
  });

  describe("close", () => {
    it("should resolve without error", async () => {
      const provider = await createClaudeApiProvider(defaultConfig);
      await expect(provider.close()).resolves.toBeUndefined();
    });
  });
});
