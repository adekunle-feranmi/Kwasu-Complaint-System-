import { useState } from "react";
import { api } from "../../services/api";
import { CategoryBadge, StatusBadge } from "../common/UI";

export default function ComplaintDetail({ c, onChange }) {
  const [response, setResponse] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn) => { setBusy(true); try { await fn(); onChange(); } finally { setBusy(false); } };

  return (
    <div className="complaint">
      <div className="meta">
        <CategoryBadge category={c.category} />
        <StatusBadge status={c.status} />
        <span>· {c.author}</span>
        <span>· {new Date(c.created_at).toLocaleString()}</span>
      </div>
      <div className="text">{c.text}</div>
      {c.response && <div className="response"><strong>Current response:</strong> {c.response}</div>}

      <div className="btn-row" style={{ marginTop: 12 }}>
        <select
          defaultValue={c.category || ""}
          onChange={(e) => run(() => api.changeCategory(c.id, e.target.value))}
          style={{ width: "auto", marginBottom: 0 }}
        >
          <option value="Academic">Academic</option>
          <option value="Administrative">Administrative</option>
        </select>
        <select
          defaultValue={c.status}
          onChange={(e) => run(() => api.changeStatus(c.id, e.target.value))}
          style={{ width: "auto", marginBottom: 0 }}
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          style={{ marginBottom: 0 }}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Write a response to the student…"
        />
        <button
          className="btn sm"
          disabled={busy || !response.trim()}
          onClick={() => run(async () => { await api.respond(c.id, response.trim()); setResponse(""); })}
        >
          Send
        </button>
      </div>

      {c.comments && c.comments.map((cm) => (
        <div className="comment" key={cm.id}><strong>{cm.author} (admin):</strong> {cm.text}</div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          style={{ marginBottom: 0 }}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add an admin comment…"
        />
        <button
          className="btn sm ghost"
          disabled={busy || !comment.trim()}
          onClick={() => run(async () => { await api.addAdminComment(c.id, comment.trim()); setComment(""); })}
        >
          Comment
        </button>
      </div>
    </div>
  );
}
