import test from "node:test";
import assert from "node:assert/strict";
import { paymentReference, confirmedPayment } from "../src/utils/paymentStatus.js";

const ref = { state: "fixture-state", order_id: "fixture-order" };
const storage = (values = {}) => ({ getItem: (key) => values[key] ?? null });

test("URL success is never a confirmation", async () => {
  const reference = paymentReference("?status=success&state=fixture-state", storage({ payment_reference: JSON.stringify(ref) }));
  const status = await confirmedPayment(reference, { fetcher: async () => Response.json({ ok: true, ...ref, status: "pending" }) });
  assert.equal(status, "pending");
});
test("different checkout state cannot use the stored order", () => {
  assert.equal(paymentReference("?status=success&state=wrong", storage({ payment_reference: JSON.stringify(ref) })), null);
  assert.equal(paymentReference("?status=success", storage()), null);
});
test("blocked storage can resolve the bank-return state through the backend", () => {
  assert.equal(paymentReference("?state=fixture-state", { getItem() { throw Error("blocked"); } }).state, "fixture-state");
});
for (const status of ["success", "pending", "fail"]) {
  test(`backend-confirmed ${status}`, async () => {
    assert.equal(await confirmedPayment(ref, { fetcher: async () => Response.json({ ok: true, ...ref, status }) }), status);
  });
}
test("mismatched server identity cannot confirm the order", async () => {
  assert.equal(await confirmedPayment(ref, { fetcher: async () => Response.json({ ok: true, ...ref, state: "wrong", status: "success" }) }), "invalid");
});
test("missing status endpoint never falls back to provider receipt or client webhook", async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    if (url.includes("/status?")) return new Response(null, { status: 404 });
    throw Error("Provider receipt and webhook must not be requested by the browser");
  };
  await assert.rejects(confirmedPayment(ref, { fetcher }), /payment_status_unavailable/);
  assert.equal(calls.length, 1);
});
test("rejected or expired state cannot confirm payment", async () => {
  assert.equal(await confirmedPayment(ref, { fetcher: async () => Response.json({ ok: false }, { status: 403 }) }), "invalid");
});
test("status requests time out instead of confirming an unavailable bank", async () => {
  await assert.rejects(confirmedPayment(ref, { timeoutMs: 5, fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Error("aborted")), { once: true })) }));
});
