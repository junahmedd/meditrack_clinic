import React from "react";
import {
  Users,
  Calendar,
  IndianRupee,
  Star,
  User,
  FolderOpen,
  Receipt,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// 1. Stat Card Component
export interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: string;
  growth: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  iconBg,
  title,
  value,
  growth,
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 truncate">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {value}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
        <TrendingUp size={13} className="shrink-0" />
        <span>{growth}</span>
      </div>
    </div>
  );
};

// 2. Appointment Overview Line Chart Card
const chartData = [
  { day: "Mon", count: 20 },
  { day: "Tue", count: 48 },
  { day: "Wed", count: 42 },
  { day: "Thu", count: 88 },
  { day: "Fri", count: 75 },
  { day: "Sat", count: 50 },
  { day: "Sun", count: 78 },
];

export const AppointmentOverviewCard: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800">
          Appointment Overview
        </h3>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <span>This Week</span>
          <ChevronDown size={14} className="text-slate-400" />
        </button>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <XAxis
              dataKey="day"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              ticks={[0, 20, 40, 60, 80, 100]}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f2942",
                borderColor: "#0f2942",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "11px",
              }}
              itemStyle={{ color: "#38bdf8" }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#0284c7"
              strokeWidth={3}
              dot={{
                r: 4,
                fill: "#0284c7",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: "#0ea5e9",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 3. Upcoming Appointments Card
const sampleAppointments = [
  {
    time: "10:30 AM",
    name: "John Doe",
    type: "General Consultation",
    status: "Upcoming",
    statusColor: "bg-blue-50 text-blue-700 border-blue-200",
    avatarBg: "bg-blue-100 text-blue-700",
  },
  {
    time: "11:45 AM",
    name: "Jane Smith",
    type: "Follow-up",
    status: "Upcoming",
    statusColor: "bg-blue-50 text-blue-700 border-blue-200",
    avatarBg: "bg-teal-100 text-teal-700",
  },
  {
    time: "02:00 PM",
    name: "Mike Johnson",
    type: "Lab Test",
    status: "Completed",
    statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    avatarBg: "bg-indigo-100 text-indigo-700",
  },
];

export const UpcomingAppointmentsCard: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800">
          Upcoming Appointments
        </h3>
        <button
          type="button"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
        >
          View All
        </button>
      </div>

      <div className="space-y-3">
        {sampleAppointments.map((apt, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${apt.avatarBg}`}
              >
                {apt.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  <span className="text-slate-400 font-medium mr-1.5">
                    {apt.time}
                  </span>
                  {apt.name}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{apt.type}</p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${apt.statusColor}`}
            >
              {apt.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. Quick Access Card
const quickActions = [
  { label: "Add Patient", icon: User, color: "text-blue-600 bg-blue-50" },
  {
    label: "New Appointment",
    icon: Calendar,
    color: "text-teal-600 bg-teal-50",
  },
  {
    label: "Patient Records",
    icon: FolderOpen,
    color: "text-indigo-600 bg-indigo-50",
  },
  { label: "Billing", icon: Receipt, color: "text-purple-600 bg-purple-50" },
  { label: "Reports", icon: BarChart3, color: "text-sky-600 bg-sky-50" },
  { label: "Settings", icon: Settings, color: "text-slate-600 bg-slate-100" },
];

export const QuickAccessCard: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-100 flex-1">
      <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Access</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {quickActions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <div
              key={idx}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform ${action.color}`}
              >
                <Icon size={18} />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                {action.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 5. Healthcare Message Card
export const HealthcareMessageCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-white to-blue-50/40 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-blue-100/60 flex flex-col justify-between relative overflow-hidden w-full lg:w-72 shrink-0">
      <div>
        <h3 className="text-sm font-black text-[#0f2942] tracking-tight">
          Better Care. Every Day.
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
          We're here to help you focus on what matters most — your patients.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-end">
        {/* Medical EKG Heartbeat Graphic */}
        <div className="w-32 h-10 opacity-80">
          <svg viewBox="0 0 140 40" fill="none" className="w-full h-full">
            <path
              d="M0 20H40L45 10L50 30L55 5L60 35L65 18L70 24L75 20H140"
              stroke="#0ea5e9"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Heart symbol at end */}
            <path
              d="M105 14C105 10 110 7 115 10C120 13 118 21 112 27C108 31 105 33 105 33C105 33 102 31 98 27C92 21 90 13 95 10C100 7 105 10 105 14Z"
              fill="#06b6d4"
              opacity="0.25"
            />
            <path
              d="M105 14C105 10 110 7 115 10C120 13 118 21 112 27C108 31 105 33 105 33C105 33 102 31 98 27C92 21 90 13 95 10C100 7 105 10 105 14Z"
              stroke="#06b6d4"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
