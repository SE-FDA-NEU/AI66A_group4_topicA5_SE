// Bundles a small JSX entry with esbuild and loads it, so tests can render real components.
import { build } from "esbuild";
import { existsSync } from "node:fs";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const FRONTEND_DIR = fileURLToPath(new URL("..", import.meta.url));

export async function loadBundle(contents) {
  // PR merge builds can use main's reverted UI while the branch push still has
  // the optional theme provider. Keep the render harness valid in either tree.
  if (!existsSync(join(FRONTEND_DIR, "src", "theme.jsx"))) {
    contents = contents
      .replace('    import {ThemeProvider} from "./src/theme";\n', "")
      .replace('React.createElement(ThemeProvider, null, React.createElement(AuthProvider, null, React.createElement(App)))', 'React.createElement(AuthProvider, null, React.createElement(App))');
  }
  const result = await build({
    stdin: { contents, resolveDir: FRONTEND_DIR, loader: "jsx" },
    bundle: true, platform: "node", format: "cjs", write: false, jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const directory = await mkdtemp(join(tmpdir(), "credit-render-"));
  const output = join(directory, "bundle.cjs");
  await writeFile(output, result.outputFiles[0].text);
  const mod = createRequire(import.meta.url)(output);
  const cleanup = async () => { await unlink(output); await rmdir(directory); };
  return { mod, cleanup };
}
