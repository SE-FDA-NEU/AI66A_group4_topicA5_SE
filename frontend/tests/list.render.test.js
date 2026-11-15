// Render the application list view (pure, no requests).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { loadBundle } from "./render-helper.js";

let bundle;
let render;

before(async () => {
  bundle = await loadBundle(`
    import React from "react";
    import {renderToStaticMarkup} from "react-dom/server";
    import {MemoryRouter} from "react-router-dom";
    import {ListView} from "./src/pages/ApplicationList.jsx";
    export const render = (props) => renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(ListView, props)));
  `);
  ({ render } = bundle.mod);
});
after(async () => { await bundle.cleanup(); });

const row = (id, extra = {}) => ({
  id, status: "scored", created_at: "2026-11-15T08:00:00Z", owner_id: "o1", owner_name: "Hoang",
  monthly_income: 20000000, loan_amount: 100000000, loan_term_months: 24, dsr_flag_high_risk: false,
  latest_score: { score: 80, label: "eligible" }, ...extra,
});
const rows = [row("aaaaaaaa-1"), row("bbbbbbbb-2", { status: "pending", latest_score: null })];
const noop = () => {};
const props = { rows, allRows: rows, view: "all", owner: "all", sort: null, onFilter: noop, onClear: noop, onSort: noop, onOpen: noop };

test("List shows readable columns and a plain score fallback", () => {
  const html = render({ ...props, manager: false });
  for (const text of ["Not scored", 'data-label="Score"', "Loan · term", "My applications", "New application", "applications created by you"]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes('class="eyebrow"') && !html.includes('class="chips"'));
});

test("Manager list shows filter chips with pressed state", () => {
  const html = render({ ...props, manager: true });
  for (const text of ['class="chips"', "All applications", "High risk, awaiting review", "Needs review", "Eligible for decision", "aria-pressed", "Created by", "Branch applications"]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes('class="eyebrow"'));
});

test("Date sort control only appears on the all view", () => {
  assert.ok(render({ ...props, manager: true, view: "all" }).includes('aria-sort="none"'));
  assert.ok(render({ ...props, manager: true, view: "all", sort: "newest" }).includes('aria-sort="descending"'));
  assert.ok(!render({ ...props, manager: true, view: "review" }).includes("aria-sort"));
  assert.ok(!render({ ...props, manager: true, view: "review" }).includes("Sort"));
});

test("Sort control sits outside the table header and states the current order", () => {
  const html = render({ ...props, manager: true, view: "all", sort: "newest" });
  const head = html.slice(html.indexOf("<thead"), html.indexOf("</thead>"));
  assert.ok(!head.includes("<button"));
  assert.ok(html.includes("Sort: newest first"));
  assert.ok(render({ ...props, manager: true, view: "all", sort: "oldest" }).includes("Sort: oldest first"));
});
