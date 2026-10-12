import React, { useEffect, useState, useRef } from "react";
import ProductCard from "../components/productCard/productsCard";
import ProductFilter from "../components/productCard/ProductFilter";
import styles from "./ProductsPage.module.css";
import { useCart } from "../components/CartContext/CartContext";
import { useNavigate, useLocation, useSearchParams, useParams, Navigate } from "react-router-dom";
import EdgePager from "../components/pagination/EdgePager";
import SEO from "../components/SEO";
import AppLoader from "../components/loaders/AppLoader";
import NotFound from "../components/NotFound";
import { catalogPath, pageNumber } from "../utils/canonical";
import { catalogMeta, PRODUCTS_PER_PAGE } from "../utils/catalogMeta";


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

const hasSale = (product) => {
  const sale = Number(product?.sale);
  return Number.isFinite(sale) && sale > 0 && sale <= 100;
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
const compareProducts = (a, b) => {
  const aQty = normalizeQuantity(a?.quantity);
  const bQty = normalizeQuantity(b?.quantity);

  const aOut = aQty === 0;
  const bOut = bQty === 0;

  if (aOut !== bOut) return aOut ? 1 : -1;

  const aSale = hasSale(a) ? 1 : 0;
  const bSale = hasSale(b) ? 1 : 0;
  if (aSale !== bSale) return bSale - aSale;

  const aNew = a?.is_new ? 1 : 0;
  const bNew = b?.is_new ? 1 : 0;
  if (aNew !== bNew) return bNew - aNew;

  return 0;
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
  const { slug: categorySlug, page: pageParam } = useParams();

  // ძველი ?category= / ?page= ბმულები (სანიშნები, გარე საიტები) — იგივე გვერდის სუფთა მისამართზე გადადის
  const legacyCategory = searchParams.get("category");
  const legacyPage = searchParams.get("page");
  const hasLegacyQuery = legacyCategory != null || legacyPage != null;

  const selectedCategory =
    categorySlug || (legacyCategory && legacyCategory !== ALL ? legacyCategory : "") || ALL;

  // pageParam: undefined → 1; "1" → 1; "2".. → N; სხვა ყველაფერი → არასწორი მისამართი
  const pathPage = pageParam == null || pageParam === "1" ? 1 : pageNumber(pageParam);
  const invalidPage = pathPage == null;
  const currentPage = pathPage || 1;

  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // ბოლო წარმატებული პასუხი + რომელ მოთხოვნას ეკუთვნის (key)
  const [result, setResult] = useState({ key: "", items: [], total: 0, categoryExists: true });

  const requestKey = `${selectedCategory}|${currentPage}|${searchTerm.trim()}`;
  const products = result.items;
  const total = result.total;
  const loaded = result.key === requestKey;

  const meta = catalogMeta({ category: selectedCategory, page: currentPage });
  const hrefFor = (page) => catalogPath({ category: selectedCategory, page });

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
    let mounted = true;

    const params = new URLSearchParams();
    params.set("page", currentPage);
    params.set("limit", PRODUCTS_PER_PAGE);
    if (selectedCategory !== ALL) params.set("category", selectedCategory);
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
  }, [requestKey, invalidPage, hasLegacyQuery]);

  useEffect(() => {
    fetch(`${API_BASE}/products/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;

        const unique = [...new Set(data.map((c) => String(c).trim()).filter(Boolean))];

        // „სხვა" ბოლოში, დანარჩენი ანბანურად (ქართული)
        const sorted = unique.filter((c) => c !== "სხვა").sort((a, b) => a.localeCompare(b, "ka"));

        setCategories([...sorted, ...(unique.includes("სხვა") ? ["სხვა"] : [])]);
      })
      .catch(() => {});
  }, []);

  const handleCategoryChange = (newCategory) => {
    // სუფთა, ინდექსირებადი მისამართი (query string-ის გარეშე → robots არ ბლოკავს)
    navigate(catalogPath({ category: newCategory || null }));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    // ძიების შედეგი ყოველთვის პირველი გვერდიდან იწყება
    if (currentPage !== 1) navigate(hrefFor(1), { replace: true });
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
        to={catalogPath({ category: selectedCategory, page: currentPage > 1 ? currentPage : legacyPage })}
      />
    );
  }

  // არარსებული კატეგორია, არასწორი /page/<...> ან ბოლო გვერდს გაცდენილი ნომერი.
  // (ძიებისას ცარიელი შედეგი „ვერ მოიძებნა" არ არის.)
  const pastTheEnd = loaded && currentPage > 1 && products.length === 0 && !searchTerm.trim();
  if (invalidPage || (loaded && !result.categoryExists) || pastTheEnd) {
    return <NotFound what={selectedCategory !== ALL && !pastTheEnd ? "კატეგორია" : "გვერდი"} />;
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
      {isLoading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          <AppLoader />
        </div>
      )}
      <SEO
        title={meta.title}
        description={meta.description}
        url={meta.url}
        // ცარიელი კატეგორია (პროდუქტი დროებით არ აქვს) ინდექსში არ უნდა მოხვდეს
        noIndex={loaded && products.length === 0 && !searchTerm.trim()}
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
        <div className={styles.filterBar}>
          <div className={styles.selectDecor}>
            <ProductFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
            />
          </div>
        </div>

        {!isLoading && (
          <>
            <div className={`${styles.productsGrid} ${styles.catalogGrid}`}>
              {products.length > 0 ? (
                products.map((product) => (
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
      </div>
    </>
  );
};

export default ProductsPage;
