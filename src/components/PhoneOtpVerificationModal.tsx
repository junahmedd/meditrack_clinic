import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Phone,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  LogOut,
  Lock,
} from "lucide-react";
import { auth, db } from "../firebase";
import {
  RecaptchaVerifier,
  linkWithPhoneNumber,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

interface PhoneOtpVerificationModalProps {
  user: any;
  userAccess: {
    uid?: string;
    displayName?: string;
    email?: string;
    role?: string;
    clinicId?: string;
    clinicName?: string;
    registeredPhoneNumber?: string;
    doctorId?: string;
    receptionistId?: string;
  };
  onVerificationSuccess: () => void;
  onLogout: () => void;
}

export const PhoneOtpVerificationModal: React.FC<PhoneOtpVerificationModalProps> = ({
  user,
  userAccess,
  onVerificationSuccess,
  onLogout,
}) => {
  const [step, setStep] = useState<"enter_phone" | "enter_otp">("enter_phone");
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Expiry and cooldown timers
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(300); // 5 minutes in seconds
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Mask registered phone for hint (e.g. "+91 9108200414" -> "+91 ••••• ••414")
  const maskedRegisteredPhone = React.useMemo(() => {
    const raw = (userAccess?.registeredPhoneNumber || "").replace(/\s+/g, "");
    if (!raw || raw.length < 6) return "+91 ••••• •••••";
    const last3 = raw.slice(-3);
    const prefix = raw.startsWith("+91") ? "+91" : raw.slice(0, 3);
    return `${prefix} ••••• ••${last3}`;
  }, [userAccess?.registeredPhoneNumber]);

  // Clean and normalize phone number
  const normalizeIndianPhone = (input: string): string => {
    let clean = input.replace(/[\s\-\(\)]/g, "");
    if (!clean.startsWith("+")) {
      if (clean.startsWith("91") && clean.length === 12) {
        clean = "+" + clean;
      } else if (clean.length === 10) {
        clean = "+91" + clean;
      } else {
        clean = "+" + clean;
      }
    }
    return clean;
  };

  // Pre-fill phone if available
  useEffect(() => {
    if (userAccess?.registeredPhoneNumber) {
      setPhoneNumber(userAccess.registeredPhoneNumber);
    }
  }, [userAccess?.registeredPhoneNumber]);

  // Timer countdowns
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "enter_otp" && expiresIn > 0) {
      timer = setTimeout(() => setExpiresIn((t) => t - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, expiresIn]);

  // Initialize reCAPTCHA
  const setupRecaptcha = (): RecaptchaVerifier => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (e) {}
    }

    const verifier = new RecaptchaVerifier(auth, "phone-auth-recaptcha-container", {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved
      },
      "expired-callback": () => {
        setError("Security check expired. Please try again.");
      },
    });
    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  // Clean up verifier on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {}
      }
    };
  }, []);

  // Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const normalizedEntered = normalizeIndianPhone(phoneNumber);
    const normalizedRegistered = normalizeIndianPhone(userAccess.registeredPhoneNumber || "");

    // Validate Indian phone format (+91 followed by 10 digits)
    const indianPhoneRegex = /^\+91[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(normalizedEntered)) {
      setError("Enter a valid 10-digit mobile number (+91).");
      return;
    }

    // Verify entered phone matches pre-authorized phone in backend mapping
    if (normalizedEntered !== normalizedRegistered) {
      setError(
        `Number does not match registered phone (${maskedRegisteredPhone}).`
      );
      return;
    }

    setLoading(true);
    try {
      const verifier = setupRecaptcha();
      let confirmResult: ConfirmationResult;

      try {
        // Attempt linking phone to existing authenticated Google / Email session
        if (auth.currentUser) {
          confirmResult = await linkWithPhoneNumber(auth.currentUser, normalizedEntered, verifier);
        } else {
          confirmResult = await signInWithPhoneNumber(auth, normalizedEntered, verifier);
        }
      } catch (linkErr: any) {
        // If phone is already linked or credential conflict, use standard signInWithPhoneNumber confirmation
        if (
          linkErr.code === "auth/provider-already-linked" ||
          linkErr.code === "auth/credential-already-in-use"
        ) {
          confirmResult = await signInWithPhoneNumber(auth, normalizedEntered, verifier);
        } else {
          throw linkErr;
        }
      }

      setConfirmationResult(confirmResult);
      setStep("enter_otp");
      setExpiresIn(300); // 5 minutes
      setResendCooldown(60); // 60 seconds
      setAttemptsLeft(5);
      setError(null);
    } catch (err: any) {
      console.error("SMS OTP send error:", err);
      if (err.code === "auth/too-many-requests") {
        setError("Too many requests. Please wait a few minutes.");
      } else if (err.code === "auth/invalid-phone-number") {
        setError("Invalid phone number format (+91).");
      } else if (err.code === "auth/quota-exceeded") {
        setError("Daily SMS limit reached. Contact administrator.");
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) {
      setError("Session expired. Request a new OTP.");
      return;
    }

    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      setError("Enter the 6-digit OTP code.");
      return;
    }

    if (expiresIn <= 0) {
      setError("OTP expired. Request a new code.");
      return;
    }

    if (attemptsLeft <= 0) {
      setError("Max attempts reached. Request a new code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Confirm with Firebase
      await confirmationResult.confirm(cleanOtp);

      // Successfully verified by Firebase Auth server!
      // Update backend userAccess and users document
      const uid = user.uid || userAccess.uid;
      const updateData = {
        phoneVerified: true,
        initialVerificationCompleted: true,
        verificationCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 1. Update userAccess
      const userAccessRef = doc(db, "userAccess", uid);
      await updateDoc(userAccessRef, updateData).catch(console.error);

      // 2. Update users
      const usersRef = doc(db, "users", uid);
      await updateDoc(usersRef, updateData).catch(console.error);

      setSuccess(true);
      setTimeout(() => {
        onVerificationSuccess();
      }, 1200);
    } catch (err: any) {
      console.error("OTP verification error:", err);
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);

      if (err.code === "auth/invalid-verification-code") {
        setError(`Incorrect OTP (${remaining} attempts left).`);
      } else if (err.code === "auth/code-expired") {
        setError("OTP expired. Request a new code.");
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      {/* Invisible reCAPTCHA container */}
      <div id="phone-auth-recaptcha-container" ref={recaptchaContainerRef} />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-emerald-900/10 overflow-hidden font-sans">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#064e3b] via-[#043d2e] to-[#022c22] p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/10 rounded-2xl border border-white/20 mx-auto flex items-center justify-center mb-3 shadow-inner">
            <ShieldCheck size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-black tracking-tight uppercase">
            Mandatory Security Verification
          </h2>
          <p className="text-xs text-emerald-200/80 mt-1 font-medium">
            First-time login requires Indian Mobile SMS OTP authentication
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
            <span>Clinic: {userAccess.clinicName || "MedPlus HealthCare"}</span>
            <span>•</span>
            <span className="uppercase">{userAccess.role || "Staff"}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* User Info Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-800">{userAccess.displayName || user.displayName || user.email}</p>
              <p className="text-[11px] text-slate-500 font-medium">{user.email}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Mobile</span>
              <span className="font-mono font-bold text-emerald-700 text-xs">{maskedRegisteredPhone}</span>
            </div>
          </div>

          {/* Success Banner */}
          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl text-center space-y-2 animate-in fade-in zoom-in duration-200">
              <CheckCircle2 size={36} className="text-emerald-600 mx-auto animate-bounce" />
              <h3 className="text-base font-black text-slate-900">Mobile Verified Successfully!</h3>
              <p className="text-xs text-slate-600 font-medium">
                Authorization complete. Redirecting to your assigned portal...
              </p>
            </div>
          ) : (
            <>
              {/* Error Banner */}
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-start gap-2.5 font-medium leading-relaxed">
                  <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              {/* STEP 1: Confirm Indian Mobile Number */}
              {step === "enter_phone" && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Enter Registered Indian Mobile Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone size={16} />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Must match the approved Indian phone number registered by your administrator.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#064e3b] hover:bg-[#043d2e] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending SMS OTP...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        <span>Send 6-Digit SMS OTP &rarr;</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: Enter 6-Digit OTP */}
              {step === "enter_otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Enter 6-Digit SMS Code
                      </label>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                        <Clock size={12} />
                        <span>
                          {Math.floor(expiresIn / 60)}:
                          {(expiresIn % 60).toString().padStart(2, "0")}
                        </span>
                      </div>
                    </div>

                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••••"
                      className="w-full text-center tracking-[0.5em] text-2xl font-mono font-black py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                      <span>SMS sent to {phoneNumber}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStep("enter_phone");
                          setError(null);
                        }}
                        className="text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        Change number
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6 || expiresIn <= 0}
                    className="w-full py-3 bg-[#064e3b] hover:bg-[#043d2e] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying Security Code...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Verify & Access Portal &rarr;</span>
                      </>
                    )}
                  </button>

                  {/* Resend Button */}
                  <div className="text-center pt-1">
                    {resendCooldown > 0 ? (
                      <span className="text-[11px] font-medium text-slate-400">
                        Resend code in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={loading}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <RefreshCw size={12} />
                        <span>Resend SMS OTP</span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}

          {/* Logout / Switch Account */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Logged in as {user.email}</span>
            <button
              type="button"
              onClick={onLogout}
              className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
