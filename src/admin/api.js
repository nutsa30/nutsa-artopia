// src/api.js
const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

/* =========================================================
   Auth helpers
   - კითხულობს ტოკენს localStorage/sessionStorage-დან ან .env-დან (VITE_ADMIN_TOKEN)
   - ამატებს "X-Admin-Token" ჰედერს მხოლოდ მაშინ, თუ ტოკენი არსებობს
   ========================================================= */
const getAdminToken = () => {
  try {
    return (
      (typeof window !== "undefined" &&
        (localStorage.getItem("ADMIN_TOKEN") ||
          sessionStorage.getItem("ADMIN_TOKEN"))) ||
      (import.meta?.env?.VITE_ADMIN_TOKEN || "")
    );
  } catch {
    return import.meta?.env?.VITE_ADMIN_TOKEN || "";
  }
};

const authHeaders = (extra = {}) => {
  const t = (getAdminToken() || "").trim();
  return t ? { "X-Admin-Token": t, ...extra } : { ...extra };
};

/* =========================================================
   Generic fetch helper
   - credentials: "include" რათა კუკებიც გადავიდეს
   - JSON მოთხოვნებზე სვამს Content-Type-ს
   - FormData-სთვის Content-Type-ს არ ვუწერთ
   ========================================================= */
async function jfetch(url, init = {}) {
  const isFormData =
    init && typeof FormData !== "undefined" && init.body instanceof FormData;

  const headers = isFormData
    ? authHeaders(init.headers || {})
    : { "Content-Type": "application/json", ...authHeaders(init.headers || {}) };

  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
    throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
  }
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/** -------- Generic JSON helper (AdminNavbar და სხვებისთვის) -------- */
export const apiJson = (path, init) => {
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  return jfetch(url, init);
};

/** ===================== Public API ===================== **/

/** Products (i18n) */
export const getProducts = (lang = "ka", { limit, offset } = {}) => {
  const qs = new URLSearchParams({ lang });
  if (limit != null) qs.set("limit", String(limit));
  if (offset != null) qs.set("offset", String(offset));
  return jfetch(`${BASE}/products?${qs.toString()}`);
};

export const getProduct = (id, lang = "ka") =>
  jfetch(`${BASE}/products/${id}?lang=${lang}`);

/** Categories */
export const getCategories = (lang = "ka") =>
  jfetch(`${BASE}/categories?lang=${lang}`);

/** Subcategories by category_id */
export const getSubcategories = (categoryId, lang = "ka") =>
  jfetch(
    `${BASE}/subcategories?category_id=${encodeURIComponent(
      categoryId
    )}&lang=${lang}`
  );

/** Homepage images */
export const getHomepageImages = (lang = "ka") =>
  jfetch(`${BASE}/home-images?lang=${lang}`);

/** ===================== Admin: Products (multipart) ===================== **/
/**
 * createProductForm
 * იღებს FormData-ს (multipart) — სურათები image1..image6
 * აუცილებელი ველები:
 *  - title_ka ან name
 *  - price
 *  - category_id
 * სურვილისამებრ:
 *  - subcategory_id
 *  - title_en, description_ka, description_en, slug_ka, slug_en
 *  - in_stock, is_new, sale
 */
export const createProductForm = (formData) =>
  fetch(`${BASE}/products`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(), // FormData-სთვის Content-Type-ს ბრაუზერი თვითონ სვამს
    body: formData,
  }).then(async (r) => {
    if (!r.ok) throw new Error(await r.text().catch(() => r.statusText));
    try {
      return await r.json();
    } catch {
      return {};
    }
  });

export const updateProductForm = (id, formData) =>
  fetch(`${BASE}/products/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: authHeaders(),
    body: formData,
  }).then(async (r) => {
    if (!r.ok) throw new Error(await r.text().catch(() => r.statusText));
    try {
      return await r.json();
    } catch {
      return {};
    }
  });

/**
 * Delete single product image slot.
 *
 * სცდის 2 გზას:
 *   1) DELETE /products/:id/images?field=image_urlN&url=...
 *   2) POST   /products/:id/delete_image   body: { image_field, url }
 * პირველის ჩავარდნისას ავტომატურად გადავდივართ მეორეზე.
 */
export async function deleteProductImage(productId, { field, url }) {
  // ---- 1) DELETE with query params ----
  try {
    const qs = new URLSearchParams();
    if (field) qs.set("field", field);
    if (url) qs.set("url", url);

    const res = await fetch(
      `${BASE}/products/${productId}/images?${qs.toString()}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders(),
      }
    );

    if (res.ok) {
      try {
        return await res.json();
      } catch {
        return {};
      }
    }

    // თუ 400/404/405 — ვცდით ალტერნატიულ როუტს (POST)
    if (![400, 404, 405].includes(res.status)) {
      const text = await res.text().catch(() => "");
      throw new Error(`deleteProductImage(DELETE) ${res.status}: ${text}`);
    }
  } catch (e) {
    // ვცდით POST ვარიანტს
    // console.warn("DELETE images fallback to POST /delete_image", e);
  }

  // ---- 2) POST fallback ----
  const res2 = await fetch(`${BASE}/products/${productId}/delete_image`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ image_field: field, url }),
  });

  if (!res2.ok) {
    const text = await res2.text().catch(() => "");
    throw new Error(`deleteProductImage(POST) ${res2.status}: ${text}`);
  }

  try {
    return await res2.json();
  } catch {
    return {};
  }
}

/** ===================== Admin: Subcategories ===================== **/
export const createSubcategory = ({
  category_id,
  name,
  is_active = true,
  name_ka,
  name_en,
}) =>
  jfetch(`${BASE}/subcategories`, {
    method: "POST",
    body: JSON.stringify({ category_id, name, is_active, name_ka, name_en }),
  });

export const updateSubcategory = (id, payload) =>
  jfetch(`${BASE}/subcategories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteSubcategory = (id) =>
  jfetch(`${BASE}/subcategories/${id}`, { method: "DELETE" });
