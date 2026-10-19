import styles from "./HomePage.module.css";
import ProductSearchForm from "../components/search/ProductSearchForm";
import HomeCarousel from "../components/home/HomeCarousel";
import HomeSaleProducts from "../components/home/HomeSaleProducts";
import HomeNewProducts from "../components/home/HomeNewProducts";
import HomeBlogs from "../components/home/HomeBlogs";
import SEO from "../components/SEO";
import { useStorefrontData } from "../context/StorefrontDataContext";

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
  const { data, loading, error } = useStorefrontData();
  const homeImages = data.home_images || [];
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
      <section className={`${styles.section} ${styles.heroSection}`}>
        {/* ჩატვირთვისას იმავე ზომის ადგილი იჯავშნება, რაც carousel-ს აქვს (16:9) —
            ქვემოთ მდებარე სექციები აღარ „ხტება" (CLS) */}
        {loading && homeImages.length === 0 && <div className={styles.carouselPlaceholder} aria-hidden="true" />}
        {error && <div className={styles.error}>{error}</div>}

        {homeImages.length > 0 && (
          <HomeCarousel images={homeImages} />
        )}

        <ProductSearchForm overlapHero />
      </section>

      {/* 💸 SALE PRODUCTS */}
      <section className={styles.section}>
        <HomeSaleProducts items={data.sale_products} loading={loading} />
      </section>

      {/* 🆕 NEW PRODUCTS */}
      <section className={styles.section}>
        <HomeNewProducts items={data.new_products} loading={loading} />
      </section>

      {/* 📰 BLOGS */}
      <section className={styles.section}>
        <HomeBlogs items={data.blogs} loading={loading} />
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
