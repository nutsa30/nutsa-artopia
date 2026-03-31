import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../CartContext/CartContext';
import styles from './CartDropdown.module.css';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../LanguageContext';

const API_BASE = 'https://artopia-backend-2024-54872c79acdd.herokuapp.com/';

const LBL = {
  ka: {
    empty: "კალათა ცარიელია",
    newBadge: "ახალი",
    total: "ჯამური ღირებულება",
    clearAll: "ყველა წაშალე",
    checkout: "ყიდვის გაგრძელება",
    stockOnly: (n) => `მარაგში მხოლოდ ${n} ცალია.`,
    minus: "მინუსი",
    plus: "პლუსი",
    remove: "წაშლა",
  },
  en: {
    empty: "Your cart is empty",
    newBadge: "New",
    total: "Total",
    clearAll: "Clear all",
    checkout: "Proceed to checkout",
    stockOnly: (n) => `Only ${n} item(s) available in stock.`,
    minus: "Minus",
    plus: "Plus",
    remove: "Delete",
  },
};

const normalizeQuantity = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
};

const CartDropdown = ({ showCartOpen, setShowCartOpen }) => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice, clearCart } = useCart();
  const { lang } = useLang();
  const T = LBL[lang] || LBL.ka;

  const [stockById, setStockById] = useState({});
  const [stockMessageById, setStockMessageById] = useState({});

  useEffect(() => {
    let ignore = false;

    const ids = cartItems
      .map((item) => item?.id ?? item?._id)
      .filter(Boolean);

    if (ids.length === 0) {
      setStockById({});
      setStockMessageById({});
      return;
    }

    const fetchStocks = async () => {
      const entries = await Promise.all(
        ids.map(async (pid) => {
          try {
            const res = await fetch(`${API_BASE}/products/${pid}?lang=${lang}`);
            if (!res.ok) {
              return [pid, 0];
            }

            const data = await res.json();
            return [pid, normalizeQuantity(data?.quantity)];
          } catch {
            return [pid, 0];
          }
        })
      );

      if (!ignore) {
        setStockById(Object.fromEntries(entries));
      }
    };

    fetchStocks();

    return () => {
      ignore = true;
    };
  }, [cartItems, lang]);

  const handleCheckout = () => {
    setShowCartOpen(false);
    navigate('/checkout');
  };

  const getItemId = (item) => item?.id ?? item?._id ?? item?.name;

  const getMaxQty = (item) => {
    const pid = item?.id ?? item?._id;
    if (!pid) return 0;
    return normalizeQuantity(stockById[pid]);
  };

  const handleIncrease = (item) => {
    const id = getItemId(item);
    const maxQty = getMaxQty(item);

    if (item.quantity >= maxQty) {
      setStockMessageById((prev) => ({
        ...prev,
        [id]: T.stockOnly(maxQty),
      }));
      return;
    }

    setStockMessageById((prev) => ({
      ...prev,
      [id]: '',
    }));

    updateQuantity(id, 1);
  };

  const handleDecrease = (item) => {
    const id = getItemId(item);

    setStockMessageById((prev) => ({
      ...prev,
      [id]: '',
    }));

    updateQuantity(id, -1);
  };

  const Overlay = showCartOpen
    ? createPortal(
        <div
          className={styles.overlay}
          onClick={() => setShowCartOpen(false)}
        />,
        document.body
      )
    : null;

  const Dropdown = showCartOpen
    ? createPortal(
        <div className={styles.cartPortal}>
          <div className={styles.cartDropdown}>
            <button
              className={styles.closeBtn}
              onClick={() => setShowCartOpen(false)}
            >
              ×
            </button>

            {cartItems.length === 0 ? (
              <p>{T.empty}</p>
            ) : (
              <>
                {cartItems.map((item) => {
                  const id = getItemId(item);
                  const unit = Number(item.price) || 0;
                  const line = unit * item.quantity;
                  const maxQty = getMaxQty(item);
                  const plusDisabled = maxQty === 0 || item.quantity >= maxQty;

                  return (
                    <div className={styles.cartItem} key={id}>
                      {item?.sale && (
                        <div className={styles.saleTag}>
                          <span>
                            <b>-{Number(item.sale)}%</b>
                          </span>
                        </div>
                      )}

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

                      <div className={styles.itemContent}>
                        <div className={styles.itemName}>{item.name}</div>

                        <div className={styles.itemPrice}>
                          {unit.toFixed(2)} ₾ × {item.quantity} = {line.toFixed(2)} ₾
                        </div>

                        {stockMessageById[id] ? (
                          <div className={styles.stockWarning}>
                            {stockMessageById[id]}
                          </div>
                        ) : null}

                        <div className={styles.controls}>
                          <button
                            className={`${styles.qtyBtn} ${styles.minus}`}
                            onClick={() => handleDecrease(item)}
                            disabled={item.quantity === 1}
                            type="button"
                            aria-label={T.minus}
                            title={T.minus}
                          >
                            –
                          </button>

                          <span className={styles.quantityDisplay}>
                            {item.quantity}
                          </span>

                          <button
                            className={`${styles.qtyBtn} ${styles.plus}`}
                            onClick={() => handleIncrease(item)}
                            disabled={plusDisabled}
                            type="button"
                            aria-label={T.plus}
                            title={T.plus}
                          >
                            +
                          </button>

                          <button
                            className={styles.binButton}
                            onClick={() => removeFromCart(id)}
                            type="button"
                            aria-label={T.remove}
                            title={T.remove}
                          >
                            <svg className={styles.binTop} viewBox="0 0 39 7" fill="none">
                              <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4" />
                              <line x1="12" y1="1.5" x2="26" y2="1.5" stroke="white" strokeWidth="3" />
                            </svg>

                            <svg className={styles.binBottom} viewBox="0 0 33 39" fill="none">
                              <path
                                d="M0 0H33V35C33 37 31 39 29 39H4C2 39 0 37 0 35V0Z"
                                fill="white"
                              />
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
                    <button className={styles.clearButton} onClick={clearCart} type="button">
                      {T.clearAll}
                    </button>

                    <button
                      className={styles.checkoutButton}
                      onClick={handleCheckout}
                      type="button"
                    >
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