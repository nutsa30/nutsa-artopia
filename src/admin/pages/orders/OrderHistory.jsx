import React, { useEffect, useMemo, useState } from "react";
import styles from "./OrderHistory.module.css";
import { cld, IMG } from "../../../utils/cloudinary";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

const getJwt = () => {
  const token = localStorage.getItem("ADMIN_TOKEN");
  if (!token) return "";
  return token;
};

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
  const directKeys = ["image_url", "image_url_snapshot", "image", "photo", "thumbnail", "thumb", "cover"];
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
  return out
    .filter((u) => typeof u === "string" && u.trim())
    .map((u) => toAbsolute(u.trim()));
};

const pickItemImage = (it = {}) => {
  const product = it.product || it.product_data || {};
  const candidates = [...collectImageCandidates(it), ...collectImageCandidates(product)];
  return [...new Set(candidates)][0] || "";
};

const parseISOasUTC = (s) => {
  if (!s) return null;
  const hasTZ = /[zZ]|[+\-]\d{2}:\d{2}$/.test(s);
  return new Date(hasTZ ? s : `${s}Z`);
};

const fmtDT = (v) => {
  const d = parseISOasUTC(v);
  return d ? d.toLocaleString("ka-GE", { timeZone: "Asia/Tbilisi" }) : "—";
};

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(2)} ₾` : "—";
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
  if (s === "failed") return "წარუმატებელი";
  return status || "—";
};

const statusClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (["paid", "delivered"].includes(s)) return styles.statusSuccess;
  if (["processing", "shipped"].includes(s)) return styles.statusInfo;
  if (["pending", "placed"].includes(s)) return styles.statusWarning;
  if (["cancelled", "failed"].includes(s)) return styles.statusDanger;
  return styles.statusNeutral;
};

const deliveryMethodLabel = (method) => {
  if (method === "courier") return "კურიერული მიტანა";
  if (method === "pickup") return "ადგილზე გატანა";
  if (method === "next_day") return "მომდევნო დღე";
  if (method === "express") return "ექსპრეს";
  if (method === "regional") return "რეგიონალური";
  return method || "—";
};

const paymentMethodLabel = (method) => {
  const m = (method || "").toLowerCase();
  if (m === "cash_on_pickup") return "ადგილზე გადახდა";
  if (m === "card" || m === "bog" || m === "test") return "ბარათით (ონლაინ)";
  return method || "—";
};

const isTbilisiCity = (city) => {
  const lc = (city || "").trim().toLowerCase();
  return lc === "tbilisi" || lc === "თბილისი";
};

// ახალი, ქალაქზე დამოკიდებული ფიქსირებული ტარიფი (QuickShipper-ის მოცილების შემდეგ)
const calcDeliveryDiscount = (subtotal, city) => {
  const tbilisi = isTbilisiCity(city);
  const baseFee = tbilisi ? 5 : 7;
  const threshold = tbilisi ? 50 : 70;
  return subtotal >= threshold ? baseFee : 0;
};

/* ---------- გრავირება ---------- */

// Cloudinary-ს ორიგინალი ფაილი ჩამოსატვირთად (fl_attachment) — ფაილი არ იცვლება
const cldDownload = (url, name) => {
  if (!url) return "";
  const m = String(url).match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i);
  if (!m) return url;
  const safe = String(name || "file").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 80);
  return `${m[1]}fl_attachment:${safe}/${m[2]}`;
};

const fmtDateOnly = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y) return iso;
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("ka-GE", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "long",
  });
};

function EngravingBadge({ engraving, status }) {
  if (!engraving) return null;
  const ready = !!engraving.ready_at;
  return (
    <span className={`${styles.engravingBadge} ${ready ? styles.engravingBadgeReady : ""}`}>
      გრავირება · {engraving.units} ცალი ·{" "}
      {ready
        ? "მზადაა"
        : status === "paid"
        ? `ვადა: ${engraving.ready_by_label}`
        : "გადაუხდელი"}
    </span>
  );
}

function EngravingDetails({ engraving, order, onReady, busy }) {
  if (!engraving) return null;
  const isPaid = order.status === "paid";
  const ready = !!engraving.ready_at;
  return (
    <div className={styles.engravingSection}>
      <div className={styles.engravingHead}>
        <div>
          <h4>გრავირება — დასამზადებელი</h4>
          <div className={styles.engravingMeta}>
            ვადა: <b>{engraving.production_label}</b> · {engraving.window_label}
            <br />
            ბოლო ვადა: <b>{engraving.ready_by_label || fmtDateOnly(engraving.ready_by)}</b>
            {ready && (
              <>
                <br />
                მზადაა: <b>{fmtDT(engraving.ready_at)}</b>
                {engraving.ready_email_sent_at
                  ? ` · კლიენტს ეცნობა ${fmtDT(engraving.ready_email_sent_at)}`
                  : " · იმეილი ვერ გაიგზავნა"}
              </>
            )}
          </div>
        </div>
        {isPaid ? (
          <button type="button" className={styles.readyBtn} onClick={onReady} disabled={busy}>
            {busy ? "…" : ready ? "იმეილის ხელახლა გაგზავნა" : "მზადაა — შეატყობინე კლიენტს"}
          </button>
        ) : (
          <span className={styles.engravingWarn}>შეკვეთა გადახდილი არ არის — არ დაამზადოთ</span>
        )}
      </div>

      {engraving.designs.map((d) => (
        <div key={d.id} className={styles.designCard}>
          <div className={styles.designTitle}>
            {d.product_name} #{d.id} — <b>{d.quantity} ცალი</b>
            {d.sides === 2 ? " · ორივე მხარე" : ""} · ზონა {d.zone_mm?.[0]}×{d.zone_mm?.[1]} მმ
          </div>

          <div className={styles.designSides}>
            {d.sides_detail.map((s) => {
              const base = `${order.order_number}-${d.product_key}-${d.id}-${s.side}`;
              return (
                <div key={s.side} className={styles.designSide}>
                  <div className={styles.sideLabel}>{s.side_label}</div>

                  {s.preview && (
                    <a href={s.preview} target="_blank" rel="noreferrer">
                      <img className={styles.designPreview} src={cld(s.preview, { w: 600 })} alt="3D პრევიუ" />
                    </a>
                  )}

                  {s.lines?.length > 0 && (
                    <div className={styles.designText}>
                      <div className={styles.designTextLabel}>ტექსტი</div>
                      {s.lines.map((l, i) => (
                        <div key={i} className={styles.designLine}>{l}</div>
                      ))}
                      <div className={styles.designFont}>
                        შრიფტი: <b>{s.font?.label || "—"}</b>
                        {s.font?.family ? ` (${s.font.family.replace(/^Engr /, "")})` : ""}
                        {s.text_height_mm ? ` · ასოს ზომა ≈ ${s.text_height_mm} მმ` : ""}
                      </div>
                    </div>
                  )}

                  {s.has_photo && (
                    <div className={styles.designFont}>
                      ფოტო: <b>{s.photo_style === "dots" ? "წერტილოვანი" : "კონტრასტული"}</b>
                      {s.photo_invert ? " · ინვერსიით" : ""}
                      {s.photo_size_mm ? ` · ${s.photo_size_mm[0]}×${s.photo_size_mm[1]} მმ` : ""}
                    </div>
                  )}

                  {s.laser_png && (
                    <div className={styles.laserWrap}>
                      <img className={styles.laserImg} src={s.laser_png} alt="ლაზერის ფაილი" />
                    </div>
                  )}

                  <div className={styles.designLinks}>
                    {s.laser_png && (
                      <a className={styles.primaryBtn} href={cldDownload(s.laser_png, `${base}-laser`)}>
                        ლაზერის ფაილი (PNG)
                      </a>
                    )}
                    {s.photo && (
                      <a className={styles.secondaryBtn} href={cldDownload(s.photo, `${base}-photo`)}>
                        ორიგინალი ფოტო
                      </a>
                    )}
                    {s.preview && (
                      <a className={styles.secondaryBtn} href={cldDownload(s.preview, `${base}-preview`)}>
                        პრევიუ
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className={styles.engravingFoot}>
        ლაზერის ფაილი შავ-თეთრი PNG-ია, ზონის ზუსტი ზომით (508 DPI): შავი = ამოიწვება. პროგრამაში
        გახსნისას ზომა მმ-ში თავისით სწორია.
      </div>
    </div>
  );
}

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [markingReady, setMarkingReady] = useState({});
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [details, setDetails] = useState({});
  const [loadingIds, setLoadingIds] = useState({});
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [markingPaid, setMarkingPaid] = useState({});

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
      try { data = JSON.parse(text); } catch { throw new Error("სერვერის პასუხი არასწორია"); }
      if (!res.ok) throw new Error(data?.message || "შეკვეთების წამოღება ვერ მოხერხდა");
      setOrders(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
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
      try { data = JSON.parse(text); } catch { throw new Error("დეტალის JSON არასწორია"); }
      if (!res.ok) throw new Error(data?.message || "დეტალის წამოღება ვერ მოხერხდა");
      setDetails((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      setError(err.message || "დეტალის წამოღება ვერ მოხერხდა");
    } finally {
      setLoadingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const markPaid = async (id) => {
    setMarkingPaid((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${id}/mark-paid`, {
        method: "POST",
        headers: buildHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "მონიშვნა ვერ მოხერხდა");

      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "paid" } : o)));
      setDetails((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], status: "paid", paid_at: data.paid_at } } : prev));
    } catch (err) {
      setError(err.message || "მონიშვნა ვერ მოხერხდა");
    } finally {
      setMarkingPaid((prev) => ({ ...prev, [id]: false }));
    }
  };

  const markEngravingReady = async (id) => {
    const d = details[id];
    const again = !!d?.engraving?.ready_at;
    const ok = window.confirm(
      again
        ? "კლიენტს ხელახლა გავუგზავნოთ იმეილი, რომ შეკვეთა მზადაა?"
        : "შეკვეთა მზადაა? კლიენტს გაეგზავნება იმეილი."
    );
    if (!ok) return;
    setMarkingReady((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${id}/engraving-ready`, {
        method: "POST",
        headers: buildHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "მონიშვნა ვერ მოხერხდა");
      setDetails((prev) => ({ ...prev, [id]: data }));
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id && o.engraving
            ? { ...o, engraving: { ...o.engraving, ready_at: data.engraving?.ready_at || o.engraving.ready_at } }
            : o
        )
      );
      if (!data.email_sent) setError("მზადაა — მაგრამ კლიენტს იმეილი ვერ გაეგზავნა. დაურეკეთ.");
    } catch (err) {
      setError(err.message || "მონიშვნა ვერ მოხერხდა");
    } finally {
      setMarkingReady((prev) => ({ ...prev, [id]: false }));
    }
  };

  const onFilterSubmit = (e) => { e.preventDefault(); fetchOrders(); };
  const onReset = () => { setFromDate(""); setToDate(""); fetchOrders("per_page=50"); };

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
            <label>დათარიღება — დან</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>დათარიღება — მდე</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className={styles.filterActions}>
            <button className={styles.primaryBtn} type="submit">გაფილტვრა</button>
            <button className={styles.secondaryBtn} type="button" onClick={onReset}>გასუფთავება</button>
          </div>
        </div>
        {loading && <span className={styles.inlineInfo}>შეკვეთები იტვირთება…</span>}
      </form>

      {error && <div className={styles.errorBox}>{error}</div>}

      {!loading && orders.length === 0 ? (
        <div className={styles.emptyState}>შეკვეთები ჯერ არ არის</div>
      ) : (
        <div className={styles.ordersList}>
          {orders.map((o) => {
            const dt = o.paid_at || o.created_at;
            const isCourier = o.delivery_method === "courier";
            const isPickup = o.delivery_method === "pickup";

            return (
              <div
                key={o.id}
                className={`${styles.orderCard} ${
                  o.engraving && o.status === "paid" && !o.engraving.ready_at ? styles.engravingOrder : ""
                }`}
              >
                <div className={styles.orderCardTop}>
                  <div className={styles.orderMain}>
                    <div className={styles.orderNumber}>#{o.order_number}</div>
                    <div className={styles.orderMetaRow}>
                      <span className={`${styles.statusBadge} ${statusClass(o.status)}`}>
                        {statusLabel(o.status)}
                      </span>
                      <EngravingBadge engraving={o.engraving} status={o.status} />
                      {isCourier && (
                        <span className={styles.deliveryBadge}>კურიერი</span>
                      )}
                      {isPickup && (
                        <span className={styles.pickupBadge}>ადგილზე გატანა</span>
                      )}
                      {o.payment_method === "cash_on_pickup" && (
                        <span className={styles.pickupBadge}>{paymentMethodLabel(o.payment_method)}</span>
                      )}
                      <span className={styles.metaText}>{fmtDT(dt)}</span>
                    </div>
                  </div>

                  <div className={styles.orderAside}>
                    <div className={styles.totalLabel}>
                      {o.status === "paid" ? "სულ გადახდილია" : "სულ გადასახდელია"}
                    </div>
                    <div className={styles.totalValue}>{fmtMoney(o.total)}</div>
                    {o.status !== "paid" && o.payment_method === "cash_on_pickup" && (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        style={{ marginTop: 8 }}
                        onClick={() => markPaid(o.id)}
                        disabled={!!markingPaid[o.id]}
                      >
                        {markingPaid[o.id] ? "…" : "მონიშნე გადახდილად"}
                      </button>
                    )}
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
                    <span className={styles.summaryLabel}>მიტანა</span>
                    <span className={styles.summaryValue}>{deliveryMethodLabel(o.delivery_method)}</span>
                  </div>
                  <div className={styles.summaryCell}>
                    <span className={styles.summaryLabel}>გადახდა</span>
                    <span className={styles.summaryValue}>{paymentMethodLabel(o.payment_method)}</span>
                  </div>
                  <div className={styles.summaryCell}>
                    <span className={styles.summaryLabel}>თარიღი</span>
                    <span className={styles.summaryValue}>{fmtDT(dt)}</span>
                  </div>
                </div>

                <div className={styles.orderActions}>
                  <button
                    onClick={() => toggleDetails(o.id)}
                    className={styles.detailsBtn}
                    type="button"
                  >
                    {expanded[o.id] ? "▲ დახურვა" : "▼ სრული დეტალები"}
                  </button>
                </div>

                {expanded[o.id] && (
                  <div className={styles.detailsWrap}>
                    {loadingIds[o.id] && <div className={styles.loadingBox}>მონაცემები იტვირთება…</div>}

                    {!loadingIds[o.id] && details[o.id] && (() => {
                      const d = details[o.id];
                      const subtotal = d.subtotal || 0;
                      const delivDisc = calcDeliveryDiscount(subtotal, d.customer?.city);
                      const couponDisc = d.coupon?.discount || 0;
                      const isCourierDetail = d.delivery_method === "courier";
                      const isPickupDetail = d.delivery_method === "pickup";

                      return (
                        <div className={styles.detailsContent}>

                          {/* ══ გრავირება — ყველაზე ზემოთ, რომ არაფერი გამოგრჩეთ ══ */}
                          <EngravingDetails
                            engraving={d.engraving}
                            order={d}
                            busy={!!markingReady[o.id]}
                            onReady={() => markEngravingReady(o.id)}
                          />

                          {/* ══ 2-col: კლიენტი + გადახდა ══ */}
                          <div className={styles.infoGrid}>
                            <div className={styles.infoCard}>
                              <h4>👤 კლიენტი</h4>
                              <div className={styles.infoRows}>
                                <div><span>სახელი:</span> {d.customer?.first_name} {d.customer?.last_name}</div>
                                <div><span>ელ-ფოსტა:</span> {d.customer?.email || "—"}</div>
                                <div><span>ტელეფონი:</span> {d.customer?.phone || "—"}</div>
                              </div>
                            </div>

                            <div className={styles.infoCard}>
                              <h4>💳 გადახდა</h4>
                              <div className={styles.infoRows}>
                                <div><span>სტატუსი:</span> {statusLabel(d.status)}</div>
                                <div><span>შეკვეთა შეიქმნა:</span> {fmtDT(d.created_at)}</div>
                                <div><span>გადახდის დრო:</span> {fmtDT(d.paid_at)}</div>
                                <div><span>გადახდის მეთოდი:</span> {d.payment?.method || "—"}</div>
                                {d.payment?.transaction_id && (
                                  <div><span>ტრანზაქციის ID:</span> <span className={styles.monoText}>{d.payment.transaction_id}</span></div>
                                )}
                                {d.coupon?.code && (
                                  <div>
                                    <span>პრომო-კოდი:</span>{" "}
                                    <span className={styles.couponBadge}>
                                      🎁 {d.coupon.code}
                                      {d.coupon.percent ? ` (−${d.coupon.percent}%)` : ""}
                                    </span>
                                  </div>
                                )}
                                {d.comment && <div><span>კომენტარი:</span> {d.comment}</div>}
                              </div>
                            </div>
                          </div>

                          {/* ══ მიტანის სექცია (full width) ══ */}
                          <div className={`${styles.infoCard} ${isCourierDetail ? styles.courierCard : ""}`}>
                            <h4>{isCourierDetail ? "კურიერული მიტანა" : isPickupDetail ? "ადგილზე გატანა" : "მიტანა"}</h4>
                            <div className={styles.infoRows}>
                              {isCourierDetail && (
                                <>
                                  <div><span>ქალაქი:</span> {d.customer?.city || "—"}</div>
                                  <div><span>მიტანის მისამართი:</span> {d.customer?.address || "—"}</div>
                                  {d.delivery_address_comment && (
                                    <div><span>სადარბ. / სართ. / ბინა:</span> {d.delivery_address_comment}</div>
                                  )}
                                </>
                              )}
                              {isPickupDetail && (
                                <>
                                  <div><span>მისამართი:</span> სიმონ ჩიქოვანის 45, საბურთალო, თბილისი</div>
                                  <div><span>სამუშაო საათები:</span> ყოველდღე 11:30–20:30</div>
                                  {o.payment_method === "cash_on_pickup" && (
                                    <div><span>გადახდა:</span> ადგილზე, ნივთის აღებისას</div>
                                  )}
                                </>
                              )}
                              {!isCourierDetail && !isPickupDetail && (
                                <div><span>ტიპი:</span> {deliveryMethodLabel(d.delivery_method)}</div>
                              )}
                            </div>
                          </div>

                          {/* ══ პროდუქტები ══ */}
                          <div className={styles.itemsSection}>
                            <div className={styles.sectionHeader}>
                              <h4>🧾 შეკვეთილი პროდუქცია</h4>
                            </div>

                            {/* Desktop table */}
                            <div className={styles.itemsTableWrap}>
                              <table className={styles.itemsTable}>
                                <thead>
                                  <tr>
                                    <th>ფოტო</th>
                                    <th>დასახელება</th>
                                    <th>რაოდენობა</th>
                                    <th>ერთ. ფასი</th>
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
                                            <img src={cld(img, { w: IMG.ADMIN })} alt={it.name || "item"} className={styles.itemThumb} loading="lazy" />
                                          ) : (
                                            <div className={styles.noImage}>ფოტო<br/>არ არის</div>
                                          )}
                                        </td>
                                        <td className={styles.itemNameCell}>{it.name || "—"}</td>
                                        <td>{it.quantity ?? "—"}</td>
                                        <td>{fmtMoney(it.unit_price)}</td>
                                        <td>{it.sale ? <span className={styles.saleBadge}>−{it.sale}%</span> : "—"}</td>
                                        <td className={styles.lineTotal}>{fmtMoney(it.line_total)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile cards */}
                            <div className={styles.mobileItems}>
                              {d.items?.map((it, idx) => {
                                const img = pickItemImage(it);
                                return (
                                  <div key={idx} className={styles.mobileItemCard}>
                                    <div className={styles.mobileItemTop}>
                                      {img ? (
                                        <img src={cld(img, { w: IMG.ADMIN })} alt={it.name || "item"} className={styles.mobileItemThumb} loading="lazy" />
                                      ) : (
                                        <div className={styles.noImageMobile}>ფოტო<br/>არ არის</div>
                                      )}
                                      <div className={styles.mobileItemInfo}>
                                        <div className={styles.mobileItemName}>{it.name || "—"}</div>
                                        <div>რაოდენობა: {it.quantity ?? "—"}</div>
                                        <div>ერთ. ფასი: {fmtMoney(it.unit_price)}</div>
                                        {it.sale ? <div>ფასდ: <span className={styles.saleBadge}>−{it.sale}%</span></div> : null}
                                        <div className={styles.mobileLineTotal}>ჯამი: {fmtMoney(it.line_total)}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* ══ ჯამები ══ */}
                          <div className={styles.totalsCard}>
                            <div className={styles.totalRow}>
                              <span>პროდუქციის ღირებულება</span>
                              <b>{fmtMoney(subtotal)}</b>
                            </div>
                            {couponDisc > 0 && (
                              <div className={`${styles.totalRow} ${styles.discountRow}`}>
                                <span>🎁 პრომო-კოდი{d.coupon?.code ? ` (${d.coupon.code})` : ""}</span>
                                <b>−{fmtMoney(couponDisc)}</b>
                              </div>
                            )}
                            {isCourierDetail && delivDisc > 0 && (
                              <div className={`${styles.totalRow} ${styles.discountRow}`}>
                                <span>🚚 მიტანაზე ფასდაკლება</span>
                                <b>−{delivDisc}₾</b>
                              </div>
                            )}
                            {isCourierDetail ? (
                              <div className={styles.totalRow}>
                                <span>🚚 მიტანის საფასური</span>
                                <b>
                                  {(d.delivery_fee || 0) > 0
                                    ? fmtMoney(d.delivery_fee)
                                    : <span className={styles.freeLabel}>უფასო ✓</span>}
                                </b>
                              </div>
                            ) : isPickupDetail ? (
                              <div className={styles.totalRow}>
                                <span>🏪 ადგილზე გატანა</span>
                                <b><span className={styles.freeLabel}>უფასო ✓</span></b>
                              </div>
                            ) : null}
                            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                              <span>{d.status === "paid" ? "სულ გადახდილია" : "სულ გადასახდელია"}</span>
                              <b>{fmtMoney(d.total)}</b>
                            </div>
                            {d.status !== "paid" && o.payment_method === "cash_on_pickup" && (
                              <button
                                type="button"
                                className={styles.primaryBtn}
                                style={{ marginTop: 10, width: "100%" }}
                                onClick={() => markPaid(o.id)}
                                disabled={!!markingPaid[o.id]}
                              >
                                {markingPaid[o.id] ? "…" : "მონიშნე გადახდილად"}
                              </button>
                            )}
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
