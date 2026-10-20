// src/admin/pages/addProduct/AddProducts.jsx
import { useEffect, useState, useRef } from "react";
import {
  getCategories,
  createProductForm,
  updateProductForm,
} from "../../api";
import styles from "./AddProducts.module.css";
import { cld, IMG } from "../../../utils/cloudinary";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

/** Max images */
const MAX_IMAGES = 6;

/* -------- API BASE -------- */
// `import.meta?.env?.X` Vite-ს არასდროს ჩაუსვამს — production-ში ყოველთვის ეს
// ნაგულისხმევი მნიშვნელობები მუშაობდა. ახლა იგივე მნიშვნელობები პირდაპირაა.
import { API_BASE } from "../../../utils/apiBase";

/* -------- Cloudinary (unsigned upload) -------- */
const CLOUD_NAME    = "dch8gnj7d";
const UPLOAD_PRESET = "artopia_unsigned";

// XMLHttpRequest (და არა fetch): ატვირთვის პროცენტი ღილაკზე ჩანს
function uploadToCloudinary(file, onProgress) {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error("ფოტოს ატვირთვა ვერ მოხერხდა"));
      try { resolve(JSON.parse(xhr.responseText)?.secure_url || null); }
      catch { reject(new Error("ფოტოს ატვირთვა ვერ მოხერხდა")); }
    };
    xhr.onerror = () => reject(new Error("ფოტოს ატვირთვა ვერ მოხერხდა — შეამოწმეთ ინტერნეტი"));
    xhr.send(fd);
  });
}

// ---- დასახელებების ნორმალიზაცია / შედარება ----
export default function AddProducts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const editingProduct = location.state?.product || null;

  /** -------- State -------- */
  const [categories, setCategories] = useState([]);

const [form, setForm] = useState({
  name: "",
  description: "",
  slug: "",
  category_id: "",
  price: "",
  quantity: "",
  sale: "",
  weight: "",
  is_new: false,
  hide: false,
});

  const [images, setImages] = useState([]);   // [{file,isNew}|{removed}]
  const [previews, setPreviews] = useState([]); // [url|null]
  // შენახვის მდგომარეობა: null | { stage: "upload", percent } | { stage: "save" }
  const [saving, setSaving] = useState(null);
  const savingRef = useRef(false);   // ორმაგი დაჭერისგან დაცვა (state-ის განახლებამდეც)
  const originalUrlsRef = useRef(Array(MAX_IMAGES).fill(null));

