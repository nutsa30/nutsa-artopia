import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../../components/CartContext/CartContext";
import ProductCard from "../../components/productCard/productsCard";
import styles from "./HomeNewProduct.module.css";

/** იგივე sorting logic */

export default function HomeNewProducts({ items = [], loading = false, limit = 4, titleKa, titleEn }) {

  const { addToCart } = useCart();
  const navigate = useNavigate();

const newProducts = (Array.isArray(items) ? items : []).slice(0, limit);

  const handleAddToCart = (product, qty) => addToCart(product, qty);

  const handleBuyNow = (product, qty) => {
    for (let i = 0; i < qty; i++) addToCart(product);
    navigate("/checkout");
  };

  // ✅ backend slug ვიყენებთ (არ ვაგენერირებთ ხელით)
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
            : "ახალი პროდუქტები"}
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
          {Array.from({ length: Math.min(6, limit) }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : newProducts.length === 0 ? (
        <div className={styles.empty}>
          პროდუქტები ჯერ არ არის.
        </div>
      ) : (
        <div className={styles.grid}>
          {newProducts.map((product) => (
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
