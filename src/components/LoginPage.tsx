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
  ShieldCheck,
  ChevronDown,
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
  onForgotPasswordClick: () => void;
  signupData: {
    fullName: string;
    clinicName: string;
    email: string;
    password: string;
  };
  setSignupData: React.Dispatch<React.SetStateAction<any>>;
  onSignupSubmit: (e: React.FormEvent) => Promise<void>;
  signupSuccess?: boolean;
  onDismissSignupSuccess?: () => void;
  selectedRole?: string;
  setSelectedRole?: (role: string) => void;
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
  onForgotPasswordClick,
  signupData,
  setSignupData,
  onSignupSubmit,
  signupSuccess = false,
  onDismissSignupSuccess,
  selectedRole = "",
  setSelectedRole,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const formatErrorMessage = (err: string | null) => {
    if (!err) return "";
    if (err.includes("auth/email-already-in-use") || err.includes("email-already-in-use")) {
      return "This email is already registered. Please sign in instead.";
    }
    if (err.startsWith("{") && err.includes('"error"')) {
      try {
        const parsed = JSON.parse(err);
        if (parsed.error) return parsed.error;
      } catch (e) {}
    }
    return err;
  };

  /* Shared input class */
  const inputCls = "w-full pl-9 pr-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-lg text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 focus:border-emerald-700 transition-all font-medium";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#063328] font-sans antialiased select-none overflow-hidden relative px-4 py-8">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/[0.08] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-teal-400/[0.06] rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Centered container — narrow on desktop, full on mobile */}
      <div className="relative z-10 w-full" style={{ maxWidth: '370px' }}>

        {/* ── Branding ── */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <svg viewBox="0 0 36 36" className="w-7 h-7" fill="none">
              <rect x="14" y="4" width="8" height="28" rx="2" fill="#00d26a" />
              <rect x="4" y="14" width="28" height="8" rx="2" fill="#00d26a" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-[0.14em] leading-none">MEDITRACK</h1>
          <div className="mt-1.5 inline-flex items-center px-3 py-0.5 rounded-full bg-black/50 border border-emerald-500/25">
            <span className="text-[9px] font-extrabold tracking-[0.16em] text-[#00d26a] uppercase">Clinic System</span>
          </div>
        </div>

        {/* ── Form Card ── */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-5 sm:p-6">

          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
              {authMode === "login" ? "Welcome back" : "Create your clinic"}
            </h2>
            <p className="text-slate-500 text-xs font-medium mt-0.5">
              {authMode === "login"
                ? "Sign in to your clinic account."
                : "Register your clinic to get started."}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-[11px] flex items-start gap-2 mb-3">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-relaxed font-semibold">{formatErrorMessage(error)}</div>
            </div>
          )}

          {/* ── SIGNUP SUCCESS ── */}
          {signupSuccess ? (
            <div className="text-center py-5 px-3 space-y-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl">
              <div className="w-11 h-11 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 size={26} />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-slate-900 tracking-tight">Clinic Registered!</h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Your account is ready. Sign in with your credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { if (onDismissSignupSuccess) onDismissSignupSuccess(); setAuthMode("login"); }}
                className="w-full py-2.5 bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer transition-colors"
              >
                Sign In to Your Clinic
              </button>
            </div>

          ) : authMode === "login" ? (
            /* ── LOGIN FORM ── */
            <form onSubmit={onLoginSubmit} className="space-y-3.5">

              {/* Role */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Portal</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400"><ShieldCheck size={16} /></div>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole && setSelectedRole(e.target.value)}
                    className={inputCls + " pr-8 cursor-pointer appearance-none"}
                  >
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400"><ChevronDown size={14} /></div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400"><Mail size={16} /></div>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clinic.com" className={inputCls} />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Password</label>
                  <button type="button" onClick={onForgotPasswordClick} className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer">Forgot?</button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400"><Lock size={16} /></div>
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls + " pr-9"} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer accent-emerald-700" />
                <span className="text-[11px] font-semibold text-slate-500">Remember me</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-[#064e3b] hover:bg-[#043d2e] active:scale-[0.98] text-white font-extrabold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-[13px]"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Sign in &rarr;</span>
                )}
              </button>

              <p className="text-center text-[11px] font-semibold text-slate-500">
                New clinic?{" "}
                <button type="button" onClick={() => { setError(null); setAuthMode("signup"); }} className="text-emerald-700 font-bold hover:underline cursor-pointer">
                  Register
                </button>
              </p>
            </form>

          ) : (
            /* ── REGISTER FORM ── */
            <form onSubmit={onSignupSubmit} className="space-y-3.5">

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Clinic Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400"><Building2 size={16} /></div>
                  <input type="text" required value={signupData.clinicName} onChange={(e) => setSignupData({ ...signupData, clinicName: e.target.value })} placeholder="Apollo Health Clinic" className={inputCls} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Your Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400"><UserIcon size={16} /></div>
                  <input type="text" required value={signupData.fullName} onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })} placeholder="Dr. Anjali Sharma" className={inputCls} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400"><Mail size={16} /></div>
                  <input type="email" required value={signupData.email} onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} placeholder="admin@yourclinic.com" className={inputCls} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400"><Lock size={16} /></div>
                  <input type={showSignupPassword ? "text" : "password"} required minLength={6} value={signupData.password} onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} placeholder="••••••••" className={inputCls + " pr-9"} />
                  <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Min 6 characters</p>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-[#064e3b] hover:bg-[#043d2e] active:scale-[0.98] text-white font-extrabold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-[13px]"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Register Clinic &rarr;</span>
                )}
              </button>

              <p className="text-center text-[11px] font-semibold text-slate-500">
                Already registered?{" "}
                <button type="button" onClick={() => { setError(null); setAuthMode("login"); }} className="text-emerald-700 font-bold hover:underline cursor-pointer">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/30 font-medium mt-5">
          © 2026 MediTrack Clinic System
        </p>
      </div>
    </div>
  );
};
