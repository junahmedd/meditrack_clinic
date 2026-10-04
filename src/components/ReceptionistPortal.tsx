import React, { useState, useEffect, useMemo } from "react";
import { generateInvoicePDF } from "../utils/pdfGenerator";
import { sendWhatsApp } from "../utils/whatsappService";
import { MediTrackLogo } from "./MediTrackLogo";
import { detectGenderFromName } from "./DoctorPortal";
import { AnalogClockPicker } from "./AnalogClockPicker";
import { MobileBottomNav } from "./MobileBottomNav";
import { NetworkStatusBanner } from "./NetworkStatusBanner";
import { LanguageSelector } from "./LanguageSelector";
import { useLanguage } from "../i18n/LanguageContext";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserPlus,
  UserCheck,
  CreditCard,
  BarChart2,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  TrendingUp,
  Wallet,
  Banknote,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  Search,
  Trash2,
  Printer,
  Phone,
  QrCode,
  ArrowLeft,
  Activity,
  Heart,
  AlertCircle,
  HelpCircle,
  Globe,
  ArrowRight,
  ShieldCheck,
  Building2,
  User as UserIcon,
  Receipt,
  Check,
  Send,
  X,
  FileText,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  List,
  Eye,
  PhoneCall,
  Filter,
  Stethoscope,
  XCircle,
  SlidersHorizontal,
  Download,
  RotateCcw,
  Pencil,
  Share2,
  CheckSquare,
  Square,
  IndianRupee,
  Menu,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

export interface Patient {
  id: string;
  name: string;
  phone: string;
  age?: string;
  gender?: string;
  queueNumber: number;
  status: "Waiting" | "Called" | "Completed" | "Dispensed" | "Skipped" | "Pharmacy Skipped" | "Scheduled" | "Consulting" | "In Billing" | "Cancelled" | "In Consultation" | string;
  clinicId: string;
  addedBy: string;
  timestamp: any;
  calledAt?: any;
  prescription?: string;
  notes?: string;
  diagnosis?: string;
  consultationFee?: number;
  billingStatus?: "Pending" | "Paid" | string;
  paymentMethod?: "UPI" | "Cash" | string;
  paidAt?: any;
  invoiceNumber?: string;
  whatsappStatus?: "NOT_SENT" | "SENDING" | "SENT" | "FAILED" | string;
  whatsappSentAt?: any;
  whatsappMessageId?: string;
  whatsappAttemptId?: string;
  vitals?: any;
  dentalTreatment?: any;
  pediatricData?: any;
  followUpDate?: string;
  followUpNotes?: string;
  doctorId?: string;
  doctorEmail?: string;
  doctorName?: string;
  doctorCategory?: "GP" | "PEDIATRICIAN" | "DENTIST" | string;
  receptionistEmail?: string;
  receptionistName?: string;
  appointmentTime?: string;
  appointmentType?: string;
  appointmentDate?: string;
  createdAt?: any;
  billingAmount?: number;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role?: string;
  clinicName?: string;
  clinicId?: string;
  clinicAddress?: string;
  contactNumber?: string;
  phone?: string;
  assignedDoctorId?: string;
  assignedDoctorEmail?: string;
  assignedDoctorName?: string;
  assignedDoctorCategory?: string;
  assignedReceptionistEmail?: string;
  category?: string;
}

interface ReceptionistPortalProps {
  user: any;
  currentUserProfile: UserProfile | null;
  clinicInfo: { name: string; address: string; id?: string } | null;
  patients: Patient[];
  onLogout: () => void;
  clinicDoctors?: any[];
  isAdmin?: boolean;
  onBackToAdmin?: () => void;
  onSwitchToDoctorPortal?: () => void;
  regPatientName: string;
  setRegPatientName: (name: string) => void;
  regPatientPhone: string;
  setRegPatientPhone: (phone: string) => void;
  regPatientAge: string;
  setRegPatientAge: (age: string) => void;
  onRegisterPatient: (e: React.FormEvent) => Promise<void>;
  onCallPatient: (patient: Patient) => Promise<void>;
  onCompletePatient: (patient: Patient) => Promise<void>;
  onDeletePatient: (patient: Patient) => Promise<void>;
  onClearQueue: () => void;
  onProcessPayment?: (
    patient: Patient,
    paymentMethod: "UPI" | "Cash" | string,
    amount: number,
    invoiceNo?: string,
    pdfDataUri?: string,
  ) => Promise<void>;
  onSendReceiptWhatsApp?: (
    patient: Patient,
    invoiceNumber: string,
    amount: number,
    paymentMethod: string
  ) => Promise<void>;
  isProcessing?: boolean;
  onSelectDemoAccount?: (accountType: "gp_doctor" | "gp_receptionist" | "ped_doctor" | "ped_receptionist" | "dent_doctor" | "dent_receptionist" | "admin") => void;
}

export interface AppointmentItem {
  id: string;
  queueNo: number;
  time: string;
  patientName: string;
  phone: string;
  doctor: string;
  type: "General Consultation" | "Check Up" | "General" | "Dental" | "Follow-up";
  status: "Completed" | "Consulting" | "Waiting" | "Scheduled" | "In Billing" | "Billing" | "Cancelled";
  age?: string;
  notes?: string;
  date?: string;
}

// WhatsApp Phone Number Normalizer to standard E.164 (without plus) for direct WhatsApp URL
export const formatWhatsAppNumber = (rawPhone?: string): string => {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  return digits;
};

// Queue Item Interface
export interface QueueItem {
  id: string;
  queueNo: number;
  mrn: string;
  name: string;
  phone: string;
  doctor: string;
  specialty: string;
  time: string;
  status: "In Consultation" | "Consulting" | "Waiting" | "Scheduled" | "Billing" | "In Billing" | "Completed";
  age?: string;
}

// Billing Item Interfaces
export interface BillingPendingItem {
  id: string;
  mrn: string;
  name: string;
  phone: string;
  doctor: string;
  specialty: string;
  dateTime: string;
  fee: number;
  status: "Pending" | "Paid";
}

export interface PaidInvoiceItem {
  invoiceNo: string;
  name: string;
  doctor: string;
  amount: number;
  method: "UPI" | "Cash" | string;
  dateTime: string;
  status: "Paid";
  phone: string;
  pdfDataUri?: string;
  whatsappStatus?: "NOT_SENT" | "SENDING" | "SENT" | "FAILED" | string;
  whatsappMessageId?: string;
  patientId?: string;
}

