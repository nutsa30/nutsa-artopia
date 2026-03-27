// src/components/pagination/EdgePager.jsx
import React, { useEffect, useMemo, useState } from "react";
import styles from "./EdgePager.module.css";

/**
 * EdgePager
 *
 * Desktop: left window = 5, right = 2
 * Mobile:  left window = 3, right = 1
 *
 * ლოგიკა:
 * - ვაჩვენებთ "მსუქან" ფანჯარას (N გვერდი) currentPage-ის გარშემო
 * - ბოლოში ყოველთვის ბოლო right გვერდი
 * - თუ ფანჯარა და ბოლო გვერდები ერთმანეთთან აეკრა → სამწერტილი აღარ ჩანს
 */
export default function EdgePager({ totalPages, currentPage, onChange }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    mq.addEventListener?.("change", upd);
    return () => mq.removeEventListener?.("change", upd);
  }, []);

  const edgeConfig = useMemo(() => {
    return isMobile
      ? { left: 3, right: 1 } // mobile window + last 1
      : { left: 5, right: 2 }; // desktop window + last 2
  }, [isMobile]);

  const items = useMemo(() => {
    if (totalPages <= 0) return [];

    const { left: windowSize, right: rightCount } = edgeConfig;

    // თუ სულ ცოტა გვერდია — ყველაფერი ვაჩვენოთ, სამწერტილის გარეშე
    if (totalPages <= windowSize + rightCount) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // ფანჯარა (windowSize) უნდა ჩაიტიოს [1, totalPages - rightCount] დიაპაზონში
    const maxStart = Math.max(1, totalPages - rightCount - windowSize + 1);
    let start = currentPage - windowSize + 1; // ისე, რომ currentPage ფანჯრის ბოლოში ჯდეს
    if (start < 1) start = 1;
    if (start > maxStart) start = maxStart;

    const end = start + windowSize - 1;

    const pages = [];
    for (let p = start; p <= end && p <= totalPages; p++) {
      pages.push(p);
    }

    // ბოლო rightCount გვერდი
    const rightStart = totalPages - rightCount + 1;
    const rightPages = [];
    for (let p = rightStart; p <= totalPages; p++) {
      if (!pages.includes(p)) rightPages.push(p);
    }

    // თუ ფანჯარასა და ბოლოში არსებულ გვერდებს შორის არის gap → სამწერტილი
    if (
      rightPages.length > 0 &&
      pages[pages.length - 1] < rightPages[0] - 1
    ) {
      pages.push("…");
    }

    return pages.concat(rightPages);
  }, [edgeConfig, totalPages, currentPage]);

  const goto = (p) => {
    if (!onChange) return;
    if (p < 1 || p > totalPages || p === currentPage) return;
    onChange(p);
  };

  return (
    <nav className={styles.pagination} aria-label="გვერდების ნავიგაცია">
      <button
        type="button"
        className={`${styles.pgBtn} ${styles.pgPrev}`}
        disabled={currentPage <= 1}
        onClick={() => goto(currentPage - 1)}
      >
        ←
      </button>

      {items.map((it, idx) =>
        it === "…" ? (
          <span key={`e${idx}`} className={styles.ellipsis}>
            …
          </span>
        ) : (
          <button
            type="button"
            key={`p${it}`}
            data-page={it}
            className={`${styles.pgBtn} ${styles.pgItem} ${
              it === currentPage ? styles.isActive : ""
            }`}
            onClick={() => goto(it)}
            aria-current={it === currentPage ? "page" : undefined}
          >
            {it}
          </button>
        )
      )}

      <button
        type="button"
        className={`${styles.pgBtn} ${styles.pgNext}`}
        disabled={currentPage >= totalPages}
        onClick={() => goto(currentPage + 1)}
      >
        →
      </button>
    </nav>
  );
}
