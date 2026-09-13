import React, { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Building2,
  Phone,
  User as UserIcon,
  Calendar,
  FileText,
  Activity,
  Shield,
  Users,
  Globe,
  HelpCircle,
  MapPin,
  CheckCircle2,
  Zap,
  Star,
  Rocket,
  Info,
  Sparkles,
  Cloud,
} from "lucide-react";
import { MediTrackLogo } from "./MediTrackLogo";
import { DashboardBrowserMockup } from "./DashboardBrowserMockup";

interface LoginPageProps {
  authMode: "login" | "signup";
  setAuthMode: (mode: "login" | "signup") => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  authLoading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  onLoginSubmit: (e: React.FormEvent, selectedPortal?: "doctor" | "receptionist" | "admin", doctorCategory?: "GP" | "PEDIATRICIAN" | "DENTIST") => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onForgotPasswordClick: () => void;
  onSelectDemoAccount?: (accountType: "gp_doctor" | "gp_receptionist" | "ped_doctor" | "ped_receptionist" | "dent_doctor" | "dent_receptionist" | "admin") => void;
  signupData: {
    fullName: string;
    clinicName: string;
    clinicId: string;
    clinicAddress: string;
    role: string;
    category?: "GP" | "PEDIATRICIAN" | "DENTIST";
    contactNumber: string;
    email: string;
    password: string;
    isRegisteringClinic: boolean;
  };
  setSignupData: React.Dispatch<React.SetStateAction<any>>;
  onSignupSubmit: (e: React.FormEvent) => Promise<void>;
  signupSuccess?: boolean;
  onDismissSignupSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  authLoading,
  error,
  setError,
  onLoginSubmit,
  onGoogleSignIn,
  onForgotPasswordClick,
  onSelectDemoAccount,
  signupData,
  setSignupData,
  onSignupSubmit,
  signupSuccess = false,
  onDismissSignupSuccess,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Portal & Category Selectors for Login
  const [selectedPortal, setSelectedPortal] = useState<"doctor" | "receptionist" | "admin">("doctor");
  const [selectedCategory, setSelectedCategory] = useState<"GP" | "PEDIATRICIAN" | "DENTIST">("GP");

  const handleSignupFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (confirmPassword && signupData.password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }
    onSignupSubmit(e);
  };

  const handleLoginFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSubmit(e, selectedPortal, selectedCategory);
  };

  // Password strength calculation helper
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 3, label: "Strong", color: "text-emerald-500" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "text-rose-500" };
    if (score === 2) return { score: 2, label: "Medium", color: "text-amber-500" };
    return { score: 3, label: "Strong", color: "text-emerald-500" };
  };

  const pwdStrength = getPasswordStrength(signupData.password);

  const formatErrorMessage = (err: string | null) => {
    if (!err) return "";
    if (err.includes("auth/email-already-in-use") || err.includes("email-already-in-use")) {
      return "This email is already registered in MediTrack. Please switch to the 'Sign In' tab above to log in to your account.";
    }
    if (err.startsWith("{") && err.includes('"error"')) {
      try {
        const parsed = JSON.parse(err);
        if (parsed.error) {
          if (parsed.error.includes("Missing or insufficient permissions")) {
            return "Unable to access clinic database: Permission denied or session expired. Please verify your role or re-login.";
          }
          return parsed.error;
        }
      } catch (e) {}
    }
    return err;
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#030712] font-sans antialiased overflow-y-auto lg:overflow-hidden select-none no-scrollbar">
      {/* ========================================================================= */}
      {/* LEFT PANEL (~54% width) — DARK NAVY / BLACK BRANDING (DESKTOP ONLY)       */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex w-full lg:w-[54%] xl:w-[55%] h-full max-h-screen bg-gradient-to-b from-[#020610] via-[#040a17] to-[#030812] p-4 sm:p-6 xl:p-8 flex-col justify-between relative overflow-hidden shrink-0 border-r border-slate-800/60 order-2 lg:order-1 no-scrollbar">
        {/* Subtle Atmospheric Glows */}
        <div className="absolute top-1/4 left-1/4 w-[420px] h-[420px] bg-[#0284c7]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* 1. Top-Left MediTrack Branding */}
        <div className="relative z-10 shrink-0">
          <MediTrackLogo size="md" theme="dark" showBadge={true} />
        </div>

        {/* 2. Content Center Area */}
        <div className="relative z-10 my-auto py-1 space-y-2.5 max-w-2xl">
          {/* Main Headline */}
          {authMode === "login" ? (
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl xl:text-[34px] font-extrabold text-white leading-[1.15] tracking-tight">
                The Operating System
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d2ff] via-[#38bdf8] to-[#0ea5e9]">
                  for Modern Clinics.
                </span>
              </h1>
              <p className="text-slate-300 text-xs sm:text-[12px] font-normal leading-relaxed max-w-xl">
                MediTrack brings appointments, patient records, billing, staff management, and clinic operations together in one seamless platform.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl xl:text-[36px] font-extrabold text-white leading-[1.15] tracking-tight">
                Manage Your Clinic
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d2ff] via-[#38bdf8] to-[#0ea5e9]">
                  Smarter &amp; Faster
                </span>
              </h1>
              <p className="text-slate-300 text-xs sm:text-[12.5px] font-normal leading-relaxed max-w-xl">
                The all-in-one clinic operating system for queue management, billing,
                automated WhatsApp prescriptions, and patient records.
              </p>
            </div>
          )}

          {authMode === "signup" ? (
            /* ================= EXACT 3 FEATURE CARDS (FOR SIGNUP SCREEN) ================= */
            <div className="space-y-2 pt-0.5">
              {/* Card 1: Smart Appointments & Live Queue */}
              <div className="p-2.5 rounded-2xl bg-[#081220]/80 border border-slate-800/80 flex items-start gap-3 backdrop-blur-md shadow-lg shadow-black/20 hover:border-slate-700/80 transition-all">
                <div className="w-8 h-8 rounded-xl bg-[#0284c7]/20 text-[#38bdf8] flex items-center justify-center shrink-0 border border-[#0ea5e9]/30 shadow-sm mt-0.5">
                  <Calendar size={15} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-[12.5px] font-bold text-white mb-0.5 tracking-tight">
                    Smart Appointments &amp; Live Queue
                  </h3>
                  <p className="text-[10.5px] text-slate-300 leading-relaxed font-normal">
                    Schedule consultations, manage live queues, and dispense prescriptions with real-time sync across reception and doctor desks.
                  </p>
                </div>
              </div>

              {/* Card 2: Automated WhatsApp Invoices & PDF */}
              <div className="p-2.5 rounded-2xl bg-[#081220]/80 border border-slate-800/80 flex items-start gap-3 backdrop-blur-md shadow-lg shadow-black/20 hover:border-slate-700/80 transition-all">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/30 shadow-sm mt-0.5">
                  <FileText size={15} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-[12.5px] font-bold text-white mb-0.5 tracking-tight">
                    Automated WhatsApp Invoices &amp; PDF
                  </h3>
                  <p className="text-[10.5px] text-slate-300 leading-relaxed font-normal">
                    Deliver digital prescriptions, GST receipts, and dosage timetables directly to customer WhatsApp chats instantly.
                  </p>
                </div>
              </div>

              {/* Card 3: FIFO Pharmacy & Electronic Records */}
              <div className="p-2.5 rounded-2xl bg-[#081220]/80 border border-slate-800/80 flex items-start gap-3 backdrop-blur-md shadow-lg shadow-black/20 hover:border-slate-700/80 transition-all">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0 border border-sky-500/30 shadow-sm mt-0.5">
                  <Activity size={15} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-[12.5px] font-bold text-white mb-0.5 tracking-tight">
                    FIFO Pharmacy &amp; Electronic Records
                  </h3>
                  <p className="text-[10.5px] text-slate-300 leading-relaxed font-normal">
                    Automated First-Expired-First-Out batch dispensing, stock alerts, and lifetime patient consultation history.
                  </p>
                </div>
              </div>

              {/* 3 Trust Indicators for Signup */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Star size={13} className="text-amber-400 fill-amber-400" />
                  <span className="font-bold text-white text-[11px]">4.9/5</span>
                  <span className="text-slate-400 text-[11px]">from 500+ Clinics</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield size={13} className="text-emerald-400" />
                  <span className="font-bold text-emerald-400 text-[11px]">100% Cloud Secured</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap size={13} className="text-cyan-400 fill-cyan-400" />
                  <span className="font-bold text-cyan-400 text-[11px]">Real-Time Sync</span>
                </div>
              </div>
            </div>
          ) : (
            /* ================= 4 PILLS + DASHBOARD PREVIEW MOCKUP (FOR LOGIN SCREEN) ================= */
            <div className="space-y-2">
              {/* 4 Feature Pills in a Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                <div className="flex items-center gap-1.5 p-1.5 px-2 rounded-xl bg-[#081220]/80 border border-slate-800/80">
                  <div className="w-7 h-7 rounded-lg bg-[#0284c7]/20 text-[#38bdf8] flex items-center justify-center shrink-0 border border-[#0ea5e9]/30">
                    <Calendar size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white leading-tight truncate">Appointments</p>
                    <p className="text-[8.5px] text-slate-400 truncate">Smarter Scheduling</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 p-1.5 px-2 rounded-xl bg-[#081220]/80 border border-slate-800/80">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 border border-blue-500/30">
                    <Users size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white leading-tight truncate">Patient Records</p>
                    <p className="text-[8.5px] text-slate-400 truncate">All in One Place</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 p-1.5 px-2 rounded-xl bg-[#081220]/80 border border-slate-800/80">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/30">
                    <FileText size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white leading-tight truncate">Billing &amp; Invoicing</p>
                    <p className="text-[8.5px] text-slate-400 truncate">Fast &amp; Accurate</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 p-1.5 px-2 rounded-xl bg-[#081220]/80 border border-slate-800/80">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Activity size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white leading-tight truncate">Reports &amp; Analytics</p>
                    <p className="text-[8.5px] text-slate-400 truncate">Data for Better Care</p>
                  </div>
                </div>
              </div>

              {/* Dashboard Preview Browser Mockup */}
              <div className="w-full max-w-xl pt-0.5 scale-[0.96] origin-top-left">
                <DashboardBrowserMockup />
              </div>
            </div>
          )}
        </div>

        {/* 3. Bottom Footer */}
        {authMode === "login" ? (
          <div className="relative z-10 pt-2 flex items-center justify-between border-t border-slate-800/50 shrink-0">
            {/* 4 Trust Stats */}
            <div className="flex items-center gap-3 sm:gap-5 text-slate-300 select-none">
              <div className="flex items-center gap-1.5">
                <Shield size={13} className="text-cyan-400" />
                <div>
                  <p className="text-[8px] text-slate-400 leading-none">Trusted by</p>
                  <p className="text-[10px] font-bold text-white leading-tight">500+ Clinics</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={13} className="text-blue-400" />
                <div>
                  <p className="text-[8px] text-slate-400 leading-none">100,000+</p>
                  <p className="text-[10px] font-bold text-white leading-tight">Patients Managed</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Cloud size={13} className="text-sky-400" />
                <div>
                  <p className="text-[8px] text-slate-400 leading-none">99.9%</p>
                  <p className="text-[10px] font-bold text-white leading-tight">Uptime</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe size={13} className="text-teal-400" />
                <div>
                  <p className="text-[8px] text-slate-400 leading-none">Available in</p>
                  <p className="text-[10px] font-bold text-white leading-tight">Multiple Countries</p>
                </div>
              </div>
            </div>

            {/* ECG Line & Slogan */}
            <div className="flex items-center gap-2.5 text-right select-none">
              <div className="w-16 h-4 opacity-60">
                <svg viewBox="0 0 100 24" fill="none" className="w-full h-full">
                  <path
                    d="M0 12H30L35 3L40 21L45 1L50 23L55 10L60 14L65 12H100"
                    stroke="#38bdf8"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-[9.5px] text-slate-400 italic font-serif leading-tight">
                <span>Better Care,</span>
                <br />
                <span className="text-slate-300">Brighter Tomorrows</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 pt-2 flex items-center justify-between border-t border-slate-800/50 shrink-0">
            {/* Dot matrix pattern */}
            <div className="grid grid-cols-6 gap-1.5 opacity-25 select-none">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-cyan-400" />
              ))}
            </div>

            {/* ECG Line & Slogan */}
            <div className="flex items-center gap-3 text-right select-none">
              <div className="w-20 h-5 opacity-60">
                <svg viewBox="0 0 100 24" fill="none" className="w-full h-full">
                  <path
                    d="M0 12H30L35 3L40 21L45 1L50 23L55 10L60 14L65 12H100"
                    stroke="#38bdf8"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-[10px] text-slate-400 italic font-serif leading-tight">
                <span>Better Care,</span>
                <br />
                <span className="text-slate-300">Brighter Tomorrows</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL (~46% width) — CLEAN WHITE SAAS FORM PANEL                   */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[46%] xl:w-[45%] min-h-screen lg:h-full bg-white p-0 lg:p-8 flex flex-col justify-between order-1 lg:order-2 shadow-2xl z-10 overflow-y-auto lg:overflow-hidden no-scrollbar max-w-full overflow-x-hidden">
        {/* Mobile Dark Branding Header Banner */}
        <div className="lg:hidden w-full bg-gradient-to-b from-[#020610] via-[#040a17] to-[#030812] p-4 sm:p-5 border-b border-slate-800 text-white space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <MediTrackLogo size="sm" theme="dark" showBadge={false} />
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-wide">
              {authMode === "login" ? "Clinic Management OS" : "Instant Setup"}
            </span>
          </div>

          <div className="space-y-1 pt-0.5">
            <h1 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
              {authMode === "login" ? (
                <>
                  The Operating System{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d2ff] via-[#38bdf8] to-[#0ea5e9]">
                    for Modern Clinics.
                  </span>
                </>
              ) : (
                <>
                  Manage Your Clinic{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d2ff] via-[#38bdf8] to-[#0ea5e9]">
                    Smarter &amp; Faster
                  </span>
                </>
              )}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-medium">
              {authMode === "login"
                ? "Appointments, patient records, billing, and clinic operations in one platform."
                : "Queue management, billing, automated WhatsApp prescriptions, and patient records."}
            </p>
          </div>

          {/* Security & Cloud Badges Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[9.5px] text-slate-300 border-t border-slate-800/80">
            <div className="flex items-center gap-1">
              <Shield size={11} className="text-cyan-400" />
              <span>256-Bit SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-1">
              <Cloud size={11} className="text-sky-400" />
              <span>Cloud Sync</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap size={11} className="text-emerald-400" />
              <span>99.9% Uptime SLA</span>
            </div>
          </div>
        </div>

        {/* Top Right Utility Bar */}
        <div className="hidden lg:flex items-center justify-end gap-3 text-[11px] font-medium text-slate-500 pb-1 select-none shrink-0">
          <div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">
            <Globe size={12} className="text-slate-400" />
            <span>English</span>
            <span className="text-[8px]">▾</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">
            <HelpCircle size={12} className="text-slate-400" />
            <span>Help</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="my-auto w-full max-w-[440px] mx-auto py-5 pb-10 sm:pb-6 lg:py-0.5 px-4 sm:px-6 lg:px-0">
          {/* Header */}
          <div className="text-center mb-2">
            {authMode === "login" ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e0f2fe] text-[10px] font-bold text-[#0284c7] mb-1 border border-[#bae6fd] shadow-sm">
                <Sparkles size={11} className="text-[#0ea5e9]" />
                <span>Clinic Management OS</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e0f2fe] text-[10px] font-bold text-[#0284c7] mb-1 border border-[#bae6fd] shadow-sm">
                <Rocket size={11} className="text-[#0ea5e9]" />
                <span>Instant Clinic Setup</span>
              </div>
            )}
            <h2 className="text-xl sm:text-[22px] font-black text-slate-900 tracking-tight leading-tight">
              {authMode === "login"
                ? "Welcome Back"
                : signupData.isRegisteringClinic
                  ? "Create your Clinic"
                  : "Join your Clinic"}
            </h2>
            <p className="text-slate-500 text-[11px] sm:text-[11.5px] font-medium mt-0.5">
              {authMode === "login"
                ? "Sign in to your MediTrack account to manage your clinic."
                : "Get started with your new clinic management dashboard."}
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2 rounded-xl text-xs mb-2 flex items-start gap-2 animate-shake">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium text-[11px]">{formatErrorMessage(error)}</div>
            </div>
          )}

          {signupSuccess ? (
            /* ==================== SIGNUP SUCCESS CONFIRMATION SCREEN ==================== */
            <div className="text-center py-6 px-4 space-y-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl shadow-sm animate-fadeIn">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-emerald-200">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Account Created Successfully ✓</h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  Your clinic account has been created. Please log in below to access your authorized workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onDismissSignupSuccess) onDismissSignupSuccess();
                  setAuthMode("login");
                }}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#0062ff] via-[#009dff] to-[#00d4ff] hover:from-[#0051d4] hover:to-[#00bee6] text-white font-extrabold rounded-xl shadow-md transition-all text-xs tracking-wider uppercase cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Go to Login</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : authMode === "login" ? (
            /* ==================== ORIGINAL CLEAN LOGIN FORM ==================== */
            <form onSubmit={handleLoginFormSubmit} className="space-y-3">
              {/* Business Email Address */}
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase">
                  BUSINESS EMAIL ADDRESS
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@clinic.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] transition-all font-medium shadow-sm"
                  />
                </div>
              </div>

              {/* Security Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase">
                    SECURITY PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={onForgotPasswordClick}
                    className="text-xs font-bold text-[#0284c7] hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] transition-all font-medium shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & 30-Day Note */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0284c7] focus:ring-blue-500 cursor-pointer accent-[#0284c7]"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Remember me
                  </span>
                </label>
                <div className="flex items-center gap-1 text-[10.5px] text-slate-400 font-medium select-none">
                  <span>Keep me signed in</span>
                  <Info size={12} className="text-slate-400" />
                </div>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#0062ff] via-[#009dff] to-[#00d4ff] hover:from-[#0051d4] hover:to-[#00bee6] text-white font-extrabold rounded-xl shadow-md shadow-blue-500/25 hover:shadow-blue-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group uppercase text-xs tracking-wider mt-1"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>SIGN IN TO MEDITRACK</span>
                    <ArrowRight
                      size={15}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>

              {/* OR CONTINUE WITH Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-[9px] font-bold tracking-widest uppercase">
                  <span className="bg-white px-2.5 text-slate-400">
                    OR CONTINUE WITH
                  </span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60 text-xs sm:text-sm"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  className="w-4 h-4"
                  alt="Google"
                />
                <span className="font-semibold text-slate-700">
                  Continue with Google
                </span>
              </button>

              {/* Create Account Switch */}
              <p className="text-center text-xs font-medium text-slate-500 pt-1">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setAuthMode("signup");
                  }}
                  className="text-[#0284c7] font-bold hover:underline cursor-pointer ml-1"
                >
                  Create an Account
                </button>
              </p>
            </form>
          ) : (
            /* ==================== CREATE ACCOUNT / SIGN UP FORM ==================== */
            <div className="space-y-1.5">
              {/* Google Signup Button at Top */}
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={authLoading}
                className="w-full py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60 text-xs sm:text-[13px]"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  className="w-4 h-4"
                  alt="Google"
                />
                <span className="font-semibold text-slate-700">
                  Continue with Google
                </span>
              </button>

              {/* OR CONTINUE WITH EMAIL Divider */}
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-[8.5px] font-bold tracking-widest uppercase">
                  <span className="bg-white px-2 text-slate-400">
                    OR CONTINUE WITH EMAIL
                  </span>
                </div>
              </div>

              {/* Register Clinic vs Join Clinic Connected Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() =>
                    setSignupData({ ...signupData, isRegisteringClinic: true })
                  }
                  className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    signupData.isRegisteringClinic
                      ? "bg-white text-[#0284c7] shadow-sm border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Register Clinic
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSignupData({ ...signupData, isRegisteringClinic: false })
                  }
                  className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    !signupData.isRegisteringClinic
                      ? "bg-white text-[#0284c7] shadow-sm border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Join Clinic
                </button>
              </div>

              <form onSubmit={handleSignupFormSubmit} className="space-y-2.5 pt-1">
                {/* Row 1: Full Name & Clinic Name / Clinic ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase mb-1">
                      FULL NAME
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserIcon size={14} />
                      </div>
                      <input
                        type="text"
                        required
                        value={signupData.fullName}
                        onChange={(e) =>
                          setSignupData({
                            ...signupData,
                            fullName: e.target.value,
                          })
                        }
                        placeholder="John Doe"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] font-medium transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  {signupData.isRegisteringClinic ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase mb-1">
                          CLINIC NAME
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Building2 size={14} />
                          </div>
                          <input
                            type="text"
                            required
                            value={signupData.clinicName}
                            onChange={(e) =>
                              setSignupData({
                                ...signupData,
                                clinicName: e.target.value,
                              })
                            }
                            placeholder="Apollo Care Clinic"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] font-medium transition-all shadow-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase mb-1">
                          CLINIC ID
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Building2 size={14} />
                          </div>
                          <input
                            type="text"
                            required
                            value={signupData.clinicId}
                            onChange={(e) =>
                              setSignupData({
                                ...signupData,
                                clinicId: e.target.value.toUpperCase().replace(/\s+/g, ""),
                              })
                            }
                            placeholder="e.g. APOLLO001"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono font-bold uppercase placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] transition-all shadow-xs"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase mb-1">
                        CLINIC ID TO JOIN
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Building2 size={14} />
                        </div>
                        <input
                          type="text"
                          required
                          value={signupData.clinicId}
                          onChange={(e) =>
                            setSignupData({
                              ...signupData,
                              clinicId: e.target.value.toUpperCase().replace(/\s+/g, ""),
                            })
                          }
                          placeholder="e.g. APOLLO001"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono font-bold uppercase placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] transition-all shadow-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 2: Role & Clinic Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase mb-1">
                      YOUR ROLE
                    </label>
                    <select
                      value={signupData.role || "Doctor"}
                      onChange={(e) =>
                        setSignupData({ ...signupData, role: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] font-medium transition-all cursor-pointer shadow-xs"
                    >
                      <option value="Doctor">👨‍⚕️ Doctor</option>
                      <option value="Receptionist">👩‍💼 Receptionist</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase mb-1">
                      CLINIC ADDRESS
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin size={14} />
                      </div>
                      <input
                        type="text"
                        required={signupData.isRegisteringClinic}
                        value={signupData.clinicAddress}
                        onChange={(e) =>
                          setSignupData({
                            ...signupData,
                            clinicAddress: e.target.value,
                          })
                        }
                        placeholder="MG Road, Bengaluru"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] font-medium transition-all shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Email Address */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase mb-1">
                    EMAIL ADDRESS
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail size={14} />
                    </div>
                    <input
                      type="email"
                      required
                      value={signupData.email}
                      onChange={(e) =>
                        setSignupData({ ...signupData, email: e.target.value })
                      }
                      placeholder="owner@example.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] font-medium transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Row 4: Phone Number */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase mb-1">
                    PHONE NUMBER
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shrink-0 select-none flex items-center gap-1">
                      <span>IN +91</span>
                      <span className="text-[9px] text-slate-400">▾</span>
                    </div>
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone size={14} />
                      </div>
                      <input
                        type="tel"
                        required
                        value={signupData.contactNumber}
                        onChange={(e) =>
                          setSignupData({
                            ...signupData,
                            contactNumber: e.target.value,
                          })
                        }
                        placeholder="9876543210"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] font-medium transition-all shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 5: Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase mb-1">
                      PASSWORD
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock size={14} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={signupData.password}
                        onChange={(e) =>
                          setSignupData({
                            ...signupData,
                            password: e.target.value,
                          })
                        }
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-8 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] font-medium transition-all shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 tracking-wider uppercase mb-1">
                      CONFIRM PASSWORD
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock size={14} />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-8 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284c7] font-medium transition-all shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Helper & Strength Meter */}
                <div className="flex items-center justify-between pt-0.5 text-[9.5px]">
                  <div className="flex items-center gap-1 text-slate-500">
                    <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                    <span>Use 6+ characters with mixed letters &amp; numbers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      <div className={`w-3.5 h-1 rounded-full ${pwdStrength.score >= 1 ? "bg-emerald-500" : "bg-slate-200"}`} />
                      <div className={`w-3.5 h-1 rounded-full ${pwdStrength.score >= 2 ? "bg-emerald-500" : "bg-slate-200"}`} />
                      <div className={`w-3.5 h-1 rounded-full ${pwdStrength.score >= 3 ? "bg-emerald-500" : "bg-slate-200"}`} />
                      <div className={`w-3.5 h-1 rounded-full bg-slate-200`} />
                    </div>
                    <span className={`font-bold ${pwdStrength.color}`}>
                      {pwdStrength.label}
                    </span>
                  </div>
                </div>

                {/* Terms of Service Checkbox */}
                <div className="pt-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#0284c7] focus:ring-blue-500 cursor-pointer accent-[#0284c7]"
                    />
                    <span className="text-[10.5px] text-slate-700 font-medium">
                      I agree to the{" "}
                      <a href="#terms" className="text-[#0284c7] font-bold hover:underline">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#privacy" className="text-[#0284c7] font-bold hover:underline">
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                </div>

                {/* Primary CTA Submit Button */}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full mt-1 py-2.5 px-4 bg-gradient-to-r from-[#0062ff] via-[#009dff] to-[#00d4ff] hover:from-[#0051d4] hover:to-[#00bee6] text-white font-black rounded-xl shadow-md shadow-blue-500/25 hover:shadow-blue-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group uppercase text-xs tracking-wider"
                >
                  {authLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {signupData.isRegisteringClinic
                          ? "CREATE CLINIC ACCOUNT"
                          : "JOIN CLINIC ACCOUNT"}
                      </span>
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>

                {/* Back to Sign In */}
                <p className="text-center text-[11.5px] font-medium text-slate-500 pt-0.5">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setAuthMode("login");
                    }}
                    className="text-[#0284c7] font-bold hover:underline cursor-pointer ml-0.5"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            </div>
          )}
        </div>

        {/* Security Notice at Bottom */}
        <div className="text-center text-[10px] text-slate-400 font-medium py-0.5 flex flex-col items-center justify-center gap-0.5 select-none shrink-0">
          <div className="flex items-center gap-1">
            <Lock size={11} className="text-slate-400" />
            <span>Your data is safe, encrypted, and built for modern clinics.</span>
          </div>
          {authMode === "login" && (
            <span className="text-[9.5px] text-slate-400">We never share your information.</span>
          )}
        </div>
      </div>
    </div>
  );
};
