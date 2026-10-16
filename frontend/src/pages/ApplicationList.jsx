import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, vnd } from "../api";
import { useAuth } from "../auth";
import { RiskBadge, StatusBadge } from "../components/Badges";
import { Empty, ErrorBox, Loading } from "../components/States";

export default function ApplicationList() {
  const { user } = useAuth();
  const manager = user.role === "admin";
  const [state, setState] = useState({ status: "loading" });
  const load = useCallback(() => {
    let active = true;
    setState({ status: "loading" });
    api.listApplications().then(
      (rows) => { if (active) setState({ status: "ok", rows }); },
      (err) => { if (active) setState({ status: "error", message: err.message }); }
    );
    return () => { active = false; };
  }, []);
  useEffect(load, [load]);

  const heading = <div className="page-heading"><div>
    <p className="eyebrow">{manager ? "Manager workspace" : "Officer workspace"}</p>
    <h1>{manager ? "Branch applications" : "My applications"}</h1>
    <p className="muted">{manager ? "All branch applications returned by the server. All dates are included." : "These are the applications you created. Open a record to see its details."}</p>
  </div>{!manager && <Link className="button primary" to="/loan-applications/new">New application</Link>}</div>;
  if (state.status === "loading") return <>{heading}<Loading text="Loading applications..." /></>;
  if (state.status === "error") return <>{heading}<ErrorBox message={state.message} onRetry={load} /></>;

  const rows = state.rows;
  return <>
    {heading}
    <p role="status">{rows.length} {manager ? "branch applications" : "applications created by you"}</p>
    {rows.length === 0 ? <Empty text={manager ? "No branch applications yet." : "You have no applications yet."}>
      <Link className="button primary" to="/loan-applications/new">Create an application</Link>
    </Empty> : <div className="scroll"><table>
      <thead><tr><th>Application</th>{manager && <th>Created by</th>}<th>Income / month</th><th>Loan</th><th>Term</th><th>Score</th><th>Status</th><th /></tr></thead>
      <tbody>{rows.map((a) => <tr key={a.id}>
        <td>#{a.id.slice(0, 8)}</td>{manager && <td>{a.owner_name || a.owner_id}</td>}
        <td>{vnd(a.monthly_income)}</td><td>{vnd(a.loan_amount)}</td><td>{a.loan_term_months} mo</td>
        <td>{a.latest_score?.score ?? "-"}</td>
        <td><StatusBadge status={a.status} /> <RiskBadge high={a.dsr_flag_high_risk} /></td>
        <td><Link to={`/loan-applications/${a.id}`}>Open</Link></td>
      </tr>)}</tbody>
    </table></div>}
  </>;
}
