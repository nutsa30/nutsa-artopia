import { API_BASE } from "./apiBase";

export function storeStaffSession(token, role, remember = false) {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem("ADMIN_TOKEN"); storage.removeItem("ADMIN_ROLE");
  }
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem("ADMIN_TOKEN", token);
  if (role) storage.setItem("ADMIN_ROLE", role);
}

export function staffToken() {
  try { return sessionStorage.getItem("ADMIN_TOKEN") || localStorage.getItem("ADMIN_TOKEN") || ""; }
  catch { return ""; }
}

let refreshing = null;
export async function refreshStaffSession() {
  const token = staffToken();
  if (!token) return null;
  let expiry;
  try { expiry = JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).exp; }
  catch { return null; }
  if (!expiry || expiry * 1000 <= Date.now() || expiry * 1000 - Date.now() > 30 * 60 * 1000) return null;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const response = await fetch(`${API_BASE}/admin-auth/refresh`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
      const data = await response.json();
      // Never overwrite a concurrent login/logout with an older refresh.
      if (!response.ok || !data.token || staffToken() !== token) return null;
      const remember = localStorage.getItem("ADMIN_TOKEN") === token;
      const role = sessionStorage.getItem("ADMIN_ROLE") || localStorage.getItem("ADMIN_ROLE");
      storeStaffSession(data.token, role, remember);
      return data.token;
    } catch { return null; }
    finally { refreshing = null; }
  })();
  return refreshing;
}

export async function endStaffSession() {
  const token = staffToken();
  try {
    if (token) await fetch(`${API_BASE}/admin-auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
  } finally {
    if (!staffToken() || staffToken() === token) {
      for (const storage of [localStorage, sessionStorage]) {
        storage.removeItem("ADMIN_TOKEN"); storage.removeItem("ADMIN_ROLE");
      }
    }
  }
}
