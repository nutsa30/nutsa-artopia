import React, { useState, useEffect, useRef } from 'react';
import styles from "./AdminNavbar.module.css";
import artopiaLogo from "../assets/IMG_4970.JPG"
import { Link, useNavigate } from 'react-router-dom';
import { apiJson } from "../api";

const AdminNavbar = () => {
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await apiJson("/admin/logout", "POST", {});
    } catch {}
    window.location.href = "/";
  };

  return (
    <div className={styles.navbar}>
      {/* 👇 ლოგო – დაკლიკებისას გადაგიყვანს ვებსაიტის მთავარზე */}
      <div className={styles.left}>
        <Link to="/" className={styles.logoLink}>
          <img
            className={styles.avatar}
            src={artopiaLogo}
            alt="Artopia logo"
          />
        </Link>
      </div>

      <h2 className={styles.adminPanelH2}>Admin Panel</h2>

      <div className={styles.right} ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className={styles.avatarButton}
        >
          <img
            src="https://www.runningquotient.com/img/default_profile.png"
            alt="avatar"
            className={styles.avatar}
          />
          <span className={styles.arrow}>▾</span>
        </button>

        {open && (
          <div className={styles.dropdown}>
            <ul className={styles.menuList}>
              <Link to="/home-images" className={styles.menuItem}>
                ➕ Add Home Images
              </Link>
              <Link to="/addProducts" className={styles.menuItem}>
                ➕ Add Products
              </Link>
              <Link to="/menu" className={styles.menuItem}>
                📋Catalogue
              </Link>
              <Link to="/blog" className={styles.menuItem}>
                📝 Add Blog
              </Link>
              <Link to="/promo-codes" className={styles.menuItem}>
                🎟️ Promo Codes
              </Link>
              <Link to="/order_history" className={styles.menuItem}>
                📦 Order History
              </Link>
              <Link to="/admin/contacts" className={styles.menuItem}>
                📞📬 Contacts
              </Link>

              <li
                onClick={onLogout}
                className={`${styles.menuItem} ${styles.logout}`}
              >
                🚪 Log out
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNavbar;
