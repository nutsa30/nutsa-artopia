// Shared by edge HTML/headers and React. robots.txt must allow crawlers to see noindex.
const UTILITY = [
  [/^\/checkout\/?$/, "შეკვეთის გაფორმება | Artopia"],
  [/^\/payment(?:\/|$)/, "გადახდის მდგომარეობა | Artopia"],
  [/^\/login\/?$/, "ავტორიზაცია | Artopia"],
  [/^\/admin(?:\/|$)/, "ადმინისტრირება | Artopia"],
  [/^\/(?:menu|addProducts|order_history|blog|promo-codes|home-images)(?:\/|$)/, "ადმინისტრირება | Artopia"],
];

export function indexPolicy(input, { empty = false, filtered = false } = {}) {
  const url = new URL(input, "https://artopia.ge");
  // /blog/<slug> is public; only the legacy /blog shortcut is admin.
  const utility = UTILITY.find(([pattern]) => pattern.test(url.pathname) &&
    !(url.pathname.startsWith("/blog/")));
  const catalog = /^\/products(?:\/(?:category|group)\/[^/]+)?(?:\/page\/[^/]+)?\/?$/.test(url.pathname);
  const filter = catalog && (filtered || url.searchParams.has("search") || url.searchParams.has("categories") ||
    ["1", "true"].includes(url.searchParams.get("include_out_of_stock")));
  const noIndex = Boolean(utility || filter || empty);
  return { utility: Boolean(utility), title: utility?.[1], noIndex,
    noIndexFollow: !utility && Boolean(filter), robots: noIndex ? (filter && !utility ? "noindex,follow" : "noindex,nofollow") : "index,follow" };
}
export const utilityTitle = (path) => indexPolicy(path).title || "Artopia";