useEffect(() => {
  (async () => {
    try {
      const cats = await getCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch {
      setCategories([]);
    }
  })();
}, []);

  /** -------- Init (categories) -------- */
useEffect(() => {
  if (!editingProduct) return;

  setForm((f) => ({
    ...f,
    name: editingProduct.name || "",
    description: editingProduct.description || "",
    slug: editingProduct.slug || "",
    category_id: editingProduct.category_id
      ? String(editingProduct.category_id)
      : (
          categories.find((c) => c.name === editingProduct.category_name)?.id
            ? String(categories.find((c) => c.name === editingProduct.category_name).id)
            : ""
        ),
    price: editingProduct.price ?? "",
    quantity: editingProduct.quantity ?? "",
    sale: editingProduct.sale ?? "",
    weight: editingProduct.weight != null ? String(editingProduct.weight) : "",
    is_new: !!editingProduct.is_new,
    // ჩექბოქსი = ადმინის გადაწყვეტილება (manually_hidden). `hide` მარაგგარეშე
    // პროდუქტზეც true-ა: მისგან ჩატვირთვისას ნებისმიერი შენახვა (მაგ. ფოტოს
    // დამატება) პროდუქტს სამუდამოდ ხელით დამალულად აქცევდა.
    hide: !!(editingProduct.manually_hidden ?? editingProduct.hide),
  }));

  const loaded = [];
  const prevs = [];

  // 🔥 აქ არის მთავარი ცვლილება:
  // ვამოწმებთ, Menu.jsx-დან მოწოდებულ images მასივს
  if (Array.isArray(editingProduct.images) && editingProduct.images.length > 0) {
    editingProduct.images.forEach((url, i) => {
      if (i < MAX_IMAGES && url) {
        loaded[i] = { file: url, isNew: false, fieldName: `image_url${i + 1}` };
        prevs[i] = url;
        originalUrlsRef.current[i] = url;
      }
    });
  } 
  // თუ მასივი არაა, ვამოწმებთ პირდაპირ ველებს (image_url1...)
  else {
    for (let i = 1; i <= MAX_IMAGES; i++) {
      const key = `image_url${i}`;
      const url = editingProduct[key] || null;
      if (url) {
        loaded[i - 1] = { file: url, isNew: false, fieldName: key };
        prevs[i - 1] = url;
      }
      originalUrlsRef.current[i - 1] = url;
    }
  }

  setImages(loaded);
  setPreviews(prevs);
}, [editingProduct, categories]);

  /** -------- URL fallback: მხოლოდ routeId → base+EN ჩაიტვირთოს -------- */
useEffect(() => {
  if (editingProduct || !routeId) return;

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/products/${routeId}`, {
        credentials: "include",
      });

      if (!res.ok) return;

      const det = await res.json();

      setForm((f) => ({
        ...f,
        name: det.name || "",
        description: det.description || "",
        slug: det.slug || "",
        category_id: det.category_id ? String(det.category_id) : "",
        price: det.price ?? "",
        quantity: det.quantity ?? "",
        sale: det.sale ?? "",
        weight: det.weight != null ? String(det.weight) : "",
        is_new: !!det.is_new,
        hide: !!(det.manually_hidden ?? det.hide),
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
    } catch (err) {
      console.error("პროდუქტის წამოღების შეცდომა:", err);
    }
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

  /** -------- Compose FormData -------- */
  const buildFormData = async (onUploadProgress) => {
    const fd = new FormData();

fd.append("name", form.name ?? "");
fd.append("description", form.description ?? "");
fd.append("slug", form.slug ?? "");

    fd.append("price", String(parseFloat(form.price || 0)));
    fd.append("is_new", form.is_new ? "true" : "false");
    fd.append("hide", form.hide ? "true" : "false");
    if (form.sale !== "") fd.append("sale", String(parseInt(form.sale, 10)));
    if (form.weight !== "") fd.append("weight", String(parseFloat(form.weight)));
    else fd.append("weight", "");

    fd.append("category_id", String(form.category_id || ""));

    const catObj = categories.find((c) => String(c.id) === String(form.category_id));
    if (catObj?.base_name) fd.append("category", catObj.base_name);

    // ახალი ფოტოები ერთდროულად იტვირთება (ადრე სათითაოდ — ამიტომ იყო 20–30 წამი)
    const uploads = {};
    const progress = {};
    const newSlots = [];
    for (let slot = 1; slot <= MAX_IMAGES; slot++) {
      const item = images[slot - 1];
      if (item && !item.removed && item.isNew && item.file instanceof File) newSlots.push(slot);
    }
    const totalBytes = newSlots.reduce((sum, slot) => sum + (images[slot - 1].file.size || 0), 0) || 1;
    const report = () => {
      const loaded = Object.values(progress).reduce((sum, value) => sum + value, 0);
      onUploadProgress?.(Math.min(100, Math.round((loaded / totalBytes) * 100)));
    };
    if (newSlots.length) onUploadProgress?.(0);
    await Promise.all(newSlots.map(async (slot) => {
      uploads[slot] = await uploadToCloudinary(images[slot - 1].file, (loaded) => { progress[slot] = loaded; report(); });
    }));

    for (let slot = 1; slot <= MAX_IMAGES; slot++) {
      const item = images[slot - 1];

      if (item?.removed) {
        fd.append(`image_url${slot}`, "");
        continue;
      }
      if (!item) continue;

      if (item.isNew && item.file instanceof File) {
        const url = uploads[slot];
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

if (!form.name.trim())
return alert("სახელი სავალდებულოა");
    if (!form.price) return alert("ფასი სავალდებულოა");
    if (savingRef.current) return;   // უკვე ინახება
    savingRef.current = true;
    setSaving({ stage: "save" });

    try {
      const fd = await buildFormData((percent) => setSaving({ stage: "upload", percent }));
      setSaving({ stage: "save" });

      if (editingProduct?.id || routeId) {
        const pid = editingProduct?.id || routeId;
        await updateProductForm(pid, fd);
        alert("პროდუქტი განახლდა!");
      } else {
        await createProductForm(fd);
        alert("პროდუქტი დაემატა!");
      }

setForm({
  name: "",
  description: "",
  slug: "",
  category_id: "",
  price: "",
  quantity: "",
  sale: "",
  weight: "",
  is_new: false,
  hide: false,
});
      setImages([]);
      setPreviews([]);

      navigate("/admin/menu");
    } catch (err) {
      console.error(err);
      alert(`შეცდომა: ${err.message || err}`);
    } finally {
      // წარმატებისას გვერდი იცვლება; შეცდომისას ღილაკი ისევ აქტიურდება
      savingRef.current = false;
      setSaving(null);
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
          <h2>{form.name || "—"}</h2>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
  ID: {editingProduct?.id || routeId || "—"}
</p>

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
  name="description"
  value={form.description}
  onChange={handleChange}
  placeholder="აღწერა"
  className={styles.textareaInput} // <-- აქ შეცვალე .input-ი .textareaInput-ით
/>
        </div>



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

        {/* ✅ WEIGHT */}
        <input
          name="weight"
          value={form.weight}
          onChange={handleChange}
          placeholder="წონა კილოგრამებში (მაგ. 0.5)"
          className={styles.input}
          type="number"
          min={0}
          step="0.001"
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

        <button type="submit" className={styles.submitBtn} disabled={Boolean(saving)} aria-busy={Boolean(saving)}>
          {saving ? (
            <span className={styles.submitBusy}>
              <Loader2 size={18} className="tw:animate-spin" aria-hidden="true" />
              {saving.stage === "upload" ? `ფოტოები იტვირთება… ${saving.percent}%` : "ინახება…"}
            </span>
          ) : (editingProduct?.id || routeId ? "შენახვა" : "დამატება")}
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
                  <img src={cld(url, { w: IMG.ADMIN })} className={styles.previewImage} />
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
