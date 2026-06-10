import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { getStoredToken } from "../../services/api";

// OCR result -> badge styling + human label
function ocrBadge(flag) {
  const map = {
    match:       ["verified", "ID matric matches ✓"],
    mismatch:    ["rejected", "ID matric MISMATCH ✗"],
    unreadable:  ["pending", "ID not readable"],
    unavailable: ["pending", "OCR unavailable — review manually"],
  };
  const [kind, label] = map[flag] || ["pending", "No ID check"];
  return <span className={`badge ${kind}`}>{label}</span>;
}

export default function ProfileQueue() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");
  const [viewing, setViewing] = useState(null);   // pid whose ID image is shown
  const [imgSrc, setImgSrc] = useState(null);

  const load = () => api.pendingProfiles().then((d) => setItems(d.profiles)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const approve = async (pid) => { await api.approveProfile(pid); setViewing(null); load(); };
  const reject = async (pid) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    await api.rejectProfile(pid, reason); setViewing(null); load();
  };
  const ban = async (pid) => {
    if (!window.confirm("Permanently ban this student? They cannot resubmit.")) return;
    await api.banProfile(pid); setViewing(null); load();
  };

  // Fetch the ID image with the auth header, turn into a blob URL to display.
  const viewId = async (pid) => {
    if (viewing === pid) { setViewing(null); setImgSrc(null); return; }
    try {
      const res = await fetch(api.idImageUrl(pid), {
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      if (!res.ok) throw new Error("Could not load ID image");
      const blob = await res.blob();
      setImgSrc(URL.createObjectURL(blob));
      setViewing(pid);
    } catch (e) { setErr(e.message); }
  };

  if (err) return <div className="alert error">{err}</div>;
  if (!items) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <h2 className="page-title">Profile Verification</h2>
      <p className="page-sub">Review each student's ID and details, then approve, reject, or ban. The ID image is deleted once you decide.</p>
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
            <div style={{ marginBottom: 10 }}>{ocrBadge(p.ocr_match)}</div>

            {viewing === p.id && imgSrc && (
              <div style={{ marginBottom: 12 }}>
                <img src={imgSrc} alt="Student ID" style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 8, border: "1px solid var(--border)" }} />
              </div>
            )}

            <div className="btn-row">
              {p.has_id_image && (
                <button className="btn sm ghost" onClick={() => viewId(p.id)}>
                  {viewing === p.id ? "Hide ID" : "View ID"}
                </button>
              )}
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
