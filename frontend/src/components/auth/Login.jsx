import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { LogoCrest } from "../common/UI";
import PasswordInput from "./PasswordInput";

export default function Login({ onSwitch }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      await login(identifier.trim(), password);
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
        <h1>Welcome back</h1>
        <p className="sub">KWASU Complaint Management System</p>

        {err && <div className="alert error">{err}</div>}

        <label>Email or Matric Number</label>
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@email.com  or  22/47CS/2248"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <label>Password</label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="auth-toggle">
          New student? <a onClick={() => onSwitch("register")} style={{ cursor: "pointer" }}>Create an account</a>
          <br />
          <a onClick={() => onSwitch("admin")} style={{ cursor: "pointer", fontSize: 13 }}>Admin sign in</a>
        </div>
      </div>
    </div>
  );
}
