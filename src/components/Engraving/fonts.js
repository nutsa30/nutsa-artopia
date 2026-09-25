/**
 * გრავირების შრიფტების ჩატვირთვა FontFace API-ით.
 *
 * canvas-ზე ტექსტი მხოლოდ მაშინ იხატება სწორი შრიფტით, როცა შრიფტი უკვე
 * ჩატვირთულია — ამიტომ ხატვამდე ყოველთვის `ensureFont(id)` უნდა დაელოდოს.
 * თითო ოჯახი ერთხელ რეგისტრირდება; ქართული და ლათინური ნაწილი ცალ-ცალკე
 * ფაილია, `unicodeRange`-ით ერთ ოჯახად გაერთიანებული.
 */
import { ENGRAVING_FONTS, fontById } from "../../utils/engraving";

const loading = new Map(); // id -> Promise<boolean>

export function ensureFont(id) {
  const font = fontById(id);
  if (!font) return Promise.resolve(false);
  if (loading.has(id)) return loading.get(id);

  const p = (async () => {
    if (typeof FontFace === "undefined" || !document?.fonts) return false;
    const faces = font.files.map(
      (f) =>
        new FontFace(font.family, `url(${f.url}) format("woff2")`, {
          display: "block",
          ...(f.range ? { unicodeRange: f.range } : {}),
        })
    );
    const loaded = await Promise.all(faces.map((ff) => ff.load()));
    loaded.forEach((ff) => document.fonts.add(ff));
    return true;
  })().catch((err) => {
    console.error("engraving font load failed:", id, err);
    loading.delete(id); // შემდეგ ცდაზე თავიდან ვცდით
    return false;
  });

  loading.set(id, p);
  return p;
}

export function ensureAllFonts() {
  return Promise.all(ENGRAVING_FONTS.map((f) => ensureFont(f.id)));
}

export const canvasFont = (fontId, px) => {
  const font = fontById(fontId);
  return `${Math.max(1, Math.round(px * 100) / 100)}px "${font?.family || "sans-serif"}"`;
};
