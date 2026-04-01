import React, { useEffect, useState } from "react";
import s from "./AddHomeImg.module.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.MODE === "development")
    ? "/api"
    : (import.meta.env?.VITE_API_BASE ||
        "https://artopia-backend-2024-54872c79acdd.herokuapp.com");

function getAdminToken() {
  return (
    (typeof window !== "undefined" &&
      (localStorage.getItem("ADMIN_TOKEN") ||
        sessionStorage.getItem("ADMIN_TOKEN"))) ||
    import.meta.env?.VITE_ADMIN_TOKEN ||
    ""
  );
}

function headers(extra = {}) {
  const token = (getAdminToken() || "").trim();
  return token ? { "X-Admin-Token": token, ...extra } : { ...extra };
}

export default function AddHomeImg() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [sortIndex, setSortIndex] = useState("");
  const [isActive, setIsActive] = useState(true);

  /* ---------------- FETCH ---------------- */
  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/home-images`, {
        headers: headers(),
        credentials: "include",
      });

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("სიის წამოღების შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  /* ---------------- UPLOAD ---------------- */
  const handleUpload = async () => {
    if (!files.length) return;

    const fd = new FormData();

    for (const f of files) {
      fd.append("images", f);
    }

    if (title) fd.append("title", title);
    if (alt) fd.append("alt_text", alt);
    if (sortIndex !== "") fd.append("sort_index", sortIndex);
    fd.append("is_active", isActive ? "true" : "false");

    try {
      const res = await fetch(`${API_BASE}/home-images`, {
        method: "POST",
        headers: headers(),
        body: fd,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Upload failed");

      await fetchList();

      setFiles([]);
      setTitle("");
      setAlt("");
      setSortIndex("");
      setIsActive(true);
    } catch (err) {
      console.error(err);
      setError("ატვირთვის შეცდომა");
    }
  };

  /* ---------------- TOGGLE ---------------- */
  const toggleActive = async (item) => {
    try {
      await fetch(`${API_BASE}/home-images/${item.id}`, {
        method: "PUT",
        headers: { ...headers({ "Content-Type": "application/json" }) },
        body: JSON.stringify({ is_active: !item.is_active }),
        credentials: "include",
      });

      fetchList();
    } catch (err) {
      console.error(err);
      setError("აქტიურობის შეცვლა ვერ მოხერხდა");
    }
  };

  /* ---------------- DELETE ---------------- */
  const deleteItem = async (item) => {
    if (!window.confirm("წაშლა ნამდვილად გინდა?")) return;

    try {
      await fetch(`${API_BASE}/home-images/${item.id}`, {
        method: "DELETE",
        headers: headers(),
        credentials: "include",
      });

      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      console.error(err);
      setError("წაშლა ვერ მოხერხდა");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className={s.page}>
      <h1 className={s.title}>მთავარი სურათები</h1>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.card}>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />

        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder="Alt text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
        />

        <input
          type="number"
          placeholder="Sort index"
          value={sortIndex}
          onChange={(e) => setSortIndex(e.target.value)}
        />

        <label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          აქტიური
        </label>

        <button onClick={handleUpload}>
          ატვირთვა
        </button>
      </div>

      <hr />

      <div className={s.grid}>
        {items.map((it) => (
          <div key={it.id} className={s.cardItem}>
            <img src={it.image_url} alt={it.alt_text || ""} />

            <div>
              {it.title && <p>{it.title}</p>}
              <p>Sort: {it.sort_index ?? "-"}</p>
              {!it.is_active && <span>Inactive</span>}
            </div>

            <button onClick={() => toggleActive(it)}>
              {it.is_active ? "გამორთვა" : "გააქტიურება"}
            </button>

            <button onClick={() => deleteItem(it)}>
              წაშლა
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}