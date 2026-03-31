import React, { useState, useEffect, useMemo } from "react";
import styles from "./ProductModal.module.css";
import { playSound } from "../../utils/playSound";
import popSfx from "../../assets/pop.mp3";
import { useLang } from "../../LanguageContext";
import SEO from "../SEO";
import RelatedProducts from "../RelatedProducts/RelatedProducts";
const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

const LBL = {
  ka: {
    new: "ახალი",
    category: "კატეგორია",
    unknown: "უცნობი",
    price: "ფასი",
    addToCart: "კალათაში დამატება",
    buyNow: "ყიდვა",
    outOfStock: "არ არის მარაგში",
    prev: "წინა",
    next: "შემდეგი",
    close: "დაკეტვა",
  },
  en: {
    new: "New",
    category: "Category",
    unknown: "Unknown",
    price: "Price",
    addToCart: "Add to cart",
    buyNow: "Buy now",
    outOfStock: "Out of stock",
    prev: "Prev",
    next: "Next",
    close: "Close",
  },
};

const normalizeQuantity = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
};

const getSubOf = (product) =>
  product?.subcategory ??
  product?.sub_category ??
  product?.subCategory ??
  product?.details?.subcategory ??
  null;

const ProductModal = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  onProductClick,
  enableSeo = false,
  canonicalUrl = "",
}) => {
  const { lang } = useLang();
  const T = LBL[lang] || LBL.ka;

  const pick = (ka, en) =>
    lang === "en" ? (en ?? ka ?? "") : (ka ?? en ?? "");

  const [quantity, setQuantity] = useState(1);
  const [stockMessage, setStockMessage] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [details, setDetails] = useState(null);

  const images = [
    product.image_url1,
    product.image_url2,
    product.image_url3,
    product.image_url4,
    product.image_url5,
    product.image_url6,
  ].filter(Boolean);

  useEffect(() => {
    if (!product?.id) return;

    let ignore = false;

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/products/${product.id}?lang=${lang}`);
        if (!response.ok) return;

        const data = await response.json();
        if (!ignore) setDetails(data || {});
      } catch {
        // ignore
      }
    })();

    return () => {
      ignore = true;
    };
  }, [product?.id, lang]);

  const maxQty = useMemo(
    () => normalizeQuantity(details?.quantity ?? product?.quantity ?? 0),
    [details?.quantity, product?.quantity]
  );

  const inStock = maxQty > 0;

  useEffect(() => {
    setQuantity((prev) => {
      if (maxQty === 0) return 1;
      return Math.min(prev, maxQty);
    });
  }, [maxQty]);

  const increment = () => {
    if (quantity >= maxQty) {
      setStockMessage(
        lang === "en"
          ? `Only ${maxQty} item(s) available in stock.`
          : `მარაგში მხოლოდ ${maxQty} ცალია.`
      );
      return;
    }

    setStockMessage("");
    setQuantity((prev) => prev + 1);
  };

  const decrement = () => {
    setStockMessage("");
    setQuantity((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((idx) => (idx === 0 ? images.length - 1 : idx - 1));
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((idx) => (idx === images.length - 1 ? 0 : idx + 1));
  };
const handleAddToCartClick = () => {
  const safeProduct = {
    ...product,
    quantity: maxQty,
  };

  onAddToCart(safeProduct, quantity);
  playSound(popSfx, 0.4);
};

  const handleBuyNowClick = () => {
    const safeProduct = {
      ...product,
      quantity: maxQty,
    };

    onBuyNow(safeProduct, quantity);
  };

  const hasSale =
    typeof product?.sale === "number" &&
    product.sale > 0 &&
    product.sale <= 100;

  const discounted = hasSale
    ? (Number(product.price || 0) * (1 - product.sale / 100)).toFixed(2)
    : null;

  const isNew = !!product?.is_new;

  const propCategory =
    (product?.category ?? product?.details?.category ?? "").trim() || null;
  const propSub = getSubOf(product);

  const detCategory = (details?.category ?? "").trim() || null;
  const detSub =
    details?.subcategory ??
    details?.sub_category ??
    details?.subCategory ??
    null;

  const categoryToShow = propCategory || detCategory || "";
  const subToShow = propSub || detSub || "";

  const title = (
    details?.name ??
    pick(product?.name ?? product?.name_ka, product?.name_en)
  ).trim();

  const description = (
    details?.description ??
    pick(product?.description ?? product?.description_ka, product?.description_en)
  ).trim();

  const seoDescription =
    description && description.length > 160
      ? `${description.slice(0, 157)}...`
      : description ||
        (lang === "en"
          ? "View this product on Artopia."
          : "ნახე ეს პროდუქტი Artopia-ზე.");

  const seoImage = images[0] || "https://artopia.ge/social-preview.png";

  return (
    <div
      className={`${styles.modalOverlay} product-card`}
      onClick={onClose}
      aria-label="product-modal"
    >
      {enableSeo && canonicalUrl ? (
        <SEO
          title={title || (lang === "en" ? "Product" : "პროდუქტი")}
          description={seoDescription}
          url={canonicalUrl}
          image={seoImage}
          type="product"
        />
      ) : null}

      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={T.close}
          title={T.close}
        >
          ×
        </button>

        <div className={styles.imageContainer}>

{isNew && (
  <div className={styles.ribbon}>
    <span>{T.new}</span>
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
              className={styles.navBtn}
              onClick={prevImage}
              aria-label={T.prev}
              title={T.prev}
            >
              ‹
            </button>
          )}

          <img
            src={images.length > 0 ? images[currentImageIndex] : "/noimage.jpeg"}
            alt={title || product.name}
            className={styles.productImage}
          />

          {images.length > 1 && (
            <button
              className={styles.navBtn}
              onClick={nextImage}
              aria-label={T.next}
              title={T.next}
            >
              ›
            </button>
          )}

          {images.length > 1 && (
            <div className={styles.dotsBar} aria-label="image navigation">
              {images.map((_, i) => {
                const active = i === currentImageIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    className={styles.dotBtn}
                    aria-label={`${i + 1} / ${images.length}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(i);
                    }}
                  >
                    <span className={active ? styles.dotActive : styles.dot} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.details}>
          <h2 className={styles.productName}>{title}</h2>

          {categoryToShow || subToShow ? (
            <p className={styles.category}>
              {T.category}: {categoryToShow || T.unknown}
              {subToShow ? <span> → {String(subToShow).trim()}</span> : null}
            </p>
          ) : (
            <p className={styles.category}>
              {T.category}: {T.unknown}
            </p>
          )}

          {description ? (
            <p className={styles.description}>{description}</p>
          ) : (
            <p className={`${styles.description} ${styles.dimText}`}> </p>
          )}

          {hasSale ? (
            <div className={styles.priceRow}>
              <span className={styles.oldPrice}>{product.price} ₾</span>
              <span className={styles.newPrice}>{discounted} ₾</span>
            </div>
          ) : (
            <p className={styles.price}>
              {T.price}: {product.price} ₾
            </p>
          )}

          <div className={styles.quantityControl}>
            {stockMessage && (
              <div className={styles.stockWarning}>{stockMessage}</div>
            )}

            <button
              onClick={decrement}
              className={styles.qtyBtn}
              disabled={quantity <= 1}
              aria-label="-"
              title="−"
            >
              –
            </button>

            <span className={styles.qtyDisplay}>{quantity}</span>

            <button
              onClick={increment}
              className={styles.qtyBtn}
              aria-label="+"
              title="+"
              disabled={!inStock}
            >
              +
            </button>
          </div>

          <div className={styles.actionButtons}>
            {inStock ? (
              <>
         <button
  onClick={handleAddToCartClick}
  className={styles.addToCartBtn}
  type="button"
>
  <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.cartIcon}>
    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A.996.996 0 0 0 21.42 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
  <span className={styles.addToCartText}>{T.addToCart}</span>
</button>
                <button
                  onClick={handleBuyNowClick}
                  className={styles.buyNowBtn}
                >
                  {T.buyNow}
                </button>
              </>
            ) : (
              <div
                className={styles.outOfStock}
                role="button"
                aria-disabled="true"
                title={T.outOfStock}
              >
                {T.outOfStock}
              </div>
            )}
          </div>
        </div>
                <div className={styles.relatedWrap}>
          <RelatedProducts
            currentProduct={product}
            onProductClick={onProductClick}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductModal;