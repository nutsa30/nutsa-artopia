// src/admin/pages/addProduct/AddProducts.jsx
import { useEffect, useMemo, useState, useRef } from "react";
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
  const [subcategories, setSubcategories] = useState([]);

  const [form, setForm] = useState({
    name_ka: "",
    name_en: "",
    description_ka: "",
    description_en: "",
    slug_ka: "",
    slug_en: "",
    category_id: "",
    subcategory_id: "",
    price: "",
    in_stock: true,
    sale: "",
    is_new: false,
  });

  const [images, setImages] = useState([]);   // [{file,isNew}|{removed}]
  const [previews, setPreviews] = useState([]); // [url|null]
  const originalUrlsRef = useRef(Array(MAX_IMAGES).fill(null));

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [subModalOpen, setSubModalOpen] = useState(false);
  const [newSubName, setNewSubName] = useState("");

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

  /** -------- Subcategories fetch -------- */
  const fetchSubcategoriesForCategory = async (categoryId) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    const cat = categories.find((c) => String(c.id) === String(categoryId));
    const categoryKey = cat?.base_name || cat?.name;
    if (!categoryKey) {
      setSubcategories([]);
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/subcategories?category=${encodeURIComponent(categoryKey)}`,
        { credentials: "include" }
      );
      const text = await res.text();
      const data = safeJson(text);
      if (!res.ok) throw new Error(data?.message || data?.error || text || "ქვეკატეგორიების წამოღება ვერ მოხერხდა");
      setSubcategories(Array.isArray(data) ? data.filter((s) => s.is_active !== false) : []);
    } catch {
      setSubcategories([]);
    }
  };

  useEffect(() => {
    if (!form.category_id) {
      setSubcategories([]);
      setForm((f) => ({ ...f, subcategory_id: "" }));
      return;
    }
    fetchSubcategoriesForCategory(form.category_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category_id, categories]);

  /** -------- Edit mode: state.product → base+EN detail merge -------- */
  useEffect(() => {
    if (!editingProduct?.id) return;

    // 1) რაც გვაქვს state-დან (EN ველებს არ ვფარავთ)
    setForm((f) => ({
      ...f,
      name_ka: editingProduct.name_ka ?? editingProduct.name ?? "",
      name_en: editingProduct.name_en ?? "",
      description_ka: editingProduct.description_ka ?? editingProduct.description ?? "",
      description_en: editingProduct.description_en ?? "",
      slug_ka: editingProduct.slug_ka ?? "",
      slug_en: editingProduct.slug_en ?? "",
      category_id: editingProduct.category_id ?? "",
      subcategory_id: editingProduct.subcategory_id ?? "",
      price: editingProduct.price ?? "",
      in_stock: !!editingProduct.in_stock,
      sale: editingProduct.sale ?? "",
      is_new: !!editingProduct.is_new,
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
        category_id: det.category_id || "",
        subcategory_id: det.subcategory_id || "",
        price: det.price ?? "",
        in_stock: !!det.in_stock,
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

  /** -------- Auto-match Category/Subcategory -------- */
  useEffect(() => {
    if (!editingProduct) return;
    if (!categories.length) return;
    if (form.category_id) return;

    const catNameFromProduct =
      editingProduct.category ||
      editingProduct.category_name ||
      editingProduct.categoryName ||
      "";

    if (!catNameFromProduct) return;

    const match = categories.find(
      (c) =>
        sameName(c.name, catNameFromProduct) ||
        sameName(c.base_name, catNameFromProduct)
    );

    if (match) {
      setForm((f) => ({ ...f, category_id: String(match.id), subcategory_id: "" }));
    }
  }, [editingProduct, categories, form.category_id]);

  useEffect(() => {
    if (!editingProduct) return;
    if (!form.category_id) return;
    if (!subcategories.length) return;
    if (form.subcategory_id) return;

    const subNameFromProduct =
      editingProduct.subcategory ||
      editingProduct.sub_category ||
      editingProduct.subCategory ||
      editingProduct.subcategory_name ||
      editingProduct.subCategoryName ||
      "";

    if (!subNameFromProduct) return;

    const match = subcategories.find(
      (s) => sameName(s.name, subNameFromProduct) || sameName(s.base_name, subNameFromProduct)
    );

    if (match) {
      setForm((f) => ({ ...f, subcategory_id: String(match.id) }));
    }
  }, [editingProduct, form.category_id, subcategories, form.subcategory_id]);

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
    setForm((f) => ({ ...f, category_id: e.target.value, subcategory_id: "" }));
  };

  const handlePickSubcategory = (e) => {
    setForm((f) => ({ ...f, subcategory_id: e.target.value }));
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

  const createSubcategory = async (name) => {
    const cat = categories.find((c) => String(c.id) === String(form.category_id));
    const categoryKey = cat?.base_name || cat?.name;
    if (!categoryKey) throw new Error("კატეგორია არასწორია");
    const res = await fetch(`${API_BASE}/subcategories`, {
      method: "POST",
      credentials: "include",
      headers: adminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        category: categoryKey,
        name: name.trim(),
        is_active: true,
      }),
    });
    const text = await res.text();
    const data = safeJson(text);
    if (!res.ok) throw new Error(data?.message || data?.error || text || "ქვეკატეგორიის დამატება ვერ მოხერხდა");
  };

  const deleteSubcategory = async (id) => {
    const res = await fetch(`${API_BASE}/subcategories/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: adminHeaders(),
    });
    const text = await res.text();
    const data = safeJson(text);
    if (!res.ok) {
      throw new Error(data?.message || data?.error || text || "ქვეკატეგორიის წაშლა ვერ მოხერხდა");
    }
  };

  const refreshSubcategories = async () => {
    await fetchSubcategoriesForCategory(form.category_id);
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
    fd.append("in_stock", form.in_stock ? "true" : "false");
    fd.append("is_new", form.is_new ? "true" : "false");
    if (form.sale !== "") fd.append("sale", String(parseInt(form.sale, 10)));

    fd.append("category_id", String(form.category_id || ""));
    if (form.subcategory_id) fd.append("subcategory_id", String(form.subcategory_id));

    const catObj = categories.find((c) => String(c.id) === String(form.category_id));
    const subObj = subcategories.find((s) => String(s.id) === String(form.subcategory_id));
    if (catObj?.base_name) fd.append("category", catObj.base_name);
    if (subObj?.name) fd.append("subcategory", subObj.name);

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
        subcategory_id: "",
        price: "",
        in_stock: true,
        sale: "",
        is_new: false,
      });
      setImages([]);
      setPreviews([]);

      navigate("/admin/menu");
    } catch (err) {
      console.error(err);
      alert(`შეცდომა: ${err.message || err}`);
    }
  };

  const canPickSubs = useMemo(
    () => !!form.category_id && subcategories.length > 0,
    [form.category_id, subcategories.length]
  );

  return (
    <div className={styles.adminPanel}>
      <form onSubmit={onSubmit} className={styles.adminForm}>
        <div className={styles.adminFormContainer}>
          <input
            name="name_ka"
            value={form.name_ka}
            onChange={handleChange}
            placeholder="სახელი (KA) * ან EN"
            className={styles.input}
          />
          <input
            name="name_en"
            value={form.name_en}
            onChange={handleChange}
            placeholder="Name (EN)"
            className={styles.input}
          />
          <textarea
            name="description_ka"
            value={form.description_ka}
            onChange={handleChange}
            placeholder="აღწერა (KA)"
            className={styles.input}
          />
          <textarea
            name="description_en"
            value={form.description_en}
            onChange={handleChange}
            placeholder="Description (EN)"
            className={styles.input}
          />

          <label style={M.lbl}>კატეგორია*</label>
          <select
            name="category_id"
            value={form.category_id}
            onChange={handlePickCategory}
            className={styles.input}
            required
          >
            <option value="">{categories.length ? "აირჩიე კატეგორია" : "კატეგორიები არ არის"}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 6, marginBottom: 12 }}>
            <button type="button" onClick={() => setCatModalOpen(true)} style={M.addBtn}>
              + კატეგორიის დამატება
            </button>
          </div>

          <label style={M.lbl}>ქვეკატეგორია</label>
          <select
            name="subcategory_id"
            value={form.subcategory_id}
            onChange={handlePickSubcategory}
            className={styles.input}
            disabled={!form.category_id}
          >
            <option value="">
              {!form.category_id
                ? "ჯერ აირჩიე კატეგორია"
                : (subcategories.length ? "აირჩიე ქვეკატეგორია (არჩევითი)" : "ამ კატეგორიას ქვეკატეგორია არ აქვს")}
            </option>
            {subcategories.map((ს) => (
              <option key={ს.id} value={ს.id}>
                {ს.name}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 6, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setSubModalOpen(true)}
              style={{ ...M.addBtn, opacity: form.category_id ? 1 : 0.5, pointerEvents: form.category_id ? "auto" : "none" }}
              title={form.category_id ? "დამატება" : "ჯერ აირჩიე კატეგორია"}
            >
              + ქვეკატეგორიის დამატება
            </button>
          </div>

          <input
            name="sale"
            value={form.sale}
            onChange={handleChange}
            placeholder="ფასდაკლება % (0-100, სურვილისამებრ)"
            className={styles.input}
            type="number"
            min={0}
            max={100}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="in_stock"
              checked={form.in_stock}
              onChange={handleChange}
            />
            მარაგშია?
          </label>

          <label className="flex items-center gap-2" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              name="is_new"
              checked={form.is_new}
              onChange={handleChange}
            />
            ახალია?
          </label>

          <input
            name="price"
            value={form.price}
            onChange={handleChange}
            placeholder="ფასი *"
            className={styles.input}
            type="number"
            step="0.01"
            required
          />

          <button type="submit" className={styles.input}>
            {editingProduct?.id || routeId ? "შეცვლა" : "დამატება"}
          </button>
        </div>

        {/* Images */}
        <input
          className={styles.image}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImages}
          style={{ display: "none" }}
          id="imageUpload"
        />
        <label htmlFor="imageUpload" className={styles.cursorPointer}>
          <div>
            <span style={{ fontSize: "24px" }}>☁️</span>
            Add up to 6 images
          </div>
        </label>

        {previews.some(Boolean) && (
          <div className={styles.previewContainer}>
            {previews.map((url, index) =>
              url ? (
                <div key={index} className={styles.imageWrapper}>
                  <img src={url} alt={`preview-${index}`} className={styles.previewImage} />
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
      </form>

      {/* კატეგორიის მოდალი */}
      <Modal open={catModalOpen} title="კატეგორიის დამატება" onClose={() => setCatModalOpen(false)}>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={M.smallLbl}>დასახელება</div>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="სახელი"
              style={M.input}
            />
          </div>
          <div>
            <div style={M.smallLbl}>არსებული კატეგორიები</div>
            <div style={M.chips}>
              {categories.length === 0 && <div style={M.muted}>ცარიელია</div>}
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  text={c.name}
                  onRemove={async () => {
                    if (!window.confirm(`წავშალოთ კატეგორია "${c.name}"?`)) return;
                    try {
                      await deleteCategory(c.id);
                      if (String(form.category_id) === String(c.id)) {
                        setForm((f) => ({ ...f, category_id: "", subcategory_id: "" }));
                        setSubcategories([]);
                      }
                      await refreshCategories();
                    } catch (e) {
                      alert(e.message || "წაშლა ვერ მოხერხდა");
                    }
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setCatModalOpen(false)} style={M.btnGhost}>დახურვა</button>
            <button
              type="button"
              onClick={async () => {
                const n = (newCategoryName || "").trim();
                if (!n) return;
                try {
                  await createCategory(n);
                  setNewCategoryName("");
                  await refreshCategories();
                } catch (e) {
                  alert(e.message || "დამატება ვერ მოხერხდა");
                }
              }}
              style={M.btnPrimary}
            >
              შენახვა
            </button>
          </div>
        </div>
      </Modal>

      {/* ქვეკატეგორიის მოდალი */}
      <Modal open={subModalOpen} title="ქვეკატეგორიის დამატება" onClose={() => setSubModalOpen(false)}>
        {!form.category_id ? (
          <div style={M.muted}>ჯერ აირჩიე კატეგორია.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={M.smallLbl}>დასახელება</div>
              <input
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="სახელი"
                style={M.input}
              />
            </div>
            <div>
              <div style={M.smallLbl}>არსებული ქვეკატეგორიები</div>
              <div style={M.chips}>
                {subcategories.length === 0 && <div style={M.muted}>ცარიელია</div>}
                {subcategories.map((s) => (
                  <Chip
                    key={s.id}
                    text={s.name}
                    onRemove={async () => {
                      if (!window.confirm(`წავშალოთ ქვეკატეგორია "${s.name}"?`)) return;
                      try {
                        await deleteSubcategory(s.id);
                        if (String(form.subcategory_id) === String(s.id)) {
                          setForm((f) => ({ ...f, subcategory_id: "" }));
                        }
                        await refreshSubcategories();
                      } catch (e) {
                        alert(e.message || "წაშლა ვერ მოხერხდა");
                      }
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setSubModalOpen(false)} style={M.btnGhost}>დახურვა</button>
              <button
                type="button"
                onClick={async () => {
                  const n = (newSubName || "").trim();
                  if (!n) return;
                  try {
                    await createSubcategory(n);
                    setNewSubName("");
                    await refreshSubcategories();
                  } catch (e) {
                    alert(e.message || "დამატება ვერ მოხერხდა");
                  }
                }}
                style={M.btnPrimary}
              >
                შენახვა
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* მცირე ინლაინ სტილები მოდალებისთვის */
const M = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50
  },
  modal: { background: "#fff", borderRadius: 12, padding: 16, width: 560, maxWidth: "92vw" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  xbtn: { border: "none", background: "transparent", fontSize: 18, cursor: "pointer", lineHeight: 1 },
  lbl: { display: "block", margin: "4px 0 6px 2px", fontWeight: 600 },
  smallLbl: { fontSize: 12, color: "#6b7280", marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" },
  addBtn: {
    padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db",
    background: "#fff", cursor: "pointer"
  },
  btnGhost: {
    padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db",
    background: "#fff", cursor: "pointer"
  },
  btnPrimary: {
    padding: "10px 14px", borderRadius: 8, border: "none",
    background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600
  },
  chips: { display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 6 },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: "1px solid #e5e7eb", borderRadius: 9999,
    padding: "6px 10px", background: "#f8fafc"
  },
  chipX: { border: "none", background: "transparent", cursor: "pointer", fontSize: 14 },
  muted: { color: "#6b7280" },
};
