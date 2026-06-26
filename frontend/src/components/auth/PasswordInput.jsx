import { useState } from "react";

// Password field with a show/hide toggle.
// Usage: <PasswordInput value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" onKeyDown={...} />
export default function PasswordInput({ value, onChange, placeholder = "••••••••", onKeyDown, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
