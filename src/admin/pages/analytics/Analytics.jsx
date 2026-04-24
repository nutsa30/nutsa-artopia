import React, { useCallback, useEffect, useState } from "react";
import {
  BarChart2, TrendingUp, ShoppingBag, Truck,
  Tag, DollarSign, Users, Star,
} from "lucide-react";
import styles from "./Analytics.module.css";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

const getJwt = () => localStorage.getItem("ADMIN_TOKEN") || "";
const authHeaders = () => {
  const t = getJwt();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// ── Formatting ────────────────────────────────────────────────────────
const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(2)} ₾` : "0.00 ₾";
};

const fmtNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("ka-GE") : "0";
};

// ── Status meta ───────────────────────────────────────────────────────
const STATUS_META = {
  paid:       { label: "გადახდილი",    color: "#22c55e" },
  delivered:  { label: "მიტანილი",     color: "#16a34a" },
  processing: { label: "მუშავდება",    color: "#4b74ff" },
  shipped:    { label: "გაგზავნილი",   color: "#3b82f6" },
  placed:     { label: "განთავსებული", color: "#f59e0b" },
  pending:    { label: "მოლოდინში",    color: "#fb923c" },
  cancelled:  { label: "გაუქმებული",   color: "#ef4444" },
  failed:     { label: "წარუმატებელი", color: "#dc2626" },
};

const statusMeta = (s) =>
  STATUS_META[String(s || "").toLowerCase()] || { label: s || "—", color: "#8b5cf6" };

const deliveryLabel = (m) =>
  ({ courier: "კურიერი", pickup: "ადგილზე გატანა", next_day: "მომდევნო დღე",
     express: "ექსპრეს", regional: "რეგიონი" })[m] || m || "—";

// ── Date helpers ──────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);
const offsetDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const PRESETS = [
  { label: "დღეს",  id: "today",    from: () => todayStr(),     to: () => todayStr() },
  { label: "3 დღე", id: "3days",    from: () => offsetDate(2),  to: () => todayStr() },
  { label: "კვირა", id: "week",     from: () => offsetDate(6),  to: () => todayStr() },
  { label: "თვე",   id: "month",    from: () => offsetDate(29), to: () => todayStr() },
  { label: "წელი",  id: "year",     from: () => offsetDate(364),to: () => todayStr() },
  { label: "ყველა", id: "lifetime", from: () => "",             to: () => "" },
];

const CAT_COLORS = [
  "#4b74ff","#22c55e","#f59e0b","#ef4444",
  "#8b5cf6","#06b6d4","#ec4899","#14b8a6",
];

// ── SVG Area Chart ────────────────────────────────────────────────────
function AreaChart({ data = [], valueKey = "revenue", labelKey = "day" }) {
  if (!data.length) {
    return <p className={styles.emptyNote}>მონაცემები არ არის</p>;
  }

  const W = 800, H = 200;
  const pad = { top: 18, right: 18, bottom: 34, left: 56 };
  const w = W - pad.left - pad.right;
  const h = H - pad.top - pad.bottom;

  const vals = data.map((d) => Number(d[valueKey]) || 0);
  const maxVal = Math.max(...vals, 1);

  const xs = data.map((_, i) =>
    data.length === 1 ? pad.left + w / 2 : pad.left + (i / (data.length - 1)) * w
  );
  const ys = vals.map((v) => pad.top + h - (v / maxVal) * h);

  const lineD = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
    .join(" ");
  const areaD =
    `${lineD} L${xs[xs.length - 1].toFixed(1)},${(pad.top + h).toFixed(1)} ` +
    `L${xs[0].toFixed(1)},${(pad.top + h).toFixed(1)}Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: pad.top + h - t * h,
    label: Math.round(maxVal * t).toString(),
  }));

  const step = Math.max(1, Math.ceil(data.length / 8));
  const xLabels = data
    .map((d, i) => ({ x: xs[i], label: String(d[labelKey]).slice(5), show: i % step === 0 || i === data.length - 1 }))
    .filter((l) => l.show);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg}>
      <defs>
        <linearGradient id="analyticsAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4b74ff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4b74ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} y1={t.y} x2={W - pad.right} y2={t.y}
            stroke="#e8eef8" strokeWidth="1" />
          <text x={pad.left - 7} y={t.y + 4} textAnchor="end"
            fontSize="10.5" fill="#9dafc7" fontFamily="inherit">
            {t.label}
          </text>
        </g>
      ))}

      <path d={areaD} fill="url(#analyticsAreaGrad)" />
      <path d={lineD} fill="none" stroke="#4b74ff" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />

      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3.5"
          fill="white" stroke="#4b74ff" strokeWidth="2" />
      ))}

      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 7} textAnchor="middle"
          fontSize="10.5" fill="#9dafc7" fontFamily="inherit">
          {l.label}
        </text>
      ))}
    </svg>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────
