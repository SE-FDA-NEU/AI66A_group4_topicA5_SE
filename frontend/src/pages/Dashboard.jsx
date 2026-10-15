import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Empty, ErrorBox, Loading } from "../components/States";

export default function Dashboard() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let active = true;
    api.summary().then(
      (data) => {
        if (active) {
          setState({ status: data.total_applications === 0 ? "empty" : "data", data });
        }
      },
      (err) => {
        if (active) setState({ status: "error", message: err.message });
      },
    );
    return () => { active = false; };
  }, [attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  };

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">An overview of today's applications and credit scores.</p>
      <nav className="actions" aria-label="Dashboard actions">
        <Link className="button primary" to="/loan-applications/new">New application</Link>
        <Link className="button" to="/loan-applications">Applications</Link>
      </nav>

      {state.status === "loading" && <Loading text="Loading dashboard..." />}
      {state.status === "error" && <ErrorBox message={state.message} onRetry={retry} />}
      {(state.status === "empty" || state.status === "data") && (
        <section aria-labelledby="today-title">
          <h2 id="today-title">Activity today <small>{state.data.date}</small></h2>
          <div className="tiles">
            <div className="card tile">
              <span className="num">{state.data.total_applications}</span>
              applications today
            </div>
            <div className="card tile">
              <span className="num">{state.data.average_score ?? "-"}</span>
              average score
              {state.data.average_score == null && <small> (nothing scored yet)</small>}
            </div>
            <div className="card tile">
              <span className="num">{state.data.high_risk_count}</span>
              flagged high risk today
            </div>
          </div>
          {state.status === "empty" && (
            <Empty text="No applications today. Use New application to create your first one." />
          )}
        </section>
      )}
    </>
  );
}
