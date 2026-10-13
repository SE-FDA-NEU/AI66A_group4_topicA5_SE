import { useState } from "react";
import { useAuth } from "../auth";

export default function Login() {
  const { login, notice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password to sign in.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await login(email, password); // App redirects to /dashboard once the user is set
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const message = error || notice;
  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={submit} noValidate>
        <h1>Credit Scoring</h1>
        <p className="muted">Sign in with your branch account.</p>
        {message && <div className="alert" role="alert">{message}</div>}
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <button type="submit" className="primary" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </div>
  );
}
