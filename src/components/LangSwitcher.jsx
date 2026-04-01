import React from "react";

export default function LangSwitcher({ compact = false }) {
  const btn = (code, label) => (
    <button
      onClick={(e) => e.preventDefault()} // ❌ არაფერს არ აკეთებს
      aria-pressed={false}
      style={{
        padding: compact ? "4px 8px" : "6px 12px",
        borderRadius: 999,
        border: "1px solid #ddd",
        background: "#fff",
        color: "#111",
        fontWeight: 500,
        cursor: "default",
        opacity: 0.6, // პატარა ვიზუალური მინიშნება რომ inactive-ია
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {btn("ka", "KA")}
      {btn("en", "EN")}
    </div>
  );
}