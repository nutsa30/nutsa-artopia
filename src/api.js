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

export const getProducts = () =>
  jfetch(`${BASE}/products`);

export const getProduct = (id) =>
  jfetch(`${BASE}/products/${id}`);

/* ─────────────────────────────────────────────────────────
 *   HOMEPAGE IMAGES (public)
 * ───────────────────────────────────────────────────────── */

export const getHomepageImages = () =>
  jfetch(`${BASE}/home-images/public`);
/* ─────────────────────────────────────────────────────────
 *   CATEGORIES (IDs-ზე)
 * ───────────────────────────────────────────────────────── */

/** კატეგორიების სია (ენით — label-სთვის). valueად გამოიყენე id */
export const getCategories = () =>
  jfetch(`${BASE}/categories`);
/* ─────────────────────────────────────────────────────────
 *   SUBCATEGORIES (IDs-ზე რეკომენდებული)
 * ───────────────────────────────────────────────────────── */



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





