// კატალოგის გვერდების title/description — ერთი წყარო edge function-ისთვის
// (netlify/edge-functions/meta.js) და React-ისთვის (ProductsPage), რომ Google-მა
// საწყის HTML-სა და რენდერის შემდეგ ერთი და იგივე ნახოს.
import { SITE_URL, catalogPath } from "./canonical.js";

export const PRODUCTS_PER_PAGE = 20;

export function productPageMeta(p) {
  const name = String(p?.name || "").trim();
  const source = String(p?.description || "").replace(/\s+/g, " ").trim();
  const code = p?.seo_title ? ` კოდი ${p.id}.` : "";
  // Different records sharing boilerplate descriptions retain their real product name.
  const raw = source ? (source.startsWith(name) ? source : `${name} — ${source}`) : `${name} — Artopia. მიტანა მთელ საქართველოში.`;
  const budget = 160 - code.length;
  let text = raw;
  if (raw.length > budget) {
    const candidate = raw.slice(0, budget - 1);
    const boundary = candidate.lastIndexOf(" ");
    text = `${candidate.slice(0, boundary > budget * 0.6 ? boundary : candidate.length).trim()}…`;
  }
  return { title: p?.seo_title || `${name} | Artopia`, description: `${text}${code}` };
}

export function catalogMeta({ category, mainCategory, displayName, title: customTitle, description: customDescription, page } = {}) {
  const n = Number(page) > 1 ? Number(page) : 1;
  const pageSuffix = n > 1 ? ` — გვერდი ${n}` : "";
  const url = `${SITE_URL}${catalogPath({ category, mainCategory, page: n })}`;
  const categoryLabel = displayName || category || mainCategory;
  if (categoryLabel && categoryLabel !== "ყველა") {
    return {
      url,
      heading: categoryLabel,
      title: customTitle ? `${customTitle}${pageSuffix}` : `${categoryLabel}${pageSuffix} — Artopia | ონლაინ მაღაზია`,
      description: customDescription || `აღმოაჩინე ${categoryLabel} Artopia-ში — ხარისხიანი პროდუქცია, ფართო არჩევანი და მიტანა მთელ საქართველოში.${n > 1 ? ` გვერდი ${n}.` : ""}`,
    };
  }
  return {
    url,
    heading: "პროდუქტები",
    title: `პროდუქტები${pageSuffix} — Artopia | სამხატვრო და საკანცელარიო ნივთები ონლაინ`,
    description: `Artopia-ს კატალოგი: სამხატვრო მასალები, საღებავები, ფუნჯები, ტილოები, საკანცელარიო, სასკოლო და საოფისე ნივთები. მიტანა მთელ საქართველოში.${n > 1 ? ` გვერდი ${n}.` : ""}`,
  };
}

// Product JSON-LD — ერთი აგება edge-ისთვის და React-ისთვის.
// ბრენდი და GTIN მხოლოდ მაშინ იწერება, როცა API-მ სანდოდ დაადგინა
// (`brand` / `gtin` ველები); „Artopia" გამყიდველია და არა ბრენდი.
export function productJsonLd(p, { url, images, sellerId } = {}) {
  const price = Number(p.price || 0);
  const sale = Number(p.sale || 0);
  const finalPrice = sale > 0 && sale <= 100 ? +(price * (1 - sale / 100)).toFixed(2) : price;
  const inStock = Number(p.quantity || 0) > 0;
  const category = String(p.category_name || p.category || "").trim();
  const description = String(p.description || "").trim();
  return {
    "@type": "Product",
    name: String(p.name || "").trim(),
    ...(images && images.length ? { image: images } : {}),
    ...(description ? { description } : {}),
    sku: String(p.id),
    ...(p.gtin ? { gtin: String(p.gtin) } : {}),
    ...(category ? { category } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: String(p.brand) } } : {}),
    offers: {
      "@type": "Offer",
      url,
      price: finalPrice.toFixed(2),
      priceCurrency: "GEL",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: sellerId ? { "@id": sellerId } : { "@type": "Organization", name: "Artopia" },
      ...(finalPrice >= 70 ? { shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "GE" },
        shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "GEL" },
        shippingSettingsLink: `${SITE_URL}/terms`,
      } } : {}),
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy", applicableCountry: "GE",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 2, merchantReturnLink: `${SITE_URL}/returns`,
        returnMethod: ["https://schema.org/ReturnByMail", "https://schema.org/ReturnInStore"],
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      },
    },
  };
}

