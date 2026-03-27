// api.js (ან სადაც გაქვს ეს ჰელპერები)
// შენს ვერსიას ვტოვებ როგორც არის და ვამატებ ახალებს IDs-სთვის.

import { loadingBus } from "./components/loaders/loadingBus";
const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";



/** JSON fetch shorthand (GET/DELETE, ან როცა JSON body-ა) */
async function jfetch(url, init) {
  loadingBus.start();
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      ...init,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    loadingBus.stop();
  }
}

/** FormData fetch (ფოტოები/multipart) */
async function ffetch(url, formData, method = "POST") {
  loadingBus.start();
  try {
    const res = await fetch(url, {
      method,
      body: formData, // არ დაუმატო Content-Type — ბრაუზერი თვითონ დასვამს boundary-ს
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${txt}`);
    }
    return res.json().catch(() => ({}));
  } finally {
    loadingBus.stop();
  }
}

/* ─────────────────────────────────────────────────────────
 *   PRODUCTS (public)
 * ───────────────────────────────────────────────────────── */

/** პროდუქტების სია, ენაზე თარგმნით */
export const getProducts = (lang = "ka") =>
  jfetch(`${BASE}/products?lang=${lang}`);

/** ერთი პროდუქტის detail, ენაზე თარგმნით */
export const getProduct = (id, lang = "ka") =>
  jfetch(`${BASE}/products/${id}?lang=${lang}`);

/* ─────────────────────────────────────────────────────────
 *   HOMEPAGE IMAGES (public)
 * ───────────────────────────────────────────────────────── */

export const getHomepageImages = (lang = "ka") =>
  jfetch(`${BASE}/homepage-images?lang=${lang}`);

/* ─────────────────────────────────────────────────────────
 *   CATEGORIES (IDs-ზე)
 * ───────────────────────────────────────────────────────── */

/** კატეგორიების სია (ენით — label-სთვის). valueად გამოიყენე id */
export const getCategories = (lang = "ka") =>
  jfetch(`${BASE}/categories?lang=${lang}`);

/* ─────────────────────────────────────────────────────────
 *   SUBCATEGORIES (IDs-ზე რეკომენდებული)
 * ───────────────────────────────────────────────────────── */

/** ქვეკატეგორიები category_id-ით (ენით — label-სთვის) */
export const getSubcategoriesByCategoryId = (categoryId, lang = "ka", includeInactive = false) => {
  const q = new URLSearchParams();
  q.set("category_id", String(categoryId));
  q.set("lang", lang);
  if (includeInactive) q.set("include_inactive", "1");
  return jfetch(`${BASE}/subcategories?${q.toString()}`);
};

/** ⚠️ ძველი გზა (სახელით) — დავტოვე უკუმთებადობისთვის */
export const getSubcategories = (categoryName, lang = "ka", includeInactive = false) => {
  const q = new URLSearchParams();
  q.set("category", String(categoryName || ""));
  q.set("lang", lang);
  if (includeInactive) q.set("include_inactive", "1");
  return jfetch(`${BASE}/subcategories?${q.toString()}`);
};

/* ─────────────────────────────────────────────────────────
 *   ADMIN: PRODUCTS CRUD (multipart FormData)
 * ───────────────────────────────────────────────────────── */

/** პროდუქტების შექმნა — FormData (იხ. AddProducts.jsx მაგალითი) */
export const createProduct = (formData) =>
  ffetch(`${BASE}/products`, formData, "POST");

/** პროდუქტების განახლება — FormData */
export const updateProduct = (id, formData) =>
  ffetch(`${BASE}/products/${id}`, formData, "PUT");

/** პროდუქტიდან ერთ-ერთი სურათის წაშლა */
export const deleteProductImage = (productId, imageField /* e.g. image_url1 */) =>
  jfetch(`${BASE}/products/${productId}/delete_image`, {
    method: "POST",
    body: JSON.stringify({ image_field: imageField }),
  });

/* ─────────────────────────────────────────────────────────
 *   ADMIN: SUBCATEGORIES CRUD (საჭირო হলে)
 * ───────────────────────────────────────────────────────── */

/** ქვეკატეგორიის შექმნა category_id-ით (სასურველია IDs) */
export const createSubcategoryById = ({ category_id, name, name_ka, name_en, is_active = true }) => {
  const payload = { category_id, name, is_active };
  if (name_ka != null) payload.name_ka = name_ka;
  if (name_en != null) payload.name_en = name_en;
  return jfetch(`${BASE}/subcategories`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/** ქვეკატეგორიის განახლება (სურვილისამებრ category_id გადატანისთვის) */
export const updateSubcategory = (id, { name, name_ka, name_en, is_active, category_id }) => {
  const payload = {};
  if (name != null) payload.name = name;
  if (name_ka != null) payload.name_ka = name_ka;
  if (name_en != null) payload.name_en = name_en;
  if (is_active != null) payload.is_active = !!is_active;
  if (category_id != null) payload.category_id = category_id;
  return jfetch(`${BASE}/subcategories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

/** ქვეკატეგორიის წაშლა (ბექი არ მოგცემს თუ მიბმულია პროდუქტები) */
export const deleteSubcategory = (id) =>
  jfetch(`${BASE}/subcategories/${id}`, { method: "DELETE" });
