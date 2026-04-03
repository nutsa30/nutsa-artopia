import React, { useEffect, useMemo, useState, useRef } from "react";
import ProductCard from "../components/productCard/productsCard";
import ProductFilter from "../components/productCard/ProductFilter";
import styles from "./ProductsPage.module.css";
import { useCart } from "../components/CartContext/CartContext";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import EdgePager from "../components/pagination/EdgePager";
import SEO from "../components/SEO";
import AppLoader from "../components/loaders/AppLoader";


const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
const PRODUCTS_PER_PAGE = 20;
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

const ProductsPage = () => {
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const topRef = useRef(null);



  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "ყველა"
  );
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
const productsTitle =
  selectedCategory && selectedCategory !== "ყველა"
    ? `${selectedCategory} - პროდუქცია | Artopia`
    : "პროდუქცია | Artopia";

const productsDescription =
  selectedCategory && selectedCategory !== "ყველა"
    ? `აღმოაჩინე ${selectedCategory.toLowerCase()} Artopia-ზე. შეკვეთა ონლაინ, მრავალფეროვანი არჩევანი და ხარისხიანი პროდუქცია ერთ სივრცეში.`
    : "Brendi Artopia გთავაზობთ სამხატვრო, საკანცელარიო, სასკოლო და საბავშვო პროდუქციას. შეარჩიე ფანქრები, საღებავები, რვეულები, ჩანთები, სათამაშოები და სხვა ნივთები ერთ ონლაინ მაღაზიაში.";

const productsUrl =
  selectedCategory && selectedCategory !== "ყველა"
    ? `https://artopia.ge/products?category=${encodeURIComponent(selectedCategory)}`
    : "https://artopia.ge/products";
  // idle | loading | success | not_found

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
    const pageFromUrl = Number(searchParams.get("page")) || 1;
    setCurrentPage(pageFromUrl);
  }, [searchParams]);

useEffect(() => {
  let mounted = true;

const params = new URLSearchParams();

params.set("page", currentPage);
params.set("limit", PRODUCTS_PER_PAGE);

if (selectedCategory && selectedCategory !== "ყველა") {
  params.set("category", selectedCategory);
}

if (searchTerm.trim()) {
  params.set("search", searchTerm.trim());
}

const url = `${API_BASE}/products/list?${params.toString()}`;

  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!mounted) return;

      const list = Array.isArray(data.items) ? data.items : [];
      const normalized = list.map(normalizeProduct);

      setProducts(normalized);
setTotal(data.total);
      // categories მაინც დავტოვოთ (ერთჯერადი)
      const uniqueCategories = [
        ...new Set(
          normalized
            .map((p) => String(p?.category_name || "").trim())
            .filter(Boolean)
        ),
      ];

    })
    .catch(() => {
      if (mounted) {
        setProducts([]);
        setCategories([]);
      }
    })
   .finally(() => {
  if (mounted) {
    setIsLoading(false);
  }
});
  return () => {
    mounted = false;
  };
}, [currentPage, selectedCategory, searchTerm]);

useEffect(() => {
  fetch(`${API_BASE}/products/categories`)
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) return;

      const cleaned = data
        .map(c => String(c).trim())
        .filter(Boolean);

      const unique = [...new Set(cleaned)];

      // გამოვყოთ "სხვა"
      const withoutOther = unique.filter(c => c !== "სხვა");

      // დავალაგოთ ანბანურად (ქართული)
      const sorted = withoutOther.sort((a, b) =>
        a.localeCompare(b, "ka")
      );

      // საბოლოო სია
 const finalCategories = [
  ...sorted,
  ...(unique.includes("სხვა") ? ["სხვა"] : [])
];

      setCategories(finalCategories);
    });
}, []);

  useEffect(() => {
    const catFromUrl = searchParams.get("category") || "ყველა";
    setSelectedCategory(catFromUrl);
  }, [searchParams]);


  const handlePageClick = ({ selected }) => {
    const newPage = selected + 1;
    setCurrentPage(newPage);

    const params = new URLSearchParams(searchParams);
    params.set("page", newPage);

    setSearchParams(params);

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToTop);
    });
  };

  const handleCategoryChange = (newCategory) => {
    setSelectedCategory(newCategory);
    setCurrentPage(1);

    const params = new URLSearchParams(location.search);

    if (newCategory && newCategory !== "ყველა") {
      params.set("category", newCategory);
    } else {
      params.delete("category");
    }

    params.set("page", 1);

    setSearchParams(params);
  };
const handleProductClick = (product) => {
  const slug = product?.slug;
  if (!slug) return;

  navigate(`/products/${slug}`, {
    state: {
      from: location.pathname + location.search
    }
  });
};
const filteredProducts = products;
const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: productsTitle,
  description: productsDescription,
  url: productsUrl,
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: filteredProducts.length,
    itemListElement: filteredProducts.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: product?.slug ? `https://artopia.ge/products/${product.slug}` : undefined,
      name: product?.name || "",
    })),
  },
};
  return (
    <>
    {isLoading && <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
  <AppLoader />
</div>}
 <SEO
  title={productsTitle}
  description={productsDescription}
  url={productsUrl}
/>
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
/>
    

      <div ref={topRef} className={styles.pageWrapper}>
        <h1 style={{ display: "none" }}>{productsTitle}</h1>
        <div className={styles.filterBar}>
          <div className={styles.selectDecor}>
       <ProductFilter
  categories={categories}
  selectedCategory={selectedCategory}
  onCategoryChange={handleCategoryChange}
  searchTerm={searchTerm}
  onSearchChange={(value) => {
    setSearchTerm(value);
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams);

    if (value.trim()) {
      params.set("page", 1)
    } else {
      params.set("page", 1)
    }

    setSearchParams(params);
  }}
/>
          </div>
        </div>

        {!isLoading && (
          <>
            <div className={`${styles.productsGrid} ${styles.catalogGrid}`}>
{filteredProducts.length > 0 ?(
filteredProducts.map((product, index) => {
                  

                  return (
                 <div
  key={product._id || product.id}
  onClick={() => handleProductClick(product)}
  className={styles.cardWrap}
  role="link"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleProductClick(product);
    }
  }}
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
                  პროდუქტები ვერ მოიძებნა.
                </div>
              )}
            </div>

            {total > PRODUCTS_PER_PAGE && (
              <EdgePager
           totalPages={Math.ceil(total / PRODUCTS_PER_PAGE)}

                currentPage={currentPage}
                onChange={(page) => {
                  setCurrentPage(page);

                  const params = new URLSearchParams(searchParams);
                  params.set("page", page);

                  setSearchParams(params);

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