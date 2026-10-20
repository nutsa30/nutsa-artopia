import { SITE_URL, catalogPath } from "./canonical.js";
import { breadcrumbJsonLd } from "./catalogMeta.js";

export function catalogSchemaUrl(url, search = "") {
  const result = new URL(url, SITE_URL);
  result.search = "";
  const params = new URLSearchParams(search);
  for (const key of ["search", "categories", "include_out_of_stock"]) {
    if (params.has(key)) result.searchParams.set(key, params.get(key));
  }
  return result.href;
}

export function catalogJsonLd({ meta, category, mainCategory, context, page = 1, search = "" }) {
  const url = catalogSchemaUrl(meta.url, search);
  const crumbs = [{ name: "მთავარი", item: SITE_URL + "/" },
    { name: "პროდუქტები", item: SITE_URL + "/products" }];
  if (context?.main_category_slug) crumbs.push({ name: context.main_category_name,
    item: SITE_URL + catalogPath({ mainCategory: context.main_category_slug }) });
  if (category || mainCategory) crumbs.push({ name: context?.name || category || mainCategory,
    item: SITE_URL + catalogPath({ category, mainCategory }) });
  if (page > 1) crumbs.push({ name: "გვერდი " + page, item: meta.url });
  return { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": url + "#collection", name: meta.title,
      description: meta.description, url, isPartOf: { "@id": SITE_URL + "/#website" },
      breadcrumb: { "@id": url + "#breadcrumb" } },
    { ...breadcrumbJsonLd(crumbs), "@id": url + "#breadcrumb" },
  ] };
}
