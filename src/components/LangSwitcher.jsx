import React from "react";
import { useLang } from "../LanguageContext";

export default function LangSwitcher({ compact = false }) {
  const { lang, setLang } = useLang();

  const btn = (code, label) => (
    <button
      onClick={() => setLang(code)}
      aria-pressed={lang === code}
      style={{
        padding: compact ? "4px 8px" : "6px 12px",
        borderRadius: 999,
        border: "1px solid #ddd",
        background: lang === code ? "#111" : "#fff",
        color: lang === code ? "#fff" : "#111",
        fontWeight: lang === code ? 700 : 500,
        cursor: "pointer",
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
