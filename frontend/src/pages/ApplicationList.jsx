import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, isRetryable, vnd } from "../api";
import { useAuth } from "../auth";
import { filterApplications, reviewQueue } from "../review";
import { RiskBadge, StatusBadge } from "../components/Badges";
import { Empty, ErrorBox, Loading } from "../components/States";

const VIEWS = [["all", "All branch applications"], ["review", "Needs review"], ["high-risk", "High-risk review"], ["eligible", "Eligible for decision"]];

export default function ApplicationList() {
  const { user } = useAuth();
  const manager = user.role === "admin";
  const [params, setParams] = useSearchParams();
  const view = manager && VIEWS.some(([key]) => key === params.get("view")) ? params.get("view") : "all";
  const owner = manager ? params.get("owner") || "all" : "all";
  const [state, setState] = useState({ status: "loading" });
  const load = useCallback(() => {
    let active = true;
    setState({ status: "loading" });
    api.listApplications().then(
      (rows) => { if (active) setState({ status: "ok", rows }); },
      (err) => { if (active) setState({ status: "error", message: err.message, retryable: isRetryable(err) }); }
    );
    return () => { active = false; };
  }, []);
  useEffect(load, [load]);

  const heading = <div className="page-heading"><div>
    <p className="eyebrow">{manager ? "Manager workspace" : "Officer workspace"}</p>
    <h1>{manager ? "Branch applications" : "My applications"}</h1>
    <p className="muted">{manager ? "Review all branch applications or narrow the queue by risk and employee. All dates are included." : "These are the applications you created. Open a record to score it or check the manager's decision."}</p>
  </div>{!manager && <Link className="button primary" to="/loan-applications/new">New application</Link>}</div>;
  if (state.status === "loading") return <>{heading}<Loading text="Loading applications..." /></>;
  if (state.status === "error") return <>{heading}<ErrorBox message={state.message} onRetry={state.retryable ? load : undefined} /></>;

  const filtered = filterApplications(state.rows, view, owner);
  const rows = view === "all" ? filtered : reviewQueue(filtered);
  const owners = [...new Map(state.rows.map((a) => [a.owner_id, a.owner_name || "Unknown employee"])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const setFilter = (name, value) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(name); else next.set(name, value);
    setParams(next);
  };
  return <>
    {heading}
    {manager && <section className="card" aria-label="Manager application filters">
      <div className="filter-tabs" role="group" aria-label="Review filter">
        {VIEWS.map(([key, label]) => <button key={key} aria-pressed={view === key} className={view === key ? "primary" : ""} onClick={() => setFilter("view", key)}>
          {label} ({filterApplications(state.rows, key, owner).length})
        </button>)}
      </div>
      <label className="owner-filter">Created by
        <select value={owner} onChange={(event) => setFilter("owner", event.target.value)}>
          <option value="all">All employees</option>
          {owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      {(view !== "all" || owner !== "all") && <button onClick={() => setParams({})}>Clear filters</button>}
    </section>}
    <p role="status">{rows.length} {manager ? "matching branch applications" : "applications created by you"}</p>
    {rows.length === 0 ? <Empty text={manager ? "No applications match this view." : "You have no applications yet."}>
      {manager ? <button onClick={() => setParams({})}>Show all branch applications</button> : <Link className="button primary" to="/loan-applications/new">Create an application</Link>}
    </Empty> : <div className="scroll"><table>
      <thead><tr><th>Application</th>{manager && <th>Created by</th>}<th>Income / month</th><th>Loan</th><th>Term</th><th>Score</th><th>Status</th><th /></tr></thead>
      <tbody>{rows.map((a) => <tr key={a.id}>
        <td>#{a.id.slice(0, 8)}</td>{manager && <td>{a.owner_name}</td>}
        <td>{vnd(a.monthly_income)}</td><td>{vnd(a.loan_amount)}</td><td>{a.loan_term_months} mo</td>
        <td>{a.latest_score?.score ?? "-"}</td>
        <td><StatusBadge status={a.status} /> <RiskBadge high={a.dsr_flag_high_risk} /></td>
        <td><Link to={`/loan-applications/${a.id}`}>{manager ? "Review" : "Open"}</Link></td>
      </tr>)}</tbody>
    </table></div>}
  </>;
}
