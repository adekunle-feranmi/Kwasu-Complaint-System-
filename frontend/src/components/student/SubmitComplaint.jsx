import { useState } from "react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function SubmitComplaint() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const verified = user?.profile?.verification_status === "verified";

  const submit = async () => {
    setErr(""); setResult(null); setBusy(true);
    try {
      const r = await api.submitComplaint(text.trim());
      setResult(r);
      setText("");
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (!verified) {
    return (
      <div>
        <h2 className="page-title">Submit a Complaint</h2>
        <div className="alert warn">Your profile must be verified before you can submit complaints. Check the My Profile tab.</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">Submit a Complaint</h2>
      <p className="page-sub">Your complaint will be automatically categorised. Abusive content is sent for review and not published.</p>

      <div className="card">
        {err && <div className="alert error">{err}</div>}
        {result?.status === "published" && (
          <div className="alert ok">
            Complaint submitted and categorised as <strong>{result.complaint.category}</strong>.
          </div>
        )}
        {result?.status === "flagged" && (
          <div className="alert warn">{result.message}</div>
        )}

        <label>Your complaint</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your complaint in detail…"
        />
        <button className="btn" onClick={submit} disabled={busy || text.trim().length < 3}>
          {busy ? "Submitting…" : "Submit complaint"}
        </button>
      </div>
    </div>
  );
}
