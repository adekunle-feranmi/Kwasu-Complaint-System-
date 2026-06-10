import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import AdminAuth from "./components/auth/AdminAuth";
import Dashboard from "./components/student/Dashboard";
import AdminDashboard from "./components/admin/AdminDashboard";

function Shell() {
  const { user, ready } = useAuth();
  const [screen, setScreen] = useState("login");

  // Wait until we've checked for a saved session, so a refresh doesn't
  // flash the login screen before restoring the user.
  if (!ready) {
    return <div className="auth-wrap"><div style={{ color: "#fff" }}>Loading…</div></div>;
  }

  if (!user) {
    if (screen === "register") return <Register onSwitch={setScreen} />;
    if (screen === "admin") return <AdminAuth onSwitch={setScreen} />;
    return <Login onSwitch={setScreen} />;
  }

  return user.role === "admin" ? <AdminDashboard /> : <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
