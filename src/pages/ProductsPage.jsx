// src/pages/ProductsPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import ProductCard from "../components/productCard/productsCard";
import ProductFilter from "../components/productCard/ProductFilter";
import styles from "./ProductsPage.module.css";
import ProductModal from "../components/ProductModal/ProductModal";
import { useCart } from "../components/CartContext/CartContext";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import EdgePager from "../components/pagination/EdgePager";
import { useLang } from "../LanguageContext";
import SEO from "../components/SEO";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";
const PRODUCTS_PER_PAGE = 20;

const slugify = (text = "") =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9ა-ჰ]+/gi, "-")
    .replace(/^-+|-+$/g, "");

const ProductsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams(); // <-- /products/:slug
  const { lang } = useLang();
  const topRef = useRef(null);

  const slugFromUrl = params?.slug ? String(params.slug) : null;
  const isProductRoute = !!slugFromUrl;

  // 🌐 SEO (Products list page)
  const productsTitle = lang === "en" ? "Products" : "პროდუქცია";
  const productsDescription =
    lang === "en"
      ? "Browse Artopia products: art supplies, stationery, school accessories, office items and kids’ creative toys."
      : "Brendi Artopia გთავაზობს სამხატვრო, საკანცელარიო, სასკოლო და საბავშვო პროდუქციას. შეარჩიე ფანქრები, საღებავები, რვეულები, ჩანთები, სათამაშოები და სხვა ნივთები ერთ ონლაინ მაღაზიაში.";
  const productsUrl = "https://artopia.ge/products";

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedSubcategories, setSelectedSubcategories] = useState([]); // multi
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCartOpen, setShowCartOpen] = useState(false);

  const { addToCart } = useCart();

  // ===== scroll-to-top helper =====
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
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

const handleAddToCart = (product, quantity) => {
  const maxQty =
    product?.quantity ??
    product?.details?.quantity ??
    0;

  console.log("ADD TO CART QTY:", maxQty); // debug

  // ❌ არ არის მარაგში
  if (maxQty <= 0) {
    alert(
      lang === "en"
        ? "This product is out of stock."
        : "პროდუქტი არ არის მარაგში."
    );
    return;
  }

  // ⚠️ აჭარბებს მარაგს
  if (quantity > maxQty) {
    alert(
      lang === "en"
        ? `Only ${maxQty} item(s) available in stock.`
        : `მარაგში მხოლოდ ${maxQty} ცალია.`
    );

    addToCart(product, maxQty);
    setShowCartOpen(true);
    return;
  }

  addToCart(product, quantity);
  setShowCartOpen(true);
};

