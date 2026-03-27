import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const t =
      localStorage.getItem("admin_token") ||
      localStorage.getItem("token") ||
      "";
    setAdminToken(t || null);
    setAuthReady(true);
  }, []);

  const value = useMemo(
    () => ({
      adminToken,
      authReady,
      login: (t) => {
        localStorage.setItem("admin_token", t);
        setAdminToken(t);
        setAuthReady(true);
      },
      logout: () => {
        localStorage.removeItem("admin_token");
        setAdminToken(null);
        setAuthReady(true);
      },
    }),
    [adminToken, authReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
