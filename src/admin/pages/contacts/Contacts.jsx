import React, { useEffect, useState } from 'react';
import styles from './Contacts.module.css';
import { useNavigate } from 'react-router-dom';
import DebugOverlay from '../../components/DebugOverlay'; // <- ჩასვი შენი გზით, напр. "../components/DebugOverlay"

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/contacts";

const norm = (item = {}) => ({
  id: item.id,
  address: item.address ?? "",
  working_hours: item.working_hours ?? item.workingHours ?? "",
  address_en: item.address_en ?? item.addressEn ?? "",
  working_hours_en: item.working_hours_en ?? item.workingHoursEn ?? "",
  phone: item.phone ?? "",
  email: item.email ?? "",
});

const Contacts = () => {
  const navigate = useNavigate();

  // -------- DEBUG STATE --------
  const [debugOpen, setDebugOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const appendLog = (tag, msg, data) => {
    const ts = new Date().toISOString();
    setLogs(prev => [...prev, { ts, tag, msg, data }]);
  };
  const clearLogs = () => setLogs([]);

  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({
    address: "",
    working_hours: "",
    address_en: "",
    working_hours_en: "",
    phone: "",
    email: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const fetchContacts = async () => {
    try {
      appendLog("REQ", "GET /contacts");
      const res = await fetch(BASE);
      appendLog("RES", "GET /contacts status", { status: res.status });
      const data = await res.json();
      appendLog("BODY", "GET /contacts body", data);
      const arr = Array.isArray(data) ? data : [];
      setContacts(arr.map(norm));
    } catch (err) {
      console.error(err);
      setError("კონტაქტის მონაცემების წამოღება ვერ მოხერხდა.");
      appendLog("ERR", "GET /contacts failed", String(err));
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      address: form.address,
      working_hours: form.working_hours,
      address_en: form.address_en,
      working_hours_en: form.working_hours_en,
      phone: form.phone,
      email: form.email,
    };

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `${BASE}/${editingId}` : BASE;

    try {
      appendLog("REQ", `${method} ${url}`, payload);
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      appendLog("RES", `${method} ${url} status`, { status: res.status });

      let saved = null;
      try {
        saved = await res.json();
        appendLog("BODY", `${method} ${url} body`, saved);
      } catch (_) {
        appendLog("BODY", `${method} ${url} body`, "no JSON");
      }

      if (saved && typeof saved === "object") {
        const normalized = norm(saved);
        setContacts(prev => {
          if (editingId) return prev.map(it => (it.id === editingId ? normalized : it));
          return [normalized, ...prev];
        });
      } else {
        await fetchContacts();
      }

      alert(editingId ? "განახლდა!" : "დაემატა!");
      setForm({
        address: "",
        working_hours: "",
        address_en: "",
        working_hours_en: "",
        phone: "",
        email: "",
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setError("შეცდომა შენახვისას.");
      appendLog("ERR", `${method} ${url} failed`, String(err));
    }
  };

  const handleEdit = async (item) => {
    const base = norm(item);

    // თუ EN ველები არ გვაქვს სიიდან, მოვითხოვოთ /contacts/:id დეტალური
    if (!base.address_en || !base.working_hours_en) {
      try {
        appendLog("REQ", `GET ${BASE}/${item.id}`);
        const res = await fetch(`${BASE}/${item.id}`);
        appendLog("RES", `GET ${BASE}/${item.id} status`, { status: res.status });
        if (res.ok) {
          const one = await res.json();
          appendLog("BODY", `GET ${BASE}/${item.id} body`, one);
          base.address_en = base.address_en || one.address_en || one.addressEn || "";
          base.working_hours_en = base.working_hours_en || one.working_hours_en || one.workingHoursEn || "";
        }
      } catch (e) {
        appendLog("ERR", `GET ${BASE}/${item.id} failed`, String(e));
      }
    }

    setForm({
      address: base.address,
      working_hours: base.working_hours,
      address_en: base.address_en,
      working_hours_en: base.working_hours_en,
      phone: base.phone,
      email: base.email,
    });
    setEditingId(base.id);
  };

  const handleDelete = async (id) => {
    try {
      appendLog("REQ", `DELETE ${BASE}/${id}`);
      const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
      appendLog("RES", `DELETE ${BASE}/${id} status`, { status: res.status });
      await fetchContacts();
      alert("წაშლილია");
    } catch (err) {
      console.error(err);
      setError("წაშლის შეცდომა");
      appendLog("ERR", `DELETE ${BASE}/${id} failed`, String(err));
    }
  };

  return (
    <div className={styles.contactContainer}>
      <button className="goBackButton" onClick={() => navigate(-1)}>go back</button>

      {/* Floating Debug toggle */}
      <button
        type="button"
        onClick={() => setDebugOpen(true)}
        style={{
          position: "fixed", right: 12, bottom: 12, zIndex: 9999,
          background: "#111", color: "#00ff7f", border: "1px solid #00ff7f",
          borderRadius: 6, padding: "8px 10px", cursor: "pointer"
        }}
        aria-label="Open debug"
      >
        Debug
      </button>

      <h2>📞 საკონტაქტო ინფორმაცია</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit} className={styles.contactForm}>
        <div className={styles.card}>
          <h3>ქართულად</h3>
          <input name="address" placeholder="მისამართი (KA)" value={form.address} onChange={handleChange} required />
          <input name="working_hours" placeholder="სამუშაო საათები (KA)" value={form.working_hours} onChange={handleChange} required />
        </div>

        <div className={styles.card}>
          <h3>English</h3>
          <input name="address_en" placeholder="Address (EN)" value={form.address_en} onChange={handleChange} />
          <input name="working_hours_en" placeholder="Working hours (EN)" value={form.working_hours_en} onChange={handleChange} />
        </div>

        <div className={styles.card}>
          <h3>საერთო</h3>
          <input name="phone" placeholder="ტელეფონი" value={form.phone} onChange={handleChange} required />
          <input name="email" placeholder="ელ.ფოსტა" value={form.email} onChange={handleChange} required />
        </div>

        <button type="submit">{editingId ? "განახლება" : "დამატება"}</button>
      </form>

      <hr style={{ margin: "2rem 0" }} />

      {contacts.length > 0 ? (
        <ul className={styles.contactList}>
          {contacts.map((c) => (
            <li key={c.id} className={styles.contactItem}>
              <p><strong>🏠 მისამართი (KA):</strong> {c.address || "-"}</p>
              <p><strong>🏠 Address (EN):</strong> {c.address_en || "-"}</p>
              <p><strong>🕒 სამუშაო საათები (KA):</strong> {c.working_hours || "-"}</p>
              <p><strong>🕒 Working hours (EN):</strong> {c.working_hours_en || "-"}</p>
              <p><strong>📞 ტელეფონი:</strong> {c.phone || "-"}</p>
              <p><strong>✉️ ელ. ფოსტა:</strong> {c.email || "-"}</p>

              <div className={styles.actions}>
                <button className='editBtn' onClick={() => handleEdit(c)}>✏️ რედაქტირება</button>
                <button className='deleteBtn' onClick={() => handleDelete(c.id)}>🗑️ წაშლა</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>📭 კონტაქტები ჯერ არ არის დამატებული</p>
      )}

     
    </div>
  );
};

export default Contacts;
