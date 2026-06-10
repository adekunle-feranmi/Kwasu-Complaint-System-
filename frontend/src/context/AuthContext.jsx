import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, setToken, getStoredToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const handleAuth = useCallback((data) => {
    setToken(data.token);            // saves to localStorage
    setUser(data.user);
  }, []);

  // On first load, if we have a saved token, restore the session.
  useEffect(() => {
    const token = getStoredToken();
    if (!token) { setReady(true); return; }
    setToken(token);
    api.me()
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))   // bad/expired token -> clear it
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (identifier, password) => {
    const data = await api.login({ identifier, password });
    handleAuth(data);
    return data.user;
  }, [handleAuth]);

  const loginAdmin = useCallback(async (payload) => {
    const data = await api.loginAdmin(payload);
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
    <AuthContext.Provider value={{ user, ready, login, loginAdmin, registerStudent, registerAdmin, refresh, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
