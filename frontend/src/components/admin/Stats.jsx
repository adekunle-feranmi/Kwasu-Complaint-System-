import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function Stats() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { api.stats().then(setS).catch((e) => setErr(e.message)); }, []);

  if (err) return <div className="alert error">{err}</div>;
  if (!s) return <div className="spinner">Loading…</div>;

  const maxTrend = Math.max(1, ...s.trend_7_days.map((d) => d.count));

  return (
    <div>
      <h2 className="page-title">Overview</h2>
      <p className="page-sub">Summary of complaints and verification queue.</p>

      <div className="stat-grid">
        <div className="stat"><div className="num">{s.by_category.Academic}</div><div className="lbl">Academic</div></div>
        <div className="stat"><div className="num">{s.by_category.Administrative}</div><div className="lbl">Administrative</div></div>
        <div className="stat"><div className="num">{s.totals.flagged}</div><div className="lbl">Flagged</div></div>
        <div className="stat"><div className="num">{s.totals.pending_profiles}</div><div className="lbl">Profiles pending</div></div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, color: "var(--kwasu-green)" }}>Complaints — last 7 days</h3>
        {s.trend_7_days.map((d) => (
          <div className="bar-row" key={d.date}>
            <span style={{ width: 70 }}>{d.date.slice(5)}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(d.count / maxTrend) * 100}%` }} />
            </div>
            <span style={{ width: 24, textAlign: "right" }}>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
