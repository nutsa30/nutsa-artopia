import React, { useState, useEffect, useCallback } from "react";
import { ClipboardList, Check, Loader2 } from "lucide-react";
import styles from "./AdminRestock.module.css";
import { getAdminRestock, markRestockBrought } from "../../api";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ka-GE");
}

const PLACEHOLDER = "https://via.placeholder.com/48x48?text=?";

export default function AdminRestock() {
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [marking, setMarking] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(() => {
    setLoading(true);
    getAdminRestock()
      .then((data) => {
        setGroups(data?.groups ?? []);
        setTotal(data?.total ?? 0);
        setSelected(new Set());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── select helpers ── */
  const toggleItem = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (groupItems) => {
    const ids = groupItems.map((i) => i.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const isGroupAllSelected = (groupItems) =>
    groupItems.length > 0 && groupItems.every((i) => selected.has(i.id));

  const isGroupPartialSelected = (groupItems) =>
    groupItems.some((i) => selected.has(i.id)) && !isGroupAllSelected(groupItems);

  /* ── mark brought ── */
  const handleMarkBrought = async () => {
    if (selected.size === 0 || marking) return;
    setMarking(true);
    try {
      const ids = Array.from(selected);
      const res = await markRestockBrought(ids);
      showToast(`მოტანილად მოინიშნა: ${res.removed ?? ids.length} პროდუქტი`);
      fetchData();
    } catch {
      showToast("შეცდომა — სცადეთ ხელახლა");
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <Loader2 size={32} className={styles.spinnerIcon} />
        <span>იტვირთება...</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>
          <ClipboardList size={22} />
          <h1>მოსატანები</h1>
          {total > 0 && <span className={styles.totalBadge}>{total}</span>}
        </div>

        <button
          className={styles.broughtBtn}
          disabled={selected.size === 0 || marking}
          onClick={handleMarkBrought}
        >
          {marking ? (
            <><Loader2 size={16} className={styles.spinnerIcon} /> მონიშვნა...</>
          ) : (
            <><Check size={16} /> მოტანილია ({selected.size})</>
          )}
        </button>
      </div>

      {/* empty state */}
      {groups.length === 0 && (
        <div className={styles.emptyState}>
          <ClipboardList size={48} className={styles.emptyIcon} />
          <p>სია ცარიელია</p>
        </div>
      )}

      {/* grouped sections */}
      {groups.map((group) => {
        const allSel = isGroupAllSelected(group.items);
        const partSel = isGroupPartialSelected(group.items);
        return (
          <section key={group.supplier} className={styles.group}>
            <div className={styles.groupHeader}>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={allSel}
                  ref={(el) => { if (el) el.indeterminate = partSel; }}
                  onChange={() => toggleGroup(group.items)}
                  className={styles.checkbox}
                />
                <span className={styles.supplierName}>{group.supplier || "უცნობი მომწოდებელი"}</span>
              </label>
              <span className={styles.groupCount}>{group.items.length} პოზიცია</span>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thCheck}></th>
                    <th className={styles.thPhoto}>ფოტო</th>
                    <th>სახელი</th>
                    <th>ბარკოდი</th>
                    <th>კატეგორია</th>
                    <th>დამატების თარიღი</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr
                      key={item.id}
                      className={selected.has(item.id) ? styles.rowSelected : ""}
                      onClick={() => toggleItem(item.id)}
                    >
                      <td className={styles.tdCheck} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={selected.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                        />
                      </td>
                      <td className={styles.tdPhoto}>
                        <img
                          src={item.product_image || PLACEHOLDER}
                          alt={item.product_name}
                          className={styles.thumb}
                          onError={(e) => { e.target.src = PLACEHOLDER; }}
                        />
                      </td>
                      <td className={styles.tdName}>{item.product_name}</td>
                      <td className={styles.tdBarcode}>{item.product_barcode || "—"}</td>
                      <td className={styles.tdCategory}>{item.product_category || "—"}</td>
                      <td className={styles.tdDate}>{formatDate(item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
