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

const collectImageCandidates = (obj = {}) => {
  const out = [];

  const directKeys = [
    "image_url",
    "image_url_snapshot",
    "image",
    "photo",
    "thumbnail",
    "thumb",
    "cover",
  ];

  for (const key of directKeys) {
    if (obj?.[key]) out.push(obj[key]);
  }

  for (let i = 1; i <= 6; i += 1) {
    out.push(obj?.[`image_url${i}`]);
    out.push(obj?.[`image${i}`]);
    out.push(obj?.[`img${i}`]);
  }

  if (Array.isArray(obj?.images)) {
    for (const it of obj.images) {
      if (typeof it === "string") out.push(it);
      else if (it && typeof it.url === "string") out.push(it.url);
    }
  }

  if (typeof obj?.images === "string") {
    try {
      const parsed = JSON.parse(obj.images);
      if (Array.isArray(parsed)) {
        for (const it of parsed) {
          if (typeof it === "string") out.push(it);
          else if (it && typeof it.url === "string") out.push(it.url);
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return out
    .filter((u) => typeof u === "string" && u.trim())
    .map((u) => toAbsolute(u.trim()));
};

const pickItemImage = (it = {}) => {
  const product = it.product || it.product_data || {};

  const candidates = [
    ...collectImageCandidates(it),
    ...collectImageCandidates(product),
  ];

  const unique = [...new Set(candidates)];
  return unique[0] || "";
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

const statusLabel = (status) => {
  const s = String(status || "").toLowerCase();

  if (s === "placed") return "განთავსებული";
  if (s === "paid") return "გადახდილი";
  if (s === "pending") return "მოლოდინში";
  if (s === "processing") return "მუშავდება";
  if (s === "shipped") return "გაგზავნილი";
  if (s === "delivered") return "მიტანილი";
  if (s === "cancelled") return "გაუქმებული";

  return status || "-";
};

const statusClass = (status) => {
  const s = String(status || "").toLowerCase();

  if (["paid", "delivered"].includes(s)) return styles.statusSuccess;
  if (["processing", "shipped"].includes(s)) return styles.statusInfo;
  if (["pending", "placed"].includes(s)) return styles.statusWarning;
  if (["cancelled"].includes(s)) return styles.statusDanger;

  return styles.statusNeutral;
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
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.kicker}>ადმინისტრირება</div>
          <h2 className={styles.pageTitle}>📦 შეკვეთების ისტორია</h2>
          <p className={styles.pageSub}>
            ყველა შეკვეთა ერთ სივრცეში — ფილტრი, დეტალები და სრული ინფორმაცია.
          </p>
        </div>
      </div>

      <form onSubmit={onFilterSubmit} className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.field}>
            <label>დან</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>მდე</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className={styles.filterActions}>
            <button className={styles.primaryBtn} type="submit">
              ფილტრი
            </button>

            <button className={styles.secondaryBtn} type="button" onClick={onReset}>
              Reset
            </button>
          </div>
        </div>

        {loading && <span className={styles.inlineInfo}>იტვირთება…</span>}
      </form>

      {error && <div className={styles.errorBox}>{error}</div>}

      {!loading && orders.length === 0 ? (
        <div className={styles.emptyState}>შეკვეთები ჯერ არ არის</div>
      ) : (
        <div className={styles.ordersList}>
          {orders.map((o) => {
            const dt = o.paid_at || o.created_at;

            return (
              <div key={o.id} className={styles.orderCard}>
                <div className={styles.orderCardTop}>
                  <div className={styles.orderMain}>
                    <div className={styles.orderNumber}>#{o.order_number}</div>
                    <div className={styles.orderMetaRow}>
                      <span className={`${styles.statusBadge} ${statusClass(o.status)}`}>
                        {statusLabel(o.status)}
                      </span>
                      <span className={styles.metaText}>{fmtDT(dt)}</span>
                    </div>
                  </div>

                  <div className={styles.orderAside}>
                    <div className={styles.totalLabel}>ჯამური ღირებულება</div>
                    <div className={styles.totalValue}>{fmtMoney(o.total)}</div>
                  </div>
                </div>

                <div className={styles.orderSummaryGrid}>
                  <div className={styles.summaryCell}>
                    <span className={styles.summaryLabel}>კლიენტი</span>
                    <span className={styles.summaryValue}>
                      {o.customer?.first_name} {o.customer?.last_name}
                    </span>
                  </div>

                  <div className={styles.summaryCell}>
                    <span className={styles.summaryLabel}>სტატუსი</span>
                    <span className={styles.summaryValue}>{statusLabel(o.status)}</span>
                  </div>

                  <div className={styles.summaryCell}>
                    <span className={styles.summaryLabel}>თარიღი</span>
                    <span className={styles.summaryValue}>{fmtDT(dt)}</span>
                  </div>

                  <div className={styles.summaryCell}>
                    <span className={styles.summaryLabel}>შეკვეთის ნომერი</span>
                    <span className={styles.summaryValue}>#{o.order_number}</span>
                  </div>
                </div>

                <div className={styles.orderActions}>
                  <button
                    onClick={() => toggleDetails(o.id)}
                    className={styles.detailsBtn}
                    type="button"
                  >
                    {expanded[o.id] ? "დაფარვა" : "დეტალები"}
                  </button>
                </div>

                {expanded[o.id] && (
                  <div className={styles.detailsWrap}>
                    {loadingIds[o.id] && <div className={styles.loadingBox}>იტვირთება...</div>}

                    {!loadingIds[o.id] && details[o.id] && (() => {
                      const d = details[o.id];

                      return (
                        <div className={styles.detailsContent}>
                          <div className={styles.infoGrid}>
                            <div className={styles.infoCard}>
                              <h4>👤 კლიენტი</h4>
                              <div className={styles.infoRows}>
                                <div><span>სახელი:</span> {d.customer?.first_name} {d.customer?.last_name}</div>
                                <div><span>ელფოსტა:</span> {d.customer?.email || "-"}</div>
                                <div><span>ტელეფონი:</span> {d.customer?.phone || "-"}</div>
                                <div><span>ქალაქი:</span> {d.customer?.city || "-"}</div>
                                <div><span>მისამართი:</span> {d.customer?.address || "-"}</div>
                              </div>
                            </div>

                            <div className={styles.infoCard}>
                              <h4>🚚 შეკვეთა</h4>
                              <div className={styles.infoRows}>
                                <div><span>სტატუსი:</span> {statusLabel(d.status)}</div>
                                <div><span>შექმნილია:</span> {fmtDT(d.created_at)}</div>
                                <div><span>გადახდილია:</span> {fmtDT(d.paid_at)}</div>
                                <div><span>მიტანის ტიპი:</span> {d.delivery_method || "-"}</div>
                                <div>
                                  <span>კუპონი:</span>{" "}
                                  {d.coupon?.code
                                    ? `${d.coupon.code} (${d.coupon.percent}% → -${d.coupon.discount}₾)`
                                    : "-"}
                                </div>
                                <div>
                                  <span>გადახდა:</span>{" "}
                                  {d.payment?.method || "-"}{" "}
                                  {d.payment?.transaction_id
                                    ? `(${d.payment.transaction_id})`
                                    : ""}
                                </div>
                                <div><span>კომენტარი:</span> {d.comment || "-"}</div>
                              </div>
                            </div>
                          </div>

                          <div className={styles.itemsSection}>
                            <div className={styles.sectionHeader}>
                              <h4>🧾 საქონელი</h4>
                            </div>

                            <div className={styles.itemsTableWrap}>
                              <table className={styles.itemsTable}>
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
                                              className={styles.itemThumb}
                                            />
                                          ) : (
                                            <div className={styles.noImage}>
                                              No Image
                                            </div>
                                          )}
                                        </td>
                                        <td className={styles.itemNameCell}>
                                          {it.name || "-"}
                                        </td>
                                        <td>{it.quantity ?? "-"}</td>
                                        <td>{fmtMoney(it.unit_price)}</td>
                                        <td>{it.sale ? `${it.sale}%` : "-"}</td>
                                        <td className={styles.lineTotal}>
                                          {fmtMoney(it.line_total)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div className={styles.mobileItems}>
                              {d.items?.map((it, idx) => {
                                const img = pickItemImage(it);

                                return (
                                  <div key={idx} className={styles.mobileItemCard}>
                                    <div className={styles.mobileItemTop}>
                                      {img ? (
                                        <img
                                          src={img}
                                          alt={it.name || "item"}
                                          className={styles.mobileItemThumb}
                                        />
                                      ) : (
                                        <div className={styles.noImageMobile}>
                                          No Image
                                        </div>
                                      )}

                                      <div className={styles.mobileItemInfo}>
                                        <div className={styles.mobileItemName}>
                                          {it.name || "-"}
                                        </div>
                                        <div>რაოდენობა: {it.quantity ?? "-"}</div>
                                        <div>ერთ.ფასი: {fmtMoney(it.unit_price)}</div>
                                        <div>ფასდაკლება: {it.sale ? `${it.sale}%` : "-"}</div>
                                        <div className={styles.mobileLineTotal}>
                                          ჯამი: {fmtMoney(it.line_total)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className={styles.totalsCard}>
                            <div className={styles.totalRow}>
                              <span>შეკვეთის ჯამური ღირებულება</span>
                              <b>{fmtMoney(d.subtotal)}</b>
                            </div>
                            <div className={styles.totalRow}>
                              <span>მიტანა</span>
                              <b>{fmtMoney(d.delivery_fee)}</b>
                            </div>
                            <div className={styles.totalRow}>
                              <span>ფასდაკლება სულ</span>
                              <b>{fmtMoney(d.discount_total)}</b>
                            </div>
                            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                              <span>სულ გადასახდელი</span>
                              <b>{fmtMoney(d.total)}</b>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;