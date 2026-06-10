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
        {verified ? "Submitted complaints from students appear here, with admin responses."
                  : "Verify your profile to submit complaints. You can browse the feed below."}
      </p>
      <div className="card">
        {items.length === 0 && <div className="empty">No complaints yet.</div>}
        {items.map((c) => (
          <FeedItem key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}

function FeedItem({ c }) {
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

      {/* Students can see admin comments but cannot post them. */}
      {c.comments && c.comments.map((cm) => (
        <div className="comment" key={cm.id}><strong>{cm.author} (admin):</strong> {cm.text}</div>
      ))}
    </div>
  );
}
