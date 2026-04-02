import React, { useEffect, useMemo, useState, useRef } from "react";
import styles from "./HomePage.module.css";
import HomeCarousel from "../components/home/HomeCarousel";
import HomeNewProducts from "../components/home/HomeNewProducts";
import HomeSaleProducts from "../components/home/HomeSaleProducts";
import HomeBlogs from "../components/home/HomeBlogs";
import SEO from "../components/SEO";

/* -------- API BASE -------- */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

/* ------------------------ helpers ------------------------ */
const safeJson = (text) => {
  try { return text ? JSON.parse(text) : null; } catch { return null; }
};

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const videoRef = useRef(null);

  const fetchPublic = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`${API_BASE}/home-images/public`);
      const text = await res.text();
      const data = safeJson(text);
      if (!res.ok) throw new Error(data?.message || data?.error || text || `HTTP ${res.status}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("⛔ Home images error:", e.message);
      setErr("მონაცემების წამოღება ვერ მოხერხდა.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPublic(); /* eslint-disable-line */ }, []);
  const hasItems = useMemo(() => items?.length > 0, [items]);

  // ჩუმი autoplay (ბრაუზერის წესების შესასრულებლად)
  const handleCanPlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = true;
      await v.play();
    } catch (_) {}
  };

  const handleEnded = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
  };

  return (
    <>
      <SEO
        title="სამხატვრო და საკანცელარიო მაღაზია | Artopia"
        description="Artopia არის სამხატვრო და საკანცელარიო ონლაინ მაღაზია, სადაც ონლაინ შეიძენ სამხატვრო მასალას, სკოლის ნივთებს, საბავშვო განმავითარებელ სათამაშოებს და საოფისე პროდუქტებს"
        url="https://artopia.ge/"
      />
      <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Artopia",
      url: "https://artopia.ge/",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://artopia.ge/products?search={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    }),
  }}
/>
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Artopia",
      url: "https://artopia.ge",
      logo: "https://artopia.ge/logo.png",
      sameAs: [
        "https://www.instagram.com/artopia_tbilisi/",
        "https://www.facebook.com/profile.php?id=100093336648910",
        "https://www.tiktok.com/@artopia_tbilisi",
        "https://youtube.com/@artopia_georgia"
      ],
    }),
  }}
/>

      <div className={styles?.page || ""} style={{ padding: "16px 20px" }}>
        <h1 style={{ display: "none" }}>
  სამხატვრო და საკანცელარიო მაღაზია Artopia
</h1>
        <HomeCarousel autoPlayMs={6000} />

        <section className={styles.section}>
          <HomeNewProducts limit={4} />
          <HomeSaleProducts limit={4} />
          <HomeBlogs limit={4} />
        </section>
      </div>
    </>
  );
}