// Bundles a small JSX entry with esbuild and loads it, so tests can render real components.
import { build } from "esbuild";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

export async function loadBundle(contents) {
  const result = await build({
    stdin: { contents, resolveDir: process.cwd(), loader: "jsx" },
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
