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
test("old backend compatibility verifies receipt state and persists the order", async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    if (url.includes("/status?")) return new Response(null, { status: 404 });
    if (url.includes("/receipt?")) return Response.json({ status: "success", receipt: { external_order_id: ref.state } });
    return Response.json({ ok: true });
  };
  assert.equal(await confirmedPayment(ref, { fetcher }), "success");
  assert.equal(calls[2][1].method, "POST");
});
test("old backend processing warning cannot show success", async () => {
  assert.equal(await confirmedPayment(ref, { fetcher: async url => url.includes("/status?") ? new Response(null, { status: 404 }) : url.includes("/receipt?") ? Response.json({ status: "success", receipt: { external_order_id: ref.state } }) : Response.json({ ok: true, warning: "fixture" }) }), "pending");
});
test("status requests time out instead of confirming an unavailable bank", async () => {
  await assert.rejects(confirmedPayment(ref, { timeoutMs: 5, fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Error("aborted")), { once: true })) }));
});
