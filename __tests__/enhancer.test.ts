/**
 * Unit tests for src/enhancer.ts
 *
 * Tests the prompt enhancement facade.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuggieProviderConfig, ClaudeCliProviderConfig } from "../src/types.js";

// Hoist mock provider
const mocks = vi.hoisted(() => ({
  provider: {
    name: "mock-provider",
    enhance: vi.fn(),
    close: vi.fn(),
  },
  createProvider: vi.fn(),
  buildPrompt: vi.fn((wrapper: string, input: string) => wrapper.replace("{input}", input)),
}));

vi.mock("../src/providers/index.js", () => ({
  createProvider: mocks.createProvider,
}));

vi.mock("../src/config.js", () => ({
  buildPrompt: mocks.buildPrompt,
}));

// Import after mocks
import { enhancePrompt } from "../src/enhancer.js";

describe("enhancer.ts", () => {
  const defaultConfig: AuggieProviderConfig = {
    provider: "auggie",
    model: "sonnet4.5",
    wrapperPrompt: "Enhance: {input}",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.provider.enhance.mockResolvedValue({
      success: true,
      text: "enhanced text",
    });
    mocks.provider.close.mockResolvedValue(undefined);
    mocks.createProvider.mockResolvedValue(mocks.provider);
  });

  describe("enhancePrompt", () => {
    it("should return enhanced result on success", async () => {
      const result = await enhancePrompt(
        "original text",
        "/workspace",
        defaultConfig
      );

      expect(result.success).toBe(true);
      expect(result.text).toBe("enhanced text");
      expect(result.error).toBeUndefined();
    });

    it("should build prompt with wrapper template", async () => {
      await enhancePrompt("test input", "/workspace", defaultConfig);

      expect(mocks.buildPrompt).toHaveBeenCalledWith("Enhance: {input}", "test input");
    });

    it("should create provider with config", async () => {
      await enhancePrompt("input", "/workspace", defaultConfig);

      expect(mocks.createProvider).toHaveBeenCalledWith(defaultConfig);
    });

    it("should call provider.enhance with correct context", async () => {
      await enhancePrompt("original", "/my/workspace", defaultConfig);

      expect(mocks.provider.enhance).toHaveBeenCalledWith({
        input: "original",
        fullPrompt: "Enhance: original",
        workspaceRoot: "/my/workspace",
      });
    });

    it("should always close provider after success", async () => {
      await enhancePrompt("input", "/workspace", defaultConfig);

      expect(mocks.provider.close).toHaveBeenCalled();
    });

    it("should always close provider after error", async () => {
      mocks.provider.enhance.mockRejectedValueOnce(new Error("Provider error"));

      await enhancePrompt("input", "/workspace", defaultConfig);

      expect(mocks.provider.close).toHaveBeenCalled();
    });

    it("should return original text on provider error", async () => {
      mocks.provider.enhance.mockRejectedValueOnce(new Error("Enhancement failed"));

      const result = await enhancePrompt("original", "/workspace", defaultConfig);

      expect(result.success).toBe(false);
      expect(result.text).toBe("original");
      expect(result.error).toBe("Enhancement failed");
    });

    it("should return original text on provider creation error", async () => {
      mocks.createProvider.mockRejectedValueOnce(
        new Error("Unknown provider")
      );

      const result = await enhancePrompt("original", "/workspace", defaultConfig);

      expect(result.success).toBe(false);
      expect(result.text).toBe("original");
      expect(result.error).toBe("Unknown provider");
    });

    it("should handle non-Error exceptions", async () => {
      mocks.provider.enhance.mockRejectedValueOnce("String error");

      const result = await enhancePrompt("original", "/workspace", defaultConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe("String error");
    });

    it("should ignore close errors", async () => {
      mocks.provider.close.mockRejectedValueOnce(new Error("Close failed"));

      // Should not throw
      const result = await enhancePrompt("input", "/workspace", defaultConfig);

      expect(result.success).toBe(true);
      expect(result.text).toBe("enhanced text");
    });

    it("should pass through provider result directly", async () => {
      const providerResult = {
        success: true,
        text: "provider response",
      };
      mocks.provider.enhance.mockResolvedValueOnce(providerResult);

      const result = await enhancePrompt("input", "/workspace", defaultConfig);

      expect(result).toEqual(providerResult);
    });

    it("should work with different provider configs", async () => {
      const claudeConfig: ClaudeCliProviderConfig = {
        provider: "claude-cli",
        wrapperPrompt: "Claude: {input}",
        claudePath: "/path/to/claude",
      };

      mocks.provider.enhance.mockResolvedValueOnce({
        success: true,
        text: "claude enhanced",
      });

      const result = await enhancePrompt("input", "/workspace", claudeConfig);

      expect(result.success).toBe(true);
      expect(result.text).toBe("claude enhanced");
    });
  });
});
