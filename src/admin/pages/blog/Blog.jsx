import React, { useEffect, useRef, useState } from "react";
import styles from "./Blog.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],   // სათაურები
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }], // ფერები
    [{ size: ["small", false, "large", "huge"] }], // ზომა
    [{ list: "ordered" }, { list: "bullet" }], // სიები
    ["link"],
    ["clean"] // clear formatting
  ]
};
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
const DEFAULT_FORM = {
  title: "",
  description: "",
  keywords: "",
  cover_image: "",
  is_active: true,
};

const DEFAULT_MANUAL = {
  title: false,
  slug: false,
  meta_title: false,
  meta_description: false,
  keywords: false,
  cover_image: false,
  og_title: false,
  og_description: false,
  og_image: false,
  canonical_url: false,
};

const FIELD_HELP = {
  is_active: "თუ ჩართულია, ბლოგი გამოჩნდება საიტზე. თუ გამორთულია, დარჩება მხოლოდ ადმინისთვის.",
  title: "ბლოგის მთავარი სათაური. თუ არ შეავსებ, შეიძლება პირველი სექციის ტექსტიდან შეივსოს ავტომატურად.",
  slug: "URL-ის ბოლო ნაწილი. შეგიძლია არ ჩაწერო — სათაურიდან დაგენერირდება preview.",
  meta_title: "SEO სათაური Google-ისთვის. თუ ცარიელია, სათაურის მიხედვით შეივსება preview.",
  meta_description: "მოკლე SEO აღწერა. თუ ცარიელია, პირველი ტექსტიდან შეიქმნება preview.",
  keywords: "საკვანძო სიტყვები მძიმეებით გამოყოფილი. მაგალითად: ხელნაკეთი, დეკორი, საჩუქარი.",
  cover_image: "ბლოგის მთავარი cover სურათი. თუ ცარიელია, პირველი section-ის ფოტოს გამოვიყენებთ preview-ად.",
  og_title: "სათაური Facebook/LinkedIn share-ისთვის. თუ არ ჩაწერ, meta title/title-დან შეივსება preview.",
  og_description: "აღწერა share-ისთვის. თუ არ ჩაწერ, meta description-იდან შეივსება preview.",
  og_image: "სურათი share-ისთვის. თუ ცარიელია, cover image-ის preview გამოვიყენებთ.",
  canonical_url: "ბლოგის ოფიციალური canonical URL. ეს ველი ჯობს ხელით შეავსო მხოლოდ მაშინ, როცა ზუსტად იცი public URL.",
  section_text: "ამ სექციის ტექსტი. თუ ეს პირველი ტექსტიანი სექციაა, მისგან შეიძლება title/meta description preview შეიქმნას.",
  section_image: "ამ სექციის ფოტო. თუ ეს პირველი ფოტოიანი სექციაა, მისგან შეიძლება cover/og image preview შეიქმნას.",
};

const GEO_MAP = {
  "ა": "a", "ბ": "b", "გ": "g", "დ": "d", "ე": "e",
  "ვ": "v", "ზ": "z", "თ": "t", "ი": "i", "კ": "k",
  "ლ": "l", "მ": "m", "ნ": "n", "ო": "o", "პ": "p",
  "ჟ": "zh", "რ": "r", "ს": "s", "ტ": "t", "უ": "u",
  "ფ": "f", "ქ": "q", "ღ": "gh", "ყ": "y", "შ": "sh",
  "ჩ": "ch", "ც": "ts", "ძ": "dz", "წ": "w", "ჭ": "ch",
  "ხ": "kh", "ჯ": "j", "ჰ": "h",
};

function trimTo(val, max) {
  return (val || "").trim().slice(0, max);
}


function getFirstSectionText(sections) {
  const item = sections.find((s) => (s.text || "").trim());
  return item ? item.text.trim() : "";
}

function getFirstSectionImage(sections) {
  const item = sections.find((s) => s.image_preview);
  return item?.image_preview || "";
}
export default function Blog() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingBlog = location.state?.blog || null;

  const topRef = useRef(null);
  const [seoData, setSeoData] = useState(null);

