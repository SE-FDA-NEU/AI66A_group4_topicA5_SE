import test from "node:test";
import assert from "node:assert/strict";
import { officerWorklist, sortByCreated } from "../src/worklists.js";

const loan = (id, changes = {}) => ({ id, owner_id: "hoang", status: "scored", created_at: "2026-10-01T08:00:00Z",
  dsr_flag_high_risk: false, cic_debt_group: 1, latest_score: { score: 80, label: "eligible" }, ...changes });
const day = (n) => `2026-10-${String(n).padStart(2, "0")}T08:00:00Z`;

test("needsAction is capped and oldest first, recent holds the rest newest first without overlap", () => {
  const pending = Array.from({ length: 10 }, (_, i) => loan(`p${String(i).padStart(2, "0")}`, { status: "pending", created_at: day(20 - i) }));
  const manual = loan("m", { status: "manual_review", created_at: day(25) });
  const scored = [1, 2, 3].map((n) => loan(`s${n}`, { created_at: day(10 + n) }));
  const { needsAction, recent } = officerWorklist([...pending, manual, ...scored]);
  assert.equal(needsAction.length, 8);
  const dates = needsAction.map((a) => Date.parse(a.created_at));
  assert.deepEqual(dates, [...dates].sort((a, b) => a - b));
  assert.ok(recent.length <= 5);
  assert.deepEqual(recent.map((a) => a.id), ["m", "p00", "p01", "s3", "s2"]);
  const actionIds = new Set(needsAction.map((a) => a.id));
  assert.ok(recent.every((a) => !actionIds.has(a.id)));
});
test("empty input gives empty worklists", () => {
  assert.deepEqual(officerWorklist([]), { needsAction: [], recent: [] });
});
test("final statuses never need action", () => {
  const finals = ["approved", "cancelled", "rejected"].map((status) => loan(status, { status }));
  assert.deepEqual(officerWorklist(finals).needsAction, []);
});
test("officerWorklist does not mutate its input", () => {
  const input = [loan("b", { status: "pending", created_at: day(5) }), loan("a", { status: "pending", created_at: day(2) }), loan("c")];
  const copy = structuredClone(input);
  officerWorklist(input);
  assert.deepEqual(input, copy);
});
test("sortByCreated puts missing dates last in both directions and breaks ties by id", () => {
  const rows = [loan("none", { created_at: undefined }), loan("late", { created_at: day(9) }), loan("early", { created_at: day(2) })];
  assert.deepEqual(sortByCreated(rows, "asc").map((a) => a.id), ["early", "late", "none"]);
  assert.deepEqual(sortByCreated(rows, "desc").map((a) => a.id), ["late", "early", "none"]);
  const ties = [loan("b"), loan("a")];
  assert.deepEqual(sortByCreated(ties, "asc").map((a) => a.id), ["a", "b"]);
  assert.deepEqual(sortByCreated(ties, "desc").map((a) => a.id), ["a", "b"]);
  assert.equal(rows[0].id, "none");
});
