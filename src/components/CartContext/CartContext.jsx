import React, { createContext, useState, useContext,useEffect } from 'react';

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
  setCartItems(prev => {
    const existing = prev.find(item => item.id === product.id);

    const maxQty = product?.quantity ?? 0;

    // თუ უკვე არსებობს კალათაში
    if (existing) {
      const newQty = existing.quantity + qty;

      // ❌ არ გადააჭარბოს მარაგს
      if (newQty > maxQty) {
        alert(
          `მარაგში მხოლოდ ${maxQty} ცალია`
        );
        return prev;
      }

    return prev.map(item =>
  item.id === product.id
    ? { ...item, quantity: newQty, maxQty: item.maxQty ?? product.quantity }
          : item
      );
    }

    // ახალი პროდუქტი
    if (qty > maxQty) {
      alert(`მარაგში მხოლოდ ${maxQty} ცალია`);
      return prev;
    }

setTimeout(() => {
  setShowToast(true);
  setTimeout(() => setShowToast(false), 1800);
}, 0);

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
