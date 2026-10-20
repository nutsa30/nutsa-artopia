import styles from "./HomePage.module.css";
import ProductSearchForm from "../components/search/ProductSearchForm";
import HomeCarousel from "../components/home/HomeCarousel";
import HomeSaleProducts from "../components/home/HomeSaleProducts";
import HomeNewProducts from "../components/home/HomeNewProducts";
import HomeBlogs from "../components/home/HomeBlogs";
import SEO from "../components/SEO";
import { useStorefrontData } from "../context/StorefrontDataContext";
import { ArrowUpRight, MapPin } from "lucide-react";

const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Artopia&query_place_id=ChIJIZJRgK9zREARDgmuTzhwb9o";


export default function HomePage() {
  const { data, loading, error } = useStorefrontData();
  const homeImages = data.home_images || [];
  return (
    <div className={styles.page}>
      <SEO
        title="Artopia — სამხატვრო მაღაზია | სამხატვრო და საკანცელარიო ნივთები ონლაინ"
        description="Artopia — სამხატვრო და საკანცელარიო მაღაზია თბილისში. საღებავები, ფუნჯები, ტილოები, სასკოლო და საოფისე ნივთები ონლაინ. მიტანა მთელ საქართველოში."
        url="https://artopia.ge/"
      />


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
      {/* Visible introduction and the page's primary heading. */}
      <header className={styles.homeIntro}>
        <h1>Artopia — სამხატვრო მაღაზია თბილისში</h1>
        <p>
          Artopia არის სამხატვრო და საკანცელარიო მაღაზია. შეიძინე სამხატვრო
          მასალა — აკვარელი, აკრილის და ზეთის საღებავი, გუაში, ფუნჯები, ტილო,
          მოლბერტი, პასტელი და სამხატვრო ნახშირი — ასევე საკანცელარიო, სასკოლო
          და საოფისე ნივთები ონლაინ, მიტანით მთელ საქართველოში.
        </p>
      </header>

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
      {/* Google Maps — მაღაზიის ადგილმდებარეობა */}
      <section className={styles.section}>
        <div className={styles.mapsCta}>
          <span className={styles.mapsIcon} aria-hidden="true">
            <MapPin size={30} strokeWidth={2.2} />
          </span>
          <div className={styles.mapsText}>
            <h2 className={styles.mapsTitle}>ნახე Artopia Google Maps-ზე</h2>
            <p>იპოვე ჩვენი მაღაზია რუკაზე და დაგეგმე მარშრუტი.</p>
          </div>
          <a className={styles.mapsBtn} href={MAPS_URL} target="_blank" rel="noopener noreferrer">
            რუკის გახსნა
            <ArrowUpRight size={18} strokeWidth={2.5} aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}
