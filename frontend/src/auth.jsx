import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, session, setUnauthorizedHandler } from "./api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => session.get()?.user ?? null);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  const clearSession = useCallback(() => {
    session.clear();
    setUser(null);
    navigate("/", { replace: true });
  }, [navigate]);

  const logout = useCallback(() => {
    // Capture/send the credential before clearing it. Always hide private UI
    // immediately, even when the network cannot confirm server revocation.
    const revoke = session.get()?.access_token ? api.logout() : Promise.resolve();
    clearSession();
    setNotice("");
    void revoke.catch(() => {
      if (!session.get()) setNotice("Signed out of this browser. The server could not confirm session revocation; check your connection before signing in again.");
    });
  }, [clearSession]);

  useEffect(() => {
    setUnauthorizedHandler((message) => { setNotice(message); clearSession(); });
    const restore = () => { if (!session.get()?.access_token) clearSession(); };
    window.addEventListener("pageshow", restore);
    return () => {
      setUnauthorizedHandler(() => {});
      window.removeEventListener("pageshow", restore);
    };
  }, [clearSession]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    session.set(data);
    setNotice("");
    setUser(data.user);
  };

  return <AuthContext.Provider value={{ user, login, logout, notice }}>{children}</AuthContext.Provider>;
}
