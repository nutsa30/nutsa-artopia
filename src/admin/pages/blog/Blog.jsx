// src/pages/Blog.jsx
import React, { useEffect, useRef, useState } from "react";
import styles from "./Blog.module.css";
import { useNavigate, useLocation } from "react-router-dom";

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/blogs";
const MAX_SECTIONS = 10;

/* ---------- Cloudinary env (უსაფრთხო წაკითხვა) ---------- */
const CLOUD_NAME =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_CLOUDINARY_CLOUD_NAME) ||
  (typeof window !== "undefined" &&
    window.__ENV__ &&
    window.__ENV__.VITE_CLOUDINARY_CLOUD_NAME) ||
  "dch8gnj7d";

const UPLOAD_PRESET =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET) ||
  (typeof window !== "undefined" &&
    window.__ENV__ &&
    window.__ENV__.VITE_CLOUDINARY_UPLOAD_PRESET) ||
  "artopia_unsigned";

/* სურვილისამებრ — პირდაპირ Cloudinary-ზე ატვირთვის helper */
async function uploadToCloudinary(file) {
  if (!file) return null;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: fd,
  });
  const { secure_url } = await r.json();
  return secure_url || null;
}

const emptySection = () => ({
  text_ka: "",
  text_en: "",
  image_ka_file: null,
  image_en_file: null,
  image_ka_preview: null,
  image_en_preview: null,
});

