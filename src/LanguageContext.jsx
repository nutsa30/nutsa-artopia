import React, { createContext, useContext, useEffect, useState } from "react";

const LangContext = createContext({ lang: "ka", setLang: () => {} });

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("artopia:lang") || "ka";
    } catch { return "ka"; }
  });

  useEffect(() => {
    try { localStorage.setItem("artopia:lang", lang); } catch {}
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
