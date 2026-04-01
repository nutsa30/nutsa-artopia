import React, { useState, useEffect } from "react";
import styles from "./BlogsPage.module.css";
import { useNavigate } from "react-router-dom";
import SEO from "../components/SEO";

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/blogs";

const BlogPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const pageTitle = "ბლოგი – სტატიები და სიახლეები";
  const pageDescription =
    "სტატიები და რჩევები Artopia-სგან — სამხატვრო მასალები, სასკოლო პროდუქტები და მეტი.";
  const pageUrl = "https://artopia.ge/blog";

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch(BASE);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setBlogs(Array.isArray(data) ? data : []);
      } catch {
        setError("ბლოგების ჩატვირთვა ვერ მოხერხდა");
      }
    };

    fetchBlogs();
  }, []);

  const filteredBlogs = blogs.filter((b) =>
    (b.title || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <SEO title={pageTitle} description={pageDescription} url={pageUrl} />

      <div className={styles.page}>
        <div className={styles.container}>
          {/* HEADER */}
          <div className={styles.header}>
            <h1>ბლოგი</h1>
            <p>იდეები, რჩევები და სიახლეები Artopia-სგან</p>

            <input
              type="text"
              placeholder="მოძებნე სტატია..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.search}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {/* GRID */}
          <div className={styles.grid}>
            {filteredBlogs.map((b) => (
              <div
                key={b.id}
                className={styles.card}
                onClick={() => navigate(`/blog/${b.id}`)}
              >
                {b.cover_image && (
                  <div className={styles.imageWrap}>
                    <img src={b.cover_image} alt={b.title} />
                  </div>
                )}

                <div className={styles.content}>
                  <h3>{b.title}</h3>

                  {b.excerpt && <p>{b.excerpt}</p>}

                  <div className={styles.footer}>
                    <span>წაიკითხე სრულად</span>
                    <span className={styles.arrow}>→</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBlogs.length === 0 && (
            <div className={styles.empty}>
              ვერ მოიძებნა შედეგი
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BlogPage;