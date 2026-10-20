import React from "react";
import { Link } from "react-router-dom";
import styles from "./HomeBlogs.module.css";
import { responsiveImage } from "../../utils/cloudinary";

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

export default function HomeBlogs({ items = [], loading = false, limit = 4, titleKa, titleEn }) {
  const visibleItems = (Array.isArray(items) ? items : [])
    .filter((blog) => blog?.is_active !== false).sort(compareBlogs).slice(0, limit);

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
      ) : visibleItems.length === 0 ? (
        <div className={styles.empty}>ბლოგები ჯერ არ არის.</div>
      ) : (
        <div className={styles.grid}>
          {visibleItems.map((b) => {
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

            return (
              <Link
                key={id}
                className={styles.cardLike}
                style={{ position: "relative", textDecoration: "none", color: "inherit" }}
                to={slug ? `/blog/${slug}` : "/blogs"}
              >
                <div className={styles.cardImageWrap}>
                  <img
                    {...responsiveImage(cover, "blog")}
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
                  <span
                    className={styles.readMoreBtn}
                  >
                    წაიკითხე მეტი
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
