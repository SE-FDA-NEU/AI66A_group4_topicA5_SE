// Render the Officer dashboard view (pure, no requests).
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
    import {OfficerView} from "./src/pages/OfficerDashboard.jsx";
    export const render = (props) => renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(OfficerView, props)));
  `);
  ({ render } = bundle.mod);
});
after(async () => { await bundle.cleanup(); });

const app = (id, status, created_at) => ({ id, status, created_at, loan_amount: 100000000, latest_score: null });

test("Officer dashboard leads with work that needs action", () => {
  const html = render({
    data: { date: "2026-11-15", total_applications: 2, average_score: 95, high_risk_count: 0 },
    applications: [app("aaaaaaaa-1", "pending", "2026-11-15T08:00:00Z"), app("bbbbbbbb-2", "scored", "2026-11-15T09:00:00Z")],
  });
  for (const text of ["Needs my action", "Get credit score", "Recent applications", "All my applications", 'class="num"']) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes("Officer workspace") && !html.includes('class="eyebrow"'));
});

test("Officer dashboard empty state shows no tables", () => {
  const html = render({
    data: { date: "2026-11-15", total_applications: 0, average_score: null, high_risk_count: 0 },
    applications: [],
  });
  assert.ok(html.includes("Nothing needs your action.") && html.includes("0 applications") && html.includes("0 applications today."));
  assert.ok(!html.includes("<table"));
});
