// src/pages/home/AddHomeImg.jsx
import React, { useEffect, useMemo, useState } from "react";
import s from "./AddHomeImg.module.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.MODE === "development")
    ? "/api"
    : (import.meta.env?.VITE_API_BASE || "https://artopia-backend-2024-54872c79acdd.herokuapp.com/");

function getAdminToken() {
  return (
    (typeof window !== "undefined" &&
      (localStorage.getItem("ADMIN_TOKEN") || sessionStorage.getItem("ADMIN_TOKEN"))) ||
    import.meta.env?.VITE_ADMIN_TOKEN ||
    ""
  );
}
function headers(extra = {}) {
  const token = (getAdminToken() || "").trim();
  return token ? { "X-Admin-Token": token, ...extra } : { ...extra };
}
async function readTextSafe(res) {
  try {
    const t = await res.text();
    return t.length > 200 ? t.slice(0, 200) + "…" : t;
  } catch { return ""; }
}

export default function AddHomeImg() {
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");

  // KA upload
  const [kaFiles, setKaFiles] = useState([]);
  const [kaActive, setKaActive] = useState(true);
  const [kaTitle, setKaTitle] = useState("");
  const [kaAlt, setKaAlt] = useState("");
  const [kaSort, setKaSort] = useState("");

  // EN upload
  const [enFiles, setEnFiles] = useState([]);
  const [enActive, setEnActive] = useState(true);
  const [enTitle, setEnTitle] = useState("");
  const [enAlt, setEnAlt] = useState("");
  const [enSort, setEnSort] = useState("");

  const [uploadingKa, setUploadingKa] = useState(false);
  const [uploadingEn, setUploadingEn] = useState(false);

  const kaItems = useMemo(() => items.filter((i) => i.lang === "ka"), [items]);
  const enItems = useMemo(() => items.filter((i) => i.lang === "en"), [items]);

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    try {
      setLoadingList(true);
      setError("");
      const res = await fetch(`${API_BASE}/home-images`, {
        headers: headers(),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`List error: ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("სიის წამოღების შეცდომა. შეამოწმე admin token და სერვერი.");
    } finally {
      setLoadingList(false);
    }
  }

  async function upload(lang, files, is_active, title, alt_text, sort_index, setUploading) {
    if (!files || !files.length) return;

    // ერთი მოთხოვნა, ერთდროულად ყველა კომპატიბილური სახელით
    const fd = new FormData();
    for (const f of files) {
      fd.append("image", f);     // single()-სთვის
      fd.append("images", f);    // array('images')-ისთვის
      fd.append("images[]", f);  // fields([{ name: 'images[]' }])-ისთვის
    }
    fd.append("lang", lang);
    if (title) fd.append("title", title);
    if (alt_text) fd.append("alt_text", alt_text);
    if (sort_index !== "" && sort_index !== null && sort_index !== undefined) {
      fd.append("sort_index", String(sort_index));
    }
    fd.append("is_active", is_active ? "true" : "false");

    try {
      setUploading(true);
      setError("");
      const res = await fetch(`${API_BASE}/home-images`, {
        method: "POST",
        headers: headers(),      // Content-Type არ ვუწერთ!
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const t = await readTextSafe(res);
        throw new Error(`Upload error ${res.status} — ${t}`);
      }
      await fetchList();
      if (lang === "ka") setKaFiles([]);
      if (lang === "en") setEnFiles([]);
    } catch (e) {
      console.error(e);
      setError(e?.message || "ატვირთვა ვერ შესრულდა. გადაამოწმე Cloudinary/სერვერი.");
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(item) {
    try {
      const payload = { is_active: !item.is_active };
      const res = await fetch(`${API_BASE}/home-images/${item.id}`, {
        method: "PUT",
        headers: { ...headers({ "Content-Type": "application/json" }) },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const t = await readTextSafe(res);
        throw new Error(`Toggle error: ${res.status}${t ? ` — ${t}` : ""}`);
      }
      await fetchList();
    } catch (e) {
      console.error(e);
      setError("აქტიურობის შეცვლა ვერ მოხერხდა.");
    }
  }

  async function deleteItem(item) {
    if (!window.confirm("წაშლა ნამდვილად გინდა?")) return;
    try {
      const res = await fetch(`${API_BASE}/home-images/${item.id}`, {
        method: "DELETE",
        headers: headers(),
        credentials: "include",
      });
      if (!res.ok) {
        const t = await readTextSafe(res);
        throw new Error(`Delete error: ${res.status}${t ? ` — ${t}` : ""}`);
      }
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (e) {
      console.error(e);
      setError("წაშლა ვერ მოხერხდა.");
    }
  }

  return (
    <div className={s.page}>
      <h1 className={s.title}>Add Home Images</h1>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.uploadGrid}>
        {/* KA */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.badgeKa}>KA</span>
            <h2 className={s.cardTitle}>ქართულ ვერსიაზე გამოსატანი ფოტოები</h2>
          </div>

          <label className={s.fileDrop}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setKaFiles(Array.from(e.target.files || []))}
            />
            {kaFiles.length ? <span>{kaFiles.length} ფაილი არჩეულია</span> : <span>დააგდე ფაილები ან დააჭირე არჩევას</span>}
          </label>

          <div className={s.row}>
            <div className={s.field}>
              <label>Title (არჩევითი)</label>
              <input value={kaTitle} onChange={(e) => setKaTitle(e.target.value)} />
            </div>
            <div className={s.field}>
              <label>Alt text (არჩევითი)</label>
              <input value={kaAlt} onChange={(e) => setKaAlt(e.target.value)} />
            </div>
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label>Sort index (არჩევითი)</label>
              <input
                type="number"
                inputMode="numeric"
                value={kaSort}
                onChange={(e) => setKaSort(e.target.value)}
                placeholder="მაგ: 10"
              />
            </div>
            <div className={s.fieldCheck}>
              <label className={s.chkLabel}>
                <input type="checkbox" checked={kaActive} onChange={(e) => setKaActive(e.target.checked)} />
                აქტიური (მთავარზე გამოჩნდეს)
              </label>
            </div>
          </div>

          <button
            className={s.primaryBtn}
            disabled={uploadingKa || !kaFiles.length}
            onClick={() => upload("ka", kaFiles, kaActive, kaTitle, kaAlt, kaSort, setUploadingKa)}
          >
            {uploadingKa ? "იტვირთება..." : "ატვირთვა (KA)"}
          </button>
        </div>

        {/* EN */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.badgeEn}>EN</span>
            <h2 className={s.cardTitle}>ინგლისურ ვერსიაზე გამოსატანი ფოტოები</h2>
          </div>

          <label className={s.fileDrop}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setEnFiles(Array.from(e.target.files || []))}
            />
            {enFiles.length ? <span>{enFiles.length} file(s) selected</span> : <span>Drag & drop or click to choose</span>}
          </label>

          <div className={s.row}>
            <div className={s.field}>
              <label>Title (optional)</label>
              <input value={enTitle} onChange={(e) => setEnTitle(e.target.value)} />
            </div>
            <div className={s.field}>
              <label>Alt text (optional)</label>
              <input value={enAlt} onChange={(e) => setEnAlt(e.target.value)} />
            </div>
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label>Sort index (optional)</label>
              <input
                type="number"
                inputMode="numeric"
                value={enSort}
                onChange={(e) => setEnSort(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div className={s.fieldCheck}>
              <label className={s.chkLabel}>
                <input type="checkbox" checked={enActive} onChange={(e) => setEnActive(e.target.checked)} />
                Active (show on homepage)
              </label>
            </div>
          </div>

          <button
            className={s.primaryBtn}
            disabled={uploadingEn || !enFiles.length}
            onClick={() => upload("en", enFiles, enActive, enTitle, enAlt, enSort, setUploadingEn)}
          >
            {uploadingEn ? "Uploading..." : "Upload (EN)"}
          </button>
        </div>
      </div>

      <div className={s.listHeader}>
        <h2>დამატებული ფოტოები</h2>
        <button className={s.ghostBtn} onClick={fetchList} disabled={loadingList}>
          {loadingList ? "ახლდება..." : "განახლება"}
        </button>
      </div>

      {/* KA list */}
      <section className={s.section}>
        <div className={s.sectionHead}>
          <span className={s.badgeKa}>KA</span>
          <h3>ქართული სია</h3>
        </div>
        <div className={s.grid}>
          {kaItems.map((it) => (
            <ImageCard key={it.id} item={it} onToggle={() => toggleActive(it)} onDelete={() => deleteItem(it)} />
          ))}
          {!kaItems.length && <div className={s.empty}>ჯერ არ არის ფოტოები.</div>}
        </div>
      </section>

      {/* EN list */}
      <section className={s.section}>
        <div className={s.sectionHead}>
          <span className={s.badgeEn}>EN</span>
          <h3>English list</h3>
        </div>
        <div className={s.grid}>
          {enItems.map((it) => (
            <ImageCard key={it.id} item={it} onToggle={() => toggleActive(it)} onDelete={() => deleteItem(it)} />
          ))}
          {!enItems.length && <div className={s.empty}>No images yet.</div>}
        </div>
      </section>
    </div>
  );
}

function ImageCard({ item, onToggle, onDelete }) {
  return (
    <div className={s.cardItem}>
      <div className={s.thumbWrap}>
        <img src={item.image_url} alt={item.alt_text || item.title || "img"} />
        <span className={item.lang === "ka" ? s.badgeKa : s.badgeEn}>{item.lang.toUpperCase()}</span>
        {!item.is_active && <span className={s.inactiveBadge}>Inactive</span>}
      </div>
      <div className={s.meta}>
        <div className={s.metaRow}><strong>ID:</strong> {item.id}</div>
        {item.title && <div className={s.metaRow}><strong>Title:</strong> {item.title}</div>}
        {item.alt_text && <div className={s.metaRow}><strong>Alt:</strong> {item.alt_text}</div>}
        <div className={s.metaRow}><strong>Sort:</strong> {item.sort_index ?? "—"}</div>
        <div className={s.actions}>
          <button className={s.toggleBtn} onClick={onToggle}>{item.is_active ? "გამორთვა" : "გააქტიურება"}</button>
          <button className={s.dangerBtn} onClick={onDelete}>წაშლა</button>
        </div>
      </div>
    </div>
  );
}
