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
  Image as ImageIcon
} from 'lucide-react';
import styles from "./AdminNavbar.module.css";
import artopiaLogo from "../assets/IMG_4970.JPG";
import { apiJson } from "../api";

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

  const onSyncOptimo = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await apiJson("/api/optimo/sync", "POST", {});
      if (response.status === "success") {
        alert("სინქრონიზაცია წარმატებით დასრულდა");
      } else {
        alert("შეცდომა: " + response.message);
      }
    } catch (err) {
      alert("სერვერთან კავშირი ვერ დამყარდა");
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
          <h2 className={styles.panelTitle}>Admin Portal</h2>
        </div>

        <div className={styles.rightSide} ref={dropdownRef}>
          <button 
            onClick={() => setOpen(!open)} 
            className={`${styles.profileTrigger} ${open ? styles.active : ''}`}
          >
            <div className={styles.avatarWrapper}>
              <img
                src="https://www.runningquotient.com/img/default_profile.png"
                alt="Admin"
                className={styles.avatarImg}
              />
            </div>
            <ChevronDown size={18} className={`${styles.chevron} ${open ? styles.rotate : ''}`} />
          </button>

          {open && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <span>Management</span>
              </div>
              
              <ul className={styles.menuLinks}>
                <li 
                  onClick={onSyncOptimo} 
                  className={`${styles.syncItem} ${loading ? styles.syncing : ''}`}
                >
                  <RefreshCw size={18} className={loading ? styles.spin : ''} />
                  <span>{loading ? "Syncing..." : "Sync with Optimo"}</span>
                </li>

                <Link to="/home-images" className={styles.navLink}>
                  <ImageIcon size={18} />
                  <span>Hero Images</span>
                </Link>

                <Link to="/addProducts" className={styles.navLink}>
                  <PlusCircle size={18} />
                  <span>Add Product</span>
                </Link>

                <Link to="/menu" className={styles.navLink}>
                  <LayoutGrid size={18} />
                  <span>Catalogue</span>
                </Link>

                <Link to="/blog" className={styles.navLink}>
                  <FileText size={18} />
                  <span>Articles & Blog</span>
                </Link>

                <Link to="/promo-codes" className={styles.navLink}>
                  <Ticket size={18} />
                  <span>Promotions</span>
                </Link>

                <Link to="/order_history" className={styles.navLink}>
                  <Package size={18} />
                  <span>Orders List</span>
                </Link>

                <Link to="/admin/contacts" className={styles.navLink}>
                  <Mail size={18} />
                  <span>Inquiries</span>
                </Link>

                <div className={styles.menuDivider}></div>

                <li onClick={onLogout} className={styles.logoutBtn}>
                  <LogOut size={18} />
                  <span>Sign Out</span>
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