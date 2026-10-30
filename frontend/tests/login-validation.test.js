import test from "node:test";
import assert from "node:assert/strict";
import { validateLogin } from "../src/login-validation.js";

test("US01 blank, whitespace and null credentials name the required fields", () => {
  for (const value of ["", "  ", null, undefined]) {
    assert.deepEqual(validateLogin({ email: value, password: value }), {
      email: "Email is required.", password: "Password is required.",
    });
  }
});

test("US01 login accepts the exact length limits and refuses one character more", () => {
  const email = "a".repeat(244) + "@branch.vn";
  assert.equal(email.length, 254);
  assert.deepEqual(validateLogin({ email, password: "p".repeat(128) }), {});
  assert.deepEqual(validateLogin({ email: `a${email}`, password: "p".repeat(129) }), {
    email: "Email must not exceed 254 characters.",
    password: "Password must not exceed 128 characters.",
  });
});

test("US01 validating a real credential preserves its spaces and case", () => {
  const credentials = { email: " Hoang@Branch.vn ", password: " Demo@2026 " };
  assert.deepEqual(validateLogin(credentials), {});
  assert.deepEqual(credentials, { email: " Hoang@Branch.vn ", password: " Demo@2026 " });
});

test("US01 malformed email is identified before calling the API", () => {
  assert.deepEqual(validateLogin({ email: "not-an-email", password: "Demo@2026" }), {
    email: "Invalid email address.",
  });
});
