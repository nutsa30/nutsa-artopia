// Edge function (netlify/edge-functions/meta.js) საწყის HTML-ში წერს გვერდის
// JSON-LD-ს და ნიშნავს მას `data-ld-edge="<path>"`-ით. აქედან React იგებს, რომ
// ამ გვერდს schema უკვე აქვს და მეორე, კონკურენტ ასლს აღარ ამატებს.

const norm = (path) => {
  let p = String(path || "/");
  try { p = decodeURIComponent(p); } catch { /* ისე დარჩეს */ }
  return p.replace(/\/+$/, "") || "/";
};

const edgeScripts = () =>
  typeof document === "undefined" ? [] : Array.from(document.querySelectorAll("script[data-ld-edge]"));

export function hasEdgeJsonLd(pathname) {
  const want = norm(pathname);
  return edgeScripts().some((el) => norm(el.getAttribute("data-ld-edge")) === want);
}

// SPA-ში სხვა გვერდზე გადასვლისას წინა გვერდის edge JSON-LD head-ში რჩებოდა
// (მაგ. პროდუქტ A-ს schema პროდუქტ B-ს გვერდზე) — ვშლით ყველას, რაც ამ path-ს არ ეკუთვნის.
export function dropStaleEdgeJsonLd(pathname) {
  const want = norm(pathname);
  for (const el of edgeScripts()) {
    if (norm(el.getAttribute("data-ld-edge")) !== want) el.remove();
  }
}
