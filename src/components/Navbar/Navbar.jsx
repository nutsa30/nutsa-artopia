import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, LetterText, MessagesSquare, PenTool, Palette, Menu, X, ShoppingCart } from "lucide-react";
import { useCart } from "../CartContext/CartContext";
import CartDropdown from "../CartContext/CartDropdown";
import { changeLanguage, loadGoogleTranslate } from "../../utils/googleTranslate";
import geFlag from "../../assets/georgiaflag.webp";
import enFlag from "../../assets/britishflag.webp";
import styles from "./Navbar.module.css";

const tabs = [
  { path: "/", label: "მთავარი", Icon: Home },
  { path: "/products", label: "პროდუქტები", Icon: ShoppingBag },
  { path: "/engraving", label: "გრავირება", Icon: PenTool },
  { path: "/color-lab", label: "ფერების ლაბორატორია", Icon: Palette },
  { path: "/blogs", label: "არტ ბლოგი", Icon: LetterText },
  { path: "/contacts", label: "კონტაქტები", Icon: MessagesSquare },
];
const CartUiContext = createContext(null);
export function CartUiProvider({ children }) {
  const cartRef = useRef(null);
  return <CartUiContext.Provider value={{ cartRef }}>{children}</CartUiContext.Provider>;
}
export function useCartUiRefs() {
  const ctx = useContext(CartUiContext);
  if (!ctx) throw new Error("useCartUiRefs must be used within <CartUiProvider>");
  return ctx;
}
export default function Navbar() {
  const [langBusy, setLangBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCartOpen, setShowCartOpen] = useState(false);
  const { pathname } = useLocation();
  const { cartItems } = useCart();
  const { cartRef } = useCartUiRefs();
  const barRef = useRef(null);
  const menuRef = useRef(null);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  useEffect(() => { setMenuOpen(false); setShowCartOpen(false); }, [pathname]);
  useEffect(() => {
    // The shared storefront offset follows the actual header, including zoom/font changes.
    const root = document.documentElement;
    const previousH = root.style.getPropertyValue('--navbar-h');
    const previousGap = root.style.getPropertyValue('--navbar-gap');
    const measure = () => {
      if (!barRef.current) return;
      const r = barRef.current.getBoundingClientRect();
      root.style.setProperty('--navbar-h', `${Math.ceil(r.height + r.top)}px`);
      root.style.setProperty('--navbar-gap', '24px');
    };
    const observer = new ResizeObserver(measure);
    observer.observe(barRef.current);
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect(); window.removeEventListener('resize', measure);
      if (previousH) root.style.setProperty('--navbar-h', previousH); else root.style.removeProperty('--navbar-h');
      if (previousGap) root.style.setProperty('--navbar-gap', previousGap); else root.style.removeProperty('--navbar-gap');
    };
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = e => {
      if (e.type === 'keydown' && e.key === 'Escape') { setMenuOpen(false); menuRef.current?.focus(); }
      if (e.type === 'pointerdown' && !barRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', close); };
  }, [menuOpen]);
  const changeLang = lang => {
    setLangBusy(true);
    changeLanguage(lang).catch(console.error).finally(() => setLangBusy(false));
  };
  return <nav id="site-navbar" ref={barRef} className={styles.tabbar} aria-label="ნავიგაცია">
    <Link to="/" reloadDocument className={styles.brandLink} aria-label="არტოპია — მთავარი">
      <img src="/Logo.webp" alt="არტოპია" width="42" height="42" />
      <span>არტოპია</span>
    </Link>
    <div id="storefront-nav-links" className={`${styles.tabsWrapper} ${menuOpen ? styles.menuOpen : ''}`}>
      {tabs.map(({ path, label, Icon }) => {
        const active = path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/');
        return <Link key={path} to={path} reloadDocument className={`${styles.tabItem} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
          <Icon size={17} aria-hidden="true" /><span>{label}</span>
        </Link>;
      })}
    </div>
    <div className={styles.actions}>
      <div className={styles.langSwitcher} aria-busy={langBusy} onPointerEnter={() => loadGoogleTranslate().catch(() => {})}>
        <button type="button" onClick={() => changeLang('ka')} aria-label="ქართული" disabled={langBusy}><img src={geFlag} alt="" width="25" height="17" /></button>
        <button type="button" onClick={() => changeLang('en')} aria-label="English" disabled={langBusy}><img src={enFlag} alt="" width="25" height="17" /></button>
      </div>
      <button type="button" ref={cartRef} className={styles.navItem} onClick={() => { setMenuOpen(false); setShowCartOpen(v => !v); }} aria-label="კალათა" aria-expanded={showCartOpen}>
        <ShoppingCart size={21} aria-hidden="true" />{itemCount > 0 && <span className={styles.cartCount}>{itemCount}</span>}
      </button>
      <button type="button" ref={menuRef} className={styles.menuToggle} onClick={() => { setShowCartOpen(false); setMenuOpen(v => !v); }} aria-label={menuOpen ? 'მენიუს დახურვა' : 'მენიუს გახსნა'} aria-expanded={menuOpen} aria-controls="storefront-nav-links">
        {menuOpen ? <X size={20} /> : <Menu size={20} />}<span>მენიუ</span>
      </button>
    </div>
    {showCartOpen && <CartDropdown showCartOpen={showCartOpen} setShowCartOpen={setShowCartOpen} />}
  </nav>;
}
