import React, { useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./ProductsCard.module.css";
import { useFlyToCart } from "../useFlyToCart";
import { useCartUiRefs } from "../Navbar/Navbar";
import { playSound } from "../../utils/playSound";
import { responsiveImage } from "../../utils/cloudinary";
import popSfx from "../../assets/pop.mp3";

const LBL = {
  new: "ახალი",
  addToCart: "კალათაში დამატება",
  buyNow: "ყიდვა",
  outOfStock: "ამოწურულია",
  category: "კატეგორია",
};

export default function ProductsCard({ product, onAddToCart, onBuyNow, href, linkState, eager = false, priority = false }) {
  const { cartRef } = useCartUiRefs();
  const flyToCart = useFlyToCart(cartRef);
  const imgRef = useRef(null);

  const T = LBL;

  // მარაგი და სახელი სიის პასუხიდან მოდის (სერვერი იქვე აბრუნებს ახლა
  // შესაკვეთ რაოდენობას) — თითო ბარათი ცალკე მოთხოვნას აღარ აგზავნის.
  const hasSale = useMemo(() => {
    const s = Number(product?.sale);
    return Number.isFinite(s) && s > 0 && s <= 100;
  }, [product?.sale]);

  const price = Number(product?.price || 0);
  const discounted = hasSale
    ? +(price * (1 - Number(product.sale) / 100)).toFixed(2)
    : price;

  const title = String(product?.name ?? "").trim();

  const category = String(product?.category_name ?? product?.category ?? "").trim();

  const quantity = useMemo(() => {
    const num = Number(product?.quantity ?? 0);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
  }, [product?.quantity]);

  const inStock = quantity > 0;
  const picture = responsiveImage(product?.image_url1, "card");

  const addOne = (e) => {
    e.stopPropagation();

    if (!inStock) return;

    const safeProduct = {
      ...product,
      quantity,
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
      quantity,
    };

    onBuyNow(e, 1, safeProduct);
  };

  return (
    <>
<div
  className={`${styles.productCard} product-card`}
>
          {product?.is_new && (
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

<img
  ref={imgRef}
  className={styles.image}
  src={picture.src || "/noimage.jpeg"}
  srcSet={picture.srcSet}
  sizes={picture.sizes}
  alt={`${title} - ${category} Artopia`}
  // პირველი ეკრანის ბარათები მაშინვე იტვირთება (LCP), დანარჩენი — გადახვევისას
  loading={eager ? "eager" : "lazy"}
  {...(priority ? { fetchpriority: "high" } : {})}
  decoding="async"
  itemProp="image"
/>

{/* სათაური ნამდვილი <a href>-ია (crawler-ისთვის და კლავიატურისთვის); ბარათის
    დანარჩენ ნაწილზე დაჭერას მშობელი wrapper ამუშავებს, ამიტომ კლიკი ზემოთ არ ადის. */}
{title ? (
  <h3 title={title} itemProp="name">
    {href ? (
      <Link to={href} state={linkState} className={styles.titleLink} onClick={(e) => e.stopPropagation()}>
        {title}
      </Link>
    ) : title}
  </h3>
) : <h3>—</h3>}
        {category ? (
          <p className={styles.category}>
            {T.category}: {category}
          </p>
        ) : null}

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
              <button className={styles.addToCart} onClick={addOne} type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.cartIcon}>
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A.996.996 0 0 0 21.42 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
                <span className={styles.addToCartText}>{T.addToCart}</span>
              </button>

              <button className={styles.buyNow} onClick={buyOne}>
  <span className={styles.buyNowText}>{T.buyNow}</span>
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