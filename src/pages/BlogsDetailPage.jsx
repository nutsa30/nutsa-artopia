import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styles from "./BlogsDetailPage.module.css";
import SEO from "../components/SEO";
import AppLoader from "../components/loaders/AppLoader";

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/blogs";
const FALLBACK_IMAGE = "/noimage.jpeg";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getBlogDescription(blog) {
  return (
    normalizeText(blog?.meta_description) ||
    normalizeText(blog?.description) ||
    ""
  );
}
function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}
function getCoverImage(blog) {
  return (
    normalizeText(blog?.og_image) ||
    normalizeText(blog?.cover_image) ||
    FALLBACK_IMAGE
  );
}

export default function BlogsDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [blog, setBlog] = useState(null);
const [similarBlogs, setSimilarBlogs] = useState([]);
  
  const [preview, setPreview] = useState(null);
const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
const cacheRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    let alive = true;

    const fetchBlog = async () => {
      
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(`${BASE}/slug/${slug}`);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`GET ${BASE}/slug/${slug} -> ${res.status} ${text}`);
        }

        const data = await res.json();
        if (!alive) return;

        setBlog(data);
      } catch (error) {
        if (!alive) return;
        setErr("ბლოგის ჩატვირთვა ვერ მოხერხდა");
        setBlog(null);
      } finally {
        if (alive) setLoading(false);
      }
    };
const fetchSimilar = async () => {
  try {
    const res = await fetch(`${BASE}/similar/${slug}`);
    const data = await res.json();

    if (!alive) return;
    setSimilarBlogs(data);
  } catch (err) {
    console.error("similar blogs error:", err);
  }
};
   fetchBlog();
fetchSimilar();

    return () => {
      alive = false;
    };
  }, [slug]);



  useEffect(() => {
const handleMouseOver = async (e) => {
  let el = e.target;

  // climb up DOM სანამ <a>-ს მივაგნებთ
  while (el && el.tagName !== "A") {
    el = el.parentElement;
  }

  if (!el) return;

  const href = el.getAttribute("href");
  if (!href) return;

  console.log("HOVER:", href); // 👈 ეს უნდა გამოჩნდეს

  const rect = el.getBoundingClientRect();
  setPreviewPos({
    x: rect.left + rect.width / 2,
    y: rect.top - 10,
  });

  if (cacheRef.current[href]) {
    setPreview(cacheRef.current[href]);
    return;
  }

  try {
    let data = null;

    if (href.includes("/products/")) {
      const slug = href.split("/products/")[1];
      const res = await fetch(
        `https://artopia-backend-2024-54872c79acdd.herokuapp.com/products/full/${slug}`
      );
      const json = await res.json();
      data = { type: "product", data: json.product };
    }

    if (href.includes("/blog/")) {
      const slug = href.split("/blog/")[1];
      const res = await fetch(
        `https://artopia-backend-2024-54872c79acdd.herokuapp.com/blogs/slug/${slug}`
      );
      const json = await res.json();
      data = { type: "blog", data: json };
    }

    if (data) {
      cacheRef.current[href] = data;
      setPreview(data);
    }
  } catch (err) {
    console.error(err);
  }
};

const handleMouseOut = (e) => {
  let el = e.target;

  while (el && el.tagName !== "A") {
    el = el.parentElement;
  }

  // თუ ლინკიდან გავედით → გააქრე
  if (!el) {
    setPreview(null);
  }
};

document.addEventListener("mouseover", handleMouseOver);
document.addEventListener("mouseout", handleMouseOut);
  return () => {
    document.removeEventListener("mouseover", handleMouseOver);
    document.removeEventListener("mouseout", handleMouseOut);
  };
}, []);

  const sections = useMemo(() => {
    return Array.isArray(blog?.sections) ? blog.sections : [];
  }, [blog]);

  const title = normalizeText(blog?.meta_title) || normalizeText(blog?.title);
  const description = getBlogDescription(blog);
  const coverImage = getCoverImage(blog);

  const canonicalUrl =
    normalizeText(blog?.canonical_url) ||
    (slug ? `https://artopia.ge/blog/${slug}` : "https://artopia.ge/blogs");

  /* ================= SEO STRUCTURED DATA ================= */

  const articleSchema = blog && {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    image: coverImage,
    author: {
      "@type": "Organization",
      name: "Artopia",
    },
    publisher: {
      "@type": "Organization",
      name: "Artopia",
      logo: {
        "@type": "ImageObject",
        url: "https://artopia.ge/logo.png",
      },
    },
    datePublished: blog.created_at,
    dateModified: blog.updated_at,
    mainEntityOfPage: canonicalUrl,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ბლოგები",
        item: "https://artopia.ge/blogs",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: canonicalUrl,
      },
    ],
  };

