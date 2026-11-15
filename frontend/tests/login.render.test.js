// Login renders on the shared design system (Field, tokens) with the trimmed copy.
import test from "node:test";
import assert from "node:assert/strict";
import { loadBundle } from "./render-helper.js";

test("login page uses shared Field markup, new placeholder and trimmed copy", async () => {
  const { mod, cleanup } = await loadBundle(`
    import React from "react";
    import {renderToStaticMarkup} from "react-dom/server";
    import {MemoryRouter} from "react-router-dom";
    import Login from "./src/pages/Login.jsx";
    import {AuthProvider} from "./src/auth.jsx";
    export const render = () => {
      globalThis.sessionStorage = {getItem: () => null};
      return renderToStaticMarkup(React.createElement(MemoryRouter, {initialEntries:["/"]},
        React.createElement(AuthProvider, null, React.createElement(Login))));
    };
  `);
  const previousStorage = globalThis.sessionStorage;
  try {
    const html = mod.render();
    assert.ok(html.includes("Sign in to your account"));
    assert.ok(html.includes('placeholder="name@branch.vn"'));
    assert.ok(!html.includes("WELCOME BACK"));
    assert.ok(!html.includes("Enter your credentials"));
    assert.ok(html.includes("Accounts are created by your branch manager."));
    assert.ok(html.includes('class="pw-toggle"'));
    assert.ok(html.includes('aria-label="Show password"'));
    assert.ok(html.includes('<label for="email">Email address</label>'));
  } finally {
    if (previousStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previousStorage;
    await cleanup();
  }
});
