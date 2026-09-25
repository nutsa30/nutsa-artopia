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

/**
 * ამოწვის ვიზუალი მასალის მიხედვით (3D პრევიუსთვის; ლაზერის ფაილი ყოველთვის შავ-თეთრია).
 *   fill  — ამოწვის ფერი
 *   edge  — ღარის კიდე (სიღრმის ჩრდილი/შუქი), რომ წარწერა მკაფიოდ იკითხებოდეს
 *   halo  — დამწვრის ნაკვალევი ირგვლივ (ხე, ტყავი)
 *   glow  — რამდენად "ანათებს" ამოწვა ლითონის ანარეკლში (emissive)
 */
export const ENGRAVE_LOOKS = {
  // ოქროსფერ საფარზე ამოწვა ღია, მოყვითალო ლითონს აჩენს
  gold: { fill: "#fff3bf", edge: "#5c4210", glow: 0.45, metalness: 0.1, roughness: 0.55 },
  // ნაცრისფერ ლაქზე — ვერცხლისფერ-თეთრი ლითონი
  lacquerSilver: { fill: "#f7f9fb", edge: "#2f3338", glow: 0.4, metalness: 0.1, roughness: 0.5 },
  // წითელ ლაქზე — თეთრი ლითონი
  lacquerRed: { fill: "#f8f8f8", edge: "#4a0a0a", glow: 0.4, metalness: 0.1, roughness: 0.5 },
  // მთლიანად ლითონის (მუქი ვერცხლისფერი) კორპუსზე — მქრქალი, ღია, "გახეხილი" ლითონი
  steel: { fill: "#eef0f2", edge: "#1c1e21", glow: 0.35, metalness: 0.1, roughness: 0.55 },
  // მუქ ხეზე — კიდევ უფრო მუქი ნამწვი; ღარის ღია კიდე, რომ მუქ ხეზეც იკითხებოდეს
  darkWood: { fill: "#0a0402", edge: "#e2b88c", edgeMm: 0.1, glow: 0, metalness: 0, roughness: 0.95 },
  // ღია ხეზე — დამწვრის მუქი ფერი, ირგვლივ მოყავისფრო კვალით
  wood: { fill: "#23150b", halo: "#6b4423", glow: 0, metalness: 0, roughness: 0.95 },
  // ტყავზე — თეთრზე/ყავისფერზე/წითელზე მუქი ნამწვი; შავზე ლაზერი ღია, ნაცრისფერ კვალს ტოვებს
  "leather-white": { fill: "#35251a", halo: "#8a6a50", glow: 0, metalness: 0, roughness: 0.9 },
  "leather-brown": { fill: "#1c0d05", halo: "#3a2012", glow: 0, metalness: 0, roughness: 0.9 },
  "leather-red": { fill: "#140302", halo: "#3a0806", glow: 0, metalness: 0, roughness: 0.9 },
  "leather-black": { fill: "#958a80", edge: "#050505", glow: 0.15, metalness: 0, roughness: 0.9 },
};

/** ტყავის ბრელოკების ფერები. tint — თეთრ მოდელზე ფერის გამრავლება (მხოლოდ ტყავზე, არა რგოლზე) */
export const LEATHER_COLORS = [
  { id: "white", label: "თეთრი", swatch: "#f3f0ea", tint: "#ffffff" },
  { id: "black", label: "შავი", swatch: "#1d1d1f", tint: "#2b2b2d" },
  { id: "brown", label: "ყავისფერი", swatch: "#7b4a2a", tint: "#8a5431" },
  { id: "red", label: "წითელი", swatch: "#a3161a", tint: "#b3171c" },
];

const KEYCHAIN_PRICES = { 1: 13, 2: 20 };

