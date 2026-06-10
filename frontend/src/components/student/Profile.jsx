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
  const [idImage, setIdImage] = useState(null);   // base64 data URL
  const [idName, setIdName] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const banned = p?.verification_status === "banned";
  // If a profile already exists with an image on file, a re-submit can reuse it.
  const hasImageOnFile = !!p?.has_id_image;

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Please choose an image file."); return; }
    if (file.size > 4 * 1024 * 1024) { setErr("Image must be under 4 MB."); return; }
    setErr("");
    setIdName(file.name);
    const reader = new FileReader();
    reader.onload = () => setIdImage(reader.result);  // data:image/...;base64,...
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setErr(""); setMsg("");
    if (!idImage && !hasImageOnFile) {
      setErr("Please upload a photo of your KWASU ID card for verification.");
      return;
    }
    setBusy(true);
    try {
      await api.saveProfile({ ...form, id_image: idImage || undefined });
      await refresh();
      setIdImage(null); setIdName("");
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
        <input value={form.matric_number} onChange={set("matric_number")} placeholder="e.g. 22/47CS/2248 or 230201065" disabled={banned} />
        <label>Department</label>
        <input value={form.department} onChange={set("department")} disabled={banned} />
        <label>Level</label>
        <select value={form.level} onChange={set("level")} disabled={banned}>
          <option value="">Select level</option>
          {["100", "200", "300", "400", "500"].map((l) => <option key={l} value={l}>{l} Level</option>)}
        </select>

        <label>KWASU ID Card{hasImageOnFile ? " (re-upload to replace)" : " (required)"}</label>
        <input type="file" accept="image/*" onChange={onFile} disabled={banned} />
        <p className="muted" style={{ marginTop: -8, marginBottom: 12 }}>
          Upload a clear photo of your ID card. The matric number on it is cross-checked
          with what you typed, and an administrator reviews it. The image is removed once a
          decision is made.
        </p>
        {idName && <p className="muted">Selected: {idName}</p>}

        <button className="btn" onClick={submit} disabled={busy || banned}>
          {busy ? "Submitting…" : p ? "Update & resubmit" : "Submit profile"}
        </button>
      </div>
    </div>
  );
}
