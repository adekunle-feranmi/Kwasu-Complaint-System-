import { useEffect, useState } from "react";
import { api } from "../../services/api";
import ComplaintDetail from "./ComplaintDetail";

export default function ComplaintQueue() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");

  const load = () => api.adminComplaints().then((d) => setItems(d.complaints)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  if (err) return <div className="alert error">{err}</div>;
  if (!items) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <h2 className="page-title">Complaint Queue</h2>
      <p className="page-sub">Auto-categorised complaints. Change category, update status, or respond.</p>
      <div className="card">
        {items.length === 0 && <div className="empty">No complaints yet.</div>}
        {items.map((c) => <ComplaintDetail key={c.id} c={c} onChange={load} />)}
      </div>
    </div>
  );
}
