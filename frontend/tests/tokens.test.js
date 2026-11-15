// Parses :root tokens from styles.css and checks WCAG contrast of text pairs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

function readRootTokens(source) {
  const block = /:root\s*\{([^}]*)\}/.exec(source);
  const tokens = {};
  if (!block) return tokens;
  for (const m of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  return tokens;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const t = readRootTokens(css);

test("TC-UI-01 root tokens match the design spec", () => {
  assert.equal(t["--ink"], "#15293b");
  assert.equal(t["--brand"], "#176b78");
  assert.equal(t["--r-lg"], "14px");
  assert.equal(t["--s-8"], "32px");
});

test("TC-UI-02 text colour pairs meet 4.5:1", () => {
  for (const [fg, bg] of [["--ink", "--surface"], ["--muted", "--surface"], ["--muted", "--bg"], ["--brand", "--surface"],
    ["--bad", "--bad-soft"], ["--warn", "--warn-soft"], ["--ok", "--ok-soft"], ["--brand", "--brand-soft"], ["--surface", "--brand"]])
    assert.ok(contrast(t[fg], t[bg]) >= 4.5, `${fg} on ${bg}`);
});

test("TC-UI-03 focus colour is at least 3:1 on surface", () => {
  assert.ok(contrast(t["--focus"], t["--surface"]) >= 3);
});

test("TC-UI-04 stylesheet has no dark theme, blur or login-only palette", () => {
  assert.ok(!/data-theme|backdrop-filter|--login-|--glass|radial-gradient/.test(css));
});

test("notification list does not override card padding or borders", () => {
  const rules = [...css.matchAll(/([^{}]*\.notification-list[^{}]*)\{([^}]*)\}/g)];
  for (const [, selector, body] of rules) {
    assert.ok(!/\bli\b/.test(selector), `no .notification-list li rule expected: ${selector.trim()}`);
    assert.ok(!/padding|border/.test(body.replace(/padding:\s*0\s*;?/, "")), `unexpected override in ${selector.trim()}`);
  }
});
