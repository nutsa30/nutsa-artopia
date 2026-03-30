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
const NO_IMAGE = "/noimage.jpeg";
const slugify = (text = "") =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9ა-ჰ]+/gi, "-")
    .replace(/^-+|-+$/g, "");
const getProductImages = (p) => {
  const out = [];

  if (Array.isArray(p?.images)) {
    for (const it of p.images) {
      if (typeof it === "string") out.push(it);
      else if (it && typeof it.url === "string") out.push(it.url);
    }
  }

  if (typeof p?.images === "string") {
    try {
      const parsed = JSON.parse(p.images);
      if (Array.isArray(parsed)) {
        for (const it of parsed) {
          if (typeof it === "string") out.push(it);
          else if (it && typeof it.url === "string") out.push(it.url);
        }
      }
    } catch {}
  }

  for (let i = 1; i <= 6; i++) {
    out.push(p?.[`image_url${i}`]);
    out.push(p?.[`image${i}`]);
    out.push(p?.[`img${i}`]);
  }

  return [...new Set(out.filter((u) => typeof u === "string" && u.trim()))];
};

const hasRealImage = (p) => {
  const imgs = getProductImages(p);

  return imgs.some(
    (url) =>
      url &&
      url !== NO_IMAGE &&
      !url.includes("noimage")
  );
};
const getDisplayImage = (p) => {
  const imgs = getProductImages(p);
  return imgs[0] || NO_IMAGE;
};
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
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCartOpen, setShowCartOpen] = useState(false);

  const { addToCart } = useCart();

const getAvailableQty = (p) => {
  const raw = p?.quantity ?? p?.details?.quantity;

  const qty = Number(raw);

  if (Number.isFinite(qty) && qty > 0) {
    return qty;
  }

  return 0;
};

const withStockSnapshot = (p) => ({
  ...p,
  quantity: getAvailableQty(p),
  in_stock: getAvailableQty(p) > 0,
});
  
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
  const safeProduct = withStockSnapshot(product);
  const maxQty = safeProduct.quantity;

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

    addToCart(safeProduct, maxQty);
    setShowCartOpen(true);
    return;
  }

  addToCart(safeProduct, quantity);
  setShowCartOpen(true);
};



const handleBuyNow = (product, quantity) => {
  const safeProduct = withStockSnapshot(product);
  const maxQty = safeProduct.quantity;

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
    addToCart(safeProduct);
  }

  navigate("/checkout");
};




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

const normalized = list.map((p) => ({
  ...p,
  image_url1: getDisplayImage(p),
  __hasRealImage: hasRealImage(p),
}));

setProducts(normalized);

const unique = [...new Set(normalized.map((p) => p.category).filter(Boolean))];
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
}, [selectedCategory, searchTerm, lang]);
  const hasSale = (p) =>
    typeof p?.sale === "number" && p.sale > 0 && p.sale <= 100;

  const getTS = (p) => {
    const raw = p?.discountUpdatedAt || p?.updatedAt || p?.createdAt || null;
    const ts = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(ts) ? ts : 0;
  };


const compareProducts = (a, b) => {
  const getQty = (p) =>
    Number(p?.quantity ?? p?.details?.quantity ?? 0);

const isOut = (p) => {
  return !(
    p?.in_stock === true ||
    p?.in_stock === "true"
  );
};

  const aOut = isOut(a);
  const bOut = isOut(b);

  // 1️⃣ ყველაზე ბოლოში — out of stock
  if (aOut !== bOut) return aOut ? 1 : -1;

  const aHasImg = a?.__hasRealImage;
  const bHasImg = b?.__hasRealImage;

  // 2️⃣ შემდეგ — ფოტო არმქონე (მაგრამ მარაგში)
  if (aHasImg !== bHasImg) return aHasImg ? -1 : 1;

  // 3️⃣ დანარჩენი ლოგიკა უცვლელი
  const aSale = hasSale(a) ? 1 : 0;
  const bSale = hasSale(b) ? 1 : 0;
  if (aSale !== bSale) return bSale - aSale;

  const aNew = a?.is_new ? 1 : 0;
  const bNew = b?.is_new ? 1 : 0;
  if (aNew !== bNew) return bNew - aNew;

  if (aSale && bSale) {
    if (a.sale !== b.sale) return b.sale - a.sale;
  }

  const aTS = getTS(a);
  const bTS = getTS(b);
  if (aTS !== bTS) return bTS - aTS;

  return String(a?.name || "").localeCompare(String(b?.name || ""));
};
  const filteredProducts = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();


    return (products || []).filter((p) => {
      const pCat = String(p.category || p?.details?.category || "").trim();
      const pName = String(p.name || "").toLowerCase();

      const matchesSearch = pName.includes(q);


const matchesCategory =
  selectedCategory
    ? pCat === selectedCategory
    : true;

return matchesCategory && matchesSearch;
      });
}, [
  products,
  selectedCategory,
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
