import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { createBlogSanitizer } from "../src/utils/blogHtml.js";

// tests/fixtures/blog_html_cases.json იგივე ფაილია, რასაც backend-ის tests/test_blog_sanitize.py
// ამოწმებს (nh3) — ორივე მხარე ერთი და იგივე წესებით უნდა მუშაობდეს.
const read = async (name) => JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const cases = await read("blog_html_cases.json");
const articles = await read("blog_articles.json");
const { window } = new JSDOM("<!doctype html><html><body></body></html>");
const sanitize = createBlogSanitizer(window);

const style = (value) => String(value || "").split(";")
  .filter((part) => part.includes(":"))
  .map((part) => { const i = part.indexOf(":"); return `${part.slice(0, i).trim().toLowerCase()}:${part.slice(i + 1).trim().split(/\s+/).join(" ")}`; })
  .join(";");

// HTML → ნორმალიზებული მოვლენები (იგივე წესით, რაც backend-ის ტესტში): h1 ≡ h2, rel და ატრიბუტების რიგი არ ითვლება
function normalized(html) {
  const host = window.document.createElement("div");
  host.innerHTML = html;
  const events = [];
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        const text = child.textContent.split(/\s+/).filter(Boolean).join(" ");
        if (!text) continue;
        const last = events[events.length - 1];
        if (last && last[0] === "text") last[1] += ` ${text}`;
        else events.push(["text", text]);
      } else if (child.nodeType === 1) {
        const tag = child.nodeName.toLowerCase() === "h1" ? "h2" : child.nodeName.toLowerCase();
        const attrs = [...child.attributes].filter((a) => a.name !== "rel")
          .map((a) => [a.name, a.name === "style" ? style(a.value) : a.value.split(/\s+/).filter(Boolean).join(" ")])
          .sort((x, y) => x[0].localeCompare(y[0]));
        events.push(["start", tag, JSON.stringify(attrs)]);
        walk(child);
        if (tag !== "br") events.push(["end", tag]);
      }
    }
  };
  walk(host);
  return events;
}

test("shared XSS cases are removed exactly like on the backend", () => {
  for (const item of cases) {
    const out = sanitize(item.html);
    for (const needle of item.absent) assert.ok(!out.toLowerCase().includes(needle.toLowerCase()), `${item.name}: "${needle}" must be gone: ${out}`);
    for (const needle of item.present) assert.ok(out.includes(needle), `${item.name}: "${needle}" must stay: ${out}`);
  }
});

test("sanitizing is idempotent and empty input stays empty", () => {
  assert.equal(sanitize(""), "");
  assert.equal(sanitize(null), "");
  for (const item of cases) {
    const once = sanitize(item.html);
    assert.equal(sanitize(once), once, item.name);
  }
});

test("the six published articles keep their content (only h1 becomes h2)", () => {
  assert.equal(articles.length, 6);
  for (const article of articles) {
    article.sections.forEach((html, index) => {
      const out = sanitize(html);
      assert.deepEqual(normalized(out), normalized(html), `${article.slug} section ${index}`);
      assert.ok(!/<h1/i.test(out), `${article.slug} section ${index} has no h1`);
    });
  }
});
