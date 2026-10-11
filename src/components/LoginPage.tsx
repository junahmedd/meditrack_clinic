import React, { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Building2,
  User as UserIcon,
  Phone,
  ShieldCheck,
  Stethoscope,
  Activity,
  Users,
  Zap,
  Sparkles,
  ChevronRight,
  Clock,
  ArrowRight,
} from "lucide-react";

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
  onLoginSubmit: (e: React.FormEvent) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onForgotPasswordClick: () => void;
  signupData: {
    fullName: string;
    clinicName: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
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
  signupData,
  setSignupData,
  onSignupSubmit,
  signupSuccess = false,
  onDismissSignupSuccess,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const formatErrorMessage = (err: string | null) => {
    if (!err) return "";
    if (err.includes("auth/email-already-in-use") || err.includes("email-already-in-use")) {
      return "This email is already registered. Please sign in instead.";
    }
    if (err.includes("auth/invalid-credential") || err.includes("wrong-password") || err.includes("user-not-found")) {
      return "Invalid email or password. Please verify your credentials and try again.";
    }
    if (err.startsWith("{") && err.includes('"error"')) {
      try {
        const parsed = JSON.parse(err);
        if (parsed.error) return parsed.error;
      } catch (e) {}
    }
    return err;
  };

  const inputCls =
    "w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 focus:border-emerald-600 transition-all font-medium";

  return (
    <div className="min-h-screen w-full flex bg-[#031d16] font-sans antialiased text-slate-900 selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-teal-400/10 rounded-full blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row min-h-screen relative z-10">
        {/* ── LEFT SHOWCASE PANEL (Enterprise Clinic Platform) ── */}
        <div className="lg:w-7/12 p-8 lg:p-14 flex flex-col justify-between text-white relative">
          {/* Top Logo & Live Pulse */}
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                <svg viewBox="0 0 36 36" className="w-6 h-6" fill="none">
                  <rect x="14" y="4" width="8" height="28" rx="2" fill="#00d26a" />
                  <rect x="4" y="14" width="28" height="8" rx="2" fill="#00d26a" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-black tracking-[0.16em] leading-none text-white block">
                  MEDITRACK
                </span>
                <span className="text-[10px] font-bold tracking-[0.18em] text-emerald-400 uppercase">
                  CLINICAL OPERATING SYSTEM
                </span>
              </div>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE CLINIC PLATFORM • REAL-TIME FIREBASE SYNC</span>
            </div>

            {/* Hero Title */}
            <div className="mt-10 lg:mt-14 max-w-xl">
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
                The Modern Operating System for Healthcare Clinics.
              </h1>
              <p className="mt-4 text-emerald-100/75 text-sm lg:text-base font-normal leading-relaxed">
                Connect Doctor Consultations, Front-Desk Live Queue, Instant ICD-10
                Prescriptions, and Automated Invoicing in one unified, real-time command center.
              </p>
            </div>

            {/* Feature Cards Showcase */}
            <div className="mt-8 lg:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl">
              <div className="bg-white/[0.06] border border-white/10 backdrop-blur-md p-4 rounded-2xl hover:bg-white/[0.09] transition-all">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5">
                  <Stethoscope size={18} />
                </div>
                <h4 className="text-sm font-bold text-white">Doctor Consultation (OPD)</h4>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Digital Rx with dosage calculators, clinical diagnosis & instant patient timeline.
                </p>
              </div>

              <div className="bg-white/[0.06] border border-white/10 backdrop-blur-md p-4 rounded-2xl hover:bg-white/[0.09] transition-all">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center mb-2.5">
                  <Clock size={18} />
                </div>
                <h4 className="text-sm font-bold text-white">Live Front-Desk Queue</h4>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Real-time token management and 1-click patient calling synced to consulting rooms.
                </p>
              </div>

              <div className="bg-white/[0.06] border border-white/10 backdrop-blur-md p-4 rounded-2xl hover:bg-white/[0.09] transition-all">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5">
                  <Zap size={18} />
                </div>
                <h4 className="text-sm font-bold text-white">Smart Billing & Invoices</h4>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Automated receipts, UPI payment tracking & instant WhatsApp prescription delivery.
                </p>
              </div>

              <div className="bg-white/[0.06] border border-white/10 backdrop-blur-md p-4 rounded-2xl hover:bg-white/[0.09] transition-all">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center mb-2.5">
                  <ShieldCheck size={18} />
                </div>
                <h4 className="text-sm font-bold text-white">Strict Role Isolation</h4>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Doctor & Receptionist linking with deny-by-default Firestore Security Rules.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Security Badges */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-5 text-xs text-emerald-200/70 font-semibold">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-400" />
              <span>HIPAA & NABH Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock size={14} className="text-emerald-400" />
              <span>256-Bit TLS Encryption</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-400" />
              <span>99.9% Cloud Uptime</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT AUTHENTICATION PANEL ── */}
        <div className="lg:w-5/12 p-4 sm:p-8 lg:p-12 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl shadow-black/40 border border-slate-100/80 p-6 sm:p-8 transition-all">
            {/* Segmented Tab Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-6 select-none">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAuthMode("login");
                }}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  authMode === "login"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAuthMode("signup");
                }}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  authMode === "signup"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Create an account
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-start gap-2.5 mb-4 animate-in fade-in duration-150">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <div className="leading-relaxed font-semibold">{formatErrorMessage(error)}</div>
              </div>
            )}

            {/* ── SIGNUP SUCCESS ── */}
            {signupSuccess ? (
              <div className="text-center py-6 px-4 space-y-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Clinic Registered!</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Your clinic account is configured. Sign in with your credentials to access your portal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onDismissSignupSuccess) onDismissSignupSuccess();
                    setAuthMode("login");
                  }}
                  className="w-full py-3 bg-[#064e3b] hover:bg-[#043d2e] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all shadow-md"
                >
                  Sign In to Your Clinic &rarr;
                </button>
              </div>
            ) : authMode === "login" ? (
              /* ── SIGN IN FORM ── */
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                    Welcome back
                  </h2>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">
                    Sign in to access your clinic system.
                  </p>
                </div>

                {/* Continue with Google */}
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    or sign in with email
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <form onSubmit={onLoginSubmit} className="space-y-3.5">
                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="drzaid@meditrack.io"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={onForgotPasswordClick}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className={inputCls + " pr-9"}
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

                  {/* Remember Me */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer accent-emerald-700"
                    />
                    <span className="text-[11px] font-semibold text-slate-500">Remember me</span>
                  </label>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-[#064e3b] hover:bg-[#043d2e] active:scale-[0.99] text-white font-extrabold rounded-xl shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-[13px]"
                  >
                    {authLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Sign in &rarr;</span>
                    )}
                  </button>
                </form>

                {/* Footer Switcher */}
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500 font-medium">
                    Need an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setAuthMode("signup");
                      }}
                      className="text-emerald-700 font-extrabold hover:underline cursor-pointer ml-1 inline-flex items-center"
                    >
                      Create an account &rarr;
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              /* ── CREATE AN ACCOUNT FORM ── */
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                    Create an account
                  </h2>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">
                    Register your medical clinic and team in 60 seconds.
                  </p>
                </div>

                <form onSubmit={onSignupSubmit} className="space-y-3.5">
                  {/* Clinic Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Clinic / Practice Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building2 size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={signupData.clinicName}
                        onChange={(e) => setSignupData({ ...signupData, clinicName: e.target.value })}
                        placeholder="Apollo Health Clinic"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserIcon size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        placeholder="Dr. Zaid Ahmed"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Work Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        required
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        placeholder="admin@yourclinic.com"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Phone & Role */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Mobile (+91)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <Phone size={14} />
                        </div>
                        <input
                          type="tel"
                          required
                          value={signupData.phone || "+91"}
                          onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                          placeholder="+91 9876543210"
                          className={inputCls + " pl-8 text-xs font-mono"}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Your Role
                      </label>
                      <select
                        value={signupData.role || "doctor"}
                        onChange={(e) => setSignupData({ ...signupData, role: e.target.value })}
                        className="w-full py-2.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 focus:border-emerald-600"
                      >
                        <option value="doctor">Doctor</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="admin">Clinic Admin</option>
                      </select>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showSignupPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        placeholder="••••••••••••"
                        className={inputCls + " pr-9"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-[#064e3b] hover:bg-[#043d2e] active:scale-[0.99] text-white font-extrabold rounded-xl shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-[13px]"
                  >
                    {authLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Register Clinic &amp; Start &rarr;</span>
                    )}
                  </button>
                </form>

                {/* Footer Switcher */}
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500 font-medium">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setAuthMode("login");
                      }}
                      className="text-emerald-700 font-extrabold hover:underline cursor-pointer ml-1 inline-flex items-center"
                    >
                      Sign in &rarr;
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* Micro-footer */}
            <p className="text-center text-[10px] text-slate-400 font-medium mt-6 pt-3 border-t border-slate-100">
              © 2026 MediTrack • Enterprise Clinic &amp; Hospital Operating System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
