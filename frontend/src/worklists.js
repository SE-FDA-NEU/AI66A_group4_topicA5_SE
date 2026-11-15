const ACTION_STATUSES = ["pending", "manual_review"];

// Rows without a parsable created_at always sort after dated rows.
export function sortByCreated(applications, direction = "asc") {
  const sign = direction === "desc" ? -1 : 1;
  return [...applications].sort((a, b) => {
    const ta = Date.parse(a.created_at);
    const tb = Date.parse(b.created_at);
    if (Number.isNaN(ta) !== Number.isNaN(tb)) return Number.isNaN(ta) ? 1 : -1;
    const byDate = Number.isNaN(ta) ? 0 : sign * (ta - tb);
    return byDate || a.id.localeCompare(b.id);
  });
}

export function officerWorklist(applications, { actionLimit = 8, recentLimit = 5 } = {}) {
  const actionable = sortByCreated(applications.filter((a) => ACTION_STATUSES.includes(a.status)), "asc");
  const needsAction = actionable.slice(0, actionLimit);
  const shown = new Set(needsAction.map((a) => a.id));
  const recent = sortByCreated(applications.filter((a) => !shown.has(a.id)), "desc").slice(0, recentLimit);
  return { needsAction, recent };
}
