// Render the Officer dashboard view (pure, no requests).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { loadBundle } from "./render-helper.js";

let bundle;
let render;
let renderManager;

before(async () => {
  bundle = await loadBundle(`
    import React from "react";
    import {renderToStaticMarkup} from "react-dom/server";
    import {MemoryRouter} from "react-router-dom";
    import {OfficerView} from "./src/pages/OfficerDashboard.jsx";
    import {ManagerView} from "./src/pages/ManagerDashboard.jsx";
    export const render = (props) => renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(OfficerView, props)));
    export const renderManager = (props) => renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(ManagerView, props)));
  `);
  ({ render, renderManager } = bundle.mod);
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

test("Officer dashboard Recent card does not claim 0 applications when work needs action", () => {
  const html = render({
    data: { date: "2026-11-15", total_applications: 1, average_score: null, high_risk_count: 0 },
    applications: [app("aaaaaaaa-1", "pending", "2026-11-15T08:00:00Z")],
  });
  assert.ok(html.includes("Nothing else to show.") && html.includes("Today, 2026-11-15"));
  assert.ok(!html.includes(">0 applications<"));
});

test("Manager dashboard puts the review queue and filter chips before today stats", () => {
  const html = renderManager({
    data: { date: "2026-11-15", total_applications: 3, average_score: 60, high_risk_count: 1 },
    applications: [
      { ...app("aaaaaaaa-1", "pending", "2026-11-15T08:00:00Z"), owner_name: "Hoang", dsr_flag_high_risk: false },
      { ...app("bbbbbbbb-2", "manual_review", "2026-11-15T09:00:00Z"), owner_name: "Hoang", dsr_flag_high_risk: true, latest_score: { score: 40, label: "review" } },
      { ...app("cccccccc-3", "scored", "2026-11-15T10:00:00Z"), owner_name: "Hoang", dsr_flag_high_risk: false, latest_score: { score: 90, label: "eligible" } },
    ],
  });
  for (const text of ['class="chips"', "High risk, awaiting review", "Needs review", "Eligible for decision", "Waiting for a score", "Manager review queue"]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(html.indexOf("Manager review queue") < html.indexOf('class="tiles"'));
  assert.ok(!html.includes("Manager workspace"));
});

test("Dashboard tables render as phone-card list tables", () => {
  const apps = [{ ...app("aaaaaaaa-1", "manual_review", "2026-11-15T08:00:00Z"), owner_name: "Hoang" }];
  const data = { date: "2026-11-15", total_applications: 1, average_score: 95, high_risk_count: 0 };
  const manager = renderManager({ data, applications: apps });
  assert.ok(manager.includes("All dates") && manager.includes('data-label="Loan / score"'));
  assert.ok(render({ data, applications: [app("bbbbbbbb-2", "pending", "2026-11-15T09:00:00Z")] }).includes('class="list-table"'));
});
