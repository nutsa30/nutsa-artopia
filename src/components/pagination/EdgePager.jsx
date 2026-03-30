// src/components/pagination/EdgePager.jsx
import React, { useEffect, useMemo, useState } from "react";
import styles from "./EdgePager.module.css";

export default function EdgePager({ totalPages, currentPage, onChange }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    mq.addEventListener?.("change", upd);
    return () => mq.removeEventListener?.("change", upd);
  }, []);

  const config = useMemo(() => {
    return isMobile
      ? { siblingCount: 1 } // mobile
      : { siblingCount: 2 }; // desktop
  }, [isMobile]);

  const items = useMemo(() => {
    if (totalPages <= 1) return [];

    const { siblingCount } = config;

    const pages = [];

    const left = Math.max(currentPage - siblingCount, 1);
    const right = Math.min(currentPage + siblingCount, totalPages);

    const showLeftDots = left > 2;
    const showRightDots = right < totalPages - 1;

    // always first
    pages.push(1);

    if (showLeftDots) {
      pages.push("…");
    }

    // middle pages
    for (let i = left; i <= right; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    if (showRightDots) {
      pages.push("…");
    }

    // always last
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }, [totalPages, currentPage, config]);

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
            className={`${styles.pgBtn} ${
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