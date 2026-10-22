import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styles from "./BlogsPage.module.css";
import { responsiveImage } from "../utils/cloudinary";
import SEO from "../components/SEO";
import NotFound from "../components/NotFound";
import Breadcrumbs from "../components/Breadcrumbs";
import { BLOG_INDEX_META, blogCategoryMeta } from "../utils/catalogMeta";
import { kaDate } from "../features/blogV2/format";

import { PUBLIC_API } from "../utils/apiBase";
const BASE = `${PUBLIC_API}/blogs`;
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
function getCardDescription(blog) {
  return (
    normalizeText(blog?.description) ||
    normalizeText(blog?.excerpt) ||
    ""
  );
}

function getCardImage(blog) {
  return normalizeText(blog?.cover_image) || FALLBACK_IMAGE;
}

// ბლოგის სია (/blogs) და კატეგორიის გვერდი (/blogs/category/<key>). კატეგორიების სია და შესავალი ტექსტი
// backend-იდან მოდის (/blogs/categories); ცარიელი კატეგორია noindex-ია (edge-იც იგივეს წერს), არარსებული 404.
export default function BlogsPage() {
  const { category } = useParams();

  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let alive = true;
    setSearchTerm("");

    const fetchBlogs = async () => {
      try {
        setLoading(true);
        setError("");

        const [res, cats] = await Promise.all([
          fetch(category ? `${BASE}?category=${encodeURIComponent(category)}` : BASE),
          fetch(`${BASE}/categories`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ]);
        if (!alive) return;
        setCategories(Array.isArray(cats) ? cats : []);
        if (res.status === 404) {
          setBlogs([]);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch blogs");

        const data = await res.json();
        if (!alive) return;

        const normalized = Array.isArray(data) ? data : [];
        setBlogs(normalized);
      } catch {
        if (!alive) return;
        setError("ბლოგების ჩატვირთვა ვერ მოხერხდა");
        setBlogs([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchBlogs();

    return () => {
      alive = false;
    };
  }, [category]);

  const current = category ? categories.find((c) => c.key === category) : null;
  // იგივე ტექსტი, რაც საწყის HTML-შია (edge function) — Google-მა JS-მდე და JS-ის შემდეგ ერთი და იგივე ნახოს
  const meta = category ? blogCategoryMeta(current || { key: category }) : BLOG_INDEX_META;

  const visibleBlogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return blogs
      .filter((b) => b?.is_active !== false)
      .filter((b) => {
        if (!q) return true;

        const title = normalizeText(b?.title).toLowerCase();
        const description = getCardDescription(b).toLowerCase();

        return title.includes(q) || description.includes(q);
      });
  }, [blogs, searchTerm]);

  if (category && !loading && categories.length > 0 && !current) return <NotFound what="კატეგორია" />;

  /* ======== ITEM LIST SCHEMA ======== */

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: visibleBlogs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.title,
      url: `https://artopia.ge/blog/${b.slug}`,
    })),
  };

  // მხოლოდ ის კატეგორია ჩანს ნავიგაციაში, რომელშიც სტატიაა (ცარიელს მკითხველი ვერ იყენებს)
  const navCategories = categories.filter((c) => c.count > 0 || c.key === category);
  const featured = !category && !searchTerm.trim() && visibleBlogs.length > 2 ? visibleBlogs[0] : null;
  const gridBlogs = featured ? visibleBlogs.slice(1) : visibleBlogs;

  const card = (blog, index, isFeatured = false) => {
    const image = getCardImage(blog);
    const description = stripHtml(getCardDescription(blog));
    return (
      <Link
        key={blog.id}
        className={`${styles.card} ${isFeatured ? styles.featured : ""}`}
        to={`/blog/${blog.slug}`}
        style={{ textDecoration: "none", color: "inherit" }}
        aria-label={`${blog.title} - ბლოგის გახსნა`}
      >
        <div className={styles.imageWrap}>
          <img
            {...responsiveImage(image, isFeatured ? "article" : "blog")}
            alt={blog.title || "ბლოგის ქავერი"}
            className={styles.image}
            loading={index < 2 ? "eager" : "lazy"}
            {...(index === 0 ? { fetchpriority: "high" } : {})}
            decoding="async"
          />
        </div>

        <div className={styles.cardBody}>
          {(blog.category_name || blog.created_at) && (
            <div className={styles.cardMeta}>
              {blog.category_name && <span className={styles.cardCategory}>{blog.category_name}</span>}
              {blog.created_at && <span className={styles.cardDate}>{kaDate(blog.created_at)}</span>}
            </div>
          )}
          <h2 className={styles.cardTitle}>
            {blog.title || "უსათაურო ბლოგი"}
          </h2>

          {description ? (
            <p className={styles.cardDescription}>
              {description}
            </p>
          ) : (
            <p className={styles.cardDescriptionMuted}>
              აღწერა არ არის დამატებული.
            </p>
          )}

          <div className={styles.cardFooter}>
            <span className={styles.readMore}>
              წაიკითხე სრულად
            </span>
            <span className={styles.arrow}>→</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <>
      <SEO
        title={meta.title}
        description={meta.description}
        url={meta.url}
        noIndex={Boolean(category && current && current.count === 0)}
        noIndexFollow
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />

      <div className={styles.page}>
        <div className={styles.container}>
          {category && (
            <Breadcrumbs items={[{ name: "მთავარი", item: "/" }, { name: "ბლოგი", item: "/blogs" },
              { name: current?.name || "", item: `/blogs/category/${category}` }]} />
          )}
          <header className={styles.hero}>
            <div className={styles.heroInner}>
              <span className={styles.kicker}>ARTOPIA BLOG</span>
              <h1 className={styles.heading}>{category ? (current?.title || current?.name || "") : "ბლოგი"}</h1>
              <p className={styles.subheading}>
                {category ? current?.intro : "იდეები, რჩევები და შთაგონება — ყველაფერი ერთ სივრცეში."}
              </p>

              <div className={styles.searchWrap}>
                <input
                  type="text"
                  placeholder="მოძებნე სტატია..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.search}
                  aria-label="ბლოგის ძებნა"
                />
              </div>

              {navCategories.length > 0 && (
                <nav className={styles.categoryNav} aria-label="ბლოგის კატეგორიები">
                  <Link to="/blogs" className={`${styles.chip} ${!category ? styles.chipActive : ""}`}
                    aria-current={!category ? "page" : undefined}>ყველა</Link>
                  {navCategories.map((c) => (
                    <Link key={c.key} to={`/blogs/category/${c.key}`}
                      className={`${styles.chip} ${c.key === category ? styles.chipActive : ""}`}
                      aria-current={c.key === category ? "page" : undefined}>
                      {c.name}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
          </header>

{loading && <div className={styles.grid} aria-busy="true" aria-label="ბლოგები იტვირთება">
  {Array.from({ length: 6 }, (_, i) => <div key={i} className={styles.skeletonCard} />)}
</div>}
          {!loading && error && <div className={styles.error}>{error}</div>}

          {!loading && !error && (
            <>
              {featured && <section className={styles.featuredWrap}>{card(featured, 0, true)}</section>}
              {gridBlogs.length > 0 ? (
                <section className={styles.grid}>
                  {gridBlogs.map((blog, index) => card(blog, featured ? index + 1 : index))}
                </section>
              ) : !featured && (
                <div className={styles.empty}>
                  {category && !searchTerm.trim() ? (
                    <>
                      <h3>ამ კატეგორიაში სტატიები მალე დაემატება</h3>
                      <p><Link to="/blogs" className={styles.emptyLink}>ნახე ყველა სტატია</Link></p>
                    </>
                  ) : (
                    <>
                      <h3>შედეგი ვერ მოიძებნა</h3>
                      <p>სცადე სხვა საძიებო სიტყვა ან მოგვიანებით დაბრუნდი.</p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
