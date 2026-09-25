/**
 * ფოტოს მომზადება გრავირებისთვის.
 *
 * ლაზერი ფერს ვერ ამოწვავს — ან წვავს, ან არა. ამიტომ ფოტო იქცევა სუფთა
 * შავ-თეთრ ნიღბად (შავი = ამოიწვება, გამჭვირვალე = ხელუხლებელი):
 *   • "contrast" — კონტრასტული: ზღვარზე მაღლა/დაბლა (Otsu-ს ავტომატური ზღვარი)
 *   • "dots"     — წერტილოვანი: Floyd–Steinberg დიზერინგი 0.1 მმ ბადეზე,
 *                  ნახევარტონებს წერტილების სიხშირით გადმოსცემს
 * `level` (−50..50) ორივე რეჟიმში ამუქებს (+) ან ანათებს (−) შედეგს.
 * `invert` — ამოსაწვავი და ხელუხლებელი ნაწილები ადგილს იცვლის.
 */
import { PX_PER_MM } from "../../utils/engraving";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_UPLOAD_SIDE = 2400;
const DOTS_PER_MM = 10; // წერტილოვან რეჟიმში ერთი წერტილი = 0.1 მმ

export const PHOTO_STYLES = [
  { id: "contrast", label: "კონტრასტული" },
  { id: "dots", label: "წერტილოვანი" },
];

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unsupported"));
    };
    img.src = url;
  });

/**
 * ფაილის წაკითხვა. აბრუნებს { image, width, height, uploadBlob, uploadName, url }.
 * uploadBlob — ადმინისთვის შესანახი ასლი: ორიგინალი, ან (თუ ძალიან დიდია)
 * 2400px-მდე შემცირებული JPEG. url — ესკიზისთვის; ფოტოს მოცილებისას
 * `releasePhoto()`-ით უნდა გათავისუფლდეს.
 */
export async function readPhotoFile(file) {
  if (!file || !/^image\//i.test(file.type || "") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || "")) {
    throw new Error("აირჩიეთ ფოტო (JPG, PNG ან WEBP)");
  }
  let loaded;
  try {
    loaded = await loadImageFromFile(file);
  } catch {
    throw new Error("ეს ფორმატი ვერ წაიკითხა — ატვირთეთ JPG ან PNG ფოტო");
  }
  const { img, url } = loaded;
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (!width || !height) {
    URL.revokeObjectURL(url);
    throw new Error("ფოტო ვერ წაიკითხა");
  }

  let uploadBlob = file;
  let uploadName = file.name || "photo";
  const tooBig = file.size > MAX_UPLOAD_BYTES || Math.max(width, height) > MAX_UPLOAD_SIDE * 1.5;
  const oddType = !/^image\/(jpeg|png|webp)$/i.test(file.type || "");
  if (tooBig || oddType) {
    const k = Math.min(1, MAX_UPLOAD_SIDE / Math.max(width, height));
    const c = document.createElement("canvas");
    c.width = Math.round(width * k);
    c.height = Math.round(height * k);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    uploadBlob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.92));
    uploadName = uploadName.replace(/\.[^.]+$/, "") + ".jpg";
  }

  return { image: img, width, height, uploadBlob, uploadName, url };
}

export function releasePhoto(photo) {
  if (photo?.url) URL.revokeObjectURL(photo.url);
}

/** ფოტოს ზომა (მმ), რომ ზონაში ჩაეტიოს პროპორციის შენარჩუნებით */
export function fitPhotoMm(photo, boxW, boxH) {
  const aspect = photo.width / photo.height;
  if (aspect > boxW / boxH) return [boxW, boxW / aspect];
  return [boxH * aspect, boxH];
}

const otsu = (hist, total) => {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
};

/**
 * ფოტო → შავ-თეთრი ნიღაბი `wMm × hMm` ზომაზე, `pxPerMm` გარჩევადობით.
 * ერთსა და იმავე პარამეტრებზე შედეგი ყოველთვის ერთნაირია — პრევიუც და
 * ლაზერის ფაილიც ერთი და იგივე წერტილებს იღებს.
 */
export function photoMask(
  photo,
  wMm,
  hMm,
  { style = "contrast", level = 0, invert = false } = {},
  pxPerMm = PX_PER_MM
) {
  const grid = style === "dots" ? DOTS_PER_MM : PX_PER_MM;
  const gw = Math.max(1, Math.round(wMm * grid));
  const gh = Math.max(1, Math.round(hMm * grid));

  const src = document.createElement("canvas");
  src.width = gw;
  src.height = gh;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  sctx.fillStyle = "#fff"; // გამჭვირვალე ფონი = არ იწვება
  sctx.fillRect(0, 0, gw, gh);
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(photo.image, 0, 0, gw, gh);
  const data = sctx.getImageData(0, 0, gw, gh);
  const px = data.data;

  // სიკაშკაშე + ავტო-დონეები (1%–99%)
  const n = gw * gh;
  const lum = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const v = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    lum[i] = v;
    hist[Math.min(255, Math.max(0, Math.round(v)))]++;
  }
  let lo = 0;
  let hi = 255;
  for (let acc = 0, i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= n * 0.01) { lo = i; break; }
  }
  for (let acc = 0, i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc >= n * 0.01) { hi = i; break; }
  }
  const span = Math.max(1, hi - lo);
  const norm = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const v = Math.min(255, Math.max(0, ((lum[i] - lo) * 255) / span));
    lum[i] = v;
    norm[Math.round(v)]++;
  }

  const burn = new Uint8Array(n);
  const shift = Number(level) * 1.6;
  if (style === "dots") {
    // Floyd–Steinberg: ნახევარტონები წერტილების სიხშირით
    for (let i = 0; i < n; i++) lum[i] = Math.min(255, Math.max(0, lum[i] - shift));
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        const old = lum[i];
        const nv = old < 128 ? 0 : 255;
        burn[i] = nv === 0 ? 1 : 0;
        const err = old - nv;
        if (x + 1 < gw) lum[i + 1] += (err * 7) / 16;
        if (y + 1 < gh) {
          if (x > 0) lum[i + gw - 1] += (err * 3) / 16;
          lum[i + gw] += (err * 5) / 16;
          if (x + 1 < gw) lum[i + gw + 1] += err / 16;
        }
      }
    }
  } else {
    const t = Math.min(250, Math.max(5, otsu(norm, n) + shift));
    for (let i = 0; i < n; i++) burn[i] = lum[i] < t ? 1 : 0;
  }

  // ბინარული ბადე → RGBA (შავი ან გამჭვირვალე)
  const gridCanvas = document.createElement("canvas");
  gridCanvas.width = gw;
  gridCanvas.height = gh;
  const gctx = gridCanvas.getContext("2d");
  const out = gctx.createImageData(gw, gh);
  for (let i = 0; i < n; i++) {
    // ინვერსია: მუქ ფონიან ფოტოზე ფონის ნაცვლად საგანი ამოიწვება
    const on = invert ? !burn[i] : burn[i];
    out.data[i * 4 + 3] = on ? 255 : 0;
  }
  gctx.putImageData(out, 0, 0);

  // საჭირო გარჩევადობაზე — მკვეთრი კიდეებით (nearest neighbour)
  const mask = document.createElement("canvas");
  mask.width = Math.max(1, Math.round(wMm * pxPerMm));
  mask.height = Math.max(1, Math.round(hMm * pxPerMm));
  const mctx = mask.getContext("2d");
  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(gridCanvas, 0, 0, mask.width, mask.height);
  return mask;
}
