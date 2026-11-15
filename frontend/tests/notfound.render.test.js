// Unknown URLs show a Not Found page instead of redirecting.
import test from "node:test";
import assert from "node:assert/strict";
import { loadBundle } from "./render-helper.js";

test("TC-US05-11 unknown URLs show Page not found with a link home for both signed-in and signed-out users", async () => {
  const { mod, cleanup } = await loadBundle(`
    import React from "react";
    import {renderToStaticMarkup} from "react-dom/server";
    import {MemoryRouter} from "react-router-dom";
    import App from "./src/App.jsx";
    import {AuthProvider} from "./src/auth.jsx";
    export const render = (role, route) => {
      globalThis.sessionStorage = {getItem: () => role ? JSON.stringify({user: {id:role, role, full_name:"Demo"}}) : null};
      return renderToStaticMarkup(React.createElement(MemoryRouter, {initialEntries:[route]},
        React.createElement(AuthProvider, null, React.createElement(App))));
    };
  `);
  const previousStorage = globalThis.sessionStorage;
  try {
    for (const role of [null, "user", "admin"]) {
      const html = mod.render(role, "/no/such/page");
      assert.ok(html.includes("Page not found"), `role ${role}`);
      assert.ok(html.includes('href="/"'), `role ${role}`);
    }
  } finally {
    if (previousStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previousStorage;
    await cleanup();
  }
});
