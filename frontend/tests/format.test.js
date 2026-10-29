import test from "node:test";
import assert from "node:assert/strict";
import { formatDateTime } from "../src/format.js";

test("TC-US06-02 formatDateTime shows dd/MM/yyyy HH:mm in Vietnam time", () => {
  assert.equal(formatDateTime("2026-05-04T03:07:00Z"), "04/05/2026 10:07");
});

test("TC-US06-03 formatDateTime moves a UTC time across midnight", () => {
  assert.equal(formatDateTime("2026-10-25T18:30:00Z"), "26/10/2026 01:30");
  assert.equal(formatDateTime("2026-12-31T17:00:00Z"), "01/01/2027 00:00");
});

test("TC-US06-04 formatDateTime returns - for null or invalid values", () => {
  assert.equal(formatDateTime(null), "-");
  assert.equal(formatDateTime(undefined), "-");
  assert.equal(formatDateTime(""), "-");
  assert.equal(formatDateTime("not a date"), "-");
});
