import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function AdminRegister({ onSwitch }) {
  const { registerAdmin } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", admin_code: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      await registerAdmin({
        email: form.email.trim(),
        password: form.password,
        admin_code: form.admin_code,
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="crest">KW</div>
        <h1>Admin registration</h1>
        <p className="sub">Requires the shared admin registration code</p>

        {err && <div className="alert error">{err}</div>}

        <label>Email</label>
        <input value={form.email} onChange={set("email")} placeholder="admin@kwasu.edu.ng" />
        <label>Password</label>
        <input type="password" value={form.password} onChange={set("password")} placeholder="at least 6 characters" />
        <label>Admin Code</label>
        <input value={form.admin_code} onChange={set("admin_code")} placeholder="shared admin code" />

        <button className="btn gold" onClick={submit} disabled={busy}>
          {busy ? "Creating…" : "Create admin account"}
        </button>

        <div className="auth-toggle">
          <a onClick={() => onSwitch("login")} style={{ cursor: "pointer" }}>Back to sign in</a>
        </div>
      </div>
    </div>
  );
}
