/**
 * ერთი მხარის გრავირების აწყობა: ტექსტი და/ან ფოტო ზონაში, ავტომატურად.
 *
 * ყველაფერი მილიმეტრებში ითვლება და მერე `pxPerMm`-ზე იხატება, ამიტომ
 * 3D პრევიუ (40px/მმ) და ლაზერის ფაილი (20px/მმ) ზუსტად ერთნაირ განლაგებას
 * იღებს. შედეგი — ნიღაბი: შავი = ამოიწვება, გამჭვირვალე = ხელუხლებელი.
 *
 * განლაგება:
 *   • მხოლოდ ტექსტი — რაც შეიძლება დიდი (არაუმეტეს maxTextMm), ცენტრში
 *   • მხოლოდ ფოტო   — ზონაში ჩატეული, პროპორციის შენარჩუნებით, ცენტრში
 *   • ორივე         — ფოტო ზემოთ, ტექსტი ქვემოთ, მთელი ბლოკი ცენტრში
 */
import { ENGRAVING_PRODUCTS, PX_PER_MM } from "../../utils/engraving";
import { canvasFont } from "./fonts";
import { photoMask, fitPhotoMm } from "./photo";

const LINE_PITCH = 1.25; // ხაზებს შორის მანძილი em-ებში
const TEXT_WITH_PHOTO_MAX_MM = 4.2; // ფოტოსთან ერთად ტექსტის ზედა ზღვარი
const PHOTO_MIN_SHARE = 0.5; // ფოტოს ზონის სიმაღლის მინიმუმ ნახევარი ეკუთვნის
const GAP_MM = 1.5; // ფოტოსა და ტექსტს შორის

/** ტექსტის ხაზები: ცარიელი ხაზები ამოღებულია; კალამზე ყველაფერი ერთ ხაზად */
export function textLines(productKey, raw) {
  const product = ENGRAVING_PRODUCTS[productKey];
  const lines = String(raw || "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (!product) return lines;
  if (product.maxLines === 1) return lines.length ? [lines.join(" ")] : [];
  return lines.slice(0, product.maxLines);
}

let measureCtx = null;
const measurer = () => {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  return measureCtx;
};

/** ხაზების ზომა 100px შრიფტზე (ანუ em = 100 ერთეული) */
function measureLines(lines, fontId) {
  const ctx = measurer();
  ctx.font = canvasFont(fontId, 100);
  ctx.textBaseline = "alphabetic";
  return lines.map((line) => {
    const m = ctx.measureText(line);
    return {
      left: m.actualBoundingBoxLeft || 0,
      right: m.actualBoundingBoxRight || m.width,
      ascent: m.actualBoundingBoxAscent || 70,
      descent: m.actualBoundingBoxDescent || 0,
    };
  });
}

/** ტექსტის ბლოკის ზომები em-ზე (100-იან ერთეულებში) */
function blockUnits(metrics) {
  const maxW = Math.max(...metrics.map((m) => m.left + m.right));
  const n = metrics.length;
  const h = (n - 1) * LINE_PITCH * 100 + metrics[0].ascent + metrics[n - 1].descent;
  return { maxW, h };
}

/**
 * განლაგების გამოთვლა (მმ). photo — { width, height, ... } ან null.
 * აბრუნებს { lines, emMm, textBlockMm, photoBox, empty, tooSmall }
 */
export function layoutSide(productKey, { text, fontId, photo }) {
  const product = ENGRAVING_PRODUCTS[productKey];
  const [W, H] = product.zoneMm;
  const lines = textLines(productKey, text);
  const usePhoto = !!photo && product.allowPhoto;

  if (!lines.length && !usePhoto) {
    return { lines, emMm: 0, textBlockMm: 0, photoBox: null, empty: true, tooSmall: false };
  }

  let emMm = 0;
  let metrics = null;
  let unitsW = 0;
  let unitsH = 0;
  if (lines.length) {
    metrics = measureLines(lines, fontId);
    ({ maxW: unitsW, h: unitsH } = blockUnits(metrics));
  }

  const fitEm = (maxEm, availW, availH) =>
    Math.min(maxEm, (availW / unitsW) * 100, (availH / unitsH) * 100);

  let photoBox = null;
  if (lines.length && !usePhoto) {
    emMm = fitEm(product.maxTextMm, W, H);
  } else if (!lines.length && usePhoto) {
    const [pw, ph] = fitPhotoMm(photo, W, H);
    photoBox = { w: pw, h: ph };
  } else {
    // ფოტო + ტექსტი: ტექსტს ვზღუდავთ ისე, რომ ფოტოს სიმაღლის ნახევარი მაინც დარჩეს
    const maxTextH = H * (1 - PHOTO_MIN_SHARE) - GAP_MM;
    emMm = fitEm(Math.min(product.maxTextMm, TEXT_WITH_PHOTO_MAX_MM), W, maxTextH);
    const textH = (unitsH * emMm) / 100;
    const [pw, ph] = fitPhotoMm(photo, W, H - textH - GAP_MM);
    photoBox = { w: pw, h: ph };
  }

  const textBlockMm = lines.length ? (unitsH * emMm) / 100 : 0;
  return {
    lines,
    metrics,
    emMm,
    textBlockMm,
    photoBox,
    empty: false,
    tooSmall: lines.length > 0 && emMm < product.minTextMm,
  };
}

/**
 * მხარის ნიღბის დახატვა. side = { text, fontId, photo, photoStyle, photoLevel, photoInvert }.
 * აბრუნებს { canvas, layout }.
 */
export function composeSide(productKey, side, pxPerMm = PX_PER_MM) {
  const product = ENGRAVING_PRODUCTS[productKey];
  const [W, H] = product.zoneMm;
  const photo = product.allowPhoto ? side.photo : null;
  const layout = layoutSide(productKey, { text: side.text, fontId: side.fontId, photo });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * pxPerMm);
  canvas.height = Math.round(H * pxPerMm);
  if (layout.empty) return { canvas, layout };

  const ctx = canvas.getContext("2d");
  const s = pxPerMm;
  const gap = layout.photoBox && layout.lines.length ? GAP_MM : 0;
  const blockH = (layout.photoBox ? layout.photoBox.h : 0) + gap + layout.textBlockMm;
  let y = (H - blockH) / 2; // მმ, ბლოკის ზედა კიდე

  if (layout.photoBox) {
    const { w, h } = layout.photoBox;
    const mask = photoMask(
      photo,
      w,
      h,
      { style: side.photoStyle, level: side.photoLevel, invert: !!side.photoInvert },
      pxPerMm
    );
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mask, Math.round(((W - w) / 2) * s), Math.round(y * s));
    y += h + gap;
  }

  if (layout.lines.length) {
    const em = layout.emMm;
    ctx.font = canvasFont(side.fontId, em * s);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = "#000";
    const k = em / 100; // 100-იანი ერთეულიდან მმ-ში
    let baseline = y + layout.metrics[0].ascent * k;
    layout.lines.forEach((line, i) => {
      const m = layout.metrics[i];
      // ვიზუალური ცენტრი (დახრილ შრიფტებზეც ზუსტია)
      const x = W / 2 - ((m.right - m.left) * k) / 2;
      ctx.fillText(line, x * s, baseline * s);
      baseline += LINE_PITCH * em;
    });
  }

  return { canvas, layout };
}

