import React, { createContext, useContext, useState } from "react";

// კონტექსტის შექმნა
const LangContext = createContext();

export const LanguageProvider = ({ children }) => {
  // default ენად ქართული (ka)
  const [lang, setLang] = useState("ka");

  // გადაცემს: lang (მიმდინარე ენა) და setLang (ენის შეცვლა)
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
};

// hook რომლითაც ნებისმიერი კომპონენტიდან გამოიძახებ
export const useLang = () => useContext(LangContext);
