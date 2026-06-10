import { useAuth } from "../../context/AuthContext";
import { useState, useRef, useEffect } from "react";

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

// Shows the KWASU logo image if present in /public, else a styled "KW" fallback.
function Logo({ size = 36 }) {
  const [ok, setOk] = useState(true);
  if (ok) {
    return (
      <img
        src="/kwasu-logo.png"
        alt="KWASU"
        style={{ width: size, height: size, objectFit: "contain", borderRadius: 8 }}
        onError={() => setOk(false)}
      />
    );
  }
  return <span className="logo">KW</span>;
}

// Truncate an email like adekunleferanmi080@gmail.com -> adekunlefe…@gmail.com
function shortEmail(email) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const head = name.length > 10 ? name.slice(0, 10) + "…" : name;
  return `${head}@${domain}`;
}

export function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <>
      <div className="app-header">
        <div className="brand">
          <Logo />
          {user && <span className="welcome">Welcome, {shortEmail(user.email)}</span>}
        </div>

        {user && (
          <div className="menu-wrap" ref={menuRef}>
            <button
              className="hamburger"
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span /><span /><span />
            </button>
            {open && (
              <div className="menu-dropdown">
                <div className="menu-email">{user.email}</div>
                <div className="menu-role">{user.role}</div>
                <button className="menu-item" onClick={logout}>Log out</button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="gold-bar" />
    </>
  );
}

export function Sidebar({ items, active, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="logo-block">
        <div className="ring"><Logo size={50} /></div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Kwara State University</div>
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
