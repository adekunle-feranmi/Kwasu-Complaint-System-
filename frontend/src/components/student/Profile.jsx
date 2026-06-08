import { useState } from "react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../common/UI";

export default function Profile() {
  const { user, refresh } = useAuth();
  const p = user?.profile;
  const [form, setForm] = useState({
    full_name: p?.full_name || "",
    matric_number: p?.matric_number || user?.matric_number || "",
    department: p?.department || "",
    level: p?.level || "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const banned = p?.verification_status === "banned";

  const submit = async () => {
    setErr(""); setMsg(""); setBusy(true);
    try {
      await api.saveProfile(form);
      await refresh();
      setMsg("Profile submitted. It is now pending admin verification.");
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <h2 className="page-title">My Profile</h2>
      <p className="page-sub">Your profile must be verified before you can submit complaints.</p>

      {p && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <strong>Status:</strong> <Badge kind={p.verification_status}>{p.verification_status}</Badge>
          </div>
          {p.verification_status === "rejected" && p.reject_reason && (
            <div className="alert error" style={{ marginTop: 12, marginBottom: 0 }}>
              Rejected: {p.reject_reason}. Edit your details and resubmit.
            </div>
          )}
          {p.verification_status === "pending" && (
            <div className="alert warn" style={{ marginTop: 12, marginBottom: 0 }}>
              Awaiting admin review. Editing your profile will keep it pending.
            </div>
          )}
          {p.verification_status === "verified" && (
            <div className="alert ok" style={{ marginTop: 12, marginBottom: 0 }}>
              Verified. Note: editing your profile will require re-approval.
            </div>
          )}
        </div>
      )}

      <div className="card">
        {err && <div className="alert error">{err}</div>}
        {msg && <div className="alert ok">{msg}</div>}
        {banned && <div className="alert error">Your account is banned and cannot resubmit.</div>}

        <label>Full Name</label>
        <input value={form.full_name} onChange={set("full_name")} disabled={banned} />
        <label>Matric Number</label>
        <input value={form.matric_number} onChange={set("matric_number")} placeholder="22/47CS/2248" disabled={banned} />
        <label>Department</label>
        <input value={form.department} onChange={set("department")} disabled={banned} />
        <label>Level</label>
        <select value={form.level} onChange={set("level")} disabled={banned}>
          <option value="">Select level</option>
          {["100", "200", "300", "400", "500"].map((l) => <option key={l} value={l}>{l} Level</option>)}
        </select>

        <button className="btn" onClick={submit} disabled={busy || banned}>
          {busy ? "Submitting…" : p ? "Update & resubmit" : "Submit profile"}
        </button>
      </div>
    </div>
  );
}
