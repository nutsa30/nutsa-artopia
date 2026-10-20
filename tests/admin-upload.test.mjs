import test from "node:test";
import assert from "node:assert/strict";

// ყალბი XMLHttpRequest: სერვერის პასუხს `respond` წყვეტს, ერთდროული მოთხოვნები ითვლება
let inFlight = 0;
let maxInFlight = 0;
let sent = 0;
let respond = () => ({ status: 200, body: { secure_url: "https://res.cloudinary.com/x.png" } });
globalThis.localStorage = { getItem: () => "fixture-token", removeItem() {} };
globalThis.sessionStorage = { getItem: () => null, removeItem() {} };
globalThis.window = { location: { href: "/" } };
globalThis.XMLHttpRequest = class {
  upload = {};
  headers = {};
  open(method, url) { this.url = url; }
  setRequestHeader(name, value) { this.headers[name] = value; }
  getResponseHeader(name) { return name === "Retry-After" ? this.retryAfter : null; }
  send() {
    sent += 1;
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    const answer = respond(sent, this);
    setTimeout(() => {
      inFlight -= 1;
      this.status = answer.status;
      this.retryAfter = answer.retryAfter ?? null;
      this.responseText = JSON.stringify(answer.body ?? {});
      this.onload();
    }, 20);
  }
};

const { uploadAdminImage } = await import("../src/admin/api.js");
const file = new Blob(["png"], { type: "image/png" });
const reset = () => { inFlight = 0; maxInFlight = 0; sent = 0; };

test("six photos at once never exceed two parallel uploads (server allows three)", async () => {
  reset();
  let auth = "";
  respond = (_n, xhr) => { auth = xhr.headers.Authorization; return { status: 200, body: { secure_url: "https://res.cloudinary.com/x.png" } }; };
  const urls = await Promise.all(Array.from({ length: 6 }, () => uploadAdminImage(file)));
  assert.equal(urls.length, 6);
  assert.ok(urls.every((u) => u === "https://res.cloudinary.com/x.png"));
  assert.equal(maxInFlight, 2);
  assert.equal(auth, "Bearer fixture-token");
});

test("a 429 'service busy' answer is retried after Retry-After", async () => {
  reset();
  respond = (n) => (n === 1
    ? { status: 429, retryAfter: "1", body: { message: "busy" } }
    : { status: 200, body: { secure_url: "https://res.cloudinary.com/y.png" } });
  const started = Date.now();
  assert.equal(await uploadAdminImage(file, { kind: "blog" }), "https://res.cloudinary.com/y.png");
  assert.equal(sent, 2);
  assert.ok(Date.now() - started >= 1000);
});

test("other errors are not retried and keep the server message", async () => {
  reset();
  respond = () => ({ status: 400, body: { message: "მხოლოდ JPEG, PNG ან WEBP" } });
  await assert.rejects(uploadAdminImage(file), /მხოლოდ JPEG, PNG ან WEBP/);
  assert.equal(sent, 1);
});
