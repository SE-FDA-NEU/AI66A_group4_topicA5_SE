import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const required = (label) => `Please enter your ${label}.`;

const LENS_R = 34;    // magnifier radius (px), must match .magnifier width / 2
const TEXT_LEFT = 43; // input border (1px) + left padding (42px)

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
  return (
    <svg className="field-icon" width="18" height="18" {...svgProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="field-icon" width="18" height="18" {...svgProps}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" {...svgProps}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MagnifierIcon() {
  return (
    <svg width="20" height="20" {...svgProps}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

export default function Login() {
  const { login, notice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const inputRef = useRef(null);
  const layerRef = useRef(null);
  const dotsRef = useRef(null);
  const revealRef = useRef(null);
  const textRef = useRef(null);
  const lensRef = useRef(null);
  const pointer = useRef(null);

  // Night mode = "magnifier" mode
  const night = showPw;

  // Move the magnifier with the mouse and reveal only the text under the lens
  useEffect(() => {
    if (!night) return undefined;
    const input = inputRef.current;
    const layer = layerRef.current;
    const dots = dotsRef.current;
    const reveal = revealRef.current;
    const text = textRef.current;
    const lens = lensRef.current;
    if (!input || !layer || !dots || !reveal || !text || !lens) return undefined;

    const onMove = (e) => {
      pointer.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove);

    let raf = 0;
    const tick = () => {
      const box = layer.getBoundingClientRect();
      const sl = input.scrollLeft; // keep overlay in sync when a long password scrolls
      dots.style.translate = `${-sl}px 0`;
      text.style.translate = `${-sl}px 0`;

      const p = pointer.current;
      if (p) {
        lens.style.opacity = "1";
        lens.style.transform = `translate(${p.x - LENS_R}px, ${p.y - LENS_R}px)`;
        const lx = p.x - box.left;
        const ly = p.y - box.top;
        reveal.style.clipPath = `circle(${LENS_R - 3}px at ${lx}px ${ly}px)`;
        text.style.transformOrigin = `${lx - (TEXT_LEFT - sl)}px ${ly}px`; // zoom around the lens center
      } else {
        lens.style.opacity = "0";
        reveal.style.clipPath = "circle(0px at 0 0)";
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      lens.style.opacity = "0";
    };
  }, [night]);

  const toggle = (e) => {
    if (e.detail > 0) pointer.current = { x: e.clientX, y: e.clientY }; // real mouse click
    setShowPw((v) => !v);
  };

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = required("email");
    else if (!EMAIL_RE.test(email.trim())) errs.email = "Invalid email address.";
    if (!password) errs.password = required("password");
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError("");
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
    <div className={"login-wrap" + (night ? " night" : "")}>
      {/* Page background */}
      <div className="sky sky-day" aria-hidden="true" />
      <div className="sky sky-night" aria-hidden="true" />
      <div className="stars" aria-hidden="true" />
      <div className="p-mtn p-mtn-left" aria-hidden="true" />
      <div className="p-mtn p-mtn-right" aria-hidden="true" />

      {/* Magnifying glass (replaces the mouse cursor in night mode) */}
      <div className="magnifier" ref={lensRef} aria-hidden="true" />

      <div className="login">
        {/* Left: illustrated panel */}
        <div className="login-visual">
          <div className="v-sky v-sky-day" aria-hidden="true" />
          <div className="v-sky v-sky-night" aria-hidden="true" />
          <div className="v-stars" aria-hidden="true" />
          <div className="v-sun" aria-hidden="true" />
          <div className="v-moon" aria-hidden="true" />
          <div className="v-mtn v-mtn-1" aria-hidden="true" />
          <div className="v-mtn v-mtn-2" aria-hidden="true" />
          <div className="v-pines" aria-hidden="true" />
          <div className="v-lake" aria-hidden="true" />
          <div className="v-shade" aria-hidden="true" />
          <div className="v-text">
            <h2>Credit Scoring</h2>
            <p>Sign in to review loan applications and track credit decisions for your branch.</p>
          </div>
        </div>

        {/* Right: form */}
        <form className="login-form" onSubmit={submit} noValidate>
          <h1>Sign in</h1>

          {message && <div className="alert" role="alert">{message}</div>}

          <div className={"field" + (fieldErrors.email ? " has-error" : "")}>
            <label htmlFor="email" className="sr-only">Email</label>
            <div className="input-wrap">
              <MailIcon />
              <input
                id="email"
                type="email"
                value={email}
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoFocus
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
            </div>
            {fieldErrors.email && <span id="email-error" className="field-error" role="alert">{fieldErrors.email}</span>}
          </div>

          <div className={"field" + (fieldErrors.password ? " has-error" : "")}>
            <label htmlFor="password" className="sr-only">Password</label>
            <div className="input-wrap">
              <LockIcon />
              {/* Always type="password": the real text is never shown by the input itself */}
              <input
                id="password"
                ref={inputRef}
                className={night ? "scan" : ""}
                type="password"
                value={password}
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
              />

              {/* Night mode overlay: dots everywhere, real text only under the lens */}
              {night && (
                <div className="pw-layer" ref={layerRef} aria-hidden="true">
                  <div className="pw-dots" ref={dotsRef}>{"•".repeat(password.length)}</div>
                  <div className="pw-reveal" ref={revealRef}>
                    <div className="pw-reveal-text" ref={textRef}>{password}</div>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="pw-toggle"
                onClick={toggle}
                aria-label={night ? "Put the magnifier away" : "Inspect password with a magnifier"}
                aria-pressed={night}
              >
                {night ? <MagnifierIcon /> : <EyeIcon />}
              </button>
            </div>
            {fieldErrors.password && <span id="password-error" className="field-error" role="alert">{fieldErrors.password}</span>}
          </div>

          <div className="login-row">
            <button
              type="button"
              className="link-btn"
              onClick={() => setError("Please contact your branch manager to reset your password.")}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Signing in..." : <>Sign in <span aria-hidden="true">→</span></>}
          </button>

          <p className="login-foot">Accounts are created by your branch manager.</p>
        </form>
      </div>
    </div>
  );
}