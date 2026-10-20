import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { SUB_GUIDE_FILE } from "../src/content/categoryGuides/fileMap.js";
import { parseGuideText, plainGuideText, guideLinkTargets } from "../src/utils/guideText.js";

const dir = new URL("../src/content/categoryGuides/", import.meta.url);
const files = (await readdir(dir)).filter((name) => /^main-\d+\.js$/.test(name));
const guides = {};
for (const name of files) guides[Number(name.match(/\d+/)[0])] = (await import(new URL(name, dir))).default;

// ბლოგის არსებული სტატიები, რომლებზეც ტექსტი მიუთითებს
const BLOG_SLUGS = new Set([
  "saghebavebis-archeva-damwyebtatvis-zeti-akrili-akvareli-tu-guashi",
  "hb-2b-6b-ras-nishnavs-realurad-fanqrebis-nomrebi",
  "ra-unda-hqondes-yvela-damwyeb-mkhatvars",
  "rogor-wavikitkhot-taro-sruli-gzamkvlevi-damwyebtatvis",
]);

function* allGuides() {
  for (const [fileId, data] of Object.entries(guides)) {
    yield { label: `main ${fileId}`, guide: data.main };
    for (const [subId, guide] of Object.entries(data.subs || {})) yield { label: `sub ${subId}`, guide };
  }
}

function* textsOf(guide) {
  yield guide.title;
  for (const section of guide.sections || []) {
    if (section.heading) yield section.heading;
    yield* section.paragraphs || [];
    yield* section.items || [];
    yield* section.notes || [];
  }
  for (const item of guide.faq || []) { yield item.q; yield item.a; }
}

test("guide link markup is parsed into text and id-based links", () => {
  assert.deepEqual(parseGuideText("ნახეთ [ფუნჯები](cat:26) და [გრავირება](/engraving)."), [
    { type: "text", value: "ნახეთ " },
    { type: "link", text: "ფუნჯები", target: { kind: "cat", id: 26 } },
    { type: "text", value: " და " },
    { type: "link", text: "გრავირება", target: { kind: "path", path: "/engraving" } },
    { type: "text", value: "." },
  ]);
  assert.equal(plainGuideText("[ტილო](cat:22) 30×40"), "ტილო 30×40");
});

test("every main category file has a main guide and the sub map matches the files exactly", () => {
  assert.deepEqual(Object.keys(guides).map(Number).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const fromFiles = {};
  for (const [fileId, data] of Object.entries(guides)) {
    assert.ok(data.main?.title, `main ${fileId} has a title`);
    for (const subId of Object.keys(data.subs || {})) fromFiles[subId] = Number(fileId);
  }
  assert.deepEqual(fromFiles, Object.fromEntries(Object.entries(SUB_GUIDE_FILE).map(([k, v]) => [String(k), v])));
});

test("guides are complete, clean Georgian text with valid internal links", () => {
  for (const { label, guide } of allGuides()) {
    assert.ok(guide.title && guide.sections?.length, `${label}: title and sections`);
    for (const section of guide.sections) {
      assert.ok((section.paragraphs?.length || 0) + (section.items?.length || 0) > 0, `${label}: empty section`);
    }
    for (const item of guide.faq || []) {
      assert.ok(item.q.trim().endsWith("?"), `${label}: question ends with ?: ${item.q}`);
      assert.ok(item.a.trim().length > 20, `${label}: answer present`);
    }
    for (const text of textsOf(guide)) {
      assert.equal(typeof text, "string", `${label}: text is a string`);
      assert.match(text, /[ა-ჺ]/, `${label}: Georgian text: ${text}`);
      assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, `${label}: no emoji: ${text}`);
      assert.doesNotMatch(text, /₾|TODO|lorem/i, `${label}: no prices or placeholders: ${text}`);
      assert.doesNotMatch(text, / {2}| [,.;:!?]/, `${label}: spacing: ${text}`);
      const plain = plainGuideText(text);
      assert.doesNotMatch(plain, /\]\(|\[[^\]]*\]/, `${label}: broken link markup: ${text}`);
      for (const target of guideLinkTargets(text)) {
        if (target.kind === "cat") assert.ok(SUB_GUIDE_FILE[target.id], `${label}: unknown category ${target.id}`);
        else if (target.kind === "main") assert.ok(guides[target.id], `${label}: unknown main ${target.id}`);
        else if (target.path.startsWith("/blog/")) assert.ok(BLOG_SLUGS.has(target.path.slice(6)), `${label}: unknown blog ${target.path}`);
        else assert.equal(target.path, "/engraving", `${label}: unexpected path ${target.path}`);
      }
    }
  }
});
