import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../../LanguageContext";
import { useCart } from "../CartContext/CartContext";
import ProductCard from "../productCard/productsCard";
import styles from "./HomeSaleProducts.module.css";

/* API BASE — იგივე ლოგიკა, რაც სხვაგან გაქვს */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

const hasSale = (p) =>
  typeof p?.sale === "number" && p.sale > 0 && p.sale <= 100;

const getTS = (p) => {
  const raw = p?.discountUpdatedAt || p?.updatedAt || p?.createdAt || null;
  const ts = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
};

const compareSale = (a, b) => {
  const aPct = hasSale(a) ? a.sale : 0;
  const bPct = hasSale(b) ? b.sale : 0;
  if (aPct !== bPct) return bPct - aPct;

  const aTS = getTS(a);
  const bTS = getTS(b);
  if (aTS !== bTS) return bTS - aTS;

  return String(a?.name || "").localeCompare(String(b?.name || ""));
};

const slugify = (text = "") =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9ა-ჰ]+/gi, "-")
    .replace(/^-+|-+$/g, "");

export default function HomeSaleProducts({ limit = 4, titleKa, titleEn }) {
  const { lang } = useLang();
  const safeLang = lang === "en" ? "en" : "ka";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetch(`${API_BASE}/products?lang=${safeLang}`)
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
  }, [safeLang]);

  const saleProducts = useMemo(() => {
    const sale = items.filter(hasSale).sort(compareSale);
    return sale.slice(0, limit);
  }, [items, limit]);

  const t = (ka, en) => (safeLang === "en" ? en : ka);

  const handleAddToCart = (product, qty) => addToCart(product, qty);
  const handleBuyNow = (product, qty) => {
    for (let i = 0; i < qty; i++) addToCart(product);
    navigate("/checkout");
  };

  // ✅ home-დანაც slug URL-ზე გადავიდეთ
  const openProductByUrl = (product) => {
    const slug = slugify(product?.name);
    navigate(`/products/${slug}`);
  };

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          {titleKa || titleEn
            ? t(titleKa || "", titleEn || "")
            : t("ფასდაკლებები", "Discounts")}
        </h2>
        <Link to="/products" className={styles.seeAll}>
          {t("ყველას ნახვა", "See all")}
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
          {t("ფასდაკლებული პროდუქტი არ არის.", "No discounted products.")}
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
