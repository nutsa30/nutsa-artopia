import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  LayoutGrid,
  FileText,
  Ticket,
  Package,
  Mail,
  LogOut,
  ChevronDown,
  Menu,
  Image as ImageIcon,
  BarChart2,
  Upload,
  ClipboardList,
  Tags,
} from 'lucide-react';
import styles from "./AdminNavbar.module.css";
import artopiaLogo from "../assets/IMG_4970.JPG";
import { apiJson, syncOptimo, getOptimoStatus, uploadStockExcel } from "../api";
import { syncSummary } from "../../utils/syncSummary";

const AdminNavbar = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const dropdownRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onLogout = async () => {
    try {
      await apiJson("/admin/logout", "POST", {});
    } catch { /* Logout clears local credentials even if the server is unavailable. */ }
    ["ADMIN_TOKEN", "ADMIN_ROLE"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    window.location.href = "/";
  };

const onSyncOptimo = async (dryRun = false) => {
  if (loading) return;
  setLoading(true);
  try {
    const response = await syncOptimo({ dryRun });
    alert(`${response.message}\n${syncSummary(response)}`);
    if (dryRun) {
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "optimo-sync-preview.json"; link.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    alert("სინქრონიზაციის შეცდომა: " + (err?.message || "სერვერთან კავშირი ვერ დამყარდა"));
  } finally {
    setLoading(false); setOpen(false);
  }
};

  const onSyncStatus = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { runs } = await getOptimoStatus();
      alert(runs?.length ? runs.slice(0, 5).map(run => `${run.created_at} (UTC)\n${syncSummary(run)}`).join("\n\n")
        : "სინქრონიზაციის ანგარიში ჯერ არ არის.");
    } catch (error) { alert(error.message || "ანგარიში ვერ ჩაიტვირთა"); }
    finally { setLoading(false); }
  };

  const onUploadClick = () => {
    if (uploadLoading) return;
    fileInputRef.current.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileInputRef.current.value = "";

    setUploadLoading(true);
    try {
      const data = await uploadStockExcel(file);
      alert(
        `Excel ატვირთვა დასრულდა!\n\n` +
        `თვითღირებულება განახლდა: ${data.updated_cost_price} პროდუქტი\n` +
        `მომწოდებელი განახლდა: ${data.updated_supplier} პროდუქტი\n` +
        `დამთხვევა ვერ მოიძებნა: ${data.no_barcode_match}`
      );
    } catch (err) {
      if (err.status === 422 && err.data) {
        alert(
          `შეცდომა: ${err.data.message}\n` +
          `არ არის: ${(err.data.missing || []).join(", ")}\n` +
          `ნაპოვნია: ${(err.data.found || []).join(", ")}`
        );
      } else if (err.status === 401) {
        alert("ავტორიზაცია ვერ მოხდა. გთხოვთ ხელახლა შეხვიდეთ.");
      } else {
        alert("შეცდომა: " + (err.message || "უცნობი შეცდომა"));
      }
    } finally {
      setUploadLoading(false);
      setOpen(false);
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.leftSide}>
          <Link to="/" className={styles.logoWrapper}>
            <img className={styles.brandLogo} src={artopiaLogo} alt="Artopia" />
          </Link>
          <div className={styles.divider}></div>
          <h2 className={styles.panelTitle}>ადმინ პანელი</h2>
        </div>

        <div className={styles.rightSide} ref={dropdownRef}>
          {/* 👇 აქ შეიცვალა: ავატარის ნაცვლად ქართული ტექსტი */}
          <button 
            onClick={() => setOpen(!open)} 
            className={`${styles.menuTrigger} ${open ? styles.active : ''}`}
          >
            <Menu size={20} className={styles.menuIcon} />
            <span className={styles.menuText}>მენიუ</span>
            <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.rotate : ''}`} />
          </button>

          {open && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <span>მართვა</span>
              </div>
              
              <ul className={styles.menuLinks}>
                <li><button type="button" onClick={onSyncStatus} disabled={loading} className={styles.syncItem}>
                  <FileText size={18} /> სინქრონიზაციის ბოლო ანგარიშები
                </button></li>
                <li>
                  <button type="button" onClick={() => onSyncOptimo(true)} disabled={loading}
                    className={`${styles.syncItem} ${styles.previewButton}`}>
                    <FileText size={18} /> ცვლილებების ნახვა
                  </button>
                </li>
                <li
                  onClick={() => onSyncOptimo(false)}
                  className={`${styles.syncItem} ${loading ? styles.syncing : ''}`}
                >
                  <RefreshCw size={18} className={loading ? styles.spin : ''} />
                  <span>{loading ? "სინქრონიზაცია..." : "Optimo-სთან სინქრონიზაცია"}</span>
                </li>

                <li
                  onClick={onUploadClick}
                  className={`${styles.uploadItem} ${uploadLoading ? styles.uploading : ''}`}
                >
                  <Upload size={18} className={uploadLoading ? styles.spin : ''} />
                  <span>{uploadLoading ? "იტვირთება..." : "Excel-ის ატვირთვა"}</span>
                </li>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={onFileSelected}
                />

                <Link to="/home-images" className={styles.navLink}>
                  <ImageIcon size={18} />
                  <span>მთავარი გვერდის ფოტოები</span>
                </Link>

              

                <Link to="/menu" className={styles.navLink}>
                  <LayoutGrid size={18} />
                  <span>კატალოგი</span>
                </Link>

                <Link to="/admin/categories" className={styles.navLink}>
                  <Tags size={18} />
                  <span>კატეგორიების მართვა</span>
                </Link>

                <Link to="/blog" className={styles.navLink}>
                  <FileText size={18} />
                  <span>ბლოგი & სტატიები</span>
                </Link>

                <Link to="/promo-codes" className={styles.navLink}>
                  <Ticket size={18} />
                  <span>პრომო კოდები</span>
                </Link>

                <Link to="/admin/analytics" className={styles.navLink}>
                  <BarChart2 size={18} />
                  <span>ანალიტიკა</span>
                </Link>

                <Link to="/admin/restock-list" className={styles.navLink}>
                  <ClipboardList size={18} />
                  <span>მოსატანები</span>
                </Link>

                <Link to="/order_history" className={styles.navLink}>
                  <Package size={18} />
                  <span>შეკვეთების ისტორია</span>
                </Link>

                <Link to="/admin/contacts" className={styles.navLink}>
                  <Mail size={18} />
                  <span>საკონტაქციო ინფორმაცია</span>
                </Link>

                <div className={styles.menuDivider}></div>

                <li onClick={onLogout} className={styles.logoutBtn}>
                  <LogOut size={18} />
                  <span>გამოსვლა</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
