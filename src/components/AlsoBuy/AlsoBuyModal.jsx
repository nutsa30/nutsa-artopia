import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AlsoBuyModal.module.css";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
const NO_IMAGE = "/noimage.jpeg";

const getImage = (p) =>
  p?.image_url1 || p?.image_url2 || p?.image_url3 || NO_IMAGE;

const getPrice = (p) => {
  const price = Number(p?.price || 0);
  const sale = Number(p?.sale || 0);
  if (sale > 0 && sale <= 100) return +(price * (1 - sale / 100)).toFixed(2);
  return +price.toFixed(2);
};

export default function AlsoBuyModal({ alsoBuyIds = [], isOpen, onClose }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !alsoBuyIds.length) return;

    let ignore = false;
    setLoading(true);

    fetch(`${API_BASE}/products/also-buy?ids=${alsoBuyIds.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore) setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!ignore) setProducts([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, alsoBuyIds.join(",")]);

  // ESC კლავიში
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleProductClick = (product) => {
    if (!product?.slug) return;
    onClose();
    navigate(`/products/${product.slug}`);
  };

  if (!isOpen) return null;
  if (!alsoBuyIds.length) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerLeft}>
</div>


            <span className={styles.headerIcon}>✦</span>
            <h2 className={styles.title}>ასევე შეიძლება მოგეწონოს</h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="დახურვა"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.body}>
          {loading ? (
            <div className={styles.loaderWrap}>
              <div className={styles.spinner} />
            </div>
          ) : products.length === 0 ? null : (
            <div
              className={styles.grid}
              style={{
                gridTemplateColumns: `repeat(${Math.min(products.length, 4)}, minmax(0, 1fr))`,
              }}
            >
              {products.map((item) => {
                const hasSale =
                  typeof item?.sale === "number" &&
                  item.sale > 0 &&
                  item.sale <= 100;
                const discounted = hasSale
                  ? (Number(item.price) * (1 - item.sale / 100)).toFixed(2)
                  : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.card}
                    onClick={() => handleProductClick(item)}
                  >
                    <div className={styles.imageWrap}>
                      {hasSale && (
                        <span className={styles.saleBadge}>-{item.sale}%</span>
                      )}
                      <img
                        src={getImage(item)}
                        alt={item.name}
                        className={styles.image}
                        loading="lazy"
                      />
                    </div>

                    <div className={styles.cardBody}>
                      <p className={styles.name}>{item.name}</p>
                      <p className={styles.category}>
                        {item.category_name || item.category || ""}
                      </p>

                      {hasSale ? (
                        <div className={styles.priceRow}>
                          <span className={styles.oldPrice}>{item.price} ₾</span>
                          <span className={styles.newPrice}>{discounted} ₾</span>
                        </div>
                      ) : (
                        <p className={styles.price}>{item.price} ₾</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
