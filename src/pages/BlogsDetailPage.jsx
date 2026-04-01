import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import styles from "./BlogsDetailPage.module.css";

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/blogs";

export default function BlogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");

    (async () => {
      try {
        const res = await fetch(`${BASE}/${id}`);
        const text = await res.text();
        let data = null;
        try {
          data = JSON.parse(text);
        } catch {}

        if (!res.ok) {
          throw new Error(
            (data && (data.message || data.error)) ||
              `HTTP ${res.status} ${res.statusText}`
          );
        }

        if (!alive) return;
        setBlog(data || {});
      } catch (e) {
        if (!alive) return;
        setErr("ბლოგის ჩატვირთვა ვერ მოხერხდა.");
        console.error("Blog detail fetch error:", e);
      } finally {
        alive && setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className={styles.blogDetailContainer}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonCover} />
        <div className={styles.skeletonPara} />
        <div className={styles.skeletonPara} />
      </div>
    );
  }

  if (err) {
    return (
      <div className={styles.blogDetailContainer}>
        <div className={styles.error}>{err}</div>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          უკან დაბრუნება
        </button>
      </div>
    );
  }

  if (!blog) return null;

  // ----------------------- Normalizers -----------------------

  const normalizeFromBlocks = (obj) => {
    if (!Array.isArray(obj?.blocks)) return null;
    const grouped = {};
    for (const b of obj.blocks) {
      const pos = Number(b?.position ?? 1);
      if (!grouped[pos]) grouped[pos] = {};
      if (b?.kind === "text") grouped[pos].text = b?.text ?? "";
      if (b?.kind === "image")
        grouped[pos].image_url = b?.image_url ?? b?.image ?? null;
    }
    return Object.keys(grouped)
      .map((i) => Number(i))
      .sort((a, b) => a - b)
      .map((i) => ({
        position: i,
        text: grouped[i].text ?? "",
        image_url: grouped[i].image_url ?? null,
      }));
  };

  const normalizeFromSections = (obj) => {
    if (!Array.isArray(obj?.sections)) return null;
    return obj.sections.map((s, idx) => ({
      position: idx + 1,
      text: s?.text ?? "",
      image_url: s?.image_url ?? s?.image ?? null,
    }));
  };

  const normalizeFromFlat = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    const rows = {};
    const add = (idx, key, val) => {
      const i = Number(idx);
      if (!rows[i]) rows[i] = {};
      rows[i][key] = val;
    };

    const entries = Object.entries(obj);

    const reText = /^text_(\d+)$/i;
    const reImg = /^(?:image_url|image|photo)_(\d+)$/i;

    for (const [k, v] of entries) {
      let m = k.match(reText);
      if (m) {
        add(m[1], "text", v ?? "");
        continue;
      }
      m = k.match(reImg);
      if (m) {
        add(m[1], "image_url", v ?? null);
      }
    }

    const out = Object.keys(rows)
      .map((i) => Number(i))
      .sort((a, b) => a - b)
      .map((i) => ({
        position: i,
        text: rows[i].text ?? "",
        image_url: rows[i].image_url ?? null,
      }));

    return out.length ? out : null;
  };

  // ----------------------- Extract fields -----------------------

  const title = blog.title || blog.name || "";

  const coverExplicit = blog.cover_image || blog.image || null;

  const sectionsFromBlocks = normalizeFromBlocks(blog);
  const sectionsFromSections = normalizeFromSections(blog);
  const sectionsFromFlat = normalizeFromFlat(blog);

  const sections =
    sectionsFromBlocks || sectionsFromSections || sectionsFromFlat || [];

  const cover =
    coverExplicit ||
    (sections.length && sections[0].image_url ? sections[0].image_url : null);

  return (
    <div className={styles.blogDetailContainer}>
      {/* breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/blogs" className={styles.breadcrumbLink}>
          ← ყველა ბლოგი
        </Link>
      </div>

      {/* სათაური */}
      {title ? <h1 className={styles.title}>{title}</h1> : null}

      {/* ქავერი */}
      {cover && (
        <div className={styles.coverWrap}>
          <img src={cover} alt={title} className={styles.cover} />
        </div>
      )}

      {/* სექციები */}
      {sections.length > 0 ? (
        <div className={styles.sections}>
          {sections.map((s, i) => (
            <section key={i} className={styles.section}>
              {s.image_url && (
                <div className={styles.sectionImageWrap}>
                  <img
                    src={s.image_url}
                    alt={title || `section-${i + 1}`}
                    className={styles.sectionImage}
                  />
                </div>
              )}

              {s.text && (
                <div className={styles.sectionBody}>
                  {String(s.text)
                    .split(/\n{2,}/)
                    .map((p, j) => (
                      <p key={j}>{p}</p>
                    ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.content}>
          {blog.content_html ? (
            <div dangerouslySetInnerHTML={{ __html: blog.content_html }} />
          ) : blog.content || blog.text ? (
            String(blog.content || blog.text)
              .split(/\n{2,}/)
              .map((p, i) => <p key={i}>{p}</p>)
          ) : null}
        </div>
      )}
    </div>
  );
}