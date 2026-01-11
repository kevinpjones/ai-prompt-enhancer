/**
 * Unit tests for src/providers/claude-cli.ts
 *
 * Tests the Claude CLI provider implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClaudeCliProvider } from "../../src/providers/claude-cli.js";
import type { ClaudeCliProviderConfig } from "../../src/types.js";
import type { ProviderContext } from "../../src/providers/base.js";
import { spawn } from "child_process";
import { EventEmitter } from "events";

// Mock child_process
vi.mock("child_process");

// Helper to create a mock child process
function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.stdin = {
    write: vi.fn(),
    end: vi.fn(),
  };
  return proc;
}

describe("providers/claude-cli.ts", () => {
  const defaultConfig: ClaudeCliProviderConfig = {
    provider: "claude-cli",
    wrapperPrompt: "Enhance: {input}",
    claudePath: "/path/to/claude",
  };

  const defaultContext: ProviderContext = {
    input: "original text",
    fullPrompt: "Enhance: original text",
    workspaceRoot: "/workspace",
  };

  let mockProcess: ReturnType<typeof createMockProcess>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess as any);
  });

  describe("createClaudeCliProvider", () => {
    it("should create a provider with name claude-cli", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);
      expect(provider.name).toBe("claude-cli");
    });

    it("should return a provider with enhance method", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);
      expect(typeof provider.enhance).toBe("function");
    });

    it("should return a provider with close method", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);
      expect(typeof provider.close).toBe("function");
    });
  });

  describe("enhance", () => {
    it("should return success result with enhanced text", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);

      // Start enhance and simulate process completion
      const enhancePromise = provider.enhance(defaultContext);

      // Emit stdout data
      mockProcess.stdout.emit("data", Buffer.from("enhanced text"));
      // Emit close event with success
      mockProcess.emit("close", 0);

      const result = await enhancePromise;

      expect(result.success).toBe(true);
      expect(result.text).toBe("enhanced text");
    });

    it("should spawn claude with correct arguments", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);

      const enhancePromise = provider.enhance(defaultContext);
      mockProcess.stdout.emit("data", Buffer.from("result"));
      mockProcess.emit("close", 0);
      await enhancePromise;

      expect(spawn).toHaveBeenCalledWith(
        "/path/to/claude",
        expect.arrayContaining(["--print", "Enhance: original text"]),
        expect.objectContaining({
          cwd: "/workspace",
        })
      );
    });

    it("should include model argument when specified", async () => {
      const configWithModel: ClaudeCliProviderConfig = {
        ...defaultConfig,
        model: "claude-3-opus",
      };
      const provider = await createClaudeCliProvider(configWithModel);

      const enhancePromise = provider.enhance(defaultContext);
      mockProcess.stdout.emit("data", Buffer.from("result"));
      mockProcess.emit("close", 0);
      await enhancePromise;

      expect(spawn).toHaveBeenCalledWith(
        "/path/to/claude",
        expect.arrayContaining(["--model", "claude-3-opus"]),
        expect.any(Object)
      );
    });

    it("should include additional CLI args when specified", async () => {
      const configWithArgs: ClaudeCliProviderConfig = {
        ...defaultConfig,
        cliArgs: ["--verbose", "--timeout", "30"],
      };
      const provider = await createClaudeCliProvider(configWithArgs);

      const enhancePromise = provider.enhance(defaultContext);
      mockProcess.stdout.emit("data", Buffer.from("result"));
      mockProcess.emit("close", 0);
      await enhancePromise;

      expect(spawn).toHaveBeenCalledWith(
        "/path/to/claude",
        expect.arrayContaining(["--verbose", "--timeout", "30"]),
        expect.any(Object)
      );
    });

    it("should use default claude path when not specified", async () => {
      const configNoPath: ClaudeCliProviderConfig = {
        provider: "claude-cli",
        wrapperPrompt: "{input}",
      };
      const provider = await createClaudeCliProvider(configNoPath);

      const enhancePromise = provider.enhance(defaultContext);
      mockProcess.stdout.emit("data", Buffer.from("result"));
      mockProcess.emit("close", 0);
      await enhancePromise;

      expect(spawn).toHaveBeenCalledWith("claude", expect.any(Array), expect.any(Object));
    });

    it("should return error when process exits with non-zero code", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);

      const enhancePromise = provider.enhance(defaultContext);
      mockProcess.stderr.emit("data", Buffer.from("Error message"));
      mockProcess.emit("close", 1);

      const result = await enhancePromise;

      expect(result.success).toBe(false);
      expect(result.text).toBe("original text");
      expect(result.error).toContain("Error message");
    });

    it("should return error when output is empty", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);

      const enhancePromise = provider.enhance(defaultContext);
      mockProcess.stdout.emit("data", Buffer.from("   \n  "));
      mockProcess.emit("close", 0);

      const result = await enhancePromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("empty output");
    });

    it("should handle ENOENT error when claude not found", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);

      const enhancePromise = provider.enhance(defaultContext);
      const enoentError = new Error("spawn ENOENT") as NodeJS.ErrnoException;
      enoentError.code = "ENOENT";
      mockProcess.emit("error", enoentError);

      const result = await enhancePromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.error).toContain("/path/to/claude");
    });

    it("should handle other spawn errors", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);

      const enhancePromise = provider.enhance(defaultContext);
      mockProcess.emit("error", new Error("Spawn failed"));

      const result = await enhancePromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe("Spawn failed");
    });

    it("should trim whitespace from output", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);

      const enhancePromise = provider.enhance(defaultContext);
      mockProcess.stdout.emit("data", Buffer.from("  enhanced text  \n"));
      mockProcess.emit("close", 0);

      const result = await enhancePromise;

      expect(result.text).toBe("enhanced text");
    });

    it("should accumulate multiple stdout chunks", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);

      const enhancePromise = provider.enhance(defaultContext);
      mockProcess.stdout.emit("data", Buffer.from("part1 "));
      mockProcess.stdout.emit("data", Buffer.from("part2 "));
      mockProcess.stdout.emit("data", Buffer.from("part3"));
      mockProcess.emit("close", 0);

      const result = await enhancePromise;

      expect(result.text).toBe("part1 part2 part3");
    });

    it("should set CI=true environment variable", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);

      const enhancePromise = provider.enhance(defaultContext);
      mockProcess.stdout.emit("data", Buffer.from("result"));
      mockProcess.emit("close", 0);
      await enhancePromise;

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({ CI: "true" }),
        })
      );
    });
  });

  describe("close", () => {
    it("should resolve immediately (no cleanup needed)", async () => {
      const provider = await createClaudeCliProvider(defaultConfig);
      await expect(provider.close()).resolves.toBeUndefined();
    });
  });
});
