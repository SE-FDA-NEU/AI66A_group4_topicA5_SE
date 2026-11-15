import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, isRetryable, vnd } from "../api";
import { StatusBadge } from "../components/Badges";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import { formatDateTime } from "../format";
import { ACTION_TEXT } from "../glossary";
import { Empty, ErrorBox, Loading } from "../components/States";
import { officerWorklist } from "../worklists";

function WorkTable({ rows, action }) {
  return <div className="scroll"><table className="list-table">
    <thead><tr><th>Application</th><th>Loan</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
    <tbody>{rows.map((a) => <tr key={a.id}>
      <td data-label="Application"><span className="cell-stack"><strong>#{a.id.slice(0, 8)}</strong> <small>{formatDateTime(a.created_at)}</small></span></td>
      <td data-label="Loan">{vnd(a.loan_amount)}</td>
      <td data-label="Status"><StatusBadge status={a.status} /></td>
      <td data-label="Action">{action(a)}</td>
    </tr>)}</tbody>
  </table></div>;
}

const openLink = (a) => <Link to={`/loan-applications/${a.id}`} state={{ from: "/dashboard" }}>{ACTION_TEXT.open}</Link>;
const actionLink = (a) => a.status === "pending"
  ? <Link to={`/loan-applications/${a.id}`} state={{ scoreOnOpen: true, from: "/dashboard" }}>{ACTION_TEXT.getScore}</Link>
  : openLink(a);

export function OfficerView({ data, applications }) {
  const { needsAction, recent } = officerWorklist(applications);
  return <>
    <PageHeader title="My applications overview"
      actions={<Link className="button primary" to="/loan-applications/new">{ACTION_TEXT.newApplication}</Link>} />
    <div className="tiles">
      <div className="card tile"><span className="num">{data.total_applications}</span>my applications today</div>
      <div className="card tile"><span className="num">{data.average_score ?? "-"}</span>average score</div>
      <div className="card tile"><span className="num">{data.high_risk_count}</span>high risk today</div>
    </div>
    <p className="muted"><small>Today, {data.date}</small></p>
    {data.total_applications === 0 && <p className="muted">0 applications today.</p>}
    <Card title="Needs my action">
      {needsAction.length === 0 ? <Empty text="Nothing needs your action." /> : <WorkTable rows={needsAction} action={actionLink} />}
    </Card>
    <Card title="Recent applications" actions={<Link to="/loan-applications">All my applications</Link>}>
      {recent.length === 0 ? <Empty text={needsAction.length === 0 ? "0 applications" : "Nothing else to show."} /> : <WorkTable rows={recent} action={openLink} />}
    </Card>
  </>;
}

export default function OfficerDashboard() {
  const [state, setState] = useState({ status: "loading" });
  const load = useCallback(() => {
    let active = true;
    setState({ status: "loading" });
    Promise.all([api.summary(), api.listApplications()]).then(
      ([data, applications]) => { if (active) setState({ status: "ok", data, applications }); },
      (err) => { if (active) setState({ status: "error", message: err.message, retryable: isRetryable(err) }); }
    );
    return () => { active = false; };
  }, []);
  useEffect(load, [load]);

  if (state.status === "loading") return <><PageHeader title="My applications overview" /><Loading text="Loading your overview..." /></>;
  if (state.status === "error") return <><PageHeader title="My applications overview" /><ErrorBox message={state.message} onRetry={state.retryable ? load : undefined} /></>;
  return <OfficerView data={state.data} applications={state.applications} />;
}
