import { createContext, useContext, useEffect, useMemo, useState } from "react";

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
  }, []);

  const value = useMemo(
    () => ({
      adminToken,
      adminRole,
      authReady,
      login: (t, role, remember = true) => {
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem("ADMIN_TOKEN", t);
        if (role) storage.setItem("ADMIN_ROLE", role);
        setAdminToken(t);
        setAdminRole(role || null);
      },
      logout: () => {
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
