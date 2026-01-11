import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/__tests__/**"], // CLI entry point and tests
    },
    mockReset: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      // Handle .js extensions in imports for ESM compatibility
    },
  },
});
