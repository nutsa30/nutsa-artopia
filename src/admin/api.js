const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

/* =========================================================
   Auth helpers
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
  const token = (getAdminToken() || "").trim();
  return token ? { "X-Admin-Token": token, ...extra } : { ...extra };
};

/* =========================================================
   Generic fetch helpers
   ========================================================= */
async function jfetch(url, init = {}) {
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  const headers = isFormData
    ? authHeaders(init.headers || {})
    : {
        "Content-Type": "application/json",
        ...authHeaders(init.headers || {}),
      };

  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`
    );
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function ffetch(url, formData, method = "POST") {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`
    );
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
}

/* =========================================================
   Generic JSON helper
   ========================================================= */
export const apiJson = (path, init) => {
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  return jfetch(url, init);
};

/* =========================================================
   Public API
   ========================================================= */

export const getProducts = ({ limit, offset } = {}) => {
  const qs = new URLSearchParams();

  if (limit != null) qs.set("limit", String(limit));
  if (offset != null) qs.set("offset", String(offset));

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return jfetch(`${BASE}/products${suffix}`);
};

export const getProduct = (id) => jfetch(`${BASE}/products/${id}`);

export const getCategories = () => jfetch(`${BASE}/categories`);

/* თუ ეს endpoint შენთან ნამდვილად public-ად ასე მუშაობს, დატოვე ეს ვერსია */
export const getHomepageImages = () => jfetch(`${BASE}/home-images/public`);

/* =========================================================
   Admin: Products CRUD
   ========================================================= */

export const createProduct = (formData) =>
  ffetch(`${BASE}/products`, formData, "POST");

export const updateProduct = (id, formData) =>
  ffetch(`${BASE}/products/${id}`, formData, "PUT");

/* ძველი სახელებიც დავტოვე რომ import-ები არ გაგიტყდეს */
export const createProductForm = createProduct;
export const updateProductForm = updateProduct;

/* =========================================================
   Delete single product image
   ========================================================= */

export async function deleteProductImage(productId, imageFieldOrOptions) {
  const options =
    typeof imageFieldOrOptions === "string"
      ? { field: imageFieldOrOptions }
      : imageFieldOrOptions || {};

  const { field, url } = options;

  const res = await fetch(`${BASE}/products/${productId}/delete_image`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      image_field: field,
      url,
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `deleteProductImage ${res.status} ${res.statusText}${
        detail ? ` — ${detail}` : ""
      }`
    );
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
}