export default function Blog() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingBlog = location.state?.blog || null;

  // 🔝 scroll anchor (იგივე, რაც პროდუქტის გვერდზე გაქვს)
  const topRef = useRef(null);

  const [form, setForm] = useState({
    title_ka: "",
    title_en: "",
    slug_ka: "",
    slug_en: "",
    is_active: true,
  });

  const [sections, setSections] = useState([emptySection()]);
  const [blogs, setBlogs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [debugDetail, setDebugDetail] = useState(null);

  /* ------------------------- Helpers ------------------------- */

  // detail წამოღება ენით
  const fetchDetail = async (id, lang) => {
    try {
      const url = `${BASE}/${id}?lang=${lang}`;
      const r = await fetch(url);
      if (!r.ok) throw 0;
      const json = await r.json();
      return json;
    } catch (e) {
      return null;
    }
  };

  // sections ნორმალიზაცია (აიღებს ან Array-ს, ან ბრტყელ ველებს)
  const normalizeSections = (obj, lang /* "ka" | "en" */) => {
    if (!obj) return [];

    // 1) canonical: { blocks: [{ kind, text?, image_url?, position }, ...] }
    if (Array.isArray(obj.blocks)) {
      const grouped = {};
      for (const b of obj.blocks) {
        const pos = b?.position ?? 1;
        if (!grouped[pos]) grouped[pos] = {};
        if (b?.kind === "text") grouped[pos].text = b?.text ?? "";
        if (b?.kind === "image") grouped[pos].image_url = b?.image_url ?? null;
      }
      return Object.keys(grouped)
        .map((i) => Number(i))
        .sort((a, b) => a - b)
        .map((i) => ({
          text: grouped[i].text ?? "",
          image_url: grouped[i].image_url ?? null,
        }));
    }

    // 2) canonical: { sections: [{ text, image_url }, ...] }
    if (Array.isArray(obj.sections)) {
      return obj.sections.map((s) => ({
        text: s?.text ?? "",
        image_url: s?.image_url ?? s?.image ?? null,
      }));
    }

    // 3) flat fields...
    const rows = {};
    const add = (idx, key, val) => {
      const i = Number(idx);
      if (!rows[i]) rows[i] = {};
      rows[i][key] = val;
    };

    const entries = Object.entries(obj);
    const reText = new RegExp(`^text(?:_${lang})?_(\\d+)$`, "i");
    const reImg = new RegExp(
      `^(?:image_url|image|photo)(?:_${lang})?_(\\d+)$`,
      "i"
    );
    const reSecText = new RegExp(`^section(\\d+)_text(?:_${lang})?$`, "i");
    const reSecImg = new RegExp(`^section(\\d+)_image(?:_${lang})?$`, "i");

    for (const [k, v] of entries) {
      let m = k.match(reText);
      if (m) {
        add(m[1], "text", v ?? "");
        continue;
      }
      m = k.match(reImg);
      if (m) {
        add(m[1], "image_url", v ?? null);
        continue;
      }
      m = k.match(reSecText);
      if (m) {
        add(m[1], "text", v ?? "");
        continue;
      }
      m = k.match(reSecImg);
      if (m) {
        add(m[1], "image_url", v ?? null);
      }
    }

    return Object.keys(rows)
      .map((i) => Number(i))
      .sort((a, b) => a - b)
      .map((i) => ({
        text: rows[i].text ?? "",
        image_url: rows[i].image_url ?? null,
      }));
  };

  /* ------------------------- List ------------------------- */

  const fetchBlogs = async () => {
    try {
      const res = await fetch(`${BASE}?lang=ka`);
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ბლოგების წაკითხვის შეცდომა:", err);
      setBlogs([]);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  /* ------------------------- Prefill via location.state ------------------------- */

  useEffect(() => {
    if (!editingBlog) return;
    setEditingId(editingBlog.id);
    fetchBlogDetail(editingBlog.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBlog]);

  /* ------------------------- Detail merge KA+EN ------------------------- */

  const fetchBlogDetail = async (id) => {
    try {
      const [ka, en] = await Promise.all([
        fetchDetail(id, "ka"),
        fetchDetail(id, "en"),
      ]);

      // დროებითი დებაგ-ობიექტი UI-ში სანახავად
      setDebugDetail({ ka, en });

      // სათაურები/სლაგები
      setForm({
        title_ka: ka?.title || "",
        title_en: en?.title || "",
        slug_ka: ka?.slug || "",
        slug_en: en?.slug || "",
        is_active: ka?.is_active !== false,
      });

      // სექციები
      const kaSecs = normalizeSections(ka, "ka");
      const enSecs = normalizeSections(en, "en");

      const maxLen = Math.min(
        Math.max(kaSecs.length, enSecs.length, 1),
        MAX_SECTIONS
      );

      const merged = [];
      for (let i = 0; i < maxLen; i++) {
        const k = kaSecs[i] || {};
        const e = enSecs[i] || {};
        merged.push({
          text_ka: k.text || "",
          text_en: e.text || "",
          image_ka_file: null,
          image_en_file: null,
          image_ka_preview: k.image_url || null,
          image_en_preview: e.image_url || null,
        });
      }

      setSections(merged.length ? merged : [emptySection()]);
    } catch (err) {
      console.error("detail load failed:", err);
      setSections([emptySection()]);
    }
  };

  /* ------------------------- Scroll helper (ProductsPage-ის იდენტური) ------------------------- */

  const scrollToTop = () => {
    const scroller =
      document.scrollingElement || document.documentElement || document.body;

    // თუ გაქვს fixed navbar .tabbar — ავკომპენსიროთ
    const navH =
      document.querySelector(".tabbar")?.getBoundingClientRect().height || 0;

    const y =
      (topRef.current
        ? topRef.current.getBoundingClientRect().top + window.scrollY
        : 0) - navH - 8;

    scroller.scrollTo({ top: Math.max(0, y), behavior: "smooth" });

    // ფოლბექები
    if (topRef.current?.scrollIntoView) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  /* ------------------------- Handlers ------------------------- */

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? !!checked : value }));
  };

  const addSection = () => {
    if (sections.length >= MAX_SECTIONS) return;
    setSections((arr) => [...arr, emptySection()]);
  };

  const removeSection = (idx) => {
    setSections((arr) => arr.filter((_, i) => i !== idx));
  };

  const handleTextChange = (idx, key, value) => {
    setSections((arr) =>
      arr.map((s, i) => (i === idx ? { ...s, [key]: value } : s))
    );
  };

  const handleImageChange = (idx, which, file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setSections((arr) =>
      arr.map((s, i) =>
        i === idx
          ? {
              ...s,
              [which === "ka" ? "image_ka_file" : "image_en_file"]: file,
              [which === "ka" ? "image_ka_preview" : "image_en_preview"]: preview,
            }
          : s
      )
    );
  };

  // helper: URL -> File (რედაქტირებაზე ძველი სურათის „გადაბრუნებისთვის“)
  const urlToFile = async (url, filenameBase) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const extGuess = (blob.type && blob.type.split("/")[1]) || "jpg";
    const name =
      filenameBase && !filenameBase.endsWith(`.${extGuess}`)
        ? `${filenameBase}.${extGuess}`
        : filenameBase || `image.${extGuess}`;
    return new File([blob], name, { type: blob.type || "image/jpeg" });
  };

  /* ------------------------- Submit ------------------------- */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const fd = new FormData();
    fd.append("title_ka", form.title_ka || "");
    if (form.title_en) fd.append("title_en", form.title_en);
    if (form.slug_ka) fd.append("slug_ka", form.slug_ka);
    if (form.slug_en) fd.append("slug_en", form.slug_en);
    fd.append("is_active", form.is_active ? "true" : "false");

    // ვიყენებთ for-ციკლს, რომ await შეგვეძლოს
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const pos = i + 1;

      // ტექსტები
      if (s.text_ka) fd.append(`text_ka_${pos}`, s.text_ka);
      if (s.text_en) fd.append(`text_en_${pos}`, s.text_en);

      // KA სურათი
      if (s.image_ka_file instanceof File) {
        fd.append(`image_ka_${pos}`, s.image_ka_file);
      } else if (s.image_ka_preview && /^https?:\/\//.test(String(s.image_ka_preview))) {
        try {
          const file = await urlToFile(s.image_ka_preview, `ka_${pos}`);
          fd.append(`image_ka_${pos}`, file);
        } catch (err) {
          fd.append(`image_url_ka_${pos}`, s.image_ka_preview);
        }
      }

      // EN სურათი
      if (s.image_en_file instanceof File) {
        fd.append(`image_en_${pos}`, s.image_en_file);
      } else if (s.image_en_preview && /^https?:\/\//.test(String(s.image_en_preview))) {
        try {
          const file = await urlToFile(s.image_en_preview, `en_${pos}`);
          fd.append(`image_en_${pos}`, file);
        } catch (err) {
          fd.append(`image_url_en_${pos}`, s.image_en_preview);
        }
      }
    }

    const url = editingId ? `${BASE}/${editingId}` : BASE;
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || data?.error || "ბლოგის დამუშავების შეცდომა");
        return;
      }
      alert(editingId ? "✅ ბლოგი განახლდა!" : "✅ ბლოგი დაემატა!");
      setForm({
        title_ka: "",
        title_en: "",
        slug_ka: "",
        slug_en: "",
        is_active: true,
      });
      setSections([emptySection()]);
      setEditingId(null);
      fetchBlogs();

      // სურვილისამებრ: შენახვის შემდეგაც ავიდეთ თავში
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToTop);
      });
    } catch (err) {
      console.error(err);
      setError("სერვერთან კავშირის პრობლემა");
    }
  };

  // ✅ რედაქტირებაზე ზემოთ ასვლა ProductsPage-ის მსგავსი ლოგიკით
  const handleEdit = async (b) => {
    setEditingId(b.id);
    await fetchBlogDetail(b.id); // KA+EN detail ჩამოიტვირთოს
    // ორჯერ RAF — ჯერ DOM განახლდეს, მერე თავში ასქროლდეს
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToTop);
    });
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${BASE}/${id}`, { method: "DELETE" });
      fetchBlogs();
    } catch (err) {
      console.error("ბლოგის წაშლა ვერ მოხერხდა:", err);
    }
  };

  // KA/EN სექციების გაერთიანება ლისტისთვის (იყენებს normalizeSections-ს)
  const sectionsForList = (obj) => {
    const ka = normalizeSections(obj, "ka");
    const en = normalizeSections(obj, "en");
    const max = Math.max(ka.length, en.length);
    const out = [];
    for (let i = 0; i < max; i++) {
      out.push({
        text_ka: ka[i]?.text || "",
        image_ka: ka[i]?.image_url || null,
        text_en: en[i]?.text || "",
        image_en: en[i]?.image_url || null,
      });
    }
    return out;
  };

  // ინლაინ სტილი პატარა სექცია-ბარათებისთვის
  const SEC = {
    grid: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
    },
    card: {
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      padding: 8,
      minWidth: 180,
      maxWidth: 260,
      background: "#fff",
    },
    images: { display: "flex", gap: 6, marginBottom: 6 },
    img: {
      width: 56,
      height: 56,
      objectFit: "cover",
      borderRadius: 6,
      border: "1px solid #e5e7eb",
    },
    noimg: {
      width: 56,
      height: 56,
      borderRadius: 6,
      border: "1px dashed #e5e7eb",
      color: "#9ca3af",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      background: "#fafafa",
    },
    text: { fontSize: 12, color: "#374151", lineHeight: 1.3, maxHeight: 52, overflow: "hidden" },
  };

  /* ------------------------- UI ------------------------- */

  return (
    <>
      <button className="goBackButton" onClick={() => navigate(-1)}>
        go back
      </button>

      <div ref={topRef} className={styles.blogContainer}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2>📝 {editingId ? "ბლოგის რედაქტირება" : "ბლოგის დამატება"}</h2>

          <label className={styles.label}>სათაური (KA)*</label>
          <input
            type="text"
            name="title_ka"
            value={form.title_ka}
            onChange={handleChange}
            required
            className={styles.input}
            placeholder="ქართული სათაური"
          />

          <label className={styles.label}>Title (EN)</label>
          <input
            type="text"
            name="title_en"
            value={form.title_en}
            onChange={handleChange}
            className={styles.input}
            placeholder="English title"
          />

          <label className={styles.label}>Slug (KA)</label>
          <input
            type="text"
            name="slug_ka"
            value={form.slug_ka}
            onChange={handleChange}
            className={styles.input}
            placeholder="slug-ka"
          />

          <label className={styles.label}>Slug (EN)</label>
          <input
            type="text"
            name="slug_en"
            value={form.slug_en}
            onChange={handleChange}
            className={styles.input}
            placeholder="slug-en"
          />

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
            />
            აქტიურია?
          </label>

          <div className={styles.sectionsHead}>
            <h3>სექციები (მაქს. {MAX_SECTIONS})</h3>
            <button type="button" className={styles.addBtn} onClick={addSection}>
              + სექციის დამატება
            </button>
          </div>

          {sections.map((s, idx) => (
            <div key={idx} className={styles.sectionCard}>
              <div className={styles.sectionTop}>
                <strong>#{idx + 1}</strong>
                {sections.length > 1 && (
                  <button
                    type="button"
                    className={styles.x}
                    onClick={() => removeSection(idx)}
                    aria-label="remove"
                  >
                    ✕
                  </button>
                )}
              </div>

              <label className={styles.smallLbl}>ტექსტი (KA)</label>
              <textarea
                value={s.text_ka}
                onChange={(e) => handleTextChange(idx, "text_ka", e.target.value)}
                className={styles.textarea}
                placeholder="ქართული ტექსტი"
              />

              <label className={styles.smallLbl}>Text (EN)</label>
              <textarea
                value={s.text_en}
                onChange={(e) => handleTextChange(idx, "text_en", e.target.value)}
                className={styles.textarea}
                placeholder="English text"
              />

              <div className={styles.row}>
                <div className={styles.col}>
                  <div className={styles.smallLbl}>ფოტო (KA)</div>
                  {s.image_ka_preview ? (
                    <img
                      src={s.image_ka_preview}
                      alt={`ka-${idx}`}
                      className={styles.blogImage}
                    />
                  ) : (
                    <div className={styles.noImg}>no image</div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(idx, "ka", e.target.files?.[0] || null)
                    }
                  />
                </div>

                <div className={styles.col}>
                  <div className={styles.smallLbl}>Photo (EN)</div>
                  {s.image_en_preview ? (
                    <img
                      src={s.image_en_preview}
                      alt={`en-${idx}`}
                      className={styles.blogImage}
                    />
                  ) : (
                    <div className={styles.noImg}>no image</div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(idx, "en", e.target.files?.[0] || null)
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitButton}>
            {editingId ? "განახლება" : "დამატება"}
          </button>
        </form>
      </div>

      {/* ბლოგების სია */}
      <div style={{ padding: "2rem" }}>
        <h2>📚 ბლოგების სია</h2>

        <input
          type="text"
          placeholder="ძებნა სათაურით..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />

        <ul className={styles.blogList}>
          {blogs
            .filter((b) =>
              (b.title || "").toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((b) => (
              <li key={b.id} className={styles.blogItem}>
                <div className={styles.blogInfo}>
                  <strong>{b.title}</strong>
                  {b.excerpt ? <p>{b.excerpt}</p> : null}
                  {b.cover_image ? (
                    <img
                      src={b.cover_image}
                      alt={`${b.title}-cover`}
                      className={styles.blogImage}
                    />
                  ) : null}

                  {/* სექციები ფოტოებიანად (KA/EN) */}
                  {(() => {
                    const secs = sectionsForList(b);
                    if (!secs.length) return null;
                    return (
                      <div style={SEC.grid}>
                        {secs.map((s, i) => (
                          <div key={i} style={SEC.card}>
                            <div style={SEC.images}>
                              {s.image_ka && <img src={s.image_ka} alt={`ka-${i}`} style={SEC.img} />}
                              {s.image_en && <img src={s.image_en} alt={`en-${i}`} style={SEC.img} />}
                              {!s.image_ka && !s.image_en && <div style={SEC.noimg}>—</div>}
                            </div>
                            {(s.text_ka || s.text_en) && (
                              <div style={SEC.text}>{(s.text_ka || s.text_en).slice(0, 120)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className={styles.actions}>
                  <button onClick={() => handleEdit(b)} className="editBtn">
                    ✏️ რედაქტირება
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="deleteBtn">
                    🗑️ წაშლა
                  </button>
                </div>
              </li>
            ))}
        </ul>
      </div>
    </>
  );
}
