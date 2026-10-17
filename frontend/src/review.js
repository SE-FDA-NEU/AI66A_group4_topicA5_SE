// The API remains responsible for authorization and the final approval check.
export const needsReview = (a) => ["pending", "scored", "manual_review"].includes(a.status);

export function canApprove(a) {
  const score = a.latest_score;
  return ["scored", "manual_review"].includes(a.status)
    && score?.label === "eligible" && Number.isInteger(score.score)
    && score.score >= 70 && score.score <= 100
    && (a.cic_debt_group == null || a.cic_debt_group < 3);
}

export function reviewReason(a) {
  if (a.dsr_flag_high_risk) return "High DSR: review the repayment risk";
  if (a.status === "manual_review") return "Manual review required";
  if (a.status === "pending") return "Awaiting a scoring result";
  return canApprove(a) ? "Eligible score: approval decision needed" : "Review score and supporting information";
}

export function reviewQueue(applications) {
  const priority = (a) => a.dsr_flag_high_risk ? 0 : a.status === "manual_review" ? 1 : 2;
  return applications.filter(needsReview).sort((a, b) =>
    priority(a) - priority(b) || Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id));
}

// Filters for the application list. `view` comes from `?view=` on the list page.
// `ownerId` (optional) keeps only that officer's records.
export function filterApplications(applications, view = "all", ownerId = null) {
  const owned = ownerId == null ? applications : applications.filter((a) => a.owner_id === ownerId);
  if (view === "review") return reviewQueue(owned);
  if (view === "high-risk") return reviewQueue(owned).filter((a) => a.dsr_flag_high_risk);
  if (view === "eligible") return reviewQueue(owned).filter(canApprove);
  return owned;
}