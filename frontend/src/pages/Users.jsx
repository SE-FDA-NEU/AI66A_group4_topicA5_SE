import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { Empty, ErrorBox, Loading } from "../components/States";

const INITIAL = { email: "", full_name: "", password: "" };

function Employee({ employee, onChanged }) {
  const [name, setName] = useState(employee.full_name);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = async (body) => {
    setBusy(true); setError("");
    try { await api.updateUser(employee.id, body); setConfirm(false); onChanged(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <section className="card">
    <h2>{employee.full_name}</h2>
    <p>{employee.email} · {employee.role === "admin" ? "Manager" : "Officer"} · {employee.is_active ? "Active" : "Inactive"}</p>
    {error && <div role="alert" className="alert">{error}</div>}
    {employee.role === "user" ? <>
      <form onSubmit={(event) => { event.preventDefault(); update({ full_name: name }); }}>
        <label>Employee name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
        <button disabled={busy}>Save name</button>
      </form>
      {confirm ? <div role="group" aria-label="Confirm employee status change">
        <p>{employee.is_active ? "Deactivate this Officer? Existing sessions will stop working; loan records are retained." : "Reactivate this Officer? They must sign in again."}</p>
        <button onClick={() => update({ is_active: !employee.is_active })} disabled={busy}>Confirm</button>{" "}
        <button onClick={() => setConfirm(false)} disabled={busy}>Keep current status</button>
      </div> : <button onClick={() => setConfirm(true)} disabled={busy}>{employee.is_active ? "Deactivate" : "Reactivate"}</button>}
    </> : <p>Manager accounts cannot be changed here.</p>}
  </section>;
}

export default function Users() {
  const [state, setState] = useState({ status: "loading" });
  const [form, setForm] = useState(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(() => {
    setState({ status: "loading" });
    api.listUsers().then((users) => setState({ status: "ok", users }), (err) => setState({ status: "error", message: err.message }));
  }, []);
  useEffect(load, [load]);
  const create = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await api.createUser(form); setForm(INITIAL); setNotice("Officer account created. Share the initial password privately with the employee."); load(); }
    catch (err) { setError(err.message); setForm((current) => ({ ...current, password: "" })); }
    finally { setBusy(false); }
  };
  return <>
    <h1>Employee accounts</h1>
    <p>Managers create Officer accounts, update names and control access. Deactivation keeps their application history.</p>
    {notice && <p role="status">{notice}</p>}
    <form className="card" onSubmit={create}>
      <h2>Create Officer</h2>
      {error && <div role="alert" className="alert">{error}</div>}
      <label>Name<input value={form.full_name} maxLength={100} required onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
      <label>Email<input type="email" value={form.email} maxLength={254} required onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Initial password (12–128 characters)<input type="password" autoComplete="new-password" value={form.password} minLength={12} maxLength={128} required onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
      <button className="primary" disabled={busy}>{busy ? "Creating..." : "Create Officer"}</button>
    </form>
    {state.status === "loading" ? <Loading text="Loading employees..." /> : state.status === "error" ? <ErrorBox message={state.message} onRetry={load} /> : state.users.length === 0 ? <Empty text="No employee accounts." /> : state.users.map((employee) => <Employee key={employee.id} employee={employee} onChanged={load} />)}
  </>;
}
