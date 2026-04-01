import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
const t =
  localStorage.getItem("ADMIN_TOKEN") || // ✅ ეს დატოვე
  "";
    setAdminToken(t || null);
    setAuthReady(true);
  }, []);

  const value = useMemo(
    () => ({
      adminToken,
      authReady,
login: (t) => {
  localStorage.setItem("ADMIN_TOKEN", t); // ✅ ერთიანი
  setAdminToken(t);
},

logout: () => {
  localStorage.removeItem("ADMIN_TOKEN"); // ✅ ერთიანი
  setAdminToken(null);
},
    }),
    [adminToken, authReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
