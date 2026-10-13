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
  Zap,
  Sparkles,
  ChevronRight,
  Clock,
  ArrowRight,
} from "lucide-react";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

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
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Real-time clinic lookup & doctor resolution state
  const [clinicLookupLoading, setClinicLookupLoading] = useState(false);
  const [verifiedClinic, setVerifiedClinic] = useState<any | null>(null);
  const [clinicLookupError, setClinicLookupError] = useState<string | null>(null);
  const [registeredClinicDoctors, setRegisteredClinicDoctors] = useState<any[]>([]);

  const handleCheckClinic = async (clinicIdInput: string) => {
    const cleanId = (clinicIdInput || "").trim().toUpperCase();
    if (!cleanId || cleanId.length < 3) {
      setVerifiedClinic(null);
      setClinicLookupError(null);
      setRegisteredClinicDoctors([]);
      return;
    }

    setClinicLookupLoading(true);
    setClinicLookupError(null);

    try {
      const snap = await getDoc(doc(db, "clinics", cleanId));
      if (snap.exists()) {
        const cData = snap.data();
        setVerifiedClinic(cData);
        setClinicLookupError(null);

        // Auto-fill clinic name if empty
        if (!signupData.clinicName && cData.name) {
          setSignupData((prev: any) => ({ ...prev, clinicName: cData.name }));
        }

        // Build list of registered clinic doctors
        let docsList: any[] = [];
        if (Array.isArray(cData.doctors) && cData.doctors.length > 0) {
          docsList = [...cData.doctors];
        } else if (cData.primaryDoctorName || cData.primaryDoctorEmail) {
          docsList = [
            {
              uid: cData.adminId || "",
              displayName: cData.primaryDoctorName || "Doctor",
              name: cData.primaryDoctorName || "Doctor",
              email: cData.primaryDoctorEmail || cData.adminEmail || "",
              doctorId: cData.primaryDoctorId || `DOC-${cleanId}-001`,
              category: "GP",
            },
          ];
        }

        // Query users collection for any additional doctors
        try {
          const q = query(collection(db, "users"), where("clinicId", "==", cleanId));
          const usersSnap = await getDocs(q);
          const foundDocs = usersSnap.docs
            .map((d) => ({ uid: d.id, ...d.data() }))
            .filter((u: any) => (u.role || "").toLowerCase() === "doctor");
          if (foundDocs.length > 0) {
            const emailSet = new Set(docsList.map((d) => (d.email || "").toLowerCase()));
            foundDocs.forEach((fd) => {
              const fdEmail = (fd.email || "").toLowerCase();
              if (fdEmail && !emailSet.has(fdEmail)) {
                emailSet.add(fdEmail);
                docsList.push({
                  uid: fd.uid || fd.id,
                  displayName: fd.displayName || fd.name || "Doctor",
                  name: fd.displayName || fd.name || "Doctor",
                  email: fd.email,
                  doctorId: fd.doctorId || `DOC-${cleanId}-001`,
                  category: fd.category || "GP",
                });
              }
            });
          }
        } catch (_) {}

        setRegisteredClinicDoctors(docsList);

        if (docsList.length > 0) {
          const target = docsList[0];
          setSignupData((prev: any) => ({
            ...prev,
            assignedDoctorUid: target.uid || target.id || "",
            assignedDoctorEmail: target.email || "",
            assignedDoctorName: target.displayName || target.name || "",
            assignedDoctorId: target.doctorId || `DOC-${cleanId}-001`,
            assignedDoctorCategory: target.category || "GP",
          }));
        }
      } else {
        setVerifiedClinic(null);
        setRegisteredClinicDoctors([]);
        setClinicLookupError(`Clinic ID "${cleanId}" not found in MediTrack. Please verify your Clinic ID.`);
      }
    } catch (err: any) {
      console.warn("Clinic lookup error:", err);
      setClinicLookupError("Unable to verify Clinic ID at this moment.");
    } finally {
      setClinicLookupLoading(false);
    }
  };

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

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-start gap-2.5 mb-4 animate-in fade-in duration-150">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <div className="leading-relaxed font-semibold">{formatErrorMessage(error)}</div>
              </div>
            )}

            {authMode === "login" ? (
              /* ── SIGN IN FORM ── */
              <div className="space-y-4">
                {signupSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <span>Clinic Account Registered!</span>
                    </div>
                    <p className="text-emerald-700 font-medium leading-relaxed">
                      Your {signupRoleTitle} account is ready.{" "}
                      {redirectCountdown !== null && redirectCountdown > 0 ? (
                        <span>
                          Entering your <strong>{signupRoleTitle} Portal</strong> in{" "}
                          <span className="font-bold underline">{redirectCountdown}s</span>... Or click{" "}
                          <strong>Sign In</strong> below now.
                        </span>
                      ) : (
                        <span>Click <strong>Sign In</strong> below to enter your portal.</span>
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                    Welcome back
                  </h2>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">
                    Sign in to access your clinic system.
                  </p>
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
                  {/* Role Selector */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Select Your Role *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSignupData((prev: any) => ({ ...prev, role: "doctor" }));
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          (signupData.role || "doctor") === "doctor"
                            ? "bg-[#064e3b] text-white border-[#064e3b] shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Stethoscope size={14} />
                        <span>Doctor</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSignupData((prev: any) => ({ ...prev, role: "receptionist" }));
                          if (signupData.clinicId) handleCheckClinic(signupData.clinicId);
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          signupData.role === "receptionist"
                            ? "bg-[#064e3b] text-white border-[#064e3b] shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Users size={14} />
                        <span>Receptionist</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSignupData((prev: any) => ({ ...prev, role: "admin" }));
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          signupData.role === "admin"
                            ? "bg-[#064e3b] text-white border-[#064e3b] shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <ShieldCheck size={14} />
                        <span>Admin</span>
                      </button>
                    </div>
                  </div>

                  {/* Clinic ID — Mandatory for Receptionist, optional for Doctor/Admin */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Clinic ID {signupData.role === "receptionist" ? "*" : "(Optional)"}
                      </label>
                      {verifiedClinic && (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✓ Verified: {verifiedClinic.name}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building2 size={16} />
                      </div>
                      <input
                        type="text"
                        required={signupData.role === "receptionist"}
                        value={signupData.clinicId || ""}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/\s+/g, "");
                          setSignupData((prev: any) => ({ ...prev, clinicId: val }));
                          handleCheckClinic(val);
                        }}
                        onBlur={() => {
                          if (signupData.clinicId) handleCheckClinic(signupData.clinicId);
                        }}
                        placeholder={signupData.role === "receptionist" ? "Enter Clinic ID (e.g. MT0010)" : "Leave blank for new clinic, or enter ID"}
                        className={inputCls + " font-mono uppercase font-bold tracking-wider"}
                      />
                    </div>
                    {clinicLookupLoading && (
                      <p className="text-[10px] text-slate-500 animate-pulse mt-0.5">Checking Clinic ID in Firebase...</p>
                    )}
                    {clinicLookupError && (
                      <p className="text-[10px] text-rose-600 font-bold mt-0.5 flex items-center gap-1">
                        <AlertCircle size={11} /> {clinicLookupError}
                      </p>
                    )}
                  </div>

                  {/* Clinic Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Clinic / Practice Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building2 size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={signupData.clinicName}
                        onChange={(e) => setSignupData((prev: any) => ({ ...prev, clinicName: e.target.value }))}
                        placeholder={verifiedClinic ? verifiedClinic.name : "Apollo HealthCare"}
                        className={inputCls}
                      />
                    </div>
                    {verifiedClinic && signupData.clinicName && signupData.clinicName.trim().toLowerCase() !== (verifiedClinic.name || "").trim().toLowerCase() && (
                      <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                        ⚠ Clinic Name must match registered name: "{verifiedClinic.name}"
                      </p>
                    )}
                  </div>

                  {/* Assigned Doctor (Mandatory for Receptionist) */}
                  {signupData.role === "receptionist" && (
                    <div className="space-y-1 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                      <label className="block text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                        Assigned Doctor *
                      </label>
                      {registeredClinicDoctors.length > 1 ? (
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600">
                            <Stethoscope size={15} />
                          </div>
                          <select
                            required
                            value={signupData.assignedDoctorUid || signupData.assignedDoctorEmail || ""}
                            onChange={(e) => {
                              const sel = e.target.value;
                              const match = registeredClinicDoctors.find((d) => (d.uid || d.id) === sel || d.email === sel);
                              if (match) {
                                setSignupData((prev: any) => ({
                                  ...prev,
                                  assignedDoctorUid: match.uid || match.id || "",
                                  assignedDoctorEmail: match.email || "",
                                  assignedDoctorName: match.displayName || match.name || "",
                                  assignedDoctorId: match.doctorId || `DOC-${signupData.clinicId}-001`,
                                  assignedDoctorCategory: match.category || "GP",
                                }));
                              }
                            }}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 cursor-pointer"
                          >
                            <option value="">Select Doctor from this Clinic...</option>
                            {registeredClinicDoctors.map((doc) => (
                              <option key={doc.uid || doc.id || doc.email} value={doc.uid || doc.id || doc.email}>
                                {doc.displayName || doc.name} ({doc.doctorId || doc.category || "General Physician"}) — {doc.email}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : registeredClinicDoctors.length === 1 ? (
                        <div className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-extrabold text-slate-900 flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <Stethoscope size={14} className="text-emerald-600 shrink-0" />
                            <span className="truncate">{registeredClinicDoctors[0].displayName || registeredClinicDoctors[0].name}</span>
                            <span className="text-[10px] text-slate-500 font-normal shrink-0">
                              ({registeredClinicDoctors[0].doctorId || "GP"})
                            </span>
                          </div>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                            Auto Assigned
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600">
                              <Mail size={15} />
                            </div>
                            <input
                              type="text"
                              value={signupData.assignedDoctorEmail || ""}
                              onChange={(e) => setSignupData((prev: any) => ({ ...prev, assignedDoctorEmail: e.target.value }))}
                              placeholder="Doctor's registered email (e.g. dr.zaid@meditrack.io)"
                              className={inputCls + " bg-white border-emerald-200 focus:ring-emerald-600/20"}
                            />
                          </div>
                          <p className="text-[10px] text-emerald-800/80">
                            Enter your clinic doctor's email to link your reception desk to their live queue.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Full Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserIcon size={16} />
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
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Work Email *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Mail size={16} />
                        </div>
                        <input
                          type="email"
                          required
                          value={signupData.email}
                          onChange={(e) => setSignupData((prev: any) => ({ ...prev, email: e.target.value }))}
                          placeholder="user@clinic.com"
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Mobile (+91) *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <Phone size={14} />
                        </div>
                        <input
                          type="tel"
                          required
                          value={signupData.phone || "+91"}
                          onChange={(e) => setSignupData((prev: any) => ({ ...prev, phone: e.target.value }))}
                          placeholder="+91 9876543210"
                          className={inputCls + " pl-8 text-xs font-mono"}
                        />
                      </div>
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
