import { useCallback, useEffect, useState } from "react";
import { api, isRetryable } from "../api";
import Card from "../components/Card";
import Field from "../components/Field";
import PageHeader from "../components/PageHeader";
import { Empty, ErrorBox, Loading } from "../components/States";

const INITIAL = { email: "", full_name: "", password: "" };

function Employee({ employee, onChanged }) {
  const [name, setName] = useState(employee.full_name);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const officer = employee.role === "user";
  const update = async (body) => {
    setBusy(true); setError("");
    try { await api.updateUser(employee.id, body); setConfirm(false); onChanged(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <tr>
    <td data-label="Name">{officer
      ? <form className="inline-form" onSubmit={(event) => { event.preventDefault(); update({ full_name: name }); }}>
        <label className="sr-only" htmlFor={`employee-name-${employee.id}`}>Employee name</label>
        <input id={`employee-name-${employee.id}`} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
        <button disabled={busy}>Save name</button>
      </form>
      : employee.full_name}</td>
    <td data-label="Email">{employee.email}</td>
    <td data-label="Role">{employee.role === "admin" ? "Manager" : "Officer"}</td>
    <td data-label="Status">{employee.is_active ? "Active" : "Inactive"}</td>
    <td data-label="Actions">
      {error && <div role="alert" className="alert">{error}</div>}
      {officer ? (confirm ? <div role="group" aria-label="Confirm employee status change">
        <p>{employee.is_active ? "Deactivate this Officer? Existing sessions will stop working; loan records are retained." : "Reactivate this Officer? They must sign in again."}</p>
        <button onClick={() => update({ is_active: !employee.is_active })} disabled={busy}>Confirm</button>{" "}
        <button onClick={() => setConfirm(false)} disabled={busy}>Keep current status</button>
      </div> : <button onClick={() => setConfirm(true)} disabled={busy}>{employee.is_active ? "Deactivate" : "Reactivate"}</button>)
        : <span className="muted">Manager accounts cannot be changed here.</span>}
    </td>
  </tr>;
}

export function EmployeeTable({ users, onChanged }) {
  return <div className="scroll"><table className="list-table">
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
    <tbody>{users.map((employee) => <Employee key={employee.id} employee={employee} onChanged={onChanged} />)}</tbody>
  </table></div>;
}

export default function Users() {
  const [state, setState] = useState({ status: "loading" });
  const [form, setForm] = useState(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(() => {
    setState({ status: "loading" });
    api.listUsers().then((users) => setState({ status: "ok", users }), (err) => setState({ status: "error", message: err.message, retryable: isRetryable(err) }));
  }, []);
  useEffect(load, [load]);
  const create = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await api.createUser(form); setForm(INITIAL); setNotice("Officer account created. Share the initial password privately with the employee."); load(); }
    catch (err) { setError(err.message); setForm((current) => ({ ...current, password: "" })); }
    finally { setBusy(false); }
  };
  const set = (name) => (event) => setForm({ ...form, [name]: event.target.value });
  return <>
    <PageHeader title="Employee accounts" />
    {notice && <p role="status">{notice}</p>}
    <Card title="Create Officer">
      <form className="user-form" onSubmit={create}>
        {error && <div role="alert" className="alert">{error}</div>}
        <Field id="user-full_name" label="Name">
          <input id="user-full_name" value={form.full_name} maxLength={100} required onChange={set("full_name")} />
        </Field>
        <Field id="user-email" label="Email">
          <input id="user-email" type="email" value={form.email} maxLength={254} required onChange={set("email")} />
        </Field>
        <Field id="user-password" label="Initial password (12–128 characters)">
          <input id="user-password" type="password" autoComplete="new-password" value={form.password} minLength={12} maxLength={128} required onChange={set("password")} />
        </Field>
        <button className="primary" disabled={busy}>{busy ? "Creating..." : "Create Officer"}</button>
      </form>
    </Card>
    {state.status === "loading" ? <Loading text="Loading employees..." /> : state.status === "error" ? <ErrorBox message={state.message} onRetry={state.retryable ? load : undefined} /> : state.users.length === 0 ? <Empty text="No employee accounts." /> : <EmployeeTable users={state.users} onChanged={load} />}
  </>;
}
