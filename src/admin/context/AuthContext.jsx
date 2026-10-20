import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { storeStaffSession, refreshStaffSession, endStaffSession } from "../../utils/staffSession";

const AuthContext = createContext(null);

const getStored = (key) =>
  localStorage.getItem(key) || sessionStorage.getItem(key) || "";

const clearStored = (key) => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
};

export const AuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(null);
  const [adminRole, setAdminRole] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const t = getStored("ADMIN_TOKEN");
    const r = getStored("ADMIN_ROLE");
    setAdminToken(t || null);
    setAdminRole(r || null);
    setAuthReady(true);
    const refresh = async () => { const token = await refreshStaffSession(); if (token) setAdminToken(token); };
    const timer = setInterval(refresh, 5 * 60 * 1000);
    window.addEventListener("focus", refresh);
    refresh();
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);

  const value = useMemo(
    () => ({
      adminToken,
      adminRole,
      authReady,
      login: (t, role, remember = false) => {
        storeStaffSession(t, role, remember);
        setAdminToken(t);
        setAdminRole(role || null);
      },
      logout: () => {
        endStaffSession().catch(() => {});
        clearStored("ADMIN_TOKEN");
        clearStored("ADMIN_ROLE");
        setAdminToken(null);
        setAdminRole(null);
      },
    }),
    [adminToken, adminRole, authReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