export const ENGRAVING_PRODUCTS = {
  pen: {
    key: "pen",
    category: "pen",
    name: "ოქროსფერი კალამი",
    prices: { 1: 25 },
    allowPhoto: false,
    maxLines: 1,
    zoneMm: [54, 6],
    shape: "rect",
    // ტექსტის სიმაღლე (em, მმ): ზედა ზღვარი და მინიმუმი, რომლის ქვემოთაც ამოწვა აღარ იკითხება
    maxTextMm: 4.4,
    minTextMm: 2.4,
    look: "gold",
    image: "/images/engraving/pen.webp",
    model: "/models/engraving/pen.glb",
    note: "წარწერა ღია, მოყვითალო ოქროსფრად ამოიწვება",
  },
  "pen-silver": {
    key: "pen-silver",
    category: "pen",
    name: "ვერცხლისფერი კალამი",
    prices: { 1: 23 },
    allowPhoto: false,
    maxLines: 1,
    zoneMm: [50, 6],
    shape: "rect",
    maxTextMm: 4.4,
    minTextMm: 2.4,
    look: "lacquerSilver",
    image: "/images/engraving/pen-silver.webp",
    model: "/models/engraving/pen-silver.glb",
    note: "ოქროსფერი დეტალებით — წარწერა ღია ვერცხლისფრად ამოიწვება",
  },
  "pen-fullsilver": {
    key: "pen-fullsilver",
    category: "pen",
    name: "ლითონის კალამი",
    prices: { 1: 18 },
    allowPhoto: false,
    maxLines: 1,
    zoneMm: [48, 6],
    shape: "rect",
    maxTextMm: 4.4,
    minTextMm: 2.4,
    look: "steel",
    image: "/images/engraving/pen-fullsilver.webp",
    model: "/models/engraving/pen-fullsilver.glb",
    note: "მთლიანად ლითონის — წარწერა ღია, მქრქალ ლითონად ამოიწვება",
  },
  "pen-red": {
    key: "pen-red",
    category: "pen",
    name: "წითელი კალამი",
    prices: { 1: 16 },
    allowPhoto: false,
    maxLines: 1,
    zoneMm: [54, 6],
    shape: "rect",
    maxTextMm: 4.4,
    minTextMm: 2.4,
    look: "lacquerRed",
    image: "/images/engraving/pen-red.webp",
    model: "/models/engraving/pen-red.glb",
    note: "წარწერა თეთრ-ვერცხლისფრად ამოიწვება",
  },
  "pen-rifle": {
    key: "pen-rifle",
    category: "pen",
    name: "კალამი „თოფი“",
    prices: { 1: 32 },
    allowPhoto: false,
    maxLines: 1,
    zoneMm: [44, 7],
    shape: "rect",
    maxTextMm: 5,
    minTextMm: 2.6,
    look: "darkWood",
    image: "/images/engraving/pen-rifle.webp",
    model: "/models/engraving/pen-rifle.glb",
    note: "წარწერა ხის სახელურზე, მუქ ნამწვად ამოიწვება",
  },
  keychain: {
    key: "keychain",
    category: "keychain",
    name: "ხის ბრელოკი — კვადრატი",
    sizeLabel: "3.5 × 3.5 სმ",
    prices: KEYCHAIN_PRICES,
    allowPhoto: true,
    maxLines: 3,
    zoneMm: [29, 29],
    shape: "rect",
    maxTextMm: 7.5,
    minTextMm: 2.4,
    look: "wood",
    image: "/images/engraving/keychain.webp",
    model: "/models/engraving/keychain.glb",
    note: "გრავირება მუქად, დამწვრის ფერით ამოიწვება",
  },
  "keychain-round": {
    key: "keychain-round",
    category: "keychain",
    name: "ხის ბრელოკი — მრგვალი",
    sizeLabel: "⌀ 4 სმ",
    prices: KEYCHAIN_PRICES,
    allowPhoto: true,
    maxLines: 3,
    zoneMm: [34, 34],
    shape: "circle",
    maxTextMm: 7.5,
    minTextMm: 2.4,
    look: "wood",
    image: "/images/engraving/keychain-round.webp",
    model: "/models/engraving/keychain-round.glb",
    note: "გრავირება მუქად, დამწვრის ფერით ამოიწვება",
  },
  "leather-square": {
    key: "leather-square",
    category: "keychain",
    name: "ტყავის ბრელოკი — ოთხკუთხა",
    sizeLabel: "4 × 5.5 სმ",
    prices: KEYCHAIN_PRICES,
    allowPhoto: true,
    maxLines: 4,
    zoneMm: [32, 46],
    shape: "rect",
    maxTextMm: 8,
    minTextMm: 2.4,
    look: "leather",
    colors: LEATHER_COLORS,
    image: "/images/engraving/leather-square.webp",
    model: "/models/engraving/leather-square.glb",
    note: "4 ფერი — თეთრი, შავი, ყავისფერი, წითელი",
  },
  "leather-round": {
    key: "leather-round",
    category: "keychain",
    name: "ტყავის ბრელოკი — მრგვალი",
    sizeLabel: "⌀ 5 სმ",
    prices: KEYCHAIN_PRICES,
    allowPhoto: true,
    maxLines: 3,
    zoneMm: [25, 25],
    shape: "circle",
    maxTextMm: 6.5,
    minTextMm: 2.4,
    look: "leather",
    colors: LEATHER_COLORS,
    // ამ მოდელის "თეთრი" ტექსტურა ნაცრისფერია — ფერს ოდნავ ვანათებთ
    tintBoost: 1.3,
    image: "/images/engraving/leather-round.webp",
    model: "/models/engraving/leather-round.glb",
    note: "4 ფერი — თეთრი, შავი, ყავისფერი, წითელი",
  },
};

export const PRODUCT_GROUPS = [
  { id: "pen", label: "კალმები" },
  { id: "keychain", label: "ბრელოკები" },
];

/** ამოწვის ვიზუალი: ტყავზე ფერზეა დამოკიდებული */
export const engraveLook = (productKey, colorId) => {
  const p = ENGRAVING_PRODUCTS[productKey];
  if (!p) return ENGRAVE_LOOKS.wood;
  if (p.look === "leather") return ENGRAVE_LOOKS[`leather-${colorId || "white"}`] || ENGRAVE_LOOKS["leather-white"];
  return ENGRAVE_LOOKS[p.look] || ENGRAVE_LOOKS.wood;
};

export const colorById = (productKey, colorId) =>
  ENGRAVING_PRODUCTS[productKey]?.colors?.find((c) => c.id === colorId) || null;

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
  const text = sides
    .map((s) => {
      const parts = [];
      if (s.lines?.length) parts.push(`«${s.lines.join(" / ")}»`);
      if (s.font_label && s.lines?.length) parts.push(s.font_label);
      if (s.has_photo) parts.push("ფოტო");
      const body = parts.join(" · ");
      return sides.length > 1 ? `${SIDE_LABELS[s.side] || s.side}: ${body}` : body;
    })
    .join("  |  ");
  const color = item?.engraving?.color_label;
  return color ? `${color} · ${text}` : text;
};
