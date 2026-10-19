/**
 * Cloudinary delivery helper.
 *
 * რატომ არსებობს: DB-ში ინახება ატვირთული ფაილის ორიგინალი URL (`secure_url`).
 * თუ ამ URL-ს პირდაპირ ჩავსვამთ `<img src>`-ში, ბრაუზერამდე მიდის სრული
 * ორიგინალი — ხშირად 3–10 MB-იანი PNG ტელეფონის კამერიდან. სწორედ ამან
 * გადააჭარბებინა Cloudinary-ს უფასო ლიმიტს (30 კრედიტი 34.81-დან bandwidth-ზე).
 *
 * `cld(url, { w })` URL-ში სვამს მიწოდების ტრანსფორმაციას:
 *   f_auto  — ბრაუზერს მიაწვდის AVIF/WebP-ს (გამჭვირვალობა ნარჩუნდება),
 *             ძველ ბრაუზერს კი ორიგინალ ფორმატს
 *   q_auto  — კუმშავს მხოლოდ იქამდე, სანამ სხვაობა თვალით შესამჩნევი გახდება
 *   c_limit — მხოლოდ ამცირებს და პროპორციას ინარჩუნებს; არასდროს ჭრის და
 *             არასდროს აწელავს, ამიტომ გამოსახულება ვიზუალურად იგივე რჩება
 *
 * მნიშვნელოვანი: ორიგინალი Cloudinary-ზე ხელუხლებელი რჩება — ტრანსფორმაცია
 * მხოლოდ ახალ, წარმოებულ (derived) ასლს ქმნის. აქედან ფოტოს დაკარგვა შეუძლებელია.
 *
 * უსაფრთხოება: ნებისმიერი გაურკვეველი შემთხვევა ბრუნდება შეუცვლელ URL-ზე.
 * ყველაზე ცუდი, რაც შეიძლება მოხდეს, არის „ეს ერთი სურათი არ დაოპტიმიზდა" —
 * და არა „ეს სურათი აღარ ჩანს".
 */

/* res.cloudinary.com/<cloud>/(image|video)/upload/<rest> */
const CLOUDINARY_UPLOAD_RE =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(.+)$/i;

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|avif|gif|svg|heic|heif|bmp|tiff?)$/i;

/* Cloudinary-ს ტრანსფორმაციის სეგმენტი: `w_600`, `f_auto,q_auto`, `c_fill,w_80,h_80`.
 * public_id-ს კი ან გაფართოება აქვს (`my_photo.png`), ან ვერსია (`v1774800337`),
 * ან საქაღალდე (`artopia`) — არც ერთი ამ შაბლონს არ ხვდება. */
const TRANSFORM_SEGMENT_RE = /^[a-z]{1,3}_[^/]*$/i;

const looksLikeTransform = (segment) =>
  TRANSFORM_SEGMENT_RE.test(segment) && !IMAGE_EXT_RE.test(segment);

/**
 * აბრუნებს იმავე სურათს მიწოდებისთვის ოპტიმიზებული URL-ით.
 *
 * @param {string} url  ორიგინალი Cloudinary URL (სხვა ნებისმიერი მნიშვნელობა
 *                      უცვლელად ბრუნდება — ლოკალური `/noimage.jpeg`, placeholder,
 *                      data: URI, null, undefined)
 * @param {{ w?: number }} [opts]  `w` — მაქსიმალური სიგანე პიქსელებში
 * @returns {string} მიწოდების URL
 */
export function cld(url, opts = {}) {
  if (typeof url !== "string") return url;

  const trimmed = url.trim();
  if (!trimmed) return url;

  const match = trimmed.match(CLOUDINARY_UPLOAD_RE);
  if (!match) return url; // არა Cloudinary — ხელს არ ვახლებთ

  const [, base, rest] = match;

  // უკვე აქვს ტრანსფორმაცია — ხელახლა არ ვდებთ
  const firstSegment = rest.split("/")[0];
  if (looksLikeTransform(firstSegment)) return url;

  const params = ["f_auto", "q_auto"];
  const width = Number(opts.w);
  if (Number.isFinite(width) && width > 0) {
    params.push("c_limit", `w_${Math.round(width)}`);
  }

  return `${base}${params.join(",")}/${rest}`;
}

