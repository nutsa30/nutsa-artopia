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

const getTimestamp = (product) => {
  const raw = product?.discountUpdatedAt || product?.updatedAt || product?.createdAt || null;
  const ts = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
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

  console.log("[COMPARE]", {
    a: a?.name,
    aQty,
    aOut,
    b: b?.name,
    bQty,
    bOut,
  });

  if (aOut !== bOut) return aOut ? 1 : -1;

  const aSale = hasSale(a) ? 1 : 0;
  const bSale = hasSale(b) ? 1 : 0;
  if (aSale !== bSale) return bSale - aSale;

  const aNew = a?.is_new ? 1 : 0;
  const bNew = b?.is_new ? 1 : 0;
  if (aNew !== bNew) return bNew - aNew;

  return 0;
};
const ProductsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { lang } = useLang();
  const { addToCart } = useCart();
  const topRef = useRef(null);

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

    if (maxQty === 0) {
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

    if (maxQty === 0) {
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
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
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

        const sortedCats = uniqueCategories
  .filter((c) => c !== "სხვა")
  .sort((a, b) => a.localeCompare(b, "ka"));

setCategories(["ყველა", ...sortedCats, "სხვა"]);
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

    return products.filter((product) => {
      const productCategory = String(
        product?.category || product?.details?.category || ""
      ).trim();

      const nameKa = String(product?.name || product?.name_ka || "").toLowerCase();
      const nameEn = String(product?.name_en || "").toLowerCase();
      const categoryKa = String(product?.category || "").toLowerCase();
      const categoryEn = String(product?.category_en || "").toLowerCase();

      const matchesSearch =
        !q ||
        nameKa.includes(q) ||
        nameEn.includes(q) ||
        categoryKa.includes(q) ||
        categoryEn.includes(q);

      const matchesCategory = selectedCategory
        ? productCategory === selectedCategory
        : true;

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const sortedFilteredProducts = useMemo(
    () => [...filteredProducts].sort(compareProducts),
    [filteredProducts]
  );
useEffect(() => {
  console.log(
    "[SORTED PRODUCTS]",
    sortedFilteredProducts.map((p, index) => ({
      index,
      name: p?.name,
      quantity: p?.quantity,
      normalizedQuantity: normalizeQuantity(p?.quantity),
      image: p?.image_url1,
    }))
  );
}, [sortedFilteredProducts]);
  const offset = currentPage * PRODUCTS_PER_PAGE;
  const currentPageData = sortedFilteredProducts.slice(
    offset - PRODUCTS_PER_PAGE,
    offset
  );
useEffect(() => {
  console.log(
    "[CURRENT PAGE DATA]",
    currentPageData.map((p, index) => ({
      index,
      name: p?.name,
      quantity: p?.quantity,
      normalizedQuantity: normalizeQuantity(p?.quantity),
      image: p?.image_url1,
    }))
  );
}, [currentPageData]);
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
      products.find((product) => {
        const productSlug = slugify(
          product?.name || product?.name_ka || product?.name_en || ""
        );
        return productSlug === slugFromUrl;
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
currentPageData.map((product, index) => {
  console.log("[RENDER ORDER]", {
    index,
    name: product?.name,
    quantity: product?.quantity,
    normalizedQuantity: normalizeQuantity(product?.quantity),
    image: product?.image_url1,
  });

  return (
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
  );
})
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
                onChange={(page) => {
                  setCurrentPage(page);
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