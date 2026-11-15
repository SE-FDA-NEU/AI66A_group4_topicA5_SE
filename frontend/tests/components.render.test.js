// Render the shared presentational components.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { loadBundle } from "./render-helper.js";

let bundle;
let C;
let render;

before(async () => {
  bundle = await loadBundle(`
    import React from "react";
    import {renderToStaticMarkup} from "react-dom/server";
    import PageHeader from "./src/components/PageHeader.jsx";
    import Field from "./src/components/Field.jsx";
    import Card from "./src/components/Card.jsx";
    import DataList from "./src/components/DataList.jsx";
    export {PageHeader, Field, Card, DataList};
    export const render = (component, props, ...children) => renderToStaticMarkup(React.createElement(component, props, ...children));
  `);
  ({ render } = bundle.mod);
  C = bundle.mod;
});
after(async () => { await bundle.cleanup(); });

test("PageHeader renders title, badge and actions", () => {
  const html = render(C.PageHeader, { title: "Applications", badge: "New", actions: "Go" });
  assert.ok(html.includes("<h1>Applications") && html.includes("New") && html.includes('class="page-actions"'));
});

test("PageHeader omits page-actions without actions", () => {
  assert.ok(!render(C.PageHeader, { title: "Applications" }).includes("page-actions"));
});

test("Field required shows an aria-hidden asterisk", () => {
  const html = render(C.Field, { id: "x", label: "Name", required: true });
  assert.ok(html.includes('for="x"') && html.includes('<span class="req" aria-hidden="true">*</span>'));
});

test("Field error renders alert with id and has-error wrapper", () => {
  const html = render(C.Field, { id: "x", label: "Name", error: "Bad", hint: "Tip" }, "child");
  assert.ok(html.includes('id="x-error"') && html.includes('role="alert"') && html.includes("has-error"));
  assert.ok(html.includes('id="x-hint"') && html.includes("child"));
});

test("Card with title renders an h2", () => {
  const html = render(C.Card, { title: "Details", className: "extra" }, "body");
  assert.ok(html.includes("<h2>Details</h2>") && html.includes('class="card extra"') && html.includes("body"));
});

test("DataList renders rows and a fallback for missing values", () => {
  const html = render(C.DataList, { rows: [["Income", "1"], ["CIC", null]] });
  assert.equal((html.match(/<dt>/g) || []).length, 2);
  assert.ok(html.includes("Not provided"));
});
