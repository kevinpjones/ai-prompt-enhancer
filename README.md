# Personal Prompt Enhancer

A command-line tool that enhances AI prompts using the [Augment Code SDK](https://www.npmjs.com/package/@augmentcode/auggie-sdk). Designed to integrate with Vim, Neovim, Emacs, and Spacemacs for seamless prompt enhancement during development.

## Features

- **Context-Aware Enhancement**: Analyzes your workspace to generate detailed, actionable prompts
- **Editor Integration**: Works with Vim, Neovim, Emacs, and Spacemacs
- **Configurable**: Customize the model, wrapper prompt, and Auggie settings
- **Error Resilient**: Preserves original text if enhancement fails

## Installation

### Prerequisites

- Node.js 22+
- npm
- [Augment Code](https://www.augmentcode.com/) account and CLI access

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

### Configuration File

```json
{
  "model": "sonnet4.5",
  "wrapperPrompt": "Your custom prompt template with {input} placeholder",
  "auggiePath": "auggie",
  "rules": ["/path/to/rules.md"],
  "cliArgs": ["--mcp-config", "/path/to/mcp.json"]
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | string | `"sonnet4.5"` | AI model to use: `haiku4.5`, `sonnet4.5`, `sonnet4`, `gpt5` |
| `wrapperPrompt` | string | *(see below)* | Template for enhancing prompts. Must contain `{input}` placeholder |
| `auggiePath` | string | `"auggie"` | Path to the Auggie executable or wrapper script |
| `rules` | string[] | `[]` | Paths to rule files to pass to Auggie |
| `cliArgs` | string[] | `[]` | Additional CLI arguments for Auggie |

### Environment Variables

Environment variables take precedence over the config file:

| Variable | Overrides | Notes |
|----------|-----------|-------|
| `PROMPT_ENHANCER_MODEL` | `model` | Model name |
| `PROMPT_ENHANCER_PROMPT` | `wrapperPrompt` | Full prompt template |
| `PROMPT_ENHANCER_AUGGIE_PATH` | `auggiePath` | Path to executable |
| `PROMPT_ENHANCER_RULES` | `rules` | Comma-separated paths |
| `PROMPT_ENHANCER_CLI_ARGS` | `cliArgs` | Comma-separated arguments |

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

#### Alternative: Evil Mode Keybinding

If you prefer the Vim-style `<leader>e` binding in visual mode:

```elisp
(load "/path/to/vim-prompt-enhancer/enhance-prompt.el")
(enhance-prompt-setup-evil-keybindings)
```

Then select text and press `<leader>e` (usually `SPC e` or `, e` depending on your config).

#### Full Spacemacs Configuration Example

```elisp
(defun dotspacemacs/user-config ()
  ;; ... your other config ...

  ;; Prompt Enhancer Setup
  (load "~/projects/vim-prompt-enhancer/enhance-prompt.el")
  
  ;; Use the npm-linked command (after running `npm link`)
  (setq enhance-prompt-command "npx enhance-prompt")
  
  ;; Or point directly to the built CLI
  ;; (setq enhance-prompt-command "node ~/projects/vim-prompt-enhancer/dist/enhance-prompt.js")
  
  ;; Set up Spacemacs keybindings
  (enhance-prompt-setup-spacemacs-keybindings)
  
  ;; Optional: Also set up Evil visual mode binding
  ;; (enhance-prompt-setup-evil-keybindings)
  )
```

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

;; For Evil users
(with-eval-after-load 'evil
  (evil-define-key 'visual 'global (kbd "<leader>e") 'enhance-prompt-region))
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

## Advanced Configuration

### Using npx for Auggie

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

### Custom Rules and MCP Config

Pass additional Auggie options via `rules` and `cliArgs`:

```json
{
  "auggiePath": "/path/to/auggie-wrapper",
  "rules": [
    "~/projects/my-rules/coding-standards.md",
    "~/projects/my-rules/project-conventions.md"
  ],
  "cliArgs": [
    "--mcp-config", "~/.auggie/mcp.json"
  ]
}
```

### Model Selection

Choose the model based on your needs:

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| `haiku4.5` | Fastest | Good | Quick enhancements |
| `sonnet4.5` | Fast | Excellent | Default choice |
| `sonnet4` | Medium | Excellent | Complex prompts |
| `gpt5` | Medium | Excellent | Alternative provider |

## Project Structure

```
vim-prompt-enhancer/
├── src/
│   ├── index.ts        # CLI entry point
│   ├── config.ts       # Configuration loader
│   ├── enhancer.ts     # Auggie SDK integration
│   └── types.ts        # TypeScript interfaces
├── bin/
│   └── auggie-wrapper  # npx wrapper script
├── dist/
│   └── enhance-prompt.js  # Built CLI
├── examples/           # Configuration examples
├── enhance-prompt.vim  # Vim/Neovim integration
├── enhance-prompt.el   # Emacs/Spacemacs integration
├── example.prompt-enhancer.json
├── package.json
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test locally
echo "test prompt" | node dist/enhance-prompt.js $(pwd)
```

## Troubleshooting

### "spawn auggie ENOENT"

The Auggie CLI is not found. Either:
- Install Auggie globally
- Use the included `bin/auggie-wrapper` script
- Set `auggiePath` to point to your Auggie installation

### Enhancement returns original text with error

Check stderr for the specific error. Common issues:
- Invalid API credentials
- Network connectivity
- Invalid model name

### Vim shows no output

Ensure the CLI is built and the path in `enhance-prompt.vim` is correct:
```vim
" Check the command works manually:
:!echo "test" | npx enhance-prompt $(pwd)
```

### Spacemacs: Command not found

If you see errors about the command not being found:

1. Ensure you've run `npm run build` to create the CLI
2. Either run `npm link` to enable `npx enhance-prompt`, or
3. Set the full path in your config:
   ```elisp
   (setq enhance-prompt-command "node /full/path/to/dist/enhance-prompt.js")
   ```

### Spacemacs: No keybindings

Make sure you call the setup function after loading:
```elisp
(load "/path/to/enhance-prompt.el")
(enhance-prompt-setup-spacemacs-keybindings)  ; Don't forget this!
```

## License

MIT
