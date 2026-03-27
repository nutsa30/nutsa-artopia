// src/pages/promoCodes/PromoCodes.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

/* ------------ Auth helpers ------------- */
// JWT (LoginPage ამატებს localStorage.ADMIN_TOKEN-ს)
const getJwt = () =>
  localStorage.getItem("ADMIN_TOKEN") || // ✅ ჩვენი JWT
  localStorage.getItem("ACCESS_TOKEN") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("jwt") ||
  localStorage.getItem("token") ||
  "";

// Admin secret (გადაეცემა .env.local-იდან, უნდა დაემთხვეს Heroku ADMIN_TOKEN-ს)
const getAdminSecret = () =>
  (import.meta?.env?.VITE_ADMIN_TOKEN ?? "").trim();

// ვაგენერირებთ ჰედერებს ყოველთვის ფრეშად
const buildHeaders = () => {
const h = { "Content-Type": "application/json" };
  h["X-Admin-Token"] = "ARTOPIA_SUPERADMIN_2024";
  // return h;
  const jwt = getJwt();
  if (jwt) h.Authorization = `Bearer ${jwt}`;

  const adminSecret = getAdminSecret();
  if (adminSecret) h["X-Admin-Token"] = adminSecret;

  return h;
  
};
/* --------------------------------------- */

