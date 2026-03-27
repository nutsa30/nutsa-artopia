import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ProductFilter.module.css";
import { useLang } from "../../LanguageContext";

const LABELS = {
  ka: {
    category: "კატეგორია:",
    all: "ყველა",
    search: "საძიებო სიტყვა...",
    subcategory: "ქვეკატეგორია:",
    clearSub: "ქვეკატეგორიის მოხსნა",
  },
  en: {
    category: "Category:",
    all: "All",
    search: "Search...",
    subcategory: "Subcategory:",
    clearSub: "Clear subcategory",
  },
};

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/";

/* ---------------- helpers ---------------- */
const clean = (x) => String(x ?? "").trim();

/** ენიდან გამომდინარე კატეგორიის label */
const catLabel = (cat, lang) => {
  if (!cat) return "";
  if (typeof cat === "string") return cat;
  if (lang === "en") return cat.name_en ?? cat.name ?? cat.name_ka ?? "";
  return cat.name ?? cat.name_ka ?? cat.name_en ?? "";
};

/** ენიდან გამომდინარე ქვეკატეგორიის label */
const pickSubName = (s, lang) =>
  lang === "en"
    ? clean(s?.name_en ?? s?.name ?? s?.name_ka ?? s?.subcategory ?? s?.sub_category ?? s?.subCategory)
    : clean(s?.name ?? s?.name_ka ?? s?.name_en ?? s?.subcategory ?? s?.sub_category ?? s?.subCategory);

/**
 * სუბკატეგორიების ჭკვიანი ამომღები:
 * 1) subcategories?category_id=...&lang=...
 * 2) subcategories?category=<base_name>&lang=...
 * 3) products?lang=...&category=<label>  (ფოლბექი — ვაგროვებთ უნიკალურ subcategory-ებს, და კატეგორიითაც ვფილტრავთ)
 * ბოლოს: subcategories?category=<label/slug>&lang=...
 */
const fetchSubs = async ({ label, lang, category_id, category_key }) => {
  const tryFetchSubs = async (qs) => {
    const r = await fetch(`${API_BASE}/subcategories?${qs}`);
    if (!r.ok) return [];
    const data = await r.json();
    return (Array.isArray(data) ? data : []).map((s) => pickSubName(s, lang)).filter(Boolean);
  };

  // 1) category_id + lang / ka
  if (category_id != null) {
    let list = await tryFetchSubs(`category_id=${encodeURIComponent(category_id)}&lang=${encodeURIComponent(lang)}`);
    if (list.length) return list;

    list = await tryFetchSubs(`category_id=${encodeURIComponent(category_id)}&lang=ka`);
    if (list.length) return list;
  }

  // 2) base_name/key + lang / ka
  if (category_key) {
    let list = await tryFetchSubs(`category=${encodeURIComponent(category_key)}&lang=${encodeURIComponent(lang)}`);
    if (list.length) return list;

    list = await tryFetchSubs(`category=${encodeURIComponent(category_key)}&lang=ka`);
    if (list.length) return list;
  }

  // 3) PRODUCTS ფოლბექი
  try {
    const productsUrl = `${API_BASE}/products?lang=${encodeURIComponent(lang)}&category=${encodeURIComponent(label)}`;
    const rp = await fetch(productsUrl);
    if (rp.ok) {
      const data = await rp.json();
      if (Array.isArray(data)) {
        const target = clean(label).toLowerCase();
        const set = new Set(
          data
            .filter((p) => {
              const c = p?.category;
              let catName = "";
              if (typeof c === "string") {
                catName = clean(c).toLowerCase();
              } else if (c && typeof c === "object") {
                catName = clean(
                  lang === "en"
                    ? (c.name_en ?? c.name ?? c.base_name ?? c.name_ka)
                    : (c.name ?? c.name_ka ?? c.base_name ?? c.name_en)
                ).toLowerCase();
              } else {
                catName = clean(p?.category_name ?? p?.categoryName ?? "").toLowerCase();
              }
              return catName === target;
            })
            .map((p) =>
              clean(
                lang === "en"
                  ? (p?.subcategory ?? p?.subcategory_name ?? p?.subcategory_en ?? "")
                  : (p?.subcategory ?? p?.subcategory_name ?? p?.subcategory_ka ?? "")
              )
            )
            .filter(Boolean)
        );
        const arr = [...set];
        if (arr.length) return arr;
      }
    }
  } catch {
    /* ignore */
  }

  // 4) ძველი ბექებისთვის: სახელით/slug-ით subcategories-ზე ცდა
  const slug = clean(label).toLowerCase().replace(/\s+/g, "_");

  const tryByLabel = async (val, langCode) => {
    const r = await fetch(
      `${API_BASE}/subcategories?category=${encodeURIComponent(val)}&lang=${encodeURIComponent(langCode)}`
    );
    if (!r.ok) return [];
    const d = await r.json();
    return (Array.isArray(d) ? d : []).map((s) => pickSubName(s, lang)).filter(Boolean);
  };

  let list = await tryByLabel(label, lang);
  if (list.length) return list;

  list = await tryByLabel(label, "ka");
  if (list.length) return list;

  list = await tryByLabel(slug, lang);
  if (list.length) return list;

  list = await tryByLabel(slug, "ka");
  return list;
};

/* ---------------- component ---------------- */
export default function ProductFilter({
  // ველოდებით ობიექტებს: { id, name, name_ka, name_en, base_name? }
  categories,

  // გარე API-სთან თავსებადობა — კვლავ სტრინგებით ვმუშაობთ
  selectedCategory,
  onCategoryChange,

  searchTerm,
  onSearchChange,

  selectedSubcategory = "",
  onSubcategoryChange, // (sub: string) => void

  // NEW: მულტი-ქვეკატეგორიები (არასავალდებულო, თუ არ გადმოსცემ parent — იმუშავებს single რეჟიმში)
  selectedSubcategories = [],
  onSubcategoriesChange,
}) {
  const { lang } = useLang();
  const L = LABELS[lang] || LABELS.ka;

  // Multi რეჟიმის ამოცნობა (თუ parent-მა გადმოგვცა ორივე prop)
  const multiMode =
    Array.isArray(selectedSubcategories) && typeof onSubcategoriesChange === "function";

  // კატეგორიები ობიექტებად (id-ისთვის)
  const catObjs = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories.map((c, idx) =>
      typeof c === "string"
        ? { id: null, name: c, name_ka: c, name_en: c, _key: `s-${idx}` }
        : { ...c, _key: `o-${c.id ?? idx}` }
    );
  }, [categories]);

  const catLabels = useMemo(
    () => [L.all, ...catObjs.map((c) => catLabel(c, lang)).filter(Boolean)],
    [catObjs, lang, L.all]
  );

  // label -> კატეგორია ობიექტი
  const byLabel = useMemo(() => {
    const m = {};
    for (const c of catObjs) {
      const lbl = catLabel(c, lang);
      if (lbl) m[lbl] = c;
    }
    return m;
  }, [catObjs, lang]);

  const [open, setOpen] = useState(false);
  const [activeLabel, setActiveLabel] = useState(null);
  const [subMap, setSubMap] = useState({}); // { [label]: string[] }
  const [loadingLabel, setLoadingLabel] = useState(null);
  const [pendingSelect, setPendingSelect] = useState(null);

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef({});
  const [subTop, setSubTop] = useState(0);

  const hasSub = (label) => Array.isArray(subMap[label]) && subMap[label].length > 0;

  // გარე-კლიკი / Esc → დახურვა
  useEffect(() => {
    const onDoc = (e) => {
      if (triggerRef.current?.contains(e.target) || dropdownRef.current?.contains(e.target)) return;
      setOpen(false);
      setActiveLabel(null);
      setPendingSelect(null);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setActiveLabel(null);
        setPendingSelect(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // sub-panel-ის პოზიციის სტაბილიზაცია
  const updateSubTop = (label) => {
    const listEl = listRef.current;
    const liEl = itemRefs.current[label];
    if (!listEl || !liEl) return;
    const offset = liEl.offsetTop - listEl.scrollTop;
    setSubTop(offset);
  };
  useEffect(() => {
    const listEl = listRef.current;
    if (!open || !activeLabel || !listEl) return;
    const onScroll = () => updateSubTop(activeLabel);
    const onResize = () => updateSubTop(activeLabel);
    listEl.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    updateSubTop(activeLabel);
    return () => {
      listEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeLabel]);

  // კატეგორიის არჩევა
  const handlePickCategory = (label) => {
    const resetSubs = () => {
      onSubcategoryChange?.("");
      onSubcategoriesChange?.([]);
    };

    if (label === L.all) {
      onCategoryChange("");
      resetSubs();
      setOpen(false);
      setActiveLabel(null);
      setPendingSelect(null);
      return;
    }

    // უკვე ქონია ჩამოტანილი სუბები და იგივე label-ს ვაჭერთ მეორედ → უბრალოდ ვაფილტრავთ კატეგორიით
    if (subMap[label] && subMap[label].length > 0 && activeLabel === label) {
      onCategoryChange(label);
      resetSubs();
      setOpen(false);
      setActiveLabel(null);
      setPendingSelect(null);
      return;
    }

    if (subMap[label]) {
      if (subMap[label].length === 0) {
        onCategoryChange(label);
        resetSubs();
        setOpen(false);
        setActiveLabel(null);
        setPendingSelect(null);
      } else {
        setActiveLabel(label);
        requestAnimationFrame(() => updateSubTop(label));
      }
      return;
    }

    setPendingSelect(label);
    setActiveLabel(label);

    (async () => {
      try {
        setLoadingLabel(label);

        const catObj = byLabel[label] || null;
        const catId = catObj?.id ?? null;
        const baseKey = catObj?.base_name ?? catObj?.baseName ?? null;

        const list = await fetchSubs({
          label,
          lang,
          category_id: catId,
          category_key: baseKey,
        });

        setSubMap((m) => ({ ...m, [label]: list }));
      } finally {
        setLoadingLabel(null);
        requestAnimationFrame(() => updateSubTop(label));
      }
    })();
  };

  // ჩამოტანის შემდეგ ავტომატიკა
  useEffect(() => {
    if (!pendingSelect) return;
    const label = pendingSelect;
    const list = subMap[label];
    if (!list) return;

    const resetSubs = () => {
      onSubcategoryChange?.("");
      onSubcategoriesChange?.([]);
    };

    if (list.length === 0) {
      onCategoryChange(label);
      resetSubs();
      setOpen(false);
      setActiveLabel(null);
      setPendingSelect(null);
    } else {
      setActiveLabel(label);
      requestAnimationFrame(() => updateSubTop(label));
      setPendingSelect(null);
    }
  }, [pendingSelect, subMap, onCategoryChange, onSubcategoryChange, onSubcategoriesChange]);

  // ქვეკატეგორია → ფილტრაცია (single ან multi)
  const handlePickSub = (sub) => {
    if (!activeLabel) return;
    onCategoryChange(activeLabel); // label გარეთაც განახლდეს (როგორც აქამდე)

    if (multiMode) {
      const base = Array.isArray(selectedSubcategories) ? selectedSubcategories : [];
      const exists = base.includes(sub);
      const next = exists ? base.filter((x) => x !== sub) : [...base, sub];
      onSubcategoriesChange?.(next);
      // multi-ში dropdown ღია ვტოვოთ, რომ კიდევ დაამატონ
      return;
    }

    // single რეჟიმი — ძველი ქცევა
    onSubcategoryChange?.(sub);
    setOpen(false);
    setActiveLabel(null);
    setPendingSelect(null);
  };

  // Trigger-ში ჩანს მხოლოდ კატეგორიის სტრინგი
  const triggerLabel = selectedCategory || L.all;

  const clearSub = () => {
    onSubcategoryChange?.("");
    onSubcategoriesChange?.([]);
  };

  return (
    <div className={styles.filterContainer}>
      {/* მარცხენა სვეტი: კატეგორია */}
      <div className={styles.categoryWrapper}>
        <div className={styles.categoryRow}>
          <label htmlFor="cat-trigger">{L.category}</label>

          <button
            id="cat-trigger"
            ref={triggerRef}
            type="button"
            className={`${styles.searchInput} ${styles.catTrigger}`}
            onClick={() => setOpen((o) => !o)}
            title={triggerLabel}
            style={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}
            aria-haspopup="listbox"
            aria-expanded={open ? "true" : "false"}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {triggerLabel}
            </span>
          </button>
        </div>

        {/* არჩეული ქვეკატეგორ(ი)ების შეჯამება */}
        {multiMode && selectedSubcategories?.length > 0 ? (
          <div className={styles.subSummary} role="status" aria-live="polite" style={{ flexWrap: "wrap", gap: 6 }}>
            <span className={styles.subSummaryLabel}>{L.subcategory}</span>
            {selectedSubcategories.map((s) => (
              <span
                key={s}
                className={styles.subSummaryValue}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                title={s}
              >
                {s}
                <button
                  type="button"
                  className={styles.subSummaryClear}
                  onClick={() => onSubcategoriesChange(selectedSubcategories.filter((x) => x !== s))}
                  aria-label={L.clearSub}
                  title={L.clearSub}
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              className={styles.subSummaryClear}
              onClick={clearSub}
              aria-label={L.clearSub}
              title={L.clearSub}
              style={{ marginLeft: 6 }}
            >
              ×
            </button>
          </div>
        ) : selectedCategory && selectedSubcategory ? (
          <div className={styles.subSummary} role="status" aria-live="polite">
            <span className={styles.subSummaryLabel}>{L.subcategory}</span>
            <span className={styles.subSummaryValue}>{selectedSubcategory}</span>
            <button
              type="button"
              className={styles.subSummaryClear}
              onClick={clearSub}
              aria-label={L.clearSub}
              title={L.clearSub}
            >
              ×
            </button>
          </div>
        ) : null}

        {open && (
          <div className={styles.darkDropdown} ref={dropdownRef}>
            <ul className={styles.darkList} ref={listRef}>
              {catLabels.map((label) => {
                const isSelected = (selectedCategory || L.all) === label;
                return (
                  <li
                    key={label}
                    ref={(el) => (itemRefs.current[label] = el)}
                    className={`${styles.darkItem} ${isSelected ? styles.darkActive : ""}`}
                    onClick={() => handlePickCategory(label)}
                    role="option"
                    aria-selected={isSelected ? "true" : "false"}
                    title={label}
                  >
                    <span className={styles.catText}>{label}</span>
                    {label !== L.all && hasSub(label) ? <span className={styles.greenDot} aria-hidden /> : null}
                  </li>
                );
              })}
            </ul>

            {activeLabel && hasSub(activeLabel) && (
              <div className={styles.subPanel} style={{ top: subTop }}>
                <div className={styles.subGrid}>
                  {subMap[activeLabel].map((s) => {
                    const active = multiMode
                      ? selectedSubcategories.includes(s)
                      : (selectedCategory === activeLabel && selectedSubcategory === s);
                    return (
                      <button
                        type="button"
                        key={s}
                        className={`${styles.subChip} ${active ? styles.subChipActive : ""}`}
                        title={s}
                        onClick={() => handlePickSub(s)}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* მარჯვენა სვეტი: საძიებო ველი */}
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
