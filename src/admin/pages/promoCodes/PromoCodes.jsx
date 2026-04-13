import React, { useEffect, useMemo, useState } from "react";
import styles from "./promoCodes.module.css";
import { Plus, Trash2, Ticket, RefreshCw } from "lucide-react";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

const PromoCodes = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("");
  const [isActive, setIsActive] = useState(true);

  const getAuthHeaders = (extra = {}) => {
    const token = localStorage.getItem("ADMIN_TOKEN");
    return {
      ...extra,
      "Authorization": `Bearer ${token}`,
    };
  };

  const normalizeCoupon = (row = {}) => ({
    id: row.id,
    code: String(row.code || "").toUpperCase(),
    percent: Number(row.percent ?? 0),
    is_active: !!row.is_active,
    usage_count: Number(row.usage_count ?? 0),
  });

  const fetchCoupons = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/promo-codes?per_page=100`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "კოდების წამოღება ვერ მოხერხდა");
      setList(Array.isArray(data.items) ? data.items.map(normalizeCoupon) : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      const res = await fetch(`${API_BASE}/promo-codes`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          percent: Number(percent),
          is_active: isActive,
          // ბექს ვაწვდით დეფოლტ მნიშვნელობებს, რომ ვალიდაციამ არ გაჭედოს
          min_subtotal: 0,
          usage_limit: null, 
        }),
      });
      if (!res.ok) throw new Error("შექმნა ვერ მოხერხდა");
      setMsg("პრომოკოდი წარმატებით დაემატა");
      setCode(""); setPercent("");
      fetchCoupons();
    } catch (e) {
      setErr(e.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("ნამდვილად გსურთ წაშლა?")) return;
    try {
      const res = await fetch(`${API_BASE}/promo-codes/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("წაშლა ვერ მოხერხდა");
      setList(prev => prev.filter(item => item.id !== id));
      setMsg("წაიშალა");
    } catch (e) {
      setErr(e.message);
    }
  };

  const sorted = useMemo(() => [...list].sort((a, b) => b.id - a.id), [list]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <Ticket size={28} className={styles.titleIcon} />
          <h2>პრომოკოდების მართვა</h2>
        </div>
        <button onClick={fetchCoupons} className={styles.refreshBtn}>
          <RefreshCw size={18} className={loading ? styles.spin : ""} />
        </button>
      </div>

      {msg && <div className={styles.alertSuccess}>{msg}</div>}
      {err && <div className={styles.alertError}>{err}</div>}

      <div className={styles.createCard}>
        <h3>ახალი კოდის დამატება</h3>
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input 
            placeholder="კოდი (მაგ: SALE20)" 
            value={code} 
            onChange={e => setCode(e.target.value)} 
            required 
          />
          <input 
            type="number" 
            placeholder="ფასდაკლება %" 
            value={percent} 
            onChange={e => setPercent(e.target.value)} 
            required 
          />
          <label className={styles.checkboxLabel}>
            <input 
              type="checkbox" 
              checked={isActive} 
              onChange={e => setIsActive(e.target.checked)} 
            />
            აქტიური
          </label>
          <button type="submit" className={styles.addBtn}><Plus size={18} /> დამატება</button>
        </form>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>კოდი</th>
              <th>ფასდაკლება</th>
              <th>სტატუსი</th>
              <th>გამოყენებულია</th>
              <th>ქმედება</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className={styles.empty}>იტვირთება...</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan="6" className={styles.empty}>კოდები არ მოიძებნა</td></tr>
            ) : sorted.map(row => (
              <tr key={row.id}>
                <td>#{row.id}</td>
                <td className={styles.codeCell}>{row.code}</td>
                <td>{row.percent}%</td>
                <td>
                  <span className={row.is_active ? styles.badgeActive : styles.badgeInactive}>
                    {row.is_active ? "აქტიური" : "პასიური"}
                  </span>
                </td>
                <td>{row.usage_count}-ჯერ</td>
                <td className={styles.actions}>
                  <button onClick={() => remove(row.id)} className={styles.deleteBtn}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PromoCodes;