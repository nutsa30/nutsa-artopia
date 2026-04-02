import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../CartContext/CartContext";
import ProductCard from "../productCard/productsCard";
import styles from "./HomeSaleProducts.module.css";

/* API BASE — იგივე ლოგიკა, რაც სხვაგან გაქვს */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

export default function HomeSaleProducts({ limit = 4, titleKa, titleEn }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    setLoading(true);

fetch(`${API_BASE}/products/sale`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error("HomeSaleProducts fetch error:", e);
        if (alive) setItems([]);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

const saleProducts = items.slice(0, limit);

  const handleAddToCart = (product, qty) => addToCart(product, qty);

  const handleBuyNow = (product, qty) => {
    for (let i = 0; i < qty; i++) addToCart(product);
    navigate("/checkout");
  };

  // backend-დან მოსული slug გამოვიყენოთ
  const openProductByUrl = (product) => {
    const slug = product?.slug;
    if (!slug) return;
    navigate(`/products/${slug}`);
  };

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          {titleKa || titleEn
            ? (titleKa || titleEn || "")
            : "ფასდაკლებები"}
        </h2>
  <Link to="/products" className={styles.seeAll}>
  <span className={styles.circle1}></span>
  <span className={styles.circle2}></span>
  <span className={styles.circle3}></span>
  <span className={styles.circle4}></span>
  <span className={styles.circle5}></span>
  <span className={styles.text}>ყველას ნახვა</span>
</Link>
      </div>

      {loading ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : saleProducts.length === 0 ? (
        <div className={styles.empty}>
          ფასდაკლებული პროდუქტი არ არის.
        </div>
      ) : (
        <div className={styles.grid}>
          {saleProducts.map((product) => (
            <div
              key={product._id || product.id}
              onClick={() => openProductByUrl(product)}
              style={{ position: "relative" }}
            >
              <ProductCard
                product={product}
                onAddToCart={(e, quantity) => {
                  e.stopPropagation();
                  handleAddToCart(product, quantity);
                }}
                onBuyNow={(e, quantity) => {
                  e.stopPropagation();
                  handleBuyNow(product, quantity);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}