import React, { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  Stethoscope,
  FileText,
  BarChart2,
  Settings,
  MoreHorizontal,
  X,
  Smile,
  FlaskConical,
  Pill,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MobileBottomNavProps {
  role: "doctor" | "receptionist" | "admin";
  activeTab: string;
  setActiveTab: (tab: any) => void;
  waitingCount?: number;
  pendingBillingCount?: number;
  doctorCategory?: "GP" | "PEDIATRICIAN" | "DENTIST";
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  role,
  activeTab,
  setActiveTab,
  waitingCount = 0,
  pendingBillingCount = 0,
  doctorCategory = "GP",
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Mobile Bottom Sheet Drawer for "More" Menu items */}
      <AnimatePresence>
        {isMoreOpen && (
          <motion.div
            key="mobile-more-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMoreOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl p-6 space-y-4 border-t border-slate-200 pb-safe shadow-2xl"
            >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto" />

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider">
                  More Clinical Apps &amp; Modules
                </h3>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Grid of secondary menu options */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {role === "doctor" && (
                  <>
                    <button
                      onClick={() => handleTabClick("consultation")}
                      className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center border cursor-pointer ${
                        activeTab === "consultation"
                          ? "bg-blue-600 text-white border-blue-600 font-bold shadow-md shadow-blue-600/20"
                          : "bg-slate-50 text-slate-700 border-slate-200/80"
                      }`}
                    >
                      <Stethoscope size={20} />
                      <span className="text-[11px] font-extrabold leading-tight">Consultation</span>
                    </button>

                    <button
                      onClick={() => handleTabClick("prescriptions")}
                      className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center border cursor-pointer ${
                        activeTab === "prescriptions"
                          ? "bg-blue-600 text-white border-blue-600 font-bold shadow-md shadow-blue-600/20"
                          : "bg-slate-50 text-slate-700 border-slate-200/80"
                      }`}
                    >
                      <FileText size={20} />
                      <span className="text-[11px] font-extrabold leading-tight">Prescriptions</span>
                    </button>

                    <button
                      onClick={() => handleTabClick("lab_orders")}
                      className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center border cursor-pointer ${
                        activeTab === "lab_orders"
                          ? "bg-blue-600 text-white border-blue-600 font-bold shadow-md shadow-blue-600/20"
                          : "bg-slate-50 text-slate-700 border-slate-200/80"
                      }`}
                    >
                      {doctorCategory === "DENTIST" ? <Smile size={20} /> : <FlaskConical size={20} />}
                      <span className="text-[11px] font-extrabold leading-tight">
                        {doctorCategory === "DENTIST" ? "Dental Chart" : "Lab Orders"}
                      </span>
                    </button>
                  </>
                )}

                {role === "receptionist" && (
                  <button
                    onClick={() => handleTabClick("billing")}
                    className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center border cursor-pointer relative ${
                      activeTab === "billing"
                        ? "bg-blue-600 text-white border-blue-600 font-bold shadow-md shadow-blue-600/20"
                        : "bg-slate-50 text-slate-700 border-slate-200/80"
                    }`}
                  >
                    <CreditCard size={20} />
                    <span className="text-[11px] font-extrabold leading-tight">Billing &amp; Fees</span>
                    {pendingBillingCount > 0 && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                        {pendingBillingCount}
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={() => handleTabClick("reports")}
                  className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center border cursor-pointer ${
                    activeTab === "reports"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-md shadow-blue-600/20"
                      : "bg-slate-50 text-slate-700 border-slate-200/80"
                  }`}
                >
                  <BarChart2 size={20} />
                  <span className="text-[11px] font-extrabold leading-tight">Reports</span>
                </button>

                <button
                  onClick={() => handleTabClick("settings")}
                  className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center border cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-md shadow-blue-600/20"
                      : "bg-slate-50 text-slate-700 border-slate-200/80"
                  }`}
                >
                  <Settings size={20} />
                  <span className="text-[11px] font-extrabold leading-tight">Settings</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Touch Bottom Navigation Bar (Fixed to bottom on screens < 768px) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#070d18] border-t border-slate-800 text-slate-400 flex items-center justify-around z-30 md:hidden pb-safe select-none shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        {/* Tab 1: Dashboard */}
        <button
          type="button"
          onClick={() => handleTabClick("dashboard")}
          className={`flex flex-col items-center justify-center w-full h-full gap-0.5 cursor-pointer touch-target ${
            activeTab === "dashboard" ? "text-blue-400 font-extrabold" : "hover:text-slate-200"
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>

        {/* Tab 2: Medicine (Doctor) / Appointments (Receptionist) */}
        <button
          type="button"
          onClick={() => handleTabClick(role === "doctor" ? "medicine" : "appointments")}
          className={`flex flex-col items-center justify-center w-full h-full gap-0.5 cursor-pointer relative touch-target ${
            activeTab === "appointments" || activeTab === "medicine"
              ? "text-blue-400 font-extrabold"
              : "hover:text-slate-200"
          }`}
        >
          {role === "doctor" ? <Pill size={20} /> : <Calendar size={20} />}
          <span className="text-[10px] font-bold">
            {role === "doctor" ? "Medicine" : "Appointments"}
          </span>
          {role === "receptionist" && waitingCount > 0 && (
            <span className="absolute top-2 right-4 w-4 h-4 rounded-full bg-blue-600 text-white text-[9.5px] font-black flex items-center justify-center">
              {waitingCount}
            </span>
          )}
        </button>

        {/* Tab 3: Consultation (Doctor) / Billing (Receptionist) */}
        <button
          type="button"
          onClick={() => handleTabClick(role === "doctor" ? "consultation" : "billing")}
          className={`flex flex-col items-center justify-center w-full h-full gap-0.5 cursor-pointer relative touch-target ${
            (role === "doctor" && activeTab === "consultation") || (role === "receptionist" && activeTab === "billing")
              ? "text-blue-400 font-extrabold"
              : "hover:text-slate-200"
          }`}
        >
          {role === "doctor" ? <Stethoscope size={20} /> : <CreditCard size={20} />}
          <span className="text-[10px] font-bold">
            {role === "doctor" ? "Consultation" : "Billing"}
          </span>
          {role === "receptionist" && pendingBillingCount > 0 && (
            <span className="absolute top-2 right-4 w-4 h-4 rounded-full bg-amber-500 text-white text-[9.5px] font-black flex items-center justify-center">
              {pendingBillingCount}
            </span>
          )}
        </button>

        {/* Tab 4: Profile */}
        <button
          type="button"
          onClick={() => handleTabClick("profile")}
          className={`flex flex-col items-center justify-center w-full h-full gap-0.5 cursor-pointer touch-target ${
            activeTab === "profile" ? "text-blue-400 font-extrabold" : "hover:text-slate-200"
          }`}
        >
          <Settings size={20} />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>
    </>
  );
};
