// src/pages/BlogDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import styles from "./BlogsDetailPage.module.css";
import { useLang } from "../LanguageContext";

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/blogs";

/**
 * დეტალური ბლოგის გვერდი:
 * - ითხოვს ენას ?lang=${lang}
 * - აჩვენებს სათაურს
 * - აჯამებს ყველა სექციას სწორი მიმდევრობით:
 *    * blocks [{kind:"image"|"text", image_url?, text?, position}]
 *    * sections [{text, image_url}]
 *    * ან ბრტყელ ველებს: text_ka_1 / image_url_ka_1 / ... (ან EN)
 * - თითო სექციაში გამოაქვს ჯერ სურათი, მერე ტექსტი (თუ ორივე არსებობს).
 */
export default function BlogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang(); // "ka" | "en"

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
        const res = await fetch(`${BASE}/${id}?lang=${lang}`);
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
        setErr(
          lang === "en" ? "Failed to load blog." : "ბლოგის ჩატვირთვა ვერ მოხერხდა."
        );
        console.error("Blog detail fetch error:", e);
      } finally {
        alive && setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, lang]);

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
          {lang === "en" ? "Go back" : "უკან დაბრუნება"}
        </button>
      </div>
    );
  }

  if (!blog) return null;

  // ----------------------- Normalizers -----------------------
  // blocks -> [{ position, text?, image_url? }]
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

  // sections -> same shape
  const normalizeFromSections = (obj) => {
    if (!Array.isArray(obj?.sections)) return null;
    return obj.sections.map((s, idx) => ({
      position: idx + 1,
      text: s?.text ?? "",
      image_url: s?.image_url ?? s?.image ?? null,
    }));
  };

  // flat fields like text_ka_1, image_url_ka_1, etc.
  const normalizeFromFlat = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    const rows = {};
    const add = (idx, key, val) => {
      const i = Number(idx);
      if (!rows[i]) rows[i] = {};
      rows[i][key] = val;
    };
    const entries = Object.entries(obj);

    const reText = new RegExp(`^text(?:_${lang})?_(\\d+)$`, "i");
    const reImg = new RegExp(
      `^(?:image_url|image|photo)(?:_${lang})?_(\\d+)$`,
      "i"
    );
    const reSecText = new RegExp(`^section(\\d+)_text(?:_${lang})?$`, "i");
    const reSecImg = new RegExp(`^section(\\d+)_image(?:_${lang})?$`, "i");

    for (const [k, v] of entries) {
      let m = k.match(reText);
      if (m) {
        add(m[1], "text", v ?? "");
        continue;
      }
      m = k.match(reImg);
      if (m) {
        add(m[1], "image_url", v ?? null);
        continue;
      }
      m = k.match(reSecText);
      if (m) {
        add(m[1], "text", v ?? "");
        continue;
      }
      m = k.match(reSecImg);
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

  // Cover: თუ ბექი ცალკე არ აგზავნის, ვცადოთ პირველი სექციის სურათი
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
          {lang === "en" ? "← All blogs" : "← ყველა ბლოგი"}
        </Link>
      </div>

      {/* სათაური */}
      {title ? <h1 className={styles.title}>{title}</h1> : null}

      {/* ქავერი */}
      {cover && (
        <div className={styles.coverWrap}>
        </div>
      )}

      {/* ყველა სექცია — თანმიმდევრობით */}
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
              {!s.text && !s.image_url ? null : null}
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.content}>
          {/* fallback თუ სექციები არ მოივიდა */}
          {blog.content_html ? (
            <div
              dangerouslySetInnerHTML={{ __html: blog.content_html }}
            />
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
