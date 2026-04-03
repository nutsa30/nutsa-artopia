import React, { useEffect, useMemo, useState, useRef } from "react";
import styles from "./HomePage.module.css";
import HomeCarousel from "../components/home/HomeCarousel";
import HomeNewProducts from "../components/home/HomeNewProducts";
import HomeSaleProducts from "../components/home/HomeSaleProducts";
import HomeBlogs from "../components/home/HomeBlogs";
import SEO from "../components/SEO";
import storeLightOff from "../assets/homepic/store-lightoff.png";
import storeLight from "../assets/homepic/store-light.png";


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

// useEffect(() => { fetchPublic(); }, []);
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
  
const [isOpen, setIsOpen] = useState(false);
const [showButton, setShowButton] = useState(true);
const [startZoom, setStartZoom] = useState(false);
const [hideBanner, setHideBanner] = useState(false);
const [showContent, setShowContent] = useState(false);
  
useEffect(() => {
  if (!isOpen) return;

  // 1) ღია ფოტო 1 წამში ჩნდება (ეს opacity transition-ით ხდება CSS-ში)
  // 2) ამის მერე 1 წამი დგას
  // 3) მერე იწყებს 1 წამში zoom-ს
  // 4) zoom-ის დაწყებიდან 0.9 წამზე ვიწყებთ გაქრობას და კონტენტის ჩვენებას

  const startZoomTimer = setTimeout(() => {
    setStartZoom(true);
  }, 2000); // 1s fade-in + 1s pause

  const revealContentTimer = setTimeout(() => {
    setHideBanner(true);
    setShowContent(true);
  }, 2900); // 2000 + 900ms

  return () => {
    clearTimeout(startZoomTimer);
    clearTimeout(revealContentTimer);
  };
}, [isOpen]);

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
{/* დროებითი ბანერი */}
<div
  className={`${styles.bannerStage} ${hideBanner ? styles.bannerStageHidden : ""}`}
>
{showButton && (
    <div className={styles.scene}>
    <div className={styles.buttonWrap}>
      <div
        className={`${styles.cube} ${isOpen ? styles.cubeActive : ""}`}


onClick={() => {
  setIsOpen(true);

  setTimeout(() => {
    setShowButton(false);
  }, 1000); // ⬅️ 1 წამი რჩება
}}
    >
      <span className={`${styles.side} ${styles.top}`}>
        ღიაა
      </span>
      <span className={`${styles.side} ${styles.front}`}>
        დაკეტილია
      </span>
    </div>
      </div>

  </div>
)}
<div className={styles.imageWrapper}>
  
  {/* დახურული */}
  <img
    src={storeLightOff}
    className={`${styles.bannerImg} ${isOpen ? styles.fadeOut : styles.fadeIn}`}
    alt="closed"
  />

  {/* ღია */}
<img
  src={storeLight}
className={`${styles.bannerImg} ${isOpen ? styles.fadeIn : styles.fadeOut} ${startZoom ? styles.zoomIn : ""}`}
style={{
  willChange: "transform",
}}
alt="open"
/>

</div>

</div>

{/* <HomeCarousel autoPlayMs={6000} /> */}
{showContent && (
  <section className={`${styles.section} ${styles.contentReveal}`}>
    <HomeNewProducts limit={4} />
    <HomeSaleProducts limit={4} />
    <HomeBlogs limit={4} />
  </section>
)}
      </div>
    </>
  );
}