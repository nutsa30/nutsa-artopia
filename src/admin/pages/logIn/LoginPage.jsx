import React, { useState } from "react";
import styles from "./loginPage.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/IMG_4970.JPG";

/* ---------------- ENV (no import.meta / no process.env at runtime) ---------------- */
const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";
const ADMIN_TOKEN = "ARTOPIA_SUPERADMIN_2024"; // <-- იხილე NOTE ქვემოთ

function buildHeaders(extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  if (ADMIN_TOKEN) h["X-Admin-Token"] = ADMIN_TOKEN;
  return h;
}

function pickToken(data) {
  return (
    data?.token ||
    data?.admin_token ||
    data?.access_token ||
    data?.jwt ||
    data?.data?.token ||
    data?.result?.token ||
    ""
  );
}
function parseBearer(headerVal) {
  if (!headerVal) return "";
  const parts = String(headerVal).split(" ");
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  return headerVal;
}

/* ---------------- Debug helpers ---------------- */
function headersToObject(h) {
  const out = {};
  try {
    h?.forEach?.((v, k) => (out[k] = v));
  } catch {}
  return out;
}

/* ---------------- COMPONENT ---------------- */
const LoginPage = () => {
  const navigate = useNavigate();
  // const location = useLocation();

  // const dbgEnabledInit =
  //   new URLSearchParams(location.search).get("debug") === "1" ||
  //   (typeof localStorage !== "undefined" &&
  //     localStorage.getItem("DEBUG_LOGIN") === "1");

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // const [dbg, setDbg] = useState({
  //   enabled: dbgEnabledInit,
  //   env: { API_BASE, ADMIN_TOKEN_present: !!ADMIN_TOKEN },
  //   req: null,
  //   res: null,
  //   token: "",
  //   sessionOk: null,
  //   err: null,
  // });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const verifySession = async () => {
    try {
      const stored = localStorage.getItem("ADMIN_TOKEN") || "";
      const meRes = await fetch(`${API_BASE}/auth/me`, {
  method: "GET",
  headers: stored ? { Authorization: `Bearer ${stored}` } : {},
  credentials: "omit",              // ✅ ქუქი არ გვჭირდება
});

      return meRes.ok;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const req = {
      url: `${API_BASE}/auth/admin-login`,
      method: "POST",
      headers: buildHeaders(),
      body: {
        email: form.username.trim().toLowerCase(),
        password: form.password,
      },
    };
    // if (dbg.enabled) setDbg((d) => ({ ...d, req, res: null, token: "", err: null }));

    try {
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(req.body),
      });

      let resText = "";
      let resJson = null;
      try {
        resText = await res.clone().text();
      } catch {}
      try {
        resJson = JSON.parse(resText);
      } catch {
        try {
          resJson = await res.clone().json();
        } catch {}
      }

      // token from body or headers
      let token = pickToken(resJson);
      if (!token) {
        const hdr =
          res.headers.get("Authorization") ||
          res.headers.get("authorization") ||
          res.headers.get("X-Auth-Token") ||
          res.headers.get("x-auth-token");
        token = parseBearer(hdr);
      }

      // if (dbg.enabled) {
      //   setDbg((d) => ({
      //     ...d,
      //     res: {
      //       ok: res.ok,
      //       status: res.status,
      //       headers: headersToObject(res.headers),
      //       raw: resText,
      //       json: resJson,
      //     },
      //     token,
      //   }));
      // }

      if (token) {
        localStorage.setItem("ADMIN_TOKEN", token);
        localStorage.setItem("AUTH_MODE", "token");
        navigate("/menu");
        return;
      }

      const sessionOk = await verifySession();
      if (dbg.enabled) setDbg((d) => ({ ...d, sessionOk }));

      if (sessionOk) {
        localStorage.removeItem("ADMIN_TOKEN");
        localStorage.setItem("AUTH_MODE", "session");
        navigate("/menu");
        return;
      }

      throw new Error(
        resJson?.message ||
          "Auth token არ დაბრუნდა და სესია არ დადასტურდა. შეამოწმე ბექენდის პასუხი."
      );
    } catch (err) {
      console.error("Login error:", err);
      if (dbg.enabled) setDbg((d) => ({ ...d, err: String(err) }));
      setError("შეიყვანეთ სწორი მონაცემები ან სცადეთ მოგვიანებით");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <img className={styles.logo} src={logo} alt="" />
      <h2>Manager Portal</h2>

      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Email"
          className={styles.input}
          required
        />
        <div className={styles.passwordWrapper}>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            className={styles.input}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className={styles.togglePassword}
          >
            {showPassword ? "🙈" : "👀"}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="submit" className={styles.logInButton} disabled={loading}>
            {loading ? "⏳..." : "🔐 Log in"}
          </button>
          {/* Debug toggle */}
          {/* <button
            type="button"
            onClick={() => {
              const next = !dbg.enabled;
              setDbg((d) => ({ ...d, enabled: next }));
              try {
                if (next) localStorage.setItem("DEBUG_LOGIN", "1");
                else localStorage.removeItem("DEBUG_LOGIN");
              } catch {}
            }}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: dbg.enabled ? "#ffe8a3" : "#f3f3f3",
            }}
          >
            {dbg.enabled ? "🟡 Debug ON" : "⚪ Debug OFF"}
          </button> */}
        </div>
      </form>

      {/* Debug panel */}
      {/* {dbg.enabled && (
        <div
          style={{
            marginTop: 14,
            width: "100%",
            maxWidth: 900,
            background: "#0b1220",
            color: "#cfe3ff",
            borderRadius: 10,
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            overflow: "auto",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <strong>DEBUG • Login flow</strong>
          </div>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
{`env: ${JSON.stringify(dbg.env, null, 2)}
request: ${JSON.stringify(dbg.req, null, 2)}
response: ${JSON.stringify(dbg.res, null, 2)}
extracted_token: ${dbg.token || "(none)"}
sessionOk_after_fail: ${String(dbg.sessionOk)}
error: ${dbg.err || "(none)"}`}
          </pre>
        </div>
      )} */}
    </div>
  );
};

export default LoginPage;
