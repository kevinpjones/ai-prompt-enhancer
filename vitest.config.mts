import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"], // CLI entry point is integration tested
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
