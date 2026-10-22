// src/App.jsx
import "../index.css";

import React, { Suspense, useEffect, useState } from "react";
import "./App.css";
import "./components/SeoLayout.css";
import { CartProvider } from "./components/CartContext/CartContext";
import Navbar, { CartUiProvider } from "./components/Navbar/Navbar";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import HomePage from "./pages/HomePage";
import Footer from "./components/Footer/Footer";
import CartToast from "./components/CartToast/CartToast";
import { useCart } from "./components/CartContext/CartContext";
import ScrollToTop from "./components/ScrollToTop";
import NotFound from "./components/NotFound";
import { StorefrontDataProvider } from "./context/StorefrontDataContext";
import RouteMetadata from "./components/RouteMetadata";
import { edgeArticleFor } from "./utils/edgeArticle";

const ProductsPage = React.lazy(() => import("./pages/ProductsPage"));
const BlogsPage = React.lazy(() => import("./pages/BlogsPage"));
const BlogDetailPage = React.lazy(() => import("./pages/BlogsDetailPage"));
const ContactsPage = React.lazy(() => import("./pages/ContactsPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const Checkout = React.lazy(() => import("./components/Checkout/Checkout"));
const PaymentResult = React.lazy(() => import("./components/Checkout/PaymentResult"));
const SingleProductPage = React.lazy(() => import("./pages/SingleProductPage"));
const TermsPage = React.lazy(() => import("./pages/TermsPage"));
const ReturnsPage = React.lazy(() => import("./pages/ReturnsPage"));
const PrivacyPage = React.lazy(() => import("./pages/PrivacyPage"));
const ChatWidget = React.lazy(() => import("./components/ChatWidget"));
const AdminApp = React.lazy(() => import("./admin/AdminApp"));
// 3D (three.js) მხოლოდ ამ გვერდს სჭირდება — ცალკე ჩანქად იტვირთება
const EngravingPage = React.lazy(() => import("./pages/EngravingPage"));
const ColorLabPage = React.lazy(() => import("./pages/ColorLabPage"));

const CartToastWrapper = () => {
  const { showToast } = useCart();
  return <CartToast show={showToast} message="დამატებულია კალათაში" />;
};

const RouteLoader = RouteMetadata;

const ChatWidgetMount = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const show = () => setReady(true);
    const id = "requestIdleCallback" in window
      ? window.requestIdleCallback(show, { timeout: 2500 })
      : window.setTimeout(show, 1800);
    return () => {
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);
  return ready ? <Suspense fallback={null}><ChatWidget siteLang="ka" /></Suspense> : null;
};

// გვერდის კოდის ჩატვირთვამდე მთელი ეკრანი იჯავშნება: footer ეკრანის ქვემოთ რჩება და
// კონტენტის გამოჩენისას აღარ „ხტება" (CLS იყო 0.37 ყველა გვერდზე)
// /products?search=… ახალი ძიება (ან „უკან" ძიებიდან კატალოგზე) გვერდს თავიდან აწყობს,
// რომ შედეგი ყოველთვის მისამართს ემთხვეოდეს
const CatalogRootPage = () => {
  const [searchParams] = useSearchParams();
  return <ProductsPage key={searchParams.get("search") || ""} />;
};

// ბლოგის სტატიაზე edge-მა ტექსტი უკვე ჩაწერა: სანამ გვერდის კოდი იტვირთება, ცარიელი ადგილის ნაცვლად
// იგივე სტატია ჩანს (src/utils/edgeArticle.js) — ტექსტი არ ქრება და არ ციმციმებს
const RouteFallback = () => {
  const { pathname } = useLocation();
  const article = edgeArticleFor(pathname);
  if (article) {
    return <div style={{ minHeight: "100vh", color: "#e2e8f0", lineHeight: 1.75 }} aria-busy="true"
      dangerouslySetInnerHTML={{ __html: article }} />;
  }
  return <div style={{ minHeight: "100vh" }} aria-busy="true" />;
};
const DeferredPage = ({ children }) => <Suspense fallback={<RouteFallback />}>{children}</Suspense>;

const OldAddProductRedirect = () => {
  const { id } = useParams();
  return (
    <Navigate to={id ? `/admin/addProducts/${id}` : "/admin/addProducts"} replace />
  );
};

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
      {isAdmin ? children : <main id="main-content">{children}</main>}
      {!isAdmin && <Footer />}
    </>
  );
}

function App() {
  const cartItems = [];
  const lastAddedId = null;
  const showCart = false;

const ChatMountIfNotAdmin = () => {
  const { pathname } = useLocation();

  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return null;

  return <ChatWidgetMount />;
};

  return (
    <>
        <CartProvider>
          <CartUiProvider>
            <Router>
              <StorefrontDataProvider>
              <ScrollToTop />   
              <CartToastWrapper />
              <RouteLoader />


<Routes>
  {/* 🔥 OPENING PAGE — CHROME-ის გარეთ */}

  {/* 🔥 დანარჩენი ყველაფერი CHROME-ის შიგნით */}
  <Route
    path="*"
    element={
<Chrome
  cartItems={cartItems}
  showCart={showCart}
  lastAddedId={lastAddedId}
>
  <Routes>

<Route path="/" element={<HomePage key="home" />} />

<Route path="/products" element={<DeferredPage><CatalogRootPage /></DeferredPage>} />

<Route path="/products/page/:page" element={<DeferredPage><ProductsPage /></DeferredPage>} />

<Route path="/products/category/:slug" element={<DeferredPage><ProductsPage /></DeferredPage>} />

<Route path="/products/category/:slug/page/:page" element={<DeferredPage><ProductsPage /></DeferredPage>} />
<Route path="/products/group/:mainSlug" element={<DeferredPage><ProductsPage /></DeferredPage>} />
<Route path="/products/group/:mainSlug/page/:page" element={<DeferredPage><ProductsPage /></DeferredPage>} />

<Route path="/products/:slug" element={<DeferredPage><SingleProductPage /></DeferredPage>} />

<Route
  path="/engraving"
  element={
    <React.Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <EngravingPage />
    </React.Suspense>
  }
/>

<Route path="/blogs" element={<DeferredPage><BlogsPage /></DeferredPage>} />
<Route path="/color-lab" element={<DeferredPage><ColorLabPage /></DeferredPage>} />

<Route path="/blog/:slug" element={<DeferredPage><BlogDetailPage /></DeferredPage>} />

<Route path="/login" element={<DeferredPage><LoginPage /></DeferredPage>} />

<Route path="/checkout" element={<DeferredPage><Checkout /></DeferredPage>} />

<Route path="/payment/result" element={<DeferredPage><PaymentResult /></DeferredPage>} />

<Route path="/contacts" element={<DeferredPage><ContactsPage /></DeferredPage>} />
<Route path="/terms" element={<DeferredPage><TermsPage /></DeferredPage>} />
<Route path="/returns" element={<DeferredPage><ReturnsPage /></DeferredPage>} />
<Route path="/privacy" element={<DeferredPage><PrivacyPage /></DeferredPage>} />
<Route path="/reviews" element={<NotFound gone what="გვერდი" />} />
    {/* REDIRECTS */}
    <Route path="/menu" element={<Navigate to="/admin/menu" replace />} />
    <Route path="/addProducts" element={<Navigate to="/admin/addProducts" replace />} />
    <Route path="/addProducts/:id" element={<OldAddProductRedirect />} />
    <Route path="/order_history" element={<Navigate to="/admin/order_history" replace />} />
    <Route path="/blog" element={<Navigate to="/admin/blog" replace />} />
    <Route path="/promo-codes" element={<Navigate to="/admin/promo-codes" replace />} />
    <Route path="/home-images" element={<Navigate to="/admin/home-images" replace />} />

    {/* ADMIN */}
    <Route
      path="/admin/*"
      element={
        <React.Suspense fallback={<div style={{ padding: "2rem" }}>Loading admin…</div>}>
          <AdminApp />
        </React.Suspense>
      }
    />

    {/* არარსებული მისამართი — HTTP 404-ს edge function აბრუნებს (netlify/edge-functions/meta.js);
        ახალი მარშრუტის დამატებისას იქაური სიაც (STATIC_ROUTES / ROUTE_PATTERNS) უნდა განახლდეს */}
    <Route path="*" element={<NotFound />} />

  </Routes>
</Chrome>
    }
  />
</Routes>

              <ChatMountIfNotAdmin />
              </StorefrontDataProvider>
            </Router>
          </CartUiProvider>
        </CartProvider>
    </>
  );
}

export default App;
