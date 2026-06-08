import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import AdminRegister from "./components/auth/AdminRegister";
import Dashboard from "./components/student/Dashboard";
import AdminDashboard from "./components/admin/AdminDashboard";

function Shell() {
  const { user } = useAuth();
  const [screen, setScreen] = useState("login");

  if (!user) {
    if (screen === "register") return <Register onSwitch={setScreen} />;
    if (screen === "admin") return <AdminRegister onSwitch={setScreen} />;
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
