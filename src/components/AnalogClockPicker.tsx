import React, { useState } from "react";
import { Clock, X, Check } from "lucide-react";

interface AnalogClockPickerProps {
  value: string; // e.g. "10:30 AM"
  onChange: (timeStr: string) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const AnalogClockPicker: React.FC<AnalogClockPickerProps> = ({
  value,
  onChange,
  onConfirm,
  onCancel,
}) => {
  // Parse input string "10:30 AM"
  const parseTimeStr = (str: string) => {
    const match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      return {
        hour: Math.max(1, Math.min(12, parseInt(match[1], 10))),
        minute: Math.max(0, Math.min(59, parseInt(match[2], 10))),
        ampm: match[3].toUpperCase() as "AM" | "PM",
      };
    }
    return { hour: 10, minute: 30, ampm: "AM" as const };
  };

  const parsed = parseTimeStr(value || "10:30 AM");
  const [activeTab, setActiveTab] = useState<"hours" | "minutes">("hours");

  const formatTime = (h: number, m: number, ap: "AM" | "PM") => {
    const hStr = String(h).padStart(2, "0");
    const mStr = String(m).padStart(2, "0");
    return `${hStr}:${mStr} ${ap}`;
  };

  const handleHourSelect = (h: number) => {
    onChange(formatTime(h, parsed.minute, parsed.ampm));
    setActiveTab("minutes");
  };

  const handleMinuteSelect = (m: number) => {
    onChange(formatTime(parsed.hour, m, parsed.ampm));
  };

  const handleAmPmToggle = (ap: "AM" | "PM") => {
    onChange(formatTime(parsed.hour, parsed.minute, ap));
  };

  // Clock Hand Angle based on current selection
  const angleDeg =
    activeTab === "hours"
      ? ((parsed.hour % 12) || 12) * 30
      : parsed.minute * 6;

  return (
    <div
      style={{ maxWidth: "340px", width: "100%" }}
      className="bg-white rounded-3xl p-4 sm:p-5 space-y-3 w-full mx-auto shadow-2xl border border-slate-100 select-none relative"
    >
      {/* Header: Title + Close Icon */}
      <div className="flex items-center justify-between pb-0.5">
        <div className="flex items-center gap-1.5">
          <Clock size={16} className="text-blue-600" />
          <h3 className="text-xs font-black text-slate-900 font-display">Select Time</h3>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Top Bar: Digital Display Pills & AM/PM Toggle (SalonFlow Layout Reference) */}
      <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-2xl flex items-center justify-between shadow-xs">
        {/* Hour : Minute Pill Group */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("hours")}
            className={`px-3 py-1 rounded-xl font-black text-lg transition-all cursor-pointer ${
              activeTab === "hours"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105"
                : "bg-white text-slate-800 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            {String(parsed.hour).padStart(2, "0")}
          </button>

          <span className="font-black text-slate-400 text-lg px-0.5">:</span>

          <button
            type="button"
            onClick={() => setActiveTab("minutes")}
            className={`px-3 py-1 rounded-xl font-black text-lg transition-all cursor-pointer ${
              activeTab === "minutes"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105"
                : "bg-white text-slate-800 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            {String(parsed.minute).padStart(2, "0")}
          </button>
        </div>

        {/* AM / PM Segmented Controls */}
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => handleAmPmToggle("AM")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
              parsed.ampm === "AM"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handleAmPmToggle("PM")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
              parsed.ampm === "PM"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Sub-label instruction */}
      <div className="text-[9px] font-extrabold tracking-wider text-slate-400 text-center uppercase my-1">
        {activeTab === "hours" ? "TAP TO SELECT HOUR" : "TAP TO SELECT MINUTE"}
      </div>

      {/* Analog Clock Face Visualization */}
      <div className="flex flex-col items-center justify-center py-0.5">
        <div className="relative w-48 h-48 rounded-full bg-blue-50/20 border-2 border-blue-100/70 shadow-inner flex items-center justify-center mx-auto">
          {/* Clock Numbers */}
          {activeTab === "hours"
            ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
                const angle = (num * 30 - 90) * (Math.PI / 180);
                const radius = 72;
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);
                const isSelected = parsed.hour === num;
                return (
                  <button
                    key={`hr-${num}`}
                    type="button"
                    onClick={() => handleHourSelect(num)}
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                    }}
                    className={`absolute w-7 h-7 rounded-full text-[11px] font-black flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white scale-110 shadow-lg shadow-blue-600/40 ring-4 ring-blue-100 z-20"
                        : "text-slate-700 hover:bg-white hover:text-blue-600"
                    }`}
                  >
                    {num}
                  </button>
                );
              })
            : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minVal, idx) => {
                const num = idx === 0 ? 12 : idx;
                const angle = (num * 30 - 90) * (Math.PI / 180);
                const radius = 72;
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);
                const isSelected = Math.abs(parsed.minute - minVal) < 3;
                return (
                  <button
                    key={`min-${minVal}`}
                    type="button"
                    onClick={() => handleMinuteSelect(minVal)}
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                    }}
                    className={`absolute w-7 h-7 rounded-full text-[10px] font-black flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 text-white scale-110 shadow-lg shadow-emerald-600/40 ring-4 ring-emerald-100 z-20"
                        : "text-slate-700 hover:bg-white hover:text-emerald-600"
                    }`}
                  >
                    {String(minVal).padStart(2, "0")}
                  </button>
                );
              })}

          {/* Clock Hand Pointer */}
          <div
            className="absolute top-1/2 left-1/2 w-1 h-16 bg-blue-600 rounded-full origin-bottom -translate-x-1/2 -translate-y-full transition-transform duration-200 pointer-events-none"
            style={{ transform: `translate(-50%, -100%) rotate(${angleDeg}deg)` }}
          />

          {/* Center Pin */}
          <div className="absolute w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow pointer-events-none z-10" />
        </div>
      </div>

      {/* Footer Action Buttons: Cancel & Confirm Time */}
      <div className="pt-1.5 flex items-center gap-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel || onConfirm}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex-1 transition-all cursor-pointer text-center"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex-1 shadow-md shadow-blue-600/30 flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
        >
          <Check size={14} />
          <span>Confirm Time</span>
        </button>
      </div>
    </div>
  );
};
