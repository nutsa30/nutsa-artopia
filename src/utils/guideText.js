// კატეგორიის ტექსტის მინიმალური მარკაპი: მხოლოდ ბმულები.
//   [ტექსტი](cat:26)   → ქვეკატეგორია id-ით
//   [ტექსტი](main:1)   → მთავარი კატეგორია id-ით
//   [ტექსტი](/engraving) → საიტის შიდა გზა
// HTML არასდროს ისმება — ტექსტი React-ში ჩვეულებრივ სტრიქონად ჩაიწერება.

const LINK_RX = /\[([^\]]+)\]\(((?:cat|main):\d+|\/[^\s)]*)\)/g;

export function parseGuideText(text) {
  const parts = [];
  const source = String(text || "");
  let last = 0;
  for (const match of source.matchAll(LINK_RX)) {
    if (match.index > last) parts.push({ type: "text", value: source.slice(last, match.index) });
    const [, label, raw] = match;
    const target = raw.startsWith("/")
      ? { kind: "path", path: raw }
      : { kind: raw.startsWith("main:") ? "main" : "cat", id: Number(raw.split(":")[1]) };
    parts.push({ type: "link", text: label, target });
    last = match.index + match[0].length;
  }
  if (last < source.length) parts.push({ type: "text", value: source.slice(last) });
  return parts;
}

export function plainGuideText(text) {
  return parseGuideText(text).map((part) => (part.type === "text" ? part.value : part.text)).join("");
}

export function guideLinkTargets(text) {
  return parseGuideText(text).filter((part) => part.type === "link").map((part) => part.target);
}
