import { useAuth } from "../../context/AuthContext";

export function Badge({ kind, children }) {
  return <span className={`badge ${kind}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const label = { pending: "Pending", in_progress: "In Progress", resolved: "Resolved" }[status] || status;
  return <Badge kind={status}>{label}</Badge>;
}

export function CategoryBadge({ category }) {
  if (!category) return null;
  return <Badge kind={category.toLowerCase()}>{category}</Badge>;
}

export function Header() {
  const { user, logout } = useAuth();
  return (
    <>
      <div className="app-header">
        <div className="brand">
          <span className="logo">KW</span>
          <span>KWASU Complaints</span>
        </div>
        <div className="header-actions">
          {user && <span>{user.email} ({user.role})</span>}
          {user && <button onClick={logout}>Log out</button>}
        </div>
      </div>
      <div className="gold-bar" />
    </>
  );
}

export function Sidebar({ items, active, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="logo-block">
        <div className="ring">KW</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Kwara State University</div>
      </div>
      {items.map((it) => (
        <button
          key={it.key}
          className={`nav-item ${active === it.key ? "active" : ""}`}
          onClick={() => onSelect(it.key)}
        >
          {it.label}
        </button>
      ))}
    </aside>
  );
}
