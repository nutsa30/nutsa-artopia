const API = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

export function paymentReference(search, storage) {
  const state = new URLSearchParams(search).get("state") || "";
  if (!state) return null;
  try {
    const saved = JSON.parse(storage?.getItem("payment_reference") || "null");
    const legacyState = storage?.getItem("last_bog_state");
    if ((saved?.state && saved.state !== state) || (!saved && legacyState && legacyState !== state)) return null;
    return { state, order_id: saved?.order_id || storage?.getItem("last_bog_order_id") || "",
      has_engraving: !!saved?.has_engraving };
  } catch {
    // The server can resolve a durable checkout by the opaque state alone.
    return { state, order_id: "", has_engraving: false };
  }
}

async function readPayment(reference, { signal, fetcher }) {
  if (!reference) return "invalid";
  const query = new URLSearchParams({ state: reference.state, order_id: reference.order_id });
  let response = await fetcher(`${API}/payments/bog/status?${query}`, { signal, cache: "no-store" });
  if (response.status === 404 && reference.order_id) {
    // Temporary compatibility with the old backend, which already fetches BOG's receipt.
    response = await fetcher(`${API}/payments/bog/receipt?order_id=${encodeURIComponent(reference.order_id)}`, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("payment_status_unavailable");
    const legacy = await response.json();
    if (legacy.receipt?.external_order_id !== reference.state) return "invalid";
    if (legacy.status === "success") {
      const processed = await fetcher(`${API}/payments/bog/webhook`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reference.order_id }), signal,
      });
      if (!processed.ok) throw new Error("payment_processing_unavailable");
      const result = await processed.json();
      return result.ok && !result.warning ? "success" : "pending";
    }
    return legacy.status === "fail" ? "fail" : "pending";
  }
  if (response.status === 400 || response.status === 403) return "invalid";
  if (!response.ok) throw new Error("payment_status_unavailable");
  const data = await response.json();
  if (!data.ok || data.state !== reference.state || (reference.order_id && data.order_id !== reference.order_id)) return "invalid";
  return ["success", "fail", "pending"].includes(data.status) ? data.status : "pending";
}

export async function confirmedPayment(reference, { signal, fetcher = fetch, timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try { return await readPayment(reference, { signal: controller.signal, fetcher }); }
  finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}
