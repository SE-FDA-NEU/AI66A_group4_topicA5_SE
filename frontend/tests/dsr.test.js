import test from "node:test";
import assert from "node:assert/strict";
import { CIC_OPTIONS, dsrInfo } from "../src/dsr.js";

test("dsrInfo computes percent and the high-risk flag", () => {
  assert.deepEqual(dsrInfo("20000000", "5000000"), { percent: 25, high: false });
  assert.deepEqual(dsrInfo("20000000", "10000000"), { percent: 50, high: false });
  assert.equal(dsrInfo("20000000", "10000001").high, true);
  assert.equal(dsrInfo("3", "1").percent, 33.3);
});
test("dsrInfo rounds exact ties half-to-even like the backend", () => {
  assert.equal(dsrInfo("400", "1").percent, 0.2);
  assert.equal(dsrInfo("400", "3").percent, 0.8);
});
test("dsrInfo returns null for missing or non-positive whole numbers", () => {
  for (const [income, payment] of [["", "5"], ["0", "5"], ["abc", "5"], ["20000000", ""], ["-1", "5"]]) {
    assert.equal(dsrInfo(income, payment), null);
  }
});
test("dsrInfo trims input", () => {
  assert.equal(dsrInfo(" 20000000 ", "5000000").percent, 25);
});
test("CIC_OPTIONS has Not available plus groups 1 to 5", () => {
  assert.equal(CIC_OPTIONS.length, 6);
  assert.deepEqual(CIC_OPTIONS[0], { value: "", label: "Not available" });
});
