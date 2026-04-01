import React, { useEffect, useState } from "react";
import styles from "./Contacts.module.css";
import { useNavigate } from "react-router-dom";

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/contacts";

const Contacts = () => {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({
    address: "",
    working_hours: "",
    phone: "",
    email: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  /* ---------------- FETCH ---------------- */
  const fetchContacts = async () => {
    try {
      const res = await fetch(BASE);
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("კონტაქტის მონაცემების წამოღება ვერ მოხერხდა.");
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  /* ---------------- FORM ---------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      address: form.address,
      working_hours: form.working_hours,
      phone: form.phone,
      email: form.email,
    };

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `${BASE}/${editingId}` : BASE;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "შეცდომა");
        return;
      }

      if (editingId) {
        setContacts((prev) =>
          prev.map((c) => (c.id === editingId ? data : c))
        );
      } else {
        setContacts((prev) => [data, ...prev]);
      }

      alert(editingId ? "განახლდა!" : "დაემატა!");

      setForm({
        address: "",
        working_hours: "",
        phone: "",
        email: "",
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setError("შეცდომა შენახვისას.");
    }
  };

  /* ---------------- EDIT ---------------- */
  const handleEdit = (c) => {
    setForm({
      address: c.address || "",
      working_hours: c.working_hours || "",
      phone: c.phone || "",
      email: c.email || "",
    });
    setEditingId(c.id);
  };

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("დარწმუნებული ხარ?")) return;

    try {
      await fetch(`${BASE}/${id}`, { method: "DELETE" });
      setContacts((prev) => prev.filter((c) => c.id !== id));
      alert("წაშლილია");
    } catch (err) {
      console.error(err);
      setError("წაშლის შეცდომა");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className={styles.contactContainer}>
      <button className="goBackButton" onClick={() => navigate(-1)}>
        უკან
      </button>

      <h2>📞 საკონტაქტო ინფორმაცია</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit} className={styles.contactForm}>
        <div className={styles.card}>
          <input
            name="address"
            placeholder="მისამართი"
            value={form.address}
            onChange={handleChange}
            required
          />

          <input
            name="working_hours"
            placeholder="სამუშაო საათები"
            value={form.working_hours}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.card}>
          <input
            name="phone"
            placeholder="ტელეფონი"
            value={form.phone}
            onChange={handleChange}
            required
          />

          <input
            name="email"
            placeholder="ელ.ფოსტა"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit">
          {editingId ? "განახლება" : "დამატება"}
        </button>
      </form>

      <hr style={{ margin: "2rem 0" }} />

      {contacts.length > 0 ? (
        <ul className={styles.contactList}>
          {contacts.map((c) => (
            <li key={c.id} className={styles.contactItem}>
              <p><strong>🏠 მისამართი:</strong> {c.address || "-"}</p>
              <p><strong>🕒 სამუშაო საათები:</strong> {c.working_hours || "-"}</p>
              <p><strong>📞 ტელეფონი:</strong> {c.phone || "-"}</p>
              <p><strong>✉️ ელ. ფოსტა:</strong> {c.email || "-"}</p>

              <div className={styles.actions}>
                <button className="editBtn" onClick={() => handleEdit(c)}>
                  ✏️ რედაქტირება
                </button>
                <button className="deleteBtn" onClick={() => handleDelete(c.id)}>
                  🗑️ წაშლა
                </button>
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