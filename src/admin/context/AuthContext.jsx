import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(null);
  const [adminRole, setAdminRole] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("ADMIN_TOKEN") || "";
    const r = localStorage.getItem("ADMIN_ROLE") || "";
    setAdminToken(t || null);
    setAdminRole(r || null);
    setAuthReady(true);
  }, []);

  const value = useMemo(
    () => ({
      adminToken,
      adminRole,
      authReady,
      login: (t, role) => {
        localStorage.setItem("ADMIN_TOKEN", t);
        if (role) localStorage.setItem("ADMIN_ROLE", role);
        setAdminToken(t);
        setAdminRole(role || null);
      },
      logout: () => {
        localStorage.removeItem("ADMIN_TOKEN");
        localStorage.removeItem("ADMIN_ROLE");
        setAdminToken(null);
        setAdminRole(null);
      },
    }),
    [adminToken, adminRole, authReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
