const STATUS_TEXT = {
  pending: "Scoring in progress",
  scored: "Scored",
  manual_review: "Requires manager review",
  rejected: "Rejected",
  cancelled: "Cancelled",
  approved: "Approved",
};

export function StatusBadge({ status }) {
  return <span className={`badge st-${status}`}>{STATUS_TEXT[status] ?? status}</span>;
}

export function RiskBadge({ high }) {
  return high ? <span className="badge risk">High risk</span> : null;
}
