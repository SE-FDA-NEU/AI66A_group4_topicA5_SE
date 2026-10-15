import { useEffect, useRef, useState } from "react";
import { api } from "../api";

export default function SensitiveData({ application }) {
  const [values, setValues] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const hide = () => { generation.current += 1; setValues(null); setBusy(false); };
  useEffect(() => {
    const onHidden = () => { if (document.hidden) hide(); };
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      generation.current += 1;
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);
  useEffect(() => {
    if (!values) return;
    const timeout = setTimeout(hide, 30000);
    return () => clearTimeout(timeout);
  }, [values]);

  const reveal = async () => {
    const request = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const result = await api.revealIdentifiers(application.id);
      if (request === generation.current && !document.hidden) setValues(result);
    } catch (err) {
      if (request === generation.current) setError(err.message);
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  const hasData = application.citizen_id_masked || application.bank_account_masked;
  return (
    <section className="card">
      <h2>Protected identifiers</h2>
      {error && <div className="alert" role="alert">{error}</div>}
      <dl>
        <dt>Citizen ID</dt><dd>{values?.citizen_id || application.citizen_id_masked || "Not provided"}</dd>
        <dt>Bank account</dt><dd>{values?.bank_account || application.bank_account_masked || "Not provided"}</dd>
      </dl>
      {hasData && <>
        <p>Viewing full numbers records your account and time in the access log. Numbers hide after 30 seconds or when you leave this window.</p>
        {values ? <button onClick={hide}>Hide numbers</button> : <button onClick={reveal} disabled={busy}>{busy ? "Opening..." : "View full numbers (logged)"}</button>}
      </>}
    </section>
  );
}
