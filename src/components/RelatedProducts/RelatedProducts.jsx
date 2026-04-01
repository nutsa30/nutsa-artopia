import React, { useEffect, useMemo, useState } from "react";
import styles from "./RelatedProducts.module.css";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

const LBL = {
  title: "მსგავსი პროდუქტები",
  prev: "წინა",
  next: "შემდეგი",
  empty: "მსგავსი პროდუქტები ვერ მოიძებნა.",
};


const getDisplayImage = (product) => {
  return (
    product?.image_url1 ||
    product?.image_url2 ||
    product?.image_url3 ||
    product?.image_url4 ||
    product?.image_url5 ||
    product?.image_url6 ||
    "/noimage.jpeg"
  );
};



const getPrice = (product) => {
  const price = Number(product?.price || 0);
  const sale = Number(product?.sale || 0);

  if (sale > 0 && sale <= 100) {
    return +(price * (1 - sale / 100)).toFixed(2);
  }

  return +price.toFixed(2);
};

const getVisibleCount = () => {
  if (typeof window === "undefined") return 5;
  if (window.innerWidth <= 520) return 2;
  if (window.innerWidth <= 900) return 3;
  if (window.innerWidth <= 1200) return 4;
  return 5;
};

export default function RelatedProducts({ currentProduct, onProductClick }) {
  const T = LBL;

  const [products, setProducts] = useState([]);
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(getVisibleCount());

useEffect(() => {
  let ignore = false;

  const loadProducts = async () => {
    try {
      if (!currentProduct?.category_id || !currentProduct?.id) return;

      const res = await fetch(
        `${API_BASE}/products/related/${currentProduct.category_id}/${currentProduct.id}`
      );

      if (!res.ok) return;

      const data = await res.json();

      if (!ignore) {
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch {
      if (!ignore) setProducts([]);
    }
  };

  loadProducts();

  return () => {
    ignore = true;
  };
}, [currentProduct]);

  useEffect(() => {
    const onResize = () => {
      setVisibleCount(getVisibleCount());
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
const relatedProducts = products;

  useEffect(() => {
    setStartIndex(0);
  }, [currentProduct?.id, visibleCount]);

  const maxStart = Math.max(0, relatedProducts.length - visibleCount);
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex < maxStart;

  const visibleItems = relatedProducts.slice(
    startIndex,
    startIndex + visibleCount
  );

  if (!relatedProducts.length) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>{T.title}</h3>

        <div className={styles.nav}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => setStartIndex((prev) => Math.max(0, prev - 1))}
            disabled={!canGoPrev}
            aria-label={T.prev}
            title={T.prev}
          >
            ‹
          </button>

          <button
            type="button"
            className={styles.arrow}
            onClick={() => setStartIndex((prev) => Math.min(maxStart, prev + 1))}
            disabled={!canGoNext}
            aria-label={T.next}
            title={T.next}
          >
            ›
          </button>
        </div>
      </div>

      <div
        className={styles.track}
        style={{
          gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))`,
        }}
      >
        {visibleItems.map((item) => {
          const price = getPrice(item);

          return (
            <button
              key={item.id}
              type="button"
              className={styles.card}
              onClick={() => onProductClick?.(item)}
              title={item?.name || ""}
            >
              <div className={styles.imageWrap}>
                <img
                  src={getDisplayImage(item)}
                  alt={item?.name || ""}
                  className={styles.image}
                />
              </div>

              <div className={styles.name}>{item?.name}</div>
              <div className={styles.price}>{price.toFixed(2)} ₾</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}