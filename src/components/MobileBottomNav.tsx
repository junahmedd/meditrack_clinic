import React from "react";
import {
  LayoutDashboard,
  Calendar,
  CreditCard,
  Stethoscope,
  Pill,
  User,
  Menu,
} from "lucide-react";

interface MobileBottomNavProps {
  role: "doctor" | "receptionist" | "admin";
  activeTab: string;
  setActiveTab: (tab: any) => void;
  waitingCount?: number;
  pendingBillingCount?: number;
  doctorCategory?: "GP" | "PEDIATRICIAN" | "DENTIST";
  onOpenSidePanel?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  role,
  activeTab,
  setActiveTab,
  waitingCount = 0,
  pendingBillingCount = 0,
  onOpenSidePanel,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-neutral-800/80 z-40 md:hidden select-none shadow-[0_-4px_25px_rgba(0,0,0,0.7)]">
      <div className="h-16 px-1 flex items-center justify-around max-w-lg mx-auto">
        {/* Tab 1: Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 cursor-pointer transition-colors active:scale-95 ${
            activeTab === "dashboard"
              ? "text-[#00d26a] font-black"
              : "text-neutral-400 hover:text-white font-bold"
          }`}
        >
          <LayoutDashboard
            size={20}
            className={activeTab === "dashboard" ? "stroke-[2.5] text-[#00d26a]" : "stroke-[1.8]"}
          />
          <span className="text-[9px] uppercase tracking-wider leading-none">
            Dashboard
          </span>
        </button>

        {/* Tab 2: Medicine (Doctor) / Appointments (Receptionist) */}
        <button
          type="button"
          onClick={() => {
            if (role === "doctor") setActiveTab("medicine");
            else if (role === "receptionist") setActiveTab("appointments");
            else setActiveTab("dashboard");
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 cursor-pointer relative transition-colors active:scale-95 ${
            (role === "doctor" && (activeTab === "medicine" || activeTab === "appointments")) ||
            (role === "receptionist" && activeTab === "appointments")
              ? "text-[#00d26a] font-black"
              : "text-neutral-400 hover:text-white font-bold"
          }`}
        >
          {role === "doctor" ? (
            <Pill
              size={20}
              className={
                activeTab === "medicine" || activeTab === "appointments"
                  ? "stroke-[2.5] text-[#00d26a]"
                  : "stroke-[1.8]"
              }
            />
          ) : (
            <Calendar
              size={20}
              className={activeTab === "appointments" ? "stroke-[2.5] text-[#00d26a]" : "stroke-[1.8]"}
            />
          )}
          <span className="text-[9px] uppercase tracking-wider leading-none">
            {role === "doctor" ? "Medicine" : "Appoint"}
          </span>
          {role === "receptionist" && waitingCount > 0 && (
            <span className="absolute top-1 right-2.5 w-4 h-4 rounded-full bg-[#00d26a] text-black text-[9px] font-black flex items-center justify-center">
              {waitingCount}
            </span>
          )}
        </button>

        {/* Tab 3: Consultation (Doctor) / Billing (Receptionist) */}
        <button
          type="button"
          onClick={() => {
            if (role === "doctor") setActiveTab("consultation");
            else if (role === "receptionist") setActiveTab("billing");
            else setActiveTab("dashboard");
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 cursor-pointer relative transition-colors active:scale-95 ${
            (role === "doctor" && activeTab === "consultation") ||
            (role === "receptionist" && activeTab === "billing")
              ? "text-[#00d26a] font-black"
              : "text-neutral-400 hover:text-white font-bold"
          }`}
        >
          {role === "doctor" ? (
            <Stethoscope
              size={20}
              className={activeTab === "consultation" ? "stroke-[2.5] text-[#00d26a]" : "stroke-[1.8]"}
            />
          ) : (
            <CreditCard
              size={20}
              className={activeTab === "billing" ? "stroke-[2.5] text-[#00d26a]" : "stroke-[1.8]"}
            />
          )}
          <span className="text-[9px] uppercase tracking-wider leading-none">
            {role === "doctor" ? "Consult" : "Billing"}
          </span>
          {role === "receptionist" && pendingBillingCount > 0 && (
            <span className="absolute top-1 right-2.5 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center">
              {pendingBillingCount}
            </span>
          )}
        </button>

        {/* Tab 4: Profile */}
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 cursor-pointer transition-colors active:scale-95 ${
            activeTab === "profile"
              ? "text-[#00d26a] font-black"
              : "text-neutral-400 hover:text-white font-bold"
          }`}
        >
          <User
            size={20}
            className={activeTab === "profile" ? "stroke-[2.5] text-[#00d26a]" : "stroke-[1.8]"}
          />
          <span className="text-[9px] uppercase tracking-wider leading-none">
            Profile
          </span>
        </button>

        {/* Tab 5: Side Panel (Drawer) */}
        <button
          type="button"
          onClick={() => {
            if (onOpenSidePanel) onOpenSidePanel();
          }}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 cursor-pointer text-neutral-400 hover:text-white font-bold transition-colors active:scale-95"
          aria-label="Open side menu panel"
        >
          <Menu size={20} className="stroke-[1.8]" />
          <span className="text-[9px] uppercase tracking-wider leading-none">
            Panel
          </span>
        </button>
      </div>

      {/* iOS Home Indicator Safe Area Inset Spacing */}
      <div className="h-[max(env(safe-area-inset-bottom),0px)]" />
    </nav>
  );
};
