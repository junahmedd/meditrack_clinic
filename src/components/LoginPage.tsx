import React, { useState, useEffect } from "react";
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
  Clock,
  ChevronDown,
  ArrowRight,
  CreditCard,
  Layers,
} from "lucide-react";

interface LoginPageProps {
  authMode: "login" | "signup";
  setAuthMode: (mode: "login" | "signup") => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  loginRole?: string;
  setLoginRole?: (role: string) => void;
  authLoading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  onLoginSubmit: (e: React.FormEvent) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onForgotPasswordClick: () => void;
  signupData: {
    clinicId?: string;
    fullName: string;
    clinicName: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
    assignedDoctorUid?: string;
    assignedDoctorEmail?: string;
    assignedDoctorName?: string;
    assignedDoctorId?: string;
    assignedDoctorCategory?: string;
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
  onForgotPasswordClick,
  signupData,
  setSignupData,
  onSignupSubmit,
  signupSuccess = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (signupSuccess) {
      setRedirectCountdown(2);
      const timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setRedirectCountdown(null);
    }
  }, [signupSuccess]);

  useEffect(() => {
    if (redirectCountdown === 0 && signupSuccess && !authLoading) {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      onLoginSubmit(fakeEvent);
    }
  }, [redirectCountdown, signupSuccess, authLoading, onLoginSubmit]);

  const signupRoleTitle =
    signupData?.role === "receptionist"
      ? "Receptionist"
      : signupData?.role === "admin"
      ? "Clinic Admin"
      : "Doctor";

  const formatErrorMessage = (err: string | null) => {
    if (!err) return "";
    if (err.includes("auth/email-already-in-use") || err.includes("email-already-in-use")) {
      return "This email is already registered. Please sign in instead.";
    }
    if (
      err.includes("auth/invalid-credential") ||
      err.includes("wrong-password") ||
      err.includes("user-not-found")
    ) {
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
    "w-full pl-9 pr-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] transition-all font-medium";

  return (
    <div className="min-h-screen w-full bg-[#031d16] font-sans antialiased text-slate-900 selection:bg-emerald-500 selection:text-white relative overflow-x-hidden flex flex-col justify-start items-center px-4 py-8 sm:py-12">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="w-full max-w-xl mx-auto flex flex-col items-center relative z-10">
        {/* ── TOP BRANDING (OrderPoint Pro Layout Style) ── */}
        <div className="flex flex-col items-center text-center mb-6 select-none">
          {/* Glowing App Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d26a] to-[#047857] flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-3 border border-emerald-400/30">
            <svg viewBox="0 0 36 36" className="w-8 h-8" fill="none">
              <rect x="14" y="5" width="8" height="26" rx="2" fill="#ffffff" />
              <rect x="5" y="14" width="26" height="8" rx="2" fill="#ffffff" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-[0.16em] leading-none text-white uppercase font-display">
            MEDITRACK
          </h1>
          <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase mt-1">
            CLINICAL OPERATING SYSTEM
          </span>

          {/* Pill Badge */}
          <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#053b2f]/90 border border-emerald-500/30 text-[10.5px] font-extrabold text-emerald-300 tracking-wider shadow-sm uppercase">
            <span className="w-2 h-2 rounded-full bg-[#00d26a] animate-pulse" />
            <span>LIVE CLINIC POS • FIREBASE REALTIME SYNC</span>
          </div>
        </div>

        {/* ── AUTH POP-UP CARD (Reduced Size / OrderPoint Pro Card Layout) ── */}
        <div className="w-full max-w-[390px] sm:max-w-[420px]">
          <div className="bg-white rounded-[26px] sm:rounded-3xl shadow-2xl shadow-black/50 border border-slate-100/90 p-5 sm:p-7 relative transition-all">
            {/* Error Banner */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs flex items-start gap-2 mb-3.5 animate-in fade-in duration-150">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <div className="leading-relaxed font-semibold">{formatErrorMessage(error)}</div>
              </div>
            )}

            {authMode === "login" ? (
              /* ── SIGN IN FORM ── */
              <div className="space-y-3.5">
                {signupSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs space-y-1 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Clinic Account Registered!</span>
                    </div>
                    <p className="text-emerald-700 font-medium leading-relaxed text-[11px]">
                      Your {signupRoleTitle} account is ready.{" "}
                      {redirectCountdown !== null && redirectCountdown > 0 ? (
                        <span>
                          Entering your <strong>{signupRoleTitle} Portal</strong> in{" "}
                          <span className="font-bold underline">{redirectCountdown}s</span>... Or click{" "}
                          <strong>Log In</strong> below.
                        </span>
                      ) : (
                        <span>Click <strong>Log In</strong> below to enter.</span>
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    Welcome back
                  </h2>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">
                    Sign in to access your clinic system.
                  </p>
                </div>

                <form onSubmit={onLoginSubmit} className="space-y-3">
                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail size={15} />
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
                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={onForgotPasswordClick}
                        className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock size={15} />
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
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <label className="flex items-center gap-2 cursor-pointer select-none pt-0.5">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer accent-[#064e3b]"
                    />
                    <span className="text-[11px] font-semibold text-slate-600">Remember me</span>
                  </label>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 sm:py-3 bg-[#064e3b] hover:bg-[#043d2e] active:scale-[0.99] text-white font-extrabold rounded-xl shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    {authLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Log In</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Switcher */}
                <div className="text-center pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">
                    Need an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setAuthMode("signup");
                      }}
                      className="text-emerald-700 font-black hover:underline cursor-pointer ml-1 inline-flex items-center gap-0.5"
                    >
                      <span>Create an account</span>
                      <ArrowRight size={12} />
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              /* ── CREATE AN ACCOUNT FORM (Reduced Size Popup Card) ── */
              <div className="space-y-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    Create an account
                  </h2>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">
                    Register your medical clinic and team.
                  </p>
                </div>

                <form onSubmit={onSignupSubmit} className="space-y-2.5">
                  {/* Select Role Dropdown */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      Select Your Role *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        {signupData.role === "receptionist" ? (
                          <Users size={15} />
                        ) : (
                          <Stethoscope size={15} />
                        )}
                      </div>
                      <select
                        value={signupData.role || "doctor"}
                        onChange={(e) => setSignupData((prev: any) => ({ ...prev, role: e.target.value }))}
                        className={`${inputCls} pr-8 cursor-pointer appearance-none font-semibold text-slate-800`}
                      >
                        <option value="doctor">Doctor</option>
                        <option value="receptionist">Receptionist</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Clinic Name & Clinic ID Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Clinic Name */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                        Clinic Name *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <Building2 size={14} />
                        </div>
                        <input
                          type="text"
                          required
                          value={signupData.clinicName}
                          onChange={(e) =>
                            setSignupData((prev: any) => ({
                              ...prev,
                              clinicName: e.target.value,
                            }))
                          }
                          placeholder="e.g. Al Sabah Clinic"
                          className={inputCls + " pl-8"}
                        />
                      </div>
                    </div>

                    {/* Clinic ID */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                        Clinic ID *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <Building2 size={14} />
                        </div>
                        <input
                          type="text"
                          required
                          value={signupData.clinicId || ""}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_\-]/g, "");
                            setSignupData((prev: any) => ({
                              ...prev,
                              clinicId: val,
                            }));
                          }}
                          placeholder="e.g. MT001"
                          className={`${inputCls} pl-8 font-mono uppercase font-bold`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      Full Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserIcon size={15} />
                      </div>
                      <input
                        type="text"
                        required
                        value={signupData.fullName}
                        onChange={(e) => setSignupData((prev: any) => ({ ...prev, fullName: e.target.value }))}
                        placeholder={signupData.role === "doctor" ? "Dr. Zaid Ahmed" : "Junaid Ahmed"}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Email & Phone Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                        Work Email *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <Mail size={14} />
                        </div>
                        <input
                          type="email"
                          required
                          value={signupData.email}
                          onChange={(e) => setSignupData((prev: any) => ({ ...prev, email: e.target.value }))}
                          placeholder="user@clinic.com"
                          className={inputCls + " pl-8"}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                        Mobile *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <Phone size={14} />
                        </div>
                        <input
                          type="tel"
                          required
                          value={signupData.phone || ""}
                          onChange={(e) => setSignupData((prev: any) => ({ ...prev, phone: e.target.value }))}
                          placeholder="9876543210"
                          className={inputCls + " pl-8 text-xs font-mono"}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      Password (min 6 chars) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock size={15} />
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
                        {showSignupPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button: Explicitly 'Register Clinic' as requested */}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full mt-1 py-2.5 sm:py-3 bg-[#064e3b] hover:bg-[#043d2e] active:scale-[0.99] text-white font-extrabold rounded-xl shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 text-xs sm:text-sm"
                  >
                    {authLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Register Clinic</span>
                    )}
                  </button>
                </form>

                {/* Footer Switcher */}
                <div className="text-center pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setAuthMode("login");
                      }}
                      className="text-emerald-700 font-black hover:underline cursor-pointer ml-1 inline-flex items-center gap-0.5"
                    >
                      <span>Sign in</span>
                      <ArrowRight size={12} />
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Micro-footer right below card */}
          <p className="text-center text-[10.5px] text-emerald-100/50 font-medium mt-4 select-none">
            © 2026 MediTrack • Enterprise Clinic &amp; Hospital Operating System
          </p>
        </div>

        {/* ── SHOWCASE SECTION BELOW CARD (Matching OrderPoint Pro Images 3 & 4) ── */}
        <div className="w-full mt-10 sm:mt-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            The Modern Operating System for Healthcare Clinics.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-emerald-100/70 max-w-lg mx-auto leading-relaxed">
            Connect POS Billing, Live OPD Patient Queue, Clinic Pharmacy &amp; Automated WhatsApp Invoicing in one unified, real-time command center.
          </p>

          {/* 4 Feature Cards */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
            {/* Card 1 */}
            <div className="bg-[#052b22]/90 border border-emerald-900/50 backdrop-blur-md p-4 rounded-2xl hover:border-emerald-700/60 transition-all shadow-lg shadow-black/20">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5">
                <CreditCard size={17} />
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white">Smart OPD &amp; Invoicing</h4>
              <p className="text-[11px] text-emerald-100/60 mt-1 leading-relaxed">
                Fast checkout with instant UPI QR, billing records, and automated WhatsApp receipts.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#052b22]/90 border border-emerald-900/50 backdrop-blur-md p-4 rounded-2xl hover:border-emerald-700/60 transition-all shadow-lg shadow-black/20">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center mb-2.5">
                <Clock size={17} />
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white">Live Patient Queue (OPD)</h4>
              <p className="text-[11px] text-emerald-100/60 mt-1 leading-relaxed">
                Real-time queue tracking with doctor call alerts and 1-click consultation dispatch.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#052b22]/90 border border-emerald-900/50 backdrop-blur-md p-4 rounded-2xl hover:border-emerald-700/60 transition-all shadow-lg shadow-black/20">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5">
                <Activity size={17} />
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white">Prescription &amp; Pharmacy</h4>
              <p className="text-[11px] text-emerald-100/60 mt-1 leading-relaxed">
                Clinic medicine database, real-time dosage instructions, and structured e-prescriptions.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-[#052b22]/90 border border-emerald-900/50 backdrop-blur-md p-4 rounded-2xl hover:border-emerald-700/60 transition-all shadow-lg shadow-black/20">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center mb-2.5">
                <ShieldCheck size={17} />
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white">Strict Tenant Isolation</h4>
              <p className="text-[11px] text-emerald-100/60 mt-1 leading-relaxed">
                Multi-clinic role-based access with deny-by-default Firestore Security Rules.
              </p>
            </div>
          </div>

          {/* Security & Uptime Row */}
          <div className="mt-8 pt-5 border-t border-emerald-900/40 flex flex-wrap items-center justify-center gap-4 text-[11px] text-emerald-200/60 font-semibold select-none">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>HIPAA &amp; NABH Ready</span>
            </div>
            <span className="text-emerald-900">•</span>
            <div className="flex items-center gap-1.5">
              <Lock size={13} className="text-emerald-400" />
              <span>256-Bit TLS Encryption</span>
            </div>
            <span className="text-emerald-900">•</span>
            <div className="flex items-center gap-1.5">
              <Activity size={13} className="text-emerald-400" />
              <span>99.9% Cloud Uptime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
