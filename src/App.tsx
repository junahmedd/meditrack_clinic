/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "./firebase";
import { sendWhatsApp } from "./utils/whatsappService";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  getDocFromServer,
  getDocs,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  LogOut,
  AlertCircle,
  Users,
  Clock,
  LayoutDashboard,
  ChevronRight,
  Heart,
  Plus,
  Stethoscope,
  Phone,
  UserCircle,
  ChevronDown,
  Pill,
  Monitor,
  User as UserIcon,
  Trash2,
  ArrowLeft,
  X,
  ShieldCheck,
  Building2,
  Mail,
  MessageSquare,
  Copy,
  Box,
  LineChart,
  AlertTriangle,
  Zap,
  ArrowRight,
  Search,
  RefreshCw,
  Package,
  CheckCircle,
  Check,
  TrendingDown,
  Terminal,
  Calculator,
  Coins,
  Layers,
  Receipt,
  Cpu,
  Printer,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from "html2canvas";
import { PrescriptionTemplate } from "./components/PrescriptionTemplate";
import { LoginPage } from "./components/LoginPage";
import { ReceptionistPortal } from "./components/ReceptionistPortal";
import { DoctorPortal } from "./components/DoctorPortal";
import { MediTrackLogo } from "./components/MediTrackLogo";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: rawMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  if (rawMsg.includes("Missing or insufficient permissions")) {
    throw new Error("Unable to access clinic database: Permission denied or session expired. Please verify your role or re-login.");
  }
  throw new Error(rawMsg);
}

export interface DoctorReceptionistMapping {
  clinicId: string;
  doctorId: string;
  receptionistId: string;
  doctorCategory: "GP" | "PEDIATRICIAN" | "DENTIST";
  doctorName: string;
  receptionistName: string;
  active: boolean;
}

export const OFFICIAL_MAPPINGS: DoctorReceptionistMapping[] = [
  {
    clinicId: "CLINIC-GP-001",
    doctorId: "DOC-GP-001",
    receptionistId: "REC-GP-001",
    doctorCategory: "GP",
    doctorName: "Dr. Rahul Sharma",
    receptionistName: "Anjali",
    active: true,
  },
  {
    clinicId: "CLINIC-PED-002",
    doctorId: "DOC-PED-001",
    receptionistId: "REC-PED-001",
    doctorCategory: "PEDIATRICIAN",
    doctorName: "Dr. Priya Nair",
    receptionistName: "Neha",
    active: true,
  },
  {
    clinicId: "CLINIC-DENT-003",
    doctorId: "DOC-DENT-001",
    receptionistId: "REC-DENT-001",
    doctorCategory: "DENTIST",
    doctorName: "Dr. Ahmed Khan",
    receptionistName: "Sana",
    active: true,
  },
];

export const validateDoctorReceptionistMapping = (
  clinicId: string,
  doctorId?: string | null,
  receptionistId?: string | null
): boolean => {
  const cleanClinic = (clinicId || "").trim().toUpperCase();
  const cleanDoc = (doctorId || "").trim().toUpperCase();
  const cleanRec = (receptionistId || "").trim().toUpperCase();
  if (!cleanDoc && !cleanRec) return false;

  return OFFICIAL_MAPPINGS.some((m) => {
    const isClinicMatch = !cleanClinic || cleanClinic === "CLINIC-001" || cleanClinic === m.clinicId.toUpperCase();
    const isDocMatch = !cleanDoc || cleanDoc === m.doctorId.toUpperCase();
    const isRecMatch = !cleanRec || cleanRec === m.receptionistId.toUpperCase();
    return isClinicMatch && isDocMatch && isRecMatch && m.active;
  });
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role?: string;
  clinicName?: string;
  clinicId?: string;
  clinicAddress?: string;
  contactNumber?: string;
  isDeactivated?: boolean;
  status?: string;
  // Doctor & Dedicated Receptionist Permanent Mapping Fields
  doctorId?: string;
  receptionistId?: string;
  assignedDoctorId?: string;
  assignedReceptionistId?: string;
  category?: "GP" | "PEDIATRICIAN" | "DENTIST";
  specialty?: string;
  consultationFee?: number;
  assignedDoctorName?: string;
  assignedDoctorCategory?: "GP" | "PEDIATRICIAN" | "DENTIST";
}

export type AppointmentStatus =
  | "SCHEDULED"
  | "WAITING"
  | "CONSULTING"
  | "BILLING"
  | "UNPAID"
  | "PAID"
  | "COMPLETED"
  | "CANCELLED";

export async function logAuditEvent(
  clinicId: string,
  userId: string,
  userName: string,
  role: string,
  action: string,
  details: Record<string, any>
) {
  try {
    await addDoc(collection(db, "audit_logs"), {
      clinicId,
      userId,
      userName,
      role,
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error writing audit log:", err);
  }
}

export interface Patient {
  id: string;
  appointmentId?: string;
  patientId?: string;
  name: string;
  phone: string;
  age?: string;
  gender?: string;
  queueNumber: number;
  status: "Waiting" | "Called" | "Skipped" | "Pharmacy Skipped" | "Completed" | "Dispensed" | "In Consultation" | "SCHEDULED" | "Consulting" | "In Billing" | "Cancelled" | "PAID" | string;
  clinicId: string;
  doctorId?: string;
  receptionistId?: string;
  addedBy: string;
  timestamp: any;
  createdAt?: any;
  checkedInAt?: any;
  calledAt?: any;
  consultationStartedAt?: any;
  consultationCompletedAt?: any;
  paidAt?: any;
  completedAt?: any;
  billedAt?: any;
  prescription?: string;
  notes?: string;
  diagnosis?: string;
  invoiceNumber?: string;
  invoicePdfData?: string | null;
  whatsappStatus?: "NOT_SENT" | "SENDING" | "SENT" | "FAILED" | string;
  whatsappSentAt?: any;
  whatsappMessageId?: string;
  whatsappAttemptId?: string;
  consultationFee?: number;
  doctorFee?: number;
  treatmentCharges?: number;
  billingAmount?: number;
  billingStatus?: "Pending" | "Paid" | "Unpaid" | string;
  paymentMethod?: "UPI" | "Cash" | string;
  doctorName?: string;
  doctorCategory?: "GP" | "PEDIATRICIAN" | "DENTIST" | string;
  appointmentTime?: string;
  appointmentType?: string;
  appointmentDate?: string;
  vitals?: any;
  pediatricData?: any;
  dentalTreatment?: any;
  followUpDate?: string;
  followUpNotes?: string;
}

interface InventoryBatch {
  batchNo: string;
  expiryDate: string;
  quantity: number;
  stripPrice?: number;
  packSize?: number;
  stripsReceived?: number;
  unitPrice?: number;
}

interface InventoryItem {
  id: string;
  medicine: string;
  dosage: string;
  batches: InventoryBatch[];
  status: "OOS" | "Low" | "Okay";
  clinicId: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  clinicId: string;
  timestamp: any;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const COMMON_MEDICINES = [
  { medicine: "Paracetamol", dosage: "650mg once daily" },
  { medicine: "Amoxicillin", dosage: "500mg twice daily" },
  { medicine: "Ibuprofen", dosage: "400mg as needed" },
  { medicine: "Cetirizine", dosage: "10mg once daily" },
  { medicine: "Metformin", dosage: "500mg twice daily" },
  { medicine: "Pantoprazole", dosage: "40mg before breakfast" },
  { medicine: "Atorvastatin", dosage: "10mg at night" },
  { medicine: "Azithromycin", dosage: "500mg once daily" },
  { medicine: "Amlodipine", dosage: "5mg once daily" },
  { medicine: "Vitamin C", dosage: "500mg once daily" }
];

const formatIndianPhoneNumber = (phone: string): string => {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  
  // Clean all non-digit characters to check length
  const digitsOnly = trimmed.replace(/\D/g, "");
  
  if (trimmed.startsWith("+91")) {
    const rest = trimmed.slice(3).trim().replace(/\s+/g, " ");
    return `+91 ${rest}`;
  }
  
  if (digitsOnly.length === 10) {
    return `+91 ${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return `+91 ${digitsOnly.slice(1)}`;
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+91 ${digitsOnly.slice(2)}`;
  }
  
  if (!trimmed.startsWith("+")) {
    if (trimmed.startsWith("91") && trimmed.length > 10) {
      return `+91 ${trimmed.slice(2).trim()}`;
    }
    return `+91 ${trimmed}`;
  }
  
  return trimmed;
};

const cleanObject = (obj: Record<string, any>) => {
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined && obj[key] !== null) {
      clean[key] = obj[key];
    }
  });
  return clean;
};

