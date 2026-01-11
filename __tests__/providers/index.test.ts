/**
 * Unit tests for src/providers/index.ts
 *
 * Tests the provider registry and factory functions.
 * 
 * Note: These tests use the actual provider factories since mocking
 * the dynamic imports in each provider is complex. We mock only the
 * external SDKs at the edges.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuggieProviderConfig, ClaudeCliProviderConfig, ClaudeApiProviderConfig } from "../../src/types.js";

// Mock external dependencies used by providers
vi.mock("@augmentcode/auggie-sdk", () => ({
  Auggie: {
    create: vi.fn().mockResolvedValue({
      prompt: vi.fn().mockResolvedValue("enhanced"),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("child_process", () => ({
  spawn: vi.fn(() => {
    const { EventEmitter } = require("events");
    const proc = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.stdin = { write: vi.fn(), end: vi.fn() };
    // Simulate successful output
    setTimeout(() => {
      proc.stdout.emit("data", Buffer.from("enhanced"));
      proc.emit("close", 0);
    }, 0);
    return proc;
  }),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "enhanced" }],
      }),
    },
  })),
}));

// Import after mocks
import { createProvider, getAvailableProviders } from "../../src/providers/index.js";

describe("providers/index.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAvailableProviders", () => {
    it("should return all available provider types", () => {
      const providers = getAvailableProviders();

      expect(providers).toContain("auggie");
      expect(providers).toContain("claude-cli");
      expect(providers).toContain("claude-api");
    });

    it("should return exactly 3 providers", () => {
      const providers = getAvailableProviders();
      expect(providers).toHaveLength(3);
    });

    it("should return array of strings", () => {
      const providers = getAvailableProviders();
      providers.forEach((p) => {
        expect(typeof p).toBe("string");
      });
    });
  });

  describe("createProvider", () => {
    it("should create Auggie provider for auggie config", async () => {
      const config: AuggieProviderConfig = {
        provider: "auggie",
        model: "sonnet4.5",
        wrapperPrompt: "{input}",
      };

      const provider = await createProvider(config);

      expect(provider).toBeDefined();
      expect(provider.name).toBe("auggie");
      expect(typeof provider.enhance).toBe("function");
      expect(typeof provider.close).toBe("function");
    });

    it("should create Claude CLI provider for claude-cli config", async () => {
      const config: ClaudeCliProviderConfig = {
        provider: "claude-cli",
        wrapperPrompt: "{input}",
      };

      const provider = await createProvider(config);

      expect(provider).toBeDefined();
      expect(provider.name).toBe("claude-cli");
      expect(typeof provider.enhance).toBe("function");
      expect(typeof provider.close).toBe("function");
    });

    it("should create Claude API provider for claude-api config", async () => {
      const config: ClaudeApiProviderConfig = {
        provider: "claude-api",
        model: "claude-sonnet-4-20250514",
        wrapperPrompt: "{input}",
        apiKey: "test-key",
      };

      const provider = await createProvider(config);

      expect(provider).toBeDefined();
      expect(provider.name).toBe("claude-api");
      expect(typeof provider.enhance).toBe("function");
      expect(typeof provider.close).toBe("function");
    });

    it("should throw error for unknown provider", async () => {
      const config = {
        provider: "unknown-provider" as any,
        wrapperPrompt: "{input}",
      };

      await expect(createProvider(config)).rejects.toThrow(
        /Unknown provider.*unknown-provider/
      );
    });

    it("should include available providers in error message", async () => {
      const config = {
        provider: "invalid" as any,
        wrapperPrompt: "{input}",
      };

      await expect(createProvider(config)).rejects.toThrow(
        /Available providers/
      );
    });
  });
});
