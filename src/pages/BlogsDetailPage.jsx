import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styles from "./BlogsDetailPage.module.css";
import { cld, IMG, responsiveImage } from "../utils/cloudinary";
import SEO from "../components/SEO";
import NotFound from "../components/NotFound";
import { blogArticleMeta } from "../utils/catalogMeta";
import { hasEdgeJsonLd } from "../utils/edgeJsonLd";
import { readInitialData } from "../utils/initialData";
import Breadcrumbs from "../components/Breadcrumbs";

import { PUBLIC_API } from "../utils/apiBase";
const BASE = `${PUBLIC_API}/blogs`;
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

  const embeddedRef = useRef(readInitialData("blog", `/blog/${slug}`));
  const [blog, setBlog] = useState(embeddedRef.current);
const [similarBlogs, setSimilarBlogs] = useState([]);
  
  const [preview, setPreview] = useState(null);
const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
const cacheRef = useRef({});
  const [loading, setLoading] = useState(!embeddedRef.current);
  const [err, setErr] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    let alive = true;

    const fetchBlog = async () => {
      if (embeddedRef.current?.slug === slug) {
        embeddedRef.current = null;
        return;
      }
      
      try {
        setLoading(true);
        setErr("");
        setNotFound(false);

        const res = await fetch(`${BASE}/slug/${slug}`);

        if (res.status === 404) {
          if (alive) setNotFound(true);     // არარსებული სტატია (და არა ქსელის შეცდომა)
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`GET ${BASE}/slug/${slug} -> ${res.status} ${text}`);
        }

        const data = await res.json();
        if (!alive) return;

        setBlog(data);
      } catch {
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

    if (/^\/?products\/[^/?#]+$/.test(href.replace("https://artopia.ge/", ""))) {
      const slug = href.split("/products/")[1];
      const res = await fetch(
        `${PUBLIC_API}/products/full/${slug}`
      );
      const json = await res.json();
      data = { type: "product", data: json.product };
    }

    if (href.includes("/blog/")) {
      const slug = href.split("/blog/")[1];
      const res = await fetch(
        `${PUBLIC_API}/blogs/slug/${slug}`
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
  // იგივე წესი, რაც საწყის HTML-შია (edge function): JS-მდე და JS-ის შემდეგ metadata ემთხვევა
  const description = blogArticleMeta(blog, slug).description || getBlogDescription(blog);
  // BlogPosting + BreadcrumbList-ს edge function წერს; აქ ვამატებთ მხოლოდ მაშინ, როცა ის არ არის,
  // რომ გვერდზე ორი Article და ორი BreadcrumbList არ აღმოჩნდეს
  const edgeProvidesSchema = hasEdgeJsonLd(`/blog/${slug}`);
  const coverImage = getCoverImage(blog);

  const canonicalUrl =
    (slug ? `https://artopia.ge/blog/${slug}` : "https://artopia.ge/blogs");

  /* ================= SEO STRUCTURED DATA ================= */

  const articleSchema = blog && {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
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
  return <div className={styles.page} aria-busy="true" aria-label="სტატია იტვირთება">
    <div className={styles.container}><div className={styles.skeletonTitle} />
      <div className={styles.skeletonText} /><div className={styles.skeletonCover} />
      <div className={styles.skeletonText} /><div className={styles.skeletonText} />
    </div>
  </div>;
}

  if (notFound) return <NotFound what="სტატია" />;

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
      {!edgeProvidesSchema && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
          />
        </>
      )}

      <div className={styles.page}>
        <div className={styles.container}>
          <Breadcrumbs items={[{ name: "მთავარი", item: "/" }, { name: "ბლოგი", item: "/blogs" }, { name: title, item: `/blog/${slug}` }]} />
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
                    {...responsiveImage(coverImage, "article")}
                    width="1120" height="630" fetchpriority="high"
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
      className={styles.section}
    >
      {hasText && (
        <div
          className={styles.sectionText}
          dangerouslySetInnerHTML={{ __html: section.text }}
        />
      )}

      {hasImage && (
        <div className={styles.sectionImageWrap}>
          <img
            {...responsiveImage(section.image_url, "article")}
            width="1120" height="630"
            alt={stripHtml(section.text || title).slice(0, 100) || title}
            className={styles.sectionImage}
            loading="lazy"
          />
        </div>
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
  {...responsiveImage(b.cover_image || "/noimage.jpeg", "blog")}
  width="800" height="450"
  alt={b.title || "ბლოგი"}
  loading="lazy"
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
          src={cld(preview.data.image_url1, { w: IMG.CARD })}
          alt={preview.data.name || ""}
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
          src={cld(preview.data.cover_image, { w: IMG.CARD })}
          alt={preview.data.title || ""}
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