const [form, setForm] = useState(DEFAULT_FORM);
const [manual, setManual] = useState(DEFAULT_MANUAL);
const [pinnedTooltip, setPinnedTooltip] = useState(null);
const [hoveredTooltip, setHoveredTooltip] = useState(null);
const tooltipRefs = useRef({});
  const [sections, setSections] = useState([emptySection()]);
  const [blogs, setBlogs] = useState([]);
  const [editingId, setEditingId] = useState(editingBlog?.id || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [coverFile, setCoverFile] = useState(null);
const [coverPreview, setCoverPreview] = useState(null);
const firstSectionText = getFirstSectionText(sections);
const firstSectionImage = getFirstSectionImage(sections);

const resolvedTitle = (form.title || "").trim() || trimTo(firstSectionText, 255);
const resolvedCoverImage =
  (form.cover_image || "").trim() || firstSectionImage;


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
useEffect(() => {
  const handleOutsideClick = (e) => {
    if (!pinnedTooltip) return;

    const node = tooltipRefs.current[pinnedTooltip];
    if (node && !node.contains(e.target)) {
      setPinnedTooltip(null);
    }
  };

  document.addEventListener("mousedown", handleOutsideClick);
  return () => {
    document.removeEventListener("mousedown", handleOutsideClick);
  };
}, [pinnedTooltip]);
  /* ---------------- FETCH DETAIL ---------------- */
  const fetchDetail = async (id) => {
    try {
      const res = await fetch(`${BASE}/${id}`);
      if (!res.ok) return;
      const data = await res.json();

setForm({
  title: data.title || "",
  description: data.description || "",
  keywords: data.keywords || "",
  cover_image: data.cover_image || "",
  is_active: data.is_active ?? true,
});
setSeoData({
  slug: data.slug || "",
  meta_title: data.meta_title || "",
  meta_description: data.meta_description || "",
  og_title: data.og_title || "",
  og_description: data.og_description || "",
  og_image: data.og_image || "",
  canonical_url: data.canonical_url || "",

  created_at: data.created_at || "",
  updated_at: data.updated_at || "",
});
setManual({
  title: !!data.title,
  slug: !!data.slug,
  meta_title: !!data.meta_title,
  meta_description: !!data.meta_description,
  keywords: !!data.keywords,
  cover_image: !!data.cover_image,
  og_title: !!data.og_title,
  og_description: !!data.og_description,
  og_image: !!data.og_image,
  canonical_url: !!data.canonical_url,
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
  setForm(DEFAULT_FORM);
  setManual(DEFAULT_MANUAL);
  setSections([emptySection()]);
  setEditingId(null);
  setSeoData(null);
}
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------- FORM ---------------- */
const handleChange = (e) => {
  const { name, value, type, checked } = e.target;
  const nextValue = type === "checkbox" ? checked : value;

  setForm((f) => ({
    ...f,
    [name]: nextValue,
  }));

  if (type !== "checkbox" && name in DEFAULT_MANUAL) {
    setManual((m) => ({
      ...m,
      [name]: value.trim().length > 0,
    }));
  }
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

  const handleCoverChange = (file) => {
  if (!file) return;

  const preview = URL.createObjectURL(file);

  setCoverFile(file);
  setCoverPreview(preview);
  setForm((f) => ({ ...f, cover_image: preview }));

  // manual flag რომ ჩაირთოს
  setManual((m) => ({ ...m, cover_image: true }));
};

  const addSection = () => {
    if (sections.length >= MAX_SECTIONS) return;
    setSections((arr) => [...arr, emptySection()]);
  };

  const removeSection = (idx) => {
    setSections((arr) => arr.filter((_, i) => i !== idx));
  };

const resetForm = () => {
  setForm(DEFAULT_FORM);
  setManual(DEFAULT_MANUAL);
  setSections([emptySection()]);
  setEditingId(null);
  setSeoData(null);
  setError("");

  // 👇 ეს დაამატე
  setCoverFile(null);
  setCoverPreview(null);

  setPinnedTooltip(null);
  setHoveredTooltip(null);
};

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const fd = new FormData();
fd.append("title", resolvedTitle);
fd.append("description", form.description);
fd.append("keywords", form.keywords.trim());
if (coverFile instanceof File) {
  const uploaded = await uploadToCloudinary(coverFile);
  if (uploaded) {
    fd.append("cover_image", uploaded);
  }
} else {
  fd.append("cover_image", resolvedCoverImage);
}

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
const activeTooltip = pinnedTooltip || hoveredTooltip;

const renderLabel = (text, key, helpText) => (
  <div
    className={styles.labelRow}
    ref={(node) => {
      if (node) tooltipRefs.current[key] = node;
    }}
  >
    <label className={styles.label}>{text}</label>

    <div
      className={styles.infoWrap}
      onMouseEnter={() => {
        if (pinnedTooltip !== key) setHoveredTooltip(key);
      }}
      onMouseLeave={() => {
        if (pinnedTooltip !== key) setHoveredTooltip(null);
      }}
    >
      <button
        type="button"
        className={`${styles.infoButton} ${
          activeTooltip === key ? styles.infoButtonActive : ""
        }`}
        onClick={() => {
          setPinnedTooltip((prev) => (prev === key ? null : key));
          setHoveredTooltip(null);
        }}
        aria-label={`${text} info`}
      >
        i
      </button>

      {activeTooltip === key && (
        <div className={styles.infoTooltip}>
          {helpText}
        </div>
      )}
    </div>
  </div>
);
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
                {renderLabel("სტატუსი", "is_active", FIELD_HELP.is_active)}
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

              {editingId && seoData && (
  <div className={styles.seoPreviewBox}>
    <h3 className={styles.seoPreviewTitle}>SEO მონაცემები (backend-generated)</h3>

    <div className={styles.seoRow}>
      <strong>Slug:</strong> <span>{seoData.slug || "-"}</span>
    </div>

    <div className={styles.seoRow}>
      <strong>Meta Title:</strong> <span>{seoData.meta_title || "-"}</span>
    </div>

    <div className={styles.seoRow}>
      <strong>Meta Description:</strong> <span>{seoData.meta_description || "-"}</span>
    </div>

    <div className={styles.seoRow}>
      <strong>OG Title:</strong> <span>{seoData.og_title || "-"}</span>
    </div>

    <div className={styles.seoRow}>
      <strong>OG Description:</strong> <span>{seoData.og_description || "-"}</span>
    </div>

    <div className={styles.seoRow}>
      <strong>Canonical URL:</strong> <span>{seoData.canonical_url || "-"}</span>
    </div>
<div className={styles.seoRow}>
  <strong>Author:</strong> <span>Artopia</span>
</div>

<div className={styles.seoRow}>
  <strong>Created:</strong>{" "}
  <span>
    {seoData.created_at
      ? new Date(seoData.created_at).toLocaleString()
      : "-"}
  </span>
</div>

<div className={styles.seoRow}>
  <strong>Updated:</strong>{" "}
  <span>
    {seoData.updated_at
      ? new Date(seoData.updated_at).toLocaleString()
      : "-"}
  </span>
</div>
    {seoData.og_image && (
      <div className={styles.seoImageWrap}>
        <strong>OG Image:</strong>
        <img src={seoData.og_image} alt="OG Preview" className={styles.seoImage} />
      </div>
    )}
  </div>
)}

<div className={styles.fieldGroup}>
  {renderLabel("სათაური (title)", "title", FIELD_HELP.title)}
  <input
    type="text"
    name="title"
    value={form.title}
    onChange={handleChange}
    className={styles.input}
    placeholder={resolvedTitle && !manual.title ? resolvedTitle : ""}
  />
  {!manual.title && resolvedTitle && (
    <p className={styles.autoHint}>ავტო-preview: {resolvedTitle}</p>
  )}
</div>

<div className={styles.fieldGroup}>
  {renderLabel("აღწერა", "description", "ბლოგის მოკლე აღწერა (SEO და intro)")}
  <textarea
    name="description"
    value={form.description}
    onChange={handleChange}
    className={styles.textarea}
    placeholder="მოკლე აღწერა..."
  />
</div>

<div className={styles.fieldGroup}>
  {renderLabel("Keywords", "keywords", FIELD_HELP.keywords)}
  <input
    type="text"
    name="keywords"
    value={form.keywords}
    onChange={handleChange}
    className={styles.input}
  />
</div>

<div className={styles.fieldGroup}>
  {renderLabel("Cover Image", "cover_image", FIELD_HELP.cover_image)}

  {/* preview */}
  {(coverPreview || form.cover_image) ? (
    <div className={styles.imagePreviewCard}>
      <img
        src={coverPreview || form.cover_image}
        className={styles.blogImage}
        alt="cover"
      />

      <button
        type="button"
        className={styles.removeBtn}
        onClick={() => {
          setCoverFile(null);
          setCoverPreview(null);
          setForm((f) => ({ ...f, cover_image: "" }));
          setManual((m) => ({ ...m, cover_image: false }));
        }}
        style={{ position: "absolute", top: 8, right: 8 }}
      >
        ✕
      </button>
    </div>
  ) : (
    <div className={styles.emptyImageBox}>
      <span>ქავერ ფოტო არ არის არჩეული</span>
    </div>
  )}

  {/* upload */}
  <label className={styles.uploadBtn}>
    ფოტოს ატვირთვა
    <input
      type="file"
      accept="image/*"
      className={styles.hiddenInput}
      onChange={(e) => handleCoverChange(e.target.files?.[0])}
    />
  </label>

  {/* fallback preview */}
  {!manual.cover_image && resolvedCoverImage && (
    <p className={styles.autoHint}>ავტო-preview: პირველი სექციის ფოტო</p>
  )}
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

{renderLabel("ტექსტი", `section_text_${idx}`, FIELD_HELP.section_text)}
 <ReactQuill
  value={s.text}
  onChange={(value) => handleTextChange(idx, value)}
  modules={modules}
  theme="snow"
/>
                    </div>

                    <div className={styles.fieldGroup}>
{renderLabel("ფოტო", `section_image_${idx}`, FIELD_HELP.section_image)}

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