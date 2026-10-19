let cached;

export function readInitialData(kind, path) {
  if (typeof document === "undefined") return null;
  if (cached === undefined) {
    const node = document.getElementById("artopia-initial-data");
    try {
      cached = node ? JSON.parse(node.textContent || "null") : null;
    } catch {
      cached = null;
    }
  }
  if (!cached || cached.kind !== kind || cached.path !== path) return null;
  return cached.data ?? null;
}
