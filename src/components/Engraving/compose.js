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

/**
 * ფოტოს ზომა მრგვალ ზონაში (დიამეტრი D): ფოტო + მის ქვეშ `extraH` სიმაღლის და
 * `minW` სიგანის ბლოკი (ტექსტი) ერთად უნდა ჩაეტიოს წრეში — ანუ მთლიანი
 * მართკუთხედის დიაგონალი ≤ D. ბინარული ძებნა ფოტოს სიმაღლეზე.
 */
function fitPhotoInCircle(photo, D, extraH, minW) {
  const a = photo.width / photo.height;
  const fits = (ph) => Math.hypot(Math.max(a * ph, minW), ph + extraH) <= D;
  let lo = 0;
  let hi = D;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return [a * lo, lo];
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

  const circle = product.shape === "circle";
  // მრგვალ ზონაში ბლოკის დიაგონალი დიამეტრს არ უნდა აღემატებოდეს (კუთხეები წრის შიგნით)
  const fitEm = (maxEm, availW, availH) => {
    let em = Math.min(maxEm, (availW / unitsW) * 100, (availH / unitsH) * 100);
    if (circle) em = Math.min(em, (W / Math.hypot(unitsW, unitsH)) * 100);
    return em;
  };

  let photoBox = null;
  if (lines.length && !usePhoto) {
    emMm = fitEm(product.maxTextMm, W, H);
  } else if (!lines.length && usePhoto) {
    const [pw, ph] = circle ? fitPhotoInCircle(photo, W, 0, 0) : fitPhotoMm(photo, W, H);
    photoBox = { w: pw, h: ph };
  } else if (!circle) {
    // ფოტო + ტექსტი: ტექსტს ვზღუდავთ ისე, რომ ფოტოს სიმაღლის ნახევარი მაინც დარჩეს
    const maxTextH = H * (1 - PHOTO_MIN_SHARE) - GAP_MM;
    emMm = fitEm(Math.min(product.maxTextMm, TEXT_WITH_PHOTO_MAX_MM), W, maxTextH);
    const textH = (unitsH * emMm) / 100;
    const [pw, ph] = fitPhotoMm(photo, W, H - textH - GAP_MM);
    photoBox = { w: pw, h: ph };
  } else {
    // მრგვალი ზონა, ფოტო + ტექსტი: ვეძებთ უდიდეს ტექსტს, რომლის დროსაც ფოტოს
    // სიმაღლის მინიმუმ 40% რჩება და მთელი ბლოკი წრეში ეტევა
    let em = fitEm(Math.min(product.maxTextMm, TEXT_WITH_PHOTO_MAX_MM), W * 0.92, H * 0.45);
    for (let i = 0; i < 40; i++) {
      const tw = (unitsW * em) / 100;
      const th = (unitsH * em) / 100;
      const [pw, ph] = fitPhotoInCircle(photo, W, th + GAP_MM, tw);
      if (ph >= H * 0.4 || em <= product.minTextMm * 0.6) {
        photoBox = { w: pw, h: ph };
        break;
      }
      em *= 0.94;
    }
    emMm = em;
    if (!photoBox) {
      const [pw, ph] = fitPhotoInCircle(photo, W, (unitsH * em) / 100 + GAP_MM, (unitsW * em) / 100);
      photoBox = { w: pw, h: ph };
    }
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

  // მრგვალ ზონაზე წრის გარეთ არაფერი ამოიწვება (ბექიც იგივეს ამოწმებს)
  if (product.shape === "circle") {
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
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

/**
 * ნიღბის შეღებვა 3D პრევიუსთვის მასალის მიხედვით (look — ENGRAVE_LOOKS-იდან):
 *   halo — ირგვლივ დამწვრის კვალი (გაბუნდოვანებული), edge — ღარის კიდე
 *   (~0.07 მმ-ით წანაცვლებული, სიღრმის შთაბეჭდილებისთვის), fill — თავად ამოწვა.
 */
export function tintMask(maskCanvas, look, pxPerMm = PX_PER_MM) {
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
  if (look.halo) {
    ctx.globalAlpha = 0.45;
    ctx.drawImage(tint(look.halo, Math.max(1, pxPerMm * 0.06)), 0, 0);
    ctx.globalAlpha = 1;
  }
  if (look.edge) {
    const o = Math.max(1, Math.round(pxPerMm * (look.edgeMm || 0.07)));
    ctx.globalAlpha = 0.95;
    ctx.drawImage(tint(look.edge), o, o);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(tint(look.fill), 0, 0);
  return out;
}
