import { createContext, useContext, useState, useCallback } from "react";
import { api, setToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(true);

  const handleAuth = useCallback((data) => {
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback(async (identifier, password) => {
    const data = await api.login({ identifier, password });
    handleAuth(data);
    return data.user;
  }, [handleAuth]);

  const registerStudent = useCallback(async (payload) => {
    const data = await api.registerStudent(payload);
    handleAuth(data);
    return data.user;
  }, [handleAuth]);

  const registerAdmin = useCallback(async (payload) => {
    const data = await api.registerAdmin(payload);
    handleAuth(data);
    return data.user;
  }, [handleAuth]);

  const refresh = useCallback(async () => {
    const data = await api.me();
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, registerStudent, registerAdmin, refresh, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
