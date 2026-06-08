import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { CategoryBadge, StatusBadge, Badge } from "../common/UI";

export default function ComplaintHistory() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.myComplaints().then((d) => setItems(d.complaints)).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="alert error">{err}</div>;
  if (!items) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <h2 className="page-title">My Complaints</h2>
      <p className="page-sub">Track the status and admin responses to your complaints.</p>
      <div className="card">
        {items.length === 0 && <div className="empty">You haven't submitted any complaints yet.</div>}
        {items.map((c) => (
          <div className="complaint" key={c.id}>
            <div className="meta">
              {c.is_flagged
                ? <Badge kind="flagged">Flagged — under review</Badge>
                : <><CategoryBadge category={c.category} /><StatusBadge status={c.status} /></>}
              <span>· {new Date(c.created_at).toLocaleString()}</span>
            </div>
            <div className="text">{c.text}</div>
            {c.response && <div className="response"><strong>Admin response:</strong> {c.response}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
