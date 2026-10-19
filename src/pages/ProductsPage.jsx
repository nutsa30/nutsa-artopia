import React, { useEffect, useState, useRef } from "react";
import ProductCard from "../components/productCard/productsCard";
import ProductFilter from "../components/productCard/ProductFilter";
import styles from "./ProductsPage.module.css";
import { useCart } from "../components/CartContext/CartContext";
import { useNavigate, useLocation, useSearchParams, useParams, Navigate } from "react-router-dom";
import EdgePager from "../components/pagination/EdgePager";
import SEO from "../components/SEO";
import NotFound from "../components/NotFound";
import { catalogPath, pageNumber } from "../utils/canonical";
import { catalogMeta, PRODUCTS_PER_PAGE } from "../utils/catalogMeta";
import CatalogLanding from "../components/catalog/CatalogLanding";
import { readInitialData } from "../utils/initialData";


const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
const NO_IMAGE = "/noimage.jpeg";

const normalizeQuantity = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
};

const getProductImages = (product) => {
  const out = [];

  if (Array.isArray(product?.images)) {
    for (const it of product.images) {
      if (typeof it === "string") out.push(it);
      else if (it && typeof it.url === "string") out.push(it.url);
    }
  }

  if (typeof product?.images === "string") {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed)) {
        for (const it of parsed) {
          if (typeof it === "string") out.push(it);
          else if (it && typeof it.url === "string") out.push(it.url);
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  for (let i = 1; i <= 6; i += 1) {
    out.push(product?.[`image_url${i}`]);
    out.push(product?.[`image${i}`]);
    out.push(product?.[`img${i}`]);
  }

  return [...new Set(out.filter((url) => typeof url === "string" && url.trim()))];
};

const getDisplayImage = (product) => {
  const images = getProductImages(product);
  return images[0] || NO_IMAGE;
};

const hasRealImage = (product) => {
  const images = getProductImages(product);
  return images.some(
    (url) => url && url !== NO_IMAGE && !String(url).toLowerCase().includes("noimage")
  );
};

const normalizeProduct = (product) => {
  const quantity = normalizeQuantity(product?.quantity ?? 0);

  return {
    ...product,
    quantity,
    image_url1: getDisplayImage(product),
    __hasRealImage: hasRealImage(product),
  };
};
// ვიზუალურად დამალული, მაგრამ crawler-ისთვის ხილული (display:none არა)
const srOnly = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const ALL = "ყველა";

const ProductsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const topRef = useRef(null);

  // მისამართი არის სიმართლის ერთადერთი წყარო:
  //   /products[/category/<სახელი>][/page/<N>]
  // React Router პარამეტრს უკვე დეკოდირებულს აბრუნებს (ზუსტი ქართული სახელი).
  const { slug: categorySlug, mainSlug, page: pageParam } = useParams();

  // ძველი ?category= / ?page= ბმულები (სანიშნები, გარე საიტები) — იგივე გვერდის სუფთა მისამართზე გადადის
  const legacyCategory = searchParams.get("category");
  const legacyPage = searchParams.get("page");
  const hasLegacyQuery = legacyCategory != null || legacyPage != null;

  const selectedCategory =
    categorySlug || (legacyCategory && legacyCategory !== ALL ? legacyCategory : "") || ALL;
  const selectedMainCategory = mainSlug || "";

  // pageParam: undefined → 1; "1" → 1; "2".. → N; სხვა ყველაფერი → არასწორი მისამართი
  const pathPage = pageParam == null || pageParam === "1" ? 1 : pageNumber(pageParam);
  const invalidPage = pathPage == null;
  const currentPage = pathPage || 1;

  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const selectedSubcategories = selectedMainCategory
    ? [...new Set((searchParams.get("categories") || "").split(",").map((item) => item.trim()).filter(Boolean))]
    : [];
  const filteredPath = (category, page, mainCategory = "") => {
    const path = catalogPath({ category, mainCategory, page });
    const params = new URLSearchParams();
    if (mainCategory && selectedSubcategories.length) params.set("categories", selectedSubcategories.join(","));
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    return `${path}${params.size ? `?${params}` : ""}`;
  };
  const requestKey = `${selectedCategory}|${selectedMainCategory}|${selectedSubcategories.join(",")}|${currentPage}|${searchTerm.trim()}`;
  // edge-ის ჩასმული სია ფილტრის გარეშეა — ძიების / ქვეკატეგორიების გვერდზე მას არ ვიყენებთ
  const embeddedRef = useRef(searchParams.has("search") || searchParams.has("categories")
    ? null : readInitialData("catalog", location.pathname));
  const embedded = embeddedRef.current;
  const [catalog, setCatalog] = useState({ main_categories: [], featured_sections: [] });
  const [catalogResolved, setCatalogResolved] = useState(false);
  const [isLoading, setIsLoading] = useState(!embedded);
  // ბოლო წარმატებული პასუხი + რომელ მოთხოვნას ეკუთვნის (key)
  const [result, setResult] = useState(() => embedded ? {
    key: requestKey,
    items: (Array.isArray(embedded.items) ? embedded.items : []).map(normalizeProduct),
    total: Number(embedded.total) || 0,
    categoryExists: embedded.category_exists !== false,
    mainCategoryExists: embedded.main_category_exists !== false,
    categoryMovedTo: typeof embedded.category_moved_to === "string" ? embedded.category_moved_to : null,
  } : { key: "", items: [], total: 0, categoryExists: true });

  const landingCandidate = selectedCategory === ALL && !selectedMainCategory && currentPage === 1 && !searchTerm.trim();
  const landingMode = landingCandidate && catalogResolved && catalog.main_categories.length > 0;
  const loaded = result.key === requestKey;
  const products = loaded ? result.items : [];
  const total = loaded ? result.total : 0;

  const selectedSub = catalog.main_categories
    .flatMap((main) => main.subcategories || [])
    .find((item) => item.slug === selectedCategory || item.name === selectedCategory);
  const selectedMain = catalog.main_categories.find((item) => item.slug === selectedMainCategory);
  const meta = catalogMeta({
    category: selectedCategory === ALL ? null : selectedCategory,
    mainCategory: selectedMainCategory || null,
    displayName: selectedSub?.name || selectedMain?.name,
    description: selectedSub?.meta_description || selectedMain?.meta_description || selectedMain?.description,
    page: currentPage,
  });
  const hrefFor = (page) => filteredPath(selectedCategory === ALL ? null : selectedCategory, page, selectedMainCategory);

  const scrollToTop = () => {
    const scroller =
      document.scrollingElement || document.documentElement || document.body;

    const navH =
      document.querySelector(".tabbar")?.getBoundingClientRect().height || 0;

    const y =
      (topRef.current
        ? topRef.current.getBoundingClientRect().top + window.scrollY
        : 0) - navH - 8;

    scroller.scrollTo({ top: Math.max(0, y), behavior: "smooth" });

    if (topRef.current?.scrollIntoView) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleAddToCart = (product, quantity = 1) => {
    const safeProduct = normalizeProduct(product);
    const maxQty = safeProduct.quantity;
    const requestedQty = Math.max(1, Math.floor(Number(quantity) || 1));

    if (maxQty === 0) {
      alert("პროდუქტი არ არის მარაგში.");
      return;
    }

    const safeQuantity = Math.min(requestedQty, maxQty);
    addToCart(safeProduct, safeQuantity);
  };

  const handleBuyNow = (product, quantity = 1) => {
    const safeProduct = normalizeProduct(product);
    const maxQty = safeProduct.quantity;
    const requestedQty = Math.max(1, Math.floor(Number(quantity) || 1));

    if (maxQty === 0) {
      alert("პროდუქტი არ არის მარაგში.");
      return;
    }

    const safeQuantity = Math.min(requestedQty, maxQty);
    addToCart(safeProduct, safeQuantity);
    navigate("/checkout");
  };

  useEffect(() => {
    scrollToTop();
  }, [currentPage]);

  useEffect(() => {
    if (invalidPage || hasLegacyQuery) return;
    if (landingCandidate && !catalogResolved) return;
    if (landingMode) {
      setResult({ key: requestKey, items: [], total: 0, categoryExists: true, mainCategoryExists: true });
      setIsLoading(false);
      return;
    }
    if (embeddedRef.current && result.key === requestKey) {
      embeddedRef.current = null;
      setIsLoading(false);
      return;
    }
    let mounted = true;
    setIsLoading(true);

    const params = new URLSearchParams();
    params.set("page", currentPage);
    params.set("limit", PRODUCTS_PER_PAGE);
    if (selectedCategory !== ALL) params.set("category", selectedCategory);
    if (selectedMainCategory) params.set("main_category", selectedMainCategory);
    if (selectedMainCategory && selectedSubcategories.length) params.set("categories", selectedSubcategories.join(","));
    if (searchTerm.trim()) params.set("search", searchTerm.trim());

    fetch(`${API_BASE}/products/list?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data.items) ? data.items : [];
        setResult({
          key: requestKey,
          items: list.map(normalizeProduct),
          total: Number(data.total) || 0,
          // ძველი backend ამ ველს არ აბრუნებს → კატეგორია არსებულად ითვლება
          categoryExists: data.category_exists !== false,
          mainCategoryExists: data.main_category_exists !== false,
          categoryMovedTo: typeof data.category_moved_to === "string" ? data.category_moved_to : null,
        });
      })
      .catch(() => {
        // ქსელის/სერვერის შეცდომა „ვერ მოიძებნა" არ არის — უბრალოდ ცარიელი სია
        if (mounted) setResult({ key: "", items: [], total: 0, categoryExists: true });
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
    // requestKey = selectedCategory + currentPage + searchTerm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, invalidPage, hasLegacyQuery, landingMode, landingCandidate, catalogResolved]);

  useEffect(() => {
    fetch(`${API_BASE}/categories/catalog`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data?.main_categories)) throw new Error("catalog unavailable");
        setCatalog(data);
      })
      .catch(() => {})
      .finally(() => setCatalogResolved(true));
  }, []);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    // ძიების შედეგი ყოველთვის პირველი გვერდიდან იწყება
    if (currentPage !== 1) navigate(hrefFor(1), { replace: true });
  };

  const toggleSubcategory = (slug) => {
    const next = new Set(selectedSubcategories);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    const params = new URLSearchParams();
    if (next.size) params.set("categories", [...next].join(","));
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    navigate(`${catalogPath({ mainCategory: selectedMainCategory })}${params.size ? `?${params}` : ""}`);
  };

  const productHref = (product) => (product?.slug ? `/products/${product.slug}` : null);
  const linkState = { from: location.pathname + location.search };

  const handleProductClick = (product) => {
    const href = productHref(product);
    if (href) navigate(href, { state: linkState });
  };

  if (hasLegacyQuery && !invalidPage) {
    return (
      <Navigate
        replace
        to={filteredPath(selectedCategory, currentPage > 1 ? currentPage : legacyPage)}
      />
    );
  }

  // გადარქმეული კატეგორიის ძველი მისამართი → ახალი (HTTP 301-ს edge function აბრუნებს)
  if (loaded && result.categoryMovedTo) {
    return <Navigate replace to={filteredPath(result.categoryMovedTo, 1)} />;
  }

  // არარსებული კატეგორია, არასწორი /page/<...> ან ბოლო გვერდს გაცდენილი ნომერი.
  // (ძიებისას ცარიელი შედეგი „ვერ მოიძებნა" არ არის.)
  const pastTheEnd = loaded && currentPage > 1 && products.length === 0 && !searchTerm.trim();
  if (invalidPage || (loaded && (!result.categoryExists || !result.mainCategoryExists)) || pastTheEnd) {
    return <NotFound what={(selectedCategory !== ALL || selectedMainCategory) && !pastTheEnd ? "კატეგორია" : "გვერდი"} />;
  }

  const totalPages = Math.ceil(total / PRODUCTS_PER_PAGE);

  // CollectionPage + BreadcrumbList-ს edge function წერს საწყის HTML-ში; აქ მხოლოდ
  // ამ გვერდის პროდუქტების სიაა (ItemList), რომ ორი კონკურენტი CollectionPage არ გამოვიდეს.
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: meta.title,
    url: meta.url,
    numberOfItems: products.length,
    itemListElement: products
      .filter((product) => product?.slug)
      .map((product, index) => ({
        "@type": "ListItem",
        position: (currentPage - 1) * PRODUCTS_PER_PAGE + index + 1,
        url: `https://artopia.ge/products/${product.slug}`,
        name: product?.name || "",
      })),
  };

  return (
    <>
      <SEO
        title={meta.title}
        description={meta.description}
        url={meta.url}
        // ცარიელი კატეგორია (პროდუქტი დროებით არ აქვს) ინდექსში არ უნდა მოხვდეს
        noIndex={Boolean(searchTerm.trim()) || selectedSubcategories.length > 0 || (!landingMode && loaded && products.length === 0)}
        noIndexFollow={Boolean(searchTerm.trim()) || selectedSubcategories.length > 0}
      />
      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema).replace(/</g, "\\u003c") }}
        />
      )}

      <div ref={topRef} className={styles.pageWrapper}>
        <h1 style={srOnly}>
          {meta.heading}
          {currentPage > 1 ? ` — გვერდი ${currentPage}` : ""}
        </h1>
        {landingMode ? (
          catalogResolved ? (
            <CatalogLanding catalog={catalog} onAddToCart={handleAddToCart} onBuyNow={handleBuyNow} />
          ) : (
            <div className={styles.landingSkeleton} aria-label="კატალოგი იტვირთება" aria-busy="true">
              <div className={styles.landingSkeletonTitle} />
              <div className={styles.landingSkeletonGrid}>
                {Array.from({ length: 8 }, (_, index) => <div className={styles.landingSkeletonCard} key={index} />)}
              </div>
            </div>
          )
        ) : <>
        {selectedMain && <section className={styles.mainIntro}>
          <div><p>მთავარი კატეგორია</p><h2>{selectedMain.name}</h2>
            {selectedMain.description && <span>{selectedMain.description}</span>}</div>
          <nav aria-label={`${selectedMain.name} ქვეკატეგორიები`} className={styles.subcategoryNav}>
            {selectedMain.subcategories.map((sub) => {
              const selected = selectedSubcategories.includes(sub.slug);
              return <button key={sub.id} type="button" aria-pressed={selected}
                className={selected ? styles.subcategorySelected : ""}
                onClick={() => toggleSubcategory(sub.slug)}>
                <b aria-hidden="true">{selected ? "✓" : (sub.icon || "◌")}</b>
                <span>{sub.name}</span><small>{sub.product_count}</small>
              </button>;
            })}
          </nav>
        </section>}
        <div className={styles.filterBar}>
          <div className={styles.selectDecor}>
            <ProductFilter
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
            />
          </div>
        </div>

        {isLoading ? (
          <div className={`${styles.productsGrid} ${styles.catalogGrid}`} aria-label="პროდუქტები იტვირთება" aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => <div className={styles.catalogSkeletonCard} key={index} />)}
          </div>
        ) : (
          <>
            <div className={`${styles.productsGrid} ${styles.catalogGrid}`}>
              {products.length > 0 ? (
                products.map((product, index) => (
                  // ბარათის ნებისმიერ ადგილზე დაჭერა ხსნის პროდუქტს; კლავიატურისთვის
                  // და crawler-ისთვის ბარათის სათაური ნამდვილი <a href>-ია.
                  <div
                    key={product._id || product.id}
                    onClick={() => handleProductClick(product)}
                    className={styles.cardWrap}
                  >
                    <ProductCard
                      product={product}
                      href={productHref(product)}
                      linkState={linkState}
                      eager={index < 4}
                      priority={index === 0}
                      onAddToCart={(e, quantity, sourceProduct = product) => {
                        e.stopPropagation();
                        handleAddToCart(sourceProduct, quantity);
                      }}
                      onBuyNow={(e, quantity, sourceProduct = product) => {
                        e.stopPropagation();
                        handleBuyNow(sourceProduct, quantity);
                      }}
                    />
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>პროდუქტები ვერ მოიძებნა.</div>
              )}
            </div>

            {total > PRODUCTS_PER_PAGE && (
              <EdgePager totalPages={totalPages} currentPage={currentPage} hrefFor={hrefFor} />
            )}
          </>
        )}
        </>}
      </div>
    </>
  );
};

export default ProductsPage;
