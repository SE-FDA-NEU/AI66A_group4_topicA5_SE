import { statusText, RISK_TEXT } from "../glossary.js";

export function StatusBadge({ status }) {
  return <span className={`badge st-${status}`}>{statusText(status)}</span>;
}

export function RiskBadge({ high }) {
  return high ? <span className="badge risk">{RISK_TEXT}</span> : null;
}
