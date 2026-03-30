// src/admin/pages/addProduct/AddProducts.jsx
import { useEffect, useState, useRef } from "react";
import {
  getCategories,
  createProductForm,
  updateProductForm,
  deleteProductImage,
} from "../../api";
import { useLang } from "../../LanguageContext";
import styles from "./AddProducts.module.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/** Max images */
const MAX_IMAGES = 6;

/* -------- API BASE -------- */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

/* -------- Cloudinary (unsigned upload) -------- */
const CLOUD_NAME    = (import.meta?.env?.VITE_CLOUDINARY_CLOUD_NAME || "dch8gnj7d").trim();
const UPLOAD_PRESET = (import.meta?.env?.VITE_CLOUDINARY_UPLOAD_PRESET || "artopia_unsigned").trim();

async function uploadToCloudinary(file) {
  if (!file) return null;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: fd,
  });
  if (!r.ok) throw new Error("Cloudinary upload failed");
  const data = await r.json();
  return data?.secure_url || null;
}

/* ------------------------ auth helpers ------------------------ */
const getAdminToken = () =>
  ((typeof window !== "undefined") &&
    (localStorage.getItem("ADMIN_TOKEN") || sessionStorage.getItem("ADMIN_TOKEN"))) ||
  (import.meta?.env?.VITE_ADMIN_TOKEN || "");
const adminHeaders = (extra = {}) => {
  const t = (getAdminToken() || "").trim();
  return t ? { "X-Admin-Token": t, ...extra } : { ...extra };
};

/* ------------------------ helpers ------------------------ */
const safeJson = (text) => {
  try { return text ? JSON.parse(text) : null; } catch { return null; }
};

// --- EN ველების ამოღება მხოლოდ EN detail-იდან (არაფერს ვფარავთ) ---
const firstNonEmpty = (...vals) =>
  vals.find(v => typeof v === "string" && v.trim()) || "";

const pickTitleEN = (detEN) =>
  firstNonEmpty(detEN?.name, detEN?.title_en, detEN?.name_en);

const pickDescEN  = (detEN) =>
  firstNonEmpty(detEN?.description, detEN?.description_en);

const pickSlugEN  = (detEN) =>
  firstNonEmpty(detEN?.slug, detEN?.slug_en);

// --- detail-ის ორი ქოლი: base(+ka fallback) და EN ---
// EN ველებს ვიღებთ მხოლოდ detEN-იდან.
const fetchDetailPair = async (id) => {
  const tryJson = async (url) => {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) return null;
    return r.json();
  };
  const base = (await tryJson(`${API_BASE}/products/${id}`))
            || (await tryJson(`${API_BASE}/products/${id}?lang=ka`))
            || null;
  const en   = (await tryJson(`${API_BASE}/products/${id}?lang=en`)) || null;
  return { base, en };
};

const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div style={M.overlay}>
      <div style={M.modal}>
        <div style={M.head}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={M.xbtn} aria-label="Close">✕</button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
};

const Chip = ({ text, onRemove }) => (
  <div style={M.chip}>
    <span>{text}</span>
    <button onClick={onRemove} style={M.chipX} aria-label="Remove">✕</button>
  </div>
);

// ---- დასახელებების ნორმალიზაცია / შედარება ----
const norm = (v) => (v ?? "").toString().trim().toLowerCase();
const sameName = (a, b) => norm(a) === norm(b);

export default function AddProducts() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const location = useLocation();
  const { id: routeId } = useParams();
  const editingProduct = location.state?.product || null;

  /** -------- State -------- */
  const [categories, setCategories] = useState([]);

const [form, setForm] = useState({
  name_ka: "",
  name_en: "",
  description_ka: "",
  description_en: "",
  slug_ka: "",
  slug_en: "",
  category_id: "",
  price: "",
  quantity: "",
  sale: "",
  is_new: false,
  hide: false,
});

  const [images, setImages] = useState([]);   // [{file,isNew}|{removed}]
  const [previews, setPreviews] = useState([]); // [url|null]
  const originalUrlsRef = useRef(Array(MAX_IMAGES).fill(null));

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");


  /** -------- Init (categories) -------- */
  useEffect(() => {
    (async () => {
      try {
        const cats = await getCategories(lang);
        setCategories(Array.isArray(cats) ? cats : []);
      } catch {
        setCategories([]);
      }
    })();
  }, [lang]);

