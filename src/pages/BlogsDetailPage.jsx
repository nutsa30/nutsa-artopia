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

    (async () => {
      try {
        const res = await fetch(`${BASE}/${id}`);
        const data = await res.json();

        if (!res.ok) throw new Error();

        if (alive) setBlog(data);
      } catch {
        if (alive) setErr("ბლოგის ჩატვირთვა ვერ მოხერხდა");
      } finally {
        alive && setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [id]);

  if (loading) return <div className={styles.loader}>იტვირთება...</div>;

  if (err)
    return (
      <div className={styles.errorBox}>
        {err}
        <button onClick={() => navigate(-1)}>უკან</button>
      </div>
    );

  if (!blog) return null;

  const sections = blog.sections || [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/blog" className={styles.back}>
          ← ყველა ბლოგი
        </Link>

        <h1 className={styles.title}>{blog.title}</h1>

        {blog.cover_image && (
          <div className={styles.cover}>
            <img src={blog.cover_image} alt={blog.title} />
          </div>
        )}

        <div className={styles.content}>
          {sections.map((s, i) => (
            <div
              key={i}
              className={`${styles.section} ${
                i % 2 === 0 ? styles.left : styles.right
              }`}
            >
              {s.image_url && (
                <div className={styles.image}>
                  <img src={s.image_url} alt="" />
                </div>
              )}

              {s.text && (
                <div className={styles.text}>
                  {s.text.split("\n").map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}