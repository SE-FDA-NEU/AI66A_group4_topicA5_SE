// WCAG contrast (>= 4.5:1) for every text/background token pair used by the UI.
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
const TEXT = ["--ink", "--muted", "--brand", "--bad", "--warn", "--ok"];

const pairs = [
  ...TEXT.flatMap((fg) => ["--surface", "--bg"].map((bg) => [fg, bg])),
  ["--bad", "--bad-soft"], ["--warn", "--warn-soft"], ["--ok", "--ok-soft"], ["--brand", "--brand-soft"],
  ["--muted", "--surface-soft"],
  ["--surface", "--brand"], // white text on the primary button
];

for (const [fg, bg] of pairs) {
  test(`contrast ${fg} on ${bg} is at least 4.5:1`, () => {
    assert.ok(t[fg] && t[bg], `missing token ${fg} or ${bg}`);
    const ratio = contrast(t[fg], t[bg]);
    assert.ok(ratio >= 4.5, `${fg} ${t[fg]} on ${bg} ${t[bg]} = ${ratio.toFixed(2)}`);
  });
}
