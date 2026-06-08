import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const getStored = (key) =>
  localStorage.getItem(key) || sessionStorage.getItem(key) || "";

export default function SupportRoute({ children }) {
  const location = useLocation();
  const [checked, setChecked] = React.useState(false);
  const [status, setStatus] = React.useState("checking");

  React.useEffect(() => {
    const token = getStored("ADMIN_TOKEN");
    const role = getStored("ADMIN_ROLE");

    if (!token) {
      setStatus("no-token");
    } else if (role !== "support") {
      setStatus("admin");
    } else {
      setStatus("allowed");
    }
    setChecked(true);
  }, [location.pathname]);

  if (!checked) return null;
  if (status === "no-token") return <Navigate to="/admin/login" replace />;
  if (status === "admin") return <Navigate to="/admin/menu" replace />;
  return children;
}
