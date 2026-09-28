import React from "react";

interface MediTrackLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  showSubtitle?: boolean;
  showBadge?: boolean;
  className?: string;
  theme?: "light" | "dark" | "white";
}

export const MediTrackLogo: React.FC<MediTrackLogoProps> = ({
  size = "md",
  showWordmark = true,
  showSubtitle = true,
  showBadge = false,
  className = "",
  theme = "dark",
}) => {
  const iconDimensions = {
    xs: "w-7 h-7",
    sm: "w-9 h-9",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-14 h-14",
  }[size];

  const titleSize = {
    xs: "text-base",
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  }[size];

  const subtitleSize = {
    xs: "text-[7.5px]",
    sm: "text-[8.5px]",
    md: "text-[10px]",
    lg: "text-[11px]",
    xl: "text-xs",
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Vector Heart + Cross Icon matching reference image */}
      <div className={`relative ${iconDimensions} flex items-center justify-center shrink-0`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(16,185,129,0.35)]"
        >
          {/* Heart Outline & Base */}
          <path
            d="M50 88C50 88 12 62 12 36C12 21 24 10 38 10C46 10 50 16 50 16C50 16 54 10 62 10C76 10 88 21 88 36C88 62 50 88 50 88Z"
            fill="url(#heartBaseGradient)"
          />

          {/* Glowing Inner Gradient Layer */}
          <path
            d="M50 82C50 82 18 58 18 36C18 24 28 15 39 15C46 15 50 20 50 20C50 20 54 15 61 15C72 15 82 24 82 36C82 58 50 82 50 82Z"
            fill="url(#heartInnerGradient)"
          />

          {/* Crisp Pure White Medical Cross */}
          <rect x="44" y="27" width="12" height="34" rx="4" fill="white" />
          <rect x="33" y="38" width="34" height="12" rx="4" fill="white" />

          {/* Gradients */}
          <defs>
            <linearGradient id="heartBaseGradient" x1="12" y1="10" x2="88" y2="88" gradientUnits="userSpaceOnUse">
              <stop stopColor="#064e3b" />
              <stop offset="0.5" stopColor="#059669" />
              <stop offset="1" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="heartInnerGradient" x1="50" y1="15" x2="50" y2="82" gradientUnits="userSpaceOnUse">
              <stop stopColor="#043d2e" stopOpacity="0.85" />
              <stop offset="1" stopColor="#10b981" stopOpacity="0.95" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Typography Wordmark */}
      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <div className={`font-black tracking-tight leading-none ${titleSize}`}>
              <span className={theme === "light" ? "text-[#0f2942]" : "text-white"}>
                Medi
              </span>
              <span className={theme === "white" ? "text-emerald-300" : "text-[#059669]"} style={{ fontWeight: 900 }}>
                Track
              </span>
            </div>

            {showBadge && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase border border-teal-500/30 text-teal-300 bg-teal-500/10">
                CLINIC MANAGEMENT OS
              </span>
            )}
          </div>

          {showSubtitle && (
            <p className={`font-bold tracking-widest uppercase mt-1 ${subtitleSize} ${
              theme === "white" ? "text-teal-100/70" : theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}>
              CLINIC MANAGEMENT SYSTEM
            </p>
          )}
        </div>
      )}
    </div>
  );
};
