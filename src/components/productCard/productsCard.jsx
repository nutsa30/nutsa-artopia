// src/components/productCard/ProductsCard.jsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import styles from "./ProductsCard.module.css";
import StarburstBadge from "../StartburstBadge";
import { useFlyToCart } from "../useFlyToCart";
import { useCartUiRefs } from "../Navbar/Navbar";
import { playSound } from "../../utils/playSound";
import popSfx from "../../assets/pop.mp3";
import { useLang } from "../../LanguageContext";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

/* UI ტექსტები */
const LBL = {
  ka: {
    new: "ახალი",
    addToCart: "კალათაში დამატება",
    buyNow: "ყიდვა",
    outOfStock: "არ არის მარაგში",
    category: "კატეგორია",
  },
  en: {
    new: "New",
    addToCart: "Add to cart",
    buyNow: "Buy now",
    outOfStock: "Out of stock",
    category: "Category",
  },
};

export default function ProductsCard({ product, onAddToCart, onBuyNow }) {
  const { cartRef } = useCartUiRefs();
  const flyToCart = useFlyToCart(cartRef);
  const imgRef = useRef(null);

  const { lang } = useLang();
  const T = LBL[lang] || LBL.ka;

  const [details, setDetails] = useState(null);
  const pid = product?.id ?? product?._id;

  // ფასდაკლება
  const hasSale = useMemo(() => {
    const s = Number(product?.sale);
    return Number.isFinite(s) && s > 0 && s <= 100;
  }, [product?.sale]);

  const price = Number(product?.price || 0);
  const discounted = hasSale
    ? +(price * (1 - Number(product.sale) / 100)).toFixed(2)
    : price;

  // დეტალების წამოღება (quantity-სთვის მთავარი)
  useEffect(() => {
    let ignore = false;
    if (!pid) return;

    (async () => {
      try {
        const r = await fetch(`${API_BASE}/products/${pid}?lang=${lang}`);
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
  }, [pid, lang]);

  // ენა helper
  const pick = (ka, en) =>
    lang === "en" ? en ?? ka ?? "" : ka ?? en ?? "";

  // title
  const title = pick(
    product?.name ?? details?.name ?? details?.name_ka,
    product?.name_en ?? details?.name_en
  );

  // category
  const category = pick(
    product?.category ?? details?.category ?? details?.category_ka,
    product?.category_en ?? details?.category_en
  );

  const subcategory = pick(
    product?.subcategory ??
      product?.sub_category ??
      details?.subcategory ??
      details?.sub_category ??
      details?.subcategory_ka,
    product?.subcategory_en ?? details?.subcategory_en
  );

  // ✅ მთავარი FIX — ერთიანი quantity
  const quantity = useMemo(() => {
    const raw = details?.quantity ?? product?.quantity ?? 0;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
  }, [details?.quantity, product?.quantity]);

  const inStock = quantity > 0;

  // ✅ მთავარი FIX — იგივე quantity გადაეცემა parent-ს
  const addOne = (e) => {
    e.stopPropagation();

    if (!inStock) return;

    const safeProduct = {
      ...product,
      quantity, // 🔥 კრიტიკული ფიქსი
    };

    onAddToCart(e, 1, safeProduct);

    playSound(popSfx, 0.4);
    flyToCart(imgRef.current);

    e.currentTarget.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.1)" },
        { transform: "scale(1)" },
      ],
      { duration: 180, easing: "ease-out" }
    );
  };

  const buyOne = (e) => {
    e.stopPropagation();

    if (!inStock) return;

    const safeProduct = {
      ...product,
      quantity, // 🔥 იგივე აქაც
    };

    onBuyNow(e, 1, safeProduct);
  };

  return (
    <>
      {hasSale && (
        <StarburstBadge
          value={Number(product.sale)}
          size={96}
          className={styles.SaleBadge}
        />
      )}

<div className={`${styles.productCard} product-card`}>

  {product?.is_new && (
    <div className={styles.ribbon}>
      <span>{T.new}</span>
    </div>
  )}
        <img
          ref={imgRef}
          className={styles.image}
          src={product.image_url1 || "/noimage.jpeg"}
          alt={title || "product"}
        />

        {title ? <h3>{title}</h3> : <h3>—</h3>}

        {(category || subcategory) && (
          <p className={styles.category}>
            {T.category}: {category || "—"}
            {subcategory ? <span> → {subcategory}</span> : null}
          </p>
        )}

        <div className={styles.priceRow}>
          {hasSale ? (
            <>
              <span className={styles.priceOld}>
                {price.toFixed(2)} ₾
              </span>
              <span className={styles.priceNew}>
                {discounted.toFixed(2)} ₾
              </span>
            </>
          ) : (
            <span className={styles.priceNew}>
              {price.toFixed(2)} ₾
            </span>
          )}
        </div>

        <div className={styles.buttonWrapper}>
          {inStock ? (
            <div className={styles.buttons}>
              <button className={styles.addToCart} onClick={addOne}>
                {T.addToCart}
              </button>
              <button className={styles.buyNow} onClick={buyOne}>
                {T.buyNow}
              </button>
            </div>
          ) : (
            <div className={styles.outOfStock}>
              {T.outOfStock}
            </div>
          )}
        </div>
      </div>
    </>
  );
}