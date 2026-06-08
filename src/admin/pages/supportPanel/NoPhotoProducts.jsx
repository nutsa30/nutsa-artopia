import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Upload, Loader2, CheckCircle } from "lucide-react";
import styles from "./NoPhotoProducts.module.css";
import {
  getNoPhotoProducts,
  getSupportCategories,
  uploadProductPhoto,
  getPhotoStatus,
} from "../../api";

function QuantityBadge({ qty }) {
  const n = Number(qty ?? 0);
  const cls = n === 0 ? styles.qtyOut : n < 5 ? styles.qtyLow : styles.qtyOk;
  return <span className={`${styles.qtyBadge} ${cls}`}>{n}</span>;
}

export default function NoPhotoProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ყველა");
  const [categories, setCategories] = useState(["ყველა"]);

  /* ids currently being processed (upload in progress or server-side) */
  const [processingIds, setProcessingIds] = useState(new Set());
  /* ids that just finished — show preview image briefly */
  const [doneMap, setDoneMap] = useState({});

  const fileInputRef = useRef();
  const uploadTargetId = useRef(null);
  const searchTimer = useRef(null);
  /* { [productId]: timeoutHandle } */
  const pollHandles = useRef({});

  /* ── cleanup polls on unmount ── */
  useEffect(() => {
    return () => {
      Object.values(pollHandles.current).forEach(clearTimeout);
    };
  }, []);

  /* ── categories ── */
  useEffect(() => {
    getSupportCategories()
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data.includes("ყველა") ? data : ["ყველა", ...data]);
        }
      })
      .catch(() => {});
  }, []);

  /* ── fetch no-photo list ── */
  const fetchProducts = useCallback((q, cat) => {
    setLoading(true);
    getNoPhotoProducts({ search: q, category: cat })
      .then((data) => {
        setProducts(data?.products ?? []);
        /* mark initially-processing ids and start polling them */
        const initProcessing = new Set(data?.processing ?? []);
        setProcessingIds(initProcessing);
        initProcessing.forEach((id) => schedulePoll(id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchProducts(search, category);
  }, [category]); // eslint-disable-line

  /* ── polling ── */
  const schedulePoll = useCallback((productId) => {
    clearTimeout(pollHandles.current[productId]);
    pollHandles.current[productId] = setTimeout(() => pollOnce(productId), 2000);
  }, []); // eslint-disable-line

  const pollOnce = useCallback((productId) => {
    getPhotoStatus(productId)
      .then((data) => {
        if (data.status === "done") {
          /* show preview, then remove card */
          setDoneMap((prev) => ({ ...prev, [productId]: data.image_url }));
          setProcessingIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
          setTimeout(() => {
            setProducts((prev) => prev.filter((p) => p.id !== productId));
            setDoneMap((prev) => {
              const next = { ...prev };
              delete next[productId];
              return next;
            });
          }, 2500);
        } else if (data.status === "processing") {
          schedulePoll(productId);
        } else {
          /* "none" — server cancelled, remove from processing */
          setProcessingIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
        }
      })
      .catch(() => schedulePoll(productId));
  }, [schedulePoll]);

  /* ── search debounce ── */
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchProducts(val, category), 400);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
  };

  /* ── upload ── */
  const handleUploadClick = (productId) => {
    if (processingIds.has(productId)) return;
    uploadTargetId.current = productId;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const targetId = uploadTargetId.current;
    if (!file || !targetId) return;
    fileInputRef.current.value = "";

    /* optimistically mark as processing */
    setProcessingIds((prev) => new Set(prev).add(targetId));

    try {
      await uploadProductPhoto(targetId, file);
      schedulePoll(targetId);
    } catch {
      /* revert on error */
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      alert("ატვირთვა ვერ მოხდა — სცადეთ ხელახლა");
    }
  };

  return (
    <div className={styles.page}>
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* toolbar */}
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

      {/* list */}
      {loading ? (
        <div className={styles.loadingWrap}>
          <Loader2 size={28} className={styles.spinner} />
          <span>იტვირთება...</span>
        </div>
      ) : products.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle size={40} className={styles.emptyIcon} />
          <p>ყველა პროდუქტს ფოტო აქვს!</p>
        </div>
      ) : (
        <>
          <p className={styles.countLine}>{products.length} პროდუქტი ფოტოს გარეშე</p>
          <div className={styles.list}>
            {products.map((p) => {
              const isProcessing = processingIds.has(p.id);
              const doneUrl = doneMap[p.id];
              return (
                <div
                  key={p.id}
                  className={`${styles.card} ${doneUrl ? styles.cardDone : ""}`}
                >
                  {/* photo slot */}
                  <div className={styles.photoSlot}>
                    {doneUrl ? (
                      <>
                        <img src={doneUrl} alt={p.name} className={styles.previewImg} />
                        <div className={styles.doneOverlay}>
                          <CheckCircle size={28} />
                        </div>
                      </>
                    ) : isProcessing ? (
                      <div className={styles.processingOverlay}>
                        <Loader2 size={26} className={styles.spinner} />
                      </div>
                    ) : (
                      <button
                        className={styles.uploadZone}
                        onClick={() => handleUploadClick(p.id)}
                        title="ფოტოს ატვირთვა"
                      >
                        <Upload size={20} />
                        <span>ატვირთვა</span>
                      </button>
                    )}
                  </div>

                  {/* info */}
                  <div className={styles.info}>
                    <p className={styles.name}>{p.name}</p>
                    <div className={styles.metaRow}>
                      {p.barcode && (
                        <span className={styles.barcode}>{p.barcode}</span>
                      )}
                      <QuantityBadge qty={p.quantity} />
                    </div>
                    <div className={styles.metaRow}>
                      {p.category_name && (
                        <span className={styles.chip}>{p.category_name}</span>
                      )}
                      {p.supplier && (
                        <span className={`${styles.chip} ${styles.chipSupplier}`}>{p.supplier}</span>
                      )}
                    </div>
                  </div>

                  {/* upload button (mobile-friendly) */}
                  {!isProcessing && !doneUrl && (
                    <button
                      className={styles.uploadBtn}
                      onClick={() => handleUploadClick(p.id)}
                    >
                      <Upload size={15} />
                      ფოტო
                    </button>
                  )}
                  {isProcessing && (
                    <div className={styles.processingLabel}>
                      <Loader2 size={14} className={styles.spinner} />
                      <span>მუშავდება...</span>
                    </div>
                  )}
                  {doneUrl && (
                    <div className={styles.doneLabel}>
                      <CheckCircle size={14} />
                      <span>დამატებულია</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
