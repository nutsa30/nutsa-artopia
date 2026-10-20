// კატალოგის გვერდების title/description — ერთი წყარო edge function-ისთვის
// (netlify/edge-functions/meta.js) და React-ისთვის (ProductsPage), რომ Google-მა
// საწყის HTML-სა და რენდერის შემდეგ ერთი და იგივე ნახოს.
import { SITE_URL, catalogPath } from "./canonical.js";

export const PRODUCTS_PER_PAGE = 20;

export function productPageMeta(p) {
  const name = String(p?.name || "").trim();
  const raw = String(p?.seo_description || p?.description || `${name} — იყიდე Artopia-ში, სამხატვრო და საკანცელარიო მაღაზია. მიტანა მთელ საქართველოში.`).replace(/\s+/g, " ").trim();
  const code = p?.seo_description ? ` კოდი ${p.id}.` : "";
  return { title: p?.seo_title || `${name} | Artopia`, description: raw.length > 160 ? `${raw.slice(0, 157 - code.length).trim()}…${code}` : raw };
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
    description: `Artopia-ს სრული კატალოგი — სამხატვრო მასალა (აკვარელი, აკრილის და ზეთის საღებავი, ფუნჯები, ტილო, მოლბერტი, პასტელი), საკანცელარიო, სასკოლო და საოფისე ნივთები. მიტანა მთელ საქართველოში.${n > 1 ? ` გვერდი ${n}.` : ""}`,
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

// სტატიის title სრულად იწერება (ხელოვნურად აღარ იჭრება „…"-ით); აღწერა — 160 სიმბოლომდე.
export function blogArticleMeta(post, slug) {
  return {
    url: `${SITE_URL}/blog/${slug}`,
    title: `${squeeze(post?.meta_title) || squeeze(post?.title)} | Artopia`,
    description: clip(post?.meta_description || post?.og_description || post?.description, 160),
  };
}

