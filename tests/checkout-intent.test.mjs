import test from "node:test";
import assert from "node:assert/strict";
import { checkoutIntent, clearCheckoutIntent } from "../src/utils/checkoutIntent.js";

const storage = () => {
  const data = new Map();
  return { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k), data };
};
test("same intent reuses an unpredictable key; analytics changes are not a new purchase", async () => {
  const s = storage();
  const a = await checkoutIntent("a", { items: [1], ga_client_id: "1" }, s);
  assert.equal(a, await checkoutIntent("a", { items: [1], ga_client_id: "2" }, s));
  assert.match(a, /^[a-f0-9-]{36}$/);
  assert.notEqual(a, await checkoutIntent("a", { items: [2] }, s));
  assert.doesNotMatch([...s.data.values()].join(""), /items|ga_client_id/);
});
test("storage denial and simultaneous duplicate submits retain one in-memory intent", async () => {
  const denied = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  const [a, b] = await Promise.all([checkoutIntent("blocked", { total: 10 }, denied), checkoutIntent("blocked", { total: 10 }, denied)]);
  assert.equal(a, b);
  clearCheckoutIntent("blocked");
  assert.notEqual(a, await checkoutIntent("blocked", { total: 10 }, denied));
});
