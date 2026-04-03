import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ProductFilter.module.css";

const LABELS = {
  category: "კატეგორია:",
  all: "ყველა",
  search: "საძიებო სიტყვა...",
};

/* ---------------- helpers ---------------- */
const catLabel = (cat) => {
  if (!cat) return "";
  if (typeof cat === "string") return cat;
  return cat.name ?? "";
};

/* ---------------- component ---------------- */
export default function ProductFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  searchTerm,
  onSearchChange,
}) {
  const L = LABELS;
const [catSearch, setCatSearch] = useState("");
  const catObjs = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories.map((c, idx) =>
      typeof c === "string"
        ? { id: null, name: c, _key: `s-${idx}` }
        : { ...c, _key: `o-${c.id ?? idx}` }
    );
  }, [categories]);
const catLabels = useMemo(
  () => [L.all, ...catObjs.map((c) => catLabel(c)).filter(Boolean)],
  [catObjs]
);
const filteredLabels = useMemo(() => {
  return catLabels.filter((label) =>
    label.toLowerCase().includes(catSearch.toLowerCase())
  );
}, [catLabels, catSearch]);

  const [open, setOpen] = useState(false);

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

const handlePickCategory = (label) => {
  if (label === L.all) {
    onCategoryChange("");
  } else {
    onCategoryChange(label);
  }

  setCatSearch(""); // 🔥 reset
  setOpen(false);
};

  const triggerLabel = selectedCategory || L.all;

  return (
    <div className={styles.filterContainer}>
      <div className={styles.categoryWrapper}>
        <div className={styles.categoryRow}>
          <label htmlFor="cat-trigger">{L.category}</label>

   {open ? (
  <input
    ref={triggerRef}
    type="text"
    value={catSearch}
    onChange={(e) => setCatSearch(e.target.value)}
    placeholder="ძიება..."
    className={`${styles.searchInput} ${styles.catTrigger}`}
    autoFocus
  />
) : (
  <button
    ref={triggerRef}
    type="button"
    className={`${styles.searchInput} ${styles.catTrigger}`}
    onClick={() => setOpen(true)}
    title={triggerLabel}
  >
    <span
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {triggerLabel}
    </span>
  </button>
)}
        </div>

{open && (
  <div className={styles.darkDropdown} ref={dropdownRef}>


    <ul className={styles.darkList}>
{filteredLabels.map((label) => {
                  const isSelected = (selectedCategory || L.all) === label;

                return (
                  <li
                    key={label}
                    className={`${styles.darkItem} ${
                      isSelected ? styles.darkActive : ""
                    }`}
                    onClick={() => handlePickCategory(label)}
                    role="option"
                    aria-selected={isSelected ? "true" : "false"}
                    title={label}
                  >
                    <span className={styles.catText}>{label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <input
        type="text"
        className={`${styles.searchInput} ${styles.searchField}`}
        placeholder={L.search}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}