import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Badge } from "../common/UI";

export default function FlaggedQueue() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");

  const load = () => api.flaggedComplaints().then((d) => setItems(d.complaints)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const clear = async (cid) => { await api.clearFlag(cid); load(); };
  const confirm = async (cid) => { await api.confirmFlag(cid); load(); };

  if (err) return <div className="alert error">{err}</div>;
  if (!items) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <h2 className="page-title">Flagged Queue</h2>
      <p className="page-sub">Complaints flagged for abusive content, awaiting human review.</p>
      <div className="card">
        {items.length === 0 && <div className="empty">No flagged complaints.</div>}
        {items.map((c) => (
          <div className="complaint" key={c.id}>
            <div className="meta">
              <Badge kind="flagged">Flagged</Badge>
              {c.review_status && c.review_status !== "pending" && (
                <Badge kind={c.review_status === "cleared" ? "verified" : "rejected"}>{c.review_status}</Badge>
              )}
              <span>· {c.author}</span>
              <span>· {new Date(c.created_at).toLocaleString()}</span>
            </div>
            <div className="text">{c.text}</div>
            {c.flag_reason && <div className="muted" style={{ marginBottom: 8 }}>Reason: {c.flag_reason}</div>}
            {c.review_status === "pending" && (
              <div className="btn-row">
                <button className="btn sm" onClick={() => clear(c.id)}>Clear (false positive — publish)</button>
                <button className="btn sm danger" onClick={() => confirm(c.id)}>Confirm abusive</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
