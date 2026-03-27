import React, { useState, useEffect } from "react";
import styles from "./ProductModal.module.css";
import StarburstBadge from "../StartburstBadge";
import BrushBadge from "../BrushBadge";
import { useLang } from "../../LanguageContext";
import SEO from "../SEO";

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

const getSubOf = (p) =>
  p?.subcategory ??
  p?.sub_category ??
  p?.subCategory ??
  p?.details?.subcategory ??
  null;

const API_BASE =
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

const ProductModal = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  enableSeo = false,
  canonicalUrl = "",
}) => {
  const { lang } = useLang();
  const T = LBL[lang] || LBL.ka;

  const pick = (ka, en) =>
    lang === "en" ? en ?? ka ?? "" : ka ?? en ?? "";

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

  const increment = () => {
 const maxQty =
  product?.quantity ??
  details?.quantity ??
  0;

  if (quantity >= maxQty) {
    setStockMessage(
      lang === "en"
        ? `Only ${maxQty} item(s) available in stock.`
        : `მარაგში მხოლოდ ${maxQty} ცალია.`
    );
    return;
  }

  setStockMessage("");
  setQuantity((q) => q + 1);
};
 const decrement = () => {
  setStockMessage("");
  setQuantity((q) => (q > 1 ? q - 1 : q));
};

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((idx) =>
      idx === 0 ? images.length - 1 : idx - 1
    );
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((idx) =>
      idx === images.length - 1 ? 0 : idx + 1
    );
  };

  const handleAddToCartClick = () => {
  const safeProduct = {
    ...product,
    quantity:
      product?.quantity ??
      details?.quantity ??
      0,
  };

  onAddToCart(safeProduct, quantity);
};
  const handleBuyNowClick = () =>
    onBuyNow(product, quantity);

  const hasSale =
    typeof product?.sale === "number" &&
    product.sale > 0 &&
    product.sale <= 100;

  const discounted = hasSale
    ? (
        Number(product.price || 0) *
        (1 - product.sale / 100)
      ).toFixed(2)
    : null;

  const isNew = !!product?.is_new;
const maxQty =
  product?.quantity ??
  details?.quantity ??
  0;

const inStock = maxQty > 0;
  const propCategory = (
    product?.category ?? product?.details?.category ?? ""
  ).trim() || null;
  const propSub = getSubOf(product);

  const detCategory =
    (details?.category ?? "").trim() || null;
  const detSub =
    details?.subcategory ??
    details?.sub_category ??
    details?.subCategory ??
    null;

  const categoryToShow =
    propCategory || detCategory || "";
  const subToShow = propSub || detSub || "";

  useEffect(() => {
    if (!product?.id) return;
    let ignore = false;
    (async () => {
      try {
        const r = await fetch(
          `${API_BASE}/products/${product.id}?lang=${lang}`
        );
        if (!r.ok) return;
        const data = await r.json();
        if (!ignore) setDetails(data || {});
      } catch {
        /* ignore */
      }
    })();
    return () => {
      ignore = true;
    };
  }, [product?.id, lang]);

  const title = (
    details?.name ??
    pick(
      product?.name ?? product?.name_ka,
      product?.name_en
    )
  ).trim();

  const description = (
    details?.description ??
    pick(
      product?.description ?? product?.description_ka,
      product?.description_en
    )
  ).trim();

  const seoDescription =
    description && description.length > 160
      ? description.slice(0, 157) + "..."
      : description ||
        (lang === "en"
          ? "View this product on Artopia."
          : "ნახე ეს პროდუქტი Artopia-ზე.");

  const seoImage =
    images[0] ||
    "https://artopia.ge/social-preview.png";

  return (
    <div
      className={`${styles.modalOverlay} product-card`}
      onClick={onClose}
      aria-label="product-modal"
    >
      {/* ✅ SEO მხოლოდ მაშინ, როცა URL-ითაა გახსნილი /products/:id */}
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
          {hasSale && (
            <StarburstBadge
              value={product.sale}
              size={96}
              className={styles.SaleBadge}
            />
          )}
          {isNew && (
            <BrushBadge
              text={T.new}
              size={80}
              className={styles.NewBadge}
            />
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

          {images.length > 0 ? (
            <img
              src={images[currentImageIndex]}
              alt={title || product.name}
              className={styles.productImage}
            />
          ) : (
            <div className={styles.imgPlaceholder} />
          )}

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
            <div
              className={styles.dotsBar}
              aria-label="image navigation"
            >
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
                    <span
                      className={
                        active ? styles.dotActive : styles.dot
                      }
                    />
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
              {subToShow ? (
                <span> → {String(subToShow).trim()}</span>
              ) : null}
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
              <span className={styles.oldPrice}>
                {product.price} ₾
              </span>
              <span className={styles.newPrice}>
                {discounted} ₾
              </span>
            </div>
          ) : (
            <p className={styles.price}>
              {T.price}: {product.price} ₾
            </p>
          )}

          <div className={styles.quantityControl}>
            {stockMessage && (
  <div className={styles.stockWarning}>
    {stockMessage}
  </div>
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
            <span className={styles.qtyDisplay}>
              {quantity}
            </span>
            <button
              onClick={increment}
              className={styles.qtyBtn}
              aria-label="+"
              title="+"
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
                >
                  {T.addToCart}
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
      </div>
    </div>
  );
};

export default ProductModal;
