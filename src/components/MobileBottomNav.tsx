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
  const NavButton = ({
    isActive,
    onClick,
    icon: Icon,
    label,
    badge,
    badgeColor = "bg-[#00d26a]",
  }: {
    isActive: boolean;
    onClick: () => void;
    icon: React.ElementType;
    label: string;
    badge?: number;
    badgeColor?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 gap-0.5 cursor-pointer relative transition-all duration-200 active:scale-90 ${
        isActive
          ? "text-[#00d26a]"
          : "text-neutral-500 hover:text-neutral-300"
      }`}
    >
      <div className="relative">
        <Icon
          size={21}
          className={isActive ? "stroke-[2.5]" : "stroke-[1.7]"}
        />
        {badge !== undefined && badge > 0 && (
          <span
            className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full ${badgeColor} text-black text-[9px] font-black flex items-center justify-center shadow-lg shadow-black/30`}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span
        className={`text-[9px] uppercase tracking-[0.08em] leading-none mt-0.5 ${
          isActive ? "font-black" : "font-semibold"
        }`}
      >
        {label}
      </span>
      {/* Active indicator dot */}
      {isActive && (
        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00d26a] shadow-[0_0_6px_rgba(0,210,106,0.6)]" />
      )}
    </button>
  );

  // Tab 2 config based on role
  const tab2 = role === "doctor"
    ? { tab: "medicine", icon: Pill, label: "Medicine", isActive: activeTab === "medicine" || activeTab === "appointments" }
    : { tab: "appointments", icon: Calendar, label: "Appoint", isActive: activeTab === "appointments" };

  // Tab 3 config based on role
  const tab3 = role === "doctor"
    ? { tab: "consultation", icon: Stethoscope, label: "Consult", isActive: activeTab === "consultation" }
    : { tab: "billing", icon: CreditCard, label: "Billing", isActive: activeTab === "billing" };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden select-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-[#0a0f1a]/95 backdrop-blur-xl border-t border-white/[0.06] shadow-[0_-8px_32px_rgba(0,0,0,0.5)]" />

      <div className="relative h-[60px] px-2 flex items-center justify-around max-w-lg mx-auto">
        {/* Tab 1: Dashboard */}
        <NavButton
          isActive={activeTab === "dashboard"}
          onClick={() => setActiveTab("dashboard")}
          icon={LayoutDashboard}
          label="Home"
        />

        {/* Tab 2: Medicine / Appointments */}
        <NavButton
          isActive={tab2.isActive}
          onClick={() => setActiveTab(tab2.tab)}
          icon={tab2.icon}
          label={tab2.label}
          badge={role === "receptionist" ? waitingCount : undefined}
        />

        {/* Tab 3: Consultation / Billing */}
        <NavButton
          isActive={tab3.isActive}
          onClick={() => setActiveTab(tab3.tab)}
          icon={tab3.icon}
          label={tab3.label}
          badge={role === "receptionist" ? pendingBillingCount : undefined}
          badgeColor="bg-amber-400"
        />

        {/* Tab 4: Profile */}
        <NavButton
          isActive={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
          icon={User}
          label="Profile"
        />

        {/* Tab 5: Side Panel */}
        <button
          type="button"
          onClick={() => onOpenSidePanel?.()}
          className="flex flex-col items-center justify-center flex-1 h-full py-1.5 gap-0.5 cursor-pointer text-neutral-500 hover:text-neutral-300 transition-all duration-200 active:scale-90"
          aria-label="Open side menu panel"
        >
          <Menu size={21} className="stroke-[1.7]" />
          <span className="text-[9px] uppercase tracking-[0.08em] leading-none font-semibold mt-0.5">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
};
