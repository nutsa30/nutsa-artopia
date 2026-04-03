import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import { useCart } from "../components/CartContext/CartContext";
import { playSound } from "../utils/playSound";
import popSfx from "../assets/pop.mp3";
import styles from "./SingleProductPage.module.css";
import { useLocation } from "react-router-dom";
import AppLoader from "../components/loaders/AppLoader";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
const NO_IMAGE = "/noimage.jpeg";

const L = {
  back: "← კატალოგში დაბრუნება",
  category: "კატეგორია",
  unknown: "უცნობი",
  price: "ფასი",
  addToCart: "კალათაში დამატება",
  buyNow: "ყიდვა",
  outOfStock: "არ არის მარაგში",
  prev: "წინა",
  next: "შემდეგი",
  new: "ახალი",
};

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

const normalizeProduct = (product) => {
  const images = getProductImages(product);
  return {
    ...product,
    quantity: normalizeQuantity(product?.quantity ?? 0),
    image_url1: images[0] || NO_IMAGE,
    image_url2: images[1] || "",
    image_url3: images[2] || "",
    image_url4: images[3] || "",
    image_url5: images[4] || "",
    image_url6: images[5] || "",
  };
};

export default function SingleProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const location = useLocation();
const [product, setProduct] = useState(null);
const [relatedProducts, setRelatedProducts] = useState([]);
const [status, setStatus] = useState("loading");
const [quantity, setQuantity] = useState(1);
const [stockMessage, setStockMessage] = useState("");
const [currentImageIndex, setCurrentImageIndex] = useState(0);
const [isModalOpen, setIsModalOpen] = useState(false);
const [relatedStartIndex, setRelatedStartIndex] = useState(0);
const [relatedVisibleCount, setRelatedVisibleCount] = useState(4);
  useEffect(() => {
    let ignore = false;

    const fetchProduct = async () => {
      try {
        setStatus("loading");

const res = await fetch(`${API_BASE}/products/full/${slug}`);
if (!res.ok) {
  if (!ignore) setStatus("not_found");
  return;
}

const data = await res.json();

if (!ignore) {
  setProduct(normalizeProduct(data.product));
  setRelatedProducts(
    Array.isArray(data.related) ? data.related.map(normalizeProduct) : []
  );
  setStatus("success");
}
      } catch (err) {
        console.error("Failed to fetch product by slug", err);
        if (!ignore) setStatus("not_found");
      }
    };

    fetchProduct();

    return () => {
      ignore = true;
    };
  }, [slug]);

  const images = useMemo(() => {
    if (!product) return [];
    return [
      product.image_url1,
      product.image_url2,
      product.image_url3,
      product.image_url4,
      product.image_url5,
      product.image_url6,
    ].filter(Boolean);
  }, [product]);

  const maxQty = useMemo(
    () => normalizeQuantity(product?.quantity ?? 0),
    [product]
  );

  const inStock = maxQty > 0;

  useEffect(() => {
    setQuantity((prev) => {
      if (maxQty === 0) return 1;
      return Math.min(prev, maxQty);
    });
  }, [maxQty]);