if (loading) {
  return <AppLoader />;
}

  if (err) {
    return (
      <div className={styles.errorWrap}>
        <div className={styles.errorBox}>
          <p>{err}</p>
          <button className={styles.errorButton} onClick={() => navigate(-1)}>
            უკან დაბრუნება
          </button>
        </div>
      </div>
    );
  }

  if (!blog) return null;

  return (
    <>
      {/* META SEO */}
      <SEO
        title={title}
        description={description}
        url={canonicalUrl}
        image={coverImage}
      />

      {/* STRUCTURED DATA */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className={styles.page}>
        <div className={styles.container}>
          <Link to="/blogs" className={styles.back}>
            ← ყველა ბლოგი
          </Link>

          <article className={styles.article}>
            <header className={styles.hero}>
              <div className={styles.heroContent}>
                <h1 className={styles.title}>{title}</h1>

                <div className={styles.metaInfo}>
                  <span>Artopia</span>
                  {blog.created_at && (
                    <span>
                      •{" "}
                      {new Date(blog.created_at).toLocaleDateString("ka-GE")}
                    </span>
                  )}
                </div>

                {description && (
                  <p className={styles.description}>{description}</p>
                )}
              </div>

              {coverImage && (
                <div className={styles.coverWrap}>
                  <img
                    src={coverImage}
                    alt={title}
                    className={styles.coverImage}
                    loading="eager"
                    decoding="async"
                  />
                </div>
              )}
            </header>

            {sections.length > 0 && (
              <section className={styles.content}>
                {sections.map((section, index) => {
                  const hasImage = normalizeText(section?.image_url);
                  const hasText = normalizeText(section?.text);

                  if (!hasImage && !hasText) return null;

                  return (
                    <div
                      key={`${section?.id || "section"}-${index}`}
                      className={`${styles.section} ${
                        index % 2 === 0
                          ? styles.sectionLeft
                          : styles.sectionRight
                      }`}
                    >
                      {hasImage && (
                        <div className={styles.sectionImageWrap}>
                          <img
                            src={section.image_url}
                            alt={hasText?.slice(0, 100) || title}
                            className={styles.sectionImage}
                            loading="lazy"
                          />
                        </div>
                      )}

{hasText && (
  <div
    className={styles.sectionText}
    dangerouslySetInnerHTML={{ __html: section.text }}
  />
)}
                    </div>
                  );
                })}
              </section>
            )}
          </article>

          {similarBlogs.length > 0 && (
  <div style={{ marginTop: "60px" }}>
    <h2 style={{ color: "white", marginBottom: "20px" }}>
      მსგავსი ბლოგები
    </h2>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "20px",
      }}
    >
      {similarBlogs.map((b) => (
        <Link
          key={b.id}
          to={`/blog/${b.slug}`}
          style={{
            textDecoration: "none",
            background: "#0f172a",
            borderRadius: "16px",
            overflow: "hidden",
            display: "block",
            transition: "0.2s",
          }}
        >
   <img
  src={b.cover_image || "/noimage.jpeg"}
  style={{
    width: "100%",
    height: "180px",
    objectFit: "contain",
    background: "#0f172a"
  }}
/>

          <div style={{ padding: "12px" }}>
            <p style={{ color: "white", fontWeight: 600 }}>
              {b.title}
            </p>

<p style={{ color: "#94a3b8", fontSize: "14px" }}>
  {stripHtml(b.excerpt)}
</p>
          </div>
        </Link>
      ))}
    </div>
  </div>
)}
          {preview && (
  <div
    style={{
      position: "fixed",
      top: previewPos.y,
      left: previewPos.x,
      transform: "translate(-50%, -100%)",
      background: "#0f172a",
      padding: "12px",
      borderRadius: "12px",
      width: "220px",
      zIndex: 9999,
      boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    }}
  >
    {preview.type === "product" && (
      <>
        <img
          src={preview.data.image_url1}
          style={{ width: "100%", borderRadius: "8px" }}
        />
        <p style={{ marginTop: "8px", color: "white" }}>
          {preview.data.name}
        </p>
      </>
    )}

    {preview.type === "blog" && (
      <>
        <img
          src={preview.data.cover_image}
          style={{ width: "100%", borderRadius: "8px" }}
        />
        <p style={{ marginTop: "8px", color: "white" }}>
          {preview.data.title}
        </p>
      </>
    )}
  </div>
)}
        </div>
      </div>
    </>
  );
}