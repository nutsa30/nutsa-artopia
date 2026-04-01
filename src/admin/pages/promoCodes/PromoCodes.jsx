import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

/* ---------------- auth ---------------- */
const getAdminSecret = () =>
  (import.meta?.env?.VITE_ADMIN_TOKEN ?? "").trim();

const buildHeaders = () => {
  const adminSecret = getAdminSecret();
  const headers = {
    "Content-Type": "application/json",
  };

  if (adminSecret) {
    headers["X-Admin-Token"] = adminSecret;
  }

  return headers;
};

/* ---------------- helpers ---------------- */
const normalizeCoupon = (row = {}) => ({
  id: row.id,
  code: String(row.code || "").toUpperCase(),
  percent: Number(row.percent ?? 0),
  is_active: !!row.is_active,
  starts_at: row.starts_at || null,
  ends_at: row.ends_at || null,
  min_subtotal: Number(row.min_subtotal ?? 0),
  usage_limit:
    row.usage_limit === null || row.usage_limit === undefined
      ? null
      : Number(row.usage_limit),
  usage_count: Number(row.usage_count ?? 0),
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

const fmtDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ka-GE", { timeZone: "Asia/Tbilisi" });
};

export default function PromoCodes() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [editing, setEditing] = useState({});

  const sorted = useMemo(
    () => [...list].sort((a, b) => Number(b.id) - Number(a.id)),
    [list]
  );

  const fetchCoupons = async () => {
    setLoading(true);
    setErr("");

    try {
      const adminSecret = getAdminSecret();
      if (!adminSecret) {
        throw new Error("VITE_ADMIN_TOKEN არ არის გაწერილი");
      }

      const res = await fetch(`${API_BASE}/admin/coupons?per_page=100`, {
        method: "GET",
        headers: buildHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "კუპონების წამოღება ვერ მოხერხდა");
      }

      setList(Array.isArray(data.items) ? data.items.map(normalizeCoupon) : []);
    } catch (e) {
      setErr(e.message || "შეცდომა კუპონების წამოღებისას");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const resetCreateForm = () => {
    setCode("");
    setPercent("");
    setMinSubtotal("");
    setUsageLimit("");
    setIsActive(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    const finalCode = String(code || "").trim().toUpperCase();
    const finalPercent = Number.parseInt(percent, 10);
    const finalMinSubtotal =
      minSubtotal === "" ? 0 : Number.parseFloat(minSubtotal);
    const finalUsageLimit =
      usageLimit === "" ? null : Number.parseInt(usageLimit, 10);

    if (!finalCode || !/^[A-Z0-9_-]+$/.test(finalCode)) {
      setErr("პრომოკოდი უნდა შეიცავდეს მხოლოდ A-Z, 0-9, - ან _");
      return;
    }

    if (!Number.isInteger(finalPercent) || finalPercent < 1 || finalPercent > 100) {
      setErr("ფასდაკლება უნდა იყოს 1-100 მთელი რიცხვი");
      return;
    }

    if (!Number.isFinite(finalMinSubtotal) || finalMinSubtotal < 0) {
      setErr("მინიმალური თანხა უნდა იყოს 0 ან მეტი");
      return;
    }

    if (
      finalUsageLimit !== null &&
      (!Number.isInteger(finalUsageLimit) || finalUsageLimit < 1)
    ) {
      setErr("გამოყენების ლიმიტი უნდა იყოს ცარიელი ან 1-ზე მეტი მთელი რიცხვი");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/coupons`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({
          code: finalCode,
          percent: finalPercent,
          min_subtotal: finalMinSubtotal,
          usage_limit: finalUsageLimit,
          is_active: isActive,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("ასეთი პრომოკოდი უკვე არსებობს");
        }
        throw new Error(data?.message || "პრომოკოდის შექმნა ვერ მოხერხდა");
      }

      setMsg(`დაემატა: ${data.code} (${data.percent}%)`);
      resetCreateForm();
      await fetchCoupons();
    } catch (e) {
      setErr(e.message || "შეცდომა შექმნისას");
    }
  };

  const startEdit = (row) => {
    setMsg("");
    setErr("");
    setEditing((prev) => ({
      ...prev,
      [row.id]: {
        code: row.code,
        percent: String(row.percent),
        min_subtotal: String(row.min_subtotal ?? 0),
        usage_limit:
          row.usage_limit === null || row.usage_limit === undefined
            ? ""
            : String(row.usage_limit),
        is_active: !!row.is_active,
      },
    }));
  };

  const cancelEdit = (id) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveEdit = async (id) => {
    const draft = editing[id];
    if (!draft) return;

    setMsg("");
    setErr("");

    const finalCode = String(draft.code || "").trim().toUpperCase();
    const finalPercent = Number.parseInt(draft.percent, 10);
    const finalMinSubtotal =
      draft.min_subtotal === "" ? 0 : Number.parseFloat(draft.min_subtotal);
    const finalUsageLimit =
      draft.usage_limit === "" ? null : Number.parseInt(draft.usage_limit, 10);

    if (!finalCode || !/^[A-Z0-9_-]+$/.test(finalCode)) {
      setErr("პრომოკოდი უნდა შეიცავდეს მხოლოდ A-Z, 0-9, - ან _");
      return;
    }

    if (!Number.isInteger(finalPercent) || finalPercent < 1 || finalPercent > 100) {
      setErr("ფასდაკლება უნდა იყოს 1-100 მთელი რიცხვი");
      return;
    }

    if (!Number.isFinite(finalMinSubtotal) || finalMinSubtotal < 0) {
      setErr("მინიმალური თანხა უნდა იყოს 0 ან მეტი");
      return;
    }

    if (
      finalUsageLimit !== null &&
      (!Number.isInteger(finalUsageLimit) || finalUsageLimit < 1)
    ) {
      setErr("გამოყენების ლიმიტი უნდა იყოს ცარიელი ან 1-ზე მეტი მთელი რიცხვი");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/coupons/${id}`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify({
          code: finalCode,
          percent: finalPercent,
          min_subtotal: finalMinSubtotal,
          usage_limit: finalUsageLimit,
          is_active: !!draft.is_active,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("ასეთი პრომოკოდი უკვე არსებობს");
        }
        throw new Error(data?.message || "რედაქტირება ვერ მოხერხდა");
      }

      setMsg("ცვლილება შენახულია");
      cancelEdit(id);
      await fetchCoupons();
    } catch (e) {
      setErr(e.message || "შეცდომა რედაქტირებისას");
    }
  };

  const remove = async (id) => {
    const ok = window.confirm("წავშალოთ ეს პრომოკოდი?");
    if (!ok) return;

    setMsg("");
    setErr("");

    try {
      const res = await fetch(`${API_BASE}/admin/coupons/${id}`, {
        method: "DELETE",
        headers: buildHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "წაშლა ვერ მოხერხდა");
      }

      setMsg("წაიშალა");
      setList((prev) => prev.filter((x) => x.id !== id));
      cancelEdit(id);
    } catch (e) {
      setErr(e.message || "შეცდომა წაშლისას");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <h2>🎟️ პრომოკოდები</h2>

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
          gridTemplateColumns: "1.3fr 120px 140px 140px 140px auto",
          gap: 8,
          alignItems: "center",
          margin: "12px 0 20px",
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="პრომოკოდი"
          required
          style={inputBase}
        />

        <input
          type="number"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          placeholder="%"
          min={1}
          max={100}
          required
          style={inputBase}
        />

        <input
          type="number"
          value={minSubtotal}
          onChange={(e) => setMinSubtotal(e.target.value)}
          placeholder="მინ. თანხა"
          min={0}
          step="0.01"
          style={inputBase}
        />

        <input
          type="number"
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value)}
          placeholder="ლიმიტი"
          min={1}
          style={inputBase}
        />

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
          }}
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          აქტიური
        </label>

        <button type="submit" style={btnPrimary}>
          დამატება
        </button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f8fb" }}>
              <th style={th}>ID</th>
              <th style={th}>კოდი</th>
              <th style={th}>%</th>
              <th style={th}>აქტიური</th>
              <th style={th}>მინ. თანხა</th>
              <th style={th}>გამოყენება</th>
              <th style={th}>შექმნილია</th>
              <th style={th}></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 16 }}>
                  იტვირთება…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 16 }}>
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
                      {ed ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={ed.min_subtotal}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...prev[row.id],
                                min_subtotal: e.target.value,
                              },
                            }))
                          }
                          style={inputMini}
                        />
                      ) : (
                        row.min_subtotal ?? 0
                      )}
                    </td>

                    <td style={td}>
                      {ed ? (
                        <input
                          type="number"
                          min={1}
                          value={ed.usage_limit}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...prev[row.id],
                                usage_limit: e.target.value,
                              },
                            }))
                          }
                          placeholder="უსასრულო"
                          style={inputMini}
                        />
                      ) : (
                        <>
                          {row.usage_count ?? 0}
                          {row.usage_limit != null ? ` / ${row.usage_limit}` : ""}
                        </>
                      )}
                    </td>

                    <td style={td}>{fmtDate(row.created_at)}</td>

                    <td style={td}>
                      {ed ? (
                        <>
                          <button
                            type="button"
                            style={btnPrimary}
                            onClick={() => saveEdit(row.id)}
                          >
                            შენახვა
                          </button>
                          <button
                            type="button"
                            style={btnGhost}
                            onClick={() => cancelEdit(row.id)}
                          >
                            გაუქმება
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            style={btnGhost}
                            onClick={() => startEdit(row)}
                          >
                            რედაქტირება
                          </button>
                          <button
                            type="button"
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

const inputBase = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
};

const inputMini = {
  padding: "8px 10px",
  border: "1px solid #ddd",
  borderRadius: 8,
  width: 120,
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