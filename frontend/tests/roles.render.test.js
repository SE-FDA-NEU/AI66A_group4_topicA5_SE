// Render the actual routes without browser effects or requests to the user DB.
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

test("role-specific navigation, dashboard and employee route render correctly", async () => {
  const result = await build({
    stdin: { contents: `
      import React from "react";
      import {renderToStaticMarkup} from "react-dom/server";
      import {MemoryRouter} from "react-router-dom";
      import App from "./src/App.jsx";
      import {AuthProvider} from "./src/auth.jsx";
      export const render = (role, route) => {
        globalThis.sessionStorage = {getItem: () => JSON.stringify({user: {id:role, role, full_name:"Demo"}})};
        return renderToStaticMarkup(React.createElement(MemoryRouter, {initialEntries:[route]},
          React.createElement(AuthProvider, null, React.createElement(App))));
      };
    `, resolveDir: process.cwd(), loader: "jsx" },
    bundle: true, platform: "node", format: "cjs", write: false, jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const directory = await mkdtemp(join(tmpdir(), "credit-role-render-"));
  const output = join(directory, "routes.cjs");
  const previousStorage = globalThis.sessionStorage;
  try {
    await writeFile(output, result.outputFiles[0].text);
    const { render } = createRequire(import.meta.url)(output);
    const manager = render("admin", "/dashboard");
    assert.ok(manager.includes("Branch review overview") && manager.includes("Open review queue"));
    assert.ok(manager.includes("Employees") && manager.includes("manager-bar"));
    const officer = render("user", "/dashboard");
    assert.ok(officer.includes("My applications overview") && officer.includes("Officer workspace"));
    assert.ok(!officer.includes("Employees") && !officer.includes("Open review queue"));
    assert.ok(render("admin", "/loan-applications").includes("Branch applications"));
    assert.ok(render("user", "/loan-applications").includes("My applications"));
    assert.ok(render("user", "/admin/users").includes("You need Manager access"));
  } finally {
    if (previousStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previousStorage;
    await unlink(output);
    await rmdir(directory);
  }
});
