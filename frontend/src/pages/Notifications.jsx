import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, isRetryable } from "../api";
import { StatusBadge } from "../components/Badges";
import { Empty, ErrorBox, Loading } from "../components/States";
import { formatDateTime } from "../format";

export default function Notifications() {
  const navigate = useNavigate();
  const active = useRef(false);
  const requestVersion = useRef(0);
  const [state, setState] = useState({ status: "loading" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => {
    const version = ++requestVersion.current;
    const current = () => active.current && requestVersion.current === version;
    setState({ status: "loading" });
    api.notifications().then(
      data => { if (current()) setState({ status: "ok", data }); },
      err => { if (current()) setState({ status: "error", message: err.message, retryable: isRetryable(err) }); }
    );
  }, []);
  useEffect(() => { active.current = true; load(); return () => { active.current = false; }; }, [load]);

  const read = async (item, open) => {
    setBusy(item.id);
    setError("");
    // A response from an older list request must not restore an unread badge
    // after this action acknowledges the item (including StrictMode fetches).
    requestVersion.current++;
    try {
      if (!item.is_read) {
        const receipt = await api.readNotification(item.id);
        if (!active.current) return;
        setState(current => {
          const wasUnread = current.data.items.some(row => row.id === item.id && !row.is_read);
          return { ...current, data: {
            unread_count: Math.max(0, current.data.unread_count - Number(wasUnread)),
            items: current.data.items.map(row => row.id === item.id ? { ...row, ...receipt } : row),
          } };
        });
        window.dispatchEvent(new Event("notifications-changed"));
      }
      if (open) navigate(`/loan-applications/${item.loan_application_id}`);
    } catch (err) {
      if (active.current) setError(`The notification could not be marked as read. ${err.message}`);
    } finally { if (active.current) setBusy(""); }
  };

  return <>
    <h1>Review notifications</h1>
    <p className="muted">New applications awaiting review. The unread counter refreshes every 30 seconds and when you return to the app. Read status is saved for your own Manager account.</p>
    {state.status === "loading" ? <Loading text="Loading notifications..." />
      : state.status === "error" ? <ErrorBox message={state.message} onRetry={state.retryable ? load : undefined} />
        : <>
          <p role="status">{state.data.unread_count} unread notifications</p>
          {error && <div className="alert" role="alert">{error}</div>}
          {state.data.items.length === 0 ? <Empty text="No applications awaiting review." /> : <ul className="notification-list">
            {state.data.items.map(item => <li className="card" key={item.id} data-notification-id={item.id}>
              <strong>{item.message}</strong> <span className="badge">{item.is_read ? "Read" : "Unread"}</span>
              <p>{item.owner_name} · {formatDateTime(item.created_at)} · <StatusBadge status={item.status} /></p>
              <button onClick={() => read(item, true)} disabled={!!busy}>Open application</button>{" "}
              {!item.is_read && <button onClick={() => read(item, false)} disabled={!!busy}>{busy === item.id ? "Saving..." : "Mark as read"}</button>}
            </li>)}
          </ul>}
        </>}
  </>;
}
