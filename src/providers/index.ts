/**
 * Provider registry and factory
 *
 * This module manages the available providers and provides a factory function
 * to instantiate providers based on configuration.
 */

import type { Provider, ProviderFactory } from "./base.js";
import type { Config, ProviderType } from "../types.js";
import { createAuggieProvider } from "./auggie.js";
import { createClaudeCliProvider } from "./claude-cli.js";
import { createClaudeApiProvider } from "./claude-api.js";

/**
 * Registry of available providers mapped to their factory functions
 */
const providerFactories: Record<ProviderType, ProviderFactory<Config>> = {
  auggie: createAuggieProvider as ProviderFactory<Config>,
  "claude-cli": createClaudeCliProvider as ProviderFactory<Config>,
  "claude-api": createClaudeApiProvider as ProviderFactory<Config>,
};

/**
 * Create a provider instance based on configuration
 * @param config - Configuration specifying which provider to use
 * @returns Promise resolving to the created provider
 * @throws Error if provider type is unknown
 */
export async function createProvider(config: Config): Promise<Provider> {
  const providerType = config.provider;
  const factory = providerFactories[providerType];

  if (!factory) {
    const available = Object.keys(providerFactories).join(", ");
    throw new Error(
      `Unknown provider: "${providerType}". Available providers: ${available}`
    );
  }

  return factory(config);
}

/**
 * Get list of available provider names
 * @returns Array of provider type strings
 */
export function getAvailableProviders(): ProviderType[] {
  return Object.keys(providerFactories) as ProviderType[];
}

// Re-export base types for convenience
export type { Provider, ProviderContext, ProviderResult, ProviderFactory } from "./base.js";