/**
 * ჩვენების ზომები. რიცხვები ორჯერ აღემატება CSS-ში დახატულ რეალურ ზომას,
 * რომ retina ეკრანზეც მკვეთრი დარჩეს.
 */
export const IMG = {
  MINI: 160, // კალათის / checkout-ის ~60px მინიატურა
  THUMB: 240, // პროდუქტის გვერდის 100px thumbnail-ები
  ADMIN: 300, // admin სიების მინიატურები
  CARD: 600, // პროდუქტის ქარდი (max-height 220px)
  BLOG_CARD: 800, // ბლოგის ქარდის ყდა
  DETAIL: 1200, // პროდუქტის მთავარი ფოტო (max-width 560px)
  HERO: 1600, // მთავარი გვერდის carousel
  ZOOM: 1600, // გადიდების მოდალი (მობილურზე pinch-zoom-ია)
};

/**
 * `srcset` Cloudinary-ს იმავე სურათის რამდენიმე სიგანისთვის. არა-Cloudinary URL-ზე
 * (ლოკალური placeholder და სხვ.) აბრუნებს undefined-ს — ატრიბუტი უბრალოდ არ იწერება.
 */
export function cldSrcSet(url, widths) {
  if (typeof url !== "string" || !CLOUDINARY_UPLOAD_RE.test(url.trim())) return undefined;
  const first = cld(url, { w: widths[0] });
  if (first === url) return undefined; // უკვე ტრანსფორმირებული URL — ხელს არ ვახლებთ
  return widths.map((w) => `${cld(url, { w })} ${w}w`).join(", ");
}

/**
 * ერთი წყარო `<img>`-ისთვის და edge function-ის `<link rel="preload">`-ისთვის:
 * preload მხოლოდ მაშინ მუშაობს, თუ src/srcset/sizes ზუსტად ემთხვევა სურათს.
 */
const RESPONSIVE = {
  // პროდუქტის ბარათი: მობილურზე 2 სვეტი, დიდ ეკრანზე ~260–300px
  card: { w: IMG.CARD, widths: [300, 450, 600], sizes: "(max-width: 640px) 46vw, (max-width: 1100px) 30vw, 300px" },
  // პროდუქტის მთავარი ფოტო (max-width 560px)
  // პროდუქტის მთავარი ფოტო: ტელეფონზე ზუსტად ეკრანი − 68px (გაზომილი 375→309, 412→343,
  // 600→531), 628px-დან კი 560px. ადრე „92vw" ზედმეტად დიდ ფაილს ირჩევდა (375px/2x → w_900,
  // 219 KB; ახლა w_640, 118 KB). ხარისხი იგივეა — მხოლოდ ზედმეტი პიქსელები აღარ მოდის.
  detail: { w: IMG.DETAIL, widths: [480, 640, 800, 1000, 1200], sizes: "(max-width: 628px) calc(100vw - 68px), 560px" },
  // „მსგავსი პროდუქტების" პატარა ბარათი პროდუქტის გვერდზე: ტელეფონზე ~42vw, სხვაგან ≤ 210px
  related: { w: IMG.CARD, widths: [240, 320, 450, 600], sizes: "(max-width: 640px) 42vw, 210px" },
  // მთავარი გვერდის carousel (გვერდის სიგანეზე, მაქს. 1600px)
  hero: { w: IMG.HERO, widths: [800, 1200, 1600], sizes: "(max-width: 1600px) 100vw, 1600px" },
  // ბლოგის ბარათი: მობილურზე თითქმის სრული სიგანე, desktop-ზე ~300px
  blog: { w: IMG.BLOG_CARD, widths: [320, 480, 800], sizes: "(max-width: 700px) 92vw, 320px" },
  // მთავარი კატეგორიის 16:9 ბარათი
  // ტელეფონზე 1, ტაბლეტზე 2, დიდ ეკრანზე 3 ბარათი ხაზზე
  category: { w: 1200, widths: [480, 800, 1200], sizes: "(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw" },
};

export function responsiveImage(url, kind) {
  const spec = RESPONSIVE[kind];
  const srcSet = cldSrcSet(url, spec.widths);
  return { src: cld(url, { w: spec.w }), srcSet, sizes: srcSet ? spec.sizes : undefined };
}

export default cld;
