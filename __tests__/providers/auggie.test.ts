/**
 * Unit tests for src/providers/auggie.ts
 *
 * Tests the Auggie provider implementation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuggieProviderConfig } from "../../src/types.js";
import type { ProviderContext } from "../../src/providers/base.js";

// Hoist mock values using vi.hoisted
const mocks = vi.hoisted(() => {
  const client = {
    prompt: vi.fn(),
    close: vi.fn(),
  };
  return {
    client,
    createFn: vi.fn().mockResolvedValue(client),
  };
});

vi.mock("@augmentcode/auggie-sdk", () => ({
  Auggie: {
    create: mocks.createFn,
  },
}));

// Import after mocks
import { createAuggieProvider } from "../../src/providers/auggie.js";

describe("providers/auggie.ts", () => {
  const defaultConfig: AuggieProviderConfig = {
    provider: "auggie",
    model: "sonnet4.5",
    wrapperPrompt: "Enhance: {input}",
    auggiePath: "/path/to/auggie",
    rules: ["/rule.md"],
    cliArgs: ["--arg"],
  };

  const defaultContext: ProviderContext = {
    input: "original text",
    fullPrompt: "Enhance: original text",
    workspaceRoot: "/workspace",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.client.prompt.mockResolvedValue("enhanced text");
    mocks.client.close.mockResolvedValue(undefined);
    mocks.createFn.mockResolvedValue(mocks.client);
  });

  describe("createAuggieProvider", () => {
    it("should create a provider with name auggie", async () => {
      const provider = await createAuggieProvider(defaultConfig);
      expect(provider.name).toBe("auggie");
    });

    it("should return a provider with enhance method", async () => {
      const provider = await createAuggieProvider(defaultConfig);
      expect(typeof provider.enhance).toBe("function");
    });

    it("should return a provider with close method", async () => {
      const provider = await createAuggieProvider(defaultConfig);
      expect(typeof provider.close).toBe("function");
    });
  });

  describe("enhance", () => {
    it("should return success result with enhanced text", async () => {
      const provider = await createAuggieProvider(defaultConfig);
      const result = await provider.enhance(defaultContext);

      expect(result.success).toBe(true);
      expect(result.text).toBe("enhanced text");
      expect(result.error).toBeUndefined();
    });

    it("should call Auggie.create with correct options", async () => {
      const provider = await createAuggieProvider(defaultConfig);
      await provider.enhance(defaultContext);

      expect(mocks.createFn).toHaveBeenCalledWith({
        model: "sonnet4.5",
        workspaceRoot: "/workspace",
        allowIndexing: true,
        auggiePath: "/path/to/auggie",
        rules: ["/rule.md"],
        cliArgs: ["--arg"],
      });
    });

    it("should call client.prompt with full prompt", async () => {
      const provider = await createAuggieProvider(defaultConfig);
      await provider.enhance(defaultContext);

      expect(mocks.client.prompt).toHaveBeenCalledWith(
        "Enhance: original text",
        { isAnswerOnly: true }
      );
    });

    it("should return error result when Auggie.create fails", async () => {
      mocks.createFn.mockRejectedValueOnce(new Error("SDK init failed"));

      const provider = await createAuggieProvider(defaultConfig);
      const result = await provider.enhance(defaultContext);

      expect(result.success).toBe(false);
      expect(result.text).toBe("original text"); // Original text preserved
      expect(result.error).toBe("SDK init failed");
    });

    it("should return error result when prompt fails", async () => {
      mocks.client.prompt.mockRejectedValueOnce(new Error("API error"));

      const provider = await createAuggieProvider(defaultConfig);
      const result = await provider.enhance(defaultContext);

      expect(result.success).toBe(false);
      expect(result.text).toBe("original text");
      expect(result.error).toBe("API error");
    });

    it("should handle non-Error exceptions", async () => {
      mocks.client.prompt.mockRejectedValueOnce("String error");

      const provider = await createAuggieProvider(defaultConfig);
      const result = await provider.enhance(defaultContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe("String error");
    });
  });

  describe("close", () => {
    it("should call client.close when client exists", async () => {
      const provider = await createAuggieProvider(defaultConfig);
      await provider.enhance(defaultContext); // Initialize client
      await provider.close();

      expect(mocks.client.close).toHaveBeenCalled();
    });

    it("should not throw when close fails", async () => {
      mocks.client.close.mockRejectedValueOnce(new Error("Close failed"));

      const provider = await createAuggieProvider(defaultConfig);
      await provider.enhance(defaultContext);

      // Should not throw
      await expect(provider.close()).resolves.toBeUndefined();
    });

    it("should handle close when client was never initialized", async () => {
      const provider = await createAuggieProvider(defaultConfig);

      // Close without ever calling enhance
      await expect(provider.close()).resolves.toBeUndefined();
    });

    it("should set client to null after close", async () => {
      const provider = await createAuggieProvider(defaultConfig);
      await provider.enhance(defaultContext);
      await provider.close();

      // Second close should be safe (no client to close)
      await expect(provider.close()).resolves.toBeUndefined();
    });
  });
});
