import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api, isRetryable, vnd } from "../api";
import { useAuth } from "../auth";
import { filterApplications, reviewQueue } from "../review";
import { RiskBadge, StatusBadge } from "../components/Badges";
import PageHeader from "../components/PageHeader";
import { formatDateTime } from "../format";
import { QUEUE_FILTER_TEXT } from "../glossary";
import { sortByCreated } from "../worklists";
import { Empty, ErrorBox, Loading } from "../components/States";

const VIEWS = ["all", ...Object.keys(QUEUE_FILTER_TEXT)];
const VIEW_TEXT = { all: "All applications", ...QUEUE_FILTER_TEXT };
const SORT_DIRECTION = { newest: "desc", oldest: "asc" };
const ARIA_SORT = { newest: "descending", oldest: "ascending" };

const heading = (manager) => <PageHeader title={manager ? "Branch applications" : "My applications"}
  actions={!manager && <Link className="button primary" to="/loan-applications/new">New application</Link>} />;

// rows = rows to show; allRows = unfiltered rows (chip counts, owner options).
export function ListView({ rows, allRows, manager, view, owner, sort, onFilter, onClear, onSort, onOpen }) {
  const location = useLocation();
  const from = location.pathname + location.search;
  const owners = [...new Map(allRows.map((a) => [a.owner_id, a.owner_name || "Unknown employee"])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const open = (event, id) => {
    if (event.target.closest("a, button")) return;
    onOpen(id);
  };
  return <>
    {heading(manager)}
    {manager && <section className="card" aria-label="Manager application filters">
      <div className="chips" role="group" aria-label="Review filter">
        {VIEWS.map((key) => <button key={key} type="button" className="chip" aria-pressed={view === key} onClick={() => onFilter("view", key)}>
          {VIEW_TEXT[key]} <span className="count">{filterApplications(allRows, key, owner).length}</span>
        </button>)}
      </div>
      <label className="owner-filter">Created by
        <select value={owner} onChange={(event) => onFilter("owner", event.target.value)}>
          <option value="all">All employees</option>
          {owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      {(view !== "all" || owner !== "all") && <button type="button" onClick={onClear}>Clear filters</button>}
    </section>}
    <p role="status">{rows.length} {manager ? "matching branch applications" : "applications created by you"}</p>
    {rows.length === 0 ? <Empty text={manager ? "No applications match this view." : "You have no applications yet."}>
      {manager ? <button onClick={onClear}>Show all branch applications</button> : <Link className="button primary" to="/loan-applications/new">Create an application</Link>}
    </Empty> : <div className="scroll"><table className="list-table">
      <thead><tr>
        <th aria-sort={view === "all" ? ARIA_SORT[sort] ?? "none" : undefined}>
          {view === "all"
            ? <button type="button" className="link-btn" onClick={() => onSort(sort === "newest" ? "oldest" : "newest")}>
              Application{sort === "newest" ? " (newest first)" : sort === "oldest" ? " (oldest first)" : " (sort by date)"}
            </button>
            : "Application"}
        </th>
        {manager && <th>Created by</th>}<th>Income / month</th><th>Loan · term</th><th>Score</th><th>Status</th><th><span className="sr-only">Action</span></th>
      </tr></thead>
      <tbody>{rows.map((a) => <tr key={a.id} className="clickable" onClick={(event) => open(event, a.id)}>
        <td data-label="Application"><strong>#{a.id.slice(0, 8)}</strong> <small>{formatDateTime(a.created_at)}</small></td>
        {manager && <td data-label="Created by">{a.owner_name}</td>}
        <td data-label="Income / month">{vnd(a.monthly_income)}</td>
        <td data-label="Loan · term">{vnd(a.loan_amount)} · {a.loan_term_months} mo</td>
        <td data-label="Score">{a.latest_score?.score ?? "Not scored"}</td>
        <td data-label="Status"><StatusBadge status={a.status} /> <RiskBadge high={a.dsr_flag_high_risk} /></td>
        <td data-label="Action"><Link to={`/loan-applications/${a.id}`} state={{ from }}>{manager ? "Review" : "Open"}</Link></td>
      </tr>)}</tbody>
    </table></div>}
  </>;
}

export default function ApplicationList() {
  const { user } = useAuth();
  const manager = user.role === "admin";
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const view = manager && VIEWS.includes(params.get("view")) ? params.get("view") : "all";
  const owner = manager ? params.get("owner") || "all" : "all";
  const sort = Object.hasOwn(SORT_DIRECTION, params.get("sort")) ? params.get("sort") : null;
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

  if (state.status === "loading") return <>{heading(manager)}<Loading text="Loading applications..." /></>;
  if (state.status === "error") return <>{heading(manager)}<ErrorBox message={state.message} onRetry={state.retryable ? load : undefined} /></>;

  const filtered = filterApplications(state.rows, view, owner);
  const rows = view !== "all" ? reviewQueue(filtered) : sort ? sortByCreated(filtered, SORT_DIRECTION[sort]) : filtered;
  const setParam = (name, value, reset) => {
    const next = new URLSearchParams(params);
    if (reset) next.delete(name); else next.set(name, value);
    setParams(next);
  };
  return <ListView rows={rows} allRows={state.rows} manager={manager} view={view} owner={owner} sort={sort}
    onFilter={(name, value) => setParam(name, value, value === "all")}
    onClear={() => setParams({})}
    onSort={(value) => setParam("sort", value, false)}
    onOpen={(id) => navigate(`/loan-applications/${id}`, { state: { from: location.pathname + location.search } })} />;
}
