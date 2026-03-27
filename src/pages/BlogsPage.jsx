import React, { useState, useEffect } from "react";
import BlogDetailModal from "./BlogDetailModal"; // თუ იყენებ, დარჩეს როგორც გაქვს
import styles from "./BlogsPage.module.css";
import { useNavigate } from "react-router-dom";
import { useLang } from "../LanguageContext";
import SEO from "../components/SEO"; // ✅ დაემატა SEO კომპონენტი

const BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/blogs";

const BlogPage = () => {
  const { lang } = useLang(); // ka | en
  const [blogs, setBlogs] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const navigate = useNavigate();

  // 🌐 SEO ტექსტები ორივე ენაზე
  const pageTitle =
    lang === "en"
      ? "Blog – Articles & News"
      : "ბლოგი – სტატიები და სიახლეები";
  const pageDescription =
    lang === "en"
      ? "Read useful articles, tips and news about art supplies, stationery, kids' educational toys and school products from Artopia."
      : "გაეცანი სტატიებს, რჩევებს და სიახლეებს სამხატვრო მასალებზე, საკანცელარიო ნივთებზე, საბავშვო განმავითარებელ სათამაშოებსა და სასკოლო პროდუქტებზე Artopia-ს ბლოგში.";
  const pageUrl = "https://artopia.ge/blog"; // 📌 ბლოგების ლისტის კითხვის გვერდი

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch(`${BASE}?lang=${lang}`);
        if (!res.ok) throw new Error("ბლოგების წამოღება ჩავარდა");
        const data = await res.json();
        // API აბრუნებს: id, title, slug, cover_image, excerpt, created_at, is_active, lang
        setBlogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("ბლოგების წაკითხვის შეცდომა:", err);
        setError(
          lang === "en"
            ? "Failed to fetch blogs."
            : "ბლოგების მონაცემების წამოღება ვერ მოხერხდა."
        );
      }
    };

    fetchBlogs();
  }, [lang]);

  const filteredBlogs = blogs.filter((b) =>
    (b.title || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (blog) => {
    setSelectedBlog(blog);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBlog(null);
  };

  const openBlogDetail = (id) => {
    navigate(`/blog/${id}`); // დეტალის გვერდზე, სადაც გამოიყენებ GET /blogs/:id?lang=${lang}
  };

  return (
    <>
      {/* ✅ SEO მხოლოდ დავამატე, სხვა არაფერი შემიხედავს */}
      <SEO
        title={pageTitle}
        description={pageDescription}
        url={pageUrl}
        type="website"
      />

      <div className={styles.blogPageContainer}>
        <h2>{lang === "en" ? " Blog List" : " ბლოგების სია"}</h2>

        <input
          type="text"
          placeholder={
            lang === "en" ? "Search by title..." : "ძებნა სათაურით..."
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />

        {error && <div className={styles.error}>{error}</div>}

        <ul className={styles.blogList}>
          {filteredBlogs.map((b) => (
            <li key={b.id} className={styles.blogItem}>
              <div className={styles.blogInfo}>
                <div className={styles.coverRow}>
                  {b.cover_image ? (
                    <img
                      src={b.cover_image}
                      alt={b.title}
                      className={styles.cover}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.coverPlaceholder}>No cover</div>
                  )}
                </div>

                <strong
                  style={{ padding: 12 }}
                  className={styles.title}
                >
                  {b.title}
                </strong>
                {b.excerpt ? (
                  <p
                    style={{ margin: 10, fontSize: 18, lineHeight: 1.25 }}
                    className={styles.excerpt}
                  >
                    {b.excerpt}
                  </p>
                ) : null}
              </div>

              <div className={styles.actions}>
                <button
                  onClick={() => openBlogDetail(b.id)}
                  className={styles.readMoreBtn}
                >
                  {lang === "en" ? "Read more" : "წაიკითხე მეტი"}
                </button>

                {/* სურვილისას მოდალითაც შეგიძლიათ გახსნა "სკელეტონით" */}
                {/* <button onClick={() => openModal(b)} className={styles.readMoreBtn}>
                {lang === "en" ? "Preview" : "ნახვა"}
              </button> */}
              </div>
            </li>
          ))}
        </ul>

        {isModalOpen && selectedBlog && (
          <BlogDetailModal blog={selectedBlog} onClose={closeModal} />
        )}
      </div>
    </>
  );
};

export default BlogPage;
