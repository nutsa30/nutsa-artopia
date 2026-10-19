import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../CartContext/CartContext";
import ProductCard from "../productCard/productsCard";
import styles from "./HomeSaleProducts.module.css";

export default function HomeSaleProducts({ items = [], loading = false, limit = 4, titleKa, titleEn }) {

  const { addToCart } = useCart();
  const navigate = useNavigate();

const saleProducts = (Array.isArray(items) ? items : []).slice(0, limit);

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
                href={product?.slug ? `/products/${product.slug}` : null}
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
