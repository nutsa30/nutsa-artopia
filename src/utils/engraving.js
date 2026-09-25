/**
 * გრავირების წესები (ფრონტი).
 *
 * ⚠ ავტორიტეტული ვერსია ბექენდშია (`app/engraving.py`) — ფასი, ლიმიტები და
 *   ვადები იქ ითვლება. აქაური რიცხვები მხოლოდ გვერდის/კალათის პრევიუსთვისაა
 *   და ყოველთვის ბექს უნდა ემთხვეოდეს.
 *
 * წესები:
 *   • კალამი — 25₾, მხოლოდ წარწერა (ერთი ხაზი), სამაგრის მოპირდაპირე მხარეს.
 *   • ბრელოკი — ერთ მხარეს 13₾, ორივე მხარეს ჯამში 20₾; წარწერა და/ან ფოტო.
 *   • დამზადება 2-3 სამუშაო დღე (შაბათ-კვირა არ ითვლება); მთელი შეკვეთა
 *     ერთად გაიცემა — ადგილზე აღებაც და კურიერიც ამ ვადის შემდეგ.
 *   • ერთ შეკვეთაში მაქსიმუმ 5 გრავირებული ცალი; მეტზე — დაგვიკავშირდნენ.
 *   • პრომო კოდი გრავირებაზე არ ვრცელდება; მინიმალური შეკვეთის წესი არ მოქმედებს.
 *   • გადახდა მხოლოდ წინასწარ, ბარათით.
 */

export const MAX_ENGRAVED_UNITS = 5;
export const PRODUCTION_LABEL = "2-3 სამუშაო დღე";
const PRODUCTION_DAYS_MIN = 2;
const PRODUCTION_DAYS_MAX = 3;

/** ლაზერის ფაილის გარჩევადობა — ბექიც ამას ამოწმებს (20px/მმ ≈ 508 DPI) */
export const PX_PER_MM = 20;

export const ENGRAVING_PRODUCTS = {
  pen: {
    key: "pen",
    name: "გრავირებული კალამი",
    shortName: "კალამი",
    prices: { 1: 25 },
    allowPhoto: false,
    maxLines: 1,
    zoneMm: [54, 6],
    // ტექსტის სიმაღლე (em, მმ): ზედა ზღვარი და მინიმუმი, რომლის ქვემოთაც ამოწვა აღარ იკითხება
    maxTextMm: 4.4,
    minTextMm: 2.4,
    image: "/images/engraving/pen.webp",
    model: "/models/engraving/pen.glb",
    note: "ოქროსფერი კალამი — წარწერა ღია, მოყვითალო ოქროსფრად ამოიწვება",
  },
  keychain: {
    key: "keychain",
    name: "გრავირებული ბრელოკი",
    shortName: "ბრელოკი",
    prices: { 1: 13, 2: 20 },
    allowPhoto: true,
    maxLines: 3,
    zoneMm: [29, 29],
    maxTextMm: 7.5,
    minTextMm: 2.4,
    image: "/images/engraving/keychain.webp",
    model: "/models/engraving/keychain.glb",
    note: "ხის ბრელოკი 3.5 × 3.5 სმ — გრავირება მუქად, დამწვრის ფერით ამოიწვება",
  },
};

export const SIDE_LABELS = { front: "წინა მხარე", back: "უკანა მხარე" };

export const engravingPrice = (productKey, sides) =>
  ENGRAVING_PRODUCTS[productKey]?.prices?.[sides] ?? null;

/* ---------- შრიფტები (ფაილები: public/fonts/engraving) ---------- */
const GEORGIAN_RANGE = "U+0589, U+10A0-10FF, U+1C90-1CBA, U+1CBD-1CBF, U+205A, U+2D00-2D2F, U+2E31";
const LATIN_RANGE =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const F = "/fonts/engraving/";

export const ENGRAVING_FONTS = [
  {
    id: "ka-serif",
    label: "კლასიკური",
    family: "Engr Noto Serif Georgian",
    georgian: true,
    files: [
      { url: `${F}noto-serif-georgian-600-georgian.woff2`, range: GEORGIAN_RANGE },
      { url: `${F}noto-serif-georgian-600-latin.woff2`, range: LATIN_RANGE },
    ],
  },
  {
    id: "ka-sans",
    label: "თანამედროვე",
    family: "Engr Noto Sans Georgian",
    georgian: true,
    files: [
      { url: `${F}noto-sans-georgian-500-georgian.woff2`, range: GEORGIAN_RANGE },
      { url: `${F}noto-sans-georgian-500-latin.woff2`, range: LATIN_RANGE },
    ],
  },
  {
    id: "ka-soft",
    label: "რბილი",
    family: "Engr Google Sans",
    georgian: true,
    files: [
      { url: `${F}google-sans-500-georgian.woff2`, range: GEORGIAN_RANGE },
      { url: `${F}google-sans-500-latin.woff2`, range: LATIN_RANGE },
    ],
  },
  {
    id: "ka-italic",
    label: "დახრილი",
    family: "Engr FiraGO Italic",
    georgian: true,
    files: [{ url: `${F}firago-italic.woff2` }],
  },
  {
    id: "en-script",
    label: "Great Vibes",
    family: "Engr Great Vibes",
    georgian: false,
    files: [{ url: `${F}great-vibes-400-latin.woff2`, range: LATIN_RANGE }],
  },
  {
    id: "en-hand",
    label: "Dancing Script",
    family: "Engr Dancing Script",
    georgian: false,
    files: [{ url: `${F}dancing-script-600-latin.woff2`, range: LATIN_RANGE }],
  },
  {
    id: "en-serif",
    label: "Playfair Display",
    family: "Engr Playfair Display",
    georgian: false,
    files: [{ url: `${F}playfair-display-600-latin.woff2`, range: LATIN_RANGE }],
  },
  {
    id: "en-sans",
    label: "Montserrat",
    family: "Engr Montserrat",
    georgian: false,
    files: [{ url: `${F}montserrat-500-latin.woff2`, range: LATIN_RANGE }],
  },
];

export const DEFAULT_FONT_ID = "ka-serif";
export const fontById = (id) => ENGRAVING_FONTS.find((f) => f.id === id) || null;

/* ---------- ტექსტის წესები (ბექზე იგივე: ALLOWED_TEXT_RE) ---------- */
export const MAX_LINE_CHARS = 40;
const ALLOWED_CHAR_RE = /[ა-ჰA-Za-z0-9 .,!?\-'"&@#+:;()/*„“”’–—]/;
const GEORGIAN_RE = /[ა-ჰ]/;

/** აბრუნებს {text, removed}: დაუშვებელი სიმბოლოები ამოღებულია */
export const sanitizeEngravingText = (raw) => {
  let removed = false;
  const out = Array.from(String(raw ?? ""))
    .filter((ch) => {
      if (ch === "\n") return true;
      const ok = ALLOWED_CHAR_RE.test(ch);
      if (!ok) removed = true;
      return ok;
    })
    .join("");
  return { text: out, removed };
};

export const hasGeorgian = (text) => GEORGIAN_RE.test(String(text || ""));

export const fontSupportsText = (font, text) => !!font && (font.georgian || !hasGeorgian(text));

/* ---------- ვადები (სამუშაო დღეები, თბილისის დროით) ---------- */
const MONTHS_KA = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
];
const WEEKDAYS_KA = ["კვირა", "ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი"];

/** დღევანდელი თარიღი თბილისში (UTC შუადღე — დროის სარტყელი თარიღს აღარ ცვლის) */
const tbilisiToday = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};

const addBusinessDays = (date, n) => {
  const d = new Date(date.getTime());
  let added = 0;
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) added += 1;
  }
  return d;
};

const fmtDateKa = (d) => `${WEEKDAYS_KA[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_KA[d.getUTCMonth()]}`;

/** 'სამშაბათი, 29 სექტემბერი – ოთხშაბათი, 30 სექტემბერი' */
export const productionWindowLabel = (now = new Date()) => {
  const start = tbilisiToday(now);
  return `${fmtDateKa(addBusinessDays(start, PRODUCTION_DAYS_MIN))} – ${fmtDateKa(
    addBusinessDays(start, PRODUCTION_DAYS_MAX)
  )}`;
};

export const engravingPickupLabel = (now = new Date()) =>
  `${PRODUCTION_LABEL}ში (${productionWindowLabel(now)})`;

export const engravingCourierEta = (baseEta) => `დამზადება ${PRODUCTION_LABEL} + მიტანა ${baseEta}`;

/* ---------- კალათა ---------- */
export const isEngravingItem = (item) => !!item?.engraving_token;

export const engravingUnits = (cartItems = []) =>
  cartItems.reduce((s, it) => s + (isEngravingItem(it) ? Number(it.quantity) || 0 : 0), 0);

export const cartHasEngraving = (cartItems = []) => cartItems.some(isEngravingItem);

/** კალათის ხაზის მოკლე აღწერა: «ნუცა» · კლასიკური · ფოტო */
export const engravingSummary = (item) => {
  const sides = item?.engraving?.sides_detail || [];
  return sides
    .map((s) => {
      const parts = [];
      if (s.lines?.length) parts.push(`«${s.lines.join(" / ")}»`);
      if (s.font_label && s.lines?.length) parts.push(s.font_label);
      if (s.has_photo) parts.push("ფოტო");
      const body = parts.join(" · ");
      return sides.length > 1 ? `${SIDE_LABELS[s.side] || s.side}: ${body}` : body;
    })
    .join("  |  ");
};