function DonutChart({ segments = [], size = 156 }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className={styles.emptyNote}>—</p>;

  const r = 58, ir = 36, cx = size / 2, cy = size / 2;
  let cumDeg = -90;

  const toRad = (d) => (d * Math.PI) / 180;

  const slices = segments.map((seg) => {
    const deg = Math.max((seg.value / total) * 360, 0.01);
    const start = cumDeg;
    cumDeg += deg;
    const end = cumDeg;

    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end));
    const y2 = cy + r * Math.sin(toRad(end));
    const ix1 = cx + ir * Math.cos(toRad(start));
    const iy1 = cy + ir * Math.sin(toRad(start));
    const ix2 = cx + ir * Math.cos(toRad(end));
    const iy2 = cy + ir * Math.sin(toRad(end));
    const large = deg > 180 ? 1 : 0;

    const path =
      `M${x1.toFixed(2)},${y1.toFixed(2)} ` +
      `A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} ` +
      `L${ix2.toFixed(2)},${iy2.toFixed(2)} ` +
      `A${ir},${ir} 0 ${large},0 ${ix1.toFixed(2)},${iy1.toFixed(2)}Z`;

    return { ...seg, path };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="15"
        fontWeight="bold" fill="#1b2438" fontFamily="inherit">{total}</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize="10"
        fill="#7a8499" fontFamily="inherit">შეკვ.</text>
    </svg>
  );
}

