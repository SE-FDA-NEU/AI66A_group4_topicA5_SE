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

export function filterApplications(applications, view = "all", owner = "all") {
  return applications.filter((a) => {
    if (owner !== "all" && a.owner_id !== owner) return false;
    if (view === "review") return needsReview(a);
    if (view === "high-risk") return needsReview(a) && a.dsr_flag_high_risk;
    if (view === "eligible") return canApprove(a);
    return true;
  });
}
