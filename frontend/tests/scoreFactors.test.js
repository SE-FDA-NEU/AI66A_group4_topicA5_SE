import test from "node:test";
import assert from "node:assert/strict";
import { parseFactor, visibleFactors } from "../src/scoreFactors.js";

test("parseFactor reads signed points and text", () => {
  assert.deepEqual(parseFactor("+20: Installment is 30%"), { points: 20, text: "Installment is 30%" });
  assert.equal(parseFactor("-5: Loan large").points, -5);
  assert.equal(parseFactor("0: CIC not available").points, 0);
});

test("parseFactor normalises -0 and tolerates spacing", () => {
  assert.ok(Object.is(parseFactor("-0: x").points, 0));
  assert.deepEqual(parseFactor("+5 : spaced"), { points: 5, text: "spaced" });
  assert.deepEqual(parseFactor("  +10:tight"), { points: 10, text: "tight" });
});

test("parseFactor leaves unprefixed lines alone", () => {
  const line = "CIC debt group 4 (bad debt). Groups 3-5 are rejected automatically.";
  assert.deepEqual(parseFactor(line), { points: null, text: line });
});

test("visibleFactors drops zero-point lines and tolerates null", () => {
  assert.equal(visibleFactors(["+5: a", "0: b", "c"]).length, 2);
  assert.deepEqual(visibleFactors(null), []);
  assert.deepEqual(visibleFactors(undefined), []);
});
