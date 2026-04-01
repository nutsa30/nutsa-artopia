import React, { useEffect, useState } from "react";
import s from "./AddHomeImg.module.css";
const CLOUD_NAME = "dch8gnj7d";
const UPLOAD_PRESET = "artopia_unsigned";

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) throw new Error("Cloudinary upload failed");

  const data = await res.json();
  return data.secure_url;
}
const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
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
  const [previewUrls, setPreviewUrls] = useState([]);
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [sortIndex, setSortIndex] = useState("");
  const [isActive, setIsActive] = useState(true);

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

const handleUpload = async () => {
  if (!files.length) return;

  try {
    // 1. ატვირთე Cloudinary-ზე
    const uploadedUrls = [];

    for (const f of files) {
      const url = await uploadToCloudinary(f);
      if (url) uploadedUrls.push(url);
    }

    // 2. გაუგზავნე backend-ს URL-ები
    const res = await fetch(`${API_BASE}/home-images`, {
      method: "POST",
      headers: {
        ...headers({ "Content-Type": "application/json" }),
      },
      body: JSON.stringify({
        images: uploadedUrls,
        title,
        alt_text: alt,
sort_index: sortIndex !== "" ? Number(sortIndex) : null,
        is_active: isActive,
      }),
      credentials: "include",
    });

    const text = await res.text();
    console.log("UPLOAD STATUS:", res.status);
    console.log("UPLOAD RESPONSE:", text);

    if (!res.ok) throw new Error(text);

    await fetchList();

    setFiles([]);
    setPreviewUrls([]);
    setTitle("");
    setAlt("");
    setSortIndex("");
    setIsActive(true);

  } catch (err) {
    console.error(err);
    setError("ატვირთვის შეცდომა");
  }
};

  const toggleActive = async (item) => {
    try {
      await fetch(`${API_BASE}/home-images/${item.id}`, {
        method: "PUT",
        headers: { ...headers({ "Content-Type": "application/json" }) },
        body: JSON.stringify({ is_active: !item.is_active }),
        credentials: "include",
      });

      fetchList();
    } catch {
      setError("აქტიურობის შეცვლა ვერ მოხერხდა");
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm("წაშლა ნამდვილად გინდა?")) return;

    try {
      await fetch(`${API_BASE}/home-images/${item.id}`, {
        method: "DELETE",
        headers: headers(),
        credentials: "include",
      });

      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch {
      setError("წაშლა ვერ მოხერხდა");
    }
  };

  return (
    <div className={s.page}>
      <h1 className={s.title}>მთავარი სურათები</h1>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.card}>
<label className={s.uploadBox}>
  📷 ატვირთე ფოტოები
  <span className={s.hint}>
    რეკომენდებული ზომა: 1600×1000px (ჰორიზონტალური)
  </span>

  <input
    type="file"
    multiple
    accept="image/*"
onChange={(e) => {
  const selected = Array.from(e.target.files || []);
  setFiles(selected);

  const previews = selected.map(file => URL.createObjectURL(file));
  setPreviewUrls(previews);
}}
  />
</label>
{previewUrls.length > 0 && (
  <div className={s.previewGrid}>
    {previewUrls.map((url, i) => (
      <div key={i} className={s.previewItem}>
        <img src={url} alt="preview" />
      </div>
    ))}
  </div>
)}

        <div className={s.row}>
          <input
            placeholder="სათაური"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            placeholder="ალტ ტექსტი (SEO)"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
        </div>

        <div className={s.row}>
          <input
            type="number"
            placeholder="დალაგების ინდექსი"
            value={sortIndex}
            onChange={(e) => setSortIndex(e.target.value)}
          />

          <label className={s.checkbox}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            აქტიური
          </label>
        </div>

        <button className={s.primaryBtn} onClick={handleUpload}>
          ატვირთვა
        </button>
      </div>

      <div className={s.grid}>
        {items.map((it) => (
          <div key={it.id} className={s.cardItem}>
            <div className={s.imgWrap}>
              <img src={it.image_url} />
              {!it.is_active && <span className={s.badge}>გამორთული</span>}
            </div>

            <div className={s.meta}>
              {it.title && <p>{it.title}</p>}
              <p>სორტი: {it.sort_index ?? "-"}</p>
            </div>

            <div className={s.actions}>
              <button onClick={() => toggleActive(it)}>
                {it.is_active ? "გამორთვა" : "გააქტიურება"}
              </button>
              <button className={s.delete} onClick={() => deleteItem(it)}>
                წაშლა
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}