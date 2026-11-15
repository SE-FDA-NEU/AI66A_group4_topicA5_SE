// Render ScoreCard and ScoreHistory with realistic backend payloads.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { loadBundle } from "./render-helper.js";

let bundle;
let ScoreCard;
let ScoreHistory;
let render;

before(async () => {
  bundle = await loadBundle(`
    import React from "react";
    import {renderToStaticMarkup} from "react-dom/server";
    import ScoreCard from "./src/components/ScoreCard.jsx";
    import ScoreHistory from "./src/components/ScoreHistory.jsx";
    export {ScoreCard, ScoreHistory};
    export const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
  `);
  ({ ScoreCard, ScoreHistory, render } = bundle.mod);
});
after(async () => { await bundle.cleanup(); });

const base = { id: "s1", model_version: "v1.2.0", created_at: "2026-10-25T18:30:00Z", rejected_reason: null };

test("TC-US06-05 ScoreHistory lists each attempt with time, score, label and model version", () => {
  const html = render(ScoreHistory, { history: [
    { ...base, id: "a", score: 82, label_text: "Eligible for proposal" },
    { ...base, id: "b", score: null, label_text: "Recommendation Rejected", model_version: "v1.1.0", created_at: "2026-10-26T02:00:00Z" },
  ] });
  assert.ok(html.includes("26/10/2026 01:30") && html.includes("82") && html.includes("Eligible for proposal") && html.includes("v1.2.0"));
  assert.ok(html.includes("26/10/2026 09:00") && html.includes("<td>-</td>") && html.includes("v1.1.0"));
  assert.equal((html.match(/<tr>/g) || []).length, 3); // header + 2 rows
});

test("TC-US06-06 ScoreHistory shows a message when there is no history", () => {
  assert.ok(render(ScoreHistory, { history: [] }).includes("No history available"));
});

test("ScoreHistory shows one canonical label for a rejected result", () => {
  const html = render(ScoreHistory, { history: [{ ...base, score: null, label: "rejected", label_text: "Proposal rejected" }] });
  assert.ok(html.includes("Recommendation Rejected") && !html.includes("Proposal rejected"));
});

test("TC-US04-42 ScoreCard shows a normal score with model version and time", () => {
  // Model version is Manager-only since PR 2, so it is requested explicitly.
  const html = render(ScoreCard, { status: "scored", showModelVersion: true, result: { ...base, score: 78, label: "eligible", label_text: "Eligible for proposal", explanation: ["Stable income"] } });
  assert.ok(html.includes("78") && html.includes("/ 100") && html.includes("Eligible for proposal"));
  assert.ok(html.includes("Main factors") && html.includes("Stable income"));
  assert.ok(html.includes("v1.2.0") && html.includes("26/10/2026 01:30"));
});

test("TC-US04-43 ScoreCard lists at least two reasons for a score below 40", () => {
  const html = render(ScoreCard, { status: "scored", result: { ...base, score: 32, label: "high_risk", label_text: "High risk", explanation: ["Low income", "High installment burden"] } });
  assert.ok(html.includes("32") && html.includes("Low income") && html.includes("High installment burden"));
  assert.equal((html.match(/<li/g) || []).length, 2);
});

test("ScoreCard shows signed factors, hides zero-point lines and raw prefixes", () => {
  const html = render(ScoreCard, { status: "scored", result: { ...base, score: 70, label: "eligible", label_text: "x", explanation: ["+20: Low burden", "0: CIC not available", "-5: Long term"] } });
  assert.ok(html.includes("Low burden") && html.includes("Long term"));
  assert.ok(!html.includes("CIC not available") && !html.includes("+20:"));
  assert.ok(html.includes('class="factor up"') && html.includes('class="factor down"'));
});

test("ScoreCard hides model version unless asked", () => {
  const result = { ...base, score: 70, label: "eligible", label_text: "x", explanation: [] };
  assert.ok(!render(ScoreCard, { status: "scored", result }).includes("v1.2.0"));
  assert.ok(render(ScoreCard, { status: "scored", result, showModelVersion: true }).includes("v1.2.0"));
});

test("ScoreCard says there are no main factors when all are zero-point", () => {
  const html = render(ScoreCard, { status: "scored", result: { ...base, score: 50, label: "review", label_text: "x", explanation: ["0: a", "0: b"] } });
  assert.ok(html.includes("No main factors."));
});

test("ScoreCard uses the canonical rejected label", () => {
  const html = render(ScoreCard, { status: "rejected", result: { ...base, score: null, label: "rejected", label_text: "Proposal rejected", explanation: [] } });
  assert.ok(html.includes("Recommendation Rejected"));
});

test("TC-US04-44 ScoreCard shows a CIC rejection with - instead of a score", () => {
  const html = render(ScoreCard, { status: "rejected", result: { ...base, score: null, label: "rejected", label_text: "Rejected", rejected_reason: "cic_debt_group", explanation: ["CIC debt group 4"] } });
  assert.ok(html.includes("Recommendation Rejected") && html.includes("Why it was rejected") && html.includes("CIC debt group 4"));
  assert.ok(html.includes('<div class="big">-<small>'));
  assert.ok(!html.includes("/ 100"));
});

test("TC-US04-45 ScoreCard shows the invalid-score notice and no score", () => {
  const html = render(ScoreCard, { status: "manual_review", result: { ...base, score: null, label: null, label_text: null, rejected_reason: "score_out_of_range", explanation: [] } });
  assert.ok(html.includes("invalid score") && !html.includes("/ 100") && !html.includes("Main factors"));
});

test("TC-US04-46 ScoreCard says an unscored application has not been scored", () => {
  assert.ok(render(ScoreCard, { result: null, status: "pending" }).includes("has not been scored yet"));
});
