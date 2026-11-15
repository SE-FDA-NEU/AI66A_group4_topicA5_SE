// Backend reasons look like "+20: text", "-5: text", "0: text" or unprefixed text.
const FACTOR = /^\s*([+-]?\d+)\s*:\s*(.*)$/s;

export function parseFactor(line) {
  const match = FACTOR.exec(line);
  if (!match) return { points: null, text: line.trim() };
  return { points: Number.parseInt(match[1], 10) + 0, text: match[2].trim() };
}

export function visibleFactors(lines) {
  return (lines ?? []).map(parseFactor).filter((factor) => factor.points !== 0);
}
