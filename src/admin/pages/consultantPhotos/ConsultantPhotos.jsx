import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Image as ImageIcon, Loader2, Search, Trash2 } from "lucide-react";
import { cld, IMG } from "../../../utils/cloudinary";
import {
  deleteConsultantProductPhoto,
  getConsultantPhotosAdmin,
  publishConsultantPhotoJob,
  rejectConsultantPhotoJobItem,
} from "../../api";
import styles from "./ConsultantPhotos.module.css";

const workingStatuses = new Set(["queued", "processing"]);

export default function ConsultantPhotos() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [search, setSearch] = useState("");
  const timerRef = useRef();

  const load = useCallback(async (query = search) => {
    setLoading(true);
    try {
      const data = await getConsultantPhotosAdmin({ search: query });
      setProducts(data.products || []);
    } catch (error) {
      alert(error.message || "ფოტოების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const hasWorking = products.some((product) => workingStatuses.has(product.job?.status));
    if (!hasWorking) return undefined;
    const handle = setInterval(() => load(search), 4000);
    return () => clearInterval(handle);
  }, [products, load, search]);

  const onSearch = (event) => {
    const value = event.target.value;
    setSearch(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => load(value), 350);
  };

  const approve = async (batchId) => {
    if (!window.confirm("ყველა ფოტო შემოწმებულია და საიტზე გამოქვეყნდეს?")) return;
    setBusyKey(`publish:${batchId}`);
    try {
      await publishConsultantPhotoJob(batchId);
      await load(search);
    } catch (error) {
      alert(error.message || "გამოქვეყნება ვერ მოხერხდა");
    } finally {
      setBusyKey("");
    }
  };

  const rejectPending = async (batchId, slot) => {
    if (!window.confirm(`ფოტო #${slot} უარვყოთ? კონსულტანტს მისი ჩანაცვლება მოუწევს.`)) return;
    const key = `reject:${batchId}:${slot}`;
    setBusyKey(key);
    try {
      await rejectConsultantPhotoJobItem(batchId, slot);
      await load(search);
    } catch (error) {
      alert(error.message || "ფოტოს უარყოფა ვერ მოხერხდა");
    } finally {
      setBusyKey("");
    }
  };

  const removePublished = async (productId, slot) => {
    if (!window.confirm(`პროდუქტის ფოტო #${slot} ბაზიდან წაიშალოს?`)) return;
    const key = `delete:${productId}:${slot}`;
    setBusyKey(key);
    try {
      const result = await deleteConsultantProductPhoto(productId, slot);
      if (result.returns_to_support) {
        alert("ფოტო წაიშალა და პროდუქტი დაბრუნდა კონსულტანტის ფოტოს გარეშე სიაში.");
      }
      await load(search);
    } catch (error) {
      alert(error.message || "ფოტოს წაშლა ვერ მოხერხდა");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1>კონსულტანტის ატვირთული ფოტოები</h1>
          <p>ახალი ფოტოები საიტზე მხოლოდ თქვენი შემოწმებისა და დადასტურების შემდეგ გამოჩნდება.</p>
        </div>
        <span className={styles.total}>{products.length} პროდუქტი</span>
      </div>

      <div className={styles.searchWrap}>
        <Search size={18} />
        <input value={search} onChange={onSearch} placeholder="პროდუქტი ან ბარკოდი..." />
      </div>

      {loading ? (
        <div className={styles.loading}><Loader2 className={styles.spinner} /> იტვირთება...</div>
      ) : products.length === 0 ? (
        <div className={styles.empty}><ImageIcon size={36} /><span>ფოტოები ვერ მოიძებნა</span></div>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <article key={product.product_id} className={styles.card}>
              <header className={styles.cardHeader}>
                <div>
                  <h2>{product.name}</h2>
                  <p>{product.barcode || "ბარკოდის გარეშე"} · მარაგი {product.quantity}</p>
                </div>
                {product.job && <span className={`${styles.status} ${styles[`status_${product.job.status}`] || ""}`}>{product.job.status}</span>}
              </header>

              {product.job && (
                <section className={styles.reviewSection}>
                  <div className={styles.sectionTitle}>
                    <strong>ახალი პარტია</strong>
                    <span>{product.job.completed}/{product.job.total} დამუშავებულია</span>
                  </div>
                  <div className={styles.photos}>
                    {product.job.items.map((item) => {
                      const key = `reject:${product.job.id}:${item.slot}`;
                      return (
                        <div key={item.slot} className={`${styles.photoCard} ${["failed", "rejected"].includes(item.status) ? styles.photoBad : ""}`}>
                          <span className={styles.slot}>#{item.slot}</span>
                          <img className={styles.cutout} src={cld(item.processed_url || item.original_url, { w: IMG.ADMIN })} alt={`${product.name} ${item.slot}`} />
                          <small>{item.status}</small>
                          {item.status === "done" && (
                            <button className={styles.rejectBtn} onClick={() => rejectPending(product.job.id, item.slot)} disabled={busyKey === key}>
                              {busyKey === key ? <Loader2 size={14} className={styles.spinner} /> : <Trash2 size={14} />} უარყოფა
                            </button>
                          )}
                          {["failed", "rejected"].includes(item.status) && (
                            <div className={styles.warning}><AlertTriangle size={13} /> კონსულტანტმა უნდა შეცვალოს</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {product.job.status === "ready" && (
                    <button className={styles.approveBtn} onClick={() => approve(product.job.id)} disabled={busyKey === `publish:${product.job.id}`}>
                      {busyKey === `publish:${product.job.id}` ? <Loader2 size={16} className={styles.spinner} /> : <CheckCircle size={16} />}
                      შემოწმებულია — გამოქვეყნება
                    </button>
                  )}
                </section>
              )}

              {product.photos.length > 0 && (
                <section>
                  <div className={styles.sectionTitle}><strong>საიტზე არსებული ფოტოები</strong><span>{product.photos.length}</span></div>
                  <div className={styles.photos}>
                    {product.photos.map((photo) => {
                      const key = `delete:${product.product_id}:${photo.slot}`;
                      return (
                        <div key={`${photo.slot}:${photo.url}`} className={styles.photoCard}>
                          <span className={styles.slot}>#{photo.slot}</span>
                          <img className={styles.cutout} src={cld(photo.url, { w: IMG.ADMIN })} alt={`${product.name} ${photo.slot}`} />
                          <button className={styles.deleteBtn} onClick={() => removePublished(product.product_id, photo.slot)} disabled={busyKey === key}>
                            {busyKey === key ? <Loader2 size={14} className={styles.spinner} /> : <Trash2 size={14} />} წაშლა
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
