/**
 * Unit tests for src/providers/base.ts
 *
 * Tests the provider interface contracts and types.
 */

import { describe, it, expect } from "vitest";
import type {
  Provider,
  ProviderContext,
  ProviderResult,
  ProviderFactory,
} from "../../src/providers/base.js";

describe("providers/base.ts", () => {
  describe("ProviderContext interface", () => {
    it("should accept valid provider context", () => {
      const context: ProviderContext = {
        input: "original text",
        fullPrompt: "Enhanced: original text",
        workspaceRoot: "/path/to/workspace",
      };

      expect(context.input).toBe("original text");
      expect(context.fullPrompt).toBe("Enhanced: original text");
      expect(context.workspaceRoot).toBe("/path/to/workspace");
    });
  });

  describe("ProviderResult interface", () => {
    it("should accept success result", () => {
      const result: ProviderResult = {
        success: true,
        text: "enhanced text",
      };

      expect(result.success).toBe(true);
      expect(result.text).toBe("enhanced text");
      expect(result.error).toBeUndefined();
    });

    it("should accept error result", () => {
      const result: ProviderResult = {
        success: false,
        text: "original text",
        error: "Something went wrong",
      };

      expect(result.success).toBe(false);
      expect(result.text).toBe("original text");
      expect(result.error).toBe("Something went wrong");
    });
  });

  describe("Provider interface", () => {
    it("should define required methods and properties", () => {
      // Create a mock provider that implements the interface
      const mockProvider: Provider = {
        name: "test-provider",
        enhance: async (context: ProviderContext): Promise<ProviderResult> => {
          return {
            success: true,
            text: `Enhanced: ${context.input}`,
          };
        },
        close: async (): Promise<void> => {
          // Cleanup
        },
      };

      expect(mockProvider.name).toBe("test-provider");
      expect(typeof mockProvider.enhance).toBe("function");
      expect(typeof mockProvider.close).toBe("function");
    });

    it("should allow async enhance implementation", async () => {
      const mockProvider: Provider = {
        name: "async-provider",
        enhance: async (context: ProviderContext): Promise<ProviderResult> => {
          // Simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 1));
          return {
            success: true,
            text: context.fullPrompt.toUpperCase(),
          };
        },
        close: async (): Promise<void> => {},
      };

      const context: ProviderContext = {
        input: "test",
        fullPrompt: "test prompt",
        workspaceRoot: "/workspace",
      };

      const result = await mockProvider.enhance(context);
      expect(result.success).toBe(true);
      expect(result.text).toBe("TEST PROMPT");
    });
  });

  describe("ProviderFactory type", () => {
    it("should define factory function signature", async () => {
      interface TestConfig {
        option: string;
      }

      const factory: ProviderFactory<TestConfig> = async (
        config: TestConfig
      ): Promise<Provider> => {
        return {
          name: `factory-${config.option}`,
          enhance: async () => ({ success: true, text: "result" }),
          close: async () => {},
        };
      };

      const provider = await factory({ option: "test" });
      expect(provider.name).toBe("factory-test");
    });
  });
});
