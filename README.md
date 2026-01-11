# Personal Prompt Enhancer

A command-line tool that enhances AI prompts using multiple providers. Designed to integrate with Vim, Neovim, Emacs, and Spacemacs for seamless prompt enhancement during development.

## Features

- **Multi-Provider Support**: Choose from Auggie, Claude Code CLI, or Claude API
- **Context-Aware Enhancement**: Analyzes your workspace to generate detailed, actionable prompts
- **Editor Integration**: Works with Vim, Neovim, Emacs, and Spacemacs
- **Configurable**: Customize the provider, model, wrapper prompt, and other settings
- **Error Resilient**: Preserves original text if enhancement fails
- **Backward Compatible**: Existing configurations continue to work

## Providers

The enhancer supports three providers:

| Provider            | ID           | Authentication                | Best For                                            |
| ------------------- | ------------ | ----------------------------- | --------------------------------------------------- |
| **Auggie**          | `auggie`     | Augment Code account          | Full workspace indexing, IDE-like context           |
| **Claude Code CLI** | `claude-cli` | Claude Code auth (no API key) | Quick setup, uses existing Claude Code installation |
| **Claude API**      | `claude-api` | Anthropic API key             | Direct API access, full control                     |

## Installation

### Prerequisites

- Node.js 22+
- npm
- One of the following:
  - [Augment Code](https://www.augmentcode.com/) account (for Auggie provider)
  - [Claude Code](https://claude.ai/code) installed (for Claude CLI provider)
  - Anthropic API key (for Claude API provider)

### Setup

1. **Clone and build:**

   ```bash
   git clone <repository-url>
   cd vim-prompt-enhancer
   npm install
   npm run build
   ```

2. **Create configuration file:**

   ```bash
   cp example.prompt-enhancer.json ~/.prompt-enhancer.json
   ```

3. **Optional - Enable global npx access:**
   ```bash
   npm link
   ```

## Configuration

The enhancer uses a configuration file at `~/.prompt-enhancer.json`. Environment variables can override any setting.

### Provider Selection

Add the `provider` field to your config to choose your provider:

#### Auggie Provider (Default)

```json
{
  "provider": "auggie",
  "model": "sonnet4.5",
  "auggiePath": "auggie",
  "rules": ["/path/to/rules.md"],
  "cliArgs": ["--mcp-config", "/path/to/mcp.json"]
}
```

#### Claude Code CLI Provider (Recommended for Claude Users)

```json
{
  "provider": "claude-cli",
  "claudePath": "claude",
  "wrapperPrompt": "Your custom prompt with {input} placeholder"
}
```

No API key required! Uses your existing Claude Code authentication.

#### Claude API Provider

```json
{
  "provider": "claude-api",
  "model": "claude-sonnet-4-5",
  "maxTokens": 4096
}
```

Set your API key via environment variable:

```bash
export ANTHROPIC_API_KEY="your-api-key"
```

### Legacy Configuration (Backward Compatible)

Existing configurations without a `provider` field continue to work and default to Auggie:

```json
{
  "model": "sonnet4.5",
  "wrapperPrompt": "Your custom prompt with {input} placeholder"
}
```

### Configuration Options by Provider

#### Common Options (All Providers)

| Option          | Type    | Default       | Description                                                        |
| --------------- | ------- | ------------- | ------------------------------------------------------------------ |
| `provider`      | string  | `"auggie"`    | Provider to use: `auggie`, `claude-cli`, `claude-api`              |
| `wrapperPrompt` | string  | _(see below)_ | Template for enhancing prompts. Must contain `{input}` placeholder |
| `showStderr`    | boolean | `false`       | Show stderr output instead of filtering SDK/MCP warnings           |

#### Auggie Provider Options

| Option       | Type     | Default       | Description                                          |
| ------------ | -------- | ------------- | ---------------------------------------------------- |
| `model`      | string   | `"sonnet4.5"` | AI model: `haiku4.5`, `sonnet4.5`, `sonnet4`, `gpt5` |
| `auggiePath` | string   | `"auggie"`    | Path to the Auggie executable                        |
| `rules`      | string[] | `[]`          | Paths to rule files to pass to Auggie                |
| `cliArgs`    | string[] | `[]`          | Additional CLI arguments for Auggie                  |

#### Claude CLI Provider Options

| Option       | Type     | Default     | Description                         |
| ------------ | -------- | ----------- | ----------------------------------- |
| `claudePath` | string   | `"claude"`  | Path to the Claude CLI executable   |
| `model`      | string   | _(default)_ | Optional model override             |
| `cliArgs`    | string[] | `[]`        | Additional CLI arguments for Claude |

#### Claude API Provider Options

| Option      | Type   | Default              | Description                                  |
| ----------- | ------ | -------------------- | -------------------------------------------- |
| `model`     | string | `"claude-sonnet-4-5"` | Claude model to use (auto-updates to latest) |
| `apiKey`    | string | _(env var)_                  | API key (or use `ANTHROPIC_API_KEY` env var) |
| `maxTokens` | number | `4096`                       | Maximum tokens for response                  |

### Environment Variables

Environment variables take precedence over the config file:

| Variable                      | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| `PROMPT_ENHANCER_PROVIDER`    | Override provider selection                          |
| `PROMPT_ENHANCER_PROMPT`      | Override wrapper prompt template                     |
| `PROMPT_ENHANCER_MODEL`       | Override model (provider-specific)                   |
| `PROMPT_ENHANCER_AUGGIE_PATH` | Path to Auggie executable                            |
| `PROMPT_ENHANCER_CLAUDE_PATH` | Path to Claude CLI executable                        |
| `PROMPT_ENHANCER_RULES`       | Comma-separated rule file paths                      |
| `PROMPT_ENHANCER_CLI_ARGS`    | Comma-separated CLI arguments                        |
| `PROMPT_ENHANCER_MAX_TOKENS`  | Max tokens for Claude API                            |
| `PROMPT_ENHANCER_API_KEY`     | API key for Claude API                               |
| `PROMPT_ENHANCER_SHOW_STDERR` | Show stderr output (`true`, `1`, or `yes` to enable) |
| `ANTHROPIC_API_KEY`           | Standard Anthropic API key (for Claude API)          |

### Default Wrapper Prompt

```
You are a prompt enhancement assistant. Given the following rough prompt idea,
expand it into a clear, detailed, and actionable prompt for an AI coding assistant.

Consider:
- The workspace context and relevant files
- Specific, clear instructions
- Expected output format

Original prompt to enhance:
{input}

Provide an enhanced version that is comprehensive and context-aware.
Output ONLY the enhanced prompt, no explanations or preamble.
```

## Usage

### Command Line

```bash
# Basic usage - pipe text and provide workspace directory
echo "add tests for the auth module" | enhance-prompt /path/to/project

# Or with node directly
echo "fix the login bug" | node dist/enhance-prompt.js /path/to/project
```

### Vim / Neovim Integration

1. **Add to your `.vimrc` or `init.vim`:**

   ```vim
   source /path/to/vim-prompt-enhancer/enhance-prompt.vim
   ```

2. **Use in Vim:**
   - Write a rough prompt in your file
   - Select the text visually (`v` or `V`)
   - Press `<Leader>e` or run `:call EnhancePrompt()`
   - The selected text is replaced with the enhanced prompt

### Spacemacs Integration

Spacemacs uses Emacs Lisp, not Vimscript. Use the provided `enhance-prompt.el` file.

#### Quick Setup

Add the following to your `dotspacemacs/user-config` section in `~/.spacemacs`:

```elisp
;; Load the enhance-prompt package
(load "/path/to/vim-prompt-enhancer/enhance-prompt.el")

;; Set up keybindings: SPC o e for region, SPC o E for buffer
(enhance-prompt-setup-spacemacs-keybindings)

;; Optional: Customize the command if not using npm link
(setq enhance-prompt-command "node /path/to/vim-prompt-enhancer/dist/enhance-prompt.js")
```

#### Usage in Spacemacs

1. Select text in visual state (`v` or `V`)
2. Press `SPC o e` to enhance the selection
3. Or press `SPC o E` to enhance the entire buffer

### Emacs (non-Spacemacs) Integration

For vanilla Emacs or Doom Emacs:

```elisp
;; Add to your init.el or config.el
(load "/path/to/vim-prompt-enhancer/enhance-prompt.el")

;; Customize command if needed
(setq enhance-prompt-command "npx enhance-prompt")

;; Bind to your preferred keys
(global-set-key (kbd "C-c e") 'enhance-prompt-region)
(global-set-key (kbd "C-c E") 'enhance-prompt-buffer)
```

### Example

**Before (your rough prompt):**

```
add error handling
```

**After (enhanced by AI with workspace context):**

```
Add comprehensive error handling to the config loader in `src/config.ts`.
The `loadConfig()` function currently has minimal error handling. Improve it to:

1. **File reading errors**: Catch specific file system errors
2. **JSON parsing errors**: Provide detailed error messages with line numbers
3. **Schema validation**: Validate config matches the expected structure
...
```

## Provider-Specific Setup

### Auggie Provider Setup

1. Install [Augment Code](https://www.augmentcode.com/)
2. Authenticate with Auggie
3. Configure (or use defaults):
   ```json
   {
     "provider": "auggie",
     "model": "sonnet4.5"
   }
   ```

#### Using npx for Auggie

If you don't have `auggie` installed globally, create a wrapper script:

**`bin/auggie-wrapper`** (included in this project):

```bash
#!/bin/bash
exec npx -y @augmentcode/auggie@latest "$@"
```

Then configure:

```json
{
  "auggiePath": "/path/to/vim-prompt-enhancer/bin/auggie-wrapper"
}
```

### Claude Code CLI Provider Setup

1. Install [Claude Code](https://claude.ai/code)
2. Authenticate with Claude Code
3. Configure:
   ```json
   {
     "provider": "claude-cli"
   }
   ```

That's it! No API key needed.

#### Using npx for Claude Code

If `claude` is an alias or not in your PATH, use the included wrapper script:

**`bin/claude-wrapper`** (included in this project):

```bash
#!/bin/bash
exec npx -y @anthropic-ai/claude-code@latest "$@"
```

Then configure:

```json
{
  "provider": "claude-cli",
  "claudePath": "/path/to/vim-prompt-enhancer/bin/claude-wrapper"
}
```

Or via environment variable:

```bash
export PROMPT_ENHANCER_CLAUDE_PATH="/path/to/vim-prompt-enhancer/bin/claude-wrapper"
```

### Claude API Provider Setup

1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Set the environment variable:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key"
   ```
3. Install the optional SDK (done automatically):
   ```bash
   npm install @anthropic-ai/sdk
   ```
4. Configure:
   ```json
   {
     "provider": "claude-api",
     "model": "claude-sonnet-4-5-20250929"
   }
   ```

## Model Selection

### Auggie Models

| Model       | Speed   | Quality   | Best For             |
| ----------- | ------- | --------- | -------------------- |
| `haiku4.5`  | Fastest | Good      | Quick enhancements   |
| `sonnet4.5` | Fast    | Excellent | Default choice       |
| `sonnet4`   | Medium  | Excellent | Complex prompts      |
| `gpt5`      | Medium  | Excellent | Alternative provider |

### Claude API Models

| Model                        | Description                                    |
| ---------------------------- | ---------------------------------------------- |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 - smart model                |
| `claude-haiku-4-5-20251001`  | Claude Haiku 4.5 - fastest                     |
| `claude-opus-4-5-20251101`   | Claude Opus 4.5 - most capable                 |
| `claude-sonnet-4-5`          | Alias (default) - auto-updates to latest Sonnet |
| `claude-haiku-4-5`           | Alias - auto-updates to latest Haiku 4.5      |
| `claude-opus-4-5`            | Alias - auto-updates to latest Opus 4.5       |
| `claude-3-5-sonnet-20241022` | Claude 3.5 Sonnet (legacy)                    |
| `claude-3-5-haiku-20241022`  | Claude 3.5 Haiku (legacy)                     |

## Project Structure

```
vim-prompt-enhancer/
├── src/
│   ├── index.ts        # CLI entry point
│   ├── config.ts       # Configuration loader
│   ├── enhancer.ts     # Provider facade
│   ├── types.ts        # TypeScript interfaces
│   └── providers/      # Provider implementations
│       ├── base.ts     # Provider interface
│       ├── index.ts    # Provider registry
│       ├── auggie.ts   # Auggie SDK provider
│       ├── claude-cli.ts   # Claude Code CLI provider
│       └── claude-api.ts   # Anthropic API provider
├── bin/
│   ├── auggie-wrapper  # npx wrapper for Auggie
│   └── claude-wrapper  # npx wrapper for Claude Code
├── dist/
│   └── enhance-prompt.js  # Built CLI
├── examples/           # Configuration examples
├── enhance-prompt.vim  # Vim/Neovim integration
├── enhance-prompt.el   # Emacs/Spacemacs integration
├── package.json
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run type-check

# Test locally
echo "test prompt" | node dist/enhance-prompt.js $(pwd)
```

## Troubleshooting

### "spawn auggie ENOENT" or "spawn claude ENOENT"

The CLI executable is not found. Either:

- Install the tool globally
- Use a wrapper script
- Set the appropriate path in config (`auggiePath` or `claudePath`)

### "Claude API provider requires an API key"

For the Claude API provider, you need to set an API key:

```bash
export ANTHROPIC_API_KEY="your-api-key"
```

Or add it to your config:

```json
{
  "provider": "claude-api",
  "apiKey": "your-api-key"
}
```

### "Claude API provider requires the @anthropic-ai/sdk package"

Install the optional dependency:

```bash
npm install @anthropic-ai/sdk
```

### Enhancement returns original text with error

Check stderr for the specific error. Common issues:

- Invalid API credentials
- Network connectivity
- Invalid model name
- Provider not properly configured

### Vim shows no output

Ensure the CLI is built and the path in `enhance-prompt.vim` is correct:

```vim
" Check the command works manually:
:!echo "test" | npx enhance-prompt $(pwd)
```

### Spacemacs: Command not found

1. Ensure you've run `npm run build` to create the CLI
2. Either run `npm link` to enable `npx enhance-prompt`, or
3. Set the full path in your config:
   ```elisp
   (setq enhance-prompt-command "node /full/path/to/dist/enhance-prompt.js")
   ```

## License

MIT
