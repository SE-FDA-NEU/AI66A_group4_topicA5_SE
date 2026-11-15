import test from "node:test";
import assert from "node:assert/strict";
import { statusText, scoreLabelText, QUEUE_FILTER_TEXT } from "../src/glossary.js";

test("statusText maps known codes and passes unknown through", () => {
  assert.equal(statusText("pending"), "Scoring in progress");
  assert.equal(statusText("weird"), "weird");
});

test("scoreLabelText prefers glossary, then fallback, then label", () => {
  assert.equal(scoreLabelText("rejected", "Proposal rejected"), "Recommendation Rejected");
  assert.equal(scoreLabelText("high_risk", "High risk"), "High risk");
  assert.equal(scoreLabelText(null, null), "");
});

test("QUEUE_FILTER_TEXT high-risk label", () => {
  assert.equal(QUEUE_FILTER_TEXT["high-risk"], "High risk, awaiting review");
});
