import React, { useEffect, useRef, useState } from "react";
import { useLang } from "../../LanguageContext";
import styles from "./HomeCarousel.module.css";

/* API BASE — იგივე ლოგიკა, რაც სხვაგან გაქვს */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

export default function HomeCarousel({ autoPlayMs = 5000 }) {
  const { lang } = useLang();
  const safeLang = lang === "en" ? "en" : "ka";

  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  // swipe
  const startX = useRef(0);
  const deltaX = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/home-images/public?lang=${safeLang}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (alive) {
          setItems(Array.isArray(data) ? data : []);
          setIdx(0);
        }
      } catch (e) {
        console.error("home carousel fetch failed:", e);
        if (alive) setItems([]);
      }
    })();
    return () => { alive = false; };
  }, [safeLang]);

  // autoplay
  useEffect(() => {
    if (!autoPlayMs || items.length <= 1) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, autoPlayMs);
    return () => clearInterval(timerRef.current);
  }, [items.length, autoPlayMs]);

  const go = (n) => setIdx((n + items.length) % items.length);
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  // touch handlers
  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    deltaX.current = 0;
  };
  const onTouchMove = (e) => {
    deltaX.current = e.touches[0].clientX - startX.current;
  };
  const onTouchEnd = () => {
    const dx = deltaX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    startX.current = 0;
    deltaX.current = 0;
  };

  if (items.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.slideArea}>
          <div className={styles.empty}>
            {safeLang === "ka" ? "სურათები ჯერ არ არის." : "No images yet."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div
        className={styles.slideArea}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={styles.track}
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {items.map((it) => (
            <div key={it.id} className={styles.slide}>
              {/* თუ გინდა კლიკზე გაიხსნას სრული სურათი */}
              {/* <a href={it.image_url} target="_blank" rel="noreferrer"> */}
                <img
                  src={it.image_url}
                  alt={it.alt_text || it.title || "home image"}
                  loading="eager"
                  decoding="async"
                />
              {/* </a> */}
            </div>
          ))}
        </div>

        {items.length > 1 && (
          <>
            <button className={`${styles.nav} ${styles.left}`} onClick={prev} aria-label="Previous">
              ‹
            </button>
            <button className={`${styles.nav} ${styles.right}`} onClick={next} aria-label="Next">
              ›
            </button>
          </>
        )}
      </div>

      {items.length > 1 && (
        <div className={styles.dots}>
          {items.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === idx ? styles.active : ""}`}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
