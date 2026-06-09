import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, LogOut, Plus, Check, ChevronLeft, ChevronRight, ShoppingBag, ImageOff } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./SupportPanel.module.css";
import NoPhotoProducts from "./NoPhotoProducts";
import {
  getSupportProducts,
  getSupportCategories,
  getSupportRestock,
  addToRestock,
  removeFromRestock,
} from "../../api";

const PLACEHOLDER = "https://via.placeholder.com/120x120?text=No+Image";
const LIMIT = 30;

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ka-GE");
}

export default function SupportPanel() {
  const { tab: routeTab } = useParams();
  const navigate = useNavigate();
  const tab = routeTab === "no-photo" ? "nophoto" : "products";
  const setTab = (newTab) =>
    navigate(`/admin/support-panel/${newTab === "nophoto" ? "no-photo" : "products"}`, { replace: false });
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ყველა");
  const [categories, setCategories] = useState(["ყველა"]);

  const [restock, setRestock] = useState([]);
  const [restockIds, setRestockIds] = useState(new Set());

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [adding, setAdding] = useState(new Set());
  const [removing, setRemoving] = useState(new Set());

  const searchTimer = useRef(null);

  /* ── categories ── */
  useEffect(() => {
    getSupportCategories()
      .then((data) => {
        if (Array.isArray(data)) {
          const list = data.includes("ყველა") ? data : ["ყველა", ...data];
          setCategories(list);
        }
      })
      .catch(() => {});
  }, []);

  /* ── restock list ── */
  const fetchRestock = useCallback(() => {
    getSupportRestock()
      .then((data) => {
        const items = data?.items ?? [];
        setRestock(items);
        setRestockIds(new Set(items.map((r) => r.product_id)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRestock();
  }, [fetchRestock]);

  /* ── products ── */
  const fetchProducts = useCallback((q, cat, pg) => {
    setLoadingProducts(true);
    getSupportProducts({ search: q, category: cat, page: pg, limit: LIMIT })
      .then((data) => {
        setProducts(data?.items ?? []);
        setTotal(data?.total ?? 0);
        setPages(data?.pages ?? 1);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    fetchProducts(search, category, page);
  }, [page, category]); // eslint-disable-line

  /* debounce search */
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchProducts(val, category, 1);
    }, 400);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  /* ── add to restock ── */
  const handleAdd = async (productId) => {
    if (adding.has(productId) || restockIds.has(productId)) return;
    setAdding((prev) => new Set(prev).add(productId));
    try {
      await addToRestock(productId);
      fetchRestock();
    } catch (err) {
      if (err.status !== 409) {
        alert("შეცდომა: " + (err.message || "ვერ დაემატა"));
      } else {
        fetchRestock();
      }
    } finally {
      setAdding((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  /* ── remove from restock ── */
  const handleRemove = async (restockItemId) => {
    if (removing.has(restockItemId)) return;
    setRemoving((prev) => new Set(prev).add(restockItemId));
    try {
      await removeFromRestock(restockItemId);
      fetchRestock();
    } catch {
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(restockItemId);
        return next;
      });
    }
  };

  /* ── logout ── */
  const handleLogout = () => {
    ["ADMIN_TOKEN", "ADMIN_ROLE"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    window.location.href = "/admin/login";
  };

  return (
    <div className={styles.page}>
      {/* ── header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <ShoppingBag size={22} className={styles.headerIcon} />
          <span className={styles.headerTitle}>Artopia — კონსულტანტის პანელი</span>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={16} />
          გამოსვლა
        </button>
      </header>

      {/* ── tabs ── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "products" ? styles.tabActive : ""}`}
          onClick={() => setTab("products")}
        >
          <ShoppingBag size={15} />
          პროდუქტების სია
        </button>
        <button
          className={`${styles.tab} ${tab === "nophoto" ? styles.tabActive : ""}`}
          onClick={() => setTab("nophoto")}
        >
          <ImageOff size={15} />
          ფოტოების გარეშე
        </button>
      </div>

      {tab === "nophoto" ? (
        <div className={styles.noPhotoWrap}>
          <NoPhotoProducts />
        </div>
      ) : (
      <div className={styles.body}>
        {/* ── main area ── */}
        <main className={styles.main}>
          {/* search + filter */}
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="სახელი ან ბარკოდი..."
                value={search}
                onChange={handleSearchChange}
              />
            </div>
            <select
              className={styles.categorySelect}
              value={category}
              onChange={handleCategoryChange}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* product grid */}
          {loadingProducts ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <span>იტვირთება...</span>
            </div>
          ) : products.length === 0 ? (
            <div className={styles.emptyState}>პროდუქტები ვერ მოიძებნა</div>
          ) : (
            <div className={styles.grid}>
              {products.map((p) => {
                const inList = restockIds.has(p.id);
                const isAdding = adding.has(p.id);
                return (
                  <div key={p.id} className={styles.card}>
                    <div className={styles.cardImg}>
                      <img
                        src={p.image_url1 || PLACEHOLDER}
                        alt={p.name}
                        onError={(e) => { e.target.src = PLACEHOLDER; }}
                      />
                    </div>
                    <div className={styles.cardBody}>
                      <p className={styles.cardName}>{p.name}</p>
                      {p.barcode && (
                        <p className={styles.cardMeta}>{p.barcode}</p>
                      )}
                      <div className={styles.cardTags}>
                        {p.category_name && (
                          <span className={styles.tag}>{p.category_name}</span>
                        )}
                        {p.supplier && (
                          <span className={`${styles.tag} ${styles.tagSupplier}`}>{p.supplier}</span>
                        )}
                      </div>
                      <button
                        className={`${styles.addBtn} ${inList ? styles.addBtnDone : ""}`}
                        onClick={() => handleAdd(p.id)}
                        disabled={inList || isAdding}
                      >
                        {inList ? (
                          <><Check size={14} /> სიაში ✓</>
                        ) : isAdding ? (
                          "ემატება..."
                        ) : (
                          <><Plus size={14} /> სიაში დამატება</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* pagination */}
          {pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span className={styles.pageInfo}>{page} / {pages}</span>
              <button
                className={styles.pageBtn}
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </main>

        {/* ── sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            მოსატანი სია
            <span className={styles.sidebarCount}>{restock.length}</span>
          </div>

          {restock.length === 0 ? (
            <div className={styles.sidebarEmpty}>სია ცარიელია</div>
          ) : (
            <ul className={styles.restockList}>
              {restock.map((item) => (
                <li key={item.id} className={styles.restockItem}>
                  <img
                    className={styles.restockThumb}
                    src={item.product_image1 || PLACEHOLDER}
                    alt={item.product_name}
                    onError={(e) => { e.target.src = PLACEHOLDER; }}
                  />
                  <div className={styles.restockInfo}>
                    <p className={styles.restockName}>{item.product_name}</p>
                    {item.product_supplier && (
                      <p className={styles.restockSub}>{item.product_supplier}</p>
                    )}
                  </div>
                  <button
                    className={styles.removeBtn}
                    disabled={removing.has(item.id)}
                    onClick={() => handleRemove(item.id)}
                    title="სიიდან ამოღება"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
      )}
    </div>
  );
}
