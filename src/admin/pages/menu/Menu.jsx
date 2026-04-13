import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Menu.module.css";
import { useNavigate } from "react-router-dom";
import EdgePager from "../../../components/pagination/EdgePager";
import { 
  Search, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  Package, 
  ChevronLeft, 
  Filter,
  EyeOff,
  CheckCircle2,
  XCircle,
  Tag
} from "lucide-react";

const ACTIVE_PRODUCT_KEY = "admin_active_product";
const FILTERS_KEY = "admin_menu_filters";
const PAGE_KEY = "admin_menu_page";

const API_BASE = (import.meta?.env?.VITE_API_BASE ?? "").trim() || "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
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
    } catch { }
  }
  for (let i = 1; i <= 6; i += 1) {
    out.push(p?.[`image_url${i}`]);
    out.push(p?.[`image${i}`]);
    out.push(p?.[`img${i}`]);
  }
  return [...new Set(out.filter((u) => typeof u === "string" && u.trim().startsWith("http")))];
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
  };
};

const getSavedFilters = () => {
  try {
    return JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}");
  } catch { return {}; }
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
  const [selectedCategory, setSelectedCategory] = useState(savedFilters.selectedCategory || "ყველა");
  const [selectedStock, setSelectedStock] = useState(savedFilters.selectedStock || "all");
  const [selectedSale, setSelectedSale] = useState(savedFilters.selectedSale || "all");
  const [selectedNew, setSelectedNew] = useState(savedFilters.selectedNew || "all");
  const [categories, setCategories] = useState(["ყველა"]);
  const [currentPage, setCurrentPage] = useState(Number(localStorage.getItem(PAGE_KEY)) || 1);

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
      const uniqCats = Array.from(new Set(normalized.map((p) => p.category).filter(Boolean)));
      const sortedCats = uniqCats.filter((c) => c !== "სხვა").sort((a, b) => a.localeCompare(b, "ka"));
      setCategories(["ყველა", ...sortedCats, ...(uniqCats.includes("სხვა") ? ["სხვა"] : [])]);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError("პროდუქტების წამოღება ვერ მოხერხდა");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchProductsOnce();
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify({ searchTerm, selectedCategory, selectedStock, selectedSale, selectedNew }));
  }, [searchTerm, selectedCategory, selectedStock, selectedSale, selectedNew]);

  useEffect(() => { localStorage.setItem(PAGE_KEY, String(currentPage)); }, [currentPage]);

  const filtered = useMemo(() => {
    const needle = (searchTerm || "").toLowerCase().trim();
    return allProducts.filter((p) => {
      const haystack = [p.name, p.description, p.category].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !needle || haystack.includes(needle);
      const matchesCategory = selectedCategory === "ყველა" || p.category === selectedCategory;
      const matchesStock = selectedStock === "all" || (selectedStock === "in" && p.in_stock && !p.hide) || (selectedStock === "out" && !p.in_stock && !p.hide) || (selectedStock === "hidden" && p.hide);
      const hasSale = typeof p.sale === "number" && Number.isFinite(p.sale) && p.sale > 0 && p.sale <= 100;
      const matchesSale = selectedSale === "all" || (selectedSale === "discounted" && hasSale) || (selectedSale === "nodiscount" && !hasSale);
      const matchesNew = selectedNew === "all" || (selectedNew === "new" && p.is_new) || (selectedNew === "old" && !p.is_new);
      return matchesSearch && matchesCategory && matchesStock && matchesSale && matchesNew;
    });
  }, [allProducts, searchTerm, selectedCategory, selectedStock, selectedSale, selectedNew]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    const scroller = document.scrollingElement || document.documentElement || document.body;
    scroller.scrollTo({ top: 0, behavior: "smooth" });
  }, [safeCurrentPage]);

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
    if (!window.confirm("დარწმუნებული ხარ, რომ პროდუქტის წაშლა გინდა?")) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAllProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) { alert("წაშლა ვერ მოხერხდა"); }
  };

  const visible = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safeCurrentPage]);

  return (
    <div className={styles.adminWrapper}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
          უკან დაბრუნება
        </button>
        <div className={styles.titleSection}>
          <h1 className={styles.mainTitle}>პროდუქტების კატალოგი</h1>
          <span className={styles.productCount}>სულ: {filtered.length} პროდუქტი</span>
        </div>
      </header>

      <main className={styles.container}>
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="მოძებნე პროდუქტი..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.selectGroup}>
            <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={selectedStock} onChange={(e) => { setSelectedStock(e.target.value); setCurrentPage(1); }}>
              <option value="all">ყველა მარაგი</option>
              <option value="in">მარაგშია</option>
              <option value="out">ამოწურულია</option>
              <option value="hidden">დამალული</option>
            </select>
            <button onClick={handleRefresh} className={styles.refreshBtn} title="განახლება">
              <RefreshCw size={18} className={loading ? styles.spin : ""} />
            </button>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.productList}>
            {visible.map((p) => {
              const hasSale = typeof p.sale === "number" && p.sale > 0;
              const discounted = hasSale ? (p.price * (1 - p.sale / 100)).toFixed(2) : null;

              return (
                <div key={p.id} id={`product-${p.id}`} className={styles.productRow}>
                  <div className={styles.productInfo}>
                    <div className={styles.imgContainer}>
                      {p.images[0] ? (
                        <img src={p.images[0]} alt="" className={styles.mainImg} />
                      ) : (
                        <div className={styles.noImg}><Package size={20} /></div>
                      )}
                      {p.images.length > 1 && <span className={styles.imgBadge}>+{p.images.length - 1}</span>}
                    </div>

                    <div className={styles.details}>
                      <div className={styles.nameRow}>
                        <h3 className={styles.pName}>{p.name}</h3>
                        {p.is_new && <span className={styles.newBadge}>ახალი</span>}
                        {p.hide && <span className={styles.hiddenBadge}><EyeOff size={12} /></span>}
                      </div>
                      <p className={styles.pDesc}>{p.description}</p>
                      <div className={styles.meta}>
                        <span className={styles.categoryTag}><Tag size={12} /> {p.category}</span>
                        {p.in_stock ? (
                          <span className={styles.stockIn}><CheckCircle2 size={12} /> მარაგშია</span>
                        ) : (
                          <span className={styles.stockOut}><XCircle size={12} /> ამოწურულია</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.priceSection}>
                    {hasSale ? (
                      <>
                        <span className={styles.oldPrice}>{p.price} ₾</span>
                        <span className={styles.currentPrice}>{discounted} ₾</span>
                        <span className={styles.saleTag}>-{p.sale}%</span>
                      </>
                    ) : (
                      <span className={styles.currentPrice}>{p.price} ₾</span>
                    )}
                  </div>

                  <div className={styles.actionSection}>
                    <button onClick={() => handleEdit(p)} className={styles.editButton} title="რედაქტირება">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className={styles.deleteButton} title="წაშლა">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {visible.length === 0 && !loading && (
            <div className={styles.emptyState}>პროდუქტები ვერ მოიძებნა</div>
          )}
        </div>

        <div className={styles.footer}>
          {totalPages > 1 && (
            <EdgePager
              totalPages={totalPages}
              currentPage={safeCurrentPage}
              onChange={(page) => setCurrentPage(page)}
            />
          )}
          {loading && <div className={styles.loadingOverlay}>იტვირთება...</div>}
          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
      </main>
    </div>
  );
};

export default Menu;