// api.js behaviour with a mocked fetch and a stubbed sessionStorage.
import test, { mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { api, ApiError, isRetryable, setUnauthorizedHandler } from "../src/api.js";

const realFetch = globalThis.fetch;
const realStorage = globalThis.sessionStorage;
let stored;

beforeEach(() => {
  stored = null;
  globalThis.sessionStorage = {
    getItem: () => stored,
    setItem: (_k, v) => { stored = v; },
    removeItem: () => { stored = null; },
  };
  setUnauthorizedHandler(() => {});
});
afterEach(() => {
  globalThis.fetch = realFetch;
  if (realStorage === undefined) delete globalThis.sessionStorage;
  else globalThis.sessionStorage = realStorage;
  mock.timers.reset();
});

const respond = (status, body, { json = true } = {}) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: json ? async () => body : async () => { throw new SyntaxError("Unexpected token <"); },
});
const failure = async () => {
  try { await api.summary(); } catch (e) { return e; }
  return assert.fail("expected the request to fail");
};

test("TC-US01-60 network failure becomes ApiError(0) with the fallback text", async () => {
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  const err = await failure();
  assert.ok(err instanceof ApiError);
  assert.equal(err.status, 0);
  assert.match(err.message, /can't reach the server/);
});

test("TC-US01-61 a request that takes 15 seconds is aborted with a timeout message", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
  });
  const pending = failure();
  mock.timers.tick(14999);
  await Promise.resolve();
  mock.timers.tick(1);
  const err = await pending;
  assert.equal(err.status, 0);
  assert.match(err.message, /took too long/);
});

test("TC-US01-62 a 401 with a token calls the unauthorized handler", async () => {
  stored = JSON.stringify({ access_token: "tok" });
  let seen = null;
  setUnauthorizedHandler((message) => { seen = message; });
  let headers;
  globalThis.fetch = async (_url, init) => { headers = init.headers; return respond(401, { detail: "Session expired. Sign in again." })(); };
  const err = await failure();
  assert.equal(err.status, 401);
  assert.equal(seen, "Session expired. Sign in again.");
  assert.equal(headers.Authorization, "Bearer tok");
});

test("TC-US01-63 a 401 without a token does not call the unauthorized handler", async () => {
  let called = false;
  setUnauthorizedHandler(() => { called = true; });
  globalThis.fetch = respond(401, { detail: "Wrong email or password." });
  const err = await failure();
  assert.equal(err.message, "Wrong email or password.");
  assert.equal(called, false);
});

test("TC-US01-64 a 422 passes field errors through .fields", async () => {
  globalThis.fetch = respond(422, { detail: "Check the form.", errors: { loan_amount: "Too large" } });
  const err = await failure();
  assert.equal(err.message, "Check the form.");
  assert.deepEqual(err.fields, { loan_amount: "Too large" });
});

test("TC-US01-65 a non-JSON error body falls back to the status message", async () => {
  globalThis.fetch = respond(403, null, { json: false });
  const err = await failure();
  assert.match(err.message, /don't have permission/);
});

test("TC-US01-66 statuses 409, 422, 423, 429 and 503 have their own fallback message", async () => {
  const messages = new Set();
  for (const status of [409, 422, 423, 429, 503]) {
    globalThis.fetch = respond(status, null, { json: false });
    const err = await failure();
    assert.equal(err.status, status);
    assert.doesNotMatch(err.message, /server had a problem/);
    messages.add(err.message);
  }
  assert.equal(messages.size, 5);
});

test("TC-US01-67 an unknown status falls back to the 500 message", async () => {
  globalThis.fetch = respond(418, null, { json: false });
  assert.match((await failure()).message, /server had a problem/);
});

test("TC-US05-10 isRetryable is true only for network and 5xx errors", () => {
  for (const status of [0, 500, 503]) assert.equal(isRetryable(new ApiError(status, "x")), true);
  for (const status of [401, 403, 404, 409, 422, 423, 429]) assert.equal(isRetryable(new ApiError(status, "x")), false);
});

test("TC-US06-01 api.scoreHistory requests the scores of the application", async () => {
  let url;
  globalThis.fetch = async (u) => { url = u; return respond(200, [{ id: "s1" }])(); };
  assert.deepEqual(await api.scoreHistory("abc"), [{ id: "s1" }]);
  assert.equal(url, "/api/loan-applications/abc/scores");
});
