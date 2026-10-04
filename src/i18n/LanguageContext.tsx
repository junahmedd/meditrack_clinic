import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Language, translations, TranslationDictionary } from "./translations";

interface LanguageContextType {
  language: Language;
  direction: "ltr" | "rtl";
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationDictionary, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "meditrack_language";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "ar" || saved === "en") {
        return saved;
      }
    } catch (e) {
      console.warn("Could not read language from localStorage", e);
    }
    return "en";
  });

  const direction: "ltr" | "rtl" = language === "ar" ? "rtl" : "ltr";
  const isRTL = direction === "rtl";

  // Synchronize document dir, lang, and font classes
  useEffect(() => {
    try {
      document.documentElement.setAttribute("dir", direction);
      document.documentElement.setAttribute("lang", language);
      if (isRTL) {
        document.documentElement.classList.add("rtl");
        document.body.classList.add("rtl");
      } else {
        document.documentElement.classList.remove("rtl");
        document.body.classList.remove("rtl");
      }
    } catch (e) {
      console.warn("Failed to set document attributes", e);
    }
  }, [language, direction, isRTL]);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn("Could not save language to localStorage", e);
    }
  }, []);

  const t = useCallback(
    (key: keyof TranslationDictionary, fallback?: string): string => {
      const currentDict = translations[language];
      if (currentDict && currentDict[key]) {
        return currentDict[key];
      }
      const fallbackDict = translations.en;
      if (fallbackDict && fallbackDict[key]) {
        return fallbackDict[key];
      }
      return fallback || String(key);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, direction, isRTL, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
