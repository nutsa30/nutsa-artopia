import React, { useState, createContext, useContext, useRef, forwardRef } from "react";
import styles from "./Navbar.module.css";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../CartContext/CartContext";
import CartDropdown from "../CartContext/CartDropdown";
import { Home, ShoppingBag, LetterText, MessagesSquare } from "lucide-react";
import geFlag from "../../assets/georgiaflag.png";
import enFlag from "../../assets/britishflag.png";
/* ---------- Tabs ---------- */
const tabs = [
  { id: "home", path: "/", icon: <Home size={18} /> },
  { id: "shopping", path: "/products", icon: <ShoppingBag size={18} /> },
  { id: "blogs", path: "/blogs", icon: <LetterText size={18} /> },
  { id: "contacts", path: "/contacts", icon: <MessagesSquare size={18} /> },
];

/* ---------- ერთენოვანი ლეიბლები ---------- */
const L = {
  home: "მთავარი",
  shopping: "პროდუქტები",
  blogs: "არტ ბლოგი",
  contacts: "კონტაქტები",
  brand: "არტოპია",
  cartAria: "კალათა",
  navAria: "ნავიგაცია",
};
const LogoImg = "/Logo.png";
/* ---------- Cart UI Context ---------- */
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
  <button
    ref={ref}
    aria-label={props["aria-label"] || "Cart"}
    className={styles.icon}
    type="button"
    tabIndex={-1}
  >
    <svg viewBox="0 0 24 24" className={styles.cartSvg} aria-hidden="true">
      <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 
      0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 
      2 2-.9 2-2-.9-2-2-2zM7.16 
      14h9.45c.75 0 1.41-.41 
      1.75-1.03l3.24-5.88A1 
      1 0 0 0 20.61 5H5.21l-.94-2H1v2h2l3.6 
      7.59-1.35 2.44C5.09 15.37 5 
      15.68 5 16c0 1.1.9 2 2 2h12v-2H7.42c-.14 
      0-.25-.11-.25-.25l.03-.12.96-1.73z"/>
    </svg>
  </button>
));
CartIcon.displayName = "CartIcon";

/* ---------- Navbar ---------- */
const Navbar = () => {
  const changeLang = (lang) => {
  const tryChange = () => {
    const select = document.querySelector(".goog-te-combo");

    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event("change"));
    } else {
      setTimeout(tryChange, 300);
    }
  };

  tryChange();
};
  const location = useLocation();
  const [showCartOpen, setShowCartOpen] = useState(false);
  const { cartItems } = useCart();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const activeTab = tabs.find((tab) => tab.path === location.pathname)?.id || null;
  const { cartRef } = useCartUiRefs();

  return (
<div className={styles.tabbar} role="navigation" aria-label={L.navAria}>
  
  {/* Header */}
  <div className={styles.header}>
    <Link to="/" reloadDocument className={styles.brandLink} aria-label={L.home}>
      <img className={styles.logo} src={LogoImg} alt={L.brand} />
      <h2 className={styles.h2}>{L.brand}</h2>
    </Link>
  </div>

  {/* Language */}
  <div className={styles.langSwitcher}>
    <button onClick={() => changeLang("ka")}>
      <img src={geFlag} alt="ქართული" />
    </button>

    <button onClick={() => changeLang("en")}>
      <img src={enFlag} alt="English" />
    </button>
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

        {/* Cart */}
        <div
          className={styles.navItem}
          onClick={() => setShowCartOpen((prev) => !prev)}
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