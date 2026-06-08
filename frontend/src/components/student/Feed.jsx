import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { CategoryBadge, StatusBadge } from "../common/UI";
import { useAuth } from "../../context/AuthContext";

export default function Feed() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");
  const verified = user?.profile?.verification_status === "verified";

  const load = async () => {
    try { setItems((await api.feed()).complaints); }
    catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  if (err) return <div className="alert error">{err}</div>;
  if (!items) return <div className="spinner">Loading feed…</div>;

  return (
    <div>
      <h2 className="page-title">Complaint Feed</h2>
      <p className="page-sub">
        {verified ? "You can comment on complaints below."
                  : "Verify your profile to submit and comment on complaints."}
      </p>
      <div className="card">
        {items.length === 0 && <div className="empty">No complaints yet.</div>}
        {items.map((c) => (
          <FeedItem key={c.id} c={c} canComment={verified} onChange={load} />
        ))}
      </div>
    </div>
  );
}

function FeedItem({ c, canComment, onChange }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const comment = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await api.addComment(c.id, text.trim()); setText(""); onChange(); }
    finally { setBusy(false); }
  };

  return (
    <div className="complaint">
      <div className="meta">
        <CategoryBadge category={c.category} />
        <StatusBadge status={c.status} />
        <span>· {c.author}</span>
        <span>· {new Date(c.created_at).toLocaleDateString()}</span>
      </div>
      <div className="text">{c.text}</div>
      {c.response && <div className="response"><strong>Admin response:</strong> {c.response}</div>}

      {c.comments && c.comments.map((cm) => (
        <div className="comment" key={cm.id}><strong>{cm.author}:</strong> {cm.text}</div>
      ))}

      {canComment && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input
            style={{ marginBottom: 0 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            onKeyDown={(e) => e.key === "Enter" && comment()}
          />
          <button className="btn sm" onClick={comment} disabled={busy}>Post</button>
        </div>
      )}
    </div>
  );
}
