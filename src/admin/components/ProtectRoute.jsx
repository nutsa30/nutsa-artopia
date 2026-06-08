import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const getStored = (key) =>
  localStorage.getItem(key) || sessionStorage.getItem(key) || "";

export default function ProtectRoute({ children }) {
  const location = useLocation();
  const [checked, setChecked] = React.useState(false);
  const [status, setStatus] = React.useState("checking");

  React.useEffect(() => {
    const token = getStored("ADMIN_TOKEN");
    const role = getStored("ADMIN_ROLE");

    if (!token) {
      localStorage.removeItem("isLoggedIn");
      setStatus("no-token");
    } else if (role === "support") {
      setStatus("support");
    } else {
      localStorage.setItem("isLoggedIn", "true");
      setStatus("allowed");
    }
    setChecked(true);
  }, [location.pathname]);

  React.useEffect(() => {
    if (status === "allowed" && location.pathname.startsWith("/admin")) {
      localStorage.setItem("admin:lastPath", location.pathname + location.search);
    }
  }, [status, location.pathname, location.search]);

  if (!checked) return null;
  if (status === "no-token") return <Navigate to="/admin/login" replace />;
  if (status === "support") return <Navigate to="/admin/support-panel" replace />;
  return children;
}
