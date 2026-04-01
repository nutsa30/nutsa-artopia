import React, { useEffect, useRef, useState } from "react";
import styles from "./Blog.module.css";
import { useNavigate, useLocation } from "react-router-dom";

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/blogs";
const MAX_SECTIONS = 10;

const emptySection = () => ({
  text: "",
  image_file: null,
  image_preview: null,
});

export default function Blog() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingBlog = location.state?.blog || null;

  const topRef = useRef(null);

  const [form, setForm] = useState({
    is_active: true,
  });

  const [sections, setSections] = useState([emptySection()]);
  const [blogs, setBlogs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  /* ---------------- FETCH LIST ---------------- */
  const fetchBlogs = async () => {
    try {
      const res = await fetch(BASE);
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
    } catch {
      setBlogs([]);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  /* ---------------- FETCH DETAIL ---------------- */
  const fetchDetail = async (id) => {
    try {
      const res = await fetch(`${BASE}/${id}`);
      if (!res.ok) return;
      const data = await res.json();

      setForm({
        is_active: data.is_active ?? true,
      });

      const normalized =
        data.sections?.map((s) => ({
          text: s.text || "",
          image_file: null,
          image_preview: s.image_url || null,
        })) || [];

      setSections(normalized.length ? normalized : [emptySection()]);
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------- EDIT ---------------- */
  const handleEdit = async (b) => {
    setEditingId(b.id);
    await fetchDetail(b.id);

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("დარწმუნებული ხარ?")) return;

    try {
      await fetch(`${BASE}/${id}`, { method: "DELETE" });
      fetchBlogs();
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------- FORM ---------------- */
  const handleChange = (e) => {
    const { name, checked } = e.target;
    setForm((f) => ({ ...f, [name]: checked }));
  };

  const handleTextChange = (idx, value) => {
    setSections((arr) =>
      arr.map((s, i) => (i === idx ? { ...s, text: value } : s))
    );
  };

  const handleImageChange = (idx, file) => {
    if (!file) return;

    const preview = URL.createObjectURL(file);

    setSections((arr) =>
      arr.map((s, i) =>
        i === idx
          ? {
              ...s,
              image_file: file,
              image_preview: preview,
            }
          : s
      )
    );
  };

  const addSection = () => {
    if (sections.length >= MAX_SECTIONS) return;
    setSections((arr) => [...arr, emptySection()]);
  };

  const removeSection = (idx) => {
    setSections((arr) => arr.filter((_, i) => i !== idx));
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const fd = new FormData();
    fd.append("is_active", form.is_active ? "true" : "false");

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const pos = i + 1;

      if (s.text) {
        fd.append(`text_${pos}`, s.text);
      }

      if (s.image_file instanceof File) {
        fd.append(`image_${pos}`, s.image_file);
      } else if (s.image_preview) {
        fd.append(`image_url_${pos}`, s.image_preview);
      }
    }

    const url = editingId ? `${BASE}/${editingId}` : BASE;
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "შეცდომა");
        return;
      }

      alert(editingId ? "განახლდა" : "დაემატა");

      setForm({ is_active: true });
      setSections([emptySection()]);
      setEditingId(null);

      fetchBlogs();

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setError("სერვერის შეცდომა");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <button className="goBackButton" onClick={() => navigate(-1)}>
        უკან
      </button>

      <div ref={topRef} className={styles.blogContainer}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2>{editingId ? "რედაქტირება" : "დამატება"}</h2>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
            />
            აქტიურია
          </label>

          <div className={styles.sectionsHead}>
            <h3>სექციები</h3>
            <button type="button" onClick={addSection}>
              +
            </button>
          </div>

          {sections.map((s, idx) => (
            <div key={idx} className={styles.sectionCard}>
              <strong>#{idx + 1}</strong>

              <textarea
                value={s.text}
                onChange={(e) => handleTextChange(idx, e.target.value)}
                placeholder="ტექსტი"
              />

              {s.image_preview && (
                <img src={s.image_preview} className={styles.blogImage} />
              )}

              <input
                type="file"
                onChange={(e) =>
                  handleImageChange(idx, e.target.files?.[0])
                }
              />

              {sections.length > 1 && (
                <button type="button" onClick={() => removeSection(idx)}>
                  ✕
                </button>
              )}
            </div>
          ))}

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit">
            {editingId ? "შენახვა" : "დამატება"}
          </button>
        </form>
      </div>

      {/* LIST */}
      <div style={{ padding: 20 }}>
        <h2>ბლოგები</h2>

        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ძებნა..."
        />

        <ul>
          {blogs
            .filter((b) =>
              (b.title || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
            )
            .map((b) => (
              <li key={b.id}>
                <strong>{b.title}</strong>

                {b.cover_image && (
                  <img src={b.cover_image} width={100} />
                )}

                <button onClick={() => handleEdit(b)}>edit</button>
                <button onClick={() => handleDelete(b.id)}>delete</button>
              </li>
            ))}
        </ul>
      </div>
    </>
  );
}