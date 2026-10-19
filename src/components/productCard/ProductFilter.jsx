import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { catalogPath } from "../../utils/canonical";
import { LayoutGrid } from "lucide-react";
import CategoryIcon from "../../utils/categoryIcons";
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
  includeOutOfStock = false,
  onOutOfStockChange,
  categoryHref = (category) => catalogPath({ category }),
}) {
  const L = LABELS;
const [catSearch, setCatSearch] = useState("");
  const catObjs = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories.map((c, idx) =>
      typeof c === "string"
        ? { id: null, name: c, value: c, _key: `s-${idx}` }
        : { ...c, value: c.slug || c.name, _key: `o-${c.id ?? idx}` }
    );
  }, [categories]);
const filteredCategories = useMemo(() => {
  return [{ name: L.all, value: "" }, ...catObjs].filter((cat) =>
    catLabel(cat).toLowerCase().includes(catSearch.toLowerCase())
  );
}, [catObjs, catSearch, L.all]);

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
      setCatSearch("");
    };

    const onEsc = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setCatSearch("");
      }
    };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

const handlePickCategory = (value) => {
  onCategoryChange(value || "");

  setCatSearch(""); // 🔥 reset
  setOpen(false);
};

  const triggerLabel = catObjs.find((cat) => cat.value === selectedCategory || cat.name === selectedCategory)?.name || selectedCategory || L.all;

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
    {selectedCategory ? (
      <CategoryIcon name={triggerLabel} size={18} className={styles.triggerIcon} />
    ) : (
      <LayoutGrid size={18} className={styles.triggerIcon} aria-hidden="true" />
    )}
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

{/* სია ყოველთვის DOM-შია (დახურულზე უბრალოდ დამალული), რომ კატეგორიების
    <a href> ბმულები crawler-ს მენიუს გახსნის გარეშეც დახვდეს. */}
{(
  <div className={styles.darkDropdown} ref={dropdownRef} style={open ? undefined : { display: "none" }}>


    <ul className={styles.darkList}>
{filteredCategories.map((cat) => {
                  const label = catLabel(cat);
                  const value = cat.value || "";
                  const isSelected = (selectedCategory || "") === value;

                return (
                  <li
                    key={cat._key || "all"}
                    className={`${styles.darkItem} ${
                      isSelected ? styles.darkActive : ""
                    }`}
                    onClick={() => handlePickCategory(value)}
                    title={label}
                  >
                    {label === L.all ? (
                      <LayoutGrid size={18} className={styles.catIcon} aria-hidden="true" />
                    ) : (
                      <CategoryIcon name={label} size={18} className={styles.catIcon} />
                    )}
                    <Link
                      to={categoryHref(value || null)}
                      className={styles.catLink}
                      aria-current={isSelected ? "page" : undefined}
                      onClick={(e) => {
                        // ნავიგაციას თვითონ ბმული აკეთებს; <li>-ის onClick აღარ უნდა გაეშვას
                        e.stopPropagation();
                        setCatSearch("");
                        setOpen(false);
                      }}
                    >
                      {label}
                    </Link>
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
      <label className={styles.stockToggle}>
        <input type="checkbox" checked={includeOutOfStock}
          onChange={(e) => onOutOfStockChange?.(e.target.checked)} />
        ამოწურული პროდუქტების ჩვენება
      </label>
    </div>
  );
}
