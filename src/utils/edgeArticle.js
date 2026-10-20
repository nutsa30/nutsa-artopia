// edge function (netlify/edge-functions/meta.js) ბლოგის სტატიას ჩვეულებრივ HTML-ად წერს #root-ში —
// რობოტებისთვის, რომლებიც JavaScript-ს არ უშვებენ. React (createRoot) ამ HTML-ს თავისი პირველი
// render-ით ცვლის, სტატიის გვერდის კოდი კი ცალკე chunk-ია. სანამ ის იტვირთება, route-ის fallback-მა
// ცარიელი 100vh-ის ნაცვლად იგივე სტატია უნდა აჩვენოს, რომ ტექსტი არ გაქრეს და არ აციმციმდეს.
let snapshot = null;

export function captureEdgeArticle(root) {
  try {
    const article = root?.querySelector?.("[data-edge-article]");
    if (article) snapshot = { path: window.location.pathname, html: article.innerHTML };
  } catch {
    snapshot = null;
  }
}

export function edgeArticleFor(pathname) {
  return snapshot && snapshot.path === pathname ? snapshot.html : null;
}