/** ლაზერის ფაილი: თეთრ ფონზე შავი, ზონის ზუსტი ზომით (20px/მმ) */
export function laserPngBlob(maskCanvas) {
  const out = document.createElement("canvas");
  out.width = maskCanvas.width;
  out.height = maskCanvas.height;
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(maskCanvas, 0, 0);
  return new Promise((resolve) => out.toBlob(resolve, "image/png"));
}

/** ნიღბის შეღებვა 3D პრევიუსთვის: ხე — დამწვარი მუქი, კალამი — ღია ოქროსფერი */
export function tintMask(maskCanvas, productKey) {
  const tint = (color, blurPx = 0) => {
    const c = document.createElement("canvas");
    c.width = maskCanvas.width;
    c.height = maskCanvas.height;
    const x = c.getContext("2d");
    if (blurPx && "filter" in x) x.filter = `blur(${blurPx}px)`;
    x.drawImage(maskCanvas, 0, 0);
    x.filter = "none";
    x.globalCompositeOperation = "source-in";
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  };

  const out = document.createElement("canvas");
  out.width = maskCanvas.width;
  out.height = maskCanvas.height;
  const ctx = out.getContext("2d");
  if (productKey === "keychain") {
    // ამოწვის ირგვლივ ოდნავ შეყვითლებული/მოყავისფრო კვალი, შუაში — მუქი
    ctx.globalAlpha = 0.45;
    ctx.drawImage(tint("#6b4423", Math.max(1, maskCanvas.width / 500)), 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(tint("#23150b"), 0, 0);
  } else {
    // ოქროსფერ საფარზე ამოწვა ღია, მოყვითალო, მქრქალ ლითონს აჩენს
    ctx.drawImage(tint("#fbe9a6"), 0, 0);
  }
  return out;
}
