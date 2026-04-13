import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import AdminNavbar from "./components/AdminNavbar";
import Menu from "./pages/menu/Menu";
import Blog from "./pages/blog/Blog";
import AddProducts from "./pages/addProduct/AddProducts";
import Contacts from "./pages/contacts/Contacts";
import LoginPage from "./pages/logIn/LoginPage";
import ProtectedRoute from "./components/ProtectRoute";
import PromoCodes from "./pages/promoCodes/PromoCodes";
import OrderHistory from "./pages/orders/OrderHistory";
import AddHomeImg from "./pages/home/AddHomeImg";

import { AuthProvider } from "./context/AuthContext";

import "./index.css";
import "./App.css";

function AdminShell() {
  const location = useLocation();

  const pathname = location.pathname.toLowerCase();
  const isLoginPage =
    pathname === "/admin" ||
    pathname === "/admin/" ||
    pathname === "/admin/login";

const hasToken = !!localStorage.getItem("ADMIN_TOKEN");

return (
    <div className="admin-app">
      {!isLoginPage && hasToken && <AdminNavbar />}

      <Routes>
        {/* ავტორიზაცია */}
        <Route index element={<LoginPage />} />
        <Route path="login" element={<LoginPage />} />

        {/* პროდუქტები */}
        <Route
          path="addProducts"
          element={
            <ProtectedRoute>
              <AddProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="addProducts/:id"
          element={
            <ProtectedRoute>
              <AddProducts />
            </ProtectedRoute>
          }
        />

        {/* მენიუ */}
        <Route
          path="menu"
          element={
            <ProtectedRoute>
              <Menu />
            </ProtectedRoute>
          }
        />

        {/* შეკვეთებიi */}
        <Route
          path="order_history"
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          }
        />

        {/* ბლოგი */}
        <Route
          path="blog"
          element={
            <ProtectedRoute>
              <Blog />
            </ProtectedRoute>
          }
        />

        {/* პრომო კოდები */}
        <Route
          path="promo-codes"
          element={
            <ProtectedRoute>
              <PromoCodes />
            </ProtectedRoute>
          }
        />

        {/* კონტაქტები */}
        <Route
          path="contacts"
          element={
            <ProtectedRoute>
              <Contacts />
            </ProtectedRoute>
          }
        />

        {/* მთავარი სურათები */}
        <Route
          path="home-images"
          element={
            <ProtectedRoute>
              <AddHomeImg />
            </ProtectedRoute>
          }
        />

        {/* სხვა ყველაფერი */}
        <Route path="*" element={<Navigate to="login" replace />} />
      </Routes>
    </div>
  );
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <AdminShell />
    </AuthProvider>
  );
}