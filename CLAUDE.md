# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Prompt Enhancer is a CLI tool that enhances AI prompts using multiple providers (Auggie, Claude CLI, Claude API, Gemini CLI). It integrates with Vim, Neovim, Emacs, and Spacemacs to replace selected text with AI-enhanced prompts.

## Commands

```bash
# Build the CLI (esbuild bundles to dist/enhance-prompt.js)
npm run build

# Run tests
npm test                    # Run all tests once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report

# Linting and formatting
npm run lint                # Check for lint errors
npm run lint:fix            # Fix lint errors
npm run type-check          # TypeScript type checking
npm run format              # Format with Prettier
npm run format:check        # Check formatting

# Test locally
echo "test prompt" | node dist/enhance-prompt.js $(pwd)
```

## Architecture

### Provider Pattern

The codebase uses a provider abstraction pattern with a discriminated union for configuration:

```
index.ts (CLI) → config.ts (load + validate) → enhancer.ts (facade) → providers/index.ts (factory) → specific provider
```

**Key interfaces in `src/providers/base.ts`:**
- `Provider` - interface all providers implement (`enhance()`, `close()`)
- `ProviderContext` - input/fullPrompt/workspaceRoot passed to providers
- `ProviderResult` - success/text/error returned by providers

**Provider registry in `src/providers/index.ts`:**
- Factory pattern maps provider type string to factory function
- `createProvider(config)` instantiates the appropriate provider

**Configuration (`src/types.ts`):**
- `Config` is a discriminated union based on the `provider` field
- Each provider has its own config interface (e.g., `AuggieProviderConfig`, `ClaudeCliProviderConfig`)
- Legacy config (no provider field) defaults to Auggie

### Data Flow

1. Editor sends selected text via stdin + working directory as CLI argument
2. Config loaded from `~/.prompt-enhancer.json` (env vars override)
3. Provider factory creates appropriate provider instance
4. Provider wraps text with template, sends to AI, returns enhanced text
5. Enhanced text goes to stdout → editor replaces selection

### Error Handling

- On failure, returns original text (not empty) so editor replacement doesn't delete content
- stderr filtered by default (SDK/MCP noise); `showStderr: true` enables full stderr output
- Exit code 0 even on errors to ensure Vim receives output

## Adding a New Provider

1. Create `src/providers/<name>.ts` implementing `Provider` interface
2. Add config interface to `src/types.ts` and add to `Config` union
3. Add provider type to `ProviderType` and `VALID_PROVIDERS` in `src/types.ts`
4. Register factory in `src/providers/index.ts`
5. Add validation logic in `src/config.ts`

## Editor Integration

- **Vim/Neovim**: `enhance-prompt.vim` - uses `<Leader>e` mapping
- **Emacs/Spacemacs**: `enhance-prompt.el` - uses `SPC o e` (region) and `SPC o E` (buffer)

## Testing

Tests are in `src/__tests__/` using Vitest. Test files mirror source structure:
- `src/__tests__/config.test.ts` - config loading/validation tests
- `src/__tests__/enhancer.test.ts` - facade tests
- `src/__tests__/providers/*.test.ts` - provider-specific tests