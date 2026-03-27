// src/pages/orders/OrderHistory.jsx
import React, { useEffect, useState } from 'react';
import styles from './OrderHistory.module.css';

// ❗ base URL ბოლო სლეშის გარეშე
const API_BASE = 'https://artopia-backend-2024-54872c79acdd.herokuapp.com';

const API_ORIGIN = (() => {
  try { return new URL(API_BASE).origin; } catch { return API_BASE; }
})();

/* ------------ Auth helpers ------------- */
const getJwt = () =>
  localStorage.getItem('ADMIN_TOKEN') ||
  localStorage.getItem('ACCESS_TOKEN') ||
  localStorage.getItem('access_token') ||
  localStorage.getItem('jwt') ||
  localStorage.getItem('token') ||
  '';

const getAdminSecret = () =>
  (import.meta?.env?.VITE_ADMIN_TOKEN ?? '').trim() || 'ARTOPIA_SUPERADMIN_2024';

const buildHeaders = () => {
  const h = {};
  const jwt = getJwt();
  if (jwt) h.Authorization = `Bearer ${jwt}`;
  h['X-Admin-Token'] = getAdminSecret();
  return h;
};
/* --------------------------------------- */

// რელატიური ბილიკის აბსოლუტიზაცია
const toAbsolute = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const path = String(u).startsWith('/') ? u : `/${u}`;
  return `${API_ORIGIN}${path}`;
};

// 🔎 ყველაზე „გულღია“ ამომღები: სცდის ყველგან
const pickItemImage = (it = {}) => {
  // 1) პირდაპირი ცნობილი ველები
  const direct =
    it.image_url || it.image || it.photo || it.thumbnail || it.thumb || it.cover;
  if (direct) return toAbsolute(direct);

  // 2) ნომრიანი ველები (image_url1..6, image1..6, img1..6)
  for (let i = 1; i <= 6; i++) {
    const v = it[`image_url${i}`] || it[`image${i}`] || it[`img${i}`];
    if (v) return toAbsolute(v);
  }

  // 3) მასივები (images: [...])
  if (Array.isArray(it.images) && it.images.length) {
    const first = typeof it.images[0] === 'string' ? it.images[0] : it.images[0]?.url;
    if (first) return toAbsolute(first);
  }
  if (typeof it.images === 'string') {
    try {
      const j = JSON.parse(it.images);
      if (Array.isArray(j) && j.length) {
        const first = typeof j[0] === 'string' ? j[0] : j[0]?.url;
        if (first) return toAbsolute(first);
      }
    } catch {}
  }

  // 4) ზოგადი „გასკანერებელი“ — გაიარე ყველა key და აიღე პირველი url-ს მსგავსი მნიშვნელობა
  for (const [k, v] of Object.entries(it)) {
    if (typeof v === 'string' && /(image|photo|thumb|cover)/i.test(k) && /^(https?:)?\/\//.test(v)) {
      return toAbsolute(v);
    }
  }

  // 5) ჩაშენებული product ობიექტი იგივე წესებით
  const p = it.product || {};
  const pDir =
    p.image_url || p.image || p.photo || p.thumbnail || p.thumb || p.cover;
  if (pDir) return toAbsolute(pDir);

  for (let i = 1; i <= 6; i++) {
    const v = p[`image_url${i}`] || p[`image${i}`] || p[`img${i}`];
    if (v) return toAbsolute(v);
  }
  if (Array.isArray(p.images) && p.images.length) {
    const first = typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url;
    if (first) return toAbsolute(first);
  }
  if (typeof p.images === 'string') {
    try {
      const j = JSON.parse(p.images);
      if (Array.isArray(j) && j.length) {
        const first = typeof j[0] === 'string' ? j[0] : j[0]?.url;
        if (first) return toAbsolute(first);
      }
    } catch {}
  }
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'string' && /(image|photo|thumb|cover)/i.test(k) && /^(https?:)?\/\//.test(v)) {
      return toAbsolute(v);
    }
  }

  return '';
};

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [details, setDetails] = useState({});
  const [loadingIds, setLoadingIds] = useState({});
  const [loading, setLoading] = useState(false);

  // 🔎 თარიღის ფილტრი
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const parseISOasUTC = (s) => {
    if (!s) return null;
    const hasTZ = /[zZ]|[+\-]\d{2}:\d{2}$/.test(s);
    return new Date(hasTZ ? s : s + 'Z');
  };
  const fmtDT = (v) => {
    const d = parseISOasUTC(v);
    return d ? d.toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' }) : '-';
  };

  const buildQuery = () => {
    const qs = new URLSearchParams();
    qs.set('per_page', '50');
    if (fromDate) qs.set('from', `${fromDate}T00:00:00`);
    if (toDate)   qs.set('to',   `${toDate}T23:59:59`);
    return qs.toString();
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/orders?${buildQuery()}`, {
        method: 'GET',
        headers: buildHeaders(),
        credentials: 'include',
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('სერვერის პასუხი არასწორია'); }

      if (!res.ok) throw new Error(data?.message || 'შეკვეთების წამოღება ვერ მოხერხდა');
      setOrders(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const toggleDetails = async (id) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
    if (details[id]) return;
    try {
      setLoadingIds((m) => ({ ...m, [id]: true }));
      const res = await fetch(`${API_BASE}/admin/orders/${id}`, {
        method: 'GET',
        headers: buildHeaders(),
        credentials: 'include',
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('დეტალის JSON არაა'); }
      if (!res.ok) throw new Error(data?.message || 'დეტალის წამოღება ვერ მოხერხდა');

      setDetails((d) => ({ ...d, [id]: data }));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingIds((m) => ({ ...m, [id]: false }));
    }
  };

  const onFilterSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const onReset = () => {
    setFromDate('');
    setToDate('');
    fetchOrders();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>📦 შეკვეთების ისტორია</h2>

      {/* 🔎 თარიღის ფილტრი */}
      <form onSubmit={onFilterSubmit} style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>დან</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>მდე</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button className={styles.button} type="submit">ფილტრი</button>
        <button className={styles.button} type="button" onClick={onReset}>Reset</button>
        {loading && <span style={{ marginLeft: 8 }}>იტვირთება…</span>}
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {orders.length === 0 ? (
        <p>შეკვეთები ჯერ არ არის</p>
      ) : (
        <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                <React.Fragment key={o.id || o.order_id}>
                  <tr>
                    <td>{o.order_number}</td>
                    <td>{o.status}</td>
                    <td>{fmtDT(dt)}</td>
                    <td>{o.customer?.first_name} {o.customer?.last_name}</td>
                    <td>{o.total} ₾</td>
                    <td>
                      <button onClick={() => toggleDetails(o.id)} className={styles.button} style={{ cursor: 'pointer' }}>
                        {expanded[o.id] ? 'დაფარვა' : 'დეტალები'}
                      </button>
                    </td>
                  </tr>

                  {expanded[o.id] && (
                    <tr>
                      <td colSpan={6} style={{ background: '#fafafa' }}>
                        {loadingIds[o.id] && <div>იტვირთება...</div>}
                        {!loadingIds[o.id] && details[o.id] && (() => {
                          const d = details[o.id];
                          return (
                            <div style={{ display: 'grid', gap: '12px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                  <h4>👤 კლიენტი</h4>
                                  <div>სახელი: {d.customer?.first_name} {d.customer?.last_name}</div>
                                  <div>ელფოსტა: {d.customer?.email}</div>
                                  <div>ტელეფონი: {d.customer?.phone}</div>
                                  <div>ქალაქი: {d.customer?.city}</div>
                                  <div>მისამართი: {d.customer?.address || '-'}</div>
                                </div>
                                <div>
                                  <h4>🚚 შეკვეთა</h4>
                                  <div>სტატუსი: {d.status}</div>
                                  <div>შექმნილია: {fmtDT(d.created_at)}</div>
                                  <div>გადახდილია: {fmtDT(d.paid_at)}</div>
                                  <div>მიტანის ტიპი: {d.delivery_method}</div>
                                  <div>კუპონი: {d.coupon?.code ? `${d.coupon.code} (${d.coupon.percent}% → -${d.coupon.discount}₾)` : '-'}</div>
                                  <div>გადახდა: {d.payment?.method || '-'} {d.payment?.transaction_id ? `(${d.payment.transaction_id})` : ''}</div>
                                  <div>კომენტარი: {d.comment || '-'}</div>
                                </div>
                              </div>

                              <div>
                                <h4>🧾 საქონელი</h4>
                                <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                                                alt={it.name}
                                                width="56"
                                                height="56"
                                                style={{ objectFit: 'cover', borderRadius: 8 }}
                                              />
                                            ) : (
                                              <div style={{ width: 56, height: 56, background: '#eee', borderRadius: 8 }} />
                                            )}
                                          </td>
                                          <td>{it.name}</td>
                                          <td>{it.quantity}</td>
                                          <td>{it.unit_price} ₾</td>
                                          <td>{it.sale ? `${it.sale}%` : '-'}</td>
                                          <td>{it.line_total} ₾</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div>შეკვეთის ჯამური ღირებულება: <b>{d.subtotal} ₾</b></div>
                                <div>მიტანა: <b>{d.delivery_fee} ₾</b></div>
                                <div>ფასდაკლება სულ: <b>{d.discount_total} ₾</b></div>
                                <div style={{ fontSize: 18, marginTop: 6 }}>
                                  სულ გადასახდელი: <b>{d.total} ₾</b>
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
