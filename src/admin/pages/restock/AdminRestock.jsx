import React, { useState, useEffect, useCallback } from "react";
import { ClipboardList, Check, Loader2, Download } from "lucide-react";
import styles from "./AdminRestock.module.css";
import { getAdminRestock, markRestockBrought, exportRestockBySupplier } from "../../api";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ka-GE");
}

function CostPrice({ value }) {
  if (value == null) return <span className={styles.noData}>—</span>;
  return <span className={styles.costPrice}>₾{Number(value).toFixed(2)}</span>;
}

function QuantityBadge({ qty }) {
  const n = Number(qty ?? 0);
  const cls = n === 0 ? styles.qtyOut : n < 5 ? styles.qtyLow : styles.qtyOk;
  return <span className={`${styles.qtyBadge} ${cls}`}>{n}</span>;
}

const PLACEHOLDER = "https://via.placeholder.com/48x48?text=?";

export default function AdminRestock() {
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [marking, setMarking] = useState(false);
  const [exporting, setExporting] = useState(new Set());
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

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const isGroupAllSelected = (items) =>
    items.length > 0 && items.every((i) => selected.has(i.id));

  const isGroupPartialSelected = (items) =>
    items.some((i) => selected.has(i.id)) && !isGroupAllSelected(items);

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

  const handleExport = async (supplier) => {
    if (exporting.has(supplier)) return;
    setExporting((prev) => new Set(prev).add(supplier));
    try {
      await exportRestockBySupplier(supplier);
    } catch {
      showToast("ექსპორტი ვერ მოხდა — სცადეთ ხელახლა");
    } finally {
      setExporting((prev) => {
        const next = new Set(prev);
        next.delete(supplier);
        return next;
      });
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
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* header */}
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
            <><Loader2 size={16} className={styles.spinnerIcon} />მონიშვნა...</>
          ) : (
            <><Check size={16} />მოტანილია {selected.size > 0 && `(${selected.size})`}</>
          )}
        </button>
      </div>

      {groups.length === 0 && (
        <div className={styles.emptyState}>
          <ClipboardList size={48} className={styles.emptyIcon} />
          <p>სია ცარიელია</p>
        </div>
      )}

      {groups.map((group) => {
        const allSel = isGroupAllSelected(group.items);
        const partSel = isGroupPartialSelected(group.items);
        const isExp = exporting.has(group.supplier);
        return (
          <section key={group.supplier} className={styles.group}>
            {/* group header */}
            <div className={styles.groupHeader}>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={allSel}
                  ref={(el) => { if (el) el.indeterminate = partSel; }}
                  onChange={() => toggleGroup(group.items)}
                />
                <span className={styles.supplierName}>
                  {group.supplier || "უცნობი მომწოდებელი"}
                </span>
              </label>
              <div className={styles.groupActions}>
                <span className={styles.groupCount}>{group.items.length} პოზიცია</span>
                <button
                  className={styles.exportBtn}
                  disabled={isExp}
                  onClick={() => handleExport(group.supplier)}
                  title="Excel-ში ჩამოტვირთვა"
                >
                  {isExp
                    ? <Loader2 size={15} className={styles.spinnerIcon} />
                    : <Download size={15} />}
                  <span className={styles.exportBtnLabel}>Excel</span>
                </button>
              </div>
            </div>

            {/* ── desktop table ── */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thCheck}></th>
                    <th className={styles.thPhoto}>ფოტო</th>
                    <th className={styles.thName}>სახელი</th>
                    <th className={styles.thBarcode}>ბარკოდი</th>
                    <th className={styles.thCategory}>კატეგორია</th>
                    <th className={styles.thQty}>მარაგი</th>
                    <th className={styles.thCost}>თვითღირებ.</th>
                    <th className={styles.thDate}>თარიღი</th>
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
                          src={item.product_image1 || PLACEHOLDER}
                          alt={item.product_name}
                          className={styles.thumb}
                          onError={(e) => { e.target.src = PLACEHOLDER; }}
                        />
                      </td>
                      <td className={styles.tdName}>{item.product_name}</td>
                      <td className={styles.tdBarcode}>{item.product_barcode || "—"}</td>
                      <td className={styles.tdCategory}>{item.product_category || "—"}</td>
                      <td className={styles.tdQty}>
                        <QuantityBadge qty={item.product_quantity} />
                      </td>
                      <td className={styles.tdCost}>
                        <CostPrice value={item.product_cost_price} />
                      </td>
                      <td className={styles.tdDate}>{formatDate(item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── mobile cards ── */}
            <div className={styles.cardList}>
              {group.items.map((item) => {
                const isSel = selected.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`${styles.mobileCard} ${isSel ? styles.mobileCardSelected : ""}`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <div className={styles.mobileCardTop}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSel}
                        onChange={() => toggleItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <img
                        src={item.product_image1 || PLACEHOLDER}
                        alt={item.product_name}
                        className={styles.mobileThumb}
                        onError={(e) => { e.target.src = PLACEHOLDER; }}
                      />
                      <div className={styles.mobileInfo}>
                        <p className={styles.mobileName}>{item.product_name}</p>
                        {item.product_barcode && (
                          <p className={styles.mobileBarcode}>{item.product_barcode}</p>
                        )}
                      </div>
                    </div>
                    <div className={styles.mobileCardMeta}>
                      {item.product_category && (
                        <span className={styles.metaChip}>{item.product_category}</span>
                      )}
                      <span className={styles.metaChip}>
                        მარაგი: <QuantityBadge qty={item.product_quantity} />
                      </span>
                    </div>
                    <div className={styles.mobileCardBottom}>
                      <div className={styles.mobileCostWrap}>
                        <span className={styles.mobileCostLabel}>თვითღ.</span>
                        <CostPrice value={item.product_cost_price} />
                      </div>
                      <span className={styles.mobileDate}>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
