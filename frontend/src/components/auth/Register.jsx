import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { LogoCrest } from "../common/UI";
import PasswordInput from "./PasswordInput";

export default function Register({ onSwitch }) {
  const { registerStudent } = useAuth();
  const [form, setForm] = useState({ email: "", matric_number: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      await registerStudent({
        email: form.email.trim(),
        matric_number: form.matric_number.trim(),
        password: form.password,
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
        <LogoCrest fallback="KW" />
        <h1>Create student account</h1>
        <p className="sub">You'll complete your profile after signing up</p>

        {err && <div className="alert error">{err}</div>}

        <label>Email</label>
        <input value={form.email} onChange={set("email")} placeholder="you@email.com" />

        <label>Matric Number</label>
        <input value={form.matric_number} onChange={set("matric_number")} placeholder="22/47CS/2248" />

        <label>Password</label>
        <PasswordInput
          value={form.password}
          onChange={set("password")}
          placeholder="at least 6 characters"
        />

        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? "Creating…" : "Sign up"}
        </button>

        <div className="auth-toggle">
          Already have an account? <a onClick={() => onSwitch("login")} style={{ cursor: "pointer" }}>Sign in</a>
        </div>
      </div>
    </div>
  );
}
