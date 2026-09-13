import React from "react";
import {
  Lock,
  MoreHorizontal,
  Home,
  Users,
  Calendar,
  FileText,
  Package,
  UserCheck,
  BarChart2,
  Settings,
  TrendingUp,
  Activity,
  User,
} from "lucide-react";

export const DashboardBrowserMockup: React.FC = () => {
  return (
    <div className="w-full rounded-2xl bg-[#09111e]/95 border border-slate-700/60 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl overflow-hidden select-none">
      {/* 1. Browser Window Header */}
      <div className="h-8 px-3.5 bg-[#060b14] border-b border-slate-800/90 flex items-center justify-between">
        {/* Left Window Control Dots */}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
        </div>

        {/* Center URL Address Bar */}
        <div className="flex items-center gap-1.5 px-3.5 py-0.5 rounded-full bg-[#0d1728] border border-slate-700/50 text-[10px] font-mono text-slate-300">
          <Lock size={10} className="text-emerald-400" />
          <span>app.meditrack.com/dashboard</span>
        </div>

        {/* Right Menu Dots */}
        <div className="text-slate-500">
          <MoreHorizontal size={13} />
        </div>
      </div>

      {/* 2. Mockup Body: Sidebar + Main Content */}
      <div className="flex p-2.5 gap-2.5 bg-[#070d18]/90">
        {/* Mini Sidebar with Menu Text */}
        <div className="w-28 bg-[#0c1628]/95 rounded-xl p-2 flex flex-col justify-between border border-slate-800/80 shrink-0">
          <div className="space-y-1">
            {/* Active Dashboard item */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0ea5e9]/20 text-[#38bdf8] font-bold text-[9px] border border-[#0ea5e9]/30">
              <Home size={11} className="shrink-0 text-[#38bdf8]" />
              <span>Dashboard</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[9px] font-medium">
              <Calendar size={11} className="shrink-0" />
              <span>Appointments</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[9px] font-medium">
              <Users size={11} className="shrink-0" />
              <span>Patients</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[9px] font-medium">
              <FileText size={11} className="shrink-0" />
              <span>Billing</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[9px] font-medium">
              <Package size={11} className="shrink-0" />
              <span>Inventory</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[9px] font-medium">
              <UserCheck size={11} className="shrink-0" />
              <span>Staff</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[9px] font-medium">
              <BarChart2 size={11} className="shrink-0" />
              <span>Reports</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-300 text-[9px] font-medium pt-1 border-t border-slate-800/60">
            <Settings size={11} className="shrink-0" />
            <span>Settings</span>
          </div>
        </div>

        {/* Main Dashboard Preview Canvas */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Row 1: 4 Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {/* Card 1: Today's Revenue */}
            <div className="bg-[#0c1628]/95 border border-slate-800/90 rounded-xl p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[8.5px] font-medium">
                <span className="truncate">Today's Revenue</span>
                <div className="w-4 h-4 rounded bg-[#0284c7]/20 text-[#38bdf8] flex items-center justify-center shrink-0">
                  <Activity size={9} />
                </div>
              </div>
              <div className="mt-0.5">
                <span className="text-xs sm:text-[13px] font-extrabold text-white">
                  ₹18,450
                </span>
                <div className="flex items-center gap-0.5 text-[8px] font-bold text-emerald-400">
                  <span>+14%</span>
                </div>
              </div>
            </div>

            {/* Card 2: Appointments */}
            <div className="bg-[#0c1628]/95 border border-slate-800/90 rounded-xl p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[8.5px] font-medium">
                <span>Appointments</span>
                <div className="w-4 h-4 rounded bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <Calendar size={9} />
                </div>
              </div>
              <div className="mt-0.5">
                <span className="text-xs sm:text-[13px] font-extrabold text-white">
                  24
                </span>
                <div className="text-[8px] font-bold text-[#38bdf8]">
                  8 Upcoming
                </div>
              </div>
            </div>

            {/* Card 3: Patients */}
            <div className="bg-[#0c1628]/95 border border-slate-800/90 rounded-xl p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[8.5px] font-medium">
                <span>Patients</span>
                <div className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <User size={9} />
                </div>
              </div>
              <div className="mt-0.5">
                <span className="text-xs sm:text-[13px] font-extrabold text-white">
                  86
                </span>
                <div className="text-[8px] font-bold text-emerald-400">
                  12 New
                </div>
              </div>
            </div>

            {/* Card 4: Active Staff */}
            <div className="bg-[#0c1628]/95 border border-slate-800/90 rounded-xl p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[8.5px] font-medium">
                <span>Active Staff</span>
                <div className="w-4 h-4 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Users size={9} />
                </div>
              </div>
              <div className="mt-0.5">
                <span className="text-xs sm:text-[13px] font-extrabold text-white">
                  8 Active
                </span>
                <div className="text-[8px] font-bold text-slate-400">
                  100% Ready
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Today's Live Appointments Table */}
          <div className="bg-[#0c1628]/95 border border-slate-800/90 rounded-xl p-2.5 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] font-bold text-white tracking-wide">
                Today's Live Appointments
              </h4>
              <span className="text-[9px] font-bold text-[#0ea5e9] hover:underline cursor-pointer">
                View All
              </span>
            </div>

            <div className="space-y-1">
              {/* Row 1 */}
              <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/[0.03] border border-white/[0.04] text-[9px]">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono">10:00 AM</span>
                  <span className="font-semibold text-slate-200">
                    General Consultation
                  </span>
                  <span className="text-slate-400 hidden sm:inline">John</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[7.5px] font-black tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  CONFIRMED
                </span>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/[0.03] border border-white/[0.04] text-[9px]">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono">11:30 AM</span>
                  <span className="font-semibold text-slate-200">
                    Follow-up
                  </span>
                  <span className="text-slate-400 hidden sm:inline">Priya</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[7.5px] font-black tracking-wider uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  IN CONSULTATION
                </span>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/[0.03] border border-white/[0.04] text-[9px]">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono">01:00 PM</span>
                  <span className="font-semibold text-slate-200">Lab Test</span>
                  <span className="text-slate-400 hidden sm:inline">
                    Ananya
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[7.5px] font-black tracking-wider uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  COMPLETED
                </span>
              </div>

              {/* Row 4 */}
              <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/[0.03] border border-white/[0.04] text-[9px]">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono">03:30 PM</span>
                  <span className="font-semibold text-slate-200">
                    Dental Consultation
                  </span>
                  <span className="text-slate-400 hidden sm:inline">Rahul</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[7.5px] font-black tracking-wider uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  PENDING
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