useEffect(() => {
  const updateRelatedVisibleCount = () => {
    if (window.innerWidth <= 520) {
      setRelatedVisibleCount(2);
    } else if (window.innerWidth <= 900) {
      setRelatedVisibleCount(3);
    } else if (window.innerWidth <= 1200) {
      setRelatedVisibleCount(4);
    } else {
      setRelatedVisibleCount(5);
    }
  };

  updateRelatedVisibleCount();
  window.addEventListener("resize", updateRelatedVisibleCount);

  return () => window.removeEventListener("resize", updateRelatedVisibleCount);
}, []);
useEffect(() => {
  setCurrentImageIndex(0);
  setStockMessage("");
  setRelatedStartIndex(0);
}, [slug]);

  const increment = () => {
    if (quantity >= maxQty) {
      setStockMessage(`მარაგში მხოლოდ ${maxQty} ცალია.`);
      return;
    }
    setStockMessage("");
    setQuantity((prev) => prev + 1);
  };

  const decrement = () => {
    setStockMessage("");
    setQuantity((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const handleAddToCart = () => {
    if (!product || !inStock) return;
    addToCart(product, quantity);
    playSound(popSfx, 0.4);
  };

  const handleBuyNow = () => {
    if (!product || !inStock) return;
    addToCart(product, quantity);
    navigate("/checkout");
  };

const handleRelatedProductClick = (nextProduct) => {
  if (!nextProduct?.slug) return;

  navigate(`/products/${nextProduct.slug}`, {
    state: {
      from: location.state?.from || "/products",
    },
  });
};
const maxRelatedStart = Math.max(
  0,
  relatedProducts.length - relatedVisibleCount
);

const canGoRelatedPrev = relatedStartIndex > 0;
const canGoRelatedNext = relatedStartIndex < maxRelatedStart;

const visibleRelatedProducts = relatedProducts.slice(
  relatedStartIndex,
  relatedStartIndex + relatedVisibleCount
);
if (status === "loading") {
  return <AppLoader />;
}

  if (status === "not_found" || !product) {
    return <div className={styles.loader}>პროდუქტი ვერ მოიძებნა.</div>;
  }

  const hasSale =
    typeof product?.sale === "number" &&
    product.sale > 0 &&
    product.sale <= 100;

  const discounted = hasSale
    ? (Number(product.price || 0) * (1 - product.sale / 100)).toFixed(2)
    : null;

  const title = String(product?.name || "").trim();
  const description = String(product?.description || "").trim();
  const category = String(
    product?.category_name || product?.category || ""
  ).trim();

  const seoDescription =
    description && description.length > 160
      ? `${description.slice(0, 157)}...`
      : description || "ნახე ეს პროდუქტი Artopia-ზე.";

  const seoImage = images[0] || "https://artopia.ge/social-preview.png";
const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: title,
  image: images,
  description: description,
  brand: {
    "@type": "Brand",
    name: "Artopia",
  },
  offers: {
    "@type": "Offer",
    price: product.price,
    priceCurrency: "GEL",
    availability: inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
  },
};
  return (
    <>
      <SEO
        title={title || "პროდუქტი"}
        description={seoDescription}
        url={`https://artopia.ge/products/${slug}`}
        image={seoImage}
        type="product"
      />
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
/>
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button
            className={styles.backBtn}
onClick={() => {
  if (location.state?.from) {
    navigate(location.state.from);
  } else {
navigate(-1);
  }
}}
            type="button"
          >
            {L.back}
          </button>
        </div>

        <section className={styles.hero}>
          <div className={styles.galleryCard}>
            <div className={styles.imageBox}>
              {!!product?.is_new && (
                <div className={styles.ribbon}>
                  <span>{L.new}</span>
                </div>
              )}

              {hasSale && (
                <div className={styles.saleTag}>
                  <span>
                    <b>-{Number(product.sale)}%</b>
                  </span>
                </div>
              )}

              {images.length > 1 && (
             <button
  className={`${styles.arrowBtn} ${styles.left}`}
  onClick={() =>
    setCurrentImageIndex((idx) =>
      idx === 0 ? images.length - 1 : idx - 1
    )
  }
>
  <svg viewBox="0 0 24 24">
    <path d="M15 6l-6 6 6 6" />
  </svg>
</button>
              )}

<img
  src={images.length > 0 ? images[currentImageIndex] : NO_IMAGE}
  alt={`${title} - ${category} Artopia`}
  className={styles.productImage}
  loading="eager"
  decoding="async"
  onClick={() => setIsModalOpen(true)}
  style={{ cursor: "zoom-in" }}
/>

              {images.length > 1 && (
      <button
  className={`${styles.arrowBtn} ${styles.right}`}
  onClick={() =>
    setCurrentImageIndex((idx) =>
      idx === images.length - 1 ? 0 : idx + 1
    )
  }
>
  <svg viewBox="0 0 24 24">
    <path d="M9 6l6 6-6 6" />
  </svg>
</button>
              )}


</div> {/* imageBox */}

{images.length > 0 && (
  <div className={styles.thumbnailBar}>
    {images.map((img, i) => (
      <button
        key={i}
        type="button"
        className={`${styles.thumbnailBtn} ${
          i === currentImageIndex ? styles.thumbnailActive : ""
        }`}
        onClick={() => setCurrentImageIndex(i)}
      >
<img
  src={img}
  alt={`${title} ${category} ფოტო ${i + 1} - Artopia`}
/>
      </button>
    ))}
  </div>
)}

</div> {/* galleryCard */}

          <div className={styles.infoCard}>
            <h1 className={styles.title}>{title}</h1>

            <p className={styles.category}>
              {L.category}: {category || L.unknown}
            </p>

            {description ? (
              <p className={styles.description}>{description}</p>
            ) : null}

            {hasSale ? (
              <div className={styles.priceRow}>
                <span className={styles.oldPrice}>{product.price} ₾</span>
                <span className={styles.newPrice}>{discounted} ₾</span>
              </div>
            ) : (
              <p className={styles.price}>
                {L.price}: {product.price} ₾
              </p>
            )}

            <div className={styles.purchaseBox}>
              {stockMessage ? (
                <div className={styles.stockWarning}>{stockMessage}</div>
              ) : null}

<div className={styles.quantityControl}>
  {/* MINUS */}
  <div className={styles.checkboxWrapper}>
    <input
      type="checkbox"
      className={styles.checkbox}
      id="minusBtn"
      onClick={decrement}
      disabled={quantity <= 1}
    />

    <label htmlFor="minusBtn" className={styles.checkboxLabel}>
      <div className={styles.checkboxFlip}>
        <div className={styles.checkboxFront}>−</div>
        <div className={styles.checkboxBack}>−</div>
      </div>
    </label>
  </div>

  <span className={styles.qtyDisplay}>{quantity}</span>

  {/* PLUS */}
  <div className={styles.checkboxWrapper}>
    <input
      type="checkbox"
      className={styles.checkbox}
      id="plusBtn"
      onClick={increment}
      disabled={!inStock}
    />

    <label htmlFor="plusBtn" className={styles.checkboxLabel}>
      <div className={styles.checkboxFlip}>
        <div className={styles.checkboxFront}>+</div>
        <div className={styles.checkboxBack}>+</div>
      </div>
    </label>
  </div>
</div>

              <div className={styles.actionButtons}>
                {inStock ? (
                  <>
                    <button
                      onClick={handleAddToCart}
                      className={styles.addToCartBtn}
                      type="button"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.cartIcon}>
                        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A.996.996 0 0 0 21.42 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                      <span className={styles.addToCartText}>{L.addToCart}</span>
                    </button>

              <button
  onClick={handleBuyNow}
  className={styles.buyNowBtn}
  type="button"
>
  <span className={styles.buyNowText}>{L.buyNow}</span>
</button>
                  </>
                ) : (
                  <div className={styles.outOfStock}>{L.outOfStock}</div>
                )}
              </div>
            </div>
          </div>
        </section>
{isModalOpen && (
  <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>

      <button
        className={styles.closeBtn}
        onClick={() => setIsModalOpen(false)}
      >
        ✕
      </button>

      <img
        src={images[currentImageIndex]}
alt={`${title} ${category} დეტალური ფოტო - Artopia`}
        className={styles.modalImage}
      />

    </div>
  </div>
)}
{relatedProducts.length > 0 && (
  <section className={styles.relatedSection}>
    <div className={styles.relatedHeader}>
      <h2 className={styles.relatedTitle}>მსგავსი პროდუქტები</h2>

      <div className={styles.relatedNav}>
        <button
          type="button"
          className={styles.relatedArrow}
          onClick={() =>
            setRelatedStartIndex((prev) => Math.max(0, prev - 1))
          }
          disabled={!canGoRelatedPrev}
          aria-label="წინა"
        >
          ‹
        </button>

        <button
          type="button"
          className={styles.relatedArrow}
          onClick={() =>
            setRelatedStartIndex((prev) =>
              Math.min(maxRelatedStart, prev + 1)
            )
          }
          disabled={!canGoRelatedNext}
          aria-label="შემდეგი"
        >
          ›
        </button>
      </div>
    </div>

    <div
      className={styles.relatedTrack}
      style={{
        gridTemplateColumns: `repeat(${relatedVisibleCount}, minmax(0, 1fr))`,
      }}
    >
      {visibleRelatedProducts.map((item) => {
        const itemHasSale =
          typeof item?.sale === "number" &&
          item.sale > 0 &&
          item.sale <= 100;

        const itemDiscounted = itemHasSale
          ? (Number(item.price || 0) * (1 - item.sale / 100)).toFixed(2)
          : null;

        return (
          <button
            key={item.id}
            type="button"
            className={styles.relatedCard}
            onClick={() => handleRelatedProductClick(item)}
          >
        <img
  src={item.image_url1 || NO_IMAGE}
  alt={`${item.name} Artopia`}
  className={styles.relatedImage}
  loading="lazy"
/>

            <div className={styles.relatedName}>{item.name}</div>

            {itemHasSale ? (
              <div className={styles.relatedPriceWrap}>
                <span className={styles.relatedOldPrice}>{item.price} ₾</span>
                <span className={styles.relatedPrice}>{itemDiscounted} ₾</span>
              </div>
            ) : (
              <div className={styles.relatedPrice}>{item.price} ₾</div>
            )}
          </button>
        );
      })}
    </div>
  </section>
)}
      </div>
    </>
  );
}