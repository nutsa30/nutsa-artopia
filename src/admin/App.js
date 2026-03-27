import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import "./App.css";
import AdminNavbar from "./components/AdminNavbar";
import Menu from "./pages/menu/Menu";
import Blog from "./pages/blog/Blog";
import AddProducts from "./pages/addProduct/AddProducts";
import Contacts from "./pages/contacts/Contacts";
import LoginPage from "./pages/logIn/LoginPage";
import ProtectedRoute from "./components/ProtectRoute";
import PromoCodes from "./pages/promoCodes/PromoCodes";
import React from "react";
import OrderHistory from "./pages/orders/OrderHistory";
import { LanguageProvider } from "./LanguageContext";
import AddHomeImg from "./pages/home/AddHomeImg";

function AppContent() {
  const location = useLocation();
  const hideNavbarOn = ["/"]; // login გვერდზე navbar არ გვინდა
  const shouldHideNavbar = hideNavbarOn.includes(location.pathname.toLowerCase());

  // Navbar-ის საჩვენებლად ვამოწმებთ ADMIN_TOKEN-ს (LoginPage-ში რაც იწერება)
  const hasToken = !!localStorage.getItem("ADMIN_TOKEN");

  return (
    <LanguageProvider>
      {!shouldHideNavbar && hasToken && <AdminNavbar />}

      <Routes>
        <Route
          path="/addProducts"
          element={
            <ProtectedRoute>
              <AddProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoute>
              <Menu />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order_history"
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blog"
          element={
            <ProtectedRoute>
              <Blog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/promo-codes"
          element={
            <ProtectedRoute>
              <PromoCodes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <Contacts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home-images"
          element={
            <ProtectedRoute>
              <AddHomeImg />
            </ProtectedRoute>
          }
        />

        {/* Login */}
        <Route path="/" element={<LoginPage />} />
        {/* სხვა ყველაფერი */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LanguageProvider>
  );
}

function App({basename}) {
  // admin ქვესაფიქსზე ვართ გამოტანილი
   const base = basename || "/";
  return (
    <BrowserRouter basename={base}>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
