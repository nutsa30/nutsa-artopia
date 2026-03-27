// src/components/ProtectRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const API_BASE =
  (import.meta?.env?.VITE_API_BASE || "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

export default function ProtectRoute({ children }) {
  const location = useLocation();
  const [checked, setChecked] = React.useState(false);
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const mode = localStorage.getItem("AUTH_MODE"); // "token" | "session"
      const token =
        localStorage.getItem("ADMIN_TOKEN") ||
        localStorage.getItem("admin_token") ||
        "";

      if (!token && mode !== "session") {
        if (!cancelled) {
          localStorage.removeItem("isLoggedIn");
          setAllowed(false);
          setChecked(true);
        }
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          credentials: "omit",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (cancelled) return;

        if (res.ok) {
          localStorage.setItem("isLoggedIn", "true");
          setAllowed(true);
        } else {
          localStorage.clear();
          setAllowed(false);
        }
      } catch {
        localStorage.clear();
        setAllowed(false);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // 👉 როცა admin-ში დავდივართ, ბოლო ბილიკი შევინახოთ
  React.useEffect(() => {
    if (allowed && location.pathname.startsWith("/admin")) {
      localStorage.setItem(
        "admin:lastPath",
        location.pathname + location.search
      );
    }
  }, [allowed, location.pathname, location.search]);

  // სანამ ვერ გავიგეთ ავტორიზებული ხარ თუ არა — არაფერი არ დავარენდეროთ (აირიდებს public ფლეშს)
  if (!checked) return null;

// სწორი შენს როუტინგთან
if (!allowed) return <Navigate to="/" replace state={{ from: location }} />;


  return children;
}
