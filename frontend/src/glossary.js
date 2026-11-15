// Single source of user-facing labels for statuses, score labels and queue filters.
export const STATUS_TEXT = {
  pending: "Scoring in progress",
  scored: "Scored",
  manual_review: "Requires manager review",
  rejected: "Rejected",
  cancelled: "Cancelled",
  approved: "Approved",
};

export const SCORE_LABEL_TEXT = {
  rejected: "Recommendation Rejected",
  review: "Requires further review",
  eligible: "Eligible for proposal",
};

export const QUEUE_FILTER_TEXT = {
  review: "Needs review",
  "high-risk": "High risk, awaiting review",
  eligible: "Eligible for decision",
};

export const RISK_TEXT = "High risk";

export function statusText(code) {
  return STATUS_TEXT[code] ?? code;
}

export function scoreLabelText(label, fallback) {
  return SCORE_LABEL_TEXT[label] ?? fallback ?? label ?? "";
}
