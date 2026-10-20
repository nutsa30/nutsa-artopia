import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AlsoBuyModal.module.css";
import { cld, IMG } from "../../utils/cloudinary";

import { PUBLIC_API } from "../../utils/apiBase";
const NO_IMAGE = "/noimage.jpeg";

const getImage = (p) =>
  p?.image_url1 || p?.image_url2 || p?.image_url3 || NO_IMAGE;

export default function AlsoBuyModal({ alsoBuyIds = [], isOpen, onClose }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedKey, setLoadedKey] = useState("");
  const alsoBuyKey = alsoBuyIds.join(",");
  const visible = isOpen && !loading && loadedKey === alsoBuyKey && products.length > 0;

  useEffect(() => {
    if (!isOpen || !alsoBuyIds.length) return;

    let ignore = false;
    setLoading(true);

    fetch(`${PUBLIC_API}/products/also-buy?ids=${alsoBuyKey}`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore) {
          setProducts(Array.isArray(data) ? data.filter(item => item?.slug && Number(item.quantity)>0 && !item.manually_hidden && (!item.optimo_state || item.optimo_state==="active")) : []);
          setLoadedKey(alsoBuyKey);
        }
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
  }, [isOpen, alsoBuyKey, alsoBuyIds.length]);

  // ESC კლავიში
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onClose]);

  // body scroll lock
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  const handleProductClick = (product) => {
    if (!product?.slug) return;
    onClose();
    navigate(`/products/${product.slug}`);
  };

  if (!isOpen) return null;
  if (!alsoBuyIds.length) return null;
  if (!visible) return null;

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
                        src={cld(getImage(item), { w: IMG.CARD })}
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
