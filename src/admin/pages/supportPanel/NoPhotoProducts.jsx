import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, X, Loader2, CheckCircle, Save, RefreshCw, Clock3, AlertTriangle } from "lucide-react";
import styles from "./NoPhotoProducts.module.css";
import { cld, IMG } from "../../../utils/cloudinary";
import {
  getNoPhotoProducts,
  getSupportCategories,
  uploadTempPhoto,
  finalizeProductPhotos,
  getPhotoStatus,
  replaceProductPhotoJobItem,
} from "../../api";

function handleAuthError(err) {
  if (err?.status === 401) {
    ["ADMIN_TOKEN", "ADMIN_ROLE"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    window.location.href = "/admin/login";
    return true;
  }
  return false;
}

function QuantityBadge({ qty }) {
  const value = Number(qty ?? 0);
  const className = value === 0 ? styles.qtyOut : value < 5 ? styles.qtyLow : styles.qtyOk;
  return <span className={`${styles.qtyBadge} ${className}`}>{value}</span>;
}

const isWorking = (job) => job && ["queued", "processing"].includes(job.status);

export default function NoPhotoProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ყველა");
  const [categories, setCategories] = useState(["ყველა"]);
  const [tempPhotos, setTempPhotos] = useState({});
  const [uploadingKeys, setUploadingKeys] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());
  const [doneMap, setDoneMap] = useState({});

  const fileInputRef = useRef();
  const uploadTargetRef = useRef(null);
  const searchTimer = useRef(null);
  const pollHandles = useRef({});

  const updateJob = useCallback((productId, job) => {
    setProducts((previous) => previous.map((product) => (
      product.id === productId ? { ...product, photo_job: job } : product
    )));
  }, []);

  const schedulePoll = useCallback((productId) => {
    clearTimeout(pollHandles.current[productId]);
    pollHandles.current[productId] = setTimeout(() => {
      getPhotoStatus(productId)
        .then((data) => {
          const job = data.job || null;
          if (data.status === "published") {
            setDoneMap((previous) => ({ ...previous, [productId]: true }));
            setTimeout(() => {
              setProducts((previous) => previous.filter((product) => product.id !== productId));
              setDoneMap((previous) => { const next = { ...previous }; delete next[productId]; return next; });
            }, 1800);
            return;
          }
          updateJob(productId, job);
          if (isWorking(job)) schedulePoll(productId);
        })
        .catch((error) => {
          if (!handleAuthError(error)) schedulePoll(productId);
        });
    }, 2500);
  }, [updateJob]);

  useEffect(() => () => {
    Object.values(pollHandles.current).forEach(clearTimeout);
    clearTimeout(searchTimer.current);
  }, []);

  useEffect(() => {
    getSupportCategories()
      .then((data) => {
        if (Array.isArray(data)) setCategories(data.includes("ყველა") ? data : ["ყველა", ...data]);
      })
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback((query, selectedCategory) => {
    setLoading(true);
    getNoPhotoProducts({ search: query, category: selectedCategory })
      .then((data) => {
        const nextProducts = data?.products ?? [];
        setProducts(nextProducts);
        nextProducts.forEach((product) => {
          if (isWorking(product.photo_job)) schedulePoll(product.id);
        });
      })
      .catch(handleAuthError)
      .finally(() => setLoading(false));
  }, [schedulePoll]);

  useEffect(() => {
    fetchProducts(search, category);
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchProducts(value, category), 400);
  };

  const openFilePicker = (productId, replacement = null) => {
    uploadTargetRef.current = { productId, replacement };
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    const target = uploadTargetRef.current;
    if (!file || !target) return;
    fileInputRef.current.value = "";
    const key = target.replacement ? `${target.productId}:${target.replacement.slot}` : `${target.productId}:new`;
    setUploadingKeys((previous) => new Set(previous).add(key));
    try {
      const photo = await uploadTempPhoto(target.productId, file);
      if (target.replacement) {
        const result = await replaceProductPhotoJobItem(target.replacement.batchId, target.replacement.slot, photo);
        updateJob(target.productId, result.job);
        schedulePoll(target.productId);
      } else {
        setTempPhotos((previous) => ({
          ...previous,
          [target.productId]: [...(previous[target.productId] || []), photo],
        }));
      }
    } catch (error) {
      if (!handleAuthError(error)) alert(error.message || "ატვირთვა ვერ მოხდა — სცადეთ ხელახლა");
    } finally {
      setUploadingKeys((previous) => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
    }
  };

  const removeTempPhoto = (productId, index) => {
    setTempPhotos((previous) => ({
      ...previous,
      [productId]: (previous[productId] || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const finalize = async (productId) => {
    const photos = tempPhotos[productId] || [];
    if (!photos.length) return;
    setSavingIds((previous) => new Set(previous).add(productId));
    try {
      const result = await finalizeProductPhotos(productId, photos);
      setTempPhotos((previous) => { const next = { ...previous }; delete next[productId]; return next; });
      updateJob(productId, result.job);
      schedulePoll(productId);
    } catch (error) {
      if (!handleAuthError(error)) alert(error.message || "შენახვა ვერ მოხდა — სცადეთ ხელახლა");
    } finally {
      setSavingIds((previous) => {
        const next = new Set(previous);
        next.delete(productId);
        return next;
      });
    }
  };

  return (
    <div className={styles.page}>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input className={styles.searchInput} type="text" placeholder="სახელი ან ბარკოდი..." value={search} onChange={handleSearchChange} />
        </div>
        <select className={styles.categorySelect} value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}><Loader2 size={28} className={styles.spinner} /><span>იტვირთება...</span></div>
      ) : products.length === 0 ? (
        <div className={styles.emptyState}><CheckCircle size={40} className={styles.emptyIcon} /><p>ყველა პროდუქტს ფოტო აქვს!</p></div>
      ) : (
        <>
          <p className={styles.countLine}>{products.length} პროდუქტი ფოტოს გარეშე</p>
          <div className={styles.list}>
            {products.map((product) => {
              const photos = tempPhotos[product.id] || [];
              const job = product.photo_job;
              const saving = savingIds.has(product.id);
              const done = !!doneMap[product.id];
              const newUploadKey = `${product.id}:new`;

              return (
                <div key={product.id} className={`${styles.card} ${done ? styles.cardDone : ""}`}>
                  <div className={styles.cardTop}>
                    <p className={styles.name}>{product.name}</p>
                    <div className={styles.metaRow}>
                      {product.barcode && <span className={styles.barcode}>{product.barcode}</span>}
                      <QuantityBadge qty={product.quantity} />
                      {product.category_name && <span className={styles.chip}>{product.category_name}</span>}
                      {product.supplier && <span className={`${styles.chip} ${styles.chipSupplier}`}>{product.supplier}</span>}
                    </div>
                  </div>

                  {job ? (
                    <div className={styles.jobPhotos}>
                      {job.items.map((item) => {
                        const replaceKey = `${product.id}:${item.slot}`;
                        const replacing = uploadingKeys.has(replaceKey);
                        const failed = ["failed", "rejected"].includes(item.status);
                        return (
                          <div key={item.slot} className={`${styles.jobPhoto} ${failed ? styles.jobPhotoFailed : ""}`}>
                            <div className={styles.slotLabel}>#{item.slot}</div>
                            <img src={cld(item.processed_url || item.original_url, { w: IMG.ADMIN })} alt={`${product.name} ${item.slot}`} className={`${styles.thumb} ${item.processed_url ? styles.cutoutThumb : ""}`} />
                            <span className={styles.itemStatus}>
                              {item.status === "done" ? "მზადაა" : item.status === "processing" ? "მუშავდება" : item.status === "queued" ? "რიგშია" : "შესაცვლელია"}
                            </span>
                            {failed && (
                              <button className={styles.replaceBtn} onClick={() => openFilePicker(product.id, { batchId: job.id, slot: item.slot })} disabled={replacing}>
                                {replacing ? <Loader2 size={13} className={styles.spinner} /> : <RefreshCw size={13} />} შეცვლა
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.photoRow}>
                      {photos.map((photo, index) => (
                        <div key={photo.url} className={styles.thumbWrap}>
                          <img src={cld(photo.url, { w: IMG.ADMIN })} alt="" className={styles.thumb} loading="lazy" />
                          <button className={styles.removeThumb} onClick={() => removeTempPhoto(product.id, index)} title="ამოღება"><X size={10} /></button>
                        </div>
                      ))}
                      {photos.length < 6 && (
                        <button className={styles.addPhotoBtn} onClick={() => openFilePicker(product.id)} disabled={uploadingKeys.has(newUploadKey)}>
                          {uploadingKeys.has(newUploadKey) ? <Loader2 size={18} className={styles.spinner} /> : <><Plus size={18} /><span>ფოტო</span></>}
                        </button>
                      )}
                    </div>
                  )}

                  <div className={styles.cardAction}>
                    {done ? (
                      <div className={styles.doneLabel}><CheckCircle size={14} /><span>გამოქვეყნებულია</span></div>
                    ) : job?.status === "ready" ? (
                      <div className={styles.reviewLabel}><Clock3 size={14} /><span>ელოდება ადმინისტრატორის შემოწმებას</span></div>
                    ) : job?.status === "failed" ? (
                      <div className={styles.errorLabel}><AlertTriangle size={14} /><span>შეცვალეთ მონიშნული ფოტო</span></div>
                    ) : isWorking(job) ? (
                      <div className={styles.processingLabel}><Loader2 size={14} className={styles.spinner} /><span>მუშავდება {job.completed}/{job.total}</span></div>
                    ) : photos.length > 0 ? (
                      <button className={styles.saveBtn} onClick={() => finalize(product.id)} disabled={saving}>
                        {saving ? <Loader2 size={14} className={styles.spinner} /> : <Save size={14} />} შენახვა ({photos.length})
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
