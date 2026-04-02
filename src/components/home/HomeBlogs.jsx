import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./HomeBlogs.module.css";

/* API BASE */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

const BASE = `${API_BASE}/blogs`;
const FALLBACK_IMAGE = "/noimage.jpeg";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

const getTS = (b) => {
  const raw =
    b?.updated_at || b?.created_at || b?.updatedAt || b?.createdAt || null;
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetch(BASE)
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
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [limit]);

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          {titleKa || titleEn ? (titleKa || titleEn || "") : "არტ ბლოგები"}
        </h2>

   <Link to="/blogs" className={styles.seeAll}>
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
      ) : items.length === 0 ? (
        <div className={styles.empty}>ბლოგები ჯერ არ არის.</div>
      ) : (
        <div className={styles.grid}>
          {items.map((b) => {
            const id = b.id ?? b._id;
            const slug = normalizeText(b?.slug);
            const title = normalizeText(b?.title) || "უსათაურო ბლოგი";
            const cover =
              normalizeText(b?.cover_image) ||
              normalizeText(b?.image) ||
              normalizeText(b?.image_url) ||
              normalizeText(b?.image_url1) ||
              FALLBACK_IMAGE;

            const rawExcerpt =
              normalizeText(b?.description) ||
              normalizeText(b?.excerpt) ||
              normalizeText(b?.summary) ||
              "";

            const excerpt = stripHtml(rawExcerpt);

            const openBlog = () => {
              if (!slug) {
                console.warn("HomeBlogs: slug not found for blog:", b);
                return;
              }
              navigate(`/blog/${slug}`);
            };

            return (
              <article
                key={id}
                className={styles.cardLike}
                style={{ cursor: slug ? "pointer" : "default", position: "relative" }}
                onClick={openBlog}
                role="button"
                tabIndex={slug ? 0 : -1}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && slug) {
                    e.preventDefault();
                    openBlog();
                  }
                }}
                aria-label={`${title} - ბლოგის გახსნა`}
              >
                <div className={styles.cardImageWrap}>
                  <img
                    src={cover}
                    alt={title}
                    className={styles.productImage}
                    style={{ objectFit: "cover" }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div style={{ padding: 12 }}>
                  <h3
                    style={{ margin: "4px 0 6px", fontSize: 18, lineHeight: 1.25 }}
                    className={styles.cardTitleClamp}
                  >
                    {title}
                  </h3>

                  {excerpt ? (
                    <p className={styles.cardExcerptClamp}>{excerpt}</p>
                  ) : null}
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.readMoreBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      openBlog();
                    }}
                    type="button"
                  >
                    წაიკითხე მეტი
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