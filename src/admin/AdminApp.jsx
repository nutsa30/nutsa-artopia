import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

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

import { LanguageProvider } from "./LanguageContext";
import { AuthProvider } from "./context/AuthContext";

import "./index.css";
import "./App.css";

export default function AdminApp() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <div className="admin-app">
          <AdminNavbar />

          <Routes>
            {/* ავტორიზაცია */}
            <Route index element={<LoginPage />} />
            <Route path="login" element={<LoginPage />} />

            {/* პროდუქტები */}
            {/* ახალი პროდუქტის დამატება */}
            <Route
              path="addProducts"
              element={
                <ProtectedRoute>
                  <AddProducts />
                </ProtectedRoute>
              }
            />
            {/* რედაქტირება URL-param-ით */}
            <Route
              path="addProducts/:id"
              element={
                <ProtectedRoute>
                  <AddProducts />
                </ProtectedRoute>
              }
            />

            {/* მენიუ/სიები */}
            <Route
              path="menu"
              element={
                <ProtectedRoute>
                  <Menu />
                </ProtectedRoute>
              }
            />

            {/* შეკვეთები */}
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

            {/* სხვა ყველაფერი → login */}
            <Route path="*" element={<Navigate to="login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </LanguageProvider>
  );
}
