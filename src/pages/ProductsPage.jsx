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

const normalizeQuantity = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
};

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
    } catch {
      // ignore invalid JSON
    }
  }

  for (let i = 1; i <= 6; i += 1) {
    out.push(p?.[`image_url${i}`]);
    out.push(p?.[`image${i}`]);
    out.push(p?.[`img${i}`]);
  }

  return [...new Set(out.filter((u) => typeof u === "string" && u.trim()))];
};

const hasRealImage = (p) => {
  const imgs = getProductImages(p);
  return imgs.some(
    (url) => url && url !== NO_IMAGE && !String(url).toLowerCase().includes("noimage")
  );
};

const getDisplayImage = (p) => {
  const imgs = getProductImages(p);
  return imgs[0] || NO_IMAGE;
};

const hasSale = (p) => {
  const sale = Number(p?.sale);
  return Number.isFinite(sale) && sale > 0 && sale <= 100;
};

const getTimestamp = (p) => {
  const raw = p?.discountUpdatedAt || p?.updatedAt || p?.createdAt || null;
  const ts = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
};

const normalizeProduct = (p) => {
  const quantity = normalizeQuantity(p?.quantity ?? p?.details?.quantity ?? 0);

  return {
    ...p,
    quantity,
    in_stock: quantity > 0,
    image_url1: getDisplayImage(p),
    __hasRealImage: hasRealImage(p),
  };
};

const compareProducts = (a, b) => {
  const aOut = normalizeQuantity(a?.quantity) <= 0;
  const bOut = normalizeQuantity(b?.quantity) <= 0;

  if (aOut !== bOut) return aOut ? 1 : -1;

  const aHasImg = !!a?.__hasRealImage;
  const bHasImg = !!b?.__hasRealImage;

  if (aHasImg !== bHasImg) return aHasImg ? -1 : 1;

  const aSale = hasSale(a) ? 1 : 0;
  const bSale = hasSale(b) ? 1 : 0;
  if (aSale !== bSale) return bSale - aSale;

  const aNew = a?.is_new ? 1 : 0;
  const bNew = b?.is_new ? 1 : 0;
  if (aNew !== bNew) return bNew - aNew;

  if (aSale && bSale) {
    const saleDiff = Number(b.sale) - Number(a.sale);
    if (saleDiff !== 0) return saleDiff;
  }

  const aTS = getTimestamp(a);
  const bTS = getTimestamp(b);
  if (aTS !== bTS) return bTS - aTS;

  return String(a?.name || "").localeCompare(String(b?.name || ""), "ka");
};

const ProductsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { lang } = useLang();
  const topRef = useRef(null);
  const { addToCart } = useCart();

  const slugFromUrl = params?.slug ? String(params.slug) : null;
  const isProductRoute = !!slugFromUrl;

  const productsTitle = lang === "en" ? "Products" : "პროდუქცია";
  const productsDescription =
    lang === "en"
      ? "Browse Artopia products: art supplies, stationery, school accessories, office items and kids’ creative toys."
      : "Brendi Artopia გთავაზობთ სამხატვრო, საკანცელარიო, სასკოლო და საბავშვო პროდუქციას. შეარჩიე ფანქრები, საღებავები, რვეულები, ჩანთები, სათამაშოები და სხვა ნივთები ერთ ონლაინ მაღაზიაში.";
  const productsUrl = "https://artopia.ge/products";

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);

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

    if (maxQty <= 0) {
      alert(
        lang === "en"
          ? "This product is out of stock."
          : "პროდუქტი არ არის მარაგში."
      );
      return;
    }

    const safeQuantity = Math.min(requestedQty, maxQty);
    addToCart(safeProduct, safeQuantity);
  };

  const handleBuyNow = (product, quantity = 1) => {
    const safeProduct = normalizeProduct(product);
    const maxQty = safeProduct.quantity;
    const requestedQty = Math.max(1, Math.floor(Number(quantity) || 1));

    if (maxQty <= 0) {
      alert(
        lang === "en"
          ? "This product is out of stock."
          : "პროდუქტი არ არის მარაგში."
      );
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
    let mounted = true;
    const url = `${API_BASE}/products?lang=${lang}`;
    const showDelay = setTimeout(() => {
      if (mounted) setIsLoading(true);
    }, 120);

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;

        const list = Array.isArray(data) ? data : [];
        const normalized = list.map(normalizeProduct);

        setProducts(normalized);

        const uniqueCategories = [
          ...new Set(
            normalized
              .map((p) => String(p?.category || "").trim())
              .filter(Boolean)
          ),
        ];
        setCategories(uniqueCategories);
      })
      .catch((err) => {
        console.error("Failed to fetch products:", err);
        if (mounted) {
          setProducts([]);
          setCategories([]);
        }
      })
      .finally(() => {
        clearTimeout(showDelay);
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
      clearTimeout(showDelay);
    };
  }, [lang]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm, lang]);

  const filteredProducts = useMemo(() => {
    const q = String(searchTerm || "").trim().toLowerCase();

    return products.filter((p) => {
      const pCat = String(p?.category || p?.details?.category || "").trim();

      const nameKa = String(p?.name || p?.name_ka || "").toLowerCase();
      const nameEn = String(p?.name_en || "").toLowerCase();
      const categoryKa = String(p?.category || "").toLowerCase();
      const categoryEn = String(p?.category_en || "").toLowerCase();

      const matchesSearch =
        !q ||
        nameKa.includes(q) ||
        nameEn.includes(q) ||
        categoryKa.includes(q) ||
        categoryEn.includes(q);

      const matchesCategory = selectedCategory ? pCat === selectedCategory : true;

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const sortedFilteredProducts = useMemo(
    () => [...filteredProducts].sort(compareProducts),
    [filteredProducts]
  );

  const offset = currentPage * PRODUCTS_PER_PAGE;
  const currentPageData = sortedFilteredProducts.slice(
    offset - PRODUCTS_PER_PAGE,
    offset
  );

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

  const handleProductClick = (product) => {
    const slug = slugify(product?.name || product?.name_ka || product?.name_en || "");
    if (!slug) return;
    navigate(`/products/${slug}${location.search || ""}`);
  };

  useEffect(() => {
    if (!slugFromUrl) {
      setSelectedProduct(null);
      return;
    }

    const found =
      products.find((p) => {
        const pSlug = slugify(p?.name || p?.name_ka || p?.name_en || "");
        return pSlug === slugFromUrl;
      }) || null;

    setSelectedProduct(found);
  }, [slugFromUrl, products]);

  const handleCloseModal = () => {
    setSelectedProduct(null);
    navigate(`/products${location.search || ""}`, { replace: true });
  };

  const productCanonicalUrl = slugFromUrl
    ? `https://artopia.ge/products/${slugFromUrl}`
    : "";

  return (
    <>
      {!isProductRoute && (
        <SEO
          title={productsTitle}
          description={productsDescription}
          url={productsUrl}
        />
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
                <div className={styles.emptyState}>
                  {lang === "en"
                    ? "No products found."
                    : "პროდუქტები ვერ მოიძებნა."}
                </div>
              )}
            </div>

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
                totalPages={Math.ceil(
                  sortedFilteredProducts.length / PRODUCTS_PER_PAGE
                )}
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