// src/pages/HomePage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLang } from "../LanguageContext";
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
  const { lang } = useLang();
  const safeLang = lang === "en" ? "en" : "ka";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const videoRef = useRef(null);

  const fetchPublic = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`${API_BASE}/home-images/public?lang=${safeLang}`);
      const text = await res.text();
      const data = safeJson(text);
      if (!res.ok) throw new Error(data?.message || data?.error || text || `HTTP ${res.status}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("⛔ Home images error:", e.message);
      setErr(safeLang === "ka" ? "მონაცემების წამოღება ვერ მოხერხდა." : "Failed to load images.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPublic(); /* eslint-disable-line */ }, [safeLang]);
  const hasItems = useMemo(() => items?.length > 0, [items]);

  // ჩუმი autoplay (ბრაუზერის წესების შესასრულებლად)
  const handleCanPlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = true;   // muted აუცილებელია autoplay-სთვის
      await v.play();   // ჩუმად გაუშვებს
    } catch (_) {
      // იშვიათად თუ ბლოკდება, მომხმარებლის მცირე სკროლი/ტაჩი საკმარისია
    }
  };

  const handleEnded = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();          // გაჩერდეს
  };

  return (
    <>
     <SEO
        title="არტოპია"
        description="Artopia არის სამხატვრო და საკანცელარიო ონლაინ მაღაზია, სადაც ონლაინ შეიძენ სამხატვრო მასალას, სკოლის ნივთებს, საბავშვო განმავითარებელ სათამაშოებს და საოფისე პროდუქტებს"
        url="https://artopia.ge/"
      />
   
    <div className={styles?.page || ""} style={{ padding: "16px 20px" }}>
    
      
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
