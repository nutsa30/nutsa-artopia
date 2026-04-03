// src/App.jsx
import "../index.css";

import React, { useState, useEffect } from "react";
import "./App.css";
import { CartProvider } from "./components/CartContext/CartContext";
import Navbar, { CartUiProvider } from "./components/Navbar/Navbar";
import Checkout from "./components/Checkout/Checkout";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { LayoutGroup } from "framer-motion";

import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import BlogsPage from "./pages/BlogsPage";
import BlogDetailPage from "./pages/BlogsDetailPage";

import ContactsPage from "./pages/ContactsPage";
import LoginPage from "./pages/LoginPage";
import Footer from "./components/Footer/Footer";
import ChatWidget from "./components/ChatWidget";

import PaymentResult from "./components/Checkout/PaymentResult";
import CartToast from "./components/CartToast/CartToast";
import { useCart } from "./components/CartContext/CartContext";
import SingleProductPage from "./pages/SingleProductPage";
import AppLoader from "./components/loaders/AppLoader";
import { useLoading } from "./loaders/LoadingProvider";

const AdminApp = React.lazy(() => import("./admin/AdminApp"));
const CartToastWrapper = () => {
  const { showToast } = useCart();
  return <CartToast show={showToast} message="დამატებულია კალათაში" />;
};
// Route change hook (no UI)
const RouteLoader = () => {
  const location = useLocation();
  useEffect(() => {}, [location]);
  return null;
};

const ChatWidgetMount = () => {
  return <ChatWidget siteLang="ka" />;
};

// ძველი /addProducts/:id → ახალი /admin/addProducts/:id
const OldAddProductRedirect = () => {
  const { id } = useParams();
  return (
    <Navigate to={id ? `/admin/addProducts/${id}` : "/admin/addProducts"} replace />
  );
};

// ✅ Wrapper that hides Navbar/Footer on /admin და აყენებს თეთრ background-ს
function Chrome({ children, cartItems, showCart, lastAddedId }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    const cls = "admin-bg";
    if (isAdmin) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [isAdmin]);

  return (
    <>
      {!isAdmin && (
        <Navbar cartItems={cartItems} showCart={showCart} lastAddedId={lastAddedId} />
      )}
      {children}
      {!isAdmin && <Footer />}
    </>
  );
}

function App() {
  const [cartItems, setCartItems] = useState([]);
  const [lastAddedId, setLastAddedId] = useState(null);
  const [showCart, setShowCart] = useState(false);

  const handleAdd = (product) => {
    setCartItems((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, qty: (p.qty || 1) + 1 } : p
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setLastAddedId(product.id);
    setShowCart(true);
    setTimeout(() => setShowCart(false), 1200);
  };
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => {
    setLoading(false);
  }, 1500); // დროებით 1.5 წამი

  return () => clearTimeout(timer);
}, []);
  // ჩატბოტის დამალვა admin-ზე
  const ChatMountIfNotAdmin = () => {
    const { pathname } = useLocation();
    const isAdmin = pathname.startsWith("/admin");
    if (isAdmin) return null;
    return <ChatWidgetMount />;
  };

  return (

    <>
  {loading && <AppLoader />}
      <LayoutGroup>
        <CartProvider>
      <CartUiProvider>
  <Router>
    <CartToastWrapper />
              <RouteLoader />

              <Chrome cartItems={cartItems} showCart={showCart} lastAddedId={lastAddedId}>
                <Routes>
                  {/* --- PUBLIC SITE ROUTES --- */}
                  <Route path="/" element={<HomePage />} />

                  {/* ✅ პროდუქტების ლისტი */}
                  <Route path="/products" element={<ProductsPage />} />
<Route path="/products/:slug" element={<SingleProductPage />} />

                  <Route path="/blogs" element={<BlogsPage />} />
<Route path="/blog/:slug" element={<BlogDetailPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/payment/result" element={<PaymentResult />} />

                  <Route path="/contacts" element={<ContactsPage />} />
                  {/* --- Redirects: old absolute admin links → /admin/... --- */}
                  <Route path="/menu" element={<Navigate to="/admin/menu" replace />} />
                  <Route path="/addProducts" element={<Navigate to="/admin/addProducts" replace />} />
                  <Route path="/addProducts/:id" element={<OldAddProductRedirect />} />
                  <Route path="/order_history" element={<Navigate to="/admin/order_history" replace />} />
                  <Route path="/blog" element={<Navigate to="/admin/blog" replace />} />
                  <Route path="/promo-codes" element={<Navigate to="/admin/promo-codes" replace />} />
                  <Route path="/home-images" element={<Navigate to="/admin/home-images" replace />} />
                  {/* --- ADMIN NESTED ROUTES --- */}
                  <Route
                    path="/admin/*"
                    element={
                      <React.Suspense fallback={<div style={{ padding: "2rem" }}>Loading admin…</div>}>
                        <AdminApp />
                      </React.Suspense>
                    }
                  />
                </Routes>
              </Chrome>

              <ChatMountIfNotAdmin />
            </Router>
          </CartUiProvider>
        </CartProvider>
      </LayoutGroup>
      </>
  );
}

export default App;
