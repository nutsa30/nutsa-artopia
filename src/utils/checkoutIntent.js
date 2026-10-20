// One unpredictable intent per payload, retained across network retries/reloads.
// Storage contains a digest, not names, addresses, or the checkout payload.
const memory = new Map();
export async function checkoutIntent(scope, payload, storage) {
  if (!storage) { try { storage = globalThis.sessionStorage; } catch { /* blocked storage */ } }
  const canonical = Object.fromEntries(Object.entries(payload).filter(([key]) => !key.startsWith("ga")));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical)));
  const fingerprint = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
  const slot = `artopia.checkout.intent.${scope}`;
  try {
    const previous = JSON.parse(storage?.getItem(slot) || "null") || memory.get(slot);
    if (previous?.fingerprint === fingerprint && Date.now() - previous.created < 86400000) return previous.key;
  } catch {
    const previous = memory.get(slot);
    if (previous?.fingerprint === fingerprint && Date.now() - previous.created < 86400000) return previous.key;
  }
  const key = crypto.randomUUID();
  const intent = { fingerprint, key, created: Date.now() };
  memory.set(slot, intent);
  try { storage?.setItem(slot, JSON.stringify(intent)); } catch { /* optional storage */ }
  return key;
}

export function clearCheckoutIntent(scope) {
  const slot = `artopia.checkout.intent.${scope}`;
  memory.delete(slot);
  try { globalThis.sessionStorage?.removeItem(slot); } catch { /* optional storage */ }
}
