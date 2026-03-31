// src/components/Navbar/Navbar.jsx
import React, { useState, createContext, useContext, useRef, forwardRef } from "react";
import styles from "./Navbar.module.css";
import LogoImg from "../../assets/Logo.png";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../CartContext/CartContext";
import CartDropdown from "../CartContext/CartDropdown";
import { Home, ShoppingBag, LetterText, MessagesSquare } from "lucide-react";

// ენის კონტექსტი
import { useLang } from "../../LanguageContext";
import georgia from "../../assets/georgiaflag.png";
import british from "../../assets/britishflag.png";

/* ---------- Tabs (route mapping) ---------- */
const tabs = [
  { id: "home", path: "/", icon: <Home size={18} /> },
  { id: "shopping", path: "/products", icon: <ShoppingBag size={18} /> },
  { id: "blogs", path: "/blogs", icon: <LetterText size={18} /> },
  { id: "contacts", path: "/contacts", icon: <MessagesSquare size={18} /> },
];

/* ---------- ლეიბლები ორ ენაზე ---------- */
const TAB_LABELS = {
  ka: {
    home: "მთავარი",
    shopping: "პროდუქტები",
    blogs: "არტ ბლოგი",
    contacts: "კონტაქტები",
    brand: "არტოპია",
    cartAria: "კალათა",
    navAria: "ნავიგაცია",
  },
  en: {
    home: "Home",
    shopping: "Products",
    blogs: "Art Blogs",
    contacts: "Contacts",
    brand: "ARTOPIA",
    cartAria: "Cart",
    navAria: "Navigation",
  },
};

/* ---------- Cart UI Refs Context ---------- */
const CartUiContext = createContext(null);

export function CartUiProvider({ children }) {
  const cartRef = useRef(null);
  return (
    <CartUiContext.Provider value={{ cartRef }}>
      {children}
    </CartUiContext.Provider>
  );
}

export function useCartUiRefs() {
  const ctx = useContext(CartUiContext);
  if (!ctx) throw new Error("useCartUiRefs must be used within <CartUiProvider>");
  return ctx;
}

/* ---------- Cart Icon ---------- */
const CartIcon = forwardRef((props, ref) => (
  <button ref={ref} aria-label={props["aria-label"] || "Cart"} className={styles.icon}>
    🛒
  </button>
));
CartIcon.displayName = "CartIcon";

/* ---------- Lang Switcher ---------- */
const LangSwitcher = () => {
  const { lang, setLang } = useLang();

  const handleLangChange = (newLang) => {
    if (lang !== newLang) {
      setLang(newLang);
      // დამატებულია: ენის შეცვლისას სრულად აახლებს საიტს
      window.location.reload();
    }
  };

  return (
    <div className={styles.langSwitcher}>
      <button
        onClick={() => handleLangChange("ka")}
        className={lang === "ka" ? styles.langActive : ""}
        aria-pressed={lang === "ka"}
        aria-label="ქართული"
      >
        <img src={georgia} alt="" />
      </button>
      <span className={styles.langSep}>|</span>
      <button
        onClick={() => handleLangChange("en")}
        className={lang === "en" ? styles.langActive : ""}
        aria-pressed={lang === "en"}
        aria-label="English"
      >
        <img src={british} alt="" />
      </button>
    </div>
  );
};

/* ---------- Navbar ---------- */
const Navbar = () => {
  const location = useLocation();
  const [showCartOpen, setShowCartOpen] = useState(false);
  const { cartItems } = useCart();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const activeTab = tabs.find((tab) => tab.path === location.pathname)?.id || null;
  const { cartRef } = useCartUiRefs();
  const { lang } = useLang();
  const L = TAB_LABELS[lang] || TAB_LABELS.ka;

  return (
    <div className={styles.tabbar} role="navigation" aria-label={L.navAria}>
      {/* Header */}
      <div className={styles.header}>
        {/* 🔗 ლოგო + სახელწოდება ერთიან clickable ლინკად, რომელიც სრულად აახლებს მთავარ გვერდს */}
        <Link to="/" reloadDocument className={styles.brandLink} aria-label={L.home}>
          <img className={styles.logo} src={LogoImg} alt={L.brand} />
          <h2 className={styles.h2}>{L.brand}</h2>
        </Link>

        <LangSwitcher />
      </div>

      {/* Tabs */}
      <div className={styles.tabsWrapper}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const label = L[tab.id];
          return (
            <Link
              key={tab.id}
              to={tab.path}
              reloadDocument
              className={`${styles.tabItem} ${isActive ? styles.active : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <div className={styles.blobWrapper}>
                  <div className={styles.blob}></div>
                  <div className={styles.blobAlt}></div>
                </div>
              )}
              <div className={`${styles.iconWrap} ${isActive ? styles.iconWrapActive : ""}`}>
                <span className={styles.iconAnim}>{tab.icon}</span>
                <span className={styles.iconLabel}>{label}</span>
              </div>
            </Link>
          );
        })}

        {/* Cart Icon */}
        <div
          className={styles.navItem}
          onClick={() => setShowCartOpen(!showCartOpen)}
          role="button"
          aria-label={L.cartAria}
          aria-expanded={showCartOpen}
        >
          <CartIcon ref={cartRef} aria-label={L.cartAria} />
          {itemCount > 0 && <span className={styles.cartCount}>{itemCount}</span>}
        </div>

        {showCartOpen && (
          <CartDropdown showCartOpen={showCartOpen} setShowCartOpen={setShowCartOpen} />
        )}
      </div>
    </div>
  );
};

export default Navbar;
