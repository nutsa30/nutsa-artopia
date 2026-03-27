import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLang } from "../../LanguageContext";
import { useCart } from "../../components/CartContext/CartContext";
import ProductCard from "../../components/productCard/productsCard";
import styles from "./HomeNewProduct.module.css";

/* API BASE – ზუსტად ისე, როგორც ProductsPage-ში გაქვს */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

/** მცირე ჰელპერები – იგივე ლოგიკა რაც ProductsPage-შია */
const hasSale = (p) =>
  typeof p?.sale === "number" && p.sale > 0 && p.sale <= 100;

const getTS = (p) => {
  const raw = p?.discountUpdatedAt || p?.updatedAt || p?.createdAt || null;
  const ts = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
};

const compareProducts = (a, b) => {
  const aSale = hasSale(a) ? 1 : 0;
  const bSale = hasSale(b) ? 1 : 0;
  if (aSale !== bSale) return bSale - aSale;

  const aNew = a?.is_new ? 1 : 0;
  const bNew = b?.is_new ? 1 : 0;
  if (aNew !== bNew) return bNew - aNew;

  if (aSale && bSale) {
    const aPct = a.sale;
    const bPct = b.sale;
    if (aPct !== bPct) return bPct - aPct;
  }

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

export default function HomeNewProducts({ limit = 4, titleKa, titleEn }) {
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
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error("HomeNewProducts fetch error:", e);
        if (alive) setItems([]);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [safeLang]);

  const newProducts = useMemo(() => {
    const list = [...items].sort(compareProducts);
    const flagged = list.filter((p) => p.is_new);
    if (flagged.length >= limit) return flagged.slice(0, limit);
    const rest = list.filter((p) => !p.is_new);
    return [...flagged, ...rest].slice(0, limit);
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
            : t("ახალი პროდუქტები", "New products")}
        </h2>

        <Link to="/products" className={styles.seeAll}>
          {t("ყველას ნახვა", "See all")}
        </Link>
      </div>

      {loading ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: Math.min(6, limit) }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : newProducts.length === 0 ? (
        <div className={styles.empty}>{t("პროდუქტები ჯერ არ არის.", "No products yet.")}</div>
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