const handleBuyNow = (product, quantity) => {
  const maxQty =
    product?.quantity ??
    product?.details?.quantity ??
    0;

  if (maxQty <= 0) {
    alert(
      lang === "en"
        ? "This product is out of stock."
        : "პროდუქტი არ არის მარაგში."
    );
    return;
  }

  if (quantity > maxQty) {
    alert(
      lang === "en"
        ? `Only ${maxQty} item(s) available in stock.`
        : `მარაგში მხოლოდ ${maxQty} ცალია.`
    );
  }

  const safeQuantity = Math.min(quantity, maxQty);

  for (let i = 0; i < safeQuantity; i++) {
    addToCart(product);
  }

  navigate("/checkout");
};
  const getSubOf = (p) =>
    p?.subcategory ??
    p?.sub_category ??
    p?.subCategory ??
    p?.details?.subcategory ??
    null;

  // --- 1) პირველ რენდერზე ამოიკითხე კატეგორია + ქვეკატეგორია URL-დან ან localStorage-დან
  useEffect(() => {
    const safe = (v) => (typeof v === "string" ? v.trim() : "");
    const safeArr = (v) => {
      if (!v) return [];
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) {
          return parsed.map(safe).filter(Boolean);
        }
      } catch {
        // ignore
      }
      return String(v)
        .split(",")
        .map(safe)
        .filter(Boolean);
    };

    const paramsQ = new URLSearchParams(location.search);

    // კატეგორია
    const catFromURL = safe(paramsQ.get("cat"));
    const catFromLS = safe(localStorage.getItem("artopia.selectedCategory"));
    const initialCat = catFromURL || catFromLS || "";

    if (initialCat) {
      setSelectedCategory(initialCat);
    } else {
      localStorage.removeItem("artopia.selectedCategory");
    }

    // ქვეკატეგორიები (single + multi)
    const subFromURL = safe(paramsQ.get("sub"));
    const subsFromURLRaw = safe(paramsQ.get("subs"));
    const subsFromURL = subsFromURLRaw
      ? subsFromURLRaw.split(",").map(safe).filter(Boolean)
      : [];

    const subFromLS = safe(localStorage.getItem("artopia.selectedSubcategory"));
    const subsFromLS = safeArr(
      localStorage.getItem("artopia.selectedSubcategories")
    );

    // პრიორიტეტი: URL.multi > URL.single > LS.multi > LS.single
    if (subsFromURL.length > 0) {
      setSelectedSubcategories(subsFromURL);
      setSelectedSubcategory("");
    } else if (subFromURL) {
      setSelectedSubcategory(subFromURL);
      setSelectedSubcategories([]);
    } else if (subsFromLS.length > 0) {
      setSelectedSubcategories(subsFromLS);
      setSelectedSubcategory("");
    } else if (subFromLS) {
      setSelectedSubcategory(subFromLS);
      setSelectedSubcategories([]);
    } else {
      setSelectedSubcategory("");
      setSelectedSubcategories([]);
      localStorage.removeItem("artopia.selectedSubcategory");
      localStorage.removeItem("artopia.selectedSubcategories");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 2) ყოველ ცვლილებაზე ჩავწეროთ URL + localStorage (კატეგორია + ქვეკატეგორია/ები)
  useEffect(() => {
    const paramsQ = new URLSearchParams(location.search);

    const currentCatInURL = paramsQ.get("cat") || "";
    const currentSubInURL = paramsQ.get("sub") || "";
    const currentSubsInURL = paramsQ.get("subs") || "";

    const hasMultiSubs =
      Array.isArray(selectedSubcategories) && selectedSubcategories.length > 0;

    const subStr = hasMultiSubs ? "" : selectedSubcategory || "";
    const subsStr = hasMultiSubs ? selectedSubcategories.join(",") : "";

    // კატეგორია
    if ((selectedCategory || "") !== currentCatInURL) {
      if (selectedCategory) paramsQ.set("cat", selectedCategory);
      else paramsQ.delete("cat");
    }

    // single sub
    if (subStr !== currentSubInURL) {
      if (subStr) paramsQ.set("sub", subStr);
      else paramsQ.delete("sub");
    }

    // multi subs
    if (subsStr !== currentSubsInURL) {
      if (subsStr) paramsQ.set("subs", subsStr);
      else paramsQ.delete("subs");
    }

    const newSearch = paramsQ.toString();
    const currentSearch = location.search.startsWith("?")
      ? location.search.slice(1)
      : location.search;

    // ⚠️ slug route-ზე path-ს არ ვეხებით, მხოლოდ query-ს ვაახლებთ
    if (newSearch !== currentSearch) {
      navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ""}`, {
        replace: true,
      });
    }

    // localStorage update
    if (selectedCategory) localStorage.setItem("artopia.selectedCategory", selectedCategory);
    else localStorage.removeItem("artopia.selectedCategory");

    if (hasMultiSubs) {
      if (selectedSubcategories.length) {
        localStorage.setItem(
          "artopia.selectedSubcategories",
          JSON.stringify(selectedSubcategories)
        );
      } else {
        localStorage.removeItem("artopia.selectedSubcategories");
      }
      localStorage.removeItem("artopia.selectedSubcategory");
    } else {
      if (selectedSubcategory) {
        localStorage.setItem("artopia.selectedSubcategory", selectedSubcategory);
      } else {
        localStorage.removeItem("artopia.selectedSubcategory");
      }
      localStorage.removeItem("artopia.selectedSubcategories");
    }
  }, [
    selectedCategory,
    selectedSubcategory,
    selectedSubcategories,
    navigate,
    location.pathname,
    location.search,
  ]);

  // გვერდის შეცვლაზე ავტომატურად ავდივართ თავში
  useEffect(() => {
    scrollToTop();
  }, [currentPage]);

  // პროდუქტების მიღება არჩეული ენის მიხედვით + ლოდერი
  useEffect(() => {
    let mounted = true;
    const url = `${API_BASE}/products?lang=${lang}`;
    const showDelay = setTimeout(() => mounted && setIsLoading(true), 120);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : [];
        setProducts(list);

        const unique = [...new Set(list.map((p) => p.category).filter(Boolean))];
        setCategories(unique);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        clearTimeout(showDelay);
        mounted && setIsLoading(false);
      });

    return () => {
      mounted = false;
      clearTimeout(showDelay);
    };
  }, [lang]);

  // ფილტრის/ენის/ძებნის ცვლილებაზე – გვერდი 1-ზე
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, selectedSubcategories, searchTerm, lang]);

  const hasSale = (p) =>
    typeof p?.sale === "number" && p.sale > 0 && p.sale <= 100;

  const getTS = (p) => {
    const raw = p?.discountUpdatedAt || p?.updatedAt || p?.createdAt || null;
    const ts = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(ts) ? ts : 0;
  };

  const compareProducts = (a, b) => {
    const aSale = hasSale(a) ? 1 : 0;
    const bSale = hasSale(b) ? 1 : 0;
    if (aSale !== bSale) return bSale - aSale;

    const aNew = a?.is_new ? 1 : 0;
    const bNew = b?.is_new ? 1 : 0;
    if (aNew !== bNew) return bNew - aNew;

    if (aSale && bSale) {
      const aPct = a.sale;
      const bPct = b.sale;
      if (aPct !== bPct) return bPct - aPct;
    }

    const aTS = getTS(a);
    const bTS = getTS(b);
    if (aTS !== bTS) return bTS - aTS;

    return String(a?.name || "").localeCompare(String(b?.name || ""));
  };

  // multi-subcategory support (OR logic)
  const filteredProducts = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();

    const subList = (selectedSubcategories || [])
      .map((s) => String(s || "").toLowerCase().trim())
      .filter(Boolean);
    const hasMulti = subList.length > 0;

    return (products || []).filter((p) => {
      const pCat = String(p.category || p?.details?.category || "").trim();
      const pName = String(p.name || "").toLowerCase();
      const pSub = String(getSubOf(p) || "").toLowerCase().trim();

      const matchesSearch = pName.includes(q);

      const matchesSub = hasMulti
        ? subList.includes(pSub)
        : !selectedSubcategory ||
          pSub === String(selectedSubcategory).toLowerCase().trim();

      const matchesCategory = hasMulti
        ? true
        : selectedCategory
        ? pCat === selectedCategory
        : true;

      return matchesCategory && matchesSearch && matchesSub;
    });
  }, [
    products,
    selectedCategory,
    selectedSubcategory,
    selectedSubcategories,
    searchTerm,
  ]);

  const sortedFilteredProducts = useMemo(
    () => [...filteredProducts].sort(compareProducts),
    [filteredProducts]
  );

  const offset = currentPage * PRODUCTS_PER_PAGE;
  const currentPageData = sortedFilteredProducts.slice(
    offset - PRODUCTS_PER_PAGE,
    offset
  );

  // pagination handler
  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected + 1);
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToTop);
    });
  };

  const handleCategoryChange = (newCategory) => {
    setSelectedCategory(newCategory);
    setCurrentPage(1);
  };

  // ✅ კლიკზე: მხოლოდ slug-იანი URL
  const handleProductClick = (product) => {
    const slug = slugify(product?.name || product?.name_ka || product?.name_en || "");
    if (!slug) return;
    navigate(`/products/${slug}${location.search || ""}`);
  };

  // ✅ URL-დან მოდალის გახსნა (როცა /products/:slug-ზე ვართ)
  useEffect(() => {
    if (!slugFromUrl) {
      setSelectedProduct(null);
      return;
    }

    // ჯერ products list-დან ვეძებთ slug match-ით
    const found =
      (products || []).find((p) => {
        const pSlug = slugify(p?.name || p?.name_ka || p?.name_en || "");
        return pSlug === slugFromUrl;
      }) || null;

    setSelectedProduct(found);
  }, [slugFromUrl, products]);

  // ✅ დახურვაზე ბრუნდება /products-ზე (query-ს ინარჩუნებს)
  const handleCloseModal = () => {
    setSelectedProduct(null);
    navigate(`/products${location.search || ""}`, { replace: true });
  };

  // canonical URL მოდალისთვის (slug-ით)
  const productCanonicalUrl = slugFromUrl
    ? `https://artopia.ge/products/${slugFromUrl}`
    : "";

  return (
    <>
      {/* list page SEO მხოლოდ მაშინ, როცა დეტალზე არ ვართ */}
      {!isProductRoute && (
        <SEO title={productsTitle} description={productsDescription} url={productsUrl} />
      )}

      <div ref={topRef} className={styles.pageWrapper}>
        <div className={styles.filterBar}>
          <div className={styles.selectDecor}>
            <ProductFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              selectedSubcategory={selectedSubcategory}
              onSubcategoryChange={(sub) => {
                if (sub) setSearchTerm("");
                setSelectedSubcategory(sub);
                setSelectedSubcategories([]);
              }}
              selectedSubcategories={selectedSubcategories}
              onSubcategoriesChange={(arr) => {
                setSelectedSubcategories(arr);
                setSelectedSubcategory("");
                setCurrentPage(1);
              }}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>
        </div>

        {!isLoading && (
          <>
            <div className={`${styles.productsGrid} ${styles.catalogGrid}`}>
              {currentPageData.length > 0 ? (
                currentPageData.map((product) => (
                  <div
                    key={product._id || product.id}
                    onClick={() => handleProductClick(product)}
                    className={styles.cardWrap}
                  >
                    <ProductCard
                      product={product}
                      onAddToCart={(e, quantity) => {
                        e.stopPropagation();
                        handleAddToCart(product, quantity);
                      }}
                      onBuyNow={(e, quantity) => {
                        e.stopPropagation();
                        handleBuyNow(product, quantity);
                      }}
                    />
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  {lang === "en" ? "No products found." : "პროდუქტები ვერ მოიძებნა."}
                </div>
              )}
            </div>

            {/* ✅ მოდალი: იხსნება slug route-ზე */}
            {selectedProduct && (
              <ProductModal
                product={selectedProduct}
                onClose={handleCloseModal}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                enableSeo={isProductRoute}
                canonicalUrl={productCanonicalUrl}
              />
            )}

            {sortedFilteredProducts.length > PRODUCTS_PER_PAGE && (
              <EdgePager
                totalPages={Math.ceil(sortedFilteredProducts.length / PRODUCTS_PER_PAGE)}
                currentPage={currentPage}
                onChange={(p) => {
                  setCurrentPage(p);
                  requestAnimationFrame(() => {
                    requestAnimationFrame(scrollToTop);
                  });
                }}
                onPageChange={handlePageClick}
              />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default ProductsPage;
