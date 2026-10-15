import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, session, setUnauthorizedHandler } from "./api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => session.get()?.user ?? null);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  const logout = useCallback(() => {
    session.clear();
    setUser(null);
    navigate("/", { replace: true });
  }, [navigate]);

  // A 401 on any call (expired token) sends the person back to the login screen with the reason.
  useEffect(() => {
    setUnauthorizedHandler((message) => {
      setNotice(message);
      logout();
    });
  }, [logout]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    session.set(data);
    setNotice("");
    setUser(data.user);
  };

  return <AuthContext.Provider value={{ user, login, logout, notice }}>{children}</AuthContext.Provider>;
}
