import test from "node:test";
import assert from "node:assert/strict";
import { canApprove, filterApplications, needsReview, reviewQueue } from "../src/review.js";

const loan = (id, changes = {}) => ({ id, owner_id: "hoang", status: "scored", created_at: "2026-10-01T08:00:00Z",
  dsr_flag_high_risk: false, cic_debt_group: 1, latest_score: { score: 80, label: "eligible" }, ...changes });

test("queue includes earlier open applications when today's total is zero", () => {
  const previousDay = loan("older");
  assert.deepEqual(reviewQueue([previousDay]), [previousDay]);
});
test("final applications do not enter review or high-risk review", () => {
  const finals = ["approved", "cancelled", "rejected"].map((status) => loan(status, { status, dsr_flag_high_risk: true }));
  assert.deepEqual(reviewQueue(finals), []);
  assert.deepEqual(filterApplications(finals, "high-risk"), []);
  assert.ok(finals.every((a) => !canApprove(a)));
});
test("queue prioritizes high risk then manual review then oldest without changing the source list", () => {
  const input = [loan("new", { created_at: "2026-10-09T08:00:00Z" }), loan("old"), loan("manual", { status: "manual_review" }), loan("risk", { dsr_flag_high_risk: true })];
  assert.deepEqual(reviewQueue(input).map((a) => a.id), ["risk", "manual", "old", "new"]);
  assert.equal(input[0].id, "new");
});
test("eligible filter excludes unscored, review-label, invalid and CIC bad-debt results", () => {
  const cases = [loan("ready"), loan("pending", { status: "pending", latest_score: null }),
    loan("review", { latest_score: { score: 60, label: "review" } }),
    loan("bad", { latest_score: { score: 132, label: "eligible" } }),
    loan("cic", { cic_debt_group: 3 }), loan("fraction", { latest_score: { score: 80.5, label: "eligible" } })];
  assert.deepEqual(filterApplications(cases, "eligible").map((a) => a.id), ["ready"]);
});
test("owner and review filters combine and all view retains completed records", () => {
  const applications = [loan("mine"), loan("other", { owner_id: "linh" }), loan("done", { status: "approved" })];
  assert.deepEqual(filterApplications(applications, "review", "hoang").map((a) => a.id), ["mine"]);
  assert.equal(filterApplications(applications, "all").length, 3);
  assert.ok(needsReview(loan("pending", { status: "pending" })));
});