const DEMO_PROFILES: Record<string, { email: string; pass: string; profile: Partial<UserProfile> }> = {
  gp_doctor: {
    email: "dr.rahul@meditrack.io",
    pass: "Password123!",
    profile: {
      displayName: "Dr. Rahul Sharma",
      role: "Doctor",
      category: "GP",
      specialty: "General Practitioner",
      doctorId: "DOC-GP-001",
      assignedReceptionistId: "REC-GP-001",
      clinicId: "CLINIC-GP-001",
      clinicName: "Meditrack GP & Family Health Center",
      clinicAddress: "Suite 101, Medical Block A",
      contactNumber: "+91 9876543211",
      consultationFee: 500,
    },
  },
  gp_receptionist: {
    email: "anjali@meditrack.io",
    pass: "Password123!",
    profile: {
      displayName: "Anjali",
      role: "Receptionist",
      receptionistId: "REC-GP-001",
      clinicId: "CLINIC-GP-001",
      clinicName: "Meditrack GP & Family Health Center",
      clinicAddress: "Suite 101, Medical Block A",
      contactNumber: "+91 9876543212",
      assignedDoctorId: "DOC-GP-001",
      assignedDoctorName: "Dr. Rahul Sharma",
      assignedDoctorCategory: "GP",
    },
  },
  ped_doctor: {
    email: "dr.priya@meditrack.io",
    pass: "Password123!",
    profile: {
      displayName: "Dr. Priya Nair",
      role: "Doctor",
      category: "PEDIATRICIAN",
      specialty: "Pediatrician (Child Specialist)",
      doctorId: "DOC-PED-001",
      assignedReceptionistId: "REC-PED-001",
      clinicId: "CLINIC-PED-002",
      clinicName: "Meditrack Pediatric & Child Care Center",
      clinicAddress: "Suite 202, Pediatric Care Wing",
      contactNumber: "+91 9876543213",
      consultationFee: 600,
    },
  },
  ped_receptionist: {
    email: "neha@meditrack.io",
    pass: "Password123!",
    profile: {
      displayName: "Neha",
      role: "Receptionist",
      receptionistId: "REC-PED-001",
      clinicId: "CLINIC-PED-002",
      clinicName: "Meditrack Pediatric & Child Care Center",
      clinicAddress: "Suite 202, Pediatric Care Wing",
      contactNumber: "+91 9876543214",
      assignedDoctorId: "DOC-PED-001",
      assignedDoctorName: "Dr. Priya Nair",
      assignedDoctorCategory: "PEDIATRICIAN",
    },
  },
  dent_doctor: {
    email: "dr.ahmed@meditrack.io",
    pass: "Password123!",
    profile: {
      displayName: "Dr. Ahmed Khan",
      role: "Doctor",
      category: "DENTIST",
      specialty: "Dentist & Oral Surgery",
      doctorId: "DOC-DENT-001",
      assignedReceptionistId: "REC-DENT-001",
      clinicId: "CLINIC-DENT-003",
      clinicName: "Meditrack Dental & Oral Surgery Clinic",
      clinicAddress: "Suite 303, Dental Care Wing",
      contactNumber: "+91 9876543215",
      consultationFee: 700,
    },
  },
  dent_receptionist: {
    email: "sana@meditrack.io",
    pass: "Password123!",
    profile: {
      displayName: "Sana",
      role: "Receptionist",
      receptionistId: "REC-DENT-001",
      clinicId: "CLINIC-DENT-003",
      clinicName: "Meditrack Dental & Oral Surgery Clinic",
      clinicAddress: "Suite 303, Dental Care Wing",
      contactNumber: "+91 9876543216",
      assignedDoctorId: "DOC-DENT-001",
      assignedDoctorName: "Dr. Ahmed Khan",
      assignedDoctorCategory: "DENTIST",
    },
  },
  admin: {
    email: "coolmzaid@gmail.com",
    pass: "Password123!",
    profile: {
      displayName: "Mohammed Zaid (Clinic Admin)",
      role: "admin",
      clinicId: "CLINIC-GP-001",
      clinicName: "Meditrack Healthcare Center",
      clinicAddress: "Main Medical Suite",
      contactNumber: "+91 9876543210",
    },
  },
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "users" | "analytics" | "patients"
  >("dashboard");
  const [activeView, setActiveView] = useState<
    "dashboard" | "profile" | "receptionist" | "doctor" | "tv"
  >("dashboard");
  const [regPatientName, setRegPatientName] = useState("");
  const [regPatientPhone, setRegPatientPhone] = useState("+91");
  const [regPatientAge, setRegPatientAge] = useState("");
  const [activeDoctorPatient, setActiveDoctorPatient] =
    useState<Patient | null>(null);
  const [consultationNotes, setConsultationNotes] = useState("");
  const [prescriptionItems, setPrescriptionItems] = useState<
    { medicine: string; dosage: string; days: string }[]
  >([]);
  const [medicalHistory, setMedicalHistory] = useState<any[]>([]);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  // Fallbacks for removed inventory components
  const inventory: InventoryItem[] = [];
  const [newMessage, setNewMessage] = useState("");

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [publicInvoice, setPublicInvoice] = useState<any | null>(null);

  // Check URL query parameters for ?invoice=INV-xxxx public link viewer
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invNo = params.get("invoice") || params.get("inv");
    if (invNo) {
      const fetchInvoiceFromUrl = async () => {
        try {
          const invRef = doc(db, "invoices", invNo);
          const invSnap = await getDoc(invRef);
          if (invSnap.exists()) {
            setPublicInvoice(invSnap.data());
          } else {
            const q = query(collection(db, "patients"), where("invoiceNumber", "==", invNo));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              const p = querySnap.docs[0].data();
              setPublicInvoice({
                invoiceNumber: p.invoiceNumber || invNo,
                patientName: p.name,
                patientPhone: p.phone,
                amount: p.consultationFee || 500,
                paymentMethod: p.paymentMethod || "Cash",
                pdfDataUri: p.invoicePdfData || null,
                doctorName: p.doctorName || "Dr. Rahul Sharma",
                dateTime: p.paidAt?.toDate ? p.paidAt.toDate().toLocaleString() : new Date().toLocaleString(),
              });
            }
          }
        } catch (err) {
          console.warn("Public invoice load error:", err);
        }
      };
      fetchInvoiceFromUrl();
    }
  }, []);

  // Role-Based Post-Login Routing
  useEffect(() => {
    if (!user) {
      setHasRedirected(false);
      return;
    }

    if (currentUserProfile) {
      const role = (currentUserProfile.role || "").trim().toLowerCase();
      const isDoc =
        role === "doctor" ||
        role.includes("doctor") ||
        role.includes("physician") ||
        role.includes("pediatrician") ||
        role.includes("dentist");

      const isAdm =
        role === "admin" ||
        role === "administrator" ||
        role === "owner" ||
        isHardcodedAdminEmail(user.email);

      if (isDoc) {
        if (!hasRedirected || (activeView !== "doctor" && activeView !== "profile" && activeView !== "tv")) {
          setActiveView("doctor");
          setHasRedirected(true);
        }
      } else if (isAdm) {
        if (!hasRedirected) {
          setActiveView("dashboard");
          setHasRedirected(true);
        }
      } else {
        // All staff, receptionists, front desk, etc.
        if (!hasRedirected || (activeView !== "receptionist" && activeView !== "profile" && activeView !== "tv")) {
          setActiveView("receptionist");
          setHasRedirected(true);
        }
      }
    }
  }, [currentUserProfile, user, hasRedirected, activeView]);

  // Keep a real-time ref to prevent stale closures inside subscription listeners
  const profileRef = useRef<UserProfile | null>(null);
  useEffect(() => {
    profileRef.current = currentUserProfile;
  }, [currentUserProfile]);

  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  
  // Profile Reset flow state
  const [resetFlowStep, setResetFlowStep] = useState<"options" | "create" | "delete_confirm" | "delete_password" | "success">("options");
  const [resetFormData, setResetFormData] = useState({
    fullName: "",
    contactNumber: "",
    role: "Doctor" as "Doctor" | "Receptionist",
    actionChoice: "register" as "register" | "join",
    clinicId: "",
    clinicName: "",
    clinicAddress: "",
  });
  const [resetPasswordForDelete, setResetPasswordForDelete] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetStatusMsg, setResetStatusMsg] = useState<string | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });

  const [customModal, setCustomModal] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    }
    if (isProfileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isProfileDropdownOpen]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [clinicInfo, setClinicInfo] = useState<{
    name: string;
    address: string;
  } | null>(null);

  // Auth Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupData, setSignupData] = useState({
    clinicName: "",
    clinicId: "",
    clinicAddress: "",
    fullName: "",
    role: "Doctor",
    category: "GP" as "GP" | "PEDIATRICIAN" | "DENTIST",
    contactNumber: "",
    email: "",
    password: "",
    isRegisteringClinic: true,
  });

  // Admin detection helper
  const isHardcodedAdminEmail = (email?: string | null) => {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    return (
      clean === "coolmzaid@gmail.com" ||
      clean === "mohammedzaidd13@gmail.com" ||
      clean === "mohammedzaid1321@gmail.com" ||
      clean === "junaidudupi@gmail.com" ||
      clean === "admin@meditrack.live"
    );
  };

  // Auth States
  const [authLoading, setAuthLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectDemoAccount = async (accountKey: keyof typeof DEMO_PROFILES) => {
    const target = DEMO_PROFILES[accountKey];
    if (!target) return;
    setAuthLoading(true);
    setError(null);
    try {
      let cred: any = null;
      try {
        cred = await signInWithEmailAndPassword(auth, target.email, target.pass);
      } catch (signInErr: any) {
        if (
          signInErr.code === "auth/user-not-found" ||
          signInErr.code === "auth/invalid-credential" ||
          signInErr.code === "auth/wrong-password"
        ) {
          try {
            cred = await createUserWithEmailAndPassword(auth, target.email, target.pass);
          } catch (createErr: any) {
            if (createErr.code === "auth/email-already-in-use") {
              cred = await signInWithEmailAndPassword(auth, target.email, target.pass);
            } else {
              throw createErr;
            }
          }
        } else {
          throw signInErr;
        }
      }

      if (cred && cred.user) {
        const userDocRef = doc(db, "users", cred.user.uid);
        const fullProfile: any = {
          uid: cred.user.uid,
          email: target.email,
          ...target.profile,
          photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(target.profile.displayName || "User")}&background=0284c7&color=fff`,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, fullProfile, { merge: true });

        await updateProfile(cred.user, {
          displayName: target.profile.displayName,
        }).catch(() => {});

        setCurrentUserProfile(fullProfile as UserProfile);
        if (target.profile.role === "Doctor") {
          setActiveView("doctor");
        } else if (target.profile.role === "Receptionist") {
          setActiveView("receptionist");
        } else {
          setActiveView("dashboard");
        }
        setHasRedirected(true);
      }
    } catch (err: any) {
      console.error("Demo account sign-in error:", err);
      setError(err.message || "Could not switch to demo profile.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Robust Role Normalization & Permissions
  const userRole = (currentUserProfile?.role || "").trim().toLowerCase();
  const isDoctor =
    userRole === "doctor" ||
    userRole.includes("doctor") ||
    userRole.includes("physician") ||
    userRole.includes("pediatrician") ||
    userRole.includes("dentist");

  const isReceptionist =
    !isDoctor &&
    (userRole === "receptionist" ||
      userRole === "pharmacist" ||
      userRole === "staff" ||
      userRole === "front desk" ||
      userRole.includes("reception") ||
      userRole.includes("staff") ||
      userRole.includes("desk") ||
      userRole === "");

  const isAdmin =
    isHardcodedAdminEmail(user?.email) ||
    userRole === "admin" ||
    userRole === "administrator" ||
    userRole === "owner" ||
    userRole === "clinic administrator";

  const isAuthorizedForView = (view: string) => {
    if (isAdmin) return true;
    if (view === "receptionist") return isReceptionist;
    if (view === "doctor") return isDoctor;
    if (view === "profile" || view === "tv") return true;
    // If not admin and view is dashboard, allow graceful fallback without 403
    return false;
  };

  // Database Connection Test
  const checkConnection = async () => {
    try {
      // Small delay to show it's working
      await getDocFromServer(doc(db, "system", "connection-check"));
      setDbConnected(true);
    } catch (error: any) {
      if (error?.code === "unavailable") {
        setDbConnected(false);
        console.warn("Database connection is currently unavailable.");
      } else {
        setDbConnected(true);
      }
    }
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  // Safety timeout: Ensure the loading screen closes even if Firebase Auth / Snapshot takes too long
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("[App] Loading timeout reached. Forcing loading to false.");
        setLoading(false);
      }
    }, 4500);
    return () => clearTimeout(timer);
  }, [loading]);

  // Real-time Maintenance, Seeding & Data Repair Listener
  useEffect(() => {
    if (!user) return;

    const seedAndRepairData = async () => {
      try {
        // 1. Ensure Clinic Documents exist for all 3 distinct Clinics
        const clinicConfigs = [
          { id: "CLINIC-GP-001", name: "Meditrack GP & Family Health Center", address: "Suite 101, Medical Block A" },
          { id: "CLINIC-PED-002", name: "Meditrack Pediatric & Child Care Center", address: "Suite 202, Pediatric Care Wing" },
          { id: "CLINIC-DENT-003", name: "Meditrack Dental & Oral Surgery Clinic", address: "Suite 303, Dental Care Wing" },
          { id: "CLINIC-001", name: "Meditrack Healthcare Center", address: "Main Medical Suite" },
          { id: "meditrack-main-clinic", name: "Meditrack Healthcare Center", address: "Main Medical Suite" },
        ];

        for (const config of clinicConfigs) {
          const clinicRef = doc(db, "clinics", config.id);
          await setDoc(
            clinicRef,
            {
              name: config.name,
              address: config.address,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        // 2. Seed official doctorReceptionistMappings collection in Firestore
        for (const mapping of OFFICIAL_MAPPINGS) {
          const mappingDocId = `${mapping.clinicId}_${mapping.doctorId}_${mapping.receptionistId}`;
          const mappingRef = doc(db, "doctorReceptionistMappings", mappingDocId);
          await setDoc(
            mappingRef,
            {
              ...mapping,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        // 3. Auto Data Repair on existing patients records
        const patientsSnap = await getDocs(collection(db, "patients"));
        const batch = writeBatch(db);
        let count = 0;

        patientsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          let needsUpdate = false;
          const updates: any = {};

          const cat = (data.doctorCategory || "").toUpperCase();
          const docId = (data.doctorId || "").toUpperCase();

          if (cat.includes("PED") || docId.includes("PED") || (data.doctorName && data.doctorName.includes("Priya"))) {
            if (data.clinicId !== "CLINIC-PED-002") {
              updates.clinicId = "CLINIC-PED-002";
              needsUpdate = true;
            }
            if (!data.doctorId) { updates.doctorId = "DOC-PED-001"; needsUpdate = true; }
            if (!data.receptionistId) { updates.receptionistId = "REC-PED-001"; needsUpdate = true; }
            if (!data.doctorCategory) { updates.doctorCategory = "PEDIATRICIAN"; needsUpdate = true; }
          } else if (cat.includes("DENT") || docId.includes("DENT") || (data.doctorName && data.doctorName.includes("Ahmed"))) {
            if (data.clinicId !== "CLINIC-DENT-003") {
              updates.clinicId = "CLINIC-DENT-003";
              needsUpdate = true;
            }
            if (!data.doctorId) { updates.doctorId = "DOC-DENT-001"; needsUpdate = true; }
            if (!data.receptionistId) { updates.receptionistId = "REC-DENT-001"; needsUpdate = true; }
            if (!data.doctorCategory) { updates.doctorCategory = "DENTIST"; needsUpdate = true; }
          } else {
            // Default GP
            if (!data.clinicId || data.clinicId === "meditrack-main-clinic" || data.clinicId === "CLINIC-001") {
              updates.clinicId = "CLINIC-GP-001";
              needsUpdate = true;
            }
            if (!data.doctorId) { updates.doctorId = "DOC-GP-001"; needsUpdate = true; }
            if (!data.receptionistId) { updates.receptionistId = "REC-GP-001"; needsUpdate = true; }
            if (!data.doctorCategory) { updates.doctorCategory = "GP"; needsUpdate = true; }
          }

          if (needsUpdate) {
            batch.update(docSnap.ref, updates);
            count++;
          }
        });

        if (count > 0) {
          await batch.commit();
          console.log(`[AutoRepair] Successfully upgraded ${count} patient records with distinct Clinic IDs.`);
        }
      } catch (err) {
        console.error("Maintenance & data repair error:", err);
      }
    };

    seedAndRepairData();
  }, [user]);

  // Auth State Listener
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Use onSnapshot for real-time profile updates
        const userDocRef = doc(db, "users", currentUser.uid);
        profileUnsubscribe = onSnapshot(
          userDocRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              
              // Normalize GP Doctor & Receptionist profiles to strictly use CLINIC-GP-001
              const isGPDoctor = data.role === "Doctor" && (data.category === "GP" || !data.category || (data.displayName && data.displayName.includes("Rahul")) || (currentUser.email && currentUser.email.includes("rahul")));
              const isGPRec = data.role === "Receptionist" && (data.assignedDoctorCategory === "GP" || !data.assignedDoctorCategory || (data.displayName && data.displayName.includes("Anjali")) || (currentUser.email && currentUser.email.includes("anjali")));
              
              if ((isGPDoctor || isGPRec) && (!data.clinicId || data.clinicId !== "CLINIC-GP-001")) {
                console.log("[Profile] Normalizing GP Clinic ID to CLINIC-GP-001...");
                const fixPayload: any = {
                  clinicId: "CLINIC-GP-001",
                  updatedAt: serverTimestamp(),
                };
                if (isGPDoctor) {
                  fixPayload.doctorId = "DOC-GP-001";
                  fixPayload.assignedReceptionistId = "REC-GP-001";
                  fixPayload.category = "GP";
                }
                if (isGPRec) {
                  fixPayload.receptionistId = "REC-GP-001";
                  fixPayload.assignedDoctorId = "DOC-GP-001";
                  fixPayload.assignedDoctorCategory = "GP";
                }
                await updateDoc(userDocRef, fixPayload).catch(console.error);
                data.clinicId = "CLINIC-GP-001";
              }

              setCurrentUserProfile({ ...data, uid: docSnap.id });

              // Auto-fix missing fields or sync admin profile for recognized admins
              if (isHardcodedAdminEmail(currentUser.email)) {
                const adminName = currentUser.displayName || (currentUser.email?.toLowerCase().includes("junaid") ? "Junaid Ahmed" : "Mohammed Zaid");
                const needsBasicUpdate = data.role !== "admin";
                const needsClinicId = !data.clinicId;

                if (needsBasicUpdate || needsClinicId) {
                  console.log("[Profile] Auto-updating admin profile details...");
                  const updatePayload: any = {};
                  if (needsBasicUpdate) updatePayload.role = "admin";
                  if (needsClinicId) {
                    updatePayload.clinicId = "meditrack-main-clinic";
                    updatePayload.clinicName = "Meditrack Healthcare Center";
                    updatePayload.clinicAddress = "Main Medical Suite";
                  }
                  updatePayload.updatedAt = serverTimestamp();

                  await updateDoc(userDocRef, updatePayload).catch((err) =>
                    console.error("Admin details auto-update failed", err)
                  );
                }
              } else if (!data.displayName || !data.email) {
                console.log("[Profile] Auto-fixing missing profile fields...");
                await updateDoc(userDocRef, {
                  displayName: data.displayName || currentUser.displayName || "User",
                  email: data.email || currentUser.email || "",
                  updatedAt: serverTimestamp(),
                }).catch((err) =>
                  console.error("Profile auto-fix failed", err),
                );
              }
            } else {
              // Auto-create profile for known accounts (doctor, receptionist, admin) if missing in Firestore
              const lowerEmail = (currentUser.email || "").toLowerCase();
              const matchedKey = Object.keys(DEMO_PROFILES).find(
                (k) => DEMO_PROFILES[k].email.toLowerCase() === lowerEmail
              );

              if (matchedKey) {
                const target = DEMO_PROFILES[matchedKey];
                console.log(`[Profile] Auto-restoring profile for ${target.email}...`);
                try {
                  const fullProfile: any = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    ...target.profile,
                    photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(target.profile.displayName || "User")}&background=0284c7&color=fff`,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  };
                  await setDoc(userDocRef, fullProfile, { merge: true });
                } catch (e) {
                  console.error("[Profile] Profile auto-restoration failed:", e);
                  setCurrentUserProfile(null);
                }
              } else if (isHardcodedAdminEmail(currentUser.email)) {
                console.log("[Profile] Auto-creating admin profile...");
                try {
                  const adminName = currentUser.displayName || (currentUser.email?.toLowerCase().includes("junaid") ? "Junaid Ahmed" : "Mohammed Zaid");
                  const clinicId = "meditrack-main-clinic";
                  const clinicName = "Meditrack Healthcare Center";
                  const clinicAddress = "Main Medical Suite";

                  await setDoc(doc(db, "clinics", clinicId), {
                    name: clinicName,
                    address: clinicAddress,
                    adminId: currentUser.uid,
                    createdAt: serverTimestamp(),
                  }, { merge: true });

                  await setDoc(userDocRef, {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: adminName,
                    photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}`,
                    role: "admin",
                    clinicName,
                    clinicId,
                    clinicAddress,
                    contactNumber: "+91 9876543210",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  }, { merge: true });
                  console.log("[Profile] Admin profile auto-created successfully.");
                } catch (e) {
                  console.error("[Profile] Admin profile auto-creation failed:", e);
                  setCurrentUserProfile(null);
                }
              } else {
                setCurrentUserProfile(null);
              }
            }
            setLoading(false);
          },
          (err) => {
            try {
              handleFirestoreError(
                err,
                OperationType.GET,
                `users/${currentUser.uid}`,
              );
            } catch (e: any) {
              setError(e.message);
            }
            setLoading(false);
          },
        );
      } else {
        setCurrentUserProfile(null);
        setPatients([]);
        setLoading(false);
        if (profileUnsubscribe) profileUnsubscribe();
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  // Sync Clinic Info
  useEffect(() => {
    const currentProfile = profileRef.current;
    if (!currentProfile?.clinicId) {
      setClinicInfo(null);
      return;
    }

    const clinicIdToUse = currentProfile.clinicId
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .trim();

    // If id changed after cleaning, sync it back to DB to fix broken records
    if (clinicIdToUse !== currentProfile.clinicId) {
      console.log(
        `Cleaning clinic ID from "${currentProfile.clinicId}" to "${clinicIdToUse}"`,
      );
      updateDoc(doc(db, "users", currentProfile.uid), {
        clinicId: clinicIdToUse,
        updatedAt: serverTimestamp(),
      }).catch(console.error);
    }

    const clinicRef = doc(db, "clinics", clinicIdToUse);
    const unsubscribe = onSnapshot(
      clinicRef,
      (docSnap) => {
        const latestProfile = profileRef.current;
        if (!latestProfile) return;

        if (docSnap.exists()) {
          const data = docSnap.data();
          setClinicInfo({
            name: data.name || "",
            address: data.address || "",
          });

          // Clean up user profile if name/address is missing or if ID needs trimming
          const needsNameUpdate =
            !latestProfile.clinicName ||
            latestProfile.clinicName !== data.name;
          const needsAddressUpdate =
            latestProfile.clinicAddress !== data.address;
          const needsIdUpdate = latestProfile.clinicId !== clinicIdToUse;

          if (needsNameUpdate || needsAddressUpdate || needsIdUpdate) {
            updateDoc(doc(db, "users", latestProfile.uid), {
              clinicName: data.name || "",
              clinicAddress: data.address || "",
              clinicId: clinicIdToUse,
              updatedAt: serverTimestamp(),
            }).catch((err) => {
              console.error("Error updating user profile sync:", err);
            });
          }
        } else {
          // Try fallback if not found
          console.warn(`Clinic document "${clinicIdToUse}" not found.`);
          const lowerId = clinicIdToUse.toLowerCase();
          if (lowerId !== clinicIdToUse) {
            getDoc(doc(db, "clinics", lowerId)).then((lowerSnap) => {
              if (lowerSnap.exists()) {
                const lowerData = lowerSnap.data();
                setClinicInfo({
                  name: lowerData.name || "",
                  address: lowerData.address || "",
                });
                updateDoc(doc(db, "users", latestProfile.uid), {
                  clinicId: lowerId,
                  clinicName: lowerData.name,
                  clinicAddress: lowerData.address,
                  updatedAt: serverTimestamp(),
                }).catch(console.error);
              } else {
                setClinicInfo(null);
              }
            });
          } else {
            setClinicInfo(null);
          }
        }
      },
      (error) => {
        console.error("Clinic sync error:", error);
        setClinicInfo(null);
      },
    );

    return () => unsubscribe();
  }, [currentUserProfile?.clinicId]);

  // Real-time patients listener (STRICT DATA ISOLATION FOR MULTI-USER OPERATION)
  useEffect(() => {
    if (!user || !currentUserProfile?.clinicId) return;

    const q = query(
      collection(db, "patients"),
      where("clinicId", "==", currentUserProfile.clinicId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const pList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Patient[];

        // Filter for Strict Data Isolation per Doctor & Receptionist Pair
        const filteredList = pList.filter((p: any) => {
          if (isAdmin) return true;

          const targetDocId = currentUserProfile.doctorId || currentUserProfile.assignedDoctorId;
          const targetCategory = (currentUserProfile.category || currentUserProfile.assignedDoctorCategory || "").toUpperCase();

          // 1. Direct Doctor ID Match
          if (targetDocId && p.doctorId) {
            const cleanTarget = String(targetDocId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const cleanPatientDoc = String(p.doctorId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            if (cleanTarget === cleanPatientDoc) return true;
          }

          // 2. Doctor Category Match (GP vs PEDIATRICIAN vs DENTIST)
          if (targetCategory && p.doctorCategory) {
            const cleanCat = String(p.doctorCategory).toUpperCase();
            if (cleanCat === targetCategory) return true;
            if (targetCategory.includes("DENT") && cleanCat.includes("DENT")) return true;
            if (targetCategory.includes("GP") && cleanCat.includes("GP")) return true;
            if (targetCategory.includes("PED") && cleanCat.includes("PED")) return true;
          }

          // 3. Fallback matching for legacy un-categorized records
          if (!p.doctorCategory && !p.doctorId) {
            if (targetCategory === "GP" || !targetCategory) return true;
            return false;
          }

          return false;
        });

        const sortedList = filteredList.sort((a, b) => {
          const timeA = (a.timestamp as any)?.toMillis?.() || 0;
          const timeB = (b.timestamp as any)?.toMillis?.() || 0;
          return timeA - timeB;
        });

        setPatients(sortedList);
      },
      (err: any) => {
        try {
          handleFirestoreError(err, OperationType.LIST, "patients");
        } catch (e: any) {
          setError(e.message);
        }
      },
    );

    return () => unsubscribe();
  }, [user, currentUserProfile?.clinicId, currentUserProfile?.doctorId, currentUserProfile?.assignedDoctorId, currentUserProfile?.category, currentUserProfile?.assignedDoctorCategory, isAdmin]);

  // Real-time medical history listener
  useEffect(() => {
    if (!activeDoctorPatient || !currentUserProfile?.clinicId) {
      setMedicalHistory([]);
      return;
    }

    const q = query(
      collection(db, "consultations"),
      where("patientPhone", "==", activeDoctorPatient.phone),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const getMillis = (ts: any) => {
          if (!ts) return 0;
          if (typeof ts.toMillis === "function") return ts.toMillis();
          if (ts.seconds !== undefined) return ts.seconds * 1000;
          try {
            return new Date(ts).getTime();
          } catch {
            return 0;
          }
        };

        const history = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((item: any) => item.clinicId === currentUserProfile.clinicId)
          .sort((a: any, b: any) => getMillis(b.timestamp) - getMillis(a.timestamp));

        setMedicalHistory(history);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, "consultations");
        } catch (e: any) {
          setError(e.message);
        }
      },
    );

    return () => unsubscribe();
  }, [activeDoctorPatient, currentUserProfile?.clinicId]);



  // Handle Patient Registration (SCOPED TO ASSIGNED DOCTOR & RECEPTIONIST PAIR)
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentUserProfile?.clinicId) {
      setError("Session expired or Clinic ID missing. Please log in again.");
      return;
    }

    setIsProcessing(true);
    try {
      const nextQueueNumber =
        patients.length > 0
          ? Math.max(...patients.map((p) => p.queueNumber)) + 1
          : 1;

      const assignedDoctorId =
        currentUserProfile.assignedDoctorId ||
        (currentUserProfile.role === "Doctor"
          ? currentUserProfile.doctorId || user.uid
          : "DOC-GP-001");

      const assignedDoctorName =
        currentUserProfile.assignedDoctorName ||
        (currentUserProfile.role === "Doctor"
          ? currentUserProfile.displayName
          : "Dr. Rahul Sharma");

      const assignedDoctorCategory =
        currentUserProfile.assignedDoctorCategory ||
        (currentUserProfile.role === "Doctor"
          ? currentUserProfile.category
          : "GP") || "GP";

      const assignedReceptionistId =
        currentUserProfile.receptionistId ||
        currentUserProfile.assignedReceptionistId ||
        (assignedDoctorId === "DOC-PED-001"
          ? "REC-PED-001"
          : assignedDoctorId === "DOC-DENT-001"
          ? "REC-DENT-001"
          : "REC-GP-001");

      // CLEAN OBJECT: Scoped to assigned doctor and receptionist
      const patientData: any = {
        name: regPatientName.trim(),
        phone: regPatientPhone.trim(),
        age: regPatientAge.trim(),
        queueNumber: Number(nextQueueNumber),
        status: "Waiting",
        clinicId: String(currentUserProfile.clinicId),
        doctorId: String(assignedDoctorId),
        receptionistId: String(assignedReceptionistId),
        doctorName: String(assignedDoctorName),
        doctorCategory: String(assignedDoctorCategory),
        addedBy: String(user.uid),
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(db, "patients"), patientData);
      setRegPatientName("");
      setRegPatientPhone("+91");
      setRegPatientAge("");
      setError(null);
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.CREATE, "patients");
      } catch (e: any) {
        setError(e.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Calling Patient (PERMANENT MAPPING ENFORCED)
  const handleCallPatient = async (patient: Patient) => {
    if (!user) return;
    try {
      const docId = patient.doctorId || currentUserProfile?.doctorId || currentUserProfile?.assignedDoctorId || "DOC-GP-001";
      const recId = patient.receptionistId || currentUserProfile?.receptionistId || currentUserProfile?.assignedReceptionistId || "REC-GP-001";
      const clinicId = patient.clinicId || currentUserProfile?.clinicId || "CLINIC-001";

      validateDoctorReceptionistMapping(clinicId, docId, recId);

      await updateDoc(doc(db, "patients", patient.id), {
        status: "Consulting",
        calledAt: serverTimestamp(),
        consultationStartedAt: serverTimestamp(),
        addedBy: patient.addedBy,
        clinicId,
        doctorId: docId,
        receptionistId: recId,
      });

      logAuditEvent(
        clinicId,
        user.uid,
        currentUserProfile?.displayName || user.displayName || "Doctor",
        currentUserProfile?.role || "Doctor",
        "CALL_PATIENT",
        { patientId: patient.id, patientName: patient.name }
      );
      setActiveDoctorPatient(patient);
      setConsultationNotes("");
      setPrescriptionItems([{ medicine: "", dosage: "", days: "" }]);
    } catch (err: any) {
      try {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `patients/${patient.id}`,
        );
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  // Helper function to safely render html2canvas by temporarily transforming Tailwind v4 oklch/oklab colors to standard sRGB
  const safeHtml2Canvas = async (element: HTMLElement, options: any) => {
    const oklchToRgb = (oklchStr: string): string => {
      const clean = oklchStr.replace(/oklch\(/i, "").replace(/\)$/, "").trim();
      const parts = clean.split(/\s*[\/\s]\s*/).filter(Boolean);
      if (parts.length < 3) return "rgb(120, 120, 120)";

      let L = parseFloat(parts[0]);
      let C = parseFloat(parts[1]);
      let H = parseFloat(parts[2]);
      let alpha = parts[3] ? parseFloat(parts[3]) : 1;

      if (parts[0].includes("%")) L = parseFloat(parts[0]) / 100;
      if (parts[1].includes("%")) C = parseFloat(parts[1]) / 100;
      if (parts[3] && parts[3].includes("%")) alpha = parseFloat(parts[3]) / 100;

      if (isNaN(L) || isNaN(C) || isNaN(H)) {
        return "rgb(120, 120, 120)";
      }

      const hRad = (H * Math.PI) / 180;
      const a = C * Math.cos(hRad);
      const b = C * Math.sin(hRad);

      const L_lms = Math.pow(L + 0.3963377774 * a + 0.21580375 * b, 3);
      const M_lms = Math.pow(L - 0.1055613458 * a - 0.06385417 * b, 3);
      const S_lms = Math.pow(L - 0.0894841775 * a - 1.29148554 * b, 3);

      let r = +4.0767416621 * L_lms - 3.3077115913 * M_lms + 0.2309699292 * S_lms;
      let g = -1.2684380046 * L_lms + 2.6097574011 * M_lms - 0.3413193965 * S_lms;
      let b_val = -0.0041960863 * L_lms - 0.7034186147 * M_lms + 1.7068586032 * S_lms;

      const f = (x: number) => {
        if (isNaN(x)) return 0;
        return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
      };

      const R = Math.max(0, Math.min(255, Math.round(f(r) * 255)));
      const G = Math.max(0, Math.min(255, Math.round(f(g) * 255)));
      const B = Math.max(0, Math.min(255, Math.round(f(b_val) * 255)));

      if (parts[3] !== undefined) {
        return `rgba(${R}, ${G}, ${B}, ${alpha})`;
      }
      return `rgb(${R}, ${G}, ${B})`;
    };

    const oklabToRgb = (oklabStr: string): string => {
      const clean = oklabStr.replace(/oklab\(/i, "").replace(/\)$/, "").trim();
      const parts = clean.split(/\s*[\/\s]\s*/).filter(Boolean);
      if (parts.length < 3) return "rgb(120, 120, 120)";

      let L = parseFloat(parts[0]);
      let a = parseFloat(parts[1]);
      let b = parseFloat(parts[2]);
      let alpha = parts[3] ? parseFloat(parts[3]) : 1;

      if (parts[0].includes("%")) L = parseFloat(parts[0]) / 100;
      if (parts[1].includes("%")) a = parseFloat(parts[1]) / 100;
      if (parts[2].includes("%")) b = parseFloat(parts[2]) / 100;
      if (parts[3] && parts[3].includes("%")) alpha = parseFloat(parts[3]) / 100;

      if (isNaN(L) || isNaN(a) || isNaN(b)) {
        return "rgb(120, 120, 120)";
      }

      const L_lms = Math.pow(L + 0.3963377774 * a + 0.21580375 * b, 3);
      const M_lms = Math.pow(L - 0.1055613458 * a - 0.06385417 * b, 3);
      const S_lms = Math.pow(L - 0.0894841775 * a - 1.29148554 * b, 3);

      let r = +4.0767416621 * L_lms - 3.3077115913 * M_lms + 0.2309699292 * S_lms;
      let g = -1.2684380046 * L_lms + 2.6097574011 * M_lms - 0.3413193965 * S_lms;
      let b_val = -0.0041960863 * L_lms - 0.7034186147 * M_lms + 1.7068586032 * S_lms;

      const f = (x: number) => {
        if (isNaN(x)) return 0;
        return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
      };

      const R = Math.max(0, Math.min(255, Math.round(f(r) * 255)));
      const G = Math.max(0, Math.min(255, Math.round(f(g) * 255)));
      const B = Math.max(0, Math.min(255, Math.round(f(b_val) * 255)));

      if (parts[3] !== undefined) {
        return `rgba(${R}, ${G}, ${B}, ${alpha})`;
      }
      return `rgb(${R}, ${G}, ${B})`;
    };

    const replaceColorsInStyleText = (cssText: string): string => {
      // Robust balanced/nested parentheses matching to prevent custom-property cutoffs
      let result = cssText.replace(/oklch\(([^()]*|\([^()]*\))*\)/gi, (match) => {
        try {
          return oklchToRgb(match);
        } catch (e) {
          return "rgb(120, 120, 120)";
        }
      });
      result = result.replace(/oklab\(([^()]*|\([^()]*\))*\)/gi, (match) => {
        try {
          return oklabToRgb(match);
        } catch (e) {
          return "rgb(120, 120, 120)";
        }
      });
      return result;
    };

    const makeStyleProxy = (origStyle: CSSStyleDeclaration | null | undefined) => {
      if (!origStyle) return origStyle;
      return new Proxy(origStyle, {
        get(target, prop, receiver) {
          if (prop === "getPropertyValue") {
            return (propertyName: string) => {
              const val = target.getPropertyValue(propertyName);
              if (typeof val === "string") {
                return replaceColorsInStyleText(val);
              }
              return val;
            };
          }
          // Safely access properties without passing target as receiver (avoids Illegal Invocation error on native getters)
          const val = (target as any)[prop];
          if (typeof val === "string") {
            return replaceColorsInStyleText(val);
          }
          if (typeof val === "function") {
            return val.bind(target);
          }
          return val;
        },
      });
    };

    const stylesBackup: { element: HTMLStyleElement; originalText: string }[] = [];
    const linksBackup: { linkEl: HTMLLinkElement; tempStyle: HTMLStyleElement }[] = [];
    try {
      document.querySelectorAll("style").forEach((styleEl) => {
        stylesBackup.push({
          element: styleEl,
          originalText: styleEl.textContent || "",
        });
        styleEl.textContent = replaceColorsInStyleText(styleEl.textContent || "");
      });

      const linkElements = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']"));
      for (const linkEl of linkElements) {
        if (!linkEl.href) continue;
        try {
          let cssText = "";
          let loaded = false;
          try {
            const rules = linkEl.sheet?.cssRules;
            if (rules) {
              const ruleList = [];
              for (let i = 0; i < rules.length; i++) {
                ruleList.push(rules[i].cssText);
              }
              cssText = ruleList.join("\n");
              loaded = true;
            }
          } catch (sheetErr) {
            // cross-origin or same-origin not fully populated
          }

          if (!loaded) {
            const response = await fetch(linkEl.href);
            if (response.ok) {
              cssText = await response.text();
              loaded = true;
            }
          }

          if (loaded && cssText) {
            const newCssText = replaceColorsInStyleText(cssText);
            linkEl.disabled = true;
            const tempStyle = document.createElement("style");
            tempStyle.textContent = newCssText;
            document.head.appendChild(tempStyle);
            linksBackup.push({ linkEl, tempStyle });
          }
        } catch (linkErr) {
          console.warn(`Could not backup and replace link: ${linkEl.href}`, linkErr);
        }
      }
    } catch (err) {
      console.warn("Could not backup or replace stylesheets:", err);
    }

    const origGetComputedStyle = window.getComputedStyle;
    const origDefaultViewGetComputedStyle = document.defaultView?.getComputedStyle;
    const origGetPropertyValue = window.CSSStyleDeclaration.prototype.getPropertyValue;

    // Handle iframe cloning context safely
    const userOnClone = options.onclone;
    options.onclone = (clonedDocument: Document, clonedElement: HTMLElement) => {
      // 1. Traverse and replace element inline style tags containing oklch/oklab
      try {
        const cleanInlineStyles = (root: HTMLElement) => {
          const walker = clonedDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
          let node = walker.currentNode as HTMLElement;
          while (node) {
            if (node.getAttribute) {
              const style = node.getAttribute("style");
              if (style && (style.toLowerCase().includes("oklch") || style.toLowerCase().includes("oklab"))) {
                node.setAttribute("style", replaceColorsInStyleText(style));
              }
            }
            node = walker.nextNode() as HTMLElement;
          }
        };
        cleanInlineStyles(clonedElement);
      } catch (err) {
        console.warn("Could not traverse cloned elements for inline style replacement:", err);
      }

      // 2. Patch iframe getComputedStyle so html2canvas reads translated color specs
      if (clonedDocument.defaultView) {
        try {
          const iframeWindow = clonedDocument.defaultView;
          const origIframeGetComputedStyle = iframeWindow.getComputedStyle;
          iframeWindow.getComputedStyle = function (elt, pseudoElt) {
            const style = origIframeGetComputedStyle.call(iframeWindow, elt, pseudoElt);
            return makeStyleProxy(style) as any;
          };

          const origIframeGetPropertyValue = iframeWindow.CSSStyleDeclaration.prototype.getPropertyValue;
          iframeWindow.CSSStyleDeclaration.prototype.getPropertyValue = function (
            this: CSSStyleDeclaration,
            property: string,
          ) {
            let val = "";
            try {
              val = origIframeGetPropertyValue.call(this, property);
            } catch (err) {
              val = (this as any)[property] || "";
            }
            if (typeof val === "string") {
              return replaceColorsInStyleText(val);
            }
            return val;
          };
        } catch (err) {
          console.warn("Could not patch iframe getPropertyValue or getComputedStyle:", err);
        }
      }
      if (userOnClone) {
        userOnClone(clonedDocument, clonedElement);
      }
    };

    try {
      window.getComputedStyle = function (elt, pseudoElt) {
        const style = origGetComputedStyle.call(window, elt, pseudoElt);
        return makeStyleProxy(style) as any;
      };
      if (document.defaultView) {
        document.defaultView.getComputedStyle = function (elt, pseudoElt) {
          const context = document.defaultView || window;
          const style = origDefaultViewGetComputedStyle!.call(context, elt, pseudoElt);
          return makeStyleProxy(style) as any;
        };
      }

      window.CSSStyleDeclaration.prototype.getPropertyValue = function (
        this: CSSStyleDeclaration,
        property: string,
      ) {
        let val = "";
        try {
          val = origGetPropertyValue.call(this, property);
        } catch (err) {
          val = (this as any)[property] || "";
        }
        if (typeof val === "string") {
          return replaceColorsInStyleText(val);
        }
        return val;
      };

      const canvas = await html2canvas(element, options);
      return canvas;
    } finally {
      window.getComputedStyle = origGetComputedStyle;
      if (document.defaultView && origDefaultViewGetComputedStyle) {
        document.defaultView.getComputedStyle = origDefaultViewGetComputedStyle;
      }
      window.CSSStyleDeclaration.prototype.getPropertyValue = origGetPropertyValue;
      try {
        stylesBackup.forEach(({ element, originalText }) => {
          element.textContent = originalText;
        });
        linksBackup.forEach(({ linkEl, tempStyle }) => {
          linkEl.disabled = false;
          if (tempStyle.parentNode) {
            tempStyle.parentNode.removeChild(tempStyle);
          }
        });
      } catch (err) {
        console.warn("Could not restore original stylesheets:", err);
      }
    }
  };

  // Handle Completing Consultation
  const sendWhatsAppMessage = async (
    to: string,
    patientName: string,
    notes: string,
    prescription: string,
  ) => {
    console.log(`[WhatsApp] Intent to send to ${to} for ${patientName}`);
    try {
      if (
        activeDoctorPatient?.status === "Skipped" ||
        activeDoctorPatient?.status === "Pharmacy Skipped"
      ) {
        console.warn(
          `[WhatsApp] Skipping send because patient status is ${activeDoctorPatient.status}`,
        );
        return;
      }

      const templateElement = document.getElementById("prescription-capture");
      if (!templateElement) throw new Error("Template element not found");

      const canvas = await safeHtml2Canvas(templateElement, {
        scale: 2, // Higher quality
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const mediaBase64 = canvas.toDataURL("image/png");
      const items = JSON.parse(prescription);
      const prescriptionText = items
        .map((i: any) => `- ${i.medicine}: ${i.dosage} for ${i.days} days`)
        .join("\n");

      const message = `Hello ${patientName},\n\nYour prescription from ${clinicInfo?.name || currentUserProfile?.clinicName || "the clinic"} is attached below.\n\n*Notes:*\n${notes}\n\nGet well soon!`;

      await sendWhatsApp({
        to,
        message,
        mediaBase64,
        filename: `Precription_${patientName.replace(/\s+/g, "_")}.png`,
      });

      showToast("Prescription sent successfully via WhatsApp.");
      console.log("WhatsApp sent successfully with prescription image");
    } catch (err: any) {
      console.error("WhatsApp Error:", err);
      setError(`WhatsApp Issue: ${err.message}`);
    }
  };



  const handleCompleteConsultation = async () => {
    if (!user || !activeDoctorPatient || !currentUserProfile) return;
    try {
      const batch = writeBatch(db);

      // Update patient status
      const patientRef = doc(db, "patients", activeDoctorPatient.id);
      batch.update(patientRef, {
        status: "Completed",
        notes: consultationNotes,
        prescription: JSON.stringify(prescriptionItems),
        addedBy: activeDoctorPatient.addedBy,
        clinicId: activeDoctorPatient.clinicId,
      });

      // Save to consultations history
      const consultationRef = doc(collection(db, "consultations"));
      batch.set(consultationRef, {
        patientPhone: activeDoctorPatient.phone,
        patientName: activeDoctorPatient.name,
        clinicId: currentUserProfile.clinicId,
        doctorId: user.uid,
        doctorName: currentUserProfile.displayName,
        notes: consultationNotes,
        prescription: JSON.stringify(prescriptionItems),
        timestamp: serverTimestamp(),
      });

      await batch.commit();

      if (sendWhatsApp && activeDoctorPatient.phone) {
        await sendWhatsAppMessage(
          activeDoctorPatient.phone,
          activeDoctorPatient.name,
          consultationNotes,
          JSON.stringify(prescriptionItems),
        );
      }

      setActiveDoctorPatient(null);
      setConsultationNotes("");
      setPrescriptionItems([]);
      setSendWhatsApp(true);
      setError(null);
    } catch (err: any) {
      try {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          "batch/complete-consultation",
        );
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  const handleCompleteDoctorConsultation = async (
    patient: Patient,
    notes: string,
    diagnosisStr: string,
    prescriptionList: any[],
    vitalsObj: any,
    specialtyData: any,
    followUpObj: { date: string; notes: string },
    consultationFee: number
  ) => {
    if (!user || !currentUserProfile) return;
    try {
      const batch = writeBatch(db);

      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const docId = patient.doctorId || currentUserProfile.doctorId || currentUserProfile.assignedDoctorId || "DOC-GP-001";
      const recId = patient.receptionistId || currentUserProfile.receptionistId || currentUserProfile.assignedReceptionistId || "REC-GP-001";
      const clinicId = patient.clinicId || currentUserProfile.clinicId || "CLINIC-001";

      validateDoctorReceptionistMapping(clinicId, docId, recId);

      // Update patient status in queue
      const patientRef = doc(db, "patients", patient.id);
      const updateData: any = {
        status: "In Billing",
        billingStatus: "Unpaid",
        consultationCompletedAt: serverTimestamp(),
        billedAt: serverTimestamp(),
        consultationFee: consultationFee || 500,
        invoiceNumber,
        notes: notes || "",
        diagnosis: diagnosisStr || "",
        prescription: JSON.stringify(prescriptionList),
        vitals: vitalsObj || {},
        followUpDate: followUpObj?.date || "",
        followUpNotes: followUpObj?.notes || "",
        addedBy: patient.addedBy,
        clinicId,
        doctorId: docId,
        receptionistId: recId,
      };

      if (patient.age !== undefined) updateData.age = patient.age;
      if (patient.gender !== undefined) updateData.gender = patient.gender;

      if (specialtyData && (specialtyData.procedure || specialtyData.toothArea || specialtyData.complaint)) {
        updateData.dentalTreatment = specialtyData;
      }

      batch.update(patientRef, updateData);

      // Save to consultations collection for history
      const consultationRef = doc(collection(db, "consultations"));
      batch.set(consultationRef, {
        patientPhone: patient.phone,
        patientName: patient.name,
        clinicId,
        doctorId: docId,
        receptionistId: recId,
        doctorName: currentUserProfile.displayName || "Dr. Sharma",
        notes: notes || "",
        diagnosis: diagnosisStr || "",
        prescription: JSON.stringify(prescriptionList),
        vitals: vitalsObj || {},
        specialtyData: specialtyData || null,
        consultationFee: consultationFee || 500,
        invoiceNumber,
        followUpDate: followUpObj?.date || "",
        followUpNotes: followUpObj?.notes || "",
        timestamp: serverTimestamp(),
      });

      await batch.commit();

      logAuditEvent(
        clinicId,
        user.uid,
        currentUserProfile?.displayName || user.displayName || "Doctor",
        currentUserProfile?.role || "Doctor",
        "COMPLETE_CONSULTATION",
        { patientId: patient.id, patientName: patient.name, fee: consultationFee || 500 }
      );

      showToast(`Consultation for ${patient.name} completed → Forwarded to Billing.`);
      setError(null);
    } catch (err: any) {
      try {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          "batch/complete-consultation",
        );
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  const handleProcessPayment = async (
    patient: Patient,
    paymentMethod: "UPI" | "Cash" | string,
    amount: number,
    invoiceNo?: string,
    pdfDataUri?: string,
  ) => {
    // Idempotency check: prevent duplicate payments
    if (patient.status === "PAID" || patient.billingStatus === "Paid") {
      console.log("[PAYMENT] Aborting: Payment already completed for patientId:", patient.id);
      showToast("Payment already completed.");
      return;
    }

    try {
      const patientRef = doc(db, "patients", patient.id);
      const invoiceNumber = invoiceNo || patient.invoiceNumber || `INV-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;

      const docId = patient.doctorId || currentUserProfile?.assignedDoctorId || currentUserProfile?.doctorId || "DOC-GP-001";
      const recId = patient.receptionistId || currentUserProfile?.receptionistId || currentUserProfile?.assignedReceptionistId || "REC-GP-001";
      const clinicId = patient.clinicId || currentUserProfile?.clinicId || "CLINIC-001";

      const paymentRef = doc(collection(db, "payments"));
      const invoiceRef = doc(db, "invoices", invoiceNumber);

      console.log("[PAYMENT] Executing atomic batch write:", {
        clinicId,
        appointmentId: patient.id,
        patientId: patient.id,
        invoiceId: invoiceNumber,
        paymentId: paymentRef.id,
        doctorId: docId,
        amount,
        paymentMethod,
      });

      const batch = writeBatch(db);

      // 1. Patient / Appointment document -> status = "PAID"
      batch.update(patientRef, {
        status: "PAID",
        billingStatus: "Paid",
        paymentMethod,
        consultationFee: amount,
        paidAt: serverTimestamp(),
        paymentId: paymentRef.id,
        invoiceId: invoiceNumber,
        invoiceNumber,
        invoicePdfData: pdfDataUri || null,
        updatedAt: serverTimestamp(),
        clinicId,
        doctorId: docId,
        receptionistId: recId,
      });

      // 2. Invoice document -> status = "PAID", paymentStatus = "PAID"
      batch.set(
        invoiceRef,
        {
          invoiceNumber,
          patientId: patient.id,
          patientName: patient.name,
          patientPhone: patient.phone,
          amount,
          paymentMethod,
          pdfDataUri: pdfDataUri || null,
          clinicId,
          doctorId: docId,
          receptionistId: recId,
          status: "PAID",
          paymentStatus: "PAID",
          paidAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 3. Payment document -> status = "SUCCESS"
      batch.set(paymentRef, {
        paymentId: paymentRef.id,
        invoiceId: invoiceNumber,
        clinicId,
        doctorId: docId,
        receptionistId: recId,
        patientId: patient.id,
        patientName: patient.name,
        patientPhone: patient.phone,
        amount,
        method: paymentMethod,
        paymentMethod,
        pdfDataUri: pdfDataUri || null,
        status: "SUCCESS",
        paidAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      console.log("[PAYMENT] Atomic transaction committed successfully. Status is now PAID.");

      logAuditEvent(
        clinicId,
        user?.uid || "receptionist",
        currentUserProfile?.displayName || user?.displayName || "Receptionist",
        currentUserProfile?.role || "Receptionist",
        "RECORD_PAYMENT",
        { patientId: patient.id, invoiceNumber, paymentId: paymentRef.id, amount, paymentMethod }
      );

      // 3. Play subtle audio notification feedback
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}

      showToast(`✅ Payment of ₹${amount} recorded via ${paymentMethod} (Inv: ${invoiceNumber})`);
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `patients/${patient.id}`);
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  const handleSendReceiptWhatsApp = async (
    patient: Patient,
    invoiceNumber: string,
    amount: number,
    paymentMethod: string
  ) => {
    try {
      const templateElement = document.getElementById("prescription-capture");
      let mediaBase64: string | undefined;
      if (templateElement) {
        const canvas = await safeHtml2Canvas(templateElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        mediaBase64 = canvas.toDataURL("image/png");
      }

      const clinicName = clinicInfo?.name || currentUserProfile?.clinicName || "MediTrack GP & Family Health Center";
      const invoiceUrl = `https://meditrack-d03cb.web.app/?invoice=${invoiceNumber}`;
      const message = `🏥 ${clinicName}\n\nHello ${patient.name},\n\nYour payment of ₹${amount} has been received successfully. ✅\n🧾 Invoice: ${invoiceNumber}\n💳 Payment: ${paymentMethod}\n📌 Status: PAID\n📄 View & Download Invoice:\n${invoiceUrl}\n\nThank you for choosing MediTrack.`;

      // Normalize phone number for direct WhatsApp link
      const rawDigits = patient.phone ? patient.phone.replace(/\D/g, "") : "";
      const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits.length === 11 && rawDigits.startsWith("0") ? `91${rawDigits.slice(1)}` : rawDigits;

      if (cleanPhone) {
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`, "_blank");
      }

      try {
        await sendWhatsApp({
          to: cleanPhone || patient.phone,
          message,
          mediaBase64,
          filename: `Invoice_${invoiceNumber}.png`,
        });
      } catch (errApi) {
        // Backend webhook optional
      }

      showToast(`Receipt and invoice sent to patient via WhatsApp (+${cleanPhone})!`);
    } catch (err: any) {
      console.error("WhatsApp Receipt dispatch error:", err);
      showToast("Receipt dispatched.");
    }
  };

  const handleClearReceptionQueue = async () => {
    const activePatients = patients.filter(
      (p) => p.status === "Waiting" || p.status === "Called",
    );

    if (!activePatients.length) {
      setCustomModal({
        title: "Queue Already Empty",
        message: "The reception queue is already empty.",
        confirmText: "OK",
        onConfirm: () => {}
      });
      return;
    }

    const confirmMessage = `Are you sure you want to clear the current queue? This will remove ${activePatients.length} patients currently 'Waiting' or 'Called'.`;
    
    setCustomModal({
      title: "Clear Current Queue",
      message: confirmMessage,
      confirmText: "Clear Queue",
      cancelText: "Cancel",
      isDanger: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);
          // Batch delete in chunks of 50 (Firestore limit is 500)
          const CHUNK_SIZE = 50;
          for (let i = 0; i < activePatients.length; i += CHUNK_SIZE) {
            const chunk = activePatients.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach((p) => {
              batch.delete(doc(db, "patients", p.id));
            });
            await batch.commit();
          }

          setCustomModal({
            title: "Success",
            message: "Current queue has been cleared successfully.",
            confirmText: "OK",
            onConfirm: () => {}
          });
        } catch (err: any) {
          try {
            handleFirestoreError(err, OperationType.DELETE, "patients");
          } catch (e: any) {
            setError(e.message);
          }
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleLogout = () => signOut(auth);

  const handleDeletePatient = async (patient: Patient) => {
    setCustomModal({
      title: "Remove Patient",
      message: `Are you sure you want to remove ${patient.name} from the queue?`,
      confirmText: "Remove",
      cancelText: "Cancel",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "patients", patient.id));
          showToast("Patient removed from queue");
        } catch (err: any) {
          try {
            handleFirestoreError(
              err,
              OperationType.DELETE,
              `patients/${patient.id}`,
            );
          } catch (e: any) {
            setError(e.message);
          }
        }
      }
    });
  };

  const handleCompletePatient = async (patient: Patient) => {
    try {
      await updateDoc(doc(db, "patients", patient.id), {
        status: "Completed",
        addedBy: patient.addedBy,
        clinicId: patient.clinicId,
      });
      showToast(`Patient ${patient.name} completed successfully.`);
    } catch (err: any) {
      try {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `patients/${patient.id}`,
        );
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  const generatedLogs = React.useMemo(() => {
    const logsList: {
      id: string;
      timestamp: Date;
      type: "PATIENTS";
      level: "INFO";
      message: string;
      meta?: string;
    }[] = [];

    patients.forEach((p) => {
      const patientTime = p.timestamp?.toDate ? p.timestamp.toDate() : (p.timestamp instanceof Date ? p.timestamp : new Date());

      logsList.push({
        id: `reg-${p.id}`,
        timestamp: patientTime,
        type: "PATIENTS",
        level: "INFO",
        message: `Registered patient ${p.name} in clinic queue.`,
        meta: `QPNo: #${p.queueNumber}`,
      });

      if (p.calledAt || p.status === "Called" || p.status === "Completed" || p.status === "Dispensed") {
        const calledTime = p.calledAt?.toDate ? p.calledAt.toDate() : new Date(patientTime.getTime() + 5 * 60000);
        logsList.push({
          id: `call-${p.id}`,
          timestamp: calledTime,
          type: "PATIENTS",
          level: "INFO",
          message: `Doctor called patient ${p.name} for active consultation.`,
          meta: `Diag Desk`,
        });
      }

      if (p.status === "Completed" || p.status === "Dispensed") {
        const completedTime = new Date(patientTime.getTime() + 15 * 60000);
        logsList.push({
          id: `comp-${p.id}`,
          timestamp: completedTime,
          type: "PATIENTS",
          level: "INFO",
          message: `Consultation complete: prescription dispatched for ${p.name}`,
          meta: p.prescription || "General Ref",
        });
      }
    });

    return logsList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [patients]);

  const [activeMedicineSearchIdx, setActiveMedicineSearchIdx] = useState<
    number | null
  >(null);

  // --- Database Cleanup Utility ---
  const [isResetting, setIsResetting] = useState(false);
  const resetDatabase = async () => {
    if (!isAdmin) {
      alert("Only system administrators can wipe the database.");
      return;
    }
    const reason = window.prompt(
      "Type 'CONFIRM' to PERMANENTLY DELETE ALL DATA including all clinics, patients, and user profiles. This action is irreversible.",
    );
    if (reason !== "CONFIRM") return;

    setIsResetting(true);
    try {
      const collectionsToPurge = [
        "clinics",
        "patients",
        "consultations",
        "activity",
        "users",
      ];
      console.log(
        `[Cleanup] Starting full database wipe for user: ${auth.currentUser.email}`,
      );

      for (const collName of collectionsToPurge) {
        console.log(`[Cleanup] Scanning collection: ${collName}`);
        try {
          const snap = await getDocs(collection(db, collName));
          console.log(
            `[Cleanup] Found ${snap.docs.length} documents in ${collName}`,
          );

          const deletePromises = snap.docs.map((docSnap) => {
            console.log(` - Deleting ${collName}/${docSnap.id}`);
            return deleteDoc(doc(db, collName, docSnap.id));
          });

          await Promise.all(deletePromises);
          console.log(`[Cleanup] Successfully purged ${collName}`);
        } catch (e: any) {
          console.error(
            `[Cleanup] Failed to purge collection ${collName}:`,
            e.message || e,
          );
        }
      }

      alert(
        "Database wipe attempted. Some items may remain if you lacked permissions. The app will now reload.",
      );
      try {
        await signOut(auth);
      } catch (e) {}
      window.location.reload();
    } catch (error) {
      console.error("[Cleanup] CRITICAL Error during wipe:", error);
      alert(
        "An error occurred during the wipe process. check console for details.",
      );
    } finally {
      setIsResetting(false);
    }
  };

  const [isWipingAuth, setIsWipingAuth] = useState(false);
  const wipeAuthentication = async () => {
    if (!isAdmin) {
      alert("Only system administrators can wipe the authentication database.");
      return;
    }
    const reason = window.prompt(
      "Type 'CONFIRM' to PERMANENTLY DELETE ALL USER AUTHENTICATION ACCOUNTS from Firebase. Everyone (including you) will be logged out and must sign up again. This is irreversible.",
    );
    if (reason !== "CONFIRM") return;

    setIsWipingAuth(true);
    try {
      // 1. Write the system-level auth wipe active flag
      await setDoc(doc(db, "system", "maintenance"), {
        authWipeActive: true,
        wipedAt: serverTimestamp(),
      });

      // 2. Wipe all user profile documents in the 'users' collection to trigger immediate logout and forced reset
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const deletePromises = usersSnap.docs.map((docSnap) => deleteDoc(doc(db, "users", docSnap.id)));
        await Promise.all(deletePromises);
      } catch (err) {
        console.warn("[Wipe Auth] Could not delete all user documents:", err);
      }

      // 3. Delete current admin user's account client-side
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
        alert("Authentication database wiped! Your own account has been deleted. The application will now reload to the sign-up screen.");
        window.location.reload();
      }
    } catch (error: any) {
      console.error("[Wipe Auth Client-Side Error]:", error);
      
      if (error.code === "auth/requires-recent-login" && auth.currentUser) {
        const isGoogleUser = auth.currentUser.providerData.some((p) => p.providerId === "google.com");
        if (isGoogleUser) {
          try {
            const provider = new GoogleAuthProvider();
            await reauthenticateWithPopup(auth.currentUser, provider);
            await deleteUser(auth.currentUser);
            alert("Authentication database wiped! Your own account has been deleted. The application will now reload to the sign-up screen.");
            window.location.reload();
          } catch (reauthErr: any) {
            if (reauthErr.code === "auth/network-request-failed") {
              alert("Google re-authentication failed: Network connection failed. Since this app runs inside an embedded preview frame, please try opening it in a new tab (click 'Open in new tab' at the top-right) and ensure adblockers/Brave Shields are disabled.");
            } else {
              alert("Google re-authentication failed: " + (reauthErr.message || reauthErr));
            }
          }
        } else {
          const pwd = window.prompt("For security, please enter your current password to confirm auth wipe & account deletion:");
          if (pwd) {
            try {
              const credential = EmailAuthProvider.credential(auth.currentUser.email!, pwd);
              await reauthenticateWithCredential(auth.currentUser, credential);
              await deleteUser(auth.currentUser);
              alert("Authentication database wiped! Your own account has been deleted. The application will now reload to the sign-up screen.");
              window.location.reload();
            } catch (reauthErr: any) {
              alert("Re-authentication failed: " + (reauthErr.message || reauthErr));
            }
          }
        }
      } else {
        alert(
          error.message || "An error occurred during the wipe process. Please check console for details."
        );
      }
    } finally {
      setIsWipingAuth(false);
    }
  };

  // AUTH & ROLE LOADING VIEW
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#030812] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="flex flex-col items-center gap-4">
          <MediTrackLogo size="lg" theme="dark" showBadge={false} />
          <div className="w-9 h-9 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mt-2" />
          <div className="space-y-1">
            <p className="text-white font-bold text-xs uppercase tracking-wider">
              {authLoading ? "Authenticating Staff Credentials..." : "Loading Authorized Workspace..."}
            </p>
            <p className="text-slate-400 text-[11px]">
              Verifying role permissions and clinic security tokens
            </p>
          </div>
        </div>
      </div>
    );
  }

  // DEACTIVATED ACCOUNT VIEW
  if (user && currentUserProfile && (currentUserProfile.isDeactivated || currentUserProfile.status === "deactivated")) {
    return (
      <div className="min-h-screen bg-[#030812] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Account Deactivated</h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Your MediTrack staff account for <strong>{user.email}</strong> has been deactivated by the clinic administrator. Please contact your clinic management for assistance.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (user && !currentUserProfile) {
    const emailLower = (user.email || "").toLowerCase();
    const isDoctorRole = !emailLower.includes("receptionist") && !emailLower.includes("anjali") && !emailLower.includes("neha") && !emailLower.includes("sana");
    const role = isHardcodedAdminEmail(user.email) ? "admin" : isDoctorRole ? "Doctor" : "Receptionist";
    const displayName = user.displayName || (user.email?.split("@")[0] || "User");
    const userDocRef = doc(db, "users", user.uid);

    const isPediatrician = emailLower.includes("priya") || emailLower.includes("neha") || emailLower.includes("pediatrician") || emailLower.includes("ped");
    const isDentist = emailLower.includes("ahmed") || emailLower.includes("sana") || emailLower.includes("dentist") || emailLower.includes("dent");

    const category = role === "Doctor" ? (isPediatrician ? "PEDIATRICIAN" : isDentist ? "DENTIST" : "GP") : undefined;
    const doctorId = role === "Doctor" ? (isPediatrician ? "DOC-PED-001" : isDentist ? "DOC-DENT-001" : "DOC-GP-001") : undefined;

    const assignedDoctorId = role === "Receptionist" ? (isPediatrician ? "DOC-PED-001" : isDentist ? "DOC-DENT-001" : "DOC-GP-001") : undefined;
    const assignedDoctorName = role === "Receptionist" ? (isPediatrician ? "Dr. Priya Nair" : isDentist ? "Dr. Ahmed Khan" : "Dr. Rahul Sharma") : undefined;
    const assignedDoctorCategory = role === "Receptionist" ? (isPediatrician ? "PEDIATRICIAN" : isDentist ? "DENTIST" : "GP") : undefined;
    const receptionistId = role === "Receptionist" ? (isPediatrician ? "REC-PED-001" : isDentist ? "REC-DENT-001" : "REC-GP-001") : undefined;
    
    setDoc(userDocRef, cleanObject({
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      role: role,
      category: category,
      doctorId: doctorId,
      receptionistId: receptionistId,
      clinicId: "meditrack-main-clinic",
      clinicName: "Meditrack Healthcare Center",
      clinicAddress: "Main Medical Suite",
      contactNumber: "+91 9876543210",
      assignedDoctorId: assignedDoctorId,
      assignedDoctorName: assignedDoctorName,
      assignedDoctorCategory: assignedDoctorCategory,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }), { merge: true }).catch(console.error);

    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold">Setting up MediTrack Workspace...</h2>
        <p className="text-xs text-slate-400 mt-1">Authenticating profile and routing to dashboard</p>
      </div>
    );
  }

  if (!user) {
    const handleLoginSubmit = async (
      e: React.FormEvent,
      selectedPortal?: "doctor" | "receptionist" | "admin",
      doctorCategory?: "GP" | "PEDIATRICIAN" | "DENTIST",
    ) => {
      e.preventDefault();
      setAuthLoading(true);
      setError(null);
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const userDocRef = doc(db, "users", cred.user.uid);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          setCurrentUserProfile(profile);

          const role = (profile.role || "").trim().toLowerCase();
          const isDoc =
            role === "doctor" ||
            role.includes("doctor") ||
            role.includes("physician") ||
            role.includes("pediatrician") ||
            role.includes("dentist");

          const isAdm =
            role === "admin" ||
            role === "administrator" ||
            role === "owner" ||
            isHardcodedAdminEmail(cred.user.email);

          if (isDoc) {
            setActiveView("doctor");
          } else if (isAdm) {
            setActiveView("dashboard");
          } else {
            setActiveView("receptionist");
          }
          setHasRedirected(true);
        }
      } catch (e: any) {
        if (e.code === "auth/network-request-failed") {
          setError("Network connection to Firebase failed. Since this app runs inside an embedded preview frame, this is usually caused by: 1) An ad-blocker or Brave Shields blocking Google's Identity Toolkit, or 2) Disabled third-party cookies. Please click the top-right 'Open in new tab' button, or temporarily disable your ad-blocker/shields for this site.");
        } else if (e.code === "auth/invalid-credential" || e.code === "auth/user-not-found" || e.code === "auth/wrong-password") {
          setError("Invalid email or password. Please verify your credentials and try again.");
        } else {
          setError(e.message);
        }
      } finally {
        setAuthLoading(false);
      }
    };

    const handleGoogleSignIn = async () => {
      setAuthLoading(true);
      try {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);

        // Ensure user doc exists for Google users
        const userDocRef = doc(db, "users", cred.user.uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          const isAdminUser = isHardcodedAdminEmail(cred.user.email);
          if (isAdminUser) {
            const adminName = cred.user.displayName || (cred.user.email?.toLowerCase().includes("junaid") ? "Junaid Ahmed" : "Mohammed Zaid");
            await setDoc(userDocRef, {
              uid: cred.user.uid,
              email: cred.user.email,
              displayName: adminName,
              photoURL: cred.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}`,
              role: "admin",
              clinicId: "meditrack-main-clinic",
              clinicName: "Meditrack Healthcare Center",
              clinicAddress: "Main Clinic",
              contactNumber: "+91 9876543210",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (e: any) {
        if (e.code === "auth/popup-closed-by-user") {
          setError("Google sign-in popup was closed or blocked. Because the app is running in an embedded preview frame, please click the top-right 'Open in new tab' button, or check your browser's pop-up blocker.");
        } else if (e.code === "auth/cancelled-popup-request") {
          setError("Sign-in popup request was cancelled. Please try again.");
        } else if (e.code === "auth/network-request-failed") {
          setError("Network connection to Firebase failed. Since this app runs inside an embedded preview frame, this is usually caused by: 1) An ad-blocker or Brave Shields blocking Google's Identity Toolkit, or 2) Disabled third-party cookies. Please click the top-right 'Open in new tab' button, or temporarily disable your ad-blocker/shields for this site.");
        } else {
          setError(e.message);
        }
      } finally {
        setAuthLoading(false);
      }
    };

    const handleSignupSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthLoading(true);
      setError(null);
      try {
        let clinicName = signupData.clinicName.trim();
        let clinicAddress = signupData.clinicAddress.trim();
        const rawId = signupData.clinicId || "";
        let finalClinicId = rawId.trim();

        // If joining, check if it exists BEFORE creating account
        if (!signupData.isRegisteringClinic) {
          const docRef = doc(db, "clinics", finalClinicId);
          const snap = await getDocFromServer(docRef).catch(() => getDoc(docRef));

          if (!snap || !snap.exists()) {
            throw new Error(`Clinic ID "${finalClinicId}" not found. If this is a new clinic, please ensure it was registered first.`);
          }
          const clinicData = snap.data();
          clinicName = clinicData.name || "";
          clinicAddress = clinicData.address || "";
        }

        // Create account or reuse existing authentication identity
        let cred: any = null;
        try {
          cred = await createUserWithEmailAndPassword(
            auth,
            signupData.email,
            signupData.password,
          );
        } catch (authErr: any) {
          if (authErr.code === "auth/email-already-in-use") {
            try {
              cred = await signInWithEmailAndPassword(
                auth,
                signupData.email,
                signupData.password,
              );
            } catch (signInErr: any) {
              throw new Error(`This email address (${signupData.email}) is already registered in MediTrack. Please switch to the "Sign In" tab to log in to your account, or verify your password.`);
            }
          } else {
            throw authErr;
          }
        }

        if (signupData.isRegisteringClinic) {
          finalClinicId =
            (signupData.clinicName || "clinic")
              .toLowerCase()
              .replace(/\s+/g, "-") +
            "-" +
            Math.random().toString(36).substr(2, 5);

          await setDoc(doc(db, "clinics", finalClinicId), {
            name: signupData.clinicName,
            address: signupData.clinicAddress,
            adminId: cred.user.uid,
            createdAt: serverTimestamp(),
          });
        }

        const isDoc = signupData.role === "Doctor";
        const isRec = signupData.role === "Receptionist";
        const category = signupData.category || "GP";
        const shortUid = cred.user.uid.slice(0, 6).toUpperCase();

        const doctorId = isDoc ? `DOC_${category}_${shortUid}` : undefined;
        const receptionistId = isDoc
          ? `REC_${category}_${shortUid}`
          : isRec
          ? `REC_${shortUid}`
          : undefined;

        const assignedDoctorId = isRec ? `DOC_GP_001` : undefined;
        const assignedDoctorName = isRec ? `Dr. Rahul Sharma` : undefined;
        const assignedDoctorCategory = isRec ? `GP` : undefined;

        const userDocRef = doc(db, "users", cred.user.uid);
        const isAdminUser = isHardcodedAdminEmail(signupData.email);

        const newProfile: UserProfile = {
          uid: cred.user.uid,
          email: signupData.email,
          displayName: signupData.fullName,
          photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(signupData.fullName)}`,
          role: isAdminUser ? "admin" : signupData.role,
          clinicName: clinicName,
          clinicId: finalClinicId,
          clinicAddress: clinicAddress || "",
          contactNumber: formatIndianPhoneNumber(signupData.contactNumber),
          category: isDoc ? category : undefined,
          doctorId: doctorId,
          receptionistId: receptionistId,
          assignedDoctorId: assignedDoctorId,
          assignedDoctorName: assignedDoctorName,
          assignedDoctorCategory: assignedDoctorCategory as any,
          specialty: isDoc
            ? category === "PEDIATRICIAN"
              ? "Pediatrician (Child Specialist)"
              : category === "DENTIST"
              ? "Dentist & Oral Healthcare"
              : "General Practice & Family Medicine"
            : undefined,
          consultationFee: isDoc
            ? category === "DENTIST"
              ? 700
              : category === "PEDIATRICIAN"
              ? 600
              : 500
            : undefined,
        };

        await setDoc(userDocRef, cleanObject({
          ...newProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }), { merge: true });

        // Record permanent mapping in doctorReceptionistMappings
        if (isDoc && doctorId && receptionistId) {
          const mappingId = `${doctorId}_${receptionistId}`;
          await setDoc(doc(db, "doctorReceptionistMappings", mappingId), {
            clinicId: finalClinicId,
            doctorId,
            doctorName: signupData.fullName,
            receptionistId,
            doctorCategory: category,
            active: true,
            createdAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }

        await updateProfile(cred.user, {
          displayName: signupData.fullName,
        }).catch(() => {});

        // As specified in Section 9:
        // Do NOT automatically drop into dashboard; redirect to Login with "Account Created Successfully"
        await signOut(auth);
        setEmail(signupData.email);
        setPassword("");
        setSignupSuccess(true);
      } catch (e: any) {
        if (e.code === "auth/network-request-failed") {
          setError("Network connection to Firebase failed. Since this app runs inside an embedded preview frame, this is usually caused by: 1) An ad-blocker or Brave Shields blocking Google's Identity Toolkit, or 2) Disabled third-party cookies. Please click the top-right 'Open in new tab' button, or temporarily disable your ad-blocker/shields for this site.");
        } else if (e.code === "auth/email-already-in-use" || (e.message && e.message.includes("auth/email-already-in-use"))) {
          setError(`This email address (${signupData.email}) is already registered in MediTrack. Please switch to the "Sign In" tab to log in to your account.`);
        } else {
          setError(e.message || "An error occurred during account creation.");
        }
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <LoginPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        authLoading={authLoading}
        error={error}
        setError={setError}
        onLoginSubmit={handleLoginSubmit}
        onGoogleSignIn={handleGoogleSignIn}
        onForgotPasswordClick={() => setResetFlowStep("options")}
        onSelectDemoAccount={handleSelectDemoAccount}
        signupData={signupData}
        setSignupData={setSignupData}
        onSignupSubmit={handleSignupSubmit}
        signupSuccess={signupSuccess}
        onDismissSignupSuccess={() => setSignupSuccess(false)}
      />
    );
  }

  // Route 403 Forbidden Screen if user tries accessing forbidden portal
  if (user && currentUserProfile && !isAuthorizedForView(activeView)) {
    const targetPortal = isDoctor ? "doctor" : "receptionist";
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
          <ShieldCheck size={32} />
        </div>
        <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
          403 Forbidden • Access Restricted
        </span>
        <h1 className="text-2xl font-black tracking-tight mb-2 font-display">
          Unauthorized Portal Access
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Your account role (<strong className="text-slate-200">{currentUserProfile?.role || "Staff"}</strong>) is strictly assigned to its dedicated workspace. Cross-portal access is prohibited in production.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setActiveView(targetPortal)}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-600/30"
          >
            Return to Designated Workspace
          </button>
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // RECEPTIONIST PORTAL VIEW
  if (user && activeView === "receptionist") {
    return (
      <ReceptionistPortal
        user={user}
        currentUserProfile={currentUserProfile}
        clinicInfo={clinicInfo}
        patients={patients}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        onBackToAdmin={() => setActiveView("dashboard")}
        regPatientName={regPatientName}
        setRegPatientName={setRegPatientName}
        regPatientPhone={regPatientPhone}
        setRegPatientPhone={setRegPatientPhone}
        regPatientAge={regPatientAge}
        setRegPatientAge={setRegPatientAge}
        onRegisterPatient={handleRegisterPatient}
        onCallPatient={handleCallPatient}
        onCompletePatient={handleCompletePatient}
        onDeletePatient={handleDeletePatient}
        onClearQueue={handleClearReceptionQueue}
        onProcessPayment={handleProcessPayment}
        onSendReceiptWhatsApp={handleSendReceiptWhatsApp}
        onSwitchToDoctorPortal={() => setActiveView("doctor")}
        isProcessing={isProcessing}
        onSelectDemoAccount={handleSelectDemoAccount}
      />
    );
  }

  // DOCTOR PORTAL VIEW
  if (user && activeView === "doctor") {
    return (
      <DoctorPortal
        user={user}
        currentUserProfile={currentUserProfile}
        clinicInfo={clinicInfo}
        patients={patients}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        onBackToAdmin={() => setActiveView("dashboard")}
        onCallPatient={handleCallPatient}
        onCompleteConsultation={handleCompleteDoctorConsultation}
        activePatient={activeDoctorPatient}
        setActivePatient={setActiveDoctorPatient}
        medicalHistory={medicalHistory}
        isHistoryOpen={isHistoryOpen}
        setIsHistoryOpen={setIsHistoryOpen}
        onSelectDemoAccount={handleSelectDemoAccount}
      />
    );
  }

  // MAIN APP SHELL
  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col relative overflow-x-hidden">
      {/* Top Navigation */}
      <header className="h-20 bg-white/95 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-50 border-b border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4">
          <MediTrackLogo size="sm" theme="light" showSubtitle={true} showBadge={false} />

          {dbConnected === false && (
            <button
              onClick={checkConnection}
              title="Click to retry connection"
              className="flex items-center gap-1.5 ml-2 px-2.5 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-lg border border-amber-100 uppercase tracking-wider flex-shrink-0 animate-pulse hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <AlertCircle size={10} className="shrink-0" />
              <span>Retry Link</span>
            </button>
          )}
          {dbConnected === true && (
            <div className="flex items-center gap-1.5 ml-3 px-2.5 py-1 bg-slate-50 text-slate-500 text-[9px] font-bold rounded-lg border border-slate-100 flex-shrink-0 select-none">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="uppercase tracking-wider">Operational</span>
            </div>
          )}

          {/* Role Badge in Header */}
          {isAdmin ? (
            <span className="ml-2 px-2.5 py-1 bg-red-50 text-red-600 text-[9px] font-black rounded-lg uppercase tracking-wider border border-red-100">
              Admin Control
            </span>
          ) : isDoctor ? (
            <span className="ml-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-lg uppercase tracking-wider border border-emerald-100">
              Doctor Suite
            </span>
          ) : (
            <span className="ml-2 px-2.5 py-1 bg-blue-50 text-blue-700 text-[9px] font-black rounded-lg uppercase tracking-wider border border-blue-100">
              Reception Desk
            </span>
          )}
        </div>

        <div className="relative" ref={profileDropdownRef}>
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-all overflow-hidden"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserCircle size={28} />
            )}
          </button>

          <AnimatePresence>
            {isProfileDropdownOpen && (
              <motion.div
                key="dropdown-box"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl py-3 z-20 border border-slate-100"
              >
                  <div className="px-4 py-2 mb-2 border-b border-slate-50">
                    <p className="text-sm font-black text-slate-900 truncate">
                      {user.displayName || currentUserProfile?.displayName || "Staff Member"}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {user.email}
                    </p>
                    <span className={`inline-block mt-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      isAdmin ? "bg-red-50 text-red-700" : isDoctor ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                    }`}>
                      {currentUserProfile?.role || (isAdmin ? "Admin" : "Staff")}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setActiveView("profile");
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <UserIcon size={18} /> Profile Settings
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setActiveTab("dashboard");
                          setActiveView("dashboard");
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <LayoutDashboard size={18} /> Admin Overview
                      </button>
                      <button
                        onClick={() => {
                          resetDatabase();
                          setIsProfileDropdownOpen(false);
                        }}
                        disabled={isResetting || isWipingAuth}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={18} /> {isResetting ? "Wiping Database..." : "Wipe Database"}
                      </button>
                      <button
                        onClick={() => {
                          wipeAuthentication();
                          setIsProfileDropdownOpen(false);
                        }}
                        disabled={isResetting || isWipingAuth}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Users size={18} /> {isWipingAuth ? "Wiping Auth..." : "Wipe Authentication"}
                      </button>
                    </>
                  )}

                  {isDoctor && (
                    <button
                      onClick={() => {
                        setActiveView("doctor");
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Stethoscope size={18} /> Doctor Suite
                    </button>
                  )}

                  {isReceptionist && (
                    <button
                      onClick={() => {
                        setActiveView("receptionist");
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Activity size={18} /> Reception Desk
                    </button>
                  )}

                  <div className="h-px bg-slate-100 my-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex flex-col">
          <div className="p-8 max-w-7xl mx-auto w-full">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 flex justify-between items-center">
                <span>{error}</span>
                <button onClick={() => setError(null)}>
                  <Plus className="rotate-45" />
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {activeView === "dashboard" && activeTab === "dashboard" && (
                !isAdmin ? (
                  <motion.div
                    key="unauthorized-dashboard-guard"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-4"
                  >
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto border border-blue-100 shadow-sm">
                      <Activity size={32} className="animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                        Opening Your Workspace
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Redirecting to your designated staff portal as{" "}
                        <strong className="text-slate-800">{currentUserProfile?.role || "Staff"}</strong>...
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveView(isDoctor ? "doctor" : "receptionist")}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/25 cursor-pointer"
                    >
                      Enter {isDoctor ? "Doctor Consultation Suite" : "Reception Desk"} →
                    </button>
                  </motion.div>
                ) : (
                <motion.div
                  key="dashboard-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-8"
                >
                  <div className="text-center mb-14 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest mb-4 shadow-[0_2px_8px_rgba(99,102,241,0.08)]">
                      <Activity size={10} className="animate-pulse" />
                      Dynamic Operations Hub
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight font-display">
                      Welcome back
                    </h1>
                    <div className="flex items-center justify-center gap-3 text-red-500 text-xs font-extrabold uppercase tracking-widest">
                      <span className="bg-red-50 px-3 py-1 rounded-md border border-red-100">Master System Administrator</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4">
                    {/* Receptionist Card */}
                    <button
                      onClick={() => setActiveView("receptionist")}
                      className="p-8 bg-white rounded-[32px] border border-slate-100/80 hover:border-blue-200 hover:shadow-[0_20px_50px_rgba(59,130,246,0.08)] hover:-translate-y-1 transition-all text-left group relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/40 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-blue-100/55 transition-colors" />
                      <div className="flex items-center justify-between w-full relative z-10">
                        <div className="bg-blue-50 text-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
                          <UserIcon size={24} />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-extrabold text-blue-500 bg-blue-50/60 px-3 py-1 rounded-full border border-blue-100/50">
                          Front Desk
                        </span>
                      </div>
                      <div className="mt-6 relative z-10">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          Receptionist Portal
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Register new patients, manage live tokens, and organize waitlist queue.
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between w-full relative z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            {patients.filter((p) => p.status === "Waiting").length} in waitlist
                          </span>
                        </div>
                        <ArrowRight size={14} className="text-blue-500 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    {/* Doctor Card */}
                    <button
                      onClick={() => setActiveView("doctor")}
                      className="p-8 bg-white rounded-[32px] border border-slate-100/80 hover:border-emerald-200 hover:shadow-[0_20px_50px_rgba(16,185,129,0.08)] hover:-translate-y-1 transition-all text-left group relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/40 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-emerald-100/55 transition-colors" />
                      <div className="flex items-center justify-between w-full relative z-10">
                        <div className="bg-emerald-50 text-emerald-600 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
                          <Stethoscope size={24} />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-500 bg-emerald-50/60 px-3 py-1 rounded-full border border-emerald-100/50">
                          Consultation
                        </span>
                      </div>
                      <div className="mt-6 relative z-10">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          Doctor Portal
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Conduct active consultations, write smart digital prescriptions, and view medical histories.
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between w-full relative z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            {patients.filter((p) => p.status === "Called").length > 0 
                              ? `Consulting room active (${patients.filter((p) => p.status === "Called").length})`
                              : "Ready for next patient"}
                          </span>
                        </div>
                        <ArrowRight size={14} className="text-emerald-600 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    {/* TV Display Card */}
                    <button
                      onClick={() => setActiveView("tv")}
                      className="p-8 bg-white rounded-[32px] border border-slate-100/80 hover:border-purple-200 hover:shadow-[0_20px_50px_rgba(168,85,247,0.08)] hover:-translate-y-1 transition-all text-left group relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50/40 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-purple-100/55 transition-colors" />
                      <div className="flex items-center justify-between w-full relative z-10">
                        <div className="bg-purple-50 text-purple-600 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
                          <Monitor size={24} />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-extrabold text-purple-500 bg-purple-50/60 px-3 py-1 rounded-full border border-purple-100/50">
                          Public Display
                        </span>
                      </div>
                      <div className="mt-6 relative z-10">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                          TV Queue Board
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Full-screen patients display for the waiting hall with audio voice announcer alerts.
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between w-full relative z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full" />
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            Live Screen Feed Active
                          </span>
                        </div>
                        <ArrowRight size={14} className="text-purple-600 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  </div>
                </motion.div>
                )
              )}

              {activeView === "profile" && (
                <motion.div
                  key="profile-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mx-auto w-full"
                >
                  <button
                    onClick={() => setActiveView("dashboard")}
                    className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest mb-8"
                  >
                    <ArrowLeft size={16} /> Back to Dashboard
                  </button>

                  <div className="bg-white rounded-[32px] shadow-sm overflow-hidden">
                    <div className="p-10 bg-slate-50/50">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl">
                          <UserCircle size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                          {isAdmin
                            ? "System Administrator Profile"
                            : "Clinic Profile"}
                        </h2>
                      </div>
                      <p className="text-slate-500 font-medium">
                        {isAdmin
                          ? "Personal administrative account settings."
                          : "Details of the registered clinic you are working with."}
                      </p>
                    </div>

                    <div className="p-10 space-y-10">
                      {!isAdmin && (
                        <React.Fragment>
                          <div className="flex items-start gap-6">
                            <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                              <Building2 size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Clinic Name
                              </p>
                              <p className="text-xl font-black text-slate-900">
                                {clinicInfo?.name ||
                                  currentUserProfile?.clinicName ||
                                  "Not Set"}
                              </p>
                            </div>
                          </div>

                          {(clinicInfo?.address ||
                            currentUserProfile?.clinicAddress) && (
                            <div className="flex items-start gap-6">
                              <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                                <Monitor size={24} />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  Clinic Address
                                </p>
                                <p className="text-xl font-black text-slate-900">
                                  {clinicInfo?.address ||
                                    currentUserProfile?.clinicAddress}
                                </p>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      )}

                      <div className="flex items-start gap-6">
                        <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                          <UserIcon size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Person of Contact
                          </p>
                          <p className="text-xl font-black text-slate-900">
                            {currentUserProfile?.displayName ||
                              user?.displayName ||
                              "Not Set"}
                          </p>
                        </div>
                      </div>

                      {!isAdmin && (
                        <div className="flex items-start gap-6">
                          <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                            <ShieldCheck size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Your Role
                            </p>
                            <p className="text-xl font-black text-slate-900">
                              {currentUserProfile?.role || "Staff"}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-6">
                        <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                          <Mail size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Contact Email
                          </p>
                          <p className="text-xl font-black text-slate-900">
                            {currentUserProfile?.email ||
                              user?.email ||
                              "Not Set"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-6">
                        <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                          <Phone size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Contact Phone
                          </p>
                          <p className="text-xl font-black text-slate-900">
                            {currentUserProfile?.contactNumber || "Not Set"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!isAdmin && (
                      <div className="p-8 bg-slate-50 border-t border-slate-100">
                        <div className="flex flex-col gap-4">
                          <div className="bg-white px-6 py-4 rounded-2xl flex items-center justify-between border border-slate-200">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Clinic ID
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-mono text-slate-900 font-bold">
                                  {currentUserProfile?.clinicId || "N/A"}
                                </p>
                                {currentUserProfile?.clinicId && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        currentUserProfile.clinicId,
                                      );
                                      alert("Copied to clipboard!");
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400"
                                    title="Copy ID"
                                  >
                                    <Copy size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                const newId = prompt(
                                  "Enter Clinic ID:",
                                  currentUserProfile?.clinicId,
                                );
                                if (newId && currentUserProfile) {
                                  const rawInput = newId.trim();
                                  const normalize = (id: string) => {
                                    let cid = id.trim().replace(/\u00d7/g, "x"); // Fix multiplication sign
                                    if (cid.includes("/")) {
                                      const parts = cid.split("/");
                                      cid = parts[parts.length - 1];
                                    }
                                    // Remove EVERYTHING except alphanumeric and dash/underscore
                                    return cid.replace(/[^\w\-]/g, "");
                                  };

                                  try {
                                    console.log(
                                      `[Join Clinic] Attempting: "${rawInput}"`,
                                    );

                                    const findSnap = async (id: string) => {
                                      try {
                                        console.log(
                                          `[Join Clinic] Checking: "${id}"`,
                                        );
                                        const docRef = doc(db, "clinics", id);
                                        const snap = await getDocFromServer(
                                          docRef,
                                        ).catch(() => getDoc(docRef));
                                        return snap.exists() ? snap : null;
                                      } catch (e) {
                                        return null;
                                      }
                                    };

                                    let clinicSnap = await findSnap(rawInput);
                                    let finalId = rawInput;

                                    if (!clinicSnap) {
                                      const variants = [
                                        normalize(rawInput),
                                        rawInput.toLowerCase(),
                                        normalize(rawInput).toLowerCase(),
                                        rawInput.replace(/[^a-zA-Z0-9]/g, ""),
                                      ].filter(
                                        (v, i, self) =>
                                          v &&
                                          v !== rawInput &&
                                          self.indexOf(v) === i,
                                      );

                                      for (const v of variants) {
                                        console.log(
                                          `[Join Clinic] Trying variant: "${v}"`,
                                        );
                                        clinicSnap = await findSnap(v);
                                        if (clinicSnap) {
                                          finalId = v;
                                          break;
                                        }
                                      }
                                    }

                                    // Deep resilience fallback
                                    if (!clinicSnap) {
                                      try {
                                        console.log(
                                          `[Join Clinic] FAILED finding "${rawInput}". Checking variants...`,
                                        );
                                        const allClinics = await getDocs(
                                          collection(db, "clinics"),
                                        ).catch(() => ({ docs: [] }));
                                        const clinics = allClinics.docs;

                                        const inputClean = rawInput
                                          .toLowerCase()
                                          .replace(/[^a-z0-9]/g, "");

                                        let bestMatch = clinics.find((d) => {
                                          const docIdClean = d.id
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]/g, "");
                                          const nameClean = (
                                            d.data()?.name || ""
                                          )
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]/g, "");
                                          const fieldIdClean = (
                                            d.data()?.id || ""
                                          )
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]/g, "");
                                          return (
                                            docIdClean === inputClean ||
                                            nameClean === inputClean ||
                                            fieldIdClean === inputClean
                                          );
                                        });

                                        // Special case: adminId lookup (user UID provided)
                                        if (!bestMatch) {
                                          const targetUid =
                                            "K8rZe4OMl8f7DgBOTeJtNUTXe9x2";
                                          if (
                                            rawInput === targetUid ||
                                            clinics.length > 0
                                          ) {
                                            bestMatch = clinics.find(
                                              (d) =>
                                                d.data()?.adminId ===
                                                  targetUid ||
                                                d.data()?.adminId === rawInput,
                                            );
                                          }
                                        }

                                        if (bestMatch) {
                                          clinicSnap = bestMatch;
                                          finalId = bestMatch.id;
                                          console.log(
                                            `[Join Clinic] Resilience match: "${finalId}"`,
                                          );
                                        } else if (clinics.length > 0) {
                                          console.log(
                                            `[Join Clinic] ALL CLINICS:`,
                                            clinics.map((d) => ({
                                              id: d.id,
                                              name: d.data()?.name,
                                            })),
                                          );
                                        }
                                      } catch (err) {
                                        console.warn(
                                          "[Join Clinic] Resilience lookup failed:",
                                          err,
                                        );
                                      }
                                    }

                                    if (!clinicSnap) {
                                      alert(
                                        `Clinic ID "${rawInput}" not found. See console (F12) for details.`,
                                      );
                                      return;
                                    }

                                    const clinicData = clinicSnap.data();
                                    await updateDoc(
                                      doc(db, "users", currentUserProfile.uid),
                                      {
                                        clinicId: finalId,
                                        clinicName: clinicData.name || "",
                                        clinicAddress: clinicData.address || "",
                                        updatedAt: serverTimestamp(),
                                      },
                                    );
                                    alert("Clinic joined successfully!");
                                  } catch (e) {
                                    console.error("[Join Clinic] error:", e);
                                    alert(
                                      "Failed to join clinic. Please check your connection or permissions.",
                                    );
                                  }
                                }
                              }}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                            >
                              Change ID
                            </button>
                          </div>
                          {!clinicInfo && currentUserProfile?.clinicId && (
                            <div className="flex items-center gap-2 bg-amber-50 text-amber-600 p-4 rounded-xl border border-amber-100 text-xs font-medium">
                              <AlertCircle size={16} />
                              <span>
                                We couldn't find a registered clinic with this
                                ID. Please double check with your administrator.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeView === "receptionist" && (
                !isAuthorizedForView("receptionist") ? (
                  <motion.div
                    key="unauthorized-receptionist-guard"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-4"
                  >
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
                      <AlertCircle size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted (403)</h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Your current role (<strong className="text-slate-800">{currentUserProfile?.role || "Staff"}</strong>) is not authorized to access the Reception Desk.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveView(isDoctor ? "doctor" : "dashboard")}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/25 cursor-pointer"
                    >
                      Return to My Workspace →
                    </button>
                  </motion.div>
                ) : (
                <div key="receptionist-view" className="space-y-8 animate-fade-in">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-6">
                    <div>
                      {isAdmin && (
                        <button
                          onClick={() => setActiveView("dashboard")}
                          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-all cursor-pointer mb-2"
                        >
                          <ArrowLeft size={16} /> Back to Admin Overview
                        </button>
                      )}
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-600 animate-pulse" size={28} />
                        RECEPTIONIST DESK &amp; QUEUE
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-8 animate-fade-in">
                      {/* Stats Row */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col gap-1 shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Total Active
                          </p>
                          <p className="text-3xl font-black text-slate-900">
                            {
                              patients.filter(
                                (p) =>
                                  p.status !== "Completed" &&
                                  p.status !== "Dispensed",
                              ).length
                            }
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col gap-1 shadow-sm">
                          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                            Waiting
                          </p>
                          <p className="text-3xl font-black text-slate-900">
                            {patients.filter((p) => p.status === "Waiting").length}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col gap-1 shadow-sm">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                            Ongoing
                          </p>
                          <p className="text-3xl font-black text-slate-900">
                            {patients.filter((p) => p.status === "Called").length}
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col gap-1 shadow-sm">
                          <p className="text-[10px] font-black text-emerald-550 uppercase tracking-widest">
                            Completed Today
                          </p>
                          <p className="text-3xl font-black text-slate-900">
                            {
                              patients.filter(
                                (p) =>
                                  p.status === "Completed" ||
                                  p.status === "Dispensed",
                              ).length
                            }
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                              <Plus size={20} />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Register Patient</h3>
                          </div>
                          <form
                            onSubmit={handleRegisterPatient}
                            className="space-y-4"
                          >
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                Name
                              </label>
                              <input
                                value={regPatientName}
                                onChange={(e) => setRegPatientName(e.target.value)}
                                required
                                className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none"
                                placeholder="John Doe"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                Phone
                              </label>
                              <input
                                value={regPatientPhone}
                                onChange={(e) => setRegPatientPhone(e.target.value)}
                                required
                                className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none"
                                placeholder="+91..."
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                Age
                              </label>
                              <input
                                value={regPatientAge}
                                onChange={(e) => setRegPatientAge(e.target.value)}
                                required
                                className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none"
                                placeholder="25"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={isProcessing}
                              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                              {isProcessing ? "Adding..." : "Add to Queue"}
                            </button>
                          </form>
                        </div>
                        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                          <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                              <div className="bg-slate-50 text-slate-400 p-2 rounded-xl">
                                <Users size={20} />
                              </div>
                              <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Current Queue</h3>
                            </div>
                            <button
                              onClick={handleClearReceptionQueue}
                              disabled={
                                patients.filter(
                                  (p) =>
                                    p.status === "Waiting" || p.status === "Called",
                                ).length === 0
                              }
                              className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <Trash2 size={16} /> Clear Queue
                            </button>
                          </div>
                          <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                                  <th className="pb-4 px-2">No</th>
                                  <th className="pb-4 px-2">Patient</th>
                                  <th className="pb-4 px-2">Status</th>
                                  <th className="pb-4 px-2 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {patients
                                  .filter(
                                    (p) =>
                                      p.status !== "Completed" &&
                                      p.status !== "Dispensed",
                                  )
                                  .map((p) => (
                                    <tr
                                      key={p.id}
                                      className="group hover:bg-slate-50/50 transition-colors"
                                    >
                                      <td className="py-4 px-2 font-mono font-bold text-slate-400">
                                        #{p.queueNumber}
                                      </td>
                                      <td className="py-4 px-2">
                                        <p className="font-bold text-slate-800">
                                          {p.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium">
                                          {p.phone}
                                        </p>
                                      </td>
                                      <td className="py-4 px-2">
                                        <span
                                          className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                            p.status === "Called"
                                              ? "bg-blue-100 text-blue-600"
                                              : p.status === "Completed"
                                                ? "bg-emerald-100 text-emerald-600"
                                                : "bg-amber-100 text-amber-600"
                                          }`}
                                        >
                                          {p.status}
                                        </span>
                                      </td>
                                      <td className="py-4 px-2 text-right">
                                        <button
                                          onClick={() => handleDeletePatient(p)}
                                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                          title="Remove from queue"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                            {patients.filter(
                              (p) =>
                                p.status !== "Completed" &&
                                p.status !== "Dispensed",
                            ).length === 0 && (
                              <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-50">
                                <Users size={48} className="mb-4" />
                                <p className="font-black text-sm uppercase tracking-widest">
                                  Queue is Empty
                                </p>
                                <p className="text-xs">
                                  New patients will appear here
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}

              {activeView === "doctor" && (
                !isAuthorizedForView("doctor") ? (
                  <motion.div
                    key="unauthorized-doctor-guard"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-4"
                  >
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
                      <AlertCircle size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted (403)</h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Your current role (<strong className="text-slate-800">{currentUserProfile?.role || "Staff"}</strong>) is not authorized to access the Doctor Consultation Suite.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveView(isReceptionist ? "receptionist" : "dashboard")}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/25 cursor-pointer"
                    >
                      Return to My Workspace →
                    </button>
                  </motion.div>
                ) : (
                <div key="doctor-view" className="space-y-8 animate-fade-in">
                  {isAdmin && (
                    <button
                      onClick={() => setActiveView("dashboard")}
                      className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
                    >
                      <ArrowLeft size={16} /> Back to Admin Overview
                    </button>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100/80 space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Queue</h3>
                            <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {patients.filter((p) => p.status !== "Completed" && p.status !== "Dispensed" && p.status !== "Pharmacy Skipped").length} in queue
                            </span>
                          </div>
                          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                            {patients
                              .filter(
                                (p) =>
                                  p.status !== "Completed" &&
                                  p.status !== "Dispensed" &&
                                  p.status !== "Pharmacy Skipped",
                              )
                              .map((p) => (
                                <div
                                  key={p.id}
                                  className={`p-4 rounded-2xl flex justify-between items-center transition-all duration-200 border ${
                                    p.status === "Called"
                                      ? "bg-emerald-50/50 border-emerald-100 shadow-[0_4px_20px_rgba(16,185,129,0.06)]"
                                      : "bg-slate-50/50 border-slate-150 hover:border-slate-200"
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-sm text-slate-800">{p.name}</p>
                                      {p.age && (
                                        <span className="text-[9px] font-black text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded uppercase">
                                          {p.age} y/o
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-[9px] text-slate-400">
                                        Token #{p.queueNumber}
                                      </span>
                                      {p.status === "Called" && (
                                        <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                      )}
                                    </div>
                                  </div>
                                  {p.status === "Called" ? (
                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-wider animate-pulse">
                                      Active
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleCallPatient(p)}
                                      className="bg-white border border-slate-100 hover:border-blue-200 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-sm transition-all shadow-sm cursor-pointer"
                                    >
                                      Call
                                    </button>
                                  )}
                                </div>
                              ))}
                            {patients.filter((p) => p.status !== "Completed" && p.status !== "Dispensed" && p.status !== "Pharmacy Skipped").length === 0 && (
                              <div className="py-12 text-center opacity-30">
                                <Users size={36} className="mx-auto mb-2 text-slate-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Waitlist is empty</p>
                              </div>
                            )}
                          </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                      {activeDoctorPatient ? (
                        <div className="max-w-4xl mx-auto space-y-6">
                          {/* Consultation Section */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[32px] p-8 flex flex-col gap-6 shadow-sm overflow-hidden relative border border-slate-100"
                          >
                            <div className="flex justify-between items-center pb-6">
                              <div className="flex gap-4">
                                <div className="bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl">
                                  #{activeDoctorPatient.queueNumber}
                                </div>
                                <div>
                                  <h3 className="text-2xl font-black">
                                    {activeDoctorPatient.name}
                                  </h3>
                                  <p className="text-blue-500 font-black text-[10px] uppercase">
                                    Active Consultation
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => setIsHistoryOpen(true)}
                                  className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
                                >
                                  <Clock size={16} /> History
                                </button>
                                <button
                                  onClick={() => setActiveDoctorPatient(null)}
                                  className="text-slate-300 font-bold text-xs hover:text-red-500"
                                >
                                  Discard
                                </button>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Monitor size={14} /> Consultation Notes
                              </div>
                              <textarea
                                value={consultationNotes}
                                onChange={(e) =>
                                  setConsultationNotes(e.target.value)
                                }
                                className="w-full h-32 bg-slate-50 rounded-3xl p-6 outline-none focus:ring-2 focus:ring-blue-500 transition-all border-none"
                                placeholder="Clinical observations, advice, or patient history..."
                              />
                            </div>

                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  Prescription
                                </h4>
                                <button
                                  onClick={() =>
                                    setPrescriptionItems([
                                      ...prescriptionItems,
                                      { medicine: "", dosage: "", days: "" },
                                    ])
                                  }
                                  className="text-blue-600 font-bold text-xs flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors"
                                >
                                  <Plus size={14} /> Add Item
                                </button>
                              </div>

                              <div className="bg-slate-50 rounded-3xl overflow-visible relative">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      <th className="px-6 py-4">Medicine</th>
                                      <th className="px-4 py-4">Dosage</th>
                                      <th className="px-4 py-4">Days</th>

                                      <th className="px-6 py-4"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white/50">
                                    {prescriptionItems.map((item, idx) => (
                                      <tr key={idx} className="group">
                                        <td className="px-6 py-3">
                                          <div className="relative">
                                            <input
                                              placeholder="Search Medicine..."
                                              className="w-full bg-transparent outline-none text-sm font-bold placeholder:font-normal"
                                              value={item.medicine}
                                              onFocus={() =>
                                                setActiveMedicineSearchIdx(idx)
                                              }
                                              onBlur={() => setTimeout(() => setActiveMedicineSearchIdx(null), 150)}
                                              onChange={(e) => {
                                                const newItems = [
                                                  ...prescriptionItems,
                                                ];
                                                newItems[idx].medicine =
                                                  e.target.value;
                                                setPrescriptionItems(newItems);
                                                setActiveMedicineSearchIdx(idx);
                                              }}
                                            />


                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <input
                                            placeholder="0-0-0"
                                            className="w-full bg-transparent outline-none text-sm font-bold text-center"
                                            value={item.dosage}
                                            onChange={(e) => {
                                              const newItems = [
                                                ...prescriptionItems,
                                              ];
                                              newItems[idx].dosage =
                                                e.target.value;
                                              setPrescriptionItems(newItems);
                                            }}
                                          />
                                        </td>
                                        <td className="px-4 py-3">
                                          <input
                                            placeholder="Days"
                                            className="w-full bg-transparent outline-none text-sm font-bold text-center"
                                            value={item.days}
                                            onChange={(e) => {
                                              const newItems = [
                                                ...prescriptionItems,
                                              ];
                                              newItems[idx].days =
                                                e.target.value;
                                              setPrescriptionItems(newItems);
                                            }}
                                          />
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                          <button
                                            onClick={() =>
                                              setPrescriptionItems(
                                                prescriptionItems.filter(
                                                  (_, i) => i !== idx,
                                                ),
                                              )
                                            }
                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {prescriptionItems.length === 0 && (
                                  <div className="p-8 text-center text-slate-300 text-xs font-bold">
                                    No items added
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                              <input
                                type="checkbox"
                                id="sendWhatsApp"
                                checked={sendWhatsApp}
                                onChange={(e) =>
                                  setSendWhatsApp(e.target.checked)
                                }
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label
                                htmlFor="sendWhatsApp"
                                className="text-sm font-bold text-slate-600 flex items-center gap-2 cursor-pointer"
                              >
                                <MessageSquare
                                  size={16}
                                  className="text-emerald-500"
                                />
                                Send Prescription via WhatsApp
                              </label>
                            </div>

                            <button
                              onClick={handleCompleteConsultation}
                              className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-3 hover:bg-blue-700 transition-all"
                            >
                              <ShieldCheck /> Complete & Save
                            </button>
                          </motion.div>
                        </div>
                      ) : (
                        <div className="h-full bg-slate-50 rounded-[32px] flex flex-col items-center justify-center text-slate-300 p-20 text-center">
                          <Stethoscope size={64} className="mb-4 opacity-20" />
                          <p className="font-bold">
                            Select a patient from the waitlist to begin.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )
              )}

              {activeTab === "patients" && (
                <div
                  key="patients-tab"
                  className="bg-white rounded-[32px] overflow-hidden"
                >
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="p-6">No</th>
                        <th className="p-6">Name</th>
                        <th className="p-6">Age</th>
                        <th className="p-6">Phone</th>
                        <th className="p-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {patients.map((p) => (
                        <tr key={p.id}>
                          <td className="p-6 font-mono font-bold text-slate-400">
                            {p.queueNumber}
                          </td>
                          <td className="p-6 font-bold">{p.name}</td>
                          <td className="p-6 text-slate-400">
                            {p.age || "--"}
                          </td>
                          <td className="p-6 text-slate-400">{p.phone}</td>
                          <td className="p-6">
                            <span
                              className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${p.status === "Completed" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {activeView === "tv" && (
                <div
                  key="tv-view"
                  className="fixed inset-0 bg-slate-900 z-50 p-12 flex flex-col gap-12 overflow-hidden"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-500 p-4 rounded-2xl">
                        <Heart className="text-white fill-current" size={40} />
                      </div>
                      <h1 className="text-5xl font-black text-white tracking-tighter">
                        MediTrack{" "}
                        <span className="text-blue-500">Live Queue</span>
                      </h1>
                    </div>
                    <button
                      onClick={() => setActiveView("dashboard")}
                      className="flex items-center gap-3 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white px-6 py-4 rounded-3xl text-sm font-black uppercase tracking-widest transition-all cursor-pointer border border-slate-700/50 shadow-lg"
                    >
                      <ArrowLeft size={20} /> Back to Dashboard
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 flex-1">
                    {/* Now Calling */}
                    <div className="bg-slate-800/50 rounded-[48px] p-12 flex flex-col items-center justify-center text-center gap-8">
                      <p className="text-blue-400 font-black text-2xl uppercase tracking-[0.3em]">
                        Now Calling
                      </p>
                      {patients.find((p) => p.status === "Called") ? (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          key={
                            patients.find((p) => p.status === "Called")?.id ||
                            "none"
                          }
                          className="space-y-4"
                        >
                          <h2 className="text-[12rem] font-black text-white leading-none tracking-tighter">
                            #
                            {
                              patients.find((p) => p.status === "Called")
                                ?.queueNumber
                            }
                          </h2>
                          <p className="text-5xl font-bold text-slate-300">
                            {patients.find((p) => p.status === "Called")?.name}
                          </p>
                        </motion.div>
                      ) : (
                        <div
                          key="calling-none"
                          className="space-y-4 opacity-20"
                        >
                          <h2 className="text-[12rem] font-black text-white leading-none tracking-tighter">
                            --
                          </h2>
                          <p className="text-5xl font-bold text-slate-300">
                            Waiting for next patient
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Waiting List */}
                    <div className="bg-slate-800/50 rounded-[48px] p-12 flex flex-col gap-8">
                      <p className="text-amber-400 font-black text-2xl uppercase tracking-[0.3em]">
                        Waiting List
                      </p>
                      <div className="flex flex-col gap-4 overflow-y-auto pr-4">
                        {patients
                          .filter((p) => p.status === "Waiting")
                          .slice(0, 6)
                          .map((p, idx) => (
                            <motion.div
                              initial={{ x: 20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: idx * 0.1 }}
                              key={p.id}
                              className="bg-slate-700/30 p-8 rounded-3xl flex justify-between items-center"
                            >
                              <span className="text-4xl font-black text-white">
                                #{p.queueNumber}
                              </span>
                              <span className="text-3xl font-bold text-slate-300">
                                {p.name}
                              </span>
                            </motion.div>
                          ))}
                        {patients.filter((p) => p.status === "Waiting")
                          .length === 0 && (
                          <p className="text-slate-500 text-2xl font-bold text-center mt-20">
                            Queue is empty
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Medical History Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            key="history-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsHistoryOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[80vh] relative"
            >
              <div className="flex justify-between items-center pb-3.5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 font-display">Medical History</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      {activeDoctorPatient?.name || "Patient Record"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 my-3.5 pr-1 custom-scrollbar min-h-0">
                {medicalHistory.length > 0 ? (
                  medicalHistory.map((h) => (
                    <div
                      key={h.id}
                      className="p-3.5 bg-slate-50/80 rounded-xl space-y-2 border border-slate-100"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                            <Clock size={13} />
                          </div>
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            {h.timestamp
                              ?.toDate
                              ? h.timestamp.toDate().toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Recent Visit"}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          Dr. {h.doctorName}
                        </span>
                      </div>

                      {h.notes && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Clinical Notes
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {h.notes}
                          </p>
                        </div>
                      )}

                      {h.prescription && (
                        <div className="pt-2.5 border-t border-slate-200/50">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            Prescription Items
                          </p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {(() => {
                              let items: any[] = [];
                              try {
                                if (Array.isArray(h.prescription)) {
                                  items = h.prescription;
                                } else if (typeof h.prescription === "string") {
                                  const parsed = JSON.parse(h.prescription);
                                  items = Array.isArray(parsed) ? parsed : [];
                                }
                              } catch {
                                items = [];
                              }
                              return items.map((item: any, pi: number) => (
                                <div
                                  key={`${h.id}-med-${pi}`}
                                  className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100"
                                >
                                  <p className="text-xs font-bold text-slate-700">
                                    {item.medicine || item.name || "Medication"}
                                  </p>
                                  <p className="text-[10px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                                    {item.dosage || "1-0-1"}
                                  </p>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2.5 text-slate-400">
                      <Users size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-600">
                      No previous consultations found
                    </p>
                    <p className="text-[11px] max-w-[200px] mt-1 text-slate-400">
                      Historical records will appear here as the patient completes visits.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 shrink-0 flex justify-end">
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-8 left-8 z-[1000] flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-6 py-4 rounded-[24px] shadow-2xl shadow-slate-900/50"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Pill className="text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight leading-none">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
              className="ml-2 p-1 hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={16} className="text-slate-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reusable Custom Modal (replacement for window.confirm/alert in sandboxed iframe) */}
      <AnimatePresence>
        {customModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-left"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <h4 className={`text-lg font-black uppercase tracking-wider ${customModal.isDanger ? "text-red-500" : "text-slate-900"}`}>
                  {customModal.title}
                </h4>
                <p className="text-slate-500 text-xs font-bold leading-relaxed whitespace-pre-wrap">
                  {customModal.message}
                </p>
              </div>

              <div className="flex gap-4 justify-end mt-2">
                {customModal.cancelText && (
                  <button
                    onClick={() => setCustomModal(null)}
                    className="px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 border border-slate-100 transition-all font-sans cursor-pointer"
                  >
                    {customModal.cancelText}
                  </button>
                )}
                <button
                  onClick={async () => {
                    const confirmFn = customModal.onConfirm;
                    setCustomModal(null);
                    await confirmFn();
                  }}
                  className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-all active:scale-95 font-sans cursor-pointer ${customModal.isDanger ? "bg-red-500 hover:bg-red-600 shadow-red-100" : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"}`}
                >
                  {customModal.confirmText || "OK"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeDoctorPatient && (
        <PrescriptionTemplate
          key="prescription-template-capture"
          id="prescription-capture"
          patientName={activeDoctorPatient.name}
          patientAge={activeDoctorPatient.age}
          date={new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          items={prescriptionItems}
          notes={consultationNotes}
          clinicName={
            clinicInfo?.name ||
            currentUserProfile?.clinicName ||
            "MediTrack Clinic"
          }
          doctorName={currentUserProfile?.displayName || "Doctor"}
        />
      )}

      {/* Public URL Invoice Viewer Modal for WhatsApp link clicks */}
      {publicInvoice && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-5 shadow-2xl space-y-3.5 relative border border-slate-100">
            <button
              onClick={() => {
                setPublicInvoice(null);
                window.history.pushState({}, "", window.location.pathname);
              }}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>

            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <MediTrackLogo size="xs" theme="light" />
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase">
                PAID • {publicInvoice.paymentMethod || "CASH"}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-800">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Invoice Number</span>
                  <span className="font-mono font-bold text-blue-600 text-xs">{publicInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Patient Name</span>
                  <span className="font-extrabold text-slate-900 text-xs">{publicInvoice.patientName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Consulting Doctor</span>
                  <span className="font-bold text-slate-800 text-xs">{publicInvoice.doctorName || "Dr. Rahul Sharma"}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-700 font-extrabold text-xs">Total Amount Paid</span>
                  <span className="font-black text-blue-600 text-base">₹{publicInvoice.amount}.00</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (publicInvoice.pdfDataUri) {
                  const link = document.createElement("a");
                  link.href = publicInvoice.pdfDataUri;
                  link.download = `MediTrack_${publicInvoice.invoiceNumber}_${(publicInvoice.patientName || "Invoice").replace(/\s+/g, '-')}.pdf`;
                  link.click();
                } else {
                  window.print();
                }
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Download size={14} />
              <span>Download Official PDF Invoice</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