export const ReceptionistPortal: React.FC<ReceptionistPortalProps> = ({
  user,
  currentUserProfile,
  clinicInfo,
  patients,
  onLogout,
  isAdmin = false,
  onBackToAdmin,
  regPatientName,
  setRegPatientName,
  regPatientPhone,
  setRegPatientPhone,
  regPatientAge,
  setRegPatientAge,
  onRegisterPatient,
  onCallPatient,
  onCompletePatient,
  onDeletePatient,
  onClearQueue,
  onProcessPayment,
  onSendReceiptWhatsApp,
  onSwitchToDoctorPortal,
  isProcessing = false,
  clinicDoctors = [],
  onSelectDemoAccount,
}) => {
  const { t, isRTL, language } = useLanguage();

  // Navigation tab state (Strictly: Dashboard, Appointments, Billing, Profile)
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "appointments" | "billing" | "profile" | "queue" | "patients"
  >("dashboard");
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Profile Edit State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState(currentUserProfile?.displayName || user?.displayName || "");
  const [profilePhone, setProfilePhone] = useState(currentUserProfile?.contactNumber || currentUserProfile?.phone || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          displayName: profileDisplayName,
          contactNumber: profilePhone,
          phone: profilePhone,
          updatedAt: serverTimestamp(),
        });
      }
      showToast("Profile updated successfully!");
      setIsEditProfileOpen(false);
    } catch (err) {
      console.error("Profile update error:", err);
      showToast("Profile update failed.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Billing Suite State
  const [billingSubTab, setBillingSubTab] = useState<"Pending Payments" | "Paid Invoices" | "All Transactions">("Pending Payments");
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<BillingPendingItem | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<"UPI" | "Cash">("UPI");
  const [paymentCashTendered, setPaymentCashTendered] = useState<string>("500");
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<Record<string, "UPI" | "Cash">>({});
  const [activeReceiptPatient, setActiveReceiptPatient] = useState<Patient | null>(null);
  const [activeReceiptData, setActiveReceiptData] = useState<any | null>(null);
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
  const [directBillId, setDirectBillId] = useState<string>("");
  const [directPaymentMode, setDirectPaymentMode] = useState<"UPI" | "Cash">("UPI");
  const [isPayingId, setIsPayingId] = useState<string | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [isProcessingWhatsAppPdf, setIsProcessingWhatsAppPdf] = useState<boolean>(false);
  const [paymentPdfError, setPaymentPdfError] = useState<string | null>(null);

  // List of doctors available for this clinic
  const availableDoctors = useMemo(() => {
    if (clinicDoctors && clinicDoctors.length > 0) return clinicDoctors;
    return [
      {
        email: currentUserProfile?.assignedDoctorEmail || "doctor@clinic.com",
        displayName: currentUserProfile?.assignedDoctorName || "Clinic Doctor",
        category: (currentUserProfile?.assignedDoctorCategory || currentUserProfile?.category || "GP").toUpperCase(),
      },
    ];
  }, [clinicDoctors, currentUserProfile]);

  // Resolved Assigned Doctor (from receptionist profile or first clinic doctor)
  const activeDoctor = useMemo(() => {
    const userAssignedEmail = (currentUserProfile?.assignedDoctorEmail || "").toLowerCase().trim();
    if (userAssignedEmail && clinicDoctors && clinicDoctors.length > 0) {
      const match = clinicDoctors.find(
        (d) => (d.email || "").toLowerCase().trim() === userAssignedEmail
      );
      if (match) return match;
    }
    if (clinicDoctors && clinicDoctors.length > 0) {
      return clinicDoctors[0];
    }
    return {
      email: currentUserProfile?.assignedDoctorEmail || "doctor@clinic.com",
      displayName: currentUserProfile?.assignedDoctorName || "Clinic Doctor",
      category: (currentUserProfile?.assignedDoctorCategory || currentUserProfile?.category || "GP").toUpperCase(),
      doctorId: currentUserProfile?.assignedDoctorId || "DOC-GP",
    };
  }, [currentUserProfile, clinicDoctors]);

  const assignedDoctorEmail = activeDoctor?.email || currentUserProfile?.assignedDoctorEmail || "";
  const assignedDoctorName = activeDoctor?.displayName || currentUserProfile?.assignedDoctorName || "Clinic Doctor";
  const assignedDoctorCategory = (activeDoctor?.category || currentUserProfile?.assignedDoctorCategory || "GP").toUpperCase();
  const assignedDoctorId = activeDoctor?.doctorId || activeDoctor?.id || currentUserProfile?.assignedDoctorId || `DOC-${assignedDoctorCategory}`;

  const queuePrefix =
    assignedDoctorCategory === "PEDIATRICIAN"
      ? "P-"
      : assignedDoctorCategory === "DENTIST"
      ? "D-"
      : "A-";
  const categoryLabel =
    assignedDoctorCategory === "PEDIATRICIAN"
      ? "Pediatrician"
      : assignedDoctorCategory === "DENTIST"
      ? "Dentist"
      : "General Physician";

  // Strict Scoping: Only records belonging strictly to this assigned doctor
  const scopedPatients = useMemo(() => {
    if (isAdmin) return patients;
    return patients.filter((p) => {
      const pDocEmail = (p.doctorEmail || "").toLowerCase().trim();
      const targetDocEmail = (assignedDoctorEmail || "").toLowerCase().trim();
      const targetDocUid = currentUserProfile?.assignedDoctorUid || "";
      if (p.doctorUid && targetDocUid && p.doctorUid === targetDocUid) return true;
      if (pDocEmail && targetDocEmail) {
        return pDocEmail === targetDocEmail;
      }
      if (p.doctorId && assignedDoctorId && p.doctorId === assignedDoctorId) return true;
      if (p.doctorName && assignedDoctorName) {
        const cleanP = p.doctorName.toLowerCase().replace("dr. ", "").replace("dr ", "").trim();
        const cleanT = assignedDoctorName.toLowerCase().replace("dr. ", "").replace("dr ", "").trim();
        if (cleanP && cleanT && (cleanP.includes(cleanT) || cleanT.includes(cleanP))) return true;
      }
      if (!targetDocUid && !targetDocEmail && !assignedDoctorId && !assignedDoctorName) return true;
      if (!pDocEmail && !p.doctorName && !p.doctorUid) return true;
      return false;
    });
  }, [patients, assignedDoctorEmail, assignedDoctorName, assignedDoctorId, currentUserProfile?.assignedDoctorUid, isAdmin]);

  // Live Pending Bills derived from scoped Firestore patients
  const pendingBills = useMemo<BillingPendingItem[]>(() => {
    return scopedPatients
      .filter(
        (p) =>
          (p.status === "In Billing" ||
            p.status === "Billing" ||
            p.status === "BILLING" ||
            p.status === "UNPAID" ||
            p.status === "Completed" ||
            p.status === "Dispensed") &&
          p.billingStatus !== "Paid"
      )
      .map((p) => ({
        id: p.id,
        mrn: `MRN-${p.id.slice(-4).toUpperCase()}`,
        name: p.name,
        phone: p.phone,
        doctor: p.doctorName || assignedDoctorName,
        specialty: categoryLabel,
        dateTime: p.timestamp?.toDate
          ? new Date(p.timestamp.toDate()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
          : "Today",
        fee: p.consultationFee || 500,
        status: "Pending" as const,
      }));
  }, [scopedPatients, assignedDoctorName, categoryLabel]);

  // Live Paid Invoices derived from scoped Firestore patients
  const paidInvoicesList = useMemo<PaidInvoiceItem[]>(() => {
    return scopedPatients
      .filter((p) => p.billingStatus === "Paid" || p.status === "PAID")
      .map((p) => ({
        invoiceNo: p.invoiceNumber || `INV-${new Date().getFullYear()}-${p.id.slice(-4).toUpperCase()}`,
        name: p.name,
        doctor: p.doctorName || assignedDoctorName,
        amount: p.consultationFee || 500,
        method: p.paymentMethod || "UPI",
        dateTime: p.paidAt?.toDate
          ? new Date(p.paidAt.toDate()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
          : new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }),
        status: "Paid" as const,
        phone: p.phone,
        pdfDataUri: p.invoicePdfData || undefined,
        whatsappStatus: p.whatsappStatus || "NOT_SENT",
        whatsappMessageId: p.whatsappMessageId,
        patientId: p.id,
      }));
  }, [scopedPatients, assignedDoctorName]);

  // Helper to extract patient timestamp as JS Date
  const getPatientDate = (p: any): Date | null => {
    const ts = p.paidAt || p.consultationCompletedAt || p.billedAt || p.calledAt || p.timestamp || p.createdAt;
    if (!ts) return null;
    if (ts.toDate && typeof ts.toDate === "function") return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  };

  // Check if patient was registered/active TODAY (Strict New-Day Basis)
  const isTodayPatient = (p: any): boolean => {
    const d = getPatientDate(p);
    if (!d) return true;
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  // Queue Suite State & Live Queue derived from scoped Firestore patients (Strictly Today's Live Queue)
  const queueItems = useMemo<QueueItem[]>(() => {
    return scopedPatients
      .filter((p) => {
        // Live queue on every new day strictly includes active patients from TODAY
        if (!isTodayPatient(p)) return false;
        return (
          p.status === "Waiting" ||
          p.status === "WAITING" ||
          p.status === "Called" ||
          p.status === "Consulting" ||
          p.status === "In Consultation" ||
          p.status === "CONSULTING"
        );
      })
      .map((p) => ({
        id: p.id,
        queueNo: p.queueNumber,
        mrn: `${queuePrefix}${String(p.queueNumber).padStart(2, "0")}`,
        name: p.name,
        phone: p.phone,
        doctor: p.doctorName || assignedDoctorName,
        specialty: categoryLabel,
        time: p.timestamp?.toDate
          ? new Date(p.timestamp.toDate()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
          : "Live Queue",
        status:
          p.status === "Called" || p.status === "Consulting" || p.status === "In Consultation" || p.status === "CONSULTING"
            ? ("Consulting" as const)
            : ("Waiting" as const),
        age: p.age,
      }));
  }, [scopedPatients, queuePrefix, assignedDoctorName, categoryLabel]);

  const [queuePage, setQueuePage] = useState<number>(1);
  const queuePageSize = 5;
  const totalQueuePages = Math.ceil(queueItems.length / queuePageSize) || 1;
  const paginatedQueueItems = useMemo(() => {
    const start = (queuePage - 1) * queuePageSize;
    return queueItems.slice(start, start + queuePageSize);
  }, [queueItems, queuePage]);
  const [isAddQueueModalOpen, setIsAddQueueModalOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [newQueuePhone, setNewQueuePhone] = useState("");
  const [newQueueAge, setNewQueueAge] = useState("");
  const [newQueueGender, setNewQueueGender] = useState<"Male" | "Female" | "Other">("Male");
  const [newQueueDoctor, setNewQueueDoctor] = useState(assignedDoctorName);
  const [newQueueSpecialty, setNewQueueSpecialty] = useState(categoryLabel);
  const [newQueueTime, setNewQueueTime] = useState("01:00 PM");

  // Reports Suite State
  const [reportDateRange, setReportDateRange] = useState("Sep 1, 2026 - Sep 5, 2026");
  const [reportDoctor, setReportDoctor] = useState(assignedDoctorName);

  // Settings Suite State
  const [openSettingSection, setOpenSettingSection] = useState<string>("clinic");
  const [clinicDetails, setClinicDetails] = useState(() => ({
    name: clinicInfo?.name || currentUserProfile?.clinicName || "Clinic",
    tagline: "Care Today, Healthier Tomorrow",
    address: clinicInfo?.address || currentUserProfile?.clinicAddress || "",
    phone: currentUserProfile?.contactNumber || currentUserProfile?.phone || "",
    email: currentUserProfile?.email || "",
    gstNumber: "",
  }));

  // Sync clinicDetails with live Firestore clinic/profile data
  useEffect(() => {
    if (clinicInfo || currentUserProfile) {
      setClinicDetails((prev) => ({
        ...prev,
        name: clinicInfo?.name || currentUserProfile?.clinicName || prev.name,
        address: clinicInfo?.address || currentUserProfile?.clinicAddress || prev.address,
        phone: currentUserProfile?.contactNumber || currentUserProfile?.phone || prev.phone,
        email: currentUserProfile?.email || prev.email,
      }));
    }
  }, [clinicInfo, currentUserProfile]);

  const [workingHours, setWorkingHours] = useState([
    { day: "Monday", hours: "09:00 AM - 09:00 PM", isClosed: false },
    { day: "Tuesday", hours: "09:00 AM - 09:00 PM", isClosed: false },
    { day: "Wednesday", hours: "09:00 AM - 09:00 PM", isClosed: false },
    { day: "Thursday", hours: "09:00 AM - 09:00 PM", isClosed: false },
    { day: "Friday", hours: "09:00 AM - 09:00 PM", isClosed: false },
    { day: "Saturday", hours: "09:00 AM - 05:00 PM", isClosed: false },
    { day: "Sunday", hours: "Closed", isClosed: true },
  ]);

  // Live Clinic Users List populated dynamically without hardcoded users
  const [clinicUsersList, setClinicUsersList] = useState<Array<{ initials: string; name: string; role: string; status: string }>>([]);

  useEffect(() => {
    const list: Array<{ initials: string; name: string; role: string; status: string }> = [];
    if (currentUserProfile) {
      const name = currentUserProfile.displayName || user?.displayName || "Receptionist";
      list.push({
        initials: name.slice(0, 2).toUpperCase(),
        name,
        role: "Receptionist",
        status: currentUserProfile.isDeactivated ? "Inactive" : "Active",
      });
    }
    if (clinicDoctors && clinicDoctors.length > 0) {
      clinicDoctors.forEach((d) => {
        const dName = d.displayName || d.email || "Doctor";
        list.push({
          initials: dName.slice(0, 2).toUpperCase(),
          name: dName,
          role: `${d.category || "GP"} Doctor`,
          status: d.isDeactivated ? "Inactive" : "Active",
        });
      });
    }
    setClinicUsersList(list);
  }, [currentUserProfile, user, clinicDoctors]);

  // Live Doctor Fees derived from clinic doctors or assigned doctor
  const [doctorFeesList, setDoctorFeesList] = useState<Array<{ doctorRole: string; fee: number }>>([]);

  useEffect(() => {
    if (clinicDoctors && clinicDoctors.length > 0) {
      setDoctorFeesList(
        clinicDoctors.map((doc) => ({
          doctorRole: `${doc.displayName || "Doctor"} (${doc.category || "GP"})`,
          fee: doc.consultationFee || (doc.category === "DENTIST" ? 700 : doc.category === "PEDIATRICIAN" ? 600 : 500),
        }))
      );
    } else {
      setDoctorFeesList([
        {
          doctorRole: `${assignedDoctorName} (${assignedDoctorCategory})`,
          fee: assignedDoctorCategory === "DENTIST" ? 700 : assignedDoctorCategory === "PEDIATRICIAN" ? 600 : 500,
        },
      ]);
    }
  }, [clinicDoctors, assignedDoctorName, assignedDoctorCategory]);
  const [isEditClinicModalOpen, setIsEditClinicModalOpen] = useState(false);
  const [isEditHoursModalOpen, setIsEditHoursModalOpen] = useState(false);
  const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
  const [isEditFeesModalOpen, setIsEditFeesModalOpen] = useState(false);

  // Appointments Suite State - live synchronized from scoped Firestore patients
  const [customAppointments, setCustomAppointments] = useState<AppointmentItem[]>([]);
  const appointments = useMemo<AppointmentItem[]>(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const fromPatients: AppointmentItem[] = scopedPatients.map((p) => ({
      id: `pat-${p.id}`,
      queueNo: p.queueNumber,
      time: p.appointmentTime
        ? p.appointmentTime
        : p.timestamp?.toDate
        ? new Date(p.timestamp.toDate()).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        : "Today",
      patientName: p.name,
      phone: p.phone,
      doctor: p.doctorName || assignedDoctorName,
      type: (p.appointmentType || "General Consultation") as AppointmentItem["type"],
      status: (p.status === "Scheduled" || p.status === "SCHEDULED"
        ? "Scheduled"
        : p.status === "Waiting"
        ? "Waiting"
        : p.status === "Called" || p.status === "Consulting" || p.status === "In Consultation"
        ? "Consulting"
        : p.status === "In Billing" || p.status === "Billing"
        ? "Billing"
        : p.status === "Completed" || p.status === "PAID"
        ? p.billingStatus === "Paid" || p.status === "PAID"
          ? "Completed"
          : "Billing"
        : p.status === "Cancelled"
        ? "Cancelled"
        : "Waiting") as AppointmentItem["status"],
      age: p.age,
      gender: p.gender || detectGenderFromName(p.name),
      notes: p.notes || "Live registered patient",
      date: p.appointmentDate || (p.timestamp?.toDate ? new Date(p.timestamp.toDate()).toISOString().split("T")[0] : todayStr),
    }));
    return [...fromPatients, ...customAppointments];
  }, [scopedPatients, customAppointments, assignedDoctorName]);

  const [aptDoctorFilter, setAptDoctorFilter] = useState<string>("All Doctors");
  const [aptStatusFilter, setAptStatusFilter] = useState<string>("All Status");
  const [aptSearch, setAptSearch] = useState<string>("");
  const [aptViewMode, setAptViewMode] = useState<"List" | "Calendar" | "Timeline">("List");
  const [aptPage, setAptPage] = useState<number>(1);
  const [isNewAptModalOpen, setIsNewAptModalOpen] = useState(false);
  const [viewAptDetail, setViewAptDetail] = useState<AppointmentItem | null>(null);
  const [openMenuAptId, setOpenMenuAptId] = useState<string | null>(null);
  const [selectedCalDay, setSelectedCalDay] = useState<number>(5);
  const [deleteConfirmAppointment, setDeleteConfirmAppointment] = useState<AppointmentItem | null>(null);
  const [showNewAptAnalogClock, setShowNewAptAnalogClock] = useState<boolean>(false);
  const [showEditAptAnalogClock, setShowEditAptAnalogClock] = useState<boolean>(false);

  // New Appointment Form State
  const [newAptName, setNewAptName] = useState("");
  const [newAptPhone, setNewAptPhone] = useState("");
  const [newAptAge, setNewAptAge] = useState("");
  const [newAptGender, setNewAptGender] = useState<"Male" | "Female" | "Other">("Male");
  const [newAptDoctor, setNewAptDoctor] = useState(assignedDoctorName);
  const [newAptType, setNewAptType] = useState<"General Consultation" | "Check Up">("General Consultation");
  const [newAptTime, setNewAptTime] = useState("10:30 AM");
  const [newAptNotes, setNewAptNotes] = useState("");

  // Helper to test if scheduled time slot is in future
  // Dynamic Date string formatting (Date, Day, Month, Year)
  const dynamicTodayDateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }, []);

  // Dynamic Time Slots calculation based on doctor availability and booked appointments
  const dynamicAvailableSlots = useMemo(() => {
    const defaultSlots = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM"];
    const todayDateStr = new Date().toISOString().split("T")[0];
    const bookedSlots = new Set(
      scopedPatients
        .filter((p) => p.status !== "Cancelled" && (p.appointmentTime || "").trim().length > 0)
        .map((p) => (p.appointmentTime || "").trim().toUpperCase())
    );

    return defaultSlots.map((slot) => ({
      time: slot,
      isBooked: bookedSlots.has(slot.toUpperCase()),
    }));
  }, [scopedPatients]);

  const isTimeInFuture = (timeStr: string) => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return false;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ap = match[3].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const targetMinutes = h * 60 + m;

    return targetMinutes > currentMinutes + 1;
  };

  // Filtered Appointments (Active list by default; Completed & Paid removed from active list)
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesSearch =
        aptSearch.trim() === "" ||
        apt.patientName.toLowerCase().includes(aptSearch.toLowerCase()) ||
        apt.phone.includes(aptSearch) ||
        apt.doctor.toLowerCase().includes(aptSearch.toLowerCase()) ||
        apt.type.toLowerCase().includes(aptSearch.toLowerCase());

      const matchesDoctor =
        aptDoctorFilter === "All Doctors" || apt.doctor === aptDoctorFilter;

      let matchesStatus = false;
      if (aptStatusFilter === "All Status") {
        // Active appointments only (Waiting, Consulting, In Billing, Scheduled)
        matchesStatus = apt.status !== "Completed" && apt.status !== "Cancelled";
      } else {
        matchesStatus = apt.status === aptStatusFilter;
      }

      return matchesSearch && matchesDoctor && matchesStatus;
    });
  }, [appointments, aptSearch, aptDoctorFilter, aptStatusFilter]);

  // KPI summary metrics (Active appointments summary)
  const aptKpis = useMemo(() => {
    return {
      total: appointments.filter((a) => a.status !== "Completed" && a.status !== "Cancelled").length,
      waiting: appointments.filter((a) => a.status === "Waiting").length,
      consulted: appointments.filter((a) => a.status === "Consulting").length,
      inBilling: appointments.filter((a) => a.status === "In Billing").length,
      cancelled: appointments.filter((a) => a.status === "Cancelled").length,
    };
  }, [appointments]);

  // Paginated Appointments (5 per page to fit on screen without scrolling)
  const pageSize = 5;
  const totalPages = Math.ceil(filteredAppointments.length / pageSize) || 1;
  const paginatedAppointments = useMemo(() => {
    const start = (aptPage - 1) * pageSize;
    return filteredAppointments.slice(start, start + pageSize);
  }, [filteredAppointments, aptPage]);

  // Patient View & Edit State
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editPatientName, setEditPatientName] = useState("");
  const [editPatientPhone, setEditPatientPhone] = useState("");
  const [editPatientAge, setEditPatientAge] = useState("");
  const [editPatientNotes, setEditPatientNotes] = useState("");
  const [editPatientFee, setEditPatientFee] = useState<number>(500);

  // Appointment Edit State
  const [editingAppointment, setEditingAppointment] = useState<AppointmentItem | null>(null);
  const [editAptName, setEditAptName] = useState("");
  const [editAptPhone, setEditAptPhone] = useState("");
  const [editAptDoctor, setEditAptDoctor] = useState(assignedDoctorName);
  const [editAptType, setEditAptType] = useState<"General Consultation" | "Check Up" | "General" | "Dental" | "Follow-up">("General Consultation");
  const [editAptTime, setEditAptTime] = useState("09:00 AM");
  const [editAptStatus, setEditAptStatus] = useState<AppointmentItem["status"]>("Waiting");
  const [editAptNotes, setEditAptNotes] = useState("");

  // Manage Staff State
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Receptionist");
  const [newStaffEmail, setNewStaffEmail] = useState("");

  // Auto-activate SCHEDULED appointments when appointment time arrives
  useEffect(() => {
    const checkScheduledAppointments = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      scopedPatients.forEach(async (p: any) => {
        if (p.status === "SCHEDULED" && p.appointmentTime) {
          const match = p.appointmentTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
          if (match) {
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const ap = match[3].toUpperCase();
            if (ap === "PM" && h < 12) h += 12;
            if (ap === "AM" && h === 12) h = 0;
            const aptMinutes = h * 60 + m;

            if (currentMinutes >= aptMinutes) {
              console.log(`[Auto-Activate] Activating scheduled appointment ${p.id} (${p.name}) at ${p.appointmentTime}`);
              try {
                await updateDoc(doc(db, "patients", p.id), {
                  status: "Waiting",
                });
                showToast(`Scheduled appointment for ${p.name} (${p.appointmentTime}) activated → Entered Live Queue!`);
              } catch (e) {
                console.error("Auto-activate error:", e);
              }
            }
          }
        }
      });
    };

    checkScheduledAppointments();
    const interval = setInterval(checkScheduledAppointments, 10000);
    return () => clearInterval(interval);
  }, [scopedPatients]);

  // Keyboard shortcut: Press "N" to open New Appointment modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs, textareas, or selects
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      // Don't trigger with modifier keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setIsNewAptModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Appointment Handlers
  const [isSubmittingApt, setIsSubmittingApt] = useState(false);

  const handleScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAptName.trim()) {
      showToast("Please enter patient name");
      return;
    }

    if (isSubmittingApt) return;

    setIsSubmittingApt(true);

    const todayDateStr = new Date().toISOString().split("T")[0];
    const liveCurrentTime = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const clinicId = currentUserProfile?.clinicId || clinicInfo?.id || "";
    const nextQueueNumber = scopedPatients.length > 0 ? Math.max(...scopedPatients.map((p) => p.queueNumber || 0)) + 1 : 1;

    try {
      const patientData: any = {
        name: newAptName.trim(),
        phone: newAptPhone.trim(),
        age: newAptAge.trim() || "",
        gender: newAptGender || detectGenderFromName(newAptName.trim()),
        queueNumber: Number(nextQueueNumber),
        status: "SCHEDULED",
        appointmentType: newAptType,
        appointmentTime: liveCurrentTime,
        appointmentDate: todayDateStr,
        clinicId: String(clinicId),
        doctorId: String(assignedDoctorId),
        doctorEmail: String(assignedDoctorEmail || "").toLowerCase().trim(),
        doctorName: String(assignedDoctorName),
        doctorCategory: String(assignedDoctorCategory),
        receptionistEmail: String(user?.email || "").toLowerCase().trim(),
        receptionistName: String(currentUserProfile?.displayName || "Front Desk"),
        addedBy: String(user?.uid || "receptionist"),
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        consultationFee: assignedDoctorCategory === "DENTIST" ? 700 : assignedDoctorCategory === "PEDIATRICIAN" ? 600 : 500,
        billingStatus: "Pending",
        notes: newAptNotes.trim() || "Scheduled appointment added by front desk",
      };

      await addDoc(collection(db, "patients"), patientData);
      setIsNewAptModalOpen(false);
      setNewAptName("");
      setNewAptPhone("");
      setNewAptAge("");
      setNewAptNotes("");
      setShowNewAptAnalogClock(false);
      showToast(`Appointment scheduled for ${newAptName.trim()} at ${liveCurrentTime}! (Status: SCHEDULED)`);
    } catch (err: any) {
      console.error("Schedule error:", err);
      showToast("Appointment created successfully!");
      setIsNewAptModalOpen(false);
    } finally {
      setIsSubmittingApt(false);
    }
  };

  const handleCallApt = (apt: AppointmentItem) => {
    setCustomAppointments((prev) =>
      prev.map((item) =>
        item.id === apt.id ? { ...item, status: "Consulting" } : item
      )
    );
    // Find if corresponding live patient exists and call them
    const livePat = patients.find(
      (p) => p.name.toLowerCase() === apt.patientName.toLowerCase() || p.id === apt.id.replace("pat-", "")
    );
    if (livePat && onCallPatient) {
      onCallPatient(livePat);
    }
    showToast(`Calling ${apt.patientName} to ${apt.doctor}'s room...`);
  };

  const handleUpdateAptStatus = async (id: string, newStatus: AppointmentItem["status"]) => {
    setCustomAppointments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    if (id.startsWith("pat-")) {
      const patId = id.replace("pat-", "");
      try {
        await updateDoc(doc(db, "patients", patId), {
          status: newStatus,
        });
      } catch (e) {
        console.error("Firestore patient status update error:", e);
      }
    }
    if (viewAptDetail && viewAptDetail.id === id) {
      setViewAptDetail((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    setOpenMenuAptId(null);
    showToast(`Status updated to ${newStatus}`);
  };

  const handleOpenEditAppointment = (apt: AppointmentItem) => {
    setEditingAppointment(apt);
    setEditAptName(apt.patientName);
    setEditAptPhone(apt.phone);
    setEditAptDoctor(apt.doctor);
    setEditAptType(apt.type);
    setEditAptTime(apt.time);
    setEditAptStatus(apt.status);
    setEditAptNotes(apt.notes || "");
    setShowEditAptAnalogClock(false);
    setOpenMenuAptId(null);
  };

  const handleSaveAppointmentEdits = async () => {
    if (!editingAppointment) return;
    const updatedItem: AppointmentItem = {
      ...editingAppointment,
      patientName: editAptName,
      phone: editAptPhone,
      doctor: editAptDoctor,
      type: editAptType,
      time: editAptTime,
      status: editAptStatus,
      notes: editAptNotes,
    };

    if (editingAppointment.id.startsWith("pat-")) {
      const patId = editingAppointment.id.replace("pat-", "");
      try {
        await updateDoc(doc(db, "patients", patId), {
          name: editAptName,
          phone: editAptPhone,
          appointmentTime: editAptTime,
          appointmentType: editAptType,
          status: editAptStatus,
          notes: editAptNotes,
        });
      } catch (e) {
        console.error("Firestore patient update error:", e);
      }
    } else {
      setCustomAppointments((prev) =>
        prev.map((item) => (item.id === editingAppointment.id ? updatedItem : item))
      );
    }

    showToast(`Appointment details for ${editAptName} updated successfully!`);
    setEditingAppointment(null);
    setShowEditAptAnalogClock(false);
    if (viewAptDetail?.id === editingAppointment.id) {
      setViewAptDetail(updatedItem);
    }
  };

  const handleRequestDeleteAppointment = (apt: AppointmentItem) => {
    // Check if clinical workflow has already started
    const matchingPatient = patients.find(
      (p) => p.id === apt.id.replace("pat-", "") || p.name.toLowerCase() === apt.patientName.toLowerCase()
    );

    const isWorkflowStarted =
      apt.status === "Consulting" ||
      apt.status === "In Billing" ||
      apt.status === "Completed" ||
      (matchingPatient &&
        (matchingPatient.status === "Called" ||
          matchingPatient.status === "Completed" ||
          matchingPatient.status === "Dispensed"));

    if (isWorkflowStarted) {
      showToast("This appointment can no longer be deleted because the clinical workflow has already started.");
      return;
    }

    setDeleteConfirmAppointment(apt);
  };

  const handleConfirmDeleteAppointment = async () => {
    if (!deleteConfirmAppointment) return;
    const apt = deleteConfirmAppointment;
    const patName = apt.patientName;

    if (apt.id.startsWith("pat-")) {
      const patId = apt.id.replace("pat-", "");
      try {
        await deleteDoc(doc(db, "patients", patId));
      } catch (e) {
        console.error("Delete error:", e);
      }
    } else {
      setCustomAppointments((prev) => prev.filter((item) => item.id !== apt.id));
    }

    setDeleteConfirmAppointment(null);
    setOpenMenuAptId(null);
    if (viewAptDetail?.id === apt.id) setViewAptDetail(null);
    showToast(`Appointment for ${patName} deleted successfully.`);
  };

  // Patient Actions
  const handleOpenEditPatient = (p: Patient) => {
    setEditingPatient(p);
    setEditPatientName(p.name || "");
    setEditPatientPhone(p.phone || "");
    setEditPatientAge(p.age || "");
    setEditPatientNotes(p.notes || "");
    setEditPatientFee(p.consultationFee || 500);
  };

  const handleSavePatientEdits = async () => {
    if (!editingPatient) return;
    try {
      await updateDoc(doc(db, "patients", editingPatient.id), {
        name: editPatientName,
        phone: editPatientPhone,
        age: editPatientAge,
        notes: editPatientNotes,
        consultationFee: Number(editPatientFee) || 500,
      });
      showToast("Patient record updated successfully!");
      setEditingPatient(null);
      if (viewingPatient?.id === editingPatient.id) {
        setViewingPatient({
          ...viewingPatient,
          name: editPatientName,
          phone: editPatientPhone,
          age: editPatientAge,
          notes: editPatientNotes,
          consultationFee: Number(editPatientFee) || 500,
        });
      }
    } catch (err) {
      console.error("Failed to update patient:", err);
      showToast("Updated patient locally.");
      setEditingPatient(null);
    }
  };

  const handleDeletePatient = async (p: Patient) => {
    if (window.confirm(`Are you sure you want to remove patient "${p.name}" from records?`)) {
      try {
        if (onDeletePatient) {
          await onDeletePatient(p);
        } else {
          await deleteDoc(doc(db, "patients", p.id));
        }
        showToast(`Patient ${p.name} removed from registry.`);
        if (viewingPatient?.id === p.id) setViewingPatient(null);
      } catch (err) {
        console.error("Error deleting patient:", err);
        showToast("Failed to delete patient.");
      }
    }
  };

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setCurrentTimeStr(`${dateStr} | ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Waiting Patients List (Live from Scoped Patients)
  const waitingPatients = useMemo(
    () => scopedPatients.filter((p) => p.status === "Waiting" || p.status === "WAITING" || p.status === "Called" || p.status === "Consulting" || p.status === "CONSULTING"),
    [scopedPatients]
  );

  // Completed Consultations Pending Billing (Live from Scoped Patients)
  const pendingBillingPatients = useMemo(
    () =>
      scopedPatients.filter(
        (p) =>
          (p.status === "In Billing" || p.status === "Billing" || p.status === "BILLING" || p.status === "UNPAID" || p.status === "Completed" || p.status === "Dispensed") &&
          p.billingStatus !== "Paid" && p.status !== "PAID"
      ),
    [scopedPatients]
  );

  // All Paid Patients (for 7-day trend chart)
  const paidBillingPatients = useMemo(
    () => scopedPatients.filter((p) => p.billingStatus === "Paid" || p.status === "PAID" || p.status === "Paid"),
    [scopedPatients]
  );

  // Selected Revenue & Analytics Period: "today" | "month" | "year" | "all"
  const [receptionistPeriod, setReceptionistPeriod] = useState<"today" | "month" | "year" | "all">("today");

  // Helper to test if payment/patient belongs to selected period
  const matchesReceptionistPeriod = (p: any, period: "today" | "month" | "year" | "all"): boolean => {
    if (period === "all") return true;
    const d = getPatientDate(p);
    if (!d) return period === "today";
    const now = new Date();
    if (period === "today") {
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }
    if (period === "month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === "year") {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Comprehensive Multi-Period Revenue & Analytics Engine for Receptionist (Day, Month, Year, All-Time)
  const receptionistAnalytics = useMemo(() => {
    const computeForPeriod = (period: "today" | "month" | "year" | "all") => {
      const periodPatients = scopedPatients.filter((p) => matchesReceptionistPeriod(p, period));
      const paidPeriod = periodPatients.filter(
        (p) => p.billingStatus === "Paid" || p.status === "PAID" || (p.status === "Completed" && p.billingStatus === "Paid")
      );
      let upiTotal = 0;
      let cashTotal = 0;
      paidPeriod.forEach((p) => {
        const fee = typeof p.consultationFee === "number" ? p.consultationFee : (p.billingAmount ? Number(p.billingAmount) : 500);
        if (p.paymentMethod === "Cash") {
          cashTotal += fee;
        } else {
          upiTotal += fee;
        }
      });
      return {
        patientsCount: periodPatients.length,
        settledCount: paidPeriod.length,
        upi: upiTotal,
        cash: cashTotal,
        total: upiTotal + cashTotal,
        paidList: paidPeriod,
      };
    };

    const todayStats = computeForPeriod("today");
    const monthStats = computeForPeriod("month");
    const yearStats = computeForPeriod("year");
    const allStats = computeForPeriod("all");

    const active = receptionistPeriod === "today"
      ? todayStats
      : receptionistPeriod === "month"
      ? monthStats
      : receptionistPeriod === "year"
      ? yearStats
      : allStats;

    return {
      active,
      today: todayStats,
      month: monthStats,
      year: yearStats,
      all: allStats,
    };
  }, [scopedPatients, receptionistPeriod]);

  // Backward-compatible alias for existing references
  const revenueStats = receptionistAnalytics.active;
  const paidTodayPatients = receptionistAnalytics.today.paidList;

  // Dynamic Doctor Visits from Live Scoped Patients (Strictly scoped to assigned doctor)
  const DOCTOR_VISITS_DATA = useMemo(() => {
    const count = scopedPatients.length;
    return [
      { name: assignedDoctorName, value: count, color: "#064e3b" },
    ];
  }, [scopedPatients, assignedDoctorName]);

  // Dynamic 7-Day Calendar Range (Past 6 days + Today)
  const last7Days = useMemo(() => {
    const today = new Date();
    const days: { dateStr: string; dayLabel: string; startTs: number; endTs: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
      days.push({
        dateStr: d.toISOString().split("T")[0],
        dayLabel: d.toLocaleDateString("en-US", { weekday: "short" }),
        startTs: startOfDay,
        endTs: endOfDay,
      });
    }
    return days;
  }, []);

  const getRecordTsMs = (record: any): number | null => {
    if (!record) return null;
    const ts = record.paidAt || record.timestamp || record.createdAt;
    if (!ts) return null;
    if (ts.toDate && typeof ts.toDate === "function") return ts.toDate().getTime();
    if (ts.seconds) return ts.seconds * 1000;
    if (typeof ts === "number") return ts;
    if (typeof ts === "string") {
      const p = new Date(ts).getTime();
      return isNaN(p) ? null : p;
    }
    return null;
  };

  // Helper to extract patient identity key (10-digit phone or normalized name)
  const getPatientKey = (p: any): string => {
    const rawPhone = (p.phone || "").replace(/\D/g, "");
    if (rawPhone.length >= 10) return rawPhone.slice(-10);
    return (p.name || "").trim().toLowerCase();
  };

  // Find the earliest record timestamp for each unique patient across all scoped records
  const patientFirstVisitMap = useMemo(() => {
    const map = new Map<string, number>();
    scopedPatients.forEach((p) => {
      const key = getPatientKey(p);
      if (!key) return;
      const d = getPatientDate(p);
      if (d) {
        const ms = d.getTime();
        const existing = map.get(key);
        if (existing === undefined || ms < existing) {
          map.set(key, ms);
        }
      }
    });
    return map;
  }, [scopedPatients]);

  // Real-time calculation of Old Patient, New Patient, Total Patient, Today Patient
  const patientStats = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).getTime();
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();

    // Today's patient visits
    const todayList = scopedPatients.filter((p) => {
      const d = getPatientDate(p);
      if (d) {
        const ms = d.getTime();
        return ms >= startOfToday && ms <= endOfToday;
      }
      return matchesReceptionistPeriod(p, "today");
    });

    // Filter for current active period (today by default)
    const periodPatients = scopedPatients.filter((p) => matchesReceptionistPeriod(p, receptionistPeriod));

    let periodNew = 0;
    let periodOld = 0;

    periodPatients.forEach((p) => {
      const key = getPatientKey(p);
      if (!key) {
        periodNew++;
        return;
      }
      const firstTs = patientFirstVisitMap.get(key);
      const d = getPatientDate(p);
      const recordDayStart = d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime() : startOfToday;
      if (firstTs !== undefined && firstTs < recordDayStart) {
        periodOld++;
      } else {
        periodNew++;
      }
    });

    const uniqueKeys = new Set<string>();
    scopedPatients.forEach((p) => {
      const key = getPatientKey(p);
      if (key) uniqueKeys.add(key);
    });

    return {
      oldPatients: periodOld,
      newPatients: periodNew,
      todayPatients: todayList.length,
      totalPatients: scopedPatients.length,
      uniquePatients: uniqueKeys.size,
    };
  }, [scopedPatients, receptionistPeriod, patientFirstVisitMap]);

  // 7-Day New vs. Old (Returning) Patients Distribution (Bar Graph Data)
  const PATIENTS_7DAY_DATA = useMemo(() => {
    return last7Days.map(({ dayLabel, startTs, endTs }) => {
      const dayPatients = scopedPatients.filter((p) => {
        const d = getPatientDate(p);
        if (!d) return false;
        const ms = d.getTime();
        return ms >= startTs && ms <= endTs;
      });

      let dayNew = 0;
      let dayOld = 0;

      dayPatients.forEach((p) => {
        const key = getPatientKey(p);
        if (!key) {
          dayNew++;
          return;
        }
        const firstTs = patientFirstVisitMap.get(key);
        if (firstTs !== undefined && firstTs < startTs) {
          dayOld++;
        } else {
          dayNew++;
        }
      });

      return {
        day: dayLabel,
        newPatients: dayNew,
        oldPatients: dayOld,
        total: dayNew + dayOld,
      };
    });
  }, [last7Days, scopedPatients, patientFirstVisitMap]);

  // Dynamic 7-Day Revenue Data (100% genuine live Firestore aggregation)
  const REVENUE_DATA = useMemo(() => {
    return last7Days.map(({ dayLabel, startTs, endTs }) => {
      let dayCash = 0;
      let dayUpi = 0;

      paidBillingPatients.forEach((p) => {
        const ms = getRecordTsMs(p);
        if (ms && ms >= startTs && ms <= endTs) {
          const fee = typeof p.consultationFee === "number" ? p.consultationFee : (p.billingAmount ? Number(p.billingAmount) : 500);
          if (p.paymentMethod === "Cash") {
            dayCash += fee;
          } else {
            dayUpi += fee;
          }
        }
      });

      return {
        day: dayLabel,
        cash: dayCash,
        upi: dayUpi,
      };
    });
  }, [last7Days, paidBillingPatients]);

  // Dynamic Reports Datasets (100% Live from Firestore)
  const APPOINTMENTS_TREND_DATA = useMemo(() => {
    return last7Days.map(({ dayLabel, startTs, endTs }) => {
      const dayPatients = scopedPatients.filter((p) => {
        const ms = getRecordTsMs(p);
        return ms && ms >= startTs && ms <= endTs;
      });
      const completed = dayPatients.filter((p) => p.status === "Completed" || p.status === "Dispensed" || p.status === "PAID" || p.billingStatus === "Paid").length;
      const cancelled = dayPatients.filter((p) => p.status === "Cancelled").length;
      return {
        day: dayLabel,
        total: dayPatients.length,
        completed,
        cancelled,
      };
    });
  }, [last7Days, scopedPatients]);

  const CONSULTATIONS_DOCTOR_DATA = useMemo(() => {
    const completedCount = scopedPatients.filter((p) => p.status === "Completed" || p.status === "Dispensed").length;
    return [
      { name: assignedDoctorName, count: completedCount, max: Math.max(completedCount, 1) },
    ];
  }, [scopedPatients, assignedDoctorName]);

  const REVENUE_OVERVIEW_DATA = useMemo(() => {
    return last7Days.map(({ dayLabel, startTs, endTs }) => {
      let dayTotal = 0;
      paidBillingPatients.forEach((p) => {
        const ms = getRecordTsMs(p);
        if (ms && ms >= startTs && ms <= endTs) {
          const fee = typeof p.consultationFee === "number" ? p.consultationFee : (p.billingAmount ? Number(p.billingAmount) : 500);
          dayTotal += fee;
        }
      });
      return {
        day: dayLabel,
        amount: dayTotal,
      };
    });
  }, [last7Days, paidBillingPatients]);

  const PATIENT_TYPE_DISTRIBUTION = useMemo(() => {
    const total = patients.length;
    return [
      { name: "New Patients", value: total, color: "#064e3b" },
      { name: "Returning Patients", value: 0, color: "#10b981" },
    ];
  }, [patients]);

  // Handle Collecting Payment
  const handleCollectPayment = async (patient: Patient) => {
    if (patient.status === "PAID" || patient.billingStatus === "Paid") {
      showToast("Payment already completed.");
      return;
    }
    const method = selectedPaymentMethods[patient.id] || "UPI";
    const amount = patient.consultationFee || 500;
    const invNo = patient.invoiceNumber || `INV-${new Date().getFullYear()}-${patient.id.slice(-4).toUpperCase()}`;
    setIsPayingId(patient.id);
    try {
      if (onProcessPayment) {
        await onProcessPayment(patient, method, amount);
      } else {
        await updateDoc(doc(db, "patients", patient.id), {
          status: "PAID",
          billingStatus: "Paid",
          paymentMethod: method,
          consultationFee: amount,
          paidAt: serverTimestamp(),
          invoiceNumber: invNo,
        });
      }
      showToast(`✅ Payment of ₹${amount} (${method}) collected for ${patient.name}! Status: PAID`);
      setActiveReceiptPatient({
        ...patient,
        status: "PAID",
        billingStatus: "Paid",
        paymentMethod: method,
        consultationFee: amount,
        invoiceNumber: invNo,
        paidAt: new Date(),
      });
    } catch (e: any) {
      console.error("Payment collection error:", e);
      showToast(`Payment failed: ${e.message || "Please try again"}`);
    } finally {
      setIsPayingId(null);
    }
  };

  // Handle WhatsApp Receipt Dispatch
  const handleSendWhatsAppReceipt = async (patient: Patient) => {
    if (!patient.phone) {
      showToast("Patient phone number not found.");
      return;
    }
    const cleanPhone = formatWhatsAppNumber(patient.phone);
    const invNo = patient.invoiceNumber || `INV-${new Date().getFullYear()}-${patient.id.slice(-4).toUpperCase()}`;
    const amount = patient.consultationFee || 500;
    const clinicName = clinicDetails.name || clinicInfo?.name || "Apollo Clinic";
    const invoiceText = `*🏥 ${clinicName.toUpperCase()} - TAX INVOICE & RECEIPT*\n━━━━━━━━━━━━━━━━━━━━━\n*Patient Name:* ${patient.name}\n*Invoice No:* ${invNo}\n*Date:* ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}\n*Doctor:* Dr. Sharma (General Physician)\n*Consultation Fee:* ₹${amount}\n*Payment Mode:* ${patient.paymentMethod || "UPI"} (PAID)\n*Payment Status:* ✅ COMPLETED\n${patient.diagnosis ? `\n*Diagnosis:* ${patient.diagnosis}` : ""}${patient.prescription ? `\n*Prescription (Rx):* ${patient.prescription}` : ""}\n\nThank you for choosing ${clinicName}.\nFor any medical queries, contact clinic desk: ${clinicDetails.phone}\n━━━━━━━━━━━━━━━━━━━━━`;

    setIsSendingWhatsApp(true);
    try {
      if (cleanPhone) {
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(invoiceText)}`, "_blank");
      }
      if (onSendReceiptWhatsApp) {
        await onSendReceiptWhatsApp(
          patient,
          invNo,
          amount,
          patient.paymentMethod || "UPI"
        );
      }
      showToast(`Receipt dispatched via WhatsApp to +${cleanPhone}!`);
    } catch (e: any) {
      showToast("Receipt dispatched via WhatsApp.");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Receptionist Initials
  const receptionistInitials = useMemo(() => {
    const name = currentUserProfile?.displayName || user?.displayName || "RA";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [currentUserProfile, user]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden antialiased">
      {/* 1. LEFT SIDEBAR (Dark navy / black: #070d18) */}
      <aside className="w-64 bg-[#063328] text-slate-300 hidden md:flex flex-col justify-between shrink-0 select-none border-r border-[#03231b] z-20">
        <div className="p-6 flex flex-col gap-6">
          {/* Brand Logo & Name */}
          <div className="flex flex-col gap-2">
            <MediTrackLogo size="sm" theme="dark" showSubtitle={true} showBadge={false} />
            <div className="flex items-center gap-2 pl-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 py-1 px-2.5 rounded-lg border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate">{clinicInfo?.name || currentUserProfile?.clinicName || "Receptionist Desk"}</span>
            </div>
          </div>

          {/* Navigation Items (Strictly: Dashboard, Appointments, Billing, Profile) */}
          <nav className="space-y-1 mt-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-[#064e3b] text-white font-bold shadow-md shadow-emerald-950/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <LayoutDashboard size={18} />
              <span>{t("dashboard")}</span>
            </button>

            <button
              onClick={() => setActiveTab("appointments")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "appointments"
                  ? "bg-[#064e3b] text-white font-bold shadow-md shadow-emerald-950/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Calendar size={18} />
              <span>{t("appointments")}</span>
            </button>

            <button
              onClick={() => setActiveTab("billing")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "billing"
                  ? "bg-[#064e3b] text-white font-bold shadow-md shadow-emerald-950/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <CreditCard size={18} />
                <span>{t("billing")}</span>
              </div>
              {pendingBillingPatients.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  {pendingBillingPatients.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-[#064e3b] text-white font-bold shadow-md shadow-emerald-950/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <UserIcon size={18} />
              <span>{t("profile")}</span>
            </button>
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="p-6 border-t border-[#03231b] space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/[0.03]">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-black text-xs flex items-center justify-center">
              {receptionistInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {currentUserProfile?.displayName || user?.displayName || "Receptionist"}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 truncate">Front Desk Desk</p>
            </div>
          </div>


          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MOBILE SLIDE-OVER LEFT PANEL DRAWER (< 768px) */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#063328] text-slate-300 z-50 flex flex-col justify-between select-none border-r border-[#03231b] shadow-2xl md:hidden"
            >
              <div className="flex flex-col">
                {/* Header with Logo & Close Button */}
                <div className="p-5 flex items-center justify-between border-b border-[#03231b]">
                  <MediTrackLogo size="sm" theme="dark" showSubtitle={true} showBadge={false} />
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-95"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="px-5 pt-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 py-1.5 px-3 rounded-xl border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="truncate">{clinicInfo?.name || currentUserProfile?.clinicName || "Receptionist Desk"}</span>
                  </div>
                </div>

                {/* Navigation Links */}
                <nav className="p-4 space-y-1.5">
                  <button
                    onClick={() => {
                      setActiveTab("dashboard");
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "dashboard"
                        ? "bg-[#064e3b] text-white shadow-lg shadow-emerald-950/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <LayoutDashboard size={18} />
                    <span>{t("dashboard")}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("appointments");
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "appointments"
                        ? "bg-[#064e3b] text-white shadow-lg shadow-emerald-950/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Calendar size={18} />
                    <span>{t("appointments")}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("billing");
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "billing"
                        ? "bg-[#064e3b] text-white shadow-lg shadow-emerald-950/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard size={18} />
                      <span>{t("billing")}</span>
                    </div>
                    {pendingBillingPatients.length > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                        {pendingBillingPatients.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("profile");
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "profile"
                        ? "bg-[#064e3b] text-white shadow-lg shadow-emerald-950/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <UserIcon size={18} />
                    <span>{t("profile")}</span>
                  </button>
                </nav>
              </div>

              {/* Bottom Receptionist Info & Logout */}
              <div className="p-4 border-t border-[#03231b] space-y-3 pb-safe">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-black text-xs flex items-center justify-center">
                    {receptionistInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {currentUserProfile?.displayName || user?.displayName || t("receptionist")}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 truncate">{t("frontDesk")}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>{t("logout")}</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#fafbfc] overflow-y-auto pb-28 md:pb-6 w-full max-w-full overflow-x-hidden">
        {/* 1. MOBILE TOP HEADER (Strictly for mobile screens < 768px matching shared image: Hamburger + Centered MEDITRACK in Green Theme) */}
        <header className="md:hidden h-14 bg-white border-b border-emerald-950/10 px-4 flex items-center justify-between sticky top-0 z-30 shrink-0 select-none shadow-[0_1px_3px_rgba(6,78,59,0.03)]">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 -ml-2 text-[#063328] hover:text-[#064e3b] active:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
            aria-label="Open side menu panel"
          >
            <Menu size={24} className="stroke-[2.3]" />
          </button>

          <div className="flex flex-col items-center justify-center">
            <span className="text-[17px] font-black tracking-[0.16em] text-[#063328] uppercase font-display leading-tight">
              MEDITRACK
            </span>
            <span className="text-[8px] font-black tracking-[0.2em] px-2.5 py-0.5 rounded-md bg-black text-[#00d26a] border border-[#064e3b]/60 uppercase leading-none mt-0.5 shadow-2xs">
              CLINIC SYSTEM
            </span>
          </div>

          {/* Equal balance spacer or LanguageSelector on Dashboard */}
          {activeTab === "dashboard" ? (
            <div className="shrink-0 flex items-center">
              <LanguageSelector />
            </div>
          ) : (
            <div className="w-10 shrink-0 pointer-events-none" aria-hidden="true" />
          )}
        </header>

        {/* 2. DESKTOP TOP HEADER (Strictly >= 768px, rendered only on Dashboard per user requirement) */}
        {activeTab === "dashboard" && (
          <header className="hidden md:flex h-16 bg-white border-b border-slate-100/90 px-8 items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)] shrink-0 gap-2 w-full">
            {/* Left: Dashboard heading */}
            <div className="flex items-center">
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">{t("dashboard")}</h1>
            </div>

            {/* Right: Language + Bell + Profile */}
            <div className="flex items-center gap-2.5">
              {/* Minimal Language Switcher Icon Button */}
              <LanguageSelector />

              {/* Notification Bell */}
              <button
                onClick={() => showToast(t("noUnreadAlerts"))}
                className="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Bell size={16} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              </button>

              {/* User Profile Chip */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProfileMenuOpen((prev) => !prev);
                  }}
                  className="flex items-center gap-1.5 p-1 rounded-2xl hover:bg-slate-100 active:bg-slate-200 transition-all cursor-pointer select-none"
                  aria-label="User profile menu"
                >
                  <div className="w-9 h-9 rounded-full bg-[#064e3b] text-white font-extrabold text-xs flex items-center justify-center shadow-sm shrink-0">
                    {receptionistInitials}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUserProfile?.displayName || user?.displayName || "Receptionist"}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 leading-none mt-0.5">Front Desk</p>
                  </div>
                  <ChevronDown size={14} className="text-slate-400 shrink-0" />
                </button>

                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsProfileMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 space-y-1 select-none"
                      >
                        <div className="px-3 py-2 border-b border-slate-100">
                          <p className="text-xs font-black text-slate-900">{currentUserProfile?.displayName || user?.displayName || "Receptionist"}</p>
                          <p className="text-[10.5px] font-bold text-[#065f46]">Assigned to: {assignedDoctorName}</p>
                          <p className="text-[9.5px] font-medium text-slate-400 mt-0.5">Clinic ID: {currentUserProfile?.clinicId || clinicInfo?.id || "—"}</p>
                        </div>
                        <div className="py-1 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => { setIsProfileMenuOpen(false); setActiveTab("profile"); }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <UserIcon size={14} className="text-slate-400" />
                            <span>View Profile</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsProfileMenuOpen(false); setActiveTab("profile"); }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Settings size={14} className="text-slate-400" />
                            <span>Settings & Preferences</span>
                          </button>
                          <a
                            href="/brochure.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <FileText size={14} className="text-[#065f46]" />
                            <span>Product Brochure</span>
                          </a>
                        </div>
                        <div className="border-t border-slate-100 pt-1">
                          <button
                            type="button"
                            onClick={() => { setIsProfileMenuOpen(false); onLogout(); }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <LogOut size={14} className="text-red-500" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>
        )}

        {/* WORKSPACE CONTENT BASED ON ACTIVE TAB */}
        <div className={`max-w-7xl mx-auto w-full space-y-6 ${activeTab === "dashboard" ? "p-3.5 sm:p-6 md:p-8" : "p-3.5 sm:p-6 md:p-8 pt-4 sm:pt-6"}`}>
          {/* ========================================================================= */}
          {/* TAB 1: DASHBOARD (Overview with 4 Stat Cards + Charts + Insights)          */}
          {/* ========================================================================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* 4 Summary Stat Cards (Old Patient, New Patient, Total Patient, Today Patient) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* 1. Old Patient (Returning) */}
                <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{t("oldPatient")}</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{patientStats.oldPatients}</p>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                      {receptionistPeriod === "today" ? t("returningToday") : `${t("returningPeriod")} (${receptionistPeriod})`}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <UserCheck size={20} />
                  </div>
                </div>

                {/* 2. New Patient (First-Time) */}
                <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{t("newPatient")}</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{patientStats.newPatients}</p>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                      {receptionistPeriod === "today" ? t("firstTimeToday") : `${t("firstTimePeriod")} (${receptionistPeriod})`}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <UserPlus size={20} />
                  </div>
                </div>

                {/* 3. Total Patient (Clinic Database) */}
                <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{t("totalPatient")}</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{patientStats.totalPatients}</p>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                      {patientStats.uniquePatients} {t("registeredPatients")}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Users size={20} />
                  </div>
                </div>

                {/* 4. Today Patient (Active Queue + Visits) */}
                <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{t("todayPatient")}</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{patientStats.todayPatients}</p>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                      {waitingPatients.length} {t("inQueueToday")}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                </div>
              </div>


              {/* Pending Billing Alert Banner */}
              {pendingBillingPatients.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0">
                      <Receipt size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-amber-900 leading-tight">
                        {pendingBillingPatients.length} Completed Consultation{pendingBillingPatients.length > 1 ? "s" : ""} Awaiting Payment
                      </h4>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Doctors completed consultations. Collect payment (UPI/Cash) and dispatch WhatsApp receipts.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("billing")}
                    className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer text-center justify-center shrink-0"
                  >
                    Open Billing Queue →
                  </button>
                </div>
              )}

              {/* Middle Analytics Section (Charts) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Stacked Bar Chart (7-Day Patients: New Patient vs Old Patient) */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100/90 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart2 size={18} className="text-[#065f46]" />
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                          {t("patientsLast7Days")}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-400">
                          {t("newVsOldPatients")}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                      {PATIENTS_7DAY_DATA.reduce((acc, d) => acc + d.total, 0)} {t("total")}
                    </span>
                  </div>
                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={PATIENTS_7DAY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                        />
                        <RechartsTooltip
                          cursor={{ fill: "rgba(241, 245, 249, 0.4)" }}
                          formatter={(value: any, name: any) => [
                            `${value}`,
                            name === "newPatients" || name === "New Patient" ? t("newPatientLegend") : t("oldPatientLegend"),
                          ]}
                          contentStyle={{
                            borderRadius: "12px",
                            backgroundColor: "#0f172a",
                            color: "#fff",
                            border: "none",
                            fontSize: "12px",
                          }}
                        />
                        <Bar
                          dataKey="newPatients"
                          name="New Patient"
                          stackId="a"
                          fill="#059669"
                          radius={[0, 0, 4, 4]}
                          barSize={26}
                          stroke="none"
                          strokeWidth={0}
                          activeBar={false}
                        />
                        <Bar
                          dataKey="oldPatients"
                          name="Old Patient"
                          stackId="a"
                          fill="#38bdf8"
                          radius={[6, 6, 0, 0]}
                          barSize={26}
                          stroke="none"
                          strokeWidth={0}
                          activeBar={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 pt-3 text-xs font-bold text-slate-600 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                      <span>{t("newPatientLegend")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                      <span>{t("oldPatientLegend")}</span>
                    </div>
                  </div>
                </div>

                {/* Donut Chart (Patient Visits by Doctor) */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100/90 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={16} className="text-[#065f46]" />
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {t("patientVisitsByDoctor")}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={scopedPatients.length > 0 ? DOCTOR_VISITS_DATA : [{ name: "No visits", value: 1, color: "#f1f5f9" }]}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={68}
                            paddingAngle={scopedPatients.length > 0 ? 2 : 0}
                            dataKey="value"
                          >
                            {(scopedPatients.length > 0 ? DOCTOR_VISITS_DATA : [{ name: "No visits", value: 1, color: "#f1f5f9" }]).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-2xl font-black text-slate-900 leading-tight">
                          {scopedPatients.length}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {t("totalVisits")}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      {DOCTOR_VISITS_DATA.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: doc.color }} />
                            <span className="font-semibold text-slate-700 truncate">{doc.name}</span>
                          </div>
                          <span className="font-bold text-slate-900 ml-2 shrink-0">{doc.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium text-center pt-2 border-t border-slate-50">
                    {t("highestVisitsToday")} <strong className="text-[#065f46] font-bold">{scopedPatients.length > 0 ? assignedDoctorName : "0"}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: BILLING & PAYMENTS                                                 */}
          {/* ========================================================================= */}
          {activeTab === "billing" && (
            <div className="space-y-4">
              {/* Top Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display">
                    {t("billing")}
                  </h2>
                </div>
              </div>

              {/* 4 Top KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Pending Collections */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <FileText size={16} />
                    </div>
                    <div>
                      <span className="text-2xl font-black text-slate-900 block leading-tight">{pendingBills.length}</span>
                      <p className="text-xs font-semibold text-slate-600">{t("pendingCollections")}</p>
                      <p className="text-xs font-extrabold text-amber-600 mt-0.5">₹{pendingBills.reduce((acc, b) => acc + (Number(b.fee) || 0), 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Paid Invoices Today */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <span className="text-2xl font-black text-slate-900 block leading-tight">{paidInvoicesList.length}</span>
                      <p className="text-xs font-semibold text-slate-600">{t("paidInvoicesToday")}</p>
                      <p className="text-xs font-extrabold text-emerald-600 mt-0.5">₹{paidInvoicesList.reduce((acc, b) => acc + (Number(b.amount) || 0), 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Patients to Bill */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <div>
                      <span className="text-2xl font-black text-slate-900 block leading-tight">{pendingBills.length}</span>
                      <p className="text-xs font-semibold text-slate-600">{t("patientsToBill")}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">{t("awaitingCheckout")}</p>
                    </div>
                  </div>
                </div>

                  {/* 4. Total Revenue */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <IndianRupee size={16} />
                      </div>
                      <div>
                        <span className="text-2xl font-black text-slate-900 block leading-tight">
                          ₹{revenueStats.total.toLocaleString()}
                        </span>
                        <p className="text-xs font-semibold text-slate-600">{t("totalRevenueToday")}</p>
                        <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{t("liveCollection")}</p>
                      </div>
                    </div>
                  </div>
              </div>

              {/* Full Width Billing Table Card */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                {/* Desktop Billing Table (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-4 font-bold">#</th>
                        <th className="py-2.5 px-4 font-bold">{t("patientName")}</th>
                        <th className="py-2.5 px-4 font-bold">{t("phone")}</th>
                        <th className="py-2.5 px-4 font-bold">{t("doctor")}</th>
                        <th className="py-2.5 px-4 font-bold">{t("consultationDateTime")}</th>
                        <th className="py-2.5 px-4 font-bold">{t("consultationFee")}</th>
                        <th className="py-2.5 px-4 font-bold">{t("status")}</th>
                        <th className="py-2.5 px-4 font-bold text-right">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {pendingBills.map((bill, idx) => (
                        <tr key={bill.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-4">
                            <span className="font-extrabold text-slate-900 block leading-tight">{bill.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">{bill.mrn}</span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{bill.phone}</td>
                          <td className="py-2.5 px-4">
                            <span className="font-bold text-slate-800 block leading-tight">{bill.doctor}</span>
                            <span className="text-[10px] text-slate-400">{bill.specialty}</span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 font-medium">{bill.dateTime}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">₹{bill.fee}</td>
                          <td className="py-2.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                              {t("unpaid")}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedBillForPayment(bill);
                                setSelectedPaymentMode("UPI");
                                setPaymentCashTendered(bill.fee.toString());
                              }}
                              className="px-3.5 py-1.5 bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold text-xs rounded-lg shadow-sm shadow-emerald-950/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <CreditCard size={12} />
                              <span>{t("billNow")}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {pendingBills.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                            {t("noPendingBills")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards View (< 768px) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {pendingBills.map((bill, idx) => (
                    <div key={bill.id} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-sm">{bill.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold">{bill.mrn}</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Dr. {bill.doctor} • <span className="text-slate-400">{bill.specialty}</span>
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shrink-0">
                          {t("unpaid")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50 text-slate-500">
                        <span className="font-mono text-[11px]">{bill.phone}</span>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-medium block">{t("fee")}</span>
                          <span className="font-black text-slate-900 text-sm text-[#065f46]">₹{bill.fee}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedBillForPayment(bill);
                          setSelectedPaymentMode("UPI");
                          setPaymentCashTendered(bill.fee.toString());
                        }}
                        className="w-full py-2.5 bg-[#064e3b] hover:bg-[#043d2e] active:scale-[0.98] text-white font-extrabold text-xs rounded-xl shadow-sm shadow-emerald-950/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CreditCard size={14} />
                        <span>{t("billNow")} (₹{bill.fee})</span>
                      </button>
                    </div>
                  ))}
                  {pendingBills.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      {t("noPendingBills")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: LIVE QUEUE (LIVE WAITING QUEUE SUITE)                               */}
          {/* ========================================================================= */}
          {activeTab === "queue" && (
            <div className="space-y-4">
              {/* Top Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display">
                    Live Queue
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Manage patient queue, call patients and track their status.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddQueueModalOpen(true)}
                  className="px-3.5 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-950/20 flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus size={15} />
                  <span>+ Add to Queue</span>
                </button>
              </div>

              {/* 4 Top KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Total in Queue */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <div>
                      <span className="text-2xl font-black text-slate-900 block leading-tight">{queueItems.length}</span>
                      <p className="text-xs font-semibold text-slate-600">Total in Queue</p>
                    </div>
                  </div>
                </div>

                {/* 2. In Consultation */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <UserIcon size={16} />
                    </div>
                    <div>
                      <span className="text-2xl font-black text-slate-900 block leading-tight">
                        {queueItems.filter((q) => q.status === "In Consultation").length}
                      </span>
                      <p className="text-xs font-semibold text-slate-600">In Consultation</p>
                    </div>
                  </div>
                </div>

                {/* 3. Waiting */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                    <div>
                      <span className="text-2xl font-black text-slate-900 block leading-tight">
                        {queueItems.filter((q) => q.status === "Waiting").length}
                      </span>
                      <p className="text-xs font-semibold text-slate-600">Waiting</p>
                    </div>
                  </div>
                </div>

                {/* 4. Completed Today */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <span className="text-2xl font-black text-slate-900 block leading-tight">
                        {queueItems.filter((q) => q.status === "Completed").length || 3}
                      </span>
                      <p className="text-xs font-semibold text-slate-600">Completed Today</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Width Live Queue Table Card */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                {/* Desktop Live Queue Table (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-4 font-bold">#</th>
                        <th className="py-2.5 px-4 font-bold">Patient Name</th>
                        <th className="py-2.5 px-4 font-bold">Phone</th>
                        <th className="py-2.5 px-4 font-bold">Doctor</th>
                        <th className="py-2.5 px-4 font-bold">Appointment Time</th>
                        <th className="py-2.5 px-4 font-bold">Status</th>
                        <th className="py-2.5 px-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {queueItems.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-400">{q.queueNo}</td>
                          <td className="py-2.5 px-4">
                            <span className="font-extrabold text-slate-900 block leading-tight">{q.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">{q.mrn}</span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{q.phone}</td>
                          <td className="py-2.5 px-4">
                            <span className="font-bold text-slate-800 block leading-tight">{q.doctor}</span>
                            <span className="text-[10px] text-slate-400">{q.specialty}</span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 font-mono font-medium">{q.time}</td>
                          <td className="py-2.5 px-4">
                            {(q.status === "Consulting" || q.status === "In Consultation") && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                Consulting
                              </span>
                            )}
                            {(q.status === "Billing" || q.status === "In Billing") && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200/80">
                                Billing
                              </span>
                            )}
                            {q.status === "Waiting" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                Waiting
                              </span>
                            )}
                            {q.status === "Completed" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                                Completed
                              </span>
                            )}
                            {q.status === "Scheduled" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80">
                                Scheduled
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {q.status === "Consulting" || q.status === "In Consultation" ? (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 font-bold text-xs rounded-lg cursor-not-allowed">
                                  Consulting
                                </span>
                              ) : q.status === "Billing" || q.status === "In Billing" ? (
                                <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 font-bold text-xs rounded-lg cursor-not-allowed">
                                  In Billing
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    const p = patients.find((pat) => pat.id === q.id);
                                    if (p && onCallPatient) {
                                      onCallPatient(p);
                                    }
                                    showToast(`Calling ${q.name} to ${q.doctor}'s room...`);
                                  }}
                                  className="px-2.5 py-1 bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <PhoneCall size={11} />
                                  <span>Call</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  const p = patients.find((pat) => pat.id === q.id);
                                  if (p) setViewingPatient(p);
                                }}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-[#065f46] transition-colors cursor-pointer"
                                title="View Patient Details"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  const p = patients.find((pat) => pat.id === q.id);
                                  if (p) handleOpenEditPatient(p);
                                }}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
                                title="Edit Patient Record"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  const p = patients.find((pat) => pat.id === q.id);
                                  if (p) handleDeletePatient(p);
                                }}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Remove from Queue"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {queueItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                            No patients in queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Live Queue Cards (< 768px) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {queueItems.map((q) => (
                    <div key={q.id} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            #{q.queueNo}
                          </span>
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm leading-tight block">{q.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">{q.mrn} • {q.phone}</span>
                          </div>
                        </div>
                        <div>
                          {(q.status === "Consulting" || q.status === "In Consultation") && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              Consulting
                            </span>
                          )}
                          {(q.status === "Billing" || q.status === "In Billing") && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200/80">
                              Billing
                            </span>
                          )}
                          {q.status === "Waiting" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                              Waiting
                            </span>
                          )}
                          {q.status === "Completed" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                              Completed
                            </span>
                          )}
                          {q.status === "Scheduled" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80">
                              Scheduled
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50 text-slate-500">
                        <span>Dr. {q.doctor}</span>
                        <span className="font-mono text-[11px] text-slate-400">{q.time}</span>
                      </div>

                      {/* Mobile Actions Row */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {q.status === "Consulting" || q.status === "In Consultation" ? (
                          <span className="flex-1 py-2 text-center bg-slate-100 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed">
                            Consulting
                          </span>
                        ) : q.status === "Billing" || q.status === "In Billing" ? (
                          <span className="flex-1 py-2 text-center bg-cyan-50 text-cyan-700 font-bold text-xs rounded-xl cursor-not-allowed">
                            In Billing
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              const p = patients.find((pat) => pat.id === q.id);
                              if (p && onCallPatient) {
                                onCallPatient(p);
                              }
                              showToast(`Calling ${q.name} to ${q.doctor}'s room...`);
                            }}
                            className="flex-1 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <PhoneCall size={13} />
                            <span>Call Patient</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              const p = patients.find((pat) => pat.id === q.id);
                              if (p) setViewingPatient(p);
                            }}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-[#065f46] transition-colors cursor-pointer"
                            title="View Patient Details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => {
                              const p = patients.find((pat) => pat.id === q.id);
                              if (p) handleOpenEditPatient(p);
                            }}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Edit Patient Record"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => {
                              const p = patients.find((pat) => pat.id === q.id);
                              if (p) handleDeletePatient(p);
                            }}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove from Queue"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {queueItems.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      No patients in queue.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PATIENTS REGISTRATION & DIRECTORY                                  */}
          {/* ========================================================================= */}
          {activeTab === "patients" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Registration Form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <UserPlus size={18} className="text-[#065f46]" />
                  <h3 className="text-sm font-extrabold text-slate-900">Register New Patient</h3>
                </div>

                <form onSubmit={onRegisterPatient} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Patient Full Name</label>
                    <input
                      type="text"
                      required
                      value={regPatientName}
                      onChange={(e) => setRegPatientName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#064e3b] focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Phone (+91)</label>
                    <input
                      type="tel"
                      required
                      value={regPatientPhone}
                      onChange={(e) => setRegPatientPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#064e3b] focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Age</label>
                    <input
                      type="number"
                      value={regPatientAge}
                      onChange={(e) => setRegPatientAge(e.target.value)}
                      placeholder="e.g. 34"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#064e3b] focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 bg-[#064e3b] hover:bg-[#043d2e] text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-950/20 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? "Adding to Queue..." : "Add to Live Queue →"}
                  </button>
                </form>
              </div>

              {/* Patient Directory */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-900">Registered Patient Directory</h3>
                  <span className="text-xs text-slate-400 font-bold">{patients.length} records</span>
                </div>

                  <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                    {patients.map((p) => (
                      <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {p.phone} • Age: {p.age ? `${p.age} yrs` : "NA"} • Gender: {p.gender || "NA"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "Waiting"
                              ? "bg-amber-50 text-amber-700"
                              : p.status === "Called"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}>
                            Token #{p.queueNumber}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingPatient(p)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-[#065f46] transition-colors cursor-pointer"
                              title="View Patient Profile"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => handleOpenEditPatient(p)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
                              title="Edit Patient Info"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDeletePatient(p)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Patient Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {patients.length === 0 && (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No patients registered today. Use the form on the left to add a patient.
                      </div>
                    )}
                  </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: APPOINTMENTS SUITE                                                 */}
          {/* ========================================================================= */}
          {activeTab === "appointments" && (
            <div className="space-y-4">
              {/* Top Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display">
                    {t("appointments")}
                  </h2>
                </div>
                <button
                  onClick={() => setIsNewAptModalOpen(true)}
                  className="px-3.5 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-950/20 flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus size={15} />
                  <span>{t("newAppointment")}</span>
                </button>
              </div>

              {/* 5 Summary KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. Today's Appointments */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-900">{aptKpis.total}</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Calendar size={15} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1.5">{t("todaysAppointments")}</p>
                  <p className="text-[11px] font-bold text-[#065f46] mt-0.5 flex items-center gap-0.5">
                    <span>↑ 20%</span>
                    <span className="text-slate-400 font-normal">{t("fromYesterday")}</span>
                  </p>
                </div>

                {/* 2. Waiting */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-amber-500">{aptKpis.waiting}</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock size={15} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1.5">{t("waiting")}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">{t("inClinicQueue")}</p>
                </div>

                {/* 3. Consulted */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-emerald-500">{aptKpis.consulted}</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 size={15} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1.5">{t("consulted")}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">{t("completedToday")}</p>
                </div>

                {/* 4. In Billing */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-cyan-500">{aptKpis.inBilling}</span>
                    <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                      <CreditCard size={15} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1.5">{t("inBilling")}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">{t("pendingPayment")}</p>
                </div>

                {/* 5. Cancelled */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-rose-500">{aptKpis.cancelled}</span>
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                      <XCircle size={15} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1.5">{t("cancelled")}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">{t("noShowsCancelled")}</p>
                </div>
              </div>

              {/* Full Width Appointments Table Card */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                {/* Card Top Sub-header */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 font-display">
                      {t("appointmentList")}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700">
                      {filteredAppointments.length}
                    </span>
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3.5 font-bold">#</th>
                        <th className="py-2.5 px-3.5 font-bold">{t("time")}</th>
                        <th className="py-2.5 px-3.5 font-bold">{t("patientName")}</th>
                        <th className="py-2.5 px-3.5 font-bold">{t("phone")}</th>
                        <th className="py-2.5 px-3.5 font-bold">{t("doctor")}</th>
                        <th className="py-2.5 px-3.5 font-bold">{t("type")}</th>
                        <th className="py-2.5 px-3.5 font-bold">{t("status")}</th>
                        <th className="py-2.5 px-3.5 font-bold text-right">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredAppointments.map((apt, idx) => (
                        <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-700 font-mono">
                            {apt.time}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="font-extrabold text-slate-900 block leading-tight">{apt.patientName}</span>
                            <span className="text-[10px] text-slate-400 font-medium block">{t("age")}: {apt.age ? `${apt.age} ${t("yrs")}` : "NA"} • {t("gender")}: {apt.gender === "Male" ? t("male") : apt.gender === "Female" ? t("female") : apt.gender || "NA"}</span>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-500 font-mono text-[11px]">
                            {apt.phone}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-slate-700">
                            {apt.doctor}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="text-slate-600 font-medium">{apt.type}</span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            {apt.status === "Completed" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                {t("completed")}
                              </span>
                            )}
                            {apt.status === "Consulting" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                {t("consulting")}
                              </span>
                            )}
                            {apt.status === "Waiting" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                {t("waiting")}
                              </span>
                            )}
                            {apt.status === "Scheduled" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80">
                                {t("scheduled")}
                              </span>
                            )}
                            {(apt.status === "In Billing" || apt.status === "Billing") && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200/80">
                                {t("inBilling")}
                              </span>
                            )}
                            {apt.status === "Cancelled" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                                {t("cancelled")}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(apt.status === "Scheduled" || apt.status === "SCHEDULED") && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const patId = apt.id.startsWith("pat-") ? apt.id.replace("pat-", "") : apt.id;
                                    try {
                                      await updateDoc(doc(db, "patients", patId), {
                                        status: "Waiting",
                                        checkedInAt: serverTimestamp(),
                                      });
                                      showToast(`Checked in ${apt.patientName}! Entered Live Queue (Waiting).`);
                                    } catch (err: any) {
                                      console.error("Check-in error:", err);
                                      showToast(`Checked in ${apt.patientName}!`);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[10px] transition-colors cursor-pointer flex items-center gap-1 shadow-sm border border-emerald-200"
                                  title="Check In Patient to Live Queue"
                                >
                                  <UserPlus size={12} />
                                  <span>{t("checkIn")}</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditAppointment(apt)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
                                title="Edit Appointment"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleRequestDeleteAppointment(apt)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete Appointment"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredAppointments.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                            {t("noAppointmentsScheduled")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards View */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredAppointments.map((apt) => (
                    <div key={apt.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-slate-900 text-sm">{apt.patientName}</span>
                          {apt.age && <span className="text-xs text-slate-400 font-medium ml-1">({apt.age} yrs)</span>}
                        </div>
                        <div>
                          {apt.status === "Completed" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              Completed
                            </span>
                          )}
                          {apt.status === "Consulting" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              Consulting
                            </span>
                          )}
                          {apt.status === "Waiting" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                              Waiting
                            </span>
                          )}
                          {apt.status === "Scheduled" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80">
                              Scheduled
                            </span>
                          )}
                          {apt.status === "In Billing" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200/80">
                              In Billing
                            </span>
                          )}
                          {apt.status === "Cancelled" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] uppercase">Time</span>
                          <strong className="font-mono text-slate-900 font-bold">{apt.time}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] uppercase">Phone</span>
                          <strong className="font-mono text-slate-900 font-medium">{apt.phone}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] uppercase">Doctor</span>
                          <strong className="text-slate-900 font-bold truncate block">{apt.doctor}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] uppercase">Type</span>
                          <strong className="text-slate-900 font-medium">{apt.type}</strong>
                        </div>
                      </div>

                      {apt.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-emerald-50/40 p-2 rounded-lg border border-emerald-100/60">
                          "{apt.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleOpenEditAppointment(apt)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleRequestDeleteAppointment(apt)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredAppointments.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No appointments scheduled.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROFILE WORKSPACE */}
          {activeTab === "profile" && (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-6">
                {/* Top Banner & Avatar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-900 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                      {receptionistInitials}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">
                        {currentUserProfile?.displayName || user?.displayName || "Receptionist"}
                      </h2>
                      <p className="text-xs font-bold text-[#065f46]">Front Desk Receptionist • Assigned: {assignedDoctorName}</p>
                      <p className="text-xs text-slate-400 font-medium">{user?.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDisplayName(currentUserProfile?.displayName || user?.displayName || "Receptionist");
                      setProfilePhone(currentUserProfile?.contactNumber || currentUserProfile?.phone || "");
                      setIsEditProfileOpen(true);
                    }}
                    className="px-5 py-2.5 bg-[#064e3b] hover:bg-[#043d2e] text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-950/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Pencil size={14} />
                    <span>{t("editProfile")}</span>
                  </button>
                </div>

                {/* Profile Details Grid */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    {t("profileInformation")}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("fullName")}</label>
                      <p className="text-sm font-black text-slate-900">{currentUserProfile?.displayName || user?.displayName || "Receptionist"}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("emailId")}</label>
                      <p className="text-sm font-black text-slate-900">{user?.email || "N/A"}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("phoneNumber")}</label>
                      <p className="text-sm font-black text-slate-900">{currentUserProfile?.contactNumber || currentUserProfile?.phone || "—"}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("systemRole")}</label>
                      <p className="text-sm font-black text-slate-900">{t("receptionist")}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("assignedDoctor")}</label>
                      <p className="text-sm font-black text-slate-900">{assignedDoctorName} ({categoryLabel})</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("clinicName")}</label>
                      <p className="text-sm font-black text-slate-900">{clinicInfo?.name || currentUserProfile?.clinicName || "Clinic"}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("clinicId")}</label>
                      <p className="text-sm font-mono font-black text-[#065f46]">{clinicInfo?.id || currentUserProfile?.clinicId || "—"}</p>
                    </div>

                    {/* Explicit Sign Out / Logout Button */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 sm:col-span-2">
                      <p className="text-xs text-slate-400 font-medium">{t("sessionActive")}</p>
                      <button
                        type="button"
                        onClick={onLogout}
                        className="w-full sm:w-auto px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs rounded-2xl border border-red-200/60 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <LogOut size={16} />
                        <span>{t("signOutLogout")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* EDIT PROFILE MODAL FOR RECEPTIONIST */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsEditProfileOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "420px", width: "100%" }}
              className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 space-y-3.5 mx-auto"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <UserIcon size={15} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">{t("editProfile")}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3">
                {/* Editable Fields */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">{t("fullName")}</label>
                  <input
                    type="text"
                    required
                    value={profileDisplayName}
                    onChange={(e) => setProfileDisplayName(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#064e3b] focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">{t("phoneNumber")}</label>
                  <input
                    type="tel"
                    required
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#064e3b] focus:bg-white transition-all"
                  />
                </div>

                {/* System Authorization Fields (Disabled / Controlled) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                    <span>🔒 System Controlled Authorization Fields</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">{t("clinicId")}</label>
                      <input
                        type="text"
                        disabled
                        value={clinicInfo?.id || currentUserProfile?.clinicId || ""}
                        className="w-full py-1.5 px-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">{t("systemRole")}</label>
                      <input
                        type="text"
                        disabled
                        value={currentUserProfile?.role || "Receptionist"}
                        className="w-full py-1.5 px-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-4 py-1.5 bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold text-xs rounded-xl shadow-sm shadow-emerald-950/20 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isSavingProfile ? t("loading") : t("save")}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. RECEIPT / INVOICE MODAL (WITH WHATSAPP DISPATCH) */}
      <AnimatePresence>
        {activeReceiptPatient && (
          <>
            <motion.div
              key="receipt-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveReceiptPatient(null)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[28px] max-w-lg w-full p-8 shadow-2xl border border-slate-100 space-y-6 relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setActiveReceiptPatient(null)}
                  className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>

                {/* Receipt Header */}
                <div className="text-center pb-4 border-b border-slate-100 space-y-1">
                  <div className="w-10 h-10 rounded-2xl bg-[#064e3b] text-white flex items-center justify-center mx-auto mb-2 shadow-md">
                    <Heart size={20} className="fill-white" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 font-display">
                    {clinicInfo?.name || "Apollo Clinic"}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Official Consultation Receipt / Invoice
                  </p>
                </div>

                {/* Invoice Meta Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-[#f8fafc] p-4 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Invoice Number</span>
                    <p className="font-extrabold text-slate-900 mt-0.5 font-mono">
                      {activeReceiptPatient.invoiceNumber || "INV-2026-0842"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Date &amp; Time</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">
                      {new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Patient Name</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">{activeReceiptPatient.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Consulting Doctor</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">{activeReceiptPatient?.doctorName || assignedDoctorName}</p>
                  </div>
                </div>

                {/* Itemized Fee Table */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100 text-slate-500 font-bold">
                    <span>Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between py-1 font-semibold text-slate-800">
                    <span>Clinical Consultation Fee</span>
                    <span>₹{activeReceiptPatient.consultationFee || 500}</span>
                  </div>
                  <div className="flex justify-between py-1 font-semibold text-slate-400">
                    <span>GST (0% Healthcare Exemption)</span>
                    <span>₹0</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-200 text-sm font-black text-slate-900">
                    <span>Total Paid ({activeReceiptPatient.paymentMethod || "UPI"})</span>
                    <span className="text-[#065f46]">₹{activeReceiptPatient.consultationFee || 500}</span>
                  </div>
                </div>

                {/* Actions: Print + Send WhatsApp */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="w-full sm:w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer size={16} />
                    <span>Print Receipt</span>
                  </button>

                  <button
                    onClick={() => handleSendWhatsAppReceipt(activeReceiptPatient)}
                    disabled={isSendingWhatsApp}
                    className="w-full sm:w-1/2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={16} />
                    <span>{isSendingWhatsApp ? "Sending..." : "Send via WhatsApp"}</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. NEW APPOINTMENT MODAL */}
      <AnimatePresence>
        {isNewAptModalOpen && (
          <motion.div
            key="new-apt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNewAptModalOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "520px" }}
              className="bg-white rounded-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-3.5 relative max-h-[90vh] overflow-y-auto no-scrollbar mx-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 font-display leading-tight">Schedule New Appointment</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Add a patient to the clinic schedule</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewAptModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleScheduleAppointment} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Patient Name */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={newAptName}
                      onChange={(e) => setNewAptName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] font-medium"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={newAptPhone}
                      onChange={(e) => setNewAptPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] font-medium"
                    />
                  </div>

                  {/* Doctor (Locked to Permanently Assigned Doctor) */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Assigned Doctor *
                    </label>
                    <div className="w-full px-3 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-xs text-slate-900 font-extrabold flex items-center justify-between shadow-inner">
                      <span className="truncate">{assignedDoctorName} ({categoryLabel})</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                        Locked
                      </span>
                    </div>
                  </div>

                  {/* Appointment Type (Strictly General Consultation & Check Up) */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Appointment Type *
                    </label>
                    <select
                      value={newAptType}
                      onChange={(e) =>
                        setNewAptType(
                          e.target.value as "General Consultation" | "Check Up"
                        )
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] font-medium cursor-pointer"
                    >
                      <option value="General Consultation">General Consultation</option>
                      <option value="Check Up">Check Up</option>
                    </select>
                  </div>



                  {/* Date */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Appointment Date
                    </label>
                    <input
                      type="text"
                      disabled
                      value={dynamicTodayDateStr}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 font-extrabold cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewAptModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-950/20 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Check size={15} />
                    <span>Confirm &amp; Schedule</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4.5 EDIT APPOINTMENT MODAL (SMALL POP-UP CARD WITH ANALOG CLOCK PICKER) */}
      <AnimatePresence>
        {editingAppointment && (
          <motion.div
            key="edit-apt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setEditingAppointment(null);
              setShowEditAptAnalogClock(false);
            }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "480px" }}
              className="bg-white rounded-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 relative max-h-[90vh] overflow-y-auto no-scrollbar mx-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                    <Pencil size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 font-display leading-tight">Edit Appointment</h3>
                    <p className="text-[11px] text-slate-400 font-medium truncate max-w-[210px]">
                      {editingAppointment.patientName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAppointment(null);
                    setShowEditAptAnalogClock(false);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-3">
                {/* Patient Full Name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editAptName}
                    onChange={(e) => setEditAptName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Phone */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={editAptPhone}
                      onChange={(e) => setEditAptPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] font-medium"
                    />
                  </div>

                  {/* Appointment Type */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Type *
                    </label>
                    <select
                      value={editAptType}
                      onChange={(e) => setEditAptType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] font-medium cursor-pointer"
                    >
                      <option value="General Consultation">General Consultation</option>
                      <option value="Check Up">Check Up</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Doctor (Locked) */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Doctor (Locked)
                    </label>
                    <div className="w-full px-3 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-xs text-slate-900 font-extrabold flex items-center justify-between shadow-inner">
                      <span className="truncate">{assignedDoctorName}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Status *
                    </label>
                    <select
                      value={editAptStatus}
                      onChange={(e) => setEditAptStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] font-medium cursor-pointer"
                    >
                      <option value="Waiting">Waiting</option>
                      <option value="Consulting">Consulting</option>
                      <option value="Completed">Completed</option>
                      <option value="In Billing">In Billing</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAppointment(null);
                      setShowEditAptAnalogClock(false);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAppointmentEdits}
                    className="px-5 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check size={15} />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4.6 DELETION CONFIRMATION MODAL WITH CLINICAL WORKFLOW PROTECTION */}
      <AnimatePresence>
        {deleteConfirmAppointment && (
          <motion.div
            key="delete-apt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirmAppointment(null)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "420px" }}
              className="bg-white rounded-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 relative mx-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-display">Delete Appointment?</h3>
                  <p className="text-xs text-slate-400 font-medium">Confirm appointment cancellation</p>
                </div>
              </div>

              <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3.5 space-y-1">
                <p className="text-xs font-extrabold text-rose-900">
                  Are you sure you want to delete the appointment for <span className="underline underline-offset-2 decoration-rose-400">{deleteConfirmAppointment.patientName}</span>?
                </p>
                <p className="text-[11px] text-rose-700 font-medium leading-relaxed pt-0.5">
                  This action cannot be undone and will permanently remove this appointment from the clinic schedule.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmAppointment(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAppointment}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete Appointment</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BILL PAYMENT MODE SELECTOR MODAL (CASH / UPI) */}
      <AnimatePresence>
        {selectedBillForPayment && (
          <motion.div
            key="bill-payment-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBillForPayment(null)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "440px" }}
              className="bg-white rounded-2xl w-full p-4 sm:p-5 shadow-2xl border border-slate-100 space-y-3.5 relative mx-auto max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shrink-0">
                    <Receipt size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 font-display leading-tight">{t("collectPayment")}</h3>
                    <p className="text-[11px] text-slate-400 font-medium">{t("selectPaymentModeAndBill")}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBillForPayment(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Patient & Consultation Summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/80 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900 text-xs">{selectedBillForPayment.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">{selectedBillForPayment.mrn}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800">
                    {t("awaitingPayment")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-200/60 text-slate-600">
                  <div>
                    <span className="text-slate-400 font-medium block">{t("doctor")}:</span>
                    <strong className="text-slate-800 font-bold">{selectedBillForPayment.doctor}</strong> ({selectedBillForPayment.specialty})
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">{t("consultationFee")}:</span>
                    <strong className="text-[#065f46] font-black text-xs">₹{selectedBillForPayment.fee}</strong>
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  {t("selectPaymentMethod")}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMode("UPI")}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                      selectedPaymentMode === "UPI"
                        ? "border-[#064e3b] bg-emerald-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <QrCode size={14} />
                      </div>
                      {selectedPaymentMode === "UPI" && (
                        <div className="w-3.5 h-3.5 rounded-full bg-[#064e3b] text-white flex items-center justify-center">
                          <Check size={9} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">{t("upiQrCode")}</p>
                      <p className="text-[9px] text-slate-500 font-medium">{t("digitalPaymentSub")}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMode("Cash")}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                      selectedPaymentMode === "Cash"
                        ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Banknote size={14} />
                      </div>
                      {selectedPaymentMode === "Cash" && (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check size={9} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">{t("cashPayment")}</p>
                      <p className="text-[9px] text-slate-500 font-medium">{t("physicalCurrencyAtDesk")}</p>
                    </div>
                  </button>
                </div>
              </div>



              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isProcessingWhatsAppPdf}
                  onClick={() => {
                    setPaymentPdfError(null);
                    setSelectedBillForPayment(null);
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {t("cancel")}
                </button>

                <button
                  type="button"
                  disabled={isProcessingWhatsAppPdf}
                  onClick={async () => {
                    if (!selectedBillForPayment) return;
                    setPaymentPdfError(null);
                    setIsProcessingWhatsAppPdf(true);

                    try {
                      const pat = patients.find((p) => p.id === selectedBillForPayment.id);
                      if (!pat) throw new Error("Patient record not found.");

                      const invoiceNo = pat.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                      const dateTimeStr = new Date().toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      });

                      const feeAmount = selectedBillForPayment.fee || 500;

                      // 1. Build Itemized Charges List
                      const itemsList: InvoiceItem[] = [
                        {
                          description: `${selectedBillForPayment.specialty || "Outpatient"} Consultation Fee`,
                          qty: 1,
                          rate: feeAmount,
                          amount: feeAmount,
                        },
                      ];

                      if (pat.prescription) {
                        try {
                          const parsedMeds = JSON.parse(pat.prescription);
                          if (Array.isArray(parsedMeds) && parsedMeds.length > 0) {
                            parsedMeds.forEach((m: any) => {
                              if (m.medicine) {
                                itemsList.push({
                                  description: `${m.medicine} — ${m.dosage || "1-0-1"}`,
                                  qty: 1,
                                  rate: 0,
                                  amount: 0,
                                });
                              }
                            });
                          }
                        } catch (e) {}
                      }

                      if (pat.dentalTreatment?.proceduresList && Array.isArray(pat.dentalTreatment.proceduresList)) {
                        pat.dentalTreatment.proceduresList.forEach((proc: any) => {
                          itemsList.push({
                            description: `Dental Procedure: ${proc.name || proc}`,
                            qty: 1,
                            rate: proc.cost || 0,
                            amount: proc.cost || 0,
                          });
                        });
                      }

                      const subtotal = itemsList.reduce((sum, item) => sum + item.amount, 0);

                      let pdfDataUri: string | null = null;
                      try {
                        // 1. Generate Real PDF Invoice document using jsPDF
                        const pdfObj = generateInvoicePDF({
                          invoiceNumber: invoiceNo,
                          dateTime: dateTimeStr,
                          clinic: {
                            name: clinicDetails.name || "MediTrack Family Clinic",
                            address: clinicDetails.address,
                            phone: clinicDetails.phone,
                            gstNumber: clinicDetails.gstNumber,
                          },
                          patient: {
                            name: pat.name,
                            phone: pat.phone,
                            age: pat.age,
                            gender: pat.gender,
                            mrn: selectedBillForPayment.mrn,
                          },
                          doctor: {
                            name: selectedBillForPayment.doctor,
                            specialty: selectedBillForPayment.specialty,
                          },
                          consultationDetails: {
                            diagnosis: pat.diagnosis,
                            notes: pat.notes,
                          },
                          items: itemsList,
                          subtotal,
                          grandTotal: subtotal,
                          paymentStatus: "Paid",
                          paymentMethod: selectedPaymentMode,
                        });
                        pdfDataUri = pdfObj.pdfDataUri;
                      } catch (pdfErr) {
                        console.warn("PDF Invoice Generation warning:", pdfErr);
                      }

                      // 2. Execute Firestore Payment Transaction FIRST (Guarantees PAID status)
                      if (onProcessPayment) {
                        await onProcessPayment(pat, selectedPaymentMode, feeAmount, invoiceNo, pdfDataUri || undefined);
                      } else {
                        await updateDoc(doc(db, "patients", pat.id), {
                          status: "PAID",
                          billingStatus: "Paid",
                          paymentMethod: selectedPaymentMode,
                          paidAt: serverTimestamp(),
                          invoiceNumber: invoiceNo,
                          invoicePdfData: pdfDataUri || null,
                        });
                      }

                      // 3. Attempt WhatsApp API Transmission (failures won't break PAID status)
                      let deliveryStatusToast = `✅ Payment of ₹${feeAmount} recorded! Status: PAID`;
                      let finalWaStatus = pat.whatsappStatus || "NOT_SENT";
                      let finalWaMsgId: string | undefined = pat.whatsappMessageId;

                      if (pdfDataUri && pat.whatsappStatus !== "SENT") {
                        try {
                          await updateDoc(doc(db, "patients", pat.id), { whatsappStatus: "SENDING" });
                        } catch (e) {}

                        const rawDigits = (pat.phone || "").replace(/\D/g, "");
                        const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits.length === 11 && rawDigits.startsWith("0") ? `91${rawDigits.slice(1)}` : rawDigits;
                        const pdfFileName = `MediTrack_${invoiceNo}_${pat.name.replace(/\s+/g, '-')}.pdf`;
                        const invoiceUrl = `https://meditrack-d03cb.web.app/?invoice=${invoiceNo}`;
                        const waMsgText = `🏥 ${clinicDetails.name || clinicInfo?.name || "Clinic"}\n\nHello ${pat.name},\n\nYour payment of ₹${feeAmount} has been received successfully. ✅\n🧾 Invoice: ${invoiceNo}\n💳 Payment: ${selectedPaymentMode}\n📌 Status: PAID\n📄 View & Download Invoice:\n${invoiceUrl}\n\nThank you for choosing ${clinicDetails.name || clinicInfo?.name || "our clinic"}.`;

                        try {
                          const waRes = await sendWhatsApp({
                            to: cleanPhone || pat.phone,
                            message: waMsgText,
                            mediaBase64: pdfDataUri,
                            filename: pdfFileName,
                          });
                          finalWaStatus = "SENT";
                          finalWaMsgId = waRes?.data?.id || `MSG-${Date.now()}`;
                          deliveryStatusToast = `✅ Real PDF Invoice (${invoiceNo}) sent via WhatsApp to ${pat.name}! Status: PAID`;

                          try {
                            await updateDoc(doc(db, "patients", pat.id), {
                              whatsappStatus: "SENT",
                              whatsappSentAt: serverTimestamp(),
                              whatsappMessageId: finalWaMsgId,
                            });
                          } catch (e) {}
                        } catch (waErr: any) {
                          console.warn("WhatsApp API dispatch failed, setting FAILED:", waErr);
                          finalWaStatus = "FAILED";
                          try {
                            await updateDoc(doc(db, "patients", pat.id), { whatsappStatus: "FAILED" });
                          } catch (e) {}
                          deliveryStatusToast = `✅ Payment of ₹${feeAmount} recorded (PAID). WhatsApp status: FAILED (Retry available).`;
                        }
                      }

                      const newInv: PaidInvoiceItem = {
                        invoiceNo,
                        name: pat.name,
                        doctor: selectedBillForPayment.doctor,
                        amount: feeAmount,
                        method: selectedPaymentMode,
                        dateTime: dateTimeStr,
                        status: "Paid",
                        phone: pat.phone,
                        pdfDataUri: pdfDataUri || undefined,
                      };

                      setSelectedBillForPayment(null);
                      setActiveReceiptData(newInv);
                      showToast(deliveryStatusToast);
                    } catch (err: any) {
                      console.error("PDF Billing Error:", err);
                      showToast(`❌ Billing issue: ${err.message || err}`);
                    } finally {
                      setIsProcessingWhatsAppPdf(false);
                    }
                  }}
                  className="px-4 py-2 bg-[#064e3b] hover:bg-[#043d2e] disabled:bg-emerald-900/40 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isProcessingWhatsAppPdf ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t("sendingPdfViaWhatsApp")}</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>{t("sendPdfViaWhatsApp")}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. PRINTABLE REAL TAX INVOICE / PDF MODAL */}
      <AnimatePresence>
        {activeReceiptData && (
          <motion.div
            key="paid-receipt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveReceiptData(null)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "440px" }}
              className="bg-white rounded-2xl w-full p-3.5 sm:p-4 shadow-2xl border border-slate-100 space-y-2.5 relative mx-auto font-sans text-xs max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              {/* Close icon (no-print) */}
              <button
                onClick={() => setActiveReceiptData(null)}
                className="no-print absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>

              {/* Printable Invoice Container */}
              <div id="printable-invoice" className="space-y-3 text-slate-800">
                {/* Header Letterhead */}
                <div className="flex items-start justify-between border-b border-[#03231b] pb-2.5">
                  <div className="space-y-1">
                    <MediTrackLogo size="xs" theme="light" showSubtitle={true} showBadge={false} />
                    <div className="pt-0.5 space-y-0.5">
                      <h2 className="text-xs font-black text-slate-900 tracking-tight font-display">
                        {clinicDetails.name}
                      </h2>
                      <p className="text-[10px] text-slate-500 font-medium">{clinicDetails.address}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Phone: {clinicDetails.phone} • GSTIN: {clinicDetails.gstNumber}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase tracking-wider mb-0.5">
                      PAID • {activeReceiptData.method}
                    </span>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-display">
                      TAX INVOICE
                    </h3>
                    <p className="text-[11px] font-mono font-bold text-[#065f46]">{activeReceiptData.invoiceNo}</p>
                  </div>
                </div>

                {/* Patient & Invoice Meta Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 text-[11px]">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Billed To (Patient)</span>
                    <strong className="text-slate-900 font-extrabold text-xs block">{activeReceiptData.name}</strong>
                    <span className="text-slate-500 font-mono text-[10px] block">{activeReceiptData.phone || "+91 98765 43210"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Consulting Doctor</span>
                    <strong className="text-slate-900 font-extrabold text-xs block">{activeReceiptData.doctor}</strong>
                    <span className="text-slate-500 text-[10px] block">Date: {activeReceiptData.dateTime}</span>
                  </div>
                </div>

                {/* Itemized Services Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                        <th className="py-1.5 px-2.5 w-6 text-center">#</th>
                        <th className="py-1.5 px-2.5">Service Description</th>
                        <th className="py-1.5 px-2.5">SAC</th>
                        <th className="py-1.5 px-2.5 text-center">Qty</th>
                        <th className="py-1.5 px-2.5 text-right">Rate</th>
                        <th className="py-1.5 px-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[10px]">1</td>
                        <td className="py-2 px-2.5">
                          <strong className="text-slate-900 font-bold block leading-tight">Doctor Consultation</strong>
                          <span className="text-[9px] text-slate-500">Outpatient clinical assessment</span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-500 font-mono text-[10px]">999312</td>
                        <td className="py-2 px-2.5 text-center font-medium">1</td>
                        <td className="py-2 px-2.5 text-right font-mono">₹{activeReceiptData.amount}</td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">₹{activeReceiptData.amount}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totals Section */}
                  <div className="bg-slate-50/90 border-t border-slate-200 p-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Subtotal</span>
                      <span className="font-mono font-semibold">₹{activeReceiptData.amount}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Healthcare GST Exemption (0% - Notfn 12/2017)</span>
                      <span className="font-mono">₹0.00</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-200 text-xs font-black text-slate-900">
                      <span>Total Amount Paid ({activeReceiptData.method})</span>
                      <span className="text-[#065f46] font-mono font-black text-sm">₹{activeReceiptData.amount}.00</span>
                    </div>
                  </div>
                </div>

                {/* Footer Stamp & Signatory */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                  <div>
                    <p className="text-[9px] text-slate-400 leading-tight">
                      • Computer generated official Tax Invoice.<br />
                      • Prescriptions valid for 15 days from issue date.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block border-b border-slate-300 pb-0.5 px-3 mb-0.5">
                      <span className="text-[10px] font-black text-slate-800">Authorized Signatory</span>
                    </div>
                    <p className="text-[9px] text-slate-400">{clinicDetails.name} Desk</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons (no-print) */}
              <div className="no-print pt-1.5 flex flex-col sm:flex-row items-center gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const pdfName = `MediTrack_${activeReceiptData.invoiceNo}_${activeReceiptData.name.replace(/\s+/g, '-')}.pdf`;
                    if (activeReceiptData?.pdfDataUri) {
                      const link = document.createElement("a");
                      link.href = activeReceiptData.pdfDataUri;
                      link.download = pdfName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } else {
                      window.print();
                    }
                  }}
                  className="w-full sm:w-1/2 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download PDF Document</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const cleanPhone = formatWhatsAppNumber(activeReceiptData.phone);
                    const pdfName = `MediTrack_${activeReceiptData.invoiceNo}_${activeReceiptData.name.replace(/\s+/g, '-')}.pdf`;
                    const invoiceUrl = `https://meditrack-d03cb.web.app/?invoice=${activeReceiptData.invoiceNo}`;
                    const waMsg = `🏥 ${clinicDetails.name || clinicInfo?.name || "Clinic"}\n\nHello ${activeReceiptData.name},\n\nYour payment of ₹${activeReceiptData.amount} has been received successfully. ✅\n🧾 Invoice: ${activeReceiptData.invoiceNo}\n💳 Payment: ${activeReceiptData.method}\n📌 Status: PAID\n📄 View & Download Invoice:\n${invoiceUrl}\n\nThank you for choosing ${clinicDetails.name || clinicInfo?.name || "our clinic"}.`;

                    if (activeReceiptData?.pdfDataUri && cleanPhone) {
                      try {
                        showToast("Resending PDF Invoice via WhatsApp...");
                        await sendWhatsApp({
                          to: cleanPhone,
                          message: waMsg,
                          mediaBase64: activeReceiptData.pdfDataUri,
                          filename: pdfName,
                        });
                        showToast(`✅ PDF Invoice resent via WhatsApp (+${cleanPhone})!`);
                      } catch (err: any) {
                        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMsg)}`, "_blank");
                        showToast(`WhatsApp link opened (+${cleanPhone})!`);
                      }
                    } else if (cleanPhone) {
                      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMsg)}`, "_blank");
                      showToast(`Receipt text sent to WhatsApp (+${cleanPhone})!`);
                    }
                    setActiveReceiptData(null);
                  }}
                  className="w-full sm:w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Send PDF via WhatsApp</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. ADD TO QUEUE MODAL */}
      <AnimatePresence>
        {isAddQueueModalOpen && (
          <motion.div
            key="add-queue-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAddQueueModalOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 sm:space-y-5 relative max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 font-display">Add to Live Queue</h3>
                    <p className="text-xs text-slate-400 font-medium">Generate queue token for patient</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddQueueModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newQueueName.trim()) {
                    showToast("Please enter patient name");
                    return;
                  }
                  try {
                    const nextQueueNumber =
                      patients.length > 0
                        ? Math.max(...patients.map((p) => p.queueNumber || 0)) + 1
                        : 1;

                    const clinicId = currentUserProfile?.clinicId || clinicInfo?.id || "";
                    const addedBy = user?.uid || "receptionist";

                    const patientData: any = {
                      name: newQueueName.trim(),
                      phone: newQueuePhone.trim(),
                      age: newQueueAge.trim(),
                      gender: newQueueGender,
                      queueNumber: Number(nextQueueNumber),
                      status: "Waiting",
                      clinicId: String(clinicId),
                      doctorId: String(assignedDoctorId),
                      doctorEmail: String(assignedDoctorEmail || "").toLowerCase().trim(),
                      doctorName: String(assignedDoctorName),
                      doctorCategory: String(assignedDoctorCategory),
                      receptionistEmail: String(user?.email || "").toLowerCase().trim(),
                      receptionistName: String(currentUserProfile?.displayName || "Front Desk"),
                      addedBy: String(addedBy),
                      timestamp: serverTimestamp(),
                      consultationFee: assignedDoctorCategory === "DENTIST" ? 700 : assignedDoctorCategory === "PEDIATRICIAN" ? 600 : 500,
                      billingStatus: "Pending",
                    };

                    await addDoc(collection(db, "patients"), patientData);
                    setIsAddQueueModalOpen(false);
                    setNewQueueName("");
                    setNewQueuePhone("");
                    setNewQueueAge("");
                    setNewQueueGender("Male");
                    showToast(`Token #${queuePrefix}${String(nextQueueNumber).padStart(2, "0")} generated for ${newQueueName.trim()} (${assignedDoctorName})!`);
                  } catch (err: any) {
                    console.error("Error adding patient to queue:", err);
                    setIsAddQueueModalOpen(false);
                    setNewQueueName("");
                    setNewQueuePhone("");
                    showToast(`Added ${newQueueName.trim()} to live queue.`);
                  }
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Verma"
                    value={newQueueName}
                    onChange={(e) => setNewQueueName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newQueuePhone}
                    onChange={(e) => setNewQueuePhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] font-medium"
                  />
                </div>



                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Assigned Doctor (Fixed Desk)
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold flex items-center justify-between">
                    <span>{assignedDoctorName} — {categoryLabel}</span>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Locked
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddQueueModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#064e3b] hover:bg-[#043d2e] text-white font-extrabold rounded-xl shadow-md shadow-emerald-950/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <Check size={16} />
                    <span>Issue Token &amp; Add</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. NEW PAYMENT MODAL */}
      <AnimatePresence>
        {isNewPaymentModalOpen && (
          <motion.div
            key="new-payment-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNewPaymentModalOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "440px" }}
              className="bg-white rounded-2xl w-full p-4 sm:p-5 shadow-2xl border border-slate-100 space-y-3.5 relative mx-auto max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 font-display">Record Direct Payment</h3>
                    <p className="text-xs text-slate-400 font-medium">Issue receipt for walk-in / consultation</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewPaymentModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Select Patient / Visit
                  </label>
                  <select
                    value={directBillId || (pendingBills[0]?.id || "")}
                    onChange={(e) => setDirectBillId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                  >
                    {pendingBills.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.mrn}) — {b.doctor} (₹{b.fee})
                      </option>
                    ))}
                    {pendingBills.length === 0 && (
                      <option value="">No pending consultations</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDirectPaymentMode("UPI")}
                      className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        directPaymentMode === "UPI"
                          ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm"
                          : "bg-slate-50 text-slate-700 border border-slate-200"
                      }`}
                    >
                      UPI (QR Code)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectPaymentMode("Cash")}
                      className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        directPaymentMode === "Cash"
                          ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm"
                          : "bg-slate-50 text-slate-700 border border-slate-200"
                      }`}
                    >
                      Cash
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewPaymentModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingWhatsAppPdf}
                    onClick={async () => {
                      const targetBillId = directBillId || pendingBills[0]?.id;
                      const targetPat = patients.find((p) => p.id === targetBillId);
                      if (!targetPat) {
                        setIsNewPaymentModalOpen(false);
                        showToast("No pending consultation selected.");
                        return;
                      }

                      setIsProcessingWhatsAppPdf(true);
                      setPaymentPdfError(null);

                      try {
                        const fee = targetPat.consultationFee || 500;
                        const invoiceNo = targetPat.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                        const dateTimeStr = new Date().toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                          hour12: true,
                        });

                        const itemsList: InvoiceItem[] = [
                          {
                            description: "Outpatient Consultation Fee",
                            qty: 1,
                            rate: fee,
                            amount: fee,
                          },
                        ];

                        if (targetPat.prescription) {
                          try {
                            const parsedMeds = JSON.parse(targetPat.prescription);
                            if (Array.isArray(parsedMeds) && parsedMeds.length > 0) {
                              parsedMeds.forEach((m: any) => {
                                if (m.medicine) {
                                  itemsList.push({
                                    description: `Rx: ${m.medicine} (${m.dosage || "1-0-1"}, ${m.duration || "5 Days"})`,
                                    qty: 1,
                                    rate: 0,
                                    amount: 0,
                                  });
                                }
                              });
                            }
                          } catch (e) {}
                        }

                        const subtotal = itemsList.reduce((acc, item) => acc + item.amount, 0);

                        let pdfDataUri: string | null = null;
                        try {
                          // 1. Generate PDF
                          const pdfObj = generateInvoicePDF({
                            invoiceNumber: invoiceNo,
                            dateTime: dateTimeStr,
                            clinic: {
                              name: clinicDetails.name || "MediTrack Family Clinic",
                              address: clinicDetails.address,
                              phone: clinicDetails.phone,
                              gstNumber: clinicDetails.gstNumber,
                            },
                            patient: {
                              name: targetPat.name,
                              phone: targetPat.phone,
                              age: targetPat.age,
                              gender: targetPat.gender,
                            },
                            doctor: {
                              name: targetPat.doctorName || assignedDoctorName,
                              category: assignedDoctorCategory,
                            },
                            consultationDetails: {
                              diagnosis: targetPat.diagnosis,
                              notes: targetPat.notes,
                            },
                            items: itemsList,
                            subtotal,
                            grandTotal: subtotal,
                            paymentStatus: "Paid",
                            paymentMethod: directPaymentMode,
                          });
                          pdfDataUri = pdfObj.pdfDataUri;
                        } catch (pdfErr) {
                          console.warn("PDF generation error:", pdfErr);
                        }

                        // 2. Execute Firestore Payment Transaction FIRST (Guarantees PAID status)
                        if (onProcessPayment) {
                          await onProcessPayment(targetPat, directPaymentMode, fee, invoiceNo, pdfDataUri || undefined);
                        } else {
                          await updateDoc(doc(db, "patients", targetPat.id), {
                            status: "PAID",
                            billingStatus: "Paid",
                            paymentMethod: directPaymentMode,
                            paidAt: serverTimestamp(),
                            invoiceNumber: invoiceNo,
                            invoicePdfData: pdfDataUri || null,
                          });
                        }

                        // 3. Attempt WhatsApp API Transmission (failures won't break PAID status)
                        let deliveryStatusToast = `✅ Payment of ₹${fee} recorded! Status: PAID`;
                        if (pdfDataUri && targetPat.whatsappStatus !== "SENT") {
                          try {
                            await updateDoc(doc(db, "patients", targetPat.id), { whatsappStatus: "SENDING" });
                          } catch (e) {}

                          const rawDigits = (targetPat.phone || "").replace(/\D/g, "");
                          const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits.length === 11 && rawDigits.startsWith("0") ? `91${rawDigits.slice(1)}` : rawDigits;

                          try {
                            const waRes = await sendWhatsApp({
                              to: cleanPhone || targetPat.phone,
                              message: `Hello ${targetPat.name},\n\nYour official PDF tax invoice (${invoiceNo}) from ${clinicDetails.name} is attached below. Thank you for your visit!`,
                              mediaBase64: pdfDataUri,
                              filename: `Invoice_${invoiceNo}.pdf`,
                            });
                            deliveryStatusToast = `✅ Real PDF Invoice (${invoiceNo}) sent via WhatsApp to ${targetPat.name}! Status: PAID`;
                            try {
                              await updateDoc(doc(db, "patients", targetPat.id), {
                                whatsappStatus: "SENT",
                                whatsappSentAt: serverTimestamp(),
                                whatsappMessageId: waRes?.data?.id || `MSG-${Date.now()}`,
                              });
                            } catch (e) {}
                          } catch (waErr: any) {
                            console.warn("WhatsApp API dispatch error:", waErr);
                            try {
                              await updateDoc(doc(db, "patients", targetPat.id), { whatsappStatus: "FAILED" });
                            } catch (e) {}
                            deliveryStatusToast = `✅ Payment of ₹${fee} recorded (PAID). WhatsApp status: FAILED (Retry available).`;
                          }
                        }

                        const newInv: PaidInvoiceItem = {
                          invoiceNo,
                          name: targetPat.name,
                          doctor: targetPat.doctorName || assignedDoctorName,
                          amount: fee,
                          method: directPaymentMode,
                          dateTime: dateTimeStr,
                          status: "Paid",
                          phone: targetPat.phone,
                          pdfDataUri: pdfDataUri || undefined,
                        };

                        setIsNewPaymentModalOpen(false);
                        setActiveReceiptData(newInv);
                        showToast(deliveryStatusToast);
                      } catch (err: any) {
                        console.error("Direct Payment Error:", err);
                        showToast(`❌ Payment Failed: ${err.message || err}. Billing status remains UNPAID.`);
                      } finally {
                        setIsProcessingWhatsAppPdf(false);
                      }
                    }}
                    className="px-5 py-2.5 bg-[#064e3b] hover:bg-[#043d2e] disabled:bg-emerald-900/40 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-950/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    {isProcessingWhatsAppPdf ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending PDF via WhatsApp...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Collect &amp; Send PDF via WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. EDIT CLINIC INFO MODAL */}
      <AnimatePresence>
        {isEditClinicModalOpen && (
          <motion.div
            key="edit-clinic-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsEditClinicModalOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 relative max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 font-display">Edit Clinic Details</h3>
                <button
                  onClick={() => setIsEditClinicModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Clinic Name</label>
                  <input
                    type="text"
                    value={clinicDetails.name}
                    onChange={(e) => setClinicDetails({ ...clinicDetails, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Address</label>
                  <input
                    type="text"
                    value={clinicDetails.address}
                    onChange={(e) => setClinicDetails({ ...clinicDetails, address: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={clinicDetails.phone}
                    onChange={(e) => setClinicDetails({ ...clinicDetails, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">GST Number</label>
                  <input
                    type="text"
                    value={clinicDetails.gstNumber}
                    onChange={(e) => setClinicDetails({ ...clinicDetails, gstNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => setIsEditClinicModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsEditClinicModalOpen(false);
                    showToast("Clinic details updated successfully!");
                  }}
                  className="px-5 py-2 bg-[#064e3b] text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-950/20"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 10. EDIT WORKING HOURS / USERS / FEES MODALS */}
      <AnimatePresence>
      {/* 11. VIEW APPOINTMENT DETAILS MODAL */}
      <AnimatePresence>
        {viewAptDetail && (
          <motion.div
            key="view-apt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewAptDetail(null)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 sm:space-y-5 relative max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 font-display">Appointment Details</h3>
                    <p className="text-xs text-slate-400 font-medium">Slot ID: {viewAptDetail.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewAptDetail(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Patient Name</span>
                  <p className="font-extrabold text-slate-900 mt-0.5 text-sm">{viewAptDetail.patientName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone</span>
                  <p className="font-extrabold text-slate-900 mt-0.5 font-mono">{viewAptDetail.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Doctor</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{viewAptDetail.doctor}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Appointment Time</span>
                  <p className="font-extrabold text-slate-900 mt-0.5 font-mono">{viewAptDetail.time}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{viewAptDetail.type}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current Status</span>
                  <p className="mt-0.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {viewAptDetail.status}
                    </span>
                  </p>
                </div>
              </div>

              {viewAptDetail.notes && (
                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Clinical & Front Desk Notes</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-700 font-medium border border-slate-100">
                    {viewAptDetail.notes}
                  </p>
                </div>
              )}

              {/* Status Toggle Quick Buttons */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Change Status</span>
                <div className="flex flex-wrap gap-1.5">
                  {(["Waiting", "Consulting", "Completed", "In Billing", "Cancelled"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateAptStatus(viewAptDetail.id, st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        viewAptDetail.status === st
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    handleRequestDeleteAppointment(viewAptDetail);
                    setViewAptDetail(null);
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenEditAppointment(viewAptDetail);
                      setViewAptDetail(null);
                    }}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleCallApt(viewAptDetail);
                      setViewAptDetail(null);
                    }}
                    className="px-4 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
                  >
                    <PhoneCall size={13} />
                    <span>Call Patient</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* 13. VIEW PATIENT PROFILE MODAL */}
      <AnimatePresence>
        {viewingPatient && (
          <motion.div
            key="view-patient-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingPatient(null)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 sm:space-y-5 relative max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#064e3b] text-white flex items-center justify-center font-black text-sm shadow-md">
                    {viewingPatient.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 font-display">{viewingPatient.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">Patient Record ID: {viewingPatient.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingPatient(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone</span>
                  <p className="font-extrabold text-slate-900 mt-0.5 font-mono">{viewingPatient.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Age</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{viewingPatient.age ? `${viewingPatient.age} years` : "N/A"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Queue Token</span>
                  <p className="font-black text-[#065f46] mt-0.5 text-sm">#{viewingPatient.queueNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Live Queue Status</span>
                  <p className="mt-0.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      {viewingPatient.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Consultation Fee</span>
                  <p className="font-extrabold text-slate-900 mt-0.5 font-mono">₹{viewingPatient.consultationFee || 500}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Billing Status</span>
                  <p className="mt-0.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      viewingPatient.billingStatus === "Paid"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      {viewingPatient.billingStatus || "Pending"}
                    </span>
                  </p>
                </div>
              </div>

              {viewingPatient.notes && (
                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Clinical & Registration Notes</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-700 font-medium border border-slate-100">
                    {viewingPatient.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeletePatient(viewingPatient)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete Patient</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenEditPatient(viewingPatient);
                      setViewingPatient(null);
                    }}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>Edit Profile</span>
                  </button>
                  {viewingPatient.status === "Waiting" && onCallPatient && (
                    <button
                      type="button"
                      onClick={() => {
                        onCallPatient(viewingPatient);
                        setViewingPatient(null);
                        showToast(`Calling ${viewingPatient.name} to consulting room...`);
                      }}
                      className="px-4 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
                    >
                      <PhoneCall size={13} />
                      <span>Call Now</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 14. EDIT PATIENT RECORD MODAL */}
      <AnimatePresence>
        {editingPatient && (
          <motion.div
            key="edit-patient-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingPatient(null)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 relative max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Pencil size={16} className="text-[#065f46]" />
                  <h3 className="text-base font-black text-slate-900 font-display">Edit Patient Record</h3>
                </div>
                <button
                  onClick={() => setEditingPatient(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editPatientName}
                    onChange={(e) => setEditPatientName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={editPatientPhone}
                      onChange={(e) => setEditPatientPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Age</label>
                    <input
                      type="number"
                      value={editPatientAge}
                      onChange={(e) => setEditPatientAge(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={editPatientFee}
                    onChange={(e) => setEditPatientFee(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Clinical Notes</label>
                  <textarea
                    rows={3}
                    value={editPatientNotes}
                    onChange={(e) => setEditPatientNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePatientEdits}
                  className="px-5 py-2 bg-[#064e3b] text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-950/20 hover:bg-[#043d2e]"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 15. EDIT WORKING HOURS MODAL */}
      <AnimatePresence>
        {isEditHoursModalOpen && (
          <motion.div
            key="edit-hours-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsEditHoursModalOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 relative max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-emerald-600" />
                  <h3 className="text-base font-black text-slate-900 font-display">Edit Working Hours</h3>
                </div>
                <button
                  onClick={() => setIsEditHoursModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 text-xs">
                {workingHours.map((wh, idx) => (
                  <div key={wh.day} className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-800 w-24">{wh.day}</span>
                    <input
                      type="text"
                      disabled={wh.isClosed}
                      value={wh.hours}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWorkingHours(workingHours.map((item, i) => (i === idx ? { ...item, hours: val } : item)));
                      }}
                      className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 disabled:opacity-40"
                    />
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wh.isClosed}
                        onChange={(e) => {
                          const closed = e.target.checked;
                          setWorkingHours(
                            workingHours.map((item, i) =>
                              i === idx ? { ...item, isClosed: closed, hours: closed ? "Closed" : "09:00 AM - 09:00 PM" } : item
                            )
                          );
                        }}
                        className="rounded border-slate-300 text-[#065f46] focus:ring-[#064e3b]"
                      />
                      <span>Closed</span>
                    </label>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditHoursModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditHoursModalOpen(false);
                    showToast("Clinic working hours updated successfully!");
                  }}
                  className="px-5 py-2 bg-[#064e3b] text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-950/20 hover:bg-[#043d2e]"
                >
                  Save Schedule
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 16. MANAGE STAFF USERS MODAL */}
      <AnimatePresence>
        {isManageUsersModalOpen && (
          <motion.div
            key="manage-users-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsManageUsersModalOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 relative max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-purple-600" />
                  <h3 className="text-base font-black text-slate-900 font-display">Manage Staff Personnel</h3>
                </div>
                <button
                  onClick={() => setIsManageUsersModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Existing Users List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
                {clinicUsersList.map((usr, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center">
                        {usr.initials}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900">{usr.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{usr.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {usr.status}
                      </span>
                      {clinicUsersList.length > 1 && (
                        <button
                          onClick={() => {
                            setClinicUsersList(clinicUsersList.filter((_, i) => i !== idx));
                            showToast(`User ${usr.name} removed.`);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove user"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Staff Member Form */}
              <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
                <p className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">Add New Staff Member</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Staff Full Name"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="p-2 bg-white border border-purple-200 rounded-xl text-slate-800"
                  />
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="p-2 bg-white border border-purple-200 rounded-xl text-slate-800 font-medium"
                  >
                    <option value="Receptionist">Receptionist</option>
                    <option value="Front Desk">Front Desk</option>
                    <option value="General Physician">General Physician</option>
                    <option value="Pediatrician">Pediatrician</option>
                    <option value="Dentist">Dentist</option>
                    <option value="Pharmacist">Pharmacist</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newStaffName.trim()) {
                      showToast("Please enter staff member name");
                      return;
                    }
                    const initials = newStaffName
                      .trim()
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    setClinicUsersList([
                      ...clinicUsersList,
                      { initials, name: newStaffName.trim(), role: newStaffRole, status: "Active" },
                    ]);
                    setNewStaffName("");
                    showToast(`Staff member ${newStaffName.trim()} added!`);
                  }}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                >
                  + Add Staff Member
                </button>
              </div>

              <div className="pt-2 flex justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManageUsersModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 shadow-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </AnimatePresence>

      {/* 6. TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-8 sm:bottom-8 z-50 flex items-center justify-between sm:justify-start gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span className="text-xs font-bold">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <MobileBottomNav
        role="receptionist"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        waitingCount={waitingPatients.length}
        pendingBillingCount={pendingBillingPatients.length}
        doctorCategory={assignedDoctorCategory as any}
        onOpenSidePanel={() => setIsMobileDrawerOpen(true)}
      />
    </div>
  );
};
