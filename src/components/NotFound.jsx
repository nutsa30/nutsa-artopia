import React from "react";
import { Link } from "react-router-dom";
import SEO from "./SEO";

// არარსებული გვერდი / პროდუქტი / კატეგორია / სტატია. HTTP 404 (ან 410) სტატუსს
// edge function აბრუნებს; ეს კომპონენტი მომხმარებელს უხსნის რა მოხდა და
// noindex-ს სვამს, რომ ასეთი გვერდი ინდექსში არ მოხვდეს.
const wrap = {
  minHeight: "60vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  padding: "48px 20px",
  textAlign: "center",
};
const linkStyle = {
  color: "inherit",
  textDecoration: "underline",
  textUnderlineOffset: 4,
  fontWeight: 700,
};

export default function NotFound({ gone = false, what = "გვერდი" }) {
  const title = gone ? `${what} აღარ იყიდება` : `${what} ვერ მოიძებნა`;
  const text = gone
    ? "ეს პროდუქტი გაყიდვიდან ამოღებულია. ნახეთ მსგავსი პროდუქტები კატალოგში."
    : "მისამართი არასწორია ან გვერდი აღარ არსებობს.";
  return (
    <div style={wrap} data-not-found={gone ? "410" : "404"}>
      <SEO title={title} description={text} noIndex />
      <h1 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800 }}>{title}</h1>
      <p style={{ opacity: 0.85, maxWidth: 520 }}>{text}</p>
      <p style={{ display: "flex", gap: 22, flexWrap: "wrap", justifyContent: "center" }}>
        <Link to="/products" style={linkStyle}>პროდუქტების ნახვა</Link>
        <Link to="/" style={linkStyle}>მთავარი გვერდი</Link>
      </p>
    </div>
  );
}