// ── CSS Bar ───────────────────────────────────────────────────────────
function Bar({ value, max, color = "#4b74ff" }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={styles.barTrack}>
      <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = "#4b74ff" }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiIcon} style={{ background: `${color}18`, color }}>
        <Icon size={22} />
      </div>
      <div className={styles.kpiBody}>
        <div className={styles.kpiLabel}>{label}</div>
        <div className={styles.kpiValue}>{value}</div>
        {sub && <div className={styles.kpiSub}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Product Row ───────────────────────────────────────────────────────
function ProductRow({ rank, item, highlight }) {
  return (
    <div className={`${styles.productRow} ${highlight ? styles.productRowTop : ""}`}>
      <span className={styles.productRank}>{rank}</span>
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className={styles.productThumb} />
      ) : (
        <div className={styles.productThumbEmpty} />
      )}
      <span className={styles.productName}>{item.name}</span>
      <span className={styles.productQty}>{fmtNum(item.total_qty)} ც.</span>
      <span className={styles.productRev}>{fmtMoney(item.total_revenue)}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function Analytics() {
  const today = todayStr();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [activePreset, setActivePreset] = useState("today");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async (from, to) => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", `${from}T00:00:00`);
      if (to)   qs.set("to",   `${to}T23:59:59`);
      const res = await fetch(`${API_BASE}/admin/analytics?${qs}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} — ${txt || res.statusText}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e.message || "მონაცემები ვერ ჩაიტვირთა");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(today, today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (p) => {
    const f = p.from(), t = p.to();
    setFromDate(f);
    setToDate(t);
    setActivePreset(p.id);
    fetchAnalytics(f, t);
  };

  const applyCustom = (e) => {
    e.preventDefault();
    setActivePreset("custom");
    fetchAnalytics(fromDate, toDate);
  };

  const ov       = data?.overview        || {};
  const daily    = data?.daily_stats     || [];
  const statuses = data?.status_stats    || [];
  const topQty   = data?.top_products_qty    || [];
  const topRev   = data?.top_products_revenue || [];
  const cats     = data?.category_stats  || [];
  const delivs   = data?.delivery_stats  || [];
  const hotSale  = data?.hot_sale        || [];

  const statusSegments = statuses.map((s) => ({
    label: statusMeta(s.status).label,
    value: s.count,
    color: statusMeta(s.status).color,
  }));

  const maxCatRev = Math.max(...cats.map((c) => c.total_revenue), 1);

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <span className={styles.kicker}>ადმინ პანელი</span>
        <h1 className={styles.title}>📊 ანალიტიკა</h1>
        <p className={styles.subtitle}>
          გაყიდვების სრული სტატისტიკა — თარიღის მიხედვით
        </p>
      </div>

      {/* ── Date Filter ────────────────────────────────────────────── */}
      <div className={styles.filterCard}>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${styles.presetBtn} ${activePreset === p.id ? styles.presetActive : ""}`}
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <form onSubmit={applyCustom} className={styles.customRange}>
          <label>
            <span>დან</span>
            <input type="date" value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setActivePreset("custom"); }} />
          </label>
          <label>
            <span>მდე</span>
            <input type="date" value={toDate}
              onChange={(e) => { setToDate(e.target.value); setActivePreset("custom"); }} />
          </label>
          <button type="submit" className={styles.applyBtn}>გაფილტვრა</button>
        </form>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {loading && (
        <div className={styles.loadingBar}>
          <div className={styles.spinner} />
          <span>მონაცემები იტვირთება…</span>
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── KPI Cards ──────────────────────────────────────────── */}
          <div className={styles.kpiGrid}>
            <KpiCard icon={ShoppingBag} label="სულ შეკვეთები"
              value={fmtNum(ov.total_orders)} color="#4b74ff" />
            <KpiCard icon={TrendingUp}  label="გაყიდვები (კურ. გარ.)"
              value={fmtMoney(ov.total_subtotal)} color="#22c55e" />
            <KpiCard icon={Truck}       label="კურიერული მომსახ."
              value={fmtMoney(ov.total_delivery)} color="#06b6d4" />
            <KpiCard icon={DollarSign}  label="სულ შემოსავალი"
              value={fmtMoney(ov.total_revenue)} color="#8b5cf6" />
            <KpiCard icon={Star}        label="სავარ. მოგება"
              value={fmtMoney(ov.estimated_profit)}
              sub="სადაც თვითღირ. მითითებულია" color="#f59e0b" />
            <KpiCard icon={Tag}         label="ფასდაკლებები"
              value={fmtMoney(ov.total_discounts)} color="#ef4444" />
            <KpiCard icon={BarChart2}   label="საშუალო შეკვეთა"
              value={fmtMoney(ov.avg_order_value)} color="#ec4899" />
            <KpiCard icon={Users}       label="უნიკ. მომხმარებელი"
              value={fmtNum(ov.unique_customers)} color="#14b8a6" />
          </div>

          {/* ── Daily Chart + Status Donut ──────────────────────────── */}
          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <h3 className={styles.cardTitle}>გაყიდვები დღეების მიხედვით</h3>
              <AreaChart data={daily} valueKey="revenue" labelKey="day" />
            </div>

            <div className={styles.statusCard}>
              <h3 className={styles.cardTitle}>სტატუსების განაწილება</h3>
              <div className={styles.donutWrap}>
                <DonutChart segments={statusSegments} size={156} />
              </div>
              <ul className={styles.statusList}>
                {statusSegments.map((s, i) => (
                  <li key={i} className={styles.statusRow}>
                    <span className={styles.statusDot} style={{ background: s.color }} />
                    <span className={styles.statusLbl}>{s.label}</span>
                    <span className={styles.statusCnt}>{fmtNum(s.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Top Products ────────────────────────────────────────── */}
          <div className={styles.twoCol}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🏆 ყველაზე გაყიდვადი (რაოდ.)</h3>
              {topQty.length === 0
                ? <p className={styles.emptyNote}>მონაცემები არ არის</p>
                : topQty.map((item, i) => (
                    <ProductRow key={item.product_id} rank={i + 1} item={item} highlight={i === 0} />
                  ))
              }
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>💰 ყველაზე შემოსავლიანი</h3>
              {topRev.length === 0
                ? <p className={styles.emptyNote}>მონაცემები არ არის</p>
                : topRev.map((item, i) => (
                    <ProductRow key={item.product_id} rank={i + 1} item={item} highlight={i === 0} />
                  ))
              }
            </div>
          </div>

          {/* ── Category Breakdown ─────────────────────────────────── */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>📂 კატეგორიების ანალიზი</h3>
            {cats.length === 0
              ? <p className={styles.emptyNote}>მონაცემები არ არის</p>
              : <div className={styles.catList}>
                  {cats.map((c, i) => (
                    <div key={i} className={styles.catRow}>
                      <span className={styles.catDot}
                        style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                      <span className={styles.catName}>{c.category}</span>
                      <div className={styles.catBarWrap}>
                        <Bar value={c.total_revenue} max={maxCatRev}
                          color={CAT_COLORS[i % CAT_COLORS.length]} />
                      </div>
                      <span className={styles.catRevenue}>{fmtMoney(c.total_revenue)}</span>
                      <span className={styles.catQty}>{fmtNum(c.total_qty)} ც.</span>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* ── Hot Sale + Delivery ─────────────────────────────────── */}
          <div className={styles.twoCol}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🔥 ფასდაკლებიანი პროდუქტები</h3>
              {hotSale.length === 0
                ? <p className={styles.emptyNote}>ფასდაკლებიანი გაყიდვები არ არის</p>
                : hotSale.map((item, i) => (
                    <div key={i} className={styles.hotRow}>
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className={styles.hotThumb} />
                        : <div className={styles.hotThumbEmpty} />
                      }
                      <div className={styles.hotInfo}>
                        <div className={styles.hotName}>{item.name}</div>
                        <div className={styles.hotMeta}>
                          <span className={styles.saleBadge}>−{item.sale_pct}%</span>
                          <span>{fmtNum(item.total_qty)} ც. · {fmtMoney(item.total_revenue)}</span>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🚚 მიტანის მეთოდები</h3>
              {delivs.length === 0
                ? <p className={styles.emptyNote}>მონაცემები არ არის</p>
                : delivs.map((d, i) => (
                    <div key={i} className={styles.delivRow}>
                      <span className={styles.delivMethod}>{deliveryLabel(d.method)}</span>
                      <span className={styles.delivCount}>{fmtNum(d.count)} შეკვ.</span>
                      <span className={styles.delivFee}>{fmtMoney(d.total_fee)}</span>
                    </div>
                  ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}
