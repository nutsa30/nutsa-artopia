import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./HomePage.module.css";
import HomeCarousel from "../components/home/HomeCarousel";
import HomeSaleProducts from "../components/home/HomeSaleProducts";
import HomeNewProducts from "../components/home/HomeNewProducts";
import HomeBlogs from "../components/home/HomeBlogs";
import SEO from "../components/SEO";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

// Visually hidden but crawlable (NOT display:none) — gives the homepage a real
// H1 + intro targeting "სამხატვრო მაღაზია" without changing the visual design.
const srOnly = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export default function HomePage() {

  const [homeImages, setHomeImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // 🔥 HOME IMAGES FETCH (admin-იდან)
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch(`${API_BASE}/home-images`);
        const data = await res.json();

        // 🔥 მხოლოდ აქტიური და სორტით დალაგებული
        const filtered = (data || [])
          .filter((img) => img.is_active)
          .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));

        setHomeImages(filtered);
      } catch (err) {
        console.error(err);
        setError("ჰოუმ სურათები ვერ ჩაიტვირთა");
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  return (
    <div className={styles.page}>
      <SEO
        title="Artopia — სამხატვრო მაღაზია | სამხატვრო და საკანცელარიო ნივთები ონლაინ"
        description="Artopia — სამხატვრო მაღაზია თბილისში. შეიძინე სამხატვრო მასალა — აკვარელი, აკრილის და ზეთის საღებავი, ფუნჯები, ტილო, მოლბერტი, პასტელი — ასევე საკანცელარიო, სასკოლო და საოფისე ნივთები ონლაინ. მიტანა მთელ საქართველოში."
        url="https://artopia.ge/"
      />

      {/* SEO heading — crawlable, visually hidden (design unchanged) */}
      <header style={srOnly}>
        <h1>Artopia — სამხატვრო მაღაზია თბილისში</h1>
        <p>
          Artopia არის სამხატვრო და საკანცელარიო მაღაზია. შეიძინე სამხატვრო
          მასალა — აკვარელი, აკრილის და ზეთის საღებავი, გუაში, ფუნჯები, ტილო,
          მოლბერტი, პასტელი და სამხატვრო ნახშირი — ასევე საკანცელარიო, სასკოლო
          და საოფისე ნივთები ონლაინ, მიტანით მთელ საქართველოში.
        </p>
      </header>

      {/* 🔥 HERO / CAROUSEL */}
      <section className={styles.section}>
        {loading && <div className={styles.info}>იტვირთება...</div>}
        {error && <div className={styles.error}>{error}</div>}

        {!loading && homeImages.length > 0 && (
          <HomeCarousel images={homeImages} />
        )}
      </section>

      {/* 💸 SALE PRODUCTS */}
      <section className={styles.section}>
        <HomeSaleProducts />
      </section>

      {/* 🆕 NEW PRODUCTS */}
      <section className={styles.section}>
        <HomeNewProducts />
      </section>

      {/* 📰 BLOGS */}
      <section className={styles.section}>
        <HomeBlogs />
      </section>
      {/* ⭐ GOOGLE REVIEWS CTA */}
      <section className={styles.section}>
        <div className={styles.reviewCta}>
          <div className={styles.reviewCtaContent}>
            <h2 className={styles.reviewTitle}>
              ნახეთ მომხმარებელთა რეალური შეფასებები
            </h2>
            <p className={styles.reviewText}>
             ჩვენთვის მნიშვნელოვანია რას ფიქრობენ მომხმარებლები ჩვენზე — ნახე მათი შეფასებები და დაგვიტოვე შენიც.
            </p>

            <div className={styles.reviewActions}>
            

            <Link
  to="/reviews"
  className={styles.reviewPrimaryBtn}
>
  შეფასებების ნახვა
</Link>
            </div>
          </div>

          <div className={styles.reviewStatCard}>
            <div className={styles.reviewStatStars}>★★★★★</div>
            <div className={styles.reviewStatValue}>4.9 / 5</div>
          </div>
        </div>
      </section>
    </div>
  );
}