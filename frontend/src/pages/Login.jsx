import { useState } from "react";
import { useAuth } from "../auth";
import { validateLogin } from "../login-validation";

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function MailIcon() {
  return <svg className="field-icon" width="18" height="18" {...svgProps}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>;
}

function LockIcon() {
  return <svg className="field-icon" width="18" height="18" {...svgProps}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>;
}

function EyeIcon({ hidden = false }) {
  return <svg width="20" height="20" {...svgProps}>
    {hidden
      ? <><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 3.9" /><path d="M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.8-.8" /></>
      : <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}
  </svg>;
}

export default function Login() {
  const { login, notice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateLogin({ email, password });
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError("");
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setFieldErrors(err.fields || {});
      document.getElementById(Object.keys(err.fields || {})[0])?.focus();
      setError(err.message);
      setBusy(false);
    }
  };

  const message = error || notice;

  return (
    <div className="login-wrap">
      <div className="login">
        <form className="login-form" onSubmit={submit} noValidate>
          <div className="login-brand">
            <span className="brand-mark">C</span>
            <span>Credit Scoring</span>
          </div>
          <p className="form-eyebrow">WELCOME BACK</p>
          <h1>Sign in to your account</h1>
          <p className="form-intro">Enter your credentials to continue to your workspace.</p>

          {message && <div className="alert" role="alert">{message}</div>}

          <div className={`field${fieldErrors.email ? " has-error" : ""}`}>
            <label htmlFor="email">Email address</label>
            <div className="input-wrap">
              <MailIcon />
              <input id="email" type="email" value={email} placeholder="name@company.com"
                onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus
                aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "email-error" : undefined} />
            </div>
            {fieldErrors.email && <span id="email-error" className="field-error" role="alert">{fieldErrors.email}</span>}
          </div>

          <div className={`field${fieldErrors.password ? " has-error" : ""}`}>
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <LockIcon />
              <input id="password" type={showPassword ? "text" : "password"} value={password}
                placeholder="Enter your password" onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "password-error" : undefined} />
              <button
                type="button"
                className="pw-toggle"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon hidden={!showPassword} />
              </button>
            </div>
            {fieldErrors.password && <span id="password-error" className="field-error" role="alert">{fieldErrors.password}</span>}
          </div>

          <div className="login-row">
            <button type="button" className="link-btn"
              onClick={() => setError("Please contact your branch manager to reset your password.")}>
              Forgot password?
            </button>
          </div>

          <button type="submit" className="primary login-submit" disabled={busy}>
            {busy ? "Signing in..." : <>Sign in <span aria-hidden="true">→</span></>}
          </button>
          <p className="login-foot">Accounts are created by your branch manager.</p>
        </form>
      </div>
    </div>
  );
}
