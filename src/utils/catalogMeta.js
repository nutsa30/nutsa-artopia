// კატალოგის გვერდების title/description — ერთი წყარო edge function-ისთვის
// (netlify/edge-functions/meta.js) და React-ისთვის (ProductsPage), რომ Google-მა
// საწყის HTML-სა და რენდერის შემდეგ ერთი და იგივე ნახოს.
import { SITE_URL, catalogPath } from "./canonical.js";

export const PRODUCTS_PER_PAGE = 20;

export function catalogMeta({ category, page } = {}) {
  const n = Number(page) > 1 ? Number(page) : 1;
  const pageSuffix = n > 1 ? ` — გვერდი ${n}` : "";
  const url = `${SITE_URL}${catalogPath({ category, page: n })}`;
  if (category && category !== "ყველა") {
    return {
      url,
      heading: category,
      title: `${category}${pageSuffix} — Artopia | სამხატვრო მაღაზია`,
      description: `იყიდე ${category} Artopia-ში — სამხატვრო მაღაზია თბილისში. ხარისხიანი ${category}, ფართო არჩევანი და მიტანა მთელ საქართველოში.${n > 1 ? ` გვერდი ${n}.` : ""}`,
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
    ...(category ? [{ name: category, item: `${SITE_URL}${catalogPath({ category })}` }] : []),
    { name: String(p.name || "").trim(), item: url },
  ];
}
