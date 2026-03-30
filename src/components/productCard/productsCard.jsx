// src/components/productCard/ProductsCard.jsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import styles from "./ProductsCard.module.css";
import StarburstBadge from "../StartburstBadge";
import BrushBadge from "../BrushBadge";
import { useFlyToCart } from "../useFlyToCart";
import { useCartUiRefs } from "../Navbar/Navbar";
import { playSound } from "../../utils/playSound";
import popSfx from "../../assets/pop.mp3";
import { useLang } from "../../LanguageContext";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

/* UI ტექსტები */
const LBL = {
  ka: { new: "ახალი", addToCart: "კალათაში დამატება", buyNow: "ყიდვა", outOfStock: "არ არის მარაგში", category: "კატეგორია" },
  en: { new: "New", addToCart: "Add to cart", buyNow: "Buy now", outOfStock: "Out of stock", category: "Category" },
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
  const discounted = hasSale ? +(price * (1 - Number(product.sale) / 100)).toFixed(2) : price;

  // ----- detail fetch (ერთხელ თითო product-ზე) -----
  useEffect(() => {
    let ignore = false;
    if (!pid) return;

    // მოვიდეს ინგლისურადაც და ქართულადაც სწორი ველი ბექიდან
    (async () => {
      try {
  const r = await fetch(
  `${API_BASE}/products/${pid}?lang=${lang}`,
 
);


        if (!r.ok) return;
        const data = await r.json();
        if (!ignore) setDetails(data || {});
      } catch {
        /* ignore */
      }
    })();

    return () => { ignore = true; };
  }, [pid, lang]);

  // ----- ენა-მეგობრული გეთერები -----
  const pick = (ka, en) => (lang === "en" ? (en ?? ka ?? "") : (ka ?? en ?? ""));

  // name
  const nameKA = product?.name ?? details?.name ?? details?.name_ka;
  const nameEN = product?.name_en ?? details?.name_en;
  const title = pick(nameKA, nameEN) || ""; // საბოლოო სათაური

  // description (თუ გინდა, გამოიყენე სადმე)
  const descKA = product?.description ?? details?.description ?? details?.description_ka;
  const descEN = product?.description_en ?? details?.description_en;
  const description = pick(descKA, descEN);

  // category + subcategory
  const catKA = product?.category ?? details?.category ?? details?.category_ka;
  const catEN = product?.category_en ?? details?.category_en;
  const category = pick(catKA, catEN);

  const subKA =
    product?.subcategory ??
    product?.sub_category ??
    details?.subcategory ??
    details?.sub_category ??
    details?.subcategory_ka ??
    details?.sub_category_ka;

  const subEN =
    product?.subcategory_en ??
    product?.sub_category_en ??
    details?.subcategory_en ??
    details?.sub_category_en;

  const subcategory = pick(subKA, subEN);

  // მარაგი
  const stockSnapshot = useMemo(() => {
    const rawQty = details?.quantity ?? product?.quantity ?? 0;
    const parsedQty = Number(rawQty);
    const quantity = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 0;

    return {
      quantity,
      inStock: quantity > 0,
    };
  }, [product?.quantity, details?.quantity]);

  const inStock = stockSnapshot.inStock;

  const addOne = (e) => {
    e.stopPropagation();
    onAddToCart(e, 1);
    playSound(popSfx, 0.4);
    flyToCart(imgRef.current);
    e.currentTarget.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }],
      { duration: 180, easing: "ease-out" }
    );
  };

  const buyOne = (e) => {
    e.stopPropagation();
    onBuyNow(e, 1);
  };

  return (
    <>
      {hasSale && <StarburstBadge value={Number(product.sale)} size={96} className={styles.SaleBadge} />}
      {product?.is_new && <BrushBadge text={T.new} className={styles.NewBadge} />}

      <div className={`${styles.productCard} product-card`}>
        <img
          ref={imgRef}
          className={styles.image}
          src={product.image_url1 || "/noimage.jpeg"}
          alt={title || "product"}
        />

        {/* სათაური */}
        {title ? <h3>{title}</h3> : <h3>—</h3>}
        {/* კატეგორია → ქვეკატეგორია (მხოლოდ როცა გვაქვს რაიმე) */}

        {/* კატეგორია → ქვეკატეგორია (მხოლოდ როცა გვაქვს რაიმე) */}
        {(category || subcategory) && (
          <p className={styles.category}>
            {T.category}: {category || "—"}
            {subcategory ? <span> → {String(subcategory).trim()}</span> : null}
          </p>
        )}

        <div className={styles.priceRow}>
          {hasSale ? (
            <>
              <span className={styles.priceOld}>{price.toFixed(2)} ₾</span>
              <span className={styles.priceNew}>{discounted.toFixed(2)} ₾</span>
            </>
          ) : (
            <span className={styles.priceNew}>{price.toFixed(2)} ₾</span>
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
            <div className={styles.outOfStock}>{T.outOfStock}</div>
          )}
        </div>
      </div>
    </>
  );
}
