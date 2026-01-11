import { loadConfig } from "./config.js";
import { enhancePrompt } from "./enhancer.js";

// Store original input for error recovery
let storedInput = "";

// Handle unhandled rejections gracefully
process.on("unhandledRejection", (error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (storedInput.trim()) {
    process.stdout.write(`${storedInput.trim()}\n\n[Enhancement Error: ${errorMessage}]`);
  } else {
    console.error(`[Enhancement Error: ${errorMessage}]`);
  }
  process.exit(0); // Exit cleanly so Vim gets the output
});

process.on("uncaughtException", (error) => {
  if (storedInput.trim()) {
    process.stdout.write(`${storedInput.trim()}\n\n[Enhancement Error: ${error.message}]`);
  } else {
    console.error(`[Enhancement Error: ${error.message}]`);
  }
  process.exit(0); // Exit cleanly so Vim gets the output
});

/**
 * Read all input from stdin
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    process.stdin.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    process.stdin.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });

    process.stdin.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  // Get working directory from command line argument
  const args = process.argv.slice(2);
  const workspaceRoot = args[0] || process.cwd();

  try {
    // Read input from stdin
    storedInput = await readStdin();

    if (!storedInput.trim()) {
      // No input provided, output nothing
      process.exit(0);
    }

    // Load configuration
    const config = loadConfig();

    // Enhance the prompt
    const result = await enhancePrompt(storedInput.trim(), workspaceRoot, config);

    if (result.success) {
      // Output enhanced prompt
      process.stdout.write(result.text);
    } else {
      // Output original text with error message
      process.stdout.write(
        `${result.text}\n\n[Enhancement Error: ${result.error}]`
      );
    }
  } catch (error) {
    // Fatal error: output original text with error message
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    
    if (storedInput.trim()) {
      // Return original text with error appended
      process.stdout.write(
        `${storedInput.trim()}\n\n[Enhancement Error: ${errorMessage}]`
      );
    } else {
      process.stderr.write(`Fatal error: ${errorMessage}\n`);
      process.exit(1);
    }
  }
}

// Run the CLI
main();
