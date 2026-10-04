import React, { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (lang: "en" | "ar") => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Minimal Icon Button (Only Globe Icon, Exactly Matching Bell Button Size & Palette) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs select-none active:scale-95"
        aria-label="Switch Language / تغيير اللغة"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={language === "ar" ? "اللغة: العربية (الكويت)" : "Language: English"}
      >
        <Globe size={16} className="text-slate-600" />
      </button>

      {/* Compact Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${
            isRTL ? "left-0" : "right-0"
          } mt-2 w-48 rounded-2xl bg-white border border-slate-100 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.06)] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Language / اللغة
            </span>
          </div>

          {/* Option 1: English */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelectLanguage("en")}
            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
              language === "en"
                ? "bg-emerald-50/70 text-[#064e3b] font-bold"
                : "text-slate-700 hover:bg-slate-50 font-medium"
            }`}
          >
            <div className="flex flex-col">
              <span className="leading-tight">English</span>
              <span className="text-[10px] text-slate-400 font-normal">English (US/UK)</span>
            </div>
            {language === "en" && <Check size={14} className="text-emerald-600 shrink-0" />}
          </button>

          {/* Option 2: Arabic (Kuwait) */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelectLanguage("ar")}
            className={`w-full text-right px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
              language === "ar"
                ? "bg-emerald-50/70 text-[#064e3b] font-bold"
                : "text-slate-700 hover:bg-slate-50 font-medium"
            }`}
          >
            <div className="flex flex-col text-right">
              <span className="leading-tight font-arabic">العربية (الكويت)</span>
              <span className="text-[10px] text-slate-400 font-normal">Arabic (Kuwait)</span>
            </div>
            {language === "ar" && <Check size={14} className="text-emerald-600 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
};
