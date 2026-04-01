import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Menu.module.css";
import { useNavigate } from "react-router-dom";
import EdgePager from "../../../components/pagination/EdgePager";

const ACTIVE_PRODUCT_KEY = "admin_active_product";
const FILTERS_KEY = "admin_menu_filters";
const PAGE_KEY = "admin_menu_page";

const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

const API = `${API_BASE}/products/admin`;
const PAGE_SIZE = 20;

const productImages = (p) => {
  const out = [];

  if (Array.isArray(p?.images)) {
    for (const it of p.images) {
      if (typeof it === "string") out.push(it);
      else if (it && typeof it.url === "string") out.push(it.url);
    }
  }

  if (typeof p?.images === "string") {
    try {
      const parsed = JSON.parse(p.images);
      if (Array.isArray(parsed)) {
        for (const it of parsed) {
          if (typeof it === "string") out.push(it);
          else if (it && typeof it.url === "string") out.push(it.url);
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  for (let i = 1; i <= 6; i += 1) {
    out.push(p?.[`image_url${i}`]);
    out.push(p?.[`image${i}`]);
    out.push(p?.[`img${i}`]);
  }

  return [
    ...new Set(
      out.filter((u) => typeof u === "string" && u.trim().startsWith("http"))
    ),
  ];
};

const TH = {
  wrap: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    flexWrap: "wrap",
  },
  thumb: {
    width: 44,
    height: 44,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
  },
  noimg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    border: "1px dashed #e5e7eb",
    color: "#9ca3af",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    background: "#fafafa",
  },
};

const normalizeProduct = (p) => {
  const imgs = productImages(p);
  const quantity = Number(p?.quantity ?? 0);
  const hasValidQty = Number.isFinite(quantity) && quantity > 0;

  return {
    id: p.id,
    name: String(p?.name || "").trim(),
    description: String(p?.description || "").trim(),
    price: Number(p?.price ?? 0),
    sale: p?.sale == null ? null : Number(p.sale),
    quantity: hasValidQty ? Math.floor(quantity) : 0,
    in_stock: hasValidQty,
    category: String(p?.category_name || p?.category || "").trim(),
    category_id: p?.category_id ?? "",
    is_new: !!p?.is_new,
    hide: !!p?.hide,
    slug: p?.slug || "",
    images: imgs,
    image_url1: imgs[0] || null,
    image_url2: imgs[1] || null,
    image_url3: imgs[2] || null,
    image_url4: imgs[3] || null,
    image_url5: imgs[4] || null,
    image_url6: imgs[5] || null,
  };
};

const getSavedFilters = () => {
  try {
    return JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}");
  } catch {
    return {};
  }
};

const Menu = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const abortRef = useRef(null);

  const savedFilters = getSavedFilters();

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState(savedFilters.searchTerm || "");
  const [selectedCategory, setSelectedCategory] = useState(
    savedFilters.selectedCategory || "ყველა"
  );
  const [selectedStock, setSelectedStock] = useState(
    savedFilters.selectedStock || "all"
  );
  const [selectedSale, setSelectedSale] = useState(
    savedFilters.selectedSale || "all"
  );
  const [selectedNew, setSelectedNew] = useState(
    savedFilters.selectedNew || "all"
  );
  const [categories, setCategories] = useState(["ყველა"]);

  const [currentPage, setCurrentPage] = useState(
    Number(localStorage.getItem(PAGE_KEY)) || 1
  );

  const fetchProductsOnce = async () => {
    setLoading(true);
    setError("");

    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    try {
      const res = await fetch(API, { signal: ctl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      const normalized = list.map(normalizeProduct);

      setAllProducts(normalized);

      const uniqCats = Array.from(
        new Set(normalized.map((p) => p.category).filter(Boolean))
      );

      const sortedCats = uniqCats
        .filter((c) => c !== "სხვა")
        .sort((a, b) => a.localeCompare(b, "ka"));

      setCategories(["ყველა", ...sortedCats, ...(uniqCats.includes("სხვა") ? ["სხვა"] : [])]);
    } catch (e) {
      if (e?.name === "AbortError") return;
      console.error("❌ Fetch products failed:", e);
      setError("პროდუქტების წამოღება ვერ მოხერხდა");
      setAllProducts([]);
      setCategories(["ყველა"]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsOnce();
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      FILTERS_KEY,
      JSON.stringify({
        searchTerm,
        selectedCategory,
        selectedStock,
        selectedSale,
        selectedNew,
      })
    );
  }, [searchTerm, selectedCategory, selectedStock, selectedSale, selectedNew]);

  useEffect(() => {
    localStorage.setItem(PAGE_KEY, String(currentPage));
  }, [currentPage]);

  const filtered = useMemo(() => {
    const needle = (searchTerm || "").toLowerCase().trim();

    return allProducts.filter((p) => {
      const haystack = [p.name, p.description, p.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !needle || haystack.includes(needle);

      const matchesCategory =
        selectedCategory === "ყველა" || p.category === selectedCategory;

      const matchesStock =
        selectedStock === "all" ||
        (selectedStock === "in" && p.in_stock && !p.hide) ||
        (selectedStock === "out" && !p.in_stock && !p.hide) ||
        (selectedStock === "hidden" && p.hide);

      const hasSale =
        typeof p.sale === "number" && Number.isFinite(p.sale) && p.sale > 0 && p.sale <= 100;

      const matchesSale =
        selectedSale === "all" ||
        (selectedSale === "discounted" && hasSale) ||
        (selectedSale === "nodiscount" && !hasSale);

      const matchesNew =
        selectedNew === "all" ||
        (selectedNew === "new" && p.is_new) ||
        (selectedNew === "old" && !p.is_new);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock &&
        matchesSale &&
        matchesNew
      );
    });
  }, [
    allProducts,
    searchTerm,
    selectedCategory,
    selectedStock,
    selectedSale,
    selectedNew,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const visible = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safeCurrentPage]);

  useEffect(() => {
    const activeId = localStorage.getItem(ACTIVE_PRODUCT_KEY);

    if (activeId && visible.length > 0) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`product-${activeId}`);
        if (el) {
          el.scrollIntoView({
            behavior: "auto",
            block: "center",
          });
        }
        localStorage.removeItem(ACTIVE_PRODUCT_KEY);
      });
      return;
    }

    const scroller =
      document.scrollingElement || document.documentElement || document.body;

    scroller.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [safeCurrentPage, visible]);

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedCategory("ყველა");
    setSelectedStock("all");
    setSelectedSale("all");
    setSelectedNew("all");
    setCurrentPage(1);
    localStorage.removeItem(FILTERS_KEY);
    localStorage.removeItem(PAGE_KEY);
    fetchProductsOnce();
  };

  const handleEdit = (product) => {
    localStorage.setItem(PAGE_KEY, String(safeCurrentPage));
    localStorage.setItem(ACTIVE_PRODUCT_KEY, String(product.id));
    navigate(`/admin/addProducts/${product.id}`, { state: { product } });
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("დარწმუნებული ხარ, რომ პროდუქტის წაშლა გინდა?");
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setAllProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error("❌ Delete failed:", e);
      alert("წაშლა ვერ მოხერხდა");
    }
  };

  return (
    <>
      <button className="goBackButton" onClick={() => navigate(-1)}>
        go back
      </button>

      <div ref={containerRef} style={{ padding: "2rem" }}>
        <h3 className={styles.productList}>📦 პროდუქტების სია</h3>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <input
            type="text"
            placeholder="პროდუქტის ძებნა..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
          />

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
            title="კატეგორია"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedStock}
            onChange={(e) => {
              setSelectedStock(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
            title="მარაგი"
          >
            <option value="all">ყველა</option>
            <option value="in">მხოლოდ მარაგში</option>
            <option value="out">მხოლოდ ამოწურული</option>
            <option value="hidden">მხოლოდ დამალული</option>
          </select>

          <select
            value={selectedSale}
            onChange={(e) => {
              setSelectedSale(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
            title="ფასდაკლება"
          >
            <option value="all">ყველა</option>
            <option value="discounted">მხოლოდ ფასდაკლებული</option>
            <option value="nodiscount">ფასდაკლების გარეშე</option>
          </select>

          <select
            value={selectedNew}
            onChange={(e) => {
              setSelectedNew(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
            title="ახალი"
          >
            <option value="all">ყველა</option>
            <option value="new">მხოლოდ ახალი</option>
            <option value="old">არა ახალი</option>
          </select>

          <button
            onClick={handleRefresh}
            className={styles.refresh}
            title="განახლება"
          >
            განახლება
          </button>
        </div>

        <ul className={styles.productItem}>
          {visible.map((p) => {
            const hasSale =
              typeof p.sale === "number" && Number.isFinite(p.sale) && p.sale > 0 && p.sale <= 100;

            const discounted = hasSale
              ? (Number(p.price) * (1 - p.sale / 100)).toFixed(2)
              : null;

            const imgs = productImages(p);

            return (
              <li
                key={p.id}
                id={`product-${p.id}`}
                className={styles.productListSimbol}
              >
                <div className={styles.productListInner}>
                  <div className={styles.productListName}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {p.is_new && (
                        <span
                          title="ახალი პროდუქტი"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "#fff7e6",
                            border: "1px solid #f59e0b",
                            color: "#b45309",
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          ⭐ ახალი
                        </span>
                      )}

                      <strong className={styles.pName}>{p.name}</strong>
                    </div>

                    {p.description && (
                      <span className={styles.pDescription}>
                        {p.description}
                      </span>
                    )}

                    {p.category && (
                      <div className={styles.pCategory}>
                        კატეგორია: {p.category}
                      </div>
                    )}

                    <div className={styles.price}>
                      {hasSale ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              textDecoration: "line-through",
                              opacity: 0.6,
                            }}
                          >
                            {p.price} ₾
                          </span>

                          <span>
                            <b>{discounted} ₾</b>
                          </span>

                          <span
                            style={{
                              background: "#ffe8e8",
                              color: "#c53030",
                              border: "1px solid #e55353",
                              padding: "2px 6px",
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                          >
                            -{p.sale}%
                          </span>
                        </div>
                      ) : (
                        <div>{p.price} ₾</div>
                      )}
                    </div>

                    <div className={styles.stock}>
                      {p.in_stock ? (
                        <span style={{ color: "green" }}>✔️ მარაგშია</span>
                      ) : (
                        <span style={{ color: "red" }}>❌ არ არის მარაგში</span>
                      )}

                      {p.hide && (
                        <span style={{ color: "#555", marginLeft: 10 }}>
                          🚫 დამალულია
                        </span>
                      )}
                    </div>

                    <div className={styles.images}>
                      {!imgs.length ? (
                        <div style={TH.noimg}>—</div>
                      ) : (
                        <div style={TH.wrap}>
                          {imgs.slice(0, 3).map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt={`${p.name || "product"}-${i + 1}`}
                              style={TH.thumb}
                            />
                          ))}
                          {imgs.length > 3 && <span>+{imgs.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button onClick={() => handleEdit(p)} className="editBtn">
                      ✏️ რედაქტირება
                    </button>

                    <button
                      onClick={() => handleDelete(p.id)}
                      className="deleteBtn"
                    >
                      🗑️ წაშლა
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div style={{ marginTop: 16 }}>
          {totalPages > 1 && (
            <EdgePager
              totalPages={totalPages}
              currentPage={safeCurrentPage}
              onChange={(page) => setCurrentPage(page)}
            />
          )}

          {loading && <span style={{ marginLeft: 8 }}>იტვირთება…</span>}
          {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
        </div>
      </div>
    </>
  );
};

export default Menu;