import React, { useEffect, useRef, useState } from "react";
import styles from "./Blog.module.css";
import { useNavigate, useLocation } from "react-router-dom";

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/blogs";
const MAX_SECTIONS = 10;

const CLOUD_NAME = "dch8gnj7d";
const UPLOAD_PRESET = "artopia_unsigned";

async function uploadToCloudinary(file) {
  if (!file) return null;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    throw new Error("Cloudinary upload failed");
  }

  const data = await res.json();
  return data?.secure_url || null;
}

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
  const [editingId, setEditingId] = useState(editingBlog?.id || null);
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

  useEffect(() => {
    if (editingBlog?.id) {
      setEditingId(editingBlog.id);
      fetchDetail(editingBlog.id);
    }
  }, [editingBlog]);

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

      if (editingId === id) {
        setForm({ is_active: true });
        setSections([emptySection()]);
        setEditingId(null);
      }
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

  const resetForm = () => {
    setForm({ is_active: true });
    setSections([emptySection()]);
    setEditingId(null);
    setError("");
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const fd = new FormData();
    fd.append("is_active", form.is_active ? "true" : "false");

    try {
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        const pos = i + 1;

        if (s.text) {
          fd.append(`text_${pos}`, s.text);
        }

        if (s.image_file instanceof File) {
          const uploadedUrl = await uploadToCloudinary(s.image_file);
          if (uploadedUrl) {
            fd.append(`image_url_${pos}`, uploadedUrl);
          }
        } else if (s.image_preview) {
          fd.append(`image_url_${pos}`, s.image_preview);
        }
      }

      const url = editingId ? `${BASE}/${editingId}` : BASE;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, { method, body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "შეცდომა");
        return;
      }

      alert(editingId ? "განახლდა" : "დაემატა");

      resetForm();
      fetchBlogs();

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setError("სერვერის შეცდომა");
    }
  };

  const filteredBlogs = blogs.filter((b) =>
    (b.title || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ---------------- UI ---------------- */
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className="goBackButton" onClick={() => navigate(-1)}>
          უკან
        </button>
      </div>

      <div className={styles.layout}>
        <div ref={topRef} className={styles.editorColumn}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>ადმინისტრირება</p>
                <h1 className={styles.title}>
                  {editingId ? "ბლოგის რედაქტირება" : "ახალი ბლოგის დამატება"}
                </h1>
                <p className={styles.subtitle}>
                  ააწყვე სექციები ლამაზად — ტექსტით და ფოტოებით.
                </p>
              </div>

              <div className={styles.headerActions}>
                {editingId && (
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={resetForm}
                  >
                    ახალი ფორმა
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.statusRow}>
                <label className={styles.statusToggle}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                  <span className={styles.toggleSlider}></span>
                  <span className={styles.toggleText}>
                    {form.is_active ? "აქტიურია" : "არააქტიურია"}
                  </span>
                </label>

                <div className={styles.counterBox}>
                  <span>სექციები</span>
                  <strong>
                    {sections.length}/{MAX_SECTIONS}
                  </strong>
                </div>
              </div>

              <div className={styles.sectionsToolbar}>
                <div>
                  <h2 className={styles.sectionTitle}>სექციები</h2>
                  <p className={styles.sectionHint}>
                    თითო სექციას შეუძლია ჰქონდეს ტექსტი, ფოტო ან ორივე ერთად.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addSection}
                  className={styles.addSectionBtn}
                  disabled={sections.length >= MAX_SECTIONS}
                >
                  <span>＋</span> სექციის დამატება
                </button>
              </div>

              <div className={styles.sectionsGrid}>
                {sections.map((s, idx) => (
                  <div key={idx} className={styles.sectionCard}>
                    <div className={styles.sectionCardHeader}>
                      <div className={styles.sectionBadge}>სექცია #{idx + 1}</div>

                      {sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSection(idx)}
                          className={styles.removeBtn}
                          aria-label="სექციის წაშლა"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>ტექსტი</label>
                      <textarea
                        className={styles.textarea}
                        value={s.text}
                        onChange={(e) => handleTextChange(idx, e.target.value)}
                        placeholder="ჩაწერე ტექსტი..."
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>ფოტო</label>

                      {s.image_preview ? (
                        <div className={styles.imagePreviewCard}>
                          <img
                            src={s.image_preview}
                            className={styles.blogImage}
                            alt={`section-${idx + 1}`}
                          />
                        </div>
                      ) : (
                        <div className={styles.emptyImageBox}>
                          <span>ფოტო ჯერ არ არის არჩეული</span>
                        </div>
                      )}

                      <label className={styles.uploadBtn}>
                        ფოტოს არჩევა
                        <input
                          className={styles.hiddenInput}
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleImageChange(idx, e.target.files?.[0])
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.submitRow}>
                <button type="submit" className={styles.submitButton}>
                  {editingId ? "შენახვა" : "დამატება"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className={styles.listColumn}>
          <div className={styles.panel}>
            <div className={styles.listHeader}>
              <div>
                <p className={styles.eyebrow}>კონტენტი</p>
                <h2 className={styles.listTitle}>ბლოგები</h2>
              </div>

              <div className={styles.searchWrap}>
                <input
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ძებნა..."
                />
              </div>
            </div>

            {filteredBlogs.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>ბლოგები ვერ მოიძებნა</h3>
                <p>სცადე სხვა საძიებო სიტყვა ან დაამატე ახალი ბლოგი.</p>
              </div>
            ) : (
              <div className={styles.blogList}>
                {filteredBlogs.map((b) => (
                  <div key={b.id} className={styles.blogItem}>
                    <div className={styles.blogInfo}>
                      <div className={styles.blogTopRow}>
                        <h3 className={styles.blogName}>
                          {b.title || `ბლოგი #${b.id}`}
                        </h3>

                        <span
                          className={`${styles.statusPill} ${
                            b.is_active ? styles.activePill : styles.inactivePill
                          }`}
                        >
                          {b.is_active ? "აქტიური" : "გამორთული"}
                        </span>
                      </div>

                      <div className={styles.blogMeta}>
                        <span>ID: {b.id}</span>
                        {b.created_at && (
                          <span>
                            დამატებულია: {new Date(b.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {b.cover_image && (
                        <div className={styles.coverWrap}>
                          <img
                            src={b.cover_image}
                            alt={b.title || "blog cover"}
                            className={styles.coverImage}
                          />
                        </div>
                      )}
                    </div>

                    <div className={styles.actions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => handleEdit(b)}
                      >
                        რედაქტირება
                      </button>

                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(b.id)}
                      >
                        წაშლა
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}