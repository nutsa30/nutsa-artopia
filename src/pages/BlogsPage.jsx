import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./BlogsPage.module.css";
import SEO from "../components/SEO";
import AppLoader from "../components/loaders/AppLoader";

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/blogs";
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

export default function BlogsPage() {
  const navigate = useNavigate();

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const pageTitle = "ბლოგი – სტატიები და სიახლეები | Artopia";
  const pageDescription =
    "აღმოაჩინე Artopia-ს ბლოგი — იდეები, რჩევები, შთაგონება და პრაქტიკული სტატიები ხელოვნების, შემოქმედებისა და სასკოლო მასალების შესახებ.";
  const pageUrl = "https://artopia.ge/blogs";

  useEffect(() => {
    let alive = true;

    const fetchBlogs = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(BASE);
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
  }, []);

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

  return (
    <>
      <SEO title={pageTitle} description={pageDescription} url={pageUrl} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />

      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.hero}>
            <div className={styles.heroInner}>
              <span className={styles.kicker}>ARTOPIA BLOG</span>
              <h1 className={styles.heading}>ბლოგი</h1>
              <p className={styles.subheading}>
                იდეები, რჩევები და შთაგონება — ყველაფერი ერთ სივრცეში.
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
            </div>
          </header>

{loading && <AppLoader />}
          {!loading && error && <div className={styles.error}>{error}</div>}

          {!loading && !error && (
            <>
              {visibleBlogs.length > 0 ? (
                <section className={styles.grid}>
                  {visibleBlogs.map((blog) => {
                    const image = getCardImage(blog);
const rawDescription = getCardDescription(blog);
const description = stripHtml(rawDescription);
                    return (
                      <article
                        key={blog.id}
                        className={styles.card}
                        onClick={() => {
                          if (!blog.slug) return;
                          navigate(`/blog/${blog.slug}`);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            navigate(`/blog/${blog.slug}`);
                          }
                        }}
                        aria-label={`${blog.title} - ბლოგის გახსნა`}
                      >
                        <div className={styles.imageWrap}>
                          <img
                            src={image}
                            alt={blog.title || "ბლოგის ქავერი"}
                            className={styles.image}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>

                        <div className={styles.cardBody}>
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
                      </article>
                    );
                  })}
                </section>
              ) : (
                <div className={styles.empty}>
                  <h3>შედეგი ვერ მოიძებნა</h3>
                  <p>სცადე სხვა საძიებო სიტყვა ან მოგვიანებით დაბრუნდი.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}