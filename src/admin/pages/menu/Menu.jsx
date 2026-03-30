import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Menu.module.css";
import { useNavigate } from "react-router-dom";


const FILTERS_KEY = "admin_menu_filters";
const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? "").trim() ||
  "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
const API = `${API_BASE}/products/admin`;
/* ---------------- Helpers ---------------- */

// ყველა შესაძლო წყაროდან აგროვებს product-ის ფოტოებს
const productImages = (p) => {
  const out = [];

  // ვარიანტი A: API აბრუნებს მასივს
  if (Array.isArray(p?.images)) {
    for (const it of p.images) {
      if (typeof it === "string") out.push(it);
      else if (it && typeof it.url === "string") out.push(it.url);
    }
  }

  // ვარიანტი B: images მოდის JSON სტრინგად
  if (typeof p?.images === "string") {
    try {
      const j = JSON.parse(p.images);
      if (Array.isArray(j)) {
        for (const it of j) {
          if (typeof it === "string") out.push(it);
          else if (it && typeof it.url === "string") out.push(it.url);
        }
      }
    } catch {}
  }

  // კლასიკური ველები: image_url1..6 (და ალტერნატივები — safety-სთვის)
  for (let i = 1; i <= 6; i++) {
    out.push(p?.[`image_url${i}`]);
    out.push(p?.[`image${i}`]);
    out.push(p?.[`img${i}`]);
  }

  // გაწმენდა + დუბლიკატების მოცილება
  return [...new Set(out.filter((u) => typeof u === "string" && u.startsWith("http")))];
};

// მცირე ინლაინ სტილები თამბნეილებისთვის
const TH = {
  wrap: { display: "flex", alignItems: "center", gap: 6, minHeight: 44 },
  thumb: { width: 44, height: 44, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" },
  noimg: {
    width: 44, height: 44, borderRadius: 8, border: "1px dashed #e5e7eb",
    color: "#9ca3af", display: "inline-flex", alignItems: "center",
    justifyContent: "center", fontSize: 12, background: "#fafafa"
  },
};




// ტექსტების ამოღება KA/EN (ლისტისთვის EN optional)
const pickDescKA = (p) => (p.description_ka ?? p.description ?? "").trim();
const pickDescEN = (p) => (p.description_en ?? "").trim();

/* ---------------- Component ---------------- */

const Menu = () => {
  const navigate = useNavigate();

  // სრული მონაცემების კეში (ერთი ქოლით)
  const [allProducts, setAllProducts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ფილტრები
const savedFilters = JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}");

const [searchTerm, setSearchTerm] = useState(savedFilters.searchTerm || "");
const [selectedCategory, setSelectedCategory] = useState(savedFilters.selectedCategory || "ყველა");
const [selectedStock, setSelectedStock] = useState(savedFilters.selectedStock || "all");
const [selectedSale, setSelectedSale] = useState(savedFilters.selectedSale || "all");
const [selectedNew, setSelectedNew] = useState(savedFilters.selectedNew || "all");
const [categories, setCategories] = useState(["ყველა"]); 
const abortRef = useRef(null);

  // -------- ერთიანი ჩატვირთვა (მხოლოდ KA) --------
  const fetchProductsOnce = async () => {
    setLoading(true);
    setError("");
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    try {
      const res = await fetch(`${API}?lang=ka`, { signal: ctl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      // შევამციროთ ობიექტები UI-სთვის საჭირო ველებამდე + ამოვკრიბოთ სურათები
      const trimmed = list.map((p) => {
        const imgs = productImages(p);
        return {
          id: p.id,
          name: p.name ?? p.title ?? "",
          price: p.price,
          sale: p.sale,
          quantity: p.quantity ?? 0,
          in_stock: (p.quantity ?? 0) > 0,
          category: p.category_name || p.category || "",
          category_id: p.category_id ?? "", // 🔥 ეს საკმარისია
          image_url1: imgs[0] || null,
          image_url2: imgs[1] || null,
          image_url3: imgs[2] || null,
          image_url4: imgs[3] || null,
          image_url5: imgs[4] || null,
          image_url6: imgs[5] || null,
          images: imgs,
          description_ka: p.description ?? p.description_ka ?? "",
          description_en: "",
          is_new: !!p.is_new,
          hide: !!p.hide,
        };
      });

      setAllProducts(trimmed);

      // კატეგორიების dropdown
      const uniqCats = Array.from(
        new Set(
          trimmed
          .map((p) => p.category_name || p.category || "")
          .filter(Boolean)
            .map((s) => s.trim())
        )
      );
      const sortedCats = uniqCats
  .filter((c) => c !== "სხვა")
  .sort((a, b) => a.localeCompare(b, "ka"));

setCategories(["ყველა", ...sortedCats, "სხვა"]);

      setVisibleCount(50);
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("⛔ products load:", e);
        setError("ვერ ჩაიტვირთა პროდუქტების სია.");
      }
    } finally {
      setLoading(false);
    }
  };


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
    fetchProductsOnce();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- ფილტრაცია (memo) --------
  const filtered = useMemo(() => {
    const needle = (searchTerm || "").toLowerCase().trim();
    return allProducts.filter((p) => {
      const haystack = [
        p.name,
        pickDescKA(p),
        pickDescEN(p),
        p.category,
      ]
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
        typeof p.sale === "number" && p.sale > 0 && p.sale <= 100;
      const matchesSale =
        selectedSale === "all" ||
        (selectedSale === "discounted" && hasSale) ||
        (selectedSale === "nodiscount" && !hasSale);

      const isNew = !!p.is_new;
      const matchesNew =
        selectedNew === "all" ||
        (selectedNew === "new" && isNew) ||
        (selectedNew === "old" && !isNew);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock &&
        matchesSale &&
        matchesNew
      );
    });
}, [allProducts, searchTerm, selectedCategory, selectedStock, selectedSale, selectedNew]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  // -------- Refresh: reset filters + reload --------
  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedCategory("ყველა");
    setSelectedStock("all");
    setSelectedSale("all");
    setSelectedNew("all");
    setVisibleCount(50);
    fetchProductsOnce();
    localStorage.removeItem(FILTERS_KEY);
  };

  // -------- Actions --------
 const handleEdit = (product) =>
 navigate(`/admin/addProducts/${product.id}`, { state: { product } });
  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      fetchProductsOnce();
    } catch (e) {
      console.error("❌ Delete failed:", e);
      alert("წაშლა ვერ მოხერხდა");
    }
  };


  // -------- Render --------
  return (
    <>
      <button className="goBackButton" onClick={() => navigate(-1)}>
        go back
      </button>

      <div style={{ padding: "2rem" }}>
        <h3 className={styles.productList}>📦 პროდუქტების სია</h3>

        {/* ფილტრების პანელი */}
        <div
          style={{
            display: "flex",
            width: 1200,
            flexDirection: "row",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <input
            type="text"
            placeholder="პროდუქტის ძებნა..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.searchInput}
            title="კატეგორია"
          >
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* მარაგის ფილტრი */}
          <select
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value)}
            className={styles.searchInput}
            title="მარაგი"
          >
   <option value="all">მარაგში + ამოწურული + დამალული</option>
