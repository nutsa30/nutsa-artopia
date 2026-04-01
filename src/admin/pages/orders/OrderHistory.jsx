import React, { useEffect, useMemo, useState } from "react";
import styles from "./OrderHistory.module.css";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

const getJwt = () =>
  localStorage.getItem("ADMIN_TOKEN") ||
  localStorage.getItem("ACCESS_TOKEN") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("jwt") ||
  localStorage.getItem("token") ||
  "";

const buildHeaders = () => {
  const jwt = getJwt();
  return jwt ? { Authorization: `Bearer ${jwt}` } : {};
};

const toAbsolute = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const path = String(u).startsWith("/") ? u : `/${u}`;
  return `${API_BASE}${path}`;
};

const pickItemImage = (it = {}) => {
  const direct =
    it.image_url || it.image || it.photo || it.thumbnail || it.thumb || it.cover;
  if (direct) return toAbsolute(direct);

  for (let i = 1; i <= 6; i += 1) {
    const v = it[`image_url${i}`] || it[`image${i}`] || it[`img${i}`];
    if (v) return toAbsolute(v);
  }

  if (Array.isArray(it.images) && it.images.length) {
    const first =
      typeof it.images[0] === "string" ? it.images[0] : it.images[0]?.url;
    if (first) return toAbsolute(first);
  }

  if (typeof it.images === "string") {
    try {
      const j = JSON.parse(it.images);
      if (Array.isArray(j) && j.length) {
        const first = typeof j[0] === "string" ? j[0] : j[0]?.url;
        if (first) return toAbsolute(first);
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const p = it.product || {};
  const pDir =
    p.image_url || p.image || p.photo || p.thumbnail || p.thumb || p.cover;
  if (pDir) return toAbsolute(pDir);

  for (let i = 1; i <= 6; i += 1) {
    const v = p[`image_url${i}`] || p[`image${i}`] || p[`img${i}`];
    if (v) return toAbsolute(v);
  }

  return "";
};

const parseISOasUTC = (s) => {
  if (!s) return null;
  const hasTZ = /[zZ]|[+\-]\d{2}:\d{2}$/.test(s);
  return new Date(hasTZ ? s : `${s}Z`);
};

const fmtDT = (v) => {
  const d = parseISOasUTC(v);
  return d ? d.toLocaleString("ka-GE", { timeZone: "Asia/Tbilisi" }) : "-";
};

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n} ₾` : "-";
};

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [details, setDetails] = useState({});
  const [loadingIds, setLoadingIds] = useState({});
  const [loading, setLoading] = useState(false);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("per_page", "50");
    if (fromDate) qs.set("from", `${fromDate}T00:00:00`);
    if (toDate) qs.set("to", `${toDate}T23:59:59`);
    return qs.toString();
  }, [fromDate, toDate]);

  const fetchOrders = async (customQueryString = queryString) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/admin/orders?${customQueryString}`, {
        method: "GET",
        headers: buildHeaders(),
      });

      const text = await res.text();
      let data = null;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("სერვერის პასუხი არასწორია");
      }

      if (!res.ok) {
        throw new Error(data?.message || "შეკვეთების წამოღება ვერ მოხერხდა");
      }

      setOrders(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setOrders([]);
      setError(err.message || "შეკვეთების წამოღება ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDetails = async (id) => {
    const nextExpanded = !expanded[id];
    setExpanded((prev) => ({ ...prev, [id]: nextExpanded }));

    if (!nextExpanded || details[id]) return;

    try {
      setLoadingIds((prev) => ({ ...prev, [id]: true }));

      const res = await fetch(`${API_BASE}/admin/orders/${id}`, {
        method: "GET",
        headers: buildHeaders(),
      });

      const text = await res.text();
      let data = null;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("დეტალის JSON არასწორია");
      }

      if (!res.ok) {
        throw new Error(data?.message || "დეტალის წამოღება ვერ მოხერხდა");
      }

      setDetails((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      console.error(err);
      setError(err.message || "დეტალის წამოღება ვერ მოხერხდა");
    } finally {
      setLoadingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const onFilterSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const onReset = () => {
    setFromDate("");
    setToDate("");
    fetchOrders("per_page=50");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📦 შეკვეთების ისტორია</h2>

      <form
        onSubmit={onFilterSubmit}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "end",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
            დან
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
            მდე
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <button className={styles.button} type="submit">
          ფილტრი
        </button>

        <button className={styles.button} type="button" onClick={onReset}>
          Reset
        </button>

        {loading && <span style={{ marginLeft: 8 }}>იტვირთება…</span>}
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {orders.length === 0 ? (
        <p>შეკვეთები ჯერ არ არის</p>
      ) : (
        <table
          border="1"
          cellPadding="10"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              <th>შეკვეთის ნომერი</th>
              <th>სტატუსი</th>
              <th>თარიღი</th>
              <th>კლიენტი</th>
              <th>ჯამური ღირებულება</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {orders.map((o) => {
              const dt = o.paid_at || o.created_at;

              return (
                <React.Fragment key={o.id}>
                  <tr>
                    <td>{o.order_number}</td>
                    <td>{o.status}</td>
                    <td>{fmtDT(dt)}</td>
                    <td>
                      {o.customer?.first_name} {o.customer?.last_name}
                    </td>
                    <td>{fmtMoney(o.total)}</td>
                    <td>
                      <button
                        onClick={() => toggleDetails(o.id)}
                        className={styles.button}
                        style={{ cursor: "pointer" }}
                      >
                        {expanded[o.id] ? "დაფარვა" : "დეტალები"}
                      </button>
                    </td>
                  </tr>

                  {expanded[o.id] && (
                    <tr>
                      <td colSpan={6} style={{ background: "#fafafa" }}>
                        {loadingIds[o.id] && <div>იტვირთება...</div>}

                        {!loadingIds[o.id] && details[o.id] && (() => {
                          const d = details[o.id];

                          return (
                            <div style={{ display: "grid", gap: 12 }}>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: 12,
                                }}
                              >
                                <div>
                                  <h4>👤 კლიენტი</h4>
                                  <div>
                                    სახელი: {d.customer?.first_name}{" "}
                                    {d.customer?.last_name}
                                  </div>
                                  <div>ელფოსტა: {d.customer?.email}</div>
                                  <div>ტელეფონი: {d.customer?.phone}</div>
                                  <div>ქალაქი: {d.customer?.city || "-"}</div>
                                  <div>მისამართი: {d.customer?.address || "-"}</div>
                                </div>

                                <div>
                                  <h4>🚚 შეკვეთა</h4>
                                  <div>სტატუსი: {d.status}</div>
                                  <div>შექმნილია: {fmtDT(d.created_at)}</div>
                                  <div>გადახდილია: {fmtDT(d.paid_at)}</div>
                                  <div>მიტანის ტიპი: {d.delivery_method || "-"}</div>
                                  <div>
                                    კუპონი:{" "}
                                    {d.coupon?.code
                                      ? `${d.coupon.code} (${d.coupon.percent}% → -${d.coupon.discount}₾)`
                                      : "-"}
                                  </div>
                                  <div>
                                    გადახდა: {d.payment?.method || "-"}{" "}
                                    {d.payment?.transaction_id
                                      ? `(${d.payment.transaction_id})`
                                      : ""}
                                  </div>
                                  <div>კომენტარი: {d.comment || "-"}</div>
                                </div>
                              </div>

                              <div>
                                <h4>🧾 საქონელი</h4>

                                <table
                                  border="1"
                                  cellPadding="8"
                                  style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                  }}
                                >
                                  <thead>
                                    <tr>
                                      <th>ფოტო</th>
                                      <th>დასახელება</th>
                                      <th>რაოდენობა</th>
                                      <th>ერთ.ფასი</th>
                                      <th>ფასდაკლება</th>
                                      <th>ჯამი</th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {d.items?.map((it, idx) => {
                                      const img = pickItemImage(it);

                                      return (
                                        <tr key={idx}>
                                          <td>
                                            {img ? (
                                              <img
                                                src={img}
                                                alt={it.name || "item"}
                                                width="56"
                                                height="56"
                                                style={{
                                                  objectFit: "cover",
                                                  borderRadius: 8,
                                                }}
                                              />
                                            ) : (
                                              <div
                                                style={{
                                                  width: 56,
                                                  height: 56,
                                                  background: "#eee",
                                                  borderRadius: 8,
                                                }}
                                              />
                                            )}
                                          </td>
                                          <td>{it.name}</td>
                                          <td>{it.quantity}</td>
                                          <td>{fmtMoney(it.unit_price)}</td>
                                          <td>{it.sale ? `${it.sale}%` : "-"}</td>
                                          <td>{fmtMoney(it.line_total)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              <div style={{ textAlign: "right" }}>
                                <div>
                                  შეკვეთის ჯამური ღირებულება:{" "}
                                  <b>{fmtMoney(d.subtotal)}</b>
                                </div>
                                <div>
                                  მიტანა: <b>{fmtMoney(d.delivery_fee)}</b>
                                </div>
                                <div>
                                  ფასდაკლება სულ:{" "}
                                  <b>{fmtMoney(d.discount_total)}</b>
                                </div>
                                <div style={{ fontSize: 18, marginTop: 6 }}>
                                  სულ გადასახდელი: <b>{fmtMoney(d.total)}</b>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OrderHistory;