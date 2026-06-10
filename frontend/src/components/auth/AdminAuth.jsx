import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function AdminAuth({ onSwitch }) {
  const { loginAdmin, registerAdmin } = useAuth();
  const [mode, setMode] = useState("login");      // 'login' | 'signup'
  const [form, setForm] = useState({ email: "", password: "", admin_code: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      if (mode === "login") {
        await loginAdmin({ email: form.email.trim(), password: form.password, admin_code: form.admin_code });
      } else {
        await registerAdmin({ email: form.email.trim(), password: form.password, admin_code: form.admin_code });
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap admin-wrap">
      <div className="auth-card admin-card">
        <div className="crest admin-crest">ADMIN</div>
        <h1>Administrator {mode === "login" ? "Sign In" : "Sign Up"}</h1>
        <p className="sub">Staff access · KWASU Complaint Management System</p>

        <div className="tabs" style={{ marginBottom: 18 }}>
          <div className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setErr(""); }}>Sign In</div>
          <div className={`tab ${mode === "signup" ? "active" : ""}`} onClick={() => { setMode("signup"); setErr(""); }}>Sign Up</div>
        </div>

        {err && <div className="alert error">{err}</div>}

        <label>Email</label>
        <input value={form.email} onChange={set("email")} placeholder="admin@kwasu.edu.ng"
               onKeyDown={(e) => e.key === "Enter" && submit()} />
        <label>Password</label>
        <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••"
               onKeyDown={(e) => e.key === "Enter" && submit()} />
        <label>Admin Code</label>
        <input value={form.admin_code} onChange={set("admin_code")} placeholder="required every time"
               onKeyDown={(e) => e.key === "Enter" && submit()} />

        <button className="btn gold" onClick={submit} disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in as admin" : "Create admin account"}
        </button>

        <div className="auth-toggle">
          <a onClick={() => onSwitch("login")} style={{ cursor: "pointer" }}>← Back to student sign in</a>
        </div>
      </div>
    </div>
  );
}