<option value="in">მხოლოდ მარაგში</option>
<option value="out">მხოლოდ ამოწურული</option>
<option value="hidden">მხოლოდ დამალული</option>
          </select>

          {/* ფასდაკლების ფილტრი */}
          <select
            value={selectedSale}
            onChange={(e) => setSelectedSale(e.target.value)}
            className={styles.searchInput}
            title="ფასდაკლება"
          >
            <option value="all">ყველა</option>
            <option value="discounted">მხოლოდ ფასდაკლებული</option>
          </select>

          {/* „ახალი“ სტატუსის ფილტრი */}
          <select
            value={selectedNew}
            onChange={(e) => setSelectedNew(e.target.value)}
            className={styles.searchInput}
            title="ახალი"
          >
            <option value="all">ყველა</option>
            <option value="new">მხოლოდ ახალი</option>
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
              typeof p.sale === "number" && p.sale > 0 && p.sale <= 100;
            const discounted = hasSale
              ? (Number(p.price) * (1 - p.sale / 100)).toFixed(2)
              : null;

            return (
              <li key={p.id} className={styles.productListSimbol}>
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

                    {pickDescKA(p) && (
                      <span className={styles.pDescription}>
                        {pickDescKA(p)}
                      </span>
                    )}
                    {pickDescEN(p) && (
                      <span
                        className={styles.pDescription}
                        style={{ opacity: 0.8, display: "block", marginTop: 4 }}
                      >
                        <em>EN:</em> {pickDescEN(p)}
                      </span>
                    )}

{(p.category_name || p.category) && (
  <div className={styles.pCategory}>
    კატეგორია: {p.category_name || p.category || "—"}
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

                    {/* რამდენიმე სურათი ლისტში (1–3 თამბნეილი + “+N”) */}
                    <div className={styles.images}>
                      {(() => {
                        const imgs = productImages(p);
                        if (!imgs.length) return <div style={TH.noimg}>—</div>;
                        return (
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
                        );
                      })()}
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

        {/* “Load more” */}
        <div style={{ marginTop: 16 }}>
          {visible.length < filtered.length && (
            <button
              onClick={() => setVisibleCount((c) => c + 50)}
              className="editBtn"
            >
              მეტის ჩატვირთვა
            </button>
          )}
          {loading && <span style={{ marginLeft: 8 }}>იტვირთება…</span>}
          {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
        </div>
      </div>
    </>
  );
};

export default Menu;
