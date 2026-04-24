import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  PlusCircle,
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
} from 'lucide-react';
import styles from "./AdminNavbar.module.css";
import artopiaLogo from "../assets/IMG_4970.JPG";
import { apiJson, syncOptimo } from "../api";

const AdminNavbar = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef();

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
    } catch {}
    window.location.href = "/";
  };

// 2. ფუნქცია შეცვალე ასე:
const onSyncOptimo = async () => {
  if (loading) return;
  setLoading(true);
  try {
    // აქ ვიყენებთ ახალ ფუნქციას, რომელიც გარანტირებულად POST-ს აგზავნის
    const response = await syncOptimo(); 
    
    if (response.status === "success") {
      alert("სინქრონიზაცია წარმატებით დასრულდა");
    } else {
      alert("შეცდომა: " + (response.message || "უცნობი შეცდომა"));
    }
  } catch (err) {
    console.error(err);
    alert("სერვერთან კავშირი ვერ დამყარდა ან წვდომა აკრძალულია");
  } finally {
    setLoading(false);
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
                <li 
                  onClick={onSyncOptimo} 
                  className={`${styles.syncItem} ${loading ? styles.syncing : ''}`}
                >
                  <RefreshCw size={18} className={loading ? styles.spin : ''} />
                  <span>{loading ? "სინქრონიზაცია..." : "Optimo-სთან სინქრონიზაცია"}</span>
                </li>

                <Link to="/home-images" className={styles.navLink}>
                  <ImageIcon size={18} />
                  <span>მთავარი გვერდის ფოტოები</span>
                </Link>

              

                <Link to="/menu" className={styles.navLink}>
                  <LayoutGrid size={18} />
                  <span>კატალოგი</span>
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