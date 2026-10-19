import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../productCard/productsCard";
import { catalogPath } from "../../utils/canonical";
import styles from "./CatalogLanding.module.css";
import { responsiveImage } from "../../utils/cloudinary";
import SubcategoryIcon from "./SubcategoryIcon";

export default function CatalogLanding({ catalog, onAddToCart, onBuyNow }) {
  if (!catalog?.main_categories?.length) return null;
  return <>
    <section className={styles.hero} aria-labelledby="catalog-categories-title">
      <div className={styles.heading}><h2 id="catalog-categories-title">პროდუქციის კატეგორიები</h2></div>
      {/* ტელეფონზე 1, ტაბლეტზე 2, დიდ ეკრანზე 3 ბარათი ხაზზე */}
      <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-2 tw:sm:gap-4 tw:lg:grid-cols-3 tw:lg:gap-5">
        {catalog.main_categories.map((main, index) => <Link key={main.id} to={catalogPath({ mainCategory: main.slug })}
          className={styles.mainCard}>
          {/* პირველი რიგი პირველივე ეკრანზე ჩანს → eager (edge პირველ ფოტოს preload-საც აკეთებს) */}
          {main.image_url ? <img {...responsiveImage(main.image_url, "category")} alt="" width="800" height="450"
            loading={index < 3 ? "eager" : "lazy"} {...(index === 0 ? { fetchpriority: "high" } : {})} decoding="async" /> :
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

const arrowClass = "tw:absolute tw:top-[38%] tw:z-10 tw:hidden tw:size-11 tw:-translate-y-1/2 tw:place-items-center "
  + "tw:rounded-full tw:border tw:border-white/20 tw:bg-slate-900/90 tw:text-white tw:shadow-lg tw:shadow-black/40 "
  + "tw:backdrop-blur tw:transition tw:duration-200 tw:cursor-pointer tw:hover:bg-sky-600 tw:hover:scale-105 "
  + "tw:focus-visible:outline-2 tw:focus-visible:outline-sky-300 tw:md:grid";

function ProductRail({ section, eagerImages, onAddToCart, onBuyNow }) {
  const rail = useRef(null);
  // რომელ მხარეს არის კიდევ გადასახვევი — კიდეზე ისარი იმალება
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });
  const updateEdges = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEdges({ atStart: el.scrollLeft <= 4, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = rail.current;
    updateEdges();
    el?.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el?.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges, section.products.length]);
  const scroll = (direction) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * 0.9, behavior: "smooth" });
  const { category } = section;

  return <section className="tw:min-w-0">
    <header className="tw:mb-4 tw:flex tw:items-center tw:justify-between tw:gap-4">
      <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-3">
        <SubcategoryIcon slug={category.slug} name={category.name} mainSlug={category.main_category_slug} />
        <h2 className="tw:m-0 tw:truncate tw:text-xl tw:font-bold tw:text-slate-50 tw:sm:text-2xl">{category.name}</h2>
      </div>
      <Link to={catalogPath({ category: category.slug })}
        className="tw:inline-flex tw:shrink-0 tw:items-center tw:gap-1.5 tw:rounded-full tw:border tw:border-sky-300/30 tw:px-3.5 tw:py-1.5 tw:text-sm tw:font-semibold tw:text-sky-200 tw:no-underline tw:transition tw:hover:bg-sky-500/15 tw:hover:text-white">
        ყველას ნახვა <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </header>
    <div className="tw:relative">
      <button type="button" onClick={() => scroll(-1)} aria-label="წინა პროდუქტები"
        className={`${arrowClass} tw:left-2 ${edges.atStart ? "tw:pointer-events-none tw:opacity-0" : "tw:opacity-100"}`}>
        <ChevronLeft size={22} aria-hidden="true" />
      </button>
      {/* ტელეფონზე ~1.4 ბარათი (თითით გადასახვევად), ტაბლეტზე 2, ლეპტოპზე 3, დიდ ეკრანზე 4 */}
      <div ref={rail}
        className="tw:flex tw:snap-x tw:snap-mandatory tw:gap-4 tw:overflow-x-auto tw:scroll-smooth tw:p-0.5 tw:pb-2 tw:lg:gap-5 tw:[scrollbar-width:none] tw:[&::-webkit-scrollbar]:hidden">
        {section.products.map((product, index) => <div key={product.id}
          className="tw:min-w-0 tw:shrink-0 tw:snap-start tw:basis-[72%] tw:sm:basis-[calc((100%_-_1rem)/2)] tw:lg:basis-[calc((100%_-_2.5rem)/3)] tw:2xl:basis-[calc((100%_-_3.75rem)/4)]">
          <ProductCard product={product} href={`/products/${product.slug}`} eager={eagerImages && index < 2}
            onAddToCart={(e, quantity) => { e.stopPropagation(); onAddToCart(product, quantity); }}
            onBuyNow={(e, quantity) => { e.stopPropagation(); onBuyNow(product, quantity); }} />
        </div>)}
      </div>
      <button type="button" onClick={() => scroll(1)} aria-label="შემდეგი პროდუქტები"
        className={`${arrowClass} tw:right-2 ${edges.atEnd ? "tw:pointer-events-none tw:opacity-0" : "tw:opacity-100"}`}>
        <ChevronRight size={22} aria-hidden="true" />
      </button>
    </div>
  </section>;
}