export function breadcrumbJsonLd(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}

export function productBreadcrumbs(p, url) {
  const category = String(p.category_name || p.category || "").trim();
  return [
    { name: "მთავარი", item: `${SITE_URL}/` },
    { name: "პროდუქტები", item: `${SITE_URL}/products` },
    ...(p.main_category_slug ? [{ name: p.main_category_name, item: `${SITE_URL}${catalogPath({ mainCategory: p.main_category_slug })}` }] : []),
    ...(category ? [{ name: category, item: `${SITE_URL}${catalogPath({ category: p.category_slug || category })}` }] : []),
    { name: String(p.name || "").trim(), item: url },
  ];
}

/* ---------- ბლოგი: ერთი წყარო edge function-ისთვის და React-ისთვის ---------- */

const squeeze = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const clip = (value, n) => {
  const t = squeeze(value);
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export const BLOG_INDEX_META = {
  url: `${SITE_URL}/blogs`,
  title: "არტ ბლოგი — Artopia | სამხატვრო რჩევები, გიდები და სიახლეები",
  description:
    "Artopia-ს არტ ბლოგი — სამხატვრო რჩევები, მასალების გიდები და ხელოვნების სიახლეები. ისწავლე როგორ აირჩიო საღებავი, ფუნჯი, ფანქარი, ტილო და სხვა სამხატვრო მასალა.",
};

// ტექსტის შემოკლება წინადადების ან სიტყვის საზღვარზე, არასოდეს სიტყვის შუაში.
// ჯერ ვეძებთ ბოლო წინადადების დასასრულს (. ! ?), რომელიც საკმარისად გვიანაა (≥ 40%), ამ შემთხვევაში
// „…" არ ემატება; თუ არ არის, ვჭრით ბოლო ინტერვალზე, ბოლოდან ნიშნებს ვაცილებთ და ვამატებთ „…".
export function clipAtBoundary(value, max = 155) {
  const t = squeeze(value);
  if (t.length <= max) return t;
  const head = t.slice(0, max);
  const floor = Math.floor(max * 0.4);
  let end = -1;
  for (let i = head.length - 1; i >= floor; i -= 1) {
    if (/[.!?]/.test(head[i]) && (i === head.length - 1 || t[i + 1] === " ")) { end = i + 1; break; }
  }
  if (end > 0) return head.slice(0, end).trim();
  // t[max] არ არის ინტერვალი → head-ის ბოლო სიტყვა დაუსრულებელია და ისიც ვჭრით
  const cut = t[max] === " " ? head : head.slice(0, head.lastIndexOf(" "));
  const trimmed = cut.replace(/[\s,;:\-–(«„"']+$/u, "");
  return (trimmed || head.slice(0, max - 1)) + "…";
}

// სტატიის title სრულად იწერება (ხელოვნურად აღარ იჭრება „…"-ით).
// SEO ტექსტი ცალკეა: meta_title/meta_description, თუ არსებობს; ცარიელზე სტატიის სათაური/შესავალი.
// `intro` ხილული შესავალია (description) და SEO ტექსტის შეცვლა მას არ ეხება.
// ბლოგის კატეგორიის გვერდი (/blogs/category/<key>): სათაური და შესავალი backend-იდან (/blogs/categories)
export function blogCategoryMeta(category) {
  const name = squeeze(category?.title) || squeeze(category?.name);
  return {
    url: `${SITE_URL}/blogs/category/${category?.key || ""}`,
    title: name ? `${name} | Artopia-ს ბლოგი` : BLOG_INDEX_META.title,
    description: category?.intro ? clipAtBoundary(category.intro, 155) : BLOG_INDEX_META.description,
  };
}

export function blogArticleMeta(post, slug) {
  const seoTitle = squeeze(post?.meta_title) || squeeze(post?.title);
  return {
    url: `${SITE_URL}/blog/${slug}`,
    title: `${seoTitle} | Artopia`,
    headline: clipAtBoundary(seoTitle, 110),
    description: clipAtBoundary(post?.meta_description || post?.og_description || post?.description, 155),
    intro: clip(post?.description || post?.meta_description || post?.og_description, 160),
  };
}