useEffect(() => {
  if (!form.name_en && form.name_ka) {
    setForm(f => ({
      ...f,
      name_en: f.name_ka
    }));
  }
}, [form.name_ka]);

useEffect(() => {
  if (!categories.length) return;
  if (!form.category_id) return;

  // force re-render select-ისთვის
  setForm((f) => ({
    ...f,
    category_id: String(f.category_id),
  }));
}, [categories]);
  /** -------- Edit mode: state.product → base+EN detail merge -------- */
  useEffect(() => {


    // 1) რაც გვაქვს state-დან (EN ველებს არ ვფარავთ)
    setForm((f) => ({
      ...f,
      name_ka: editingProduct.name_ka ?? editingProduct.name ?? "",
      name_en: editingProduct.name_en ?? "",
      description_ka: editingProduct.description_ka ?? editingProduct.description ?? "",
      description_en: editingProduct.description_en ?? "",
      slug_ka: editingProduct.slug_ka ?? "",
      slug_en: editingProduct.slug_en ?? "",
category_id: editingProduct.category_id
  ? String(editingProduct.category_id)
  : (
      categories.find(c => c.name === editingProduct.category_name)?.id
        ? String(categories.find(c => c.name === editingProduct.category_name).id)
        : ""
    ),
      price: editingProduct.price ?? "",
      quantity: editingProduct.quantity ?? "",
      sale: editingProduct.sale ?? "",
      is_new: !!editingProduct.is_new,
      hide: !!editingProduct.hide,
    }));

    // 2) სურათები state-დან
    const loaded = [];
    const prevs = [];
    for (let i = 1; i <= MAX_IMAGES; i++) {
      const key = `image_url${i}`;
      const url = editingProduct[key] || null;
      if (url) {
        loaded[i - 1] = { file: url, isNew: false, fieldName: key };
        prevs[i - 1] = url;
      }
      originalUrlsRef.current[i - 1] = url;
    }
    setImages(loaded);
    setPreviews(prevs);

    // 3) მოვიტანოთ base + EN. EN ველები ივსება მხოლოდ detEN-იდან.
    let alive = true;
    (async () => {
      try {
        const { base, en } = await fetchDetailPair(editingProduct.id);
        if (!alive) return;

        setForm((f) => ({
          ...f,
          name_en: f.name_en || pickTitleEN(en) || "",
          description_en: f.description_en || pickDescEN(en) || "",
          slug_en: f.slug_en || pickSlugEN(en) || "",
        }));

        // base-დან შევავსოთ მხოლოდ ფოტოები/სხვა URL-ები
        const det = base || {};
        const mergedImgs = [...loaded];
        const mergedPrev = [...prevs];
        for (let i = 1; i <= MAX_IMAGES; i++) {
          const k = `image_url${i}`;
          const u = det[k];
          if (u) {
            if (!mergedImgs[i - 1]) mergedImgs[i - 1] = { file: u, isNew: false, fieldName: k };
            if (!mergedPrev[i - 1]) mergedPrev[i - 1] = u;
            if (!originalUrlsRef.current[i - 1]) originalUrlsRef.current[i - 1] = u;
          }
        }
        setImages(mergedImgs);
        setPreviews(mergedPrev);
      } catch {
        /* ignore */
      }
    })();

    return () => { alive = false; };
  }, [editingProduct]);

  /** -------- URL fallback: მხოლოდ routeId → base+EN ჩაიტვირთოს -------- */
  useEffect(() => {
    if (editingProduct || !routeId) return;

    (async () => {
      const { base, en } = await fetchDetailPair(routeId);
      if (!base && !en) return;

      const det = base || {};
      setForm((f) => ({
        ...f,
        name_ka: det.title_ka || det.name_ka || det.title || det.name || "",
        name_en: pickTitleEN(en) || "",
        description_ka: det.description_ka || det.description || "",
        description_en: pickDescEN(en) || "",
        slug_ka: det.slug_ka || det.slug || "",
        slug_en: pickSlugEN(en) || "",
        category_id: det.category_id ? String(det.category_id) : "",
        price: det.price ?? "",
        quantity: det.quantity ?? "",
        sale: det.sale ?? "",
        is_new: !!det.is_new,
      }));

      const loaded = [];
      const prevs = [];
      for (let i = 1; i <= MAX_IMAGES; i++) {
        const k = `image_url${i}`;
        const u = det[k];
        if (u) {
          loaded[i - 1] = { file: u, isNew: false, fieldName: k };
          prevs[i - 1] = u;
        }
        originalUrlsRef.current[i - 1] = u || null;
      }
      setImages(loaded);
      setPreviews(prevs);
    })();
  }, [routeId, editingProduct]);

  /** -------- Handlers -------- */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "sale") {
      const v = String(value || "").replace(/[^\d]/g, "");
      if (v === "") return setForm((f) => ({ ...f, sale: "" }));
      const n = Math.min(100, Math.max(0, parseInt(v, 10)));
      return setForm((f) => ({ ...f, sale: String(n) })); 
    }
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? !!checked : value }));
  };

  const handlePickCategory = (e) => {
setForm((f) => ({ ...f, category_id: e.target.value }));
  };



  // Images add
  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setImages((prevImgs) => {
      const nextImgs = [...prevImgs];
      setPreviews((prevPrev) => {
        const nextPrev = [...prevPrev];
        for (const file of files) {
          let idx = -1;
          for (let i = 0; i < MAX_IMAGES; i++) {
            const it = nextImgs[i];
            if (!it || it.removed) { idx = i; break; }
          }
          if (idx === -1) break;
          nextImgs[idx] = { file, isNew: true };
          nextPrev[idx] = URL.createObjectURL(file);
        }
        return nextPrev;
      });
      return nextImgs;
    });
  };

  function removeImageAt(index) {
    setImages((prev) => {
      const next = [...prev];
      next[index] = { removed: true, file: null };
      return next;
    });
    setPreviews((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }

  /** -------- Category/Subcategory CRUD helpers -------- */
  const refreshCategories = async () => {
    try {
      const cats = await getCategories(lang);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch {
      setCategories([]);
    }
  };

  const createCategory = async (name) => {
    const payload = { name: (name || "").trim(), is_active: true };
    const res = await fetch(`${API_BASE}/categories`, {
      method: "POST",
      credentials: "include",
      headers: adminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data = null; try { data = JSON.parse(text); } catch {}
    if (!res.ok) {
      throw new Error(
        (data && (data.message || data.error)) ||
        `HTTP ${res.status} – ${text.slice(0,200)}`
      );
    }
  };

  const deleteCategory = async (id) => {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: adminHeaders(),
    });
    const text = await res.text();
    const data = safeJson(text);
    if (!res.ok) {
      throw new Error(data?.message || data?.error || text || "კატეგორიის წაშლა ვერ მოხერხდა");
    }
  };


  /** -------- Compose FormData -------- */
  const buildFormData = async () => {
    const fd = new FormData();

    fd.append("title_ka", form.name_ka ?? "");
    fd.append("title_en", form.name_en ?? "");
    fd.append("description_ka", form.description_ka ?? "");
    fd.append("description_en", form.description_en ?? "");
    fd.append("slug_ka", form.slug_ka ?? "");
    fd.append("slug_en", form.slug_en ?? "");

    fd.append("price", String(parseFloat(form.price || 0)));
    fd.append("is_new", form.is_new ? "true" : "false");
    fd.append("hide", form.hide ? "true" : "false");
    if (form.sale !== "") fd.append("sale", String(parseInt(form.sale, 10)));

    fd.append("category_id", String(form.category_id || ""));

    const catObj = categories.find((c) => String(c.id) === String(form.category_id));
    if (catObj?.base_name) fd.append("category", catObj.base_name);

    for (let slot = 1; slot <= MAX_IMAGES; slot++) {
      const item = images[slot - 1];

      if (item?.removed) {
        fd.append(`image_url${slot}`, "");
        continue;
      }
      if (!item) continue;

      if (item.isNew && item.file instanceof File) {
        const url = await uploadToCloudinary(item.file);
        if (url) fd.append(`image_url${slot}`, url);
        continue;
      }

      const url = typeof item.file === "string" ? item.file : null;
      if (url && /^https?:\/\//.test(url)) {
        fd.append(`image_url${slot}`, url);
      }
    }

    return fd;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.name_ka.trim() && !form.name_en.trim())
      return alert("სახელი (KA ან EN) სავალდებულოა");
    if (!form.category_id) return alert("აირჩიე კატეგორია");
    if (!form.price) return alert("ფასი სავალდებულოა");

    try {
      const fd = await buildFormData();

      if (editingProduct?.id || routeId) {
        const pid = editingProduct?.id || routeId;
        await updateProductForm(pid, fd);

        const tasks = [];
        for (let i = 0; i < MAX_IMAGES; i++) {
          if (images[i]?.removed) {
            const field = `image_url${i + 1}`;
            const url = originalUrlsRef.current[i] || "";
            tasks.push(deleteProductImage(pid, { field, url }));
          }
        }
        if (tasks.length) await Promise.all(tasks);

        alert("პროდუქტი განახლდა!");
      } else {
        await createProductForm(fd);
        alert("პროდუქტი დაემატა!");
      }

      setForm({
        name_ka: "",
        name_en: "",
        description_ka: "",
        description_en: "",
        slug_ka: "",
        slug_en: "",
        category_id: "",
        price: "",
        quantity: "",
        sale: "",
        is_new: false,
        hide: false,
      });
      setImages([]);
      setPreviews([]);

      navigate("/admin/menu");
    } catch (err) {
      console.error(err);
      alert(`შეცდომა: ${err.message || err}`);
    }
  };


  // 🔥 მხოლოდ UI ნაწილი შეცვლილია — დანარჩენი შენი ლოგიკა untouched

return (
  <div className={styles.adminPanel}>
    <form onSubmit={onSubmit} className={styles.adminForm}>
      
      {/* LEFT SIDE */}
      <div className={styles.adminFormContainer}>

        {/* ✅ PRODUCT INFO (READ ONLY) */}
        <div className={styles.infoCard}>
          <h2>{form.name_ka || "—"}</h2>
          {form.name_en && <p className={styles.sub}>{form.name_en}</p>}

          <div className={styles.meta}>
            <div>
              <span>კატეგორია:</span>
              <b>
{categories.find(c => String(c.id) === form.category_id)?.name 
  || editingProduct?.category_name 
  || editingProduct?.category 
  || "—"}
              </b>
            </div>

            <div>
              <span>ფასი:</span>
              <b>{form.price || 0} ₾</b>
            </div>

            <div>
              <span>მარაგი:</span>
              <b>{form.quantity || 0}</b>
            </div>
          </div>

<textarea
  name="description_ka"
  value={form.description_ka}
  onChange={handleChange}
  placeholder="აღწერა (ქართული)"
  className={styles.input}
/>
        </div>
<input
  name="name_en"
  value={form.name_en}
  onChange={handleChange}
  placeholder="ინგლისური სახელი"
  className={styles.input}
/>

<textarea
  name="description_en"
  value={form.description_en}
  onChange={handleChange}
  placeholder="აღწერა (ინგლისური)"
  className={styles.input}
/>
        {/* ✅ SALE */}
        <input
          name="sale"
          value={form.sale}
          onChange={handleChange}
          placeholder="ფასდაკლება % (0-100)"
          className={styles.input}
          type="number"
          min={0}
          max={100}
        />

        {/* ✅ CHECKBOXES */}
        <div className={styles.checkboxRow}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="is_new"
              checked={form.is_new}
              onChange={handleChange}
            />
            ახალი პროდუქტი
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="hide"
              checked={form.hide}
              onChange={handleChange}
            />
            დამალვა
          </label>
        </div>

        <button type="submit" className={styles.submitBtn}>
          {editingProduct?.id || routeId ? "შენახვა" : "დამატება"}
        </button>
      </div>

      {/* RIGHT SIDE (IMAGES) */}
      <div className={styles.imageSection}>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImages}
          style={{ display: "none" }}
          id="imageUpload"
        />

        <label htmlFor="imageUpload" className={styles.uploadBox}>
          ☁️ ატვირთე ფოტოები (მაქს 6)
        </label>

        {previews.some(Boolean) && (
          <div className={styles.previewContainer}>
            {previews.map((url, index) =>
              url ? (
                <div key={index} className={styles.imageWrapper}>
                  <img src={url} className={styles.previewImage} />
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => removeImageAt(index)}
                  >
                    ✖
                  </button>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </form>
  </div>
);
}