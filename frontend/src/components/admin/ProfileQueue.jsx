import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function ProfileQueue() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");

  const load = () => api.pendingProfiles().then((d) => setItems(d.profiles)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const approve = async (pid) => { await api.approveProfile(pid); load(); };
  const reject = async (pid) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    await api.rejectProfile(pid, reason); load();
  };
  const ban = async (pid) => {
    if (!window.confirm("Permanently ban this student? They cannot resubmit.")) return;
    await api.banProfile(pid); load();
  };

  if (err) return <div className="alert error">{err}</div>;
  if (!items) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <h2 className="page-title">Profile Verification</h2>
      <p className="page-sub">Approve, reject, or ban student profiles awaiting verification.</p>
      <div className="card">
        {items.length === 0 && <div className="empty">No profiles pending verification.</div>}
        {items.map((p) => (
          <div className="complaint" key={p.id}>
            <div style={{ marginBottom: 8 }}>
              <strong>{p.full_name}</strong> <span className="muted">({p.email})</span>
            </div>
            <div className="muted" style={{ marginBottom: 10 }}>
              Matric: {p.matric_number || "—"} · Dept: {p.department || "—"} · Level: {p.level || "—"}
            </div>
            <div className="btn-row">
              <button className="btn sm" onClick={() => approve(p.id)}>Approve</button>
              <button className="btn sm ghost" onClick={() => reject(p.id)}>Reject</button>
              <button className="btn sm danger" onClick={() => ban(p.id)}>Ban</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
