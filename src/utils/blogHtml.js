// ბლოგის სტატიის HTML-ის გაწმენდა ჩასმამდე (XSS-ისგან დაცვის მეორე ფენა).
//
// იგივე წესები backend-შიც მოქმედებს: artopia_backend/app/html_sanitize.py (nh3) — ერთი მხარე
// თუ შეიცვალა, მეორეც უნდა შეიცვალოს. ორივე repo-ში tests/fixtures/blog_html_cases.json ერთი და
// იგივე შემთხვევებს ამოწმებს. ეს ფაილი მხოლოდ ბლოგის lazy chunk-იდან იტვირთება.
import createDOMPurify from "dompurify";

export const ALLOWED_TAGS = [
  "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s",
  "ul", "ol", "li", "a", "blockquote", "span", "sub", "sup",
  "table", "thead", "tbody", "tr", "th", "td",
];
const ALLOWED_ATTRIBUTES = {
  a: ["href", "target", "rel"],
  span: ["class", "style"],
  p: ["class", "style"],
  li: ["class", "style"],
};
const STYLE_PROPERTIES = new Set(["color", "background-color"]);
const QUILL_CLASS = /^ql-(?:size-(?:small|large|huge)|align-(?:center|right|justify)|indent-[1-9])$/;
const SAFE_HREF = /^(?:https?:|mailto:|tel:|\/(?!\/))/i;
const H1_OPEN = /<h1(?=[\s>/])/gi;
const H1_CLOSE = /<\/h1\s*>/gi;
const HEADING = /<(\/?)h([1-4])(?=[\s>/])/gi;
const HAS_H1 = /<h1(?=[\s>/])/i;

// ტექსტ(ებ)ში h1 არის თუ არა — იგივე, რაც backend-ის article_has_h1. მოწმდება სექციაზე: h1-იან
// სექციაში ყველა სათაური ერთი დონით ჩამოდის, დანარჩენი სექციები უცვლელია (h1→h3 ნახტომი არ ჩნდება)
export function articleHasH1(texts) {
  return (texts || []).some((text) => HAS_H1.test(String(text || "")));
}

function filterStyle(value) {
  return String(value || "")
    .split(";")
    .map((part) => {
      const index = part.indexOf(":");
      if (index < 0) return "";
      const prop = part.slice(0, index).trim().toLowerCase();
      const val = part.slice(index + 1).trim();
      return STYLE_PROPERTIES.has(prop) && val ? `${prop}: ${val}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

export function createBlogSanitizer(win) {
  const purify = createDOMPurify(win);
  // HTML კომენტარი (#comment) ALLOWED_TAGS-ში არ არის, ამიტომ DOMPurify მას თავად შლის
  purify.addHook("uponSanitizeAttribute", (node, data) => {
    const tag = node.nodeName.toLowerCase();
    const name = data.attrName;
    if (!(ALLOWED_ATTRIBUTES[tag] || []).includes(name)) { data.keepAttr = false; return; }
    if (name === "href") {
      const value = String(data.attrValue || "").trim();
      if (SAFE_HREF.test(value)) data.attrValue = value;
      else data.keepAttr = false;
    } else if (name === "target") {
      if (String(data.attrValue || "").trim().toLowerCase() === "_blank") data.attrValue = "_blank";
      else data.keepAttr = false;
    } else if (name === "class") {
      const kept = String(data.attrValue || "").split(/\s+/).filter((token) => QUILL_CLASS.test(token));
      if (kept.length) data.attrValue = kept.join(" ");
      else data.keepAttr = false;
    } else if (name === "style") {
      const kept = filterStyle(data.attrValue);
      if (kept) data.attrValue = kept;
      else data.keepAttr = false;
    }
  });
  purify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName.toLowerCase() === "a" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  const config = {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
    // href-ს ზემოთ hook ამოწმებს (SAFE_HREF); DOMPurify-ის ნაგულისხმევი URI წესიც რჩება. ALLOWED_URI_REGEXP
    // აქ განზრახ არ არის — DOMPurify მას target/rel-ის მნიშვნელობაზეც ამოწმებს და _blank-ს შლიდა
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    // DOMPurify target-ს ცალკე ნებართვის გარეშე ყოველთვის შლის; მნიშვნელობას ზემოთ hook ამოწმებს (_blank)
    ADD_ATTR: ["target"],
  };
  // სტატიაში მხოლოდ ერთი H1 უნდა იყოს (სტატიის სათაური). თუ ავტორს ტექსტში h1 აქვს, demoteHeadings
  // ყველა სათაურს ერთი დონით ჩამოწევს (h1→h2, h2→h3, h3→h4) — სტრუქტურა და ზომების სხვაობა რჩება
  return (html, { demoteHeadings = false } = {}) => {
    if (!html) return "";
    const source = demoteHeadings
      ? String(html).replace(HEADING, (match, slash, level) => `<${slash}h${Math.min(Number(level) + 1, 4)}`)
      : String(html).replace(H1_OPEN, "<h2").replace(H1_CLOSE, "</h2>");
    return purify.sanitize(source, config);
  };
}

let browserSanitizer = null;

export function sanitizeBlogHtml(html, options) {
  if (!browserSanitizer) browserSanitizer = createBlogSanitizer(window);
  return browserSanitizer(html, options);
}
