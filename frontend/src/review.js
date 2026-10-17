export function canApprove(a) {
  const score = a.latest_score;
  return ["scored", "manual_review"].includes(a.status)
    && score?.label === "eligible" && Number.isInteger(score.score)
    && score.score >= 70 && score.score <= 100
    && (a.cic_debt_group == null || a.cic_debt_group < 3);
}
