import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../productCard/productsCard";
import { catalogPath } from "../../utils/canonical";
import styles from "./CatalogLanding.module.css";
import { responsiveImage } from "../../utils/cloudinary";

export default function CatalogLanding({ catalog, onAddToCart, onBuyNow }) {
  if (!catalog?.main_categories?.length) return null;
  return <>
    <section className={styles.hero} aria-labelledby="catalog-categories-title">
      <div className={styles.heading}><h2 id="catalog-categories-title">პროდუქციის კატეგორიები</h2></div>
      <div className={styles.mainGrid}>
        {catalog.main_categories.map((main, index) => <Link key={main.id} to={catalogPath({ mainCategory: main.slug })}
          className={styles.mainCard}>
          {/* პირველი ორი ბარათი პირველივე ეკრანზე ჩანს → eager (edge ამ ფოტოს preload-საც აკეთებს) */}
          {main.image_url ? <img {...responsiveImage(main.image_url, "category")} alt="" width="800" height="450"
            loading={index < 2 ? "eager" : "lazy"} {...(index === 0 ? { fetchpriority: "high" } : {})} decoding="async" /> :
            <div className={styles.placeholder}><ImageIcon size={38} aria-hidden="true" /></div>}
          <span className={styles.overlay} />
          <span className={styles.mainText}><strong>{main.name}</strong><small>{main.product_count} პროდუქტი · {main.subcategories.length} ქვეკატეგორია</small></span>
        </Link>)}
      </div>
    </section>
    <div className={styles.featured}>
      {catalog.featured_sections?.map((section, index) => <ProductRail key={section.category.id} section={section}
        eagerImages={index === 0} onAddToCart={onAddToCart} onBuyNow={onBuyNow} />)}
    </div>
  </>;
}

function ProductRail({ section, eagerImages, onAddToCart, onBuyNow }) {
  const rail = useRef(null);
  const scroll = (direction) => rail.current?.scrollBy({ left: direction * Math.min(900, rail.current.clientWidth * .85), behavior: "smooth" });
  return <section className={styles.railSection}>
    <header><div><span>{section.category.icon || "✦"}</span><h2>{section.category.name}</h2></div>
      <Link to={catalogPath({ category: section.category.slug })}>ყველას ნახვა →</Link></header>
    <div className={styles.railShell}>
      <button type="button" className={`${styles.arrow} ${styles.left}`} onClick={() => scroll(-1)} aria-label="წინა პროდუქტები"><ChevronLeft /></button>
      <div className={styles.rail} ref={rail}>
        {section.products.map((product, index) => <div className={styles.product} key={product.id}>
          <ProductCard product={product} href={`/products/${product.slug}`} eager={eagerImages && index < 2}
            onAddToCart={(e, quantity) => { e.stopPropagation(); onAddToCart(product, quantity); }}
            onBuyNow={(e, quantity) => { e.stopPropagation(); onBuyNow(product, quantity); }} />
        </div>)}
      </div>
      <button type="button" className={`${styles.arrow} ${styles.right}`} onClick={() => scroll(1)} aria-label="შემდეგი პროდუქტები"><ChevronRight /></button>
    </div>
  </section>;
}