export default function PromoCodes() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // create form
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("");

  // inline edit state: { [id]: {code, percent, is_active} }
  const [editing, setEditing] = useState({});

  const sorted = useMemo(
    () => [...list].sort((a, b) => Number(b.id) - Number(a.id)),
    [list]
  );

  const fetchCoupons = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/admin/coupons?per_page=100`, {
        method: "GET",
        headers: buildHeaders(),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "ვერ მივიღეთ კუპონები");
      setList(data.items || []);
    } catch (e) {
      setErr(e.message || "შეცდომა შეკითხვისას");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    const c = String(code || "").trim().toUpperCase();
    const p = Number.parseInt(percent, 10);

    if (!c || !/^[A-Z0-9-_]+$/.test(c)) {
      setErr("პრომოკოდი უნდა იყოს A-Z, 0-9, '-', '_'");
      return;
    }
    if (!Number.isInteger(p) || p < 1 || p > 100) {
      setErr("ფასდაკლება უნდა იყოს 1-100 მთელი რიცხვი");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/coupons`, {
        method: "POST",
        headers: buildHeaders(),
        credentials: "include",
        body: JSON.stringify({
          code: c,
          percent: p,
          min_subtotal: 0,
          is_active: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) throw new Error("ასეთი პრომოკოდი უკვე არსებობს");
        throw new Error(data?.message || "ვერ შევქმენით პრომოკოდი");
      }
      setMsg(`დაემატა: ${data.code} (${data.percent}%)`);
      setCode("");
      setPercent("");
      fetchCoupons();
    } catch (e) {
      setErr(e.message || "შეცდომა შექმნისას");
    }
  };

  const startEdit = (row) => {
    setEditing((prev) => ({
      ...prev,
      [row.id]: {
        code: row.code,
        percent: row.percent,
        is_active: row.is_active,
      },
    }));
    setMsg("");
    setErr("");
  };

  const cancelEdit = (id) => {
    setEditing((prev) => {
      const p = { ...prev };
      delete p[id];
      return p;
    });
  };

  const saveEdit = async (id) => {
    const draft = editing[id];
    if (!draft) return;

    const c = String(draft.code || "").trim().toUpperCase();
    const p = Number.parseInt(draft.percent, 10);

    if (!c || !/^[A-Z0-9-_]+$/.test(c)) {
      setErr("პრომოკოდი უნდა იყოს A-Z, 0-9, '-', '_'");
      return;
    }
    if (!Number.isInteger(p) || p < 1 || p > 100) {
      setErr("ფასდაკლება უნდა იყოს 1-100 მთელი რიცხვი");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/coupons/${id}`, {
        method: "PATCH",
        headers: buildHeaders(),
        credentials: "include",
        body: JSON.stringify({
          code: c,
          percent: p,
          is_active: !!draft.is_active,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`ვერ შევინახეთ (${res.status}) ${t}`);
      }
      setMsg("ცვლილება შენახულია");
      cancelEdit(id);
      fetchCoupons();
    } catch (e) {
      setErr(e.message || "შეცდომა რედაქტირებისას");
    }
  };

  const remove = async (id) => {
    const ok =
      typeof window !== "undefined" &&
      window.confirm("წავშალოთ ეს პრომოკოდი?");
    if (!ok) return;

    setMsg("");
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/admin/coupons/${id}`, {
        method: "DELETE",
        headers: buildHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`ვერ წავშალეთ (${res.status}) ${t}`);
      }
      setMsg("წაიშალა");
      setList((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setErr(e.message || "შეცდომა წაშლისას");
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h2>🎟️ Promo Codes</h2>

      {msg && (
        <div
          style={{
            color: "#155724",
            background: "#d4edda",
            padding: 8,
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          {msg}
        </div>
      )}
      {err && (
        <div
          style={{
            color: "#721c24",
            background: "#f8d7da",
            padding: 8,
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          {err}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 140px 120px",
          gap: 8,
          alignItems: "center",
          margin: "12px 0 20px",
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="პრომოკოდი (მაგ. WELCOME10)"
          required
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />
        <input
          type="number"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          placeholder="% (1-100)"
          min={1}
          max={100}
          required
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #2e6af7",
            background: "#2e6af7",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          დამატება
        </button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f8fb" }}>
              <th style={th}>ID</th>
              <th style={th}>კოდი</th>
              <th style={th}>ფასდაკლება %</th>
              <th style={th}>აქტიური</th>
              <th style={th}>გამოყენებულია</th>
              <th style={th}>შექმნის თარიღი</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 16 }}>
                  იტვირთება…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 16 }}>
                  ჩანაწერები არ არის
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const ed = editing[row.id];
                return (
                  <tr key={row.id}>
                    <td style={td}>{row.id}</td>

                    <td style={td}>
                      {ed ? (
                        <input
                          value={ed.code}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...prev[row.id],
                                code: e.target.value.toUpperCase(),
                              },
                            }))
                          }
                          style={inputMini}
                        />
                      ) : (
                        row.code
                      )}
                    </td>

                    <td style={td}>
                      {ed ? (
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={ed.percent}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...prev[row.id],
                                percent: e.target.value,
                              },
                            }))
                          }
                          style={inputMini}
                        />
                      ) : (
                        `${row.percent}%`
                      )}
                    </td>

                    <td style={td}>
                      {ed ? (
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!ed.is_active}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...prev[row.id],
                                  is_active: e.target.checked,
                                },
                              }))
                            }
                          />
                          აქტიური
                        </label>
                      ) : row.is_active ? (
                        "დიახ"
                      ) : (
                        "არა"
                      )}
                    </td>

                    <td style={td}>
                      {row.usage_count ?? 0}
                      {row.usage_limit != null ? ` / ${row.usage_limit}` : ""}
                    </td>

                    <td style={td}>{row.created_at}</td>

                    <td style={td}>
                      {ed ? (
                        <>
                          <button
                            style={btnPrimary}
                            onClick={() => saveEdit(row.id)}
                          >
                            შენახვა
                          </button>
                          <button
                            style={btnGhost}
                            onClick={() => cancelEdit(row.id)}
                          >
                            გაუქმება
                          </button>
                        </>
                      ) : (
                        <>
                          
                          <button
                            style={btnDanger}
                            onClick={() => remove(row.id)}
                          >
                            წაშლა
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #eee",
  fontWeight: 600,
};
const td = {
  padding: "10px",
  borderBottom: "1px solid #f0f0f0",
  verticalAlign: "top",
};
const inputMini = {
  padding: "8px 10px",
  border: "1px solid #ddd",
  borderRadius: 8,
  width: 160,
};

const btnGhost = {
  marginRight: 8,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
};
const btnPrimary = {
  marginRight: 8,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #2e6af7",
  background: "#2e6af7",
  color: "#fff",
  cursor: "pointer",
};
const btnDanger = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #e55353",
  background: "#ffe8e8",
  color: "#c53030",
  cursor: "pointer",
};
