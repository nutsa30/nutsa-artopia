import { useEffect, useState } from "react";
import styles from "./HomePage.module.css";

import HomeCarousel from "../components/home/HomeCarousel";
import HomeSaleProducts from "../components/home/HomeSaleProducts";
import HomeNewProducts from "../components/home/HomeNewProducts";
import HomeBlogs from "../components/home/HomeBlogs";
import OpeningPage from "./OpeningPage";
import { hasSeenOpening } from "../utils/openingGate";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

export default function HomePage() {
  const [homeImages, setHomeImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
const [showOpening, setShowOpening] = useState(false);
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

  useEffect(() => {
  if (!hasSeenOpening()) {
    setShowOpening(true);
  }
}, []);
const handleOpeningDone = () => {
  setShowOpening(false);
};
  return (
    <div className={styles.page}>
      
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

      {showOpening && <OpeningPage onFinish={handleOpeningDone} />}

    </div>
  );
}