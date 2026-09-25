import React, { createContext, useState, useContext,useEffect } from 'react';
import { trackAddToCart } from '../../utils/analytics';
import { isEngravingItem, engravingUnits, MAX_ENGRAVED_UNITS } from '../../utils/engraving';

// 1. კონტექსტის შექმნა
const CartContext = createContext();
// 2. კასტომ ჰუქი CartContext-ის მოსაძებნად
export const useCart = () => useContext(CartContext);

// 3. პროვაიდერი, რომელიც ინახავს კალათის ლოგიკას და მონაცემებს
export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [showToast, setShowToast] = useState(false);
  // --- Persist: localStorage-დან ამოღება პირველ მონტაჟზე
useEffect(() => {
  try {
    const raw = localStorage.getItem("artopia.cart.v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setCartItems(parsed);
      }
    }
  } catch {
    // ignore
  }
}, []);

// --- Persist: ჩაწერა ყოველ ცვლილებაზე
useEffect(() => {
  try {
    localStorage.setItem("artopia.cart.v1", JSON.stringify(cartItems));
  } catch {
    // ignore
  }
}, [cartItems]);


  // კალათაში დამატება
const addToCart = (product, qty = 1) => {
  // GA4: დაემატება თუ არა რეალურად (მარაგის ლიმიტს არ სცდება)
  const stockMax = product?.quantity ?? 0;
  const existingInCart = cartItems.find((item) => item.id === product.id);
  const currentQty = existingInCart ? existingInCart.quantity : 0;
  const willAdd = currentQty + qty <= stockMax;

  const triggerToast = () => {
    setShowToast(false);
    setTimeout(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
    }, 10);
  };

  setCartItems(prev => {
    const existing = prev.find(item => item.id === product.id);
    const maxQty = product?.quantity ?? 0;

    // თუ უკვე არსებობს კალათაში
    if (existing) {
      const newQty = existing.quantity + qty;

      if (newQty > maxQty) {
        alert(`მარაგში მხოლოდ ${maxQty} ცალია`);
        return prev;
      }

      triggerToast();

      return prev.map(item =>
        item.id === product.id
          ? {
              ...item,
              quantity: newQty,
              maxQty: item.maxQty ?? product.quantity,
            }
          : item
      );
    }

    // ახალი პროდუქტი
    if (qty > maxQty) {
      alert(`მარაგში მხოლოდ ${maxQty} ცალია`);
      return prev;
    }

    triggerToast();

    return [
      ...prev,
      {
        ...product,
        price: Number(product.price),
        quantity: qty,
        maxQty: product.quantity,
      },
    ];
  });

  // GA4 add_to_cart — ერთხელ, რეალური დამატებისას (არა მარაგის ლიმიტზე)
  if (willAdd) {
    trackAddToCart(product, qty);
  }
};

  /**
   * გრავირებული ნივთის დამატება. ყოველი დიზაინი ცალკე ხაზია (id = "engr:<token>"),
   * მარაგს არ ვამოწმებთ — ლიმიტი მხოლოდ ერთ შეკვეთაში ჯამური 5 ცალია.
   * აბრუნებს true-ს, თუ დაემატა.
   */
  const addEngravingToCart = (line, qty = 1) => {
    const others = engravingUnits(cartItems.filter((it) => it.id !== line.id));
    const existing = cartItems.find((it) => it.id === line.id);
    const nextQty = (existing ? existing.quantity : 0) + qty;
    if (others + nextQty > MAX_ENGRAVED_UNITS) return false;

    setCartItems((prev) => {
      if (prev.some((it) => it.id === line.id)) {
        return prev.map((it) => (it.id === line.id ? { ...it, quantity: nextQty } : it));
      }
      return [...prev, { ...line, price: Number(line.price), sale: 0, quantity: qty }];
    });

    setShowToast(false);
    setTimeout(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
    }, 10);
    trackAddToCart({ ...line, price: Number(line.price) }, qty);
    return true;
  };

  // პროდუქტის წაშლა კალათიდან
  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  // რაოდენობის განახლება (+1 ან -1, მინიმუმ 1)
const updateQuantity = (productId, amount) => {
  setCartItems(prev =>
    prev.map(item => {
      if (item.id !== productId) return item;

      // გრავირება: მარაგი არ აქვს, ლიმიტი — შეკვეთაში ჯამური 5 ცალი
      if (isEngravingItem(item)) {
        const others = engravingUnits(prev.filter((it) => it.id !== item.id));
        const newQty = Math.max(1, item.quantity + amount);
        if (others + newQty > MAX_ENGRAVED_UNITS) return item;
        return { ...item, quantity: newQty };
      }

      const maxQty = item?.maxQty ?? 0;
      const newQty = item.quantity + amount;

      if (newQty > maxQty) {
        alert(`მარაგში მხოლოდ ${maxQty} ცალია`);
        return item;
      }

      return {
        ...item,
        quantity: Math.max(1, newQty),
      };
    })
  );
};

  // ჯამური ფასის გამოთვლა
const getTotalPrice = () => {
  return cartItems.reduce((total, item) => {
    const price = Number(item.price || 0);
    const sale = Number(item.sale || 0);

    const finalPrice =
      sale > 0 && sale <= 100
        ? price * (1 - sale / 100)
        : price;

    return total + finalPrice * item.quantity;
  }, 0);
};

  // კალათის გაწმენდა
  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        addEngravingToCart,
        removeFromCart,
        updateQuantity,
        getTotalPrice,
        clearCart,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
