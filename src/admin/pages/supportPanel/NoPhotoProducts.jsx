import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, X, Loader2, CheckCircle, Save } from "lucide-react";
import styles from "./NoPhotoProducts.module.css";
import {
  getNoPhotoProducts,
  getSupportCategories,
  uploadTempPhoto,
  finalizeProductPhotos,
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

  /* { [productId]: [{url, public_id}, ...] } */
  const [tempPhotos, setTempPhotos] = useState({});
  /* product IDs where a temp-upload is in flight */
  const [uploadingIds, setUploadingIds] = useState(new Set());
  /* product IDs after finalize — polling */
  const [processingIds, setProcessingIds] = useState(new Set());
  /* product IDs that finished — show briefly then remove */
  const [doneMap, setDoneMap] = useState({});

  const fileInputRef = useRef();
  const uploadTargetId = useRef(null);
  const searchTimer = useRef(null);
  const pollHandles = useRef({});

  useEffect(() => {
    return () => Object.values(pollHandles.current).forEach(clearTimeout);
  }, []);

  useEffect(() => {
    getSupportCategories()
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data.includes("ყველა") ? data : ["ყველა", ...data]);
        }
      })
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback((q, cat) => {
    setLoading(true);
    getNoPhotoProducts({ search: q, category: cat })
      .then((data) => {
        setProducts(data?.products ?? []);
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

  const schedulePoll = useCallback((productId) => {
    clearTimeout(pollHandles.current[productId]);
    pollHandles.current[productId] = setTimeout(() => pollOnce(productId), 2000);
  }, []); // eslint-disable-line

  const pollOnce = useCallback(
    (productId) => {
      getPhotoStatus(productId)
        .then((data) => {
          if (data.status === "done") {
            setDoneMap((prev) => ({ ...prev, [productId]: data.image_url || true }));
            setProcessingIds((prev) => {
              const next = new Set(prev);
              next.delete(productId);
              return next;
            });
            setTimeout(() => {
              setProducts((prev) => prev.filter((p) => p.id !== productId));
              setTempPhotos((prev) => { const n = { ...prev }; delete n[productId]; return n; });
              setDoneMap((prev) => { const n = { ...prev }; delete n[productId]; return n; });
            }, 2500);
          } else if (data.status === "processing") {
            schedulePoll(productId);
          } else {
            setProcessingIds((prev) => {
              const next = new Set(prev);
              next.delete(productId);
              return next;
            });
          }
        })
        .catch(() => schedulePoll(productId));
    },
    [schedulePoll]
  );

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchProducts(val, category), 400);
  };

  const handleCategoryChange = (e) => setCategory(e.target.value);

  const handleUploadClick = (productId) => {
    if (uploadingIds.has(productId)) return;
    uploadTargetId.current = productId;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const targetId = uploadTargetId.current;
    if (!file || !targetId) return;
    fileInputRef.current.value = "";

    setUploadingIds((prev) => new Set(prev).add(targetId));
    try {
      const result = await uploadTempPhoto(targetId, file);
      setTempPhotos((prev) => ({
        ...prev,
        [targetId]: [
          ...(prev[targetId] || []),
          { url: result.url, public_id: result.public_id },
        ],
      }));
    } catch {
      alert("ატვირთვა ვერ მოხდა — სცადეთ ხელახლა");
    } finally {
      setUploadingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  const handleRemovePhoto = (productId, idx) => {
    setTempPhotos((prev) => ({
      ...prev,
      [productId]: (prev[productId] || []).filter((_, i) => i !== idx),
    }));
  };

  const handleFinalize = async (productId) => {
    const urls = (tempPhotos[productId] || []).map((p) => p.url);
    if (!urls.length) return;

    setProcessingIds((prev) => new Set(prev).add(productId));
    try {
      await finalizeProductPhotos(productId, urls);
      schedulePoll(productId);
    } catch {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      alert("შენახვა ვერ მოხდა — სცადეთ ხელახლა");
    }
  };

  return (
    <div className={styles.page}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

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
              const photos = tempPhotos[p.id] || [];
              const isUploading = uploadingIds.has(p.id);
              const isProcessing = processingIds.has(p.id);
              const isDone = !!doneMap[p.id];

              return (
                <div
                  key={p.id}
                  className={`${styles.card} ${isDone ? styles.cardDone : ""}`}
                >
                  {/* product info */}
                  <div className={styles.cardTop}>
                    <p className={styles.name}>{p.name}</p>
                    <div className={styles.metaRow}>
                      {p.barcode && (
                        <span className={styles.barcode}>{p.barcode}</span>
                      )}
                      <QuantityBadge qty={p.quantity} />
                      {p.category_name && (
                        <span className={styles.chip}>{p.category_name}</span>
                      )}
                      {p.supplier && (
                        <span className={`${styles.chip} ${styles.chipSupplier}`}>
                          {p.supplier}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* photo thumbnails + add button */}
                  <div className={styles.photoRow}>
                    {photos.map((photo, idx) => (
                      <div key={photo.url} className={styles.thumbWrap}>
                        <img src={photo.url} alt="" className={styles.thumb} />
                        {!isProcessing && !isDone && (
                          <button
                            className={styles.removeThumb}
                            onClick={() => handleRemovePhoto(p.id, idx)}
                            title="ამოღება"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                    {!isProcessing && !isDone && photos.length < 6 && (
                      <button
                        className={styles.addPhotoBtn}
                        onClick={() => handleUploadClick(p.id)}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 size={18} className={styles.spinner} />
                        ) : (
                          <>
                            <Plus size={18} />
                            <span>ფოტო</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* action */}
                  <div className={styles.cardAction}>
                    {isProcessing ? (
                      <div className={styles.processingLabel}>
                        <Loader2 size={14} className={styles.spinner} />
                        <span>მუშავდება...</span>
                      </div>
                    ) : isDone ? (
                      <div className={styles.doneLabel}>
                        <CheckCircle size={14} />
                        <span>დამატებულია</span>
                      </div>
                    ) : photos.length > 0 ? (
                      <button
                        className={styles.saveBtn}
                        onClick={() => handleFinalize(p.id)}
                      >
                        <Save size={14} />
                        შენახვა ({photos.length})
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
