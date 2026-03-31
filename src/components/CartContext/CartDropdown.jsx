import React from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../CartContext/CartContext';
import styles from './CartDropdown.module.css';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../LanguageContext';

const LBL = {
  ka: {
    empty: "კალათა ცარიელია",
    newBadge: "ახალი",
    total: "ჯამური ღირებულება",
    clearAll: "ყველა წაშალე ",
    checkout: "ყიდვის გაგრძელება",
  },
  en: {
    empty: "Your cart is empty",
    newBadge: "New",
    total: "Total",
    clearAll: "Clear all ",
    checkout: "Proceed to checkout",
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

  const Overlay = showCartOpen
    ? createPortal(
        <div className={styles.overlay} onClick={() => setShowCartOpen(false)} />,
        document.body
      )
    : null;

  const Dropdown = showCartOpen
    ? createPortal(
        <div className={styles.cartPortal}>
          <div className={styles.cartDropdown}>

            <button className={styles.closeBtn} onClick={() => setShowCartOpen(false)}>×</button>

            {cartItems.length === 0 ? (
              <p>{T.empty}</p>
            ) : (
              <>
                {cartItems.map((item) => {
                  const id = item.id || item._id || item.name;
                  const unit = Number(item.price) || 0;
                  const line = unit * item.quantity;

                  return (

       <div className={styles.cartItem} key={id}>

{item?.sale && (
  <div className={styles.saleTag}>
    <span>
      <b>-{Number(item.sale)}%</b>
    </span>
  </div>
)}

  {/* IMAGE + RIBBON */}
  <div className={styles.imageWrap}>
    {item?.is_new && (
      <div className={styles.ribbon}>
        <span>{T.newBadge}</span>
      </div>
    )}

    <img
      src={item.image_url1 || 'https://via.placeholder.com/60'}
      alt={item.name}
      className={styles.itemImage}
    />
  </div>

  {/* CONTENT */}
  <div className={styles.itemContent}>
    <div className={styles.itemName}>{item.name}</div>

    <div className={styles.itemPrice}>
      {unit.toFixed(2)} ₾ × {item.quantity} = {line.toFixed(2)} ₾
    </div>

    <div className={styles.controls}>

      <button
        className={`${styles.qtyBtn} ${styles.minus}`}
        onClick={() => updateQuantity(id, -1)}
        disabled={item.quantity === 1}
      >
        –
      </button>

      <span className={styles.quantityDisplay}>{item.quantity}</span>

      <button
        className={`${styles.qtyBtn} ${styles.plus}`}
        onClick={() => updateQuantity(id, 1)}
      >
        +
      </button>

      <button
        className={styles.binButton}
        onClick={() => removeFromCart(id)}
      >
        <svg className={styles.binTop} viewBox="0 0 39 7">
          <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4" />
          <line x1="12" y1="1.5" x2="26" y2="1.5" stroke="white" strokeWidth="3" />
        </svg>

        <svg className={styles.binBottom} viewBox="0 0 33 39">
          <path d="M0 0H33V35C33 37 31 39 29 39H4C2 39 0 37 0 35V0Z" fill="white"/>
        </svg>
      </button>

    </div>
  </div>

</div>             
                  );
                })}

                <div className={styles.cartFooter}>
                  <div className={styles.total}>
                    {T.total}: {getTotalPrice().toFixed(2)} ₾
                  </div>

                  <div className={styles.buttonRow}>
                    <button className={styles.clearButton} onClick={clearCart}>
                      {T.clearAll}
                    </button>

                    <button className={styles.checkoutButton} onClick={handleCheckout}>
                      {T.checkout}
                    </button>
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