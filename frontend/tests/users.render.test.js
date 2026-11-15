// Render the employee table (pure, no requests).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { loadBundle } from "./render-helper.js";

let bundle;
let render;

before(async () => {
  bundle = await loadBundle(`
    import React from "react";
    import {renderToStaticMarkup} from "react-dom/server";
    import {EmployeeTable} from "./src/pages/Users.jsx";
    export const render = (props) => renderToStaticMarkup(React.createElement(EmployeeTable, props));
  `);
  ({ render } = bundle.mod);
});
after(async () => { await bundle.cleanup(); });

const users = [
  { id: "u1", full_name: "Hoang", email: "hoang@branch.vn", role: "user", is_active: true },
  { id: "u2", full_name: "Thanh", email: "thanh@branch.vn", role: "admin", is_active: true },
];

test("Employees render as one list table with labelled cells and per-row actions", () => {
  const html = render({ users, onChanged: () => {} });
  for (const text of ['class="list-table"', 'data-label="Email"', 'data-label="Role"', 'data-label="Status"', "Save name", "Deactivate", "Manager accounts cannot be changed here.", "Employee name"]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes("<h2"));
  assert.equal(html.split("Save name").length - 1, 1);
});
