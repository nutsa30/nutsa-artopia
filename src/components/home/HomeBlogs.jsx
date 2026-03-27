import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../../LanguageContext";
import styles from "./HomeBlogs.module.css";

/* API BASE */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

const BASE = `${API_BASE}/blogs`;

const getTS = (b) => {
  const raw = b?.updated_at || b?.created_at || b?.updatedAt || b?.createdAt || null;
  const ts = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
};

const compareBlogs = (a, b) => {
  const at = getTS(a);
  const bt = getTS(b);
  if (at !== bt) return bt - at;
  return String(a?.title || "").localeCompare(String(b?.title || ""));
};

export default function HomeBlogs({ limit = 4, titleKa, titleEn }) {
  const { lang } = useLang();
  const safeLang = lang === "en" ? "en" : "ka";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetch(`${BASE}?lang=${safeLang}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        const filtered = list
          .filter((b) => b?.is_active !== false)
          .sort(compareBlogs)
          .slice(0, limit);
        setItems(filtered);
      })
      .catch((e) => {
        console.error("HomeBlogs fetch error:", e);
        if (alive) setItems([]);
      })
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [safeLang, limit]);

  const t = (ka, en) => (safeLang === "en" ? en : ka);

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          {titleKa || titleEn ? t(titleKa || "", titleEn || "") : t("არტ ბლოგები", "Art Blogs")}
        </h2>

        <Link to="/blogs" className={styles.seeAll}>
          {t("ყველას ნახვა", "See all")}
        </Link>
      </div>

      {loading ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          {t("ბლოგები ჯერ არ არის.", "No blogs yet.")}
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((b) => {
            const id = b.id ?? b._id;
            const title = b.title || "";
            const cover = b.cover_image || b.image || null;
            const excerpt = b.excerpt || b.summary || "";

            return (
              <article
                key={id}
               
                style={{ cursor: "pointer", position: "relative" }}
                className={styles.cardLike}
              >
                {/* სურათი */}
                {cover ? (
                  <div className={styles.cardImageWrap}>
                    <img
                      src={cover}
                      alt={title}
                      className={styles.productImage}
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ) : null}

                {/* ტექსტური ნაწილი */}
                <div style={{ padding: 12 }}>
                  <h3 style={{ margin: "4px 0 6px", fontSize: 18, lineHeight: 1.25 }} className={styles.cardTitleClamp}>
                    {title}
                  </h3>
                  {excerpt ? (
                    <p className={styles.cardExcerptClamp}>
                      {excerpt}
                    </p>
                  ) : null}
                </div>

                {/* ➕ Read more ღილაკი */}
                <div className={styles.actions}>
                  <button
                    className={styles.readMoreBtn}
                    onClick={(e) => {
                      e.stopPropagation(); // რომ article onClick არ გაეშვას ორჯერ
                      navigate(`/blog/${id}`);
                    }}
                    type="button"
                  >
                    {t("წაიკითხე მეტი", "Read more")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
