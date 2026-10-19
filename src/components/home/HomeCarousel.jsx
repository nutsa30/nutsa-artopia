import React, { useEffect, useRef, useState } from "react";
import styles from "./HomeCarousel.module.css";
import { responsiveImage } from "../../utils/cloudinary";

export default function HomeCarousel({ images = [], autoPlayMs = 5000 }) {
  const items = Array.isArray(images) ? images : [];
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  // swipe
  const startX = useRef(0);
  const deltaX = useRef(0);

  useEffect(() => { setIdx(0); }, [images]);

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
{"სურათები ჯერ არ არის."}
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
          {items.map((it, slideIndex) => {
            const previous = (idx - 1 + items.length) % items.length;
            const nextIndex = (idx + 1) % items.length;
            const shouldLoad = slideIndex === idx || slideIndex === previous || slideIndex === nextIndex;
            return (
            <div key={it.id} className={styles.slide}>
              {shouldLoad && (
                <img
                  {...responsiveImage(it.image_url, "hero")}
                  alt={it.alt_text || it.title || "Artopia"}
                  loading={slideIndex === idx ? "eager" : "lazy"}
                  {...(slideIndex === 0 ? { fetchpriority: "high" } : {})}
                  decoding="async"
                />
              )}
            </div>
          );})}
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
