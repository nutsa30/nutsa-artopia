import React from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../CartContext/CartContext';
import styles from './CartDropdown.module.css';
import { useNavigate } from 'react-router-dom';
import StarburstBadge from '../StartburstBadge';
import BrushBadge from '../BrushBadge';
import { useLang } from '../../LanguageContext';

const LBL = {
  ka: {
    empty: "კალათა ცარიელია",
    newBadge: "ახალი",
    total: "ჯამური ღირებულება",
    clearAll: "ყველა წაშალე ",
    checkout: "ყიდვის გაგრძელება",
    delete: "წაშლა",
    minus: "მინუსი",
    plus: "პლუსი",
    cartAria: "კალათა",
  },
  en: {
    empty: "Your cart is empty",
    newBadge: "New",
    total: "Total",
    clearAll: "Clear all ",
    checkout: "Proceed to checkout",
    delete: "Delete",
    minus: "Minus",
    plus: "Plus",
    cartAria: "Cart",
  },
};

const CartDropdown = ({ showCartOpen, setShowCartOpen }) => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice, clearCart } = useCart();
  const { lang } = useLang();
  const T = LBL[lang] || LBL.ka;

  const handleCheckout = () => {
    setShowCartOpen(false);
    navigate('/checkout');
  };

  // Overlay (blur background) — body-ში
  const Overlay = showCartOpen
    ? createPortal(
        <div
          className={styles.overlay}
          onClick={() => setShowCartOpen(false)}
          aria-hidden="true"
        />,
        document.body
      )
    : null;

  // Cart dropdown (above overlay) — body-ში
  const Dropdown = showCartOpen
    ? createPortal(
        <div className={styles.cartPortal} aria-label={T.cartAria}>
          <div className={styles.cartDropdown}>
            {/* ❌ Close button (always visible, top-right) */}
            <button
              className={styles.closeBtn}
              onClick={() => setShowCartOpen(false)}
              aria-label="Close cart"
              title="Close"
              type="button"
            >
              ×
            </button>

            {cartItems.length === 0 ? (
              <p>{T.empty}</p>
            ) : (
              <>
                {cartItems.map((item) => {
                  const hasSale =
                    typeof item?.sale === 'number' &&
                    item.sale > 0 &&
                    item.sale <= 100;
                  const id = item.id || item._id || item.name;
                  const unit = Number(item.price) || 0;
                  const line = unit * (item.quantity || 0);

                  return (
                    <div className={styles.cartItem} key={id} style={{ position: 'relative' }}>
                      {hasSale && (
                        <StarburstBadge value={item.sale} size={44} className={styles.saleBadge} />
                      )}
                      {item?.is_new && (
                        <BrushBadge text={T.newBadge} size={40} className={styles.newBadge} />
                      )}

                      <img
                        src={item.image_url1 || item.image_url || item.image || 'https://via.placeholder.com/60'}
                        alt={item.name}
                        className={styles.itemImage}
                      />

                      <div className={styles.itemContent}>
                        <div className={styles.itemName}>{item.name}</div>

                        <div className={styles.itemPrice}>
                          {unit.toFixed(2)} ₾ × {item.quantity} = {line.toFixed(2)} ₾
                        </div>

                        <div className={styles.controls}>
                          <button
                            className={styles.quantityBtn}
                            onClick={() => updateQuantity(id, -1)}
                            disabled={item.quantity === 1}
                            aria-label={T.minus}
                            title={T.minus}
                            type="button"
                          >
                            –
                          </button>

                          <span className={styles.quantityDisplay}>{item.quantity}</span>

                          <button
                            className={styles.quantityBtn}
                            onClick={() => updateQuantity(id, 1)}
                            aria-label={T.plus}
                            title={T.plus}
                            type="button"
                          >
                            +
                          </button>

                          <button
                            className={styles.deleteBtn}
                            onClick={() => removeFromCart(id)}
                            aria-label={T.delete}
                            title={T.delete}
                            type="button"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className={styles.cartFooter}>
                  <div className={styles.totalAndClear}>
                    <span className={styles.total}>
                      {T.total}: {getTotalPrice().toFixed(2)} ₾
                    </span>
                    <div className={styles.buttonRow}>
                      <button className={styles.clearButton} onClick={clearCart} type="button">
                        {T.clearAll}
                      </button>
                      <button
                        className={`${styles.checkoutButton} ${cartItems.length === 0 ? styles.disabled : ''}`}
                        onClick={handleCheckout}
                        disabled={cartItems.length === 0}
                        type="button"
                      >
                        {T.checkout}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {Overlay}
      {Dropdown}
    </>
  );
};

export default CartDropdown;
