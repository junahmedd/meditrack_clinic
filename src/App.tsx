/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { auth, db, createSecondaryAuthUser } from "./firebase";
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
  FileText,
  ChevronDown,
  Pill,
  Monitor,
  User as UserIcon,
  Trash2,
  ArrowLeft,
  X,
  ShieldCheck,
  Settings,
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
  Eye,
  EyeOff,
  Pencil,
  SlidersHorizontal,
  MoreVertical,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from "html2canvas";
import { PrescriptionTemplate } from "./components/PrescriptionTemplate";
import { LoginPage } from "./components/LoginPage";
import { ReceptionistPortal } from "./components/ReceptionistPortal";
import { DoctorPortal, detectGenderFromName } from "./components/DoctorPortal";
import { MediTrackLogo } from "./components/MediTrackLogo";
import {
  seedClinicDailyLiveData,
  checkAndAutoRollOverDaily,
  SeedDoctorInfo,
  SeedReceptionistInfo,
} from "./utils/dailyDataGenerator";

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

export const validateDoctorReceptionistMapping = (
  _clinicId: string,
  _doctorId?: string | null,
  _receptionistId?: string | null
): boolean => {
  return true;
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
  // Doctor & Dedicated Receptionist Mapping Fields
  doctorId?: string;
  receptionistId?: string;
  assignedDoctorUid?: string;
  assignedReceptionistUid?: string;
  assignedDoctorId?: string;
  assignedReceptionistId?: string;
  assignedDoctorEmail?: string;
  assignedDoctorName?: string;
  assignedReceptionistEmail?: string;
  category?: "GP" | "PEDIATRICIAN" | "DENTIST";
  specialty?: string;
  consultationFee?: number;
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
  doctorUid?: string;
  receptionistUid?: string;
  doctorId?: string;
  receptionistId?: string;
  doctorEmail?: string;
  receptionistEmail?: string;
  receptionistName?: string;
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

// ═══════════════════════════════════════════════════════════════
// ADMIN USERS PANEL
// ═══════════════════════════════════════════════════════════════
interface AdminUsersPanelProps {
  clinicId: string;
  clinicName: string;
  onBack: () => void;
  db: any;
  showToast: (msg: string) => void;
}

const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ clinicId, clinicName, onBack, db, showToast }) => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addRole, setAddRole] = useState<"doctor" | "receptionist">("doctor");
  const [addCategory, setAddCategory] = useState<"GP" | "PEDIATRICIAN" | "DENTIST">("GP");
  const [addAssignedDoctorEmail, setAddAssignedDoctorEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Role modal state
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editRole, setEditRole] = useState<"doctor" | "receptionist">("doctor");
  const [editCategory, setEditCategory] = useState<"GP" | "PEDIATRICIAN" | "DENTIST">("GP");
  const [editAssignedDoctorEmail, setEditAssignedDoctorEmail] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Real-time staff list for this clinic
  useEffect(() => {
    if (!clinicId) return;
    const q = query(
      collection(db, "users"),
      where("clinicId", "==", clinicId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setStaffList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [clinicId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const doctorsInClinic = useMemo(() => {
    return staffList.filter((s) => (s.role || "").toLowerCase() === "doctor");
  }, [staffList]);

  const filteredStaffList = useMemo(() => {
    return staffList.filter((staff) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (staff.displayName || "").toLowerCase().includes(q) ||
        (staff.email || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (roleFilter === "all") return true;
      const r = (staff.role || "").toLowerCase();
      return r === roleFilter;
    });
  }, [staffList, searchQuery, roleFilter]);

  const handleOpenEdit = (staff: any) => {
    setEditingStaff(staff);
    const r = (staff.role || "").toLowerCase() === "receptionist" ? "receptionist" : "doctor";
    setEditRole(r);
    setEditCategory((staff.category as any) || "GP");
    setEditAssignedDoctorEmail(staff.assignedDoctorEmail || "");
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      const roleCapitalized = editRole === "doctor" ? "Doctor" : "Receptionist";
      const categoryVal = editRole === "doctor" ? editCategory : undefined;
      const specialtyVal = editRole === "doctor"
        ? (editCategory === "PEDIATRICIAN" ? "Pediatrician (Child Specialist)" : editCategory === "DENTIST" ? "Dentist & Oral Surgery" : "General Practitioner")
        : undefined;

      const userDocRef = doc(db, "users", editingStaff.id);
      const updatePayload: any = {
        role: roleCapitalized,
        updatedAt: serverTimestamp(),
      };
      if (editRole === "doctor") {
        updatePayload.category = categoryVal;
        updatePayload.specialty = specialtyVal;
        updatePayload.assignedDoctorEmail = null;
        updatePayload.assignedDoctorName = null;
        if (!editingStaff.doctorId) {
          updatePayload.doctorId = `DOC-${clinicId}-${editingStaff.id.slice(0, 4).toUpperCase()}`;
        }
      } else {
        updatePayload.category = null;
        updatePayload.specialty = null;
        if (!editingStaff.receptionistId) {
          updatePayload.receptionistId = `REC-${clinicId}-${editingStaff.id.slice(0, 4).toUpperCase()}`;
        }
        const docObj = doctorsInClinic.find(
          (d) => (d.email || "").toLowerCase() === editAssignedDoctorEmail.toLowerCase()
        );
        updatePayload.assignedDoctorUid = docObj ? (docObj.uid || docObj.id || "") : "";
        updatePayload.assignedDoctorId = docObj ? (docObj.doctorId || "") : "";
        updatePayload.assignedDoctorEmail = docObj ? docObj.email : (editAssignedDoctorEmail || "");
        updatePayload.assignedDoctorName = docObj ? (docObj.displayName || docObj.email) : "";
        updatePayload.assignedDoctorCategory = docObj ? (docObj.category || "GP") : "GP";

        if (docObj && (docObj.uid || docObj.id) && editingStaff.id) {
          const docUid = docObj.uid || docObj.id;
          const assignmentId = `${clinicId}_${docUid}_${editingStaff.id}`;
          await setDoc(doc(db, "clinic_assignments", assignmentId), {
            clinicId,
            doctorId: docObj.doctorId || "",
            doctorUid: docUid,
            doctorEmail: docObj.email || "",
            doctorName: docObj.displayName || docObj.email || "",
            receptionistId: editingStaff.receptionistId || updatePayload.receptionistId || "",
            receptionistUid: editingStaff.id,
            receptionistEmail: editingStaff.email,
            receptionistName: editingStaff.displayName || editingStaff.email,
            status: "active",
            assignedAt: serverTimestamp(),
          }, { merge: true }).catch(console.error);
        }
      }

      await updateDoc(userDocRef, updatePayload);

      // Also update clinicInvitations if matching invitation exists
      if (editingStaff.email) {
        const inviteId = `${clinicId}_${editingStaff.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_")}`;
        await setDoc(doc(db, "clinicInvitations", inviteId), {
          role: editRole,
          category: categoryVal || "GP",
          specialty: specialtyVal || "",
          assignedDoctorEmail: updatePayload.assignedDoctorEmail || null,
          assignedDoctorName: updatePayload.assignedDoctorName || null,
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch(() => {});
      }

      showToast(`Updated ${editingStaff.displayName || editingStaff.email} to ${roleCapitalized}!`);
      setEditingStaff(null);
    } catch (err: any) {
      console.error("Failed to update staff role:", err);
      setEditError(err.message || "Failed to update role.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const cleanEmail = addEmail.trim().toLowerCase();
    const cleanName = addName.trim();
    if (!cleanEmail || !cleanName || !addPassword) {
      setAddError("Please fill in full name, email, and password.");
      return;
    }
    if (addPassword.length < 6) {
      setAddError("Password must be at least 6 characters.");
      return;
    }

    setIsAdding(true);
    try {
      let staffUid = "";
      // 1. Attempt to create the staff member in Firebase Authentication
      try {
        const createdUser = await createSecondaryAuthUser(cleanEmail, addPassword);
        staffUid = createdUser.uid;
      } catch (authErr: any) {
        if (authErr.code === "auth/email-already-in-use") {
          // User already exists in Auth — find their UID in users collection
          const existingQ = query(collection(db, "users"), where("email", "==", cleanEmail));
          const existingSnap = await getDocs(existingQ);
          if (!existingSnap.empty) {
            staffUid = existingSnap.docs[0].id;
          }
        } else {
          throw authErr;
        }
      }

      const roleCapitalized = addRole === "doctor" ? "Doctor" : "Receptionist";
      const categoryVal = addRole === "doctor" ? addCategory : undefined;
      const specialtyVal = addRole === "doctor"
        ? (addCategory === "PEDIATRICIAN" ? "Pediatrician (Child Specialist)" : addCategory === "DENTIST" ? "Dentist & Oral Surgery" : "General Practitioner")
        : undefined;

      // If we have a staffUid, directly write / update users/{staffUid}
      if (staffUid) {
        const userDocRef = doc(db, "users", staffUid);
        const payload: any = {
          uid: staffUid,
          email: cleanEmail,
          displayName: cleanName,
          role: addRole === "doctor" ? "doctor" : "receptionist",
          status: "active",
          clinicId,
          clinicName,
          photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=064e3b&color=fff`,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };
        if (addRole === "doctor") {
          payload.category = categoryVal;
          payload.specialty = specialtyVal;
          payload.doctorId = `DOC-${clinicId}-${staffUid.slice(0, 4).toUpperCase()}`;
        } else {
          payload.receptionistId = `REC-${clinicId}-${staffUid.slice(0, 4).toUpperCase()}`;
          const docObj = doctorsInClinic.find(
            (d) => (d.email || "").toLowerCase() === addAssignedDoctorEmail.toLowerCase()
          );
          payload.assignedDoctorUid = docObj ? (docObj.uid || docObj.id || "") : "";
          payload.assignedDoctorId = docObj ? (docObj.doctorId || "") : "";
          payload.assignedDoctorEmail = docObj ? docObj.email : (addAssignedDoctorEmail || "");
          payload.assignedDoctorName = docObj ? (docObj.displayName || docObj.email) : "";
          payload.assignedDoctorCategory = docObj ? (docObj.category || "GP") : "GP";

          if (docObj && (docObj.uid || docObj.id)) {
            const docUid = docObj.uid || docObj.id;
            const assignmentId = `${clinicId}_${docUid}_${staffUid}`;
            await setDoc(doc(db, "clinic_assignments", assignmentId), {
              clinicId,
              doctorId: docObj.doctorId || "",
              doctorUid: docUid,
              doctorEmail: docObj.email || "",
              doctorName: docObj.displayName || docObj.email || "",
              receptionistId: payload.receptionistId || "",
              receptionistUid: staffUid,
              receptionistEmail: cleanEmail,
              receptionistName: cleanName,
              status: "active",
              assignedAt: serverTimestamp(),
            }, { merge: true }).catch(console.error);
          }
        }
        await setDoc(userDocRef, payload, { merge: true });
      }

      // Also save to clinicInvitations for backup linking
      const inviteId = `${clinicId}_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      await setDoc(doc(db, "clinicInvitations", inviteId), {
        clinicId,
        clinicName,
        email: cleanEmail,
        name: cleanName,
        role: addRole,
        category: categoryVal || "GP",
        specialty: specialtyVal || "",
        assignedDoctorEmail: addRole === "receptionist" ? (addAssignedDoctorEmail || null) : null,
        status: "active",
        createdAt: serverTimestamp(),
      }, { merge: true });

      showToast(`✅ Added ${cleanName} as ${roleCapitalized}!`);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddRole("doctor");
      setAddCategory("GP");
      setAddAssignedDoctorEmail("");
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to add user:", err);
      setAddError(err.message || "Failed to add staff member.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Remove ${userName} from this clinic?`)) return;
    try {
      await updateDoc(doc(db, "users", userId), {
        clinicId: null,
        clinicName: null,
        role: null,
        updatedAt: serverTimestamp(),
      });
      showToast(`${userName} removed from clinic.`);
    } catch (err: any) {
      showToast("Failed to remove user.");
    }
  };

  const handleToggleActiveStatus = async (staff: any) => {
    const isCurrentlyDeactivated = staff.isDeactivated === true || staff.status === "deactivated" || staff.status === "inactive";
    const nextDeactivated = !isCurrentlyDeactivated;
    try {
      await updateDoc(doc(db, "users", staff.id), {
        isDeactivated: nextDeactivated,
        status: nextDeactivated ? "inactive" : "active",
        updatedAt: serverTimestamp(),
      });
      showToast(`${staff.displayName || staff.email} is now ${nextDeactivated ? "Inactive (Access Blocked)" : "Active"}!`);
    } catch (err: any) {
      console.error("Status update error:", err);
      showToast("Failed to update user status.");
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    const r = (role || "").toLowerCase();
    if (r === "admin") return "bg-[#e8fbf3] text-[#065f46] border-[#a7f3d0]";
    if (r === "doctor") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-teal-50 text-teal-800 border-teal-200";
  };

  return (
    <motion.div
      key="users-panel"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-5xl mx-auto py-2 relative z-10"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[#065f46] font-bold text-xs uppercase tracking-wider mb-5 hover:text-[#064e3b] transition-colors cursor-pointer"
      >
        <ArrowLeft size={15} /> BACK TO DASHBOARD
      </button>

      {/* Manage Staff Header Block inside white transparent box */}
      <div className="bg-white/85 backdrop-blur-2xl rounded-[32px] border border-white/80 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.06)] mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#e8fbf3] border border-[#a7f3d0] flex items-center justify-center text-[#065f46] shadow-2xs shrink-0">
              <Users size={26} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Manage Staff</h2>
              <div className="flex flex-wrap items-center gap-1.5 text-slate-500 text-xs sm:text-sm mt-1 font-medium">
                <span>Staff assigned to <strong className="text-slate-800">{clinicName || "Your Clinic"}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Clinic ID:</span>
                <span className="px-2.5 py-0.5 bg-[#e8fbf3] text-[#065f46] font-mono font-bold rounded-lg border border-[#a7f3d0] text-xs shadow-2xs">
                  {clinicId || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* 3D Staff Graphic Banner on Right */}
          <div className="hidden sm:flex items-center h-20 md:h-24 rounded-2xl overflow-hidden shadow-2xs border border-white/80 bg-white/40 backdrop-blur-md shrink-0">
            <img
              src="/assets/staff_team_3d.jpg"
              alt="Medical Staff"
              className="h-full w-auto object-cover object-top"
            />
          </div>
        </div>
      </div>

      {/* Staff Directory Card */}
      <div className="bg-white/85 backdrop-blur-2xl rounded-[32px] border border-white/80 p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
        {/* Top Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8fbf3] text-[#065f46] flex items-center justify-center shrink-0 border border-[#a7f3d0]/60">
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900">Staff Directory</h3>
                <span className="text-xs text-slate-400 font-bold">({filteredStaffList.length})</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">View and manage all clinic staff members.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3.5 py-2 bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] w-44 sm:w-60 transition-all shadow-2xs"
              />
            </div>

            {/* Role Filter Dropdown */}
            <div className="relative flex items-center">
              <SlidersHorizontal size={13} className="absolute left-3 text-slate-400 pointer-events-none" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-8 pr-7 py-2 bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] cursor-pointer appearance-none shadow-2xs"
              >
                <option value="all">All Roles</option>
                <option value="doctor">Doctors</option>
                <option value="receptionist">Receptionists</option>
                <option value="admin">Administrators</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Add Staff Button */}
            <button
              onClick={() => {
                setAddError(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
            >
              <Plus size={15} className="stroke-[3]" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>

        {filteredStaffList.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs sm:text-sm font-medium">No staff members found matching criteria.</p>
            {staffList.length === 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-3 text-xs font-bold text-[#065f46] hover:underline cursor-pointer"
              >
                + Add first staff member
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStaffList.map((staff) => (
              <div
                key={staff.id}
                className="p-3.5 sm:p-4 bg-white/95 rounded-2xl border border-slate-100 shadow-2xs hover:shadow-sm hover:border-slate-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                      (staff.role || "").toLowerCase() === "admin"
                        ? "bg-[#e8fbf3] text-[#065f46]"
                        : (staff.role || "").toLowerCase() === "doctor"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-teal-50 text-teal-800"
                    }`}
                  >
                    {(staff.displayName || staff.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {staff.displayName || "Staff Member"}
                      </p>
                      {staff.category && (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {staff.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{staff.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-end sm:self-auto">
                  {/* Status Toggle Badge */}
                  <button
                    onClick={() => handleToggleActiveStatus(staff)}
                    className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border cursor-pointer transition-all ${
                      staff.isDeactivated === true || staff.status === "deactivated" || staff.status === "inactive"
                        ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        : "bg-[#e8fbf3] text-[#065f46] border-[#a7f3d0] hover:bg-[#d1fae5]"
                    }`}
                    title="Click to toggle user active/inactive status"
                  >
                    {staff.isDeactivated === true || staff.status === "deactivated" || staff.status === "inactive"
                      ? "● Inactive"
                      : "● Active"}
                  </button>

                  {/* Role Badge */}
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${getRoleBadgeStyle(staff.role)}`}>
                    {staff.role || "Staff"}
                  </span>

                  {/* Role Specific Actions */}
                  {staff.role !== "admin" ? (
                    <>
                      <button
                        onClick={() => handleOpenEdit(staff)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold border border-slate-200"
                        title="Edit staff role"
                      >
                        <Pencil size={12} />
                        <span>Edit Role</span>
                      </button>
                      <button
                        onClick={() => handleRemoveUser(staff.id, staff.displayName || staff.email)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Remove from clinic"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  ) : (
                    <button
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                      title="Admin Settings"
                    >
                      <MoreVertical size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pop-up Modal Card */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isAdding && setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999]"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              style={{ maxWidth: "420px", width: "100%" }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[10000] mx-auto my-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#e8fbf3] text-[#064e3b] flex items-center justify-center">
                    <Plus size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Add Staff Member</h3>
                    <p className="text-[10px] text-slate-400">Assign to {clinicName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isAdding && setIsModalOpen(false)}
                  className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleAddUser} className="p-5 space-y-3">
                {addError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2 rounded-lg text-xs flex items-center gap-1.5">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{addError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Dr. Anjali Sharma"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#064e3b]/20 focus:border-[#064e3b] transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="doctor@clinic.com"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#064e3b]/20 focus:border-[#064e3b] transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700">Initial Password</label>
                    <span className="text-[10px] text-slate-400">Min 6 characters</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showAddPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-1.5 pr-8 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#064e3b]/20 focus:border-[#064e3b] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showAddPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Role</label>
                    <select
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#064e3b]/20 focus:border-[#064e3b] transition-all cursor-pointer"
                    >
                      <option value="doctor">Doctor</option>
                      <option value="receptionist">Receptionist</option>
                    </select>
                  </div>

                  {addRole === "doctor" ? (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">Specialty</label>
                      <select
                        value={addCategory}
                        onChange={(e) => setAddCategory(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#064e3b]/20 focus:border-[#064e3b] transition-all cursor-pointer"
                      >
                        <option value="GP">General Physician</option>
                        <option value="PEDIATRICIAN">Pediatrician</option>
                        <option value="DENTIST">Dentist</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">Connect to Doctor</label>
                      <select
                        value={addAssignedDoctorEmail}
                        onChange={(e) => setAddAssignedDoctorEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#064e3b]/20 focus:border-[#064e3b] transition-all cursor-pointer"
                      >
                        <option value="">All Doctors (Shared Desk)</option>
                        {doctorsInClinic.map((doc) => (
                          <option key={doc.id} value={doc.email}>
                            {doc.displayName || doc.email} ({doc.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isAdding}
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="px-4 py-1.5 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-bold rounded-lg shadow-xs transition-all disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                  >
                    {isAdding ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={13} />}
                    <span>{isAdding ? "Adding..." : "Add Staff Member"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Role Pop-up Modal */}
      <AnimatePresence>
        {editingStaff && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingEdit && setEditingStaff(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999]"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              style={{ maxWidth: "400px", width: "100%" }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[10000] mx-auto my-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#e8fbf3] text-[#064e3b] flex items-center justify-center">
                    <Pencil size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Edit Staff Role</h3>
                    <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{editingStaff.displayName || editingStaff.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isSavingEdit && setEditingStaff(null)}
                  className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveEdit} className="p-5 space-y-3">
                {editError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2 rounded-lg text-xs flex items-center gap-1.5">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-800">{editingStaff.displayName || "Staff Member"}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{editingStaff.email}</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">Assign Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#064e3b]/20 focus:border-[#064e3b] transition-all cursor-pointer"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                  </select>
                </div>

                {editRole === "doctor" && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Specialty</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#064e3b]/20 focus:border-[#064e3b] transition-all cursor-pointer"
                    >
                      <option value="GP">General Physician</option>
                      <option value="PEDIATRICIAN">Pediatrician</option>
                      <option value="DENTIST">Dentist</option>
                    </select>
                  </div>
                )}

                {editRole === "receptionist" && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Connect to Doctor</label>
                    <select
                      value={editAssignedDoctorEmail}
                      onChange={(e) => setEditAssignedDoctorEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#064e3b]/20 focus:border-[#064e3b] transition-all cursor-pointer"
                    >
                      <option value="">All Doctors (Shared Desk)</option>
                      {doctorsInClinic.map((doc) => (
                        <option key={doc.id} value={doc.email}>
                          {doc.displayName || doc.email} ({doc.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={() => setEditingStaff(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-4 py-1.5 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-bold rounded-lg shadow-xs transition-all disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSavingEdit ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                    <span>{isSavingEdit ? "Saving..." : "Save Role"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
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
    "dashboard" | "profile" | "receptionist" | "doctor"
  >(() => {
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    if (path === "/profile") return "profile";
    if (path === "/doctor") return "doctor";
    if (path === "/receptionist") return "receptionist";
    return "dashboard";
  });
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
  const [selectedRole, setSelectedRole] = useState("doctor");
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
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
                doctorName: p.doctorName || "Doctor",
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

  // Strict Role-Based Portal Routing & Route Guard
  const syncRouteWithAuth = useCallback(() => {
    const currentPath = window.location.pathname;

    // Public invoice viewer query parameter support (?invoice=INV-...)
    if (publicInvoice) return;

    // Logged-out state
    if (!user) {
      if (currentPath !== "/login" && currentPath !== "/") {
        window.history.replaceState(null, "", "/login");
      }
      setHasRedirected(false);
      return;
    }

    // Waiting for profile to load
    if (!currentUserProfile) return;

    // Section 28: Inactive account check
    if (currentUserProfile.status === "inactive" || (currentUserProfile as any).isDeactivated === true) {
      signOut(auth).catch(console.error);
      setError("Your account is currently inactive. Please contact your administrator.");
      window.history.replaceState(null, "", "/login");
      return;
    }

    const role = (currentUserProfile.role || "").trim().toLowerCase();
    const isAdm =
      role === "admin" ||
      role === "administrator" ||
      role === "owner" ||
      role === "clinic administrator";

    const isDoc =
      !isAdm &&
      (role === "doctor" ||
        role.includes("doctor") ||
        role.includes("physician") ||
        role.includes("pediatrician") ||
        role.includes("dentist"));

    const isRec = !isAdm && !isDoc;

    const canonicalPath = isAdm ? "/admin" : isDoc ? "/doctor" : "/receptionist";
    const canonicalPortal: "dashboard" | "doctor" | "receptionist" = isAdm
      ? "dashboard"
      : isDoc
      ? "doctor"
      : "receptionist";

    // 1. Profile route is accessible strictly for admin
    if (currentPath === "/profile" && isAdm) {
      setActiveView("profile");
      setHasRedirected(true);
      return;
    }

    // 2. Strict Access Control for Direct Portal URL Access
    if (currentPath === "/admin" && !isAdm) {
      const authorizedPortalName = isDoc ? "Doctor Portal" : "Receptionist Portal";
      setToast({
        message: `ACCESS DENIED: You are not authorized to access the Admin Portal. Redirecting to your ${authorizedPortalName}...`,
        visible: true,
      });
      window.history.replaceState(null, "", canonicalPath);
      setActiveView(canonicalPortal);
      setHasRedirected(true);
      return;
    }

    if (currentPath === "/doctor" && !isDoc) {
      const authorizedPortalName = isAdm ? "Admin Portal" : "Receptionist Portal";
      setToast({
        message: `ACCESS DENIED: You are not authorized to access the Doctor Portal. Redirecting to your ${authorizedPortalName}...`,
        visible: true,
      });
      window.history.replaceState(null, "", canonicalPath);
      setActiveView(canonicalPortal);
      setHasRedirected(true);
      return;
    }

    if (currentPath === "/receptionist" && !isRec) {
      const authorizedPortalName = isAdm ? "Admin Portal" : "Doctor Portal";
      setToast({
        message: `ACCESS DENIED: You are not authorized to access the Receptionist Portal. Redirecting to your ${authorizedPortalName}...`,
        visible: true,
      });
      window.history.replaceState(null, "", canonicalPath);
      setActiveView(canonicalPortal);
      setHasRedirected(true);
      return;
    }

    // 3. Sync browser route and view to the user's canonical portal
    if (currentPath !== canonicalPath) {
      window.history.replaceState(null, "", canonicalPath);
    }
    setActiveView(canonicalPortal);
    setHasRedirected(true);
  }, [user, currentUserProfile, publicInvoice]);

  // Sync route on mount, profile update, or loading finish
  useEffect(() => {
    if (!loading) {
      syncRouteWithAuth();
    }
  }, [loading, currentUserProfile, user, syncRouteWithAuth]);

  // Popstate listener (back/forward browser buttons)
  useEffect(() => {
    const handlePopState = () => {
      syncRouteWithAuth();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [syncRouteWithAuth]);

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
    fullName: "",
    email: "",
    password: "",
  });

  // Auth States
  const [authLoading, setAuthLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Robust Role Normalization & Permissions
  const userRole = (currentUserProfile?.role || "").trim().toLowerCase();

  const isAdmin =
    userRole === "admin" ||
    userRole === "administrator" ||
    userRole === "owner" ||
    userRole === "clinic administrator";

  const isDoctor =
    !isAdmin &&
    (userRole === "doctor" ||
      userRole.includes("doctor") ||
      userRole.includes("physician") ||
      userRole.includes("pediatrician") ||
      userRole.includes("dentist"));

  const isReceptionist =
    !isAdmin &&
    !isDoctor &&
    (userRole === "receptionist" ||
      userRole === "pharmacist" ||
      userRole === "staff" ||
      userRole === "front desk" ||
      userRole.includes("reception") ||
      userRole.includes("staff") ||
      userRole.includes("desk") ||
      userRole === "");

  const isAuthorizedForView = (view: string) => {
    if (view === "profile") return true;
    if (isAdmin) {
      // Admin ONLY has access to clinic dashboard and user management (no doctor/receptionist portals)
      return view === "dashboard";
    }
    if (isDoctor) {
      // Doctor ONLY has access to doctor consultation portal
      return view === "doctor";
    }
    if (isReceptionist) {
      // Receptionist ONLY has access to reception desk portal
      return view === "receptionist";
    }
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



  // Auth State Listener
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setProfileLoaded(false);
        // Use onSnapshot for real-time profile updates
        const userDocRef = doc(db, "users", currentUser.uid);
        profileUnsubscribe = onSnapshot(
          userDocRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              setCurrentUserProfile({ ...data, uid: docSnap.id });

              // Auto-fix missing display name / email if somehow absent
              if (!data.displayName || !data.email) {
                await updateDoc(userDocRef, {
                  displayName: data.displayName || currentUser.displayName || "User",
                  email: data.email || currentUser.email || "",
                  updatedAt: serverTimestamp(),
                }).catch(console.error);
              }
            } else {
              // No profile found directly — check if user was added via clinicInvitations
              const cleanEmail = (currentUser.email || "").toLowerCase().trim();
              if (cleanEmail) {
                const inviteQ = query(collection(db, "clinicInvitations"), where("email", "==", cleanEmail));
                const inviteSnap = await getDocs(inviteQ).catch(() => null);
                if (inviteSnap && !inviteSnap.empty) {
                  const inv = inviteSnap.docs[0].data();
                  const staffRole = inv.role === "doctor" ? "doctor" : inv.role === "admin" ? "admin" : "receptionist";
                  const newProfile: any = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: inv.name || currentUser.displayName || "Staff Member",
                    photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(inv.name || "Staff")}&background=064e3b&color=fff`,
                    role: staffRole,
                    status: "active",
                    category: inv.category || "GP",
                    specialty: inv.specialty || "",
                    clinicId: inv.clinicId,
                    clinicName: inv.clinicName,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  };
                  if (staffRole === "doctor") {
                    newProfile.doctorId = `DOC-${inv.clinicId}-${currentUser.uid.slice(0, 4).toUpperCase()}`;
                  } else if (staffRole === "receptionist") {
                    newProfile.receptionistId = `REC-${inv.clinicId}-${currentUser.uid.slice(0, 4).toUpperCase()}`;
                    newProfile.assignedDoctorCategory = "GP";
                    if (inv.assignedDoctorEmail) {
                      newProfile.assignedDoctorEmail = inv.assignedDoctorEmail;
                      newProfile.assignedDoctorName = inv.assignedDoctorName || "";
                    }
                  }
                  await setDoc(userDocRef, newProfile).catch(console.error);
                  setCurrentUserProfile({ ...newProfile, uid: currentUser.uid });
                  setProfileLoaded(true);
                  setLoading(false);
                  return;
                } else {
                  // Fallback: auto-create profile for authenticated user so they are never stranded
                  const isDoctorEmail = cleanEmail.includes("dr") || cleanEmail.includes("doc");
                  const isRecEmail = cleanEmail.includes("rec") || cleanEmail.includes("front") || cleanEmail.includes("reception");
                  const staffRole = isDoctorEmail ? "doctor" : isRecEmail ? "receptionist" : "admin";
                  const defaultName = cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                  const autoProfile: any = {
                    uid: currentUser.uid,
                    email: cleanEmail,
                    displayName: currentUser.displayName || defaultName,
                    photoURL: currentUser.photoURL || `/assets/admin_doctor_avatar.png`,
                    role: staffRole,
                    status: "active",
                    category: "GP",
                    specialty: staffRole === "doctor" ? "General Practitioner" : "",
                    clinicId: "MT0001",
                    clinicName: "MedPlus HealthCare",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  };
                  if (staffRole === "doctor") {
                    autoProfile.doctorId = `DOC-MT0001-${currentUser.uid.slice(0, 4).toUpperCase()}`;
                  } else if (staffRole === "receptionist") {
                    autoProfile.receptionistId = `REC-MT0001-${currentUser.uid.slice(0, 4).toUpperCase()}`;
                  }
                  await setDoc(userDocRef, autoProfile).catch(console.error);
                  setCurrentUserProfile({ ...autoProfile, uid: currentUser.uid });
                  setProfileLoaded(true);
                  setLoading(false);
                  return;
                }
              }

              console.warn("[Profile] No Firestore profile found for", currentUser.uid);
              setCurrentUserProfile(null);
            }
            setProfileLoaded(true);
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
            setProfileLoaded(true);
            setLoading(false);
          },
        );
      } else {
        setCurrentUserProfile(null);
        setPatients([]);
        setLoading(false);
        setProfileLoaded(false);
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

  // Real-time clinic doctors list (to connect receptionists and doctors by email)
  const [clinicDoctors, setClinicDoctors] = useState<any[]>([]);
  useEffect(() => {
    if (!currentUserProfile?.clinicId) {
      setClinicDoctors([]);
      return;
    }
    const q = query(
      collection(db, "users"),
      where("clinicId", "==", currentUserProfile.clinicId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u: any) => (u.role || "").toLowerCase() === "doctor");
      setClinicDoctors(docs);
    });
    return () => unsub();
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

          const userEmail = (user?.email || "").toLowerCase().trim();
          const pDocEmail = (p.doctorEmail || "").toLowerCase().trim();

          // 1. If current user is a Doctor, match their UID, Email, or DoctorID
          if (isDoctor) {
            if (p.doctorUid && p.doctorUid === user.uid) return true;
            if (pDocEmail && userEmail && pDocEmail === userEmail) return true;
            if (p.doctorId && currentUserProfile.doctorId && p.doctorId === currentUserProfile.doctorId) return true;
            if (p.doctorName && currentUserProfile.displayName) {
              return p.doctorName.toLowerCase().includes(currentUserProfile.displayName.toLowerCase().replace("dr. ", ""));
            }
            if (!pDocEmail && !p.doctorName && !p.doctorUid) return true;
            return false;
          }

          // 2. If Receptionist, match strictly to their assigned doctor
          if (isReceptionist) {
            const assignedDocUid = currentUserProfile.assignedDoctorUid || "";
            const assignedDocEmail = (currentUserProfile.assignedDoctorEmail || "").toLowerCase().trim();
            const assignedDocId = currentUserProfile.assignedDoctorId || "";
            const assignedDocName = (currentUserProfile.assignedDoctorName || "").toLowerCase().trim();

            if (assignedDocUid && p.doctorUid && p.doctorUid === assignedDocUid) return true;
            if (assignedDocEmail && pDocEmail && pDocEmail === assignedDocEmail) return true;
            if (assignedDocId && p.doctorId && p.doctorId === assignedDocId) return true;
            if (assignedDocName && p.doctorName) {
              const cleanP = p.doctorName.toLowerCase().replace("dr. ", "").replace("dr ", "").trim();
              const cleanT = assignedDocName.replace("dr. ", "").replace("dr ", "").trim();
              if (cleanP && cleanT && (cleanP.includes(cleanT) || cleanT.includes(cleanP))) return true;
            }
            // If receptionist is not yet linked to any doctor, show clinic queue
            if (!assignedDocUid && !assignedDocEmail && !assignedDocId && !assignedDocName) return true;
            if (!pDocEmail && !p.doctorName && !p.doctorUid) return true;
            return false;
          }
          return true;
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
  }, [user, currentUserProfile, isDoctor, isReceptionist, isAdmin]);

  // Auto-Sync: Ensure that every day there is fresh new live data for TODAY!
  const hasCheckedDailyRollover = useRef(false);
  useEffect(() => {
    if (!user || !currentUserProfile?.clinicId || hasCheckedDailyRollover.current) return;
    if (loading || !profileLoaded) return;

    const runDailyCheck = async () => {
      hasCheckedDailyRollover.current = true;
      const isDoc = (currentUserProfile.role || "").toLowerCase().includes("doctor");
      const docInfo: SeedDoctorInfo = {
        uid: isDoc ? user.uid : (currentUserProfile.assignedDoctorUid || clinicDoctors[0]?.uid || ""),
        doctorId: isDoc ? currentUserProfile.doctorId : (currentUserProfile.assignedDoctorId || clinicDoctors[0]?.doctorId),
        name: isDoc ? currentUserProfile.displayName || "Dr. John Smith" : (currentUserProfile.assignedDoctorName || clinicDoctors[0]?.displayName || "Dr. John Smith"),
        email: isDoc ? user.email || "" : (currentUserProfile.assignedDoctorEmail || clinicDoctors[0]?.email || ""),
        category: (isDoc ? currentUserProfile.category : currentUserProfile.assignedDoctorCategory) || "GP",
      };
      const recInfo: SeedReceptionistInfo = {
        uid: !isDoc ? user.uid : (currentUserProfile.assignedReceptionistUid || ""),
        receptionistId: !isDoc ? currentUserProfile.receptionistId : (currentUserProfile.assignedReceptionistId || ""),
        name: !isDoc ? currentUserProfile.displayName || "Front Desk" : "Front Desk",
        email: !isDoc ? user.email || "" : "",
      };

      const didRollOver = await checkAndAutoRollOverDaily(
        currentUserProfile.clinicId,
        docInfo,
        recInfo,
        patients
      );
      if (didRollOver) {
        showToast("New day started! Today's queue is clean and starts from ZERO.");
      }
    };

    const timer = setTimeout(() => {
      runDailyCheck();
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, currentUserProfile?.clinicId, profileLoaded, loading, patients.length]);

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
      const now = new Date();
      const todayPatients = patients.filter((p: any) => {
        const ts = p.paidAt || p.consultationCompletedAt || p.calledAt || p.timestamp || p.createdAt;
        if (!ts) return false;
        let d: Date | null = null;
        if (ts.toDate && typeof ts.toDate === "function") d = ts.toDate();
        else if (ts.seconds) d = new Date(ts.seconds * 1000);
        else if (typeof ts === "string" || typeof ts === "number") d = new Date(ts);
        if (!d || isNaN(d.getTime())) return false;
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });

      const nextQueueNumber =
        todayPatients.length > 0
          ? Math.max(...todayPatients.map((p) => p.queueNumber || 0)) + 1
          : 1;

      const isDoc = (currentUserProfile.role || "").toLowerCase() === "doctor";

      const assignedDoctorUid =
        currentUserProfile.assignedDoctorUid ||
        (isDoc ? user.uid : (clinicDoctors[0]?.uid || clinicDoctors[0]?.id || ""));

      const assignedDoctorId =
        currentUserProfile.assignedDoctorId ||
        (isDoc
          ? currentUserProfile.doctorId || user.uid
          : (clinicDoctors[0]?.doctorId || clinicDoctors[0]?.id || ""));

      const assignedDoctorEmail =
        currentUserProfile.assignedDoctorEmail ||
        (isDoc
          ? user.email
          : (clinicDoctors[0]?.email || ""));

      const assignedDoctorName =
        currentUserProfile.assignedDoctorName ||
        (isDoc
          ? currentUserProfile.displayName
          : (clinicDoctors[0]?.displayName || "Doctor"));

      const assignedDoctorCategory =
        currentUserProfile.assignedDoctorCategory ||
        (isDoc
          ? currentUserProfile.category
          : (clinicDoctors[0]?.category || "GP")) || "GP";

      const assignedReceptionistId =
        currentUserProfile.receptionistId ||
        currentUserProfile.assignedReceptionistId ||
        `REC-${currentUserProfile.clinicId || "CLI"}-${user.uid.slice(0, 4).toUpperCase()}`;

      // CLEAN OBJECT: Scoped to assigned doctor and receptionist
      const patientData: any = {
        name: regPatientName.trim(),
        phone: regPatientPhone.trim(),
        age: regPatientAge.trim(),
        gender: detectGenderFromName(regPatientName.trim()),
        queueNumber: Number(nextQueueNumber),
        status: "Waiting",
        clinicId: String(currentUserProfile.clinicId),
        doctorUid: String(assignedDoctorUid || ""),
        doctorId: String(assignedDoctorId || ""),
        doctorEmail: String(assignedDoctorEmail || "").toLowerCase().trim(),
        doctorName: String(assignedDoctorName || ""),
        doctorCategory: String(assignedDoctorCategory || "GP"),
        receptionistUid: String(user.uid),
        receptionistId: String(assignedReceptionistId || ""),
        receptionistEmail: String(user.email || "").toLowerCase().trim(),
        receptionistName: String(currentUserProfile.displayName || "Front Desk"),
        addedBy: String(user.uid),
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
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
      const docId = patient.doctorId || currentUserProfile?.doctorId || currentUserProfile?.assignedDoctorId || "";
      const recId = patient.receptionistId || currentUserProfile?.receptionistId || currentUserProfile?.assignedReceptionistId || "";
      const clinicId = patient.clinicId || currentUserProfile?.clinicId || "";

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

      const docId = patient.doctorId || currentUserProfile.doctorId || currentUserProfile.assignedDoctorId || "";
      const recId = patient.receptionistId || currentUserProfile.receptionistId || currentUserProfile.assignedReceptionistId || "";
      const clinicId = patient.clinicId || currentUserProfile.clinicId || "";

      validateDoctorReceptionistMapping(clinicId, docId, recId);

      // Update patient status in queue
      const patientRef = doc(db, "patients", patient.id);
      const updateData: any = {
        status: "Billing",
        billingStatus: "unpaid",
        consultationCompletedAt: serverTimestamp(),
        billedAt: serverTimestamp(),
        consultationFee: consultationFee || 500,
        invoiceNumber: invoiceNumber || "",
        notes: notes || "",
        diagnosis: diagnosisStr || "",
        prescription: JSON.stringify(prescriptionList || []),
        vitals: vitalsObj || {},
        followUpDate: followUpObj?.date || "",
        followUpNotes: followUpObj?.notes || "",
        addedBy: patient.addedBy || user.uid,
        clinicId: clinicId || "",
        doctorId: docId || "",
        receptionistId: recId || "",
      };

      if (patient.age !== undefined && patient.age !== null) updateData.age = patient.age;
      if (patient.gender !== undefined && patient.gender !== null) updateData.gender = patient.gender;

      if (specialtyData && (specialtyData.procedure || specialtyData.toothArea || specialtyData.complaint)) {
        updateData.dentalTreatment = specialtyData;
      }

      batch.update(patientRef, updateData);

      // Save to consultations collection for history
      const consultationRef = doc(collection(db, "consultations"));
      batch.set(consultationRef, {
        patientId: patient.id || "",
        patientPhone: patient.phone || "",
        patientName: patient.name || "",
        patientAge: patient.age || "",
        patientGender: patient.gender || "",
        clinicId: clinicId || "",
        doctorId: docId || "",
        receptionistId: recId || "",
        doctorName: currentUserProfile.displayName || "Doctor",
        notes: notes || "",
        diagnosis: diagnosisStr || "",
        prescription: JSON.stringify(prescriptionList || []),
        vitals: vitalsObj || {},
        specialtyData: specialtyData || null,
        consultationFee: consultationFee || 500,
        invoiceNumber: invoiceNumber || "",
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

      const docId = patient.doctorId || currentUserProfile?.assignedDoctorId || currentUserProfile?.doctorId || "";
      const recId = patient.receptionistId || currentUserProfile?.receptionistId || currentUserProfile?.assignedReceptionistId || "";
      const clinicId = patient.clinicId || currentUserProfile?.clinicId || "";

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

      // 1. Patient / Appointment document -> status = "Completed", billingStatus = "Paid"
      batch.update(patientRef, {
        status: "Completed",
        billingStatus: "Paid",
        paymentMethod: paymentMethod || "Cash",
        consultationFee: amount || 0,
        paidAt: serverTimestamp(),
        paymentId: paymentRef.id,
        invoiceId: invoiceNumber,
        invoiceNumber,
        invoicePdfData: pdfDataUri || null,
        updatedAt: serverTimestamp(),
        clinicId: clinicId || "",
        doctorId: docId || "",
        receptionistId: recId || "",
      });

      // 2. Invoice document -> status = "PAID", paymentStatus = "PAID"
      batch.set(
        invoiceRef,
        {
          invoiceNumber: invoiceNumber || "",
          patientId: patient.id || "",
          patientName: patient.name || "",
          patientPhone: patient.phone || "",
          amount: amount || 0,
          paymentMethod: paymentMethod || "Cash",
          pdfDataUri: pdfDataUri || null,
          clinicId: clinicId || "",
          doctorId: docId || "",
          receptionistId: recId || "",
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
        invoiceId: invoiceNumber || "",
        clinicId: clinicId || "",
        doctorId: docId || "",
        receptionistId: recId || "",
        patientId: patient.id || "",
        patientName: patient.name || "",
        patientPhone: patient.phone || "",
        amount: amount || 0,
        method: paymentMethod || "Cash",
        paymentMethod: paymentMethod || "Cash",
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

      const clinicName = clinicInfo?.name || currentUserProfile?.clinicName || "Clinic";
      const invoiceUrl = `https://meditrack-d03cb.web.app/?invoice=${invoiceNumber}`;
      const message = `🏥 ${clinicName}\n\nHello ${patient.name},\n\nYour payment of ₹${amount} has been received successfully. ✅\n🧾 Invoice: ${invoiceNumber}\n💳 Payment: ${paymentMethod}\n📌 Status: PAID\n📄 View & Download Invoice:\n${invoiceUrl}\n\nThank you for choosing ${clinicName}.`;

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

  const handleLogout = async () => {
    setHasRedirected(false);
    setCurrentUserProfile(null);
    setActiveView("dashboard");
    window.history.replaceState(null, "", "/login");
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out error", e);
    }
  };

  const handleResetAndSeedDailyLiveData = async (showNotification = true) => {
    if (!currentUserProfile?.clinicId) {
      showToast("Clinic ID is missing. Please re-login.");
      return;
    }
    try {
      setIsProcessing(true);
      const isDoc = (currentUserProfile.role || "").toLowerCase().includes("doctor");
      const docInfo: SeedDoctorInfo = {
        uid: isDoc ? user?.uid || "" : (currentUserProfile.assignedDoctorUid || clinicDoctors[0]?.uid || ""),
        doctorId: isDoc ? currentUserProfile.doctorId : (currentUserProfile.assignedDoctorId || clinicDoctors[0]?.doctorId),
        name: isDoc ? currentUserProfile.displayName || "Dr. John Smith" : (currentUserProfile.assignedDoctorName || clinicDoctors[0]?.displayName || "Dr. John Smith"),
        email: isDoc ? user?.email || "" : (currentUserProfile.assignedDoctorEmail || clinicDoctors[0]?.email || ""),
        category: (isDoc ? currentUserProfile.category : currentUserProfile.assignedDoctorCategory) || "GP",
      };

      const recInfo: SeedReceptionistInfo = {
        uid: !isDoc ? user?.uid || "" : (currentUserProfile.assignedReceptionistUid || ""),
        receptionistId: !isDoc ? currentUserProfile.receptionistId : (currentUserProfile.assignedReceptionistId || ""),
        name: !isDoc ? currentUserProfile.displayName || "Front Desk" : "Front Desk",
        email: !isDoc ? user?.email || "" : "",
      };

      const result = await seedClinicDailyLiveData(currentUserProfile.clinicId, docInfo, recInfo, true, false);
      if (showNotification) {
        showToast("Clinic reset successful! Today's live queue starts fresh from ZERO.");
      }
    } catch (err: any) {
      console.error("[App] Reset live data error:", err);
      showToast(err.message || "Failed to reset live data.");
    } finally {
      setIsProcessing(false);
    }
  };

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
  if (loading || authLoading || (user && !profileLoaded && !currentUserProfile)) {
    return (
      <div className="min-h-screen bg-[#030812] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="flex flex-col items-center gap-4">
          <MediTrackLogo size="lg" theme="dark" showBadge={false} />
          <div className="w-9 h-9 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mt-2" />
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
  if (user && currentUserProfile && (currentUserProfile.isDeactivated === true || currentUserProfile.status === "deactivated" || currentUserProfile.status === "inactive")) {
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

  // NO CLINIC PROFILE FOUND VIEW (only shown after profile check is fully confirmed)
  if (user && profileLoaded && !currentUserProfile) {
    return (
      <div className="min-h-screen bg-[#030812] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <MediTrackLogo size="lg" theme="dark" showBadge={false} />
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mt-2">
            <AlertCircle size={28} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-white font-black text-lg tracking-tight">No Clinic Profile Found</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Your account ({user.email}) is not assigned to any registered clinic or staff directory yet.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-4 w-full justify-center">
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md w-full sm:w-auto"
            >
              Sign In with Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }


  if (!user) {
    const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthLoading(true);
      setError(null);
      try {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !password) {
          setError("Please enter your email and password.");
          setAuthLoading(false);
          return;
        }

        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const userDocRef = doc(db, "users", cred.user.uid);
        const snap = await getDoc(userDocRef);

        let profile: UserProfile | null = null;
        if (snap.exists()) {
          profile = { ...snap.data(), uid: snap.id } as UserProfile;
        } else {
          // If no profile found directly, check clinicInvitations by email
          const inviteQ = query(collection(db, "clinicInvitations"), where("email", "==", cleanEmail));
          const inviteSnap = await getDocs(inviteQ).catch(() => null);
          if (inviteSnap && !inviteSnap.empty) {
            const inv = inviteSnap.docs[0].data();
            const staffRole = inv.role === "doctor" ? "doctor" : inv.role === "admin" ? "admin" : "receptionist";
            const newProfile: any = {
              uid: cred.user.uid,
              email: cred.user.email,
              displayName: inv.name || cred.user.displayName || "Staff Member",
              photoURL: cred.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(inv.name || "Staff")}&background=064e3b&color=fff`,
              role: staffRole,
              status: "active",
              category: inv.category || "GP",
              specialty: inv.specialty || "",
              clinicId: inv.clinicId,
              clinicName: inv.clinicName,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            if (staffRole === "doctor") {
              newProfile.doctorId = `DOC-${inv.clinicId}-${cred.user.uid.slice(0, 4).toUpperCase()}`;
            } else if (staffRole === "receptionist") {
              newProfile.receptionistId = `REC-${inv.clinicId}-${cred.user.uid.slice(0, 4).toUpperCase()}`;
              newProfile.assignedDoctorCategory = "GP";
              if (inv.assignedDoctorEmail) {
                newProfile.assignedDoctorEmail = inv.assignedDoctorEmail;
                newProfile.assignedDoctorName = inv.assignedDoctorName || "";
              }
            }
            await setDoc(userDocRef, newProfile).catch(console.error);
            profile = newProfile;
          }
        }

        if (!profile) {
          await signOut(auth);
          setError("ACCESS DENIED: No account found for this email. Please contact your clinic administrator to get registered.");
          return;
        }

        // Section 28: Inactive account check
        if (profile.status === "inactive" || (profile as any).isDeactivated === true) {
          await signOut(auth);
          setError("Your account is currently inactive. Please contact your administrator.");
          return;
        }

        const role = (profile.role || "").trim().toLowerCase();
        const isAdm =
          role === "admin" ||
          role === "administrator" ||
          role === "owner" ||
          role === "clinic administrator";

        const isDoc =
          !isAdm &&
          (role === "doctor" ||
            role.includes("doctor") ||
            role.includes("physician") ||
            role.includes("pediatrician") ||
            role.includes("dentist"));

        const isRec = !isAdm && !isDoc;

        // Auto-route to correct portal based on Firestore role
        setCurrentUserProfile(profile);
        setHasRedirected(true);

        const targetPath = isAdm ? "/admin" : isDoc ? "/doctor" : "/receptionist";
        const targetView = isAdm ? "dashboard" : isDoc ? "doctor" : "receptionist";
        window.history.replaceState(null, "", targetPath);
        setActiveView(targetView);
      } catch (e: any) {
        if (e.code === "auth/network-request-failed") {
          setError("Network connection to Firebase failed. Please check your connection and try again.");
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
          const cleanEmail = (cred.user.email || "").toLowerCase().trim();
          const inviteQ = query(collection(db, "clinicInvitations"), where("email", "==", cleanEmail));
          const inviteSnap = await getDocs(inviteQ).catch(() => null);
          if (inviteSnap && !inviteSnap.empty) {
            const inv = inviteSnap.docs[0].data();
            const staffRole = inv.role === "doctor" ? "doctor" : inv.role === "admin" ? "admin" : "receptionist";
            await setDoc(userDocRef, {
              uid: cred.user.uid,
              email: cred.user.email,
              displayName: inv.name || cred.user.displayName || "Staff Member",
              photoURL: cred.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(inv.name || "Staff")}&background=064e3b&color=fff`,
              role: staffRole,
              status: "active",
              category: inv.category || "GP",
              specialty: inv.specialty || "",
              clinicId: inv.clinicId,
              clinicName: inv.clinicName,
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
        const clinicName = signupData.clinicName.trim();
        const fullName = signupData.fullName.trim();
        const emailVal = signupData.email.trim();
        const passwordVal = signupData.password;

        if (!clinicName || !fullName || !emailVal || !passwordVal) {
          throw new Error("Please fill in all fields.");
        }

        // Step 1 — Create or reuse existing Firebase Auth user
        let userUid = "";
        let authUser: any = null;
        try {
          const cred = await createUserWithEmailAndPassword(auth, emailVal, passwordVal);
          userUid = cred.user.uid;
          authUser = cred.user;
        } catch (authErr: any) {
          if (authErr.code === "auth/email-already-in-use") {
            try {
              const signinCred = await signInWithEmailAndPassword(auth, emailVal, passwordVal);
              userUid = signinCred.user.uid;
              authUser = signinCred.user;
            } catch (loginErr: any) {
              throw new Error("This email is already registered in MediTrack. Please sign in with your correct password, or register with another email.");
            }
          } else {
            throw authErr;
          }
        }

        // Step 2 — Generate sequential clinic ID (MT0001, MT0002, ...) via Firestore transaction
        const counterRef = doc(db, "system", "clinicCounter");
        let finalClinicId = "";
        await runTransaction(db, async (transaction) => {
          const counterSnap = await transaction.get(counterRef);
          const currentCount = counterSnap.exists() ? (counterSnap.data().count || 0) : 0;
          const nextCount = currentCount + 1;
          const paddedNum = String(nextCount).padStart(4, "0");
          finalClinicId = `MT${paddedNum}`;
          transaction.set(counterRef, { count: nextCount }, { merge: true });
        });

        // Step 3 — Create clinic document
        await setDoc(doc(db, "clinics", finalClinicId), {
          clinicId: finalClinicId,
          name: clinicName,
          adminId: userUid,
          adminEmail: emailVal,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Step 4 — Create user profile as admin
        const userDocRef = doc(db, "users", userUid);
        await setDoc(userDocRef, {
          uid: userUid,
          email: emailVal.toLowerCase().trim(),
          displayName: fullName,
          photoURL: `/assets/admin_doctor_avatar.png`,
          role: "admin",
          status: "active",
          clinicId: finalClinicId,
          clinicName: clinicName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Step 5 — Update Firebase Auth display name
        if (authUser) {
          await updateProfile(authUser, { displayName: fullName }).catch(() => {});
        }

        // Step 6 — Sign out and redirect to login with success message
        await signOut(auth);
        setEmail(emailVal);
        setPassword("");
        setSignupSuccess(true);
      } catch (e: any) {
        if (e.code === "auth/network-request-failed") {
          setError("Network connection to Firebase failed. Please check your connection and try again.");
        } else if (e.code === "auth/weak-password") {
          setError("Password must be at least 6 characters.");
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
        onForgotPasswordClick={() => setResetFlowStep("options")}
        signupData={signupData}
        setSignupData={setSignupData}
        onSignupSubmit={handleSignupSubmit}
        signupSuccess={signupSuccess}
        onDismissSignupSuccess={() => setSignupSuccess(false)}
      />
    );
  }

  // Canonical portal view for this user based strictly on Firestore role
  const targetPortal: "dashboard" | "doctor" | "receptionist" = isAdmin
    ? "dashboard"
    : isDoctor
    ? "doctor"
    : "receptionist";

  const effectivePortalView: "dashboard" | "doctor" | "receptionist" | "profile" =
    activeView === "profile" && isAdmin ? "profile" : targetPortal;

  // RECEPTIONIST PORTAL VIEW
  if (user && effectivePortalView === "receptionist") {
    return (
      <ReceptionistPortal
        user={user}
        currentUserProfile={currentUserProfile}
        clinicInfo={clinicInfo}
        patients={patients}
        onLogout={handleLogout}
        isAdmin={isAdmin}
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
        isProcessing={isProcessing}
        clinicDoctors={clinicDoctors}
        onResetLiveData={() => handleResetAndSeedDailyLiveData(true)}
      />
    );
  }

  // DOCTOR PORTAL VIEW
  if (user && effectivePortalView === "doctor") {
    return (
      <DoctorPortal
        user={user}
        currentUserProfile={currentUserProfile}
        clinicInfo={clinicInfo}
        patients={patients}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        onCallPatient={handleCallPatient}
        onCompleteConsultation={handleCompleteDoctorConsultation}
        activePatient={activeDoctorPatient}
        setActivePatient={setActiveDoctorPatient}
        medicalHistory={medicalHistory}
        isHistoryOpen={isHistoryOpen}
        setIsHistoryOpen={setIsHistoryOpen}
        clinicDoctors={clinicDoctors}
        onResetLiveData={() => handleResetAndSeedDailyLiveData(true)}
      />
    );
  }

  // STRICT ADMIN PORTAL SECURITY GUARD
  // Doctor and Receptionist users are strictly prohibited from rendering or receiving the Admin Shell
  if (!isAdmin) {
    const targetRoute = isDoctor ? "/doctor" : "/receptionist";
    const portalName = isDoctor ? "Doctor" : "Receptionist";
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
          <ShieldCheck size={32} />
        </div>
        <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
          403 Forbidden • Admin Only
        </span>
        <h1 className="text-2xl font-black tracking-tight mb-2 font-display">
          Unauthorized Admin Portal Access
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          The Admin Portal is restricted to Clinic Administrators only. Your account (<strong className="text-slate-200">{currentUserProfile?.email}</strong>) is assigned as <strong className="text-slate-200">{currentUserProfile?.role || "Staff"}</strong>.
        </p>
        <button
          onClick={() => {
            window.history.replaceState(null, "", targetRoute);
            setActiveView(isDoctor ? "doctor" : "receptionist");
          }}
          className="px-6 py-2.5 bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-900/30"
        >
          Return to {portalName} Portal
        </button>
      </div>
    );
  }

  // MAIN ADMIN APP SHELL
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-x-hidden"
      style={
        activeView === "dashboard" && activeTab === "dashboard" && isAdmin
          ? {
              backgroundImage: "url('/assets/clinic_admin_bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center top",
              backgroundAttachment: "fixed",
            }
          : { backgroundColor: "#fafbfc" }
      }
    >
      {/* Luminous frosted glass backdrop overlay for Admin Hub */}
      {activeView === "dashboard" && activeTab === "dashboard" && isAdmin && (
        <div className="fixed inset-0 bg-gradient-to-b from-white/70 via-white/50 to-white/80 backdrop-blur-[1px] pointer-events-none z-0" />
      )}

      {/* Top Navigation */}
      <header className="h-16 sm:h-20 bg-white/90 backdrop-blur-xl px-3 sm:px-8 flex items-center justify-between sticky top-0 z-50 border-b border-emerald-100/70 shadow-[0_4px_25px_rgba(6,78,59,0.03)]">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <MediTrackLogo size="sm" theme="light" showSubtitle={true} showBadge={false} />

          {dbConnected === false && (
            <button
              onClick={checkConnection}
              title="Click to retry connection"
              className="flex items-center gap-1.5 ml-2 px-3 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-full border border-amber-200/80 uppercase tracking-wider flex-shrink-0 animate-pulse hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
            >
              <AlertCircle size={12} className="shrink-0" />
              <span>Retry Link</span>
            </button>
          )}
          {dbConnected === true && (
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-[#e8fbf3]/90 backdrop-blur-md text-[#065f46] text-[10px] font-black rounded-full border border-[#a7f3d0] shadow-2xs flex-shrink-0 select-none">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              <span className="uppercase tracking-wider">Operational</span>
            </div>
          )}

          {/* Role Badge in Header */}
          {isAdmin ? (
            <div className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-[#e8fbf3] backdrop-blur-md text-[#065f46] text-[10px] font-black rounded-full border border-[#a7f3d0] uppercase tracking-wider shadow-2xs">
              <Settings size={12} className="shrink-0 stroke-[2.5] text-[#065f46]" />
              <span>Admin Control</span>
            </div>
          ) : isDoctor ? (
            <span className="hidden md:inline-block px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-wider border border-emerald-200">
              Doctor Suite
            </span>
          ) : (
            <span className="hidden md:inline-block px-3.5 py-1.5 bg-teal-50 text-teal-800 text-[10px] font-black rounded-full uppercase tracking-wider border border-teal-200">
              Reception Desk
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Official Product Brochure Link */}
          <a
            href="/brochure.html"
            target="_blank"
            rel="noopener noreferrer"
            title="Open MediTrack Official Product Brochure"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#e8fbf3] hover:bg-[#d1fae5] text-[#065f46] text-xs font-bold rounded-xl border border-[#a7f3d0] transition-colors shadow-2xs cursor-pointer"
          >
            <FileText size={14} className="text-[#065f46]" />
            <span>Brochure</span>
          </a>

          {/* Notification Bell */}
          <button
            title="Notifications"
            className="w-10 h-10 rounded-full bg-white/80 hover:bg-white border border-slate-200/60 shadow-2xs flex items-center justify-center text-slate-600 relative transition-all cursor-pointer"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </button>

          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center gap-2.5 px-2 sm:px-3 py-1.5 rounded-full hover:bg-white/80 transition-all cursor-pointer group border border-transparent hover:border-emerald-200/60 shadow-2xs"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-50 border-2 border-white ring-1 ring-emerald-200/80 overflow-hidden shadow-xs flex-shrink-0">
              <img
                src={user.photoURL || "/assets/admin_doctor_avatar.png"}
                alt="Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-black text-slate-800 leading-tight">
                {currentUserProfile?.displayName || user.displayName || "Admin"}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 leading-tight">
                {currentUserProfile?.role || "Clinic Administrator"}
              </p>
            </div>
            <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:block" />
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
                      isAdmin ? "bg-[#e8fbf3] text-[#065f46] border border-[#a7f3d0]" : isDoctor ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-teal-50 text-teal-800 border border-teal-200"
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

                  <a
                    href="/brochure.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    <FileText size={18} className="text-[#065f46]" /> Product Brochure
                  </a>

                  {isAdmin && (
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
      </div>
    </header>

      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex flex-col">
          <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
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
                    <div className="w-16 h-16 bg-emerald-50 text-[#065f46] rounded-3xl flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
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
                      className="px-6 py-3 bg-[#064e3b] hover:bg-[#043d2e] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-900/20 cursor-pointer"
                    >
                      Enter {isDoctor ? "Doctor Consultation Suite" : "Reception Desk"} →
                    </button>
                  </motion.div>
                ) : (
                <motion.div
                  key="dashboard-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center py-4 sm:py-6 relative z-10 w-full"
                >
                  {/* Hero Header Section */}
                  <div className="w-full max-w-3xl text-left mb-5 px-2 sm:px-0">
                    <p className="text-slate-500 text-sm sm:text-base font-medium tracking-normal mb-0.5">
                      Welcome back,
                    </p>

                    {/* Dynamic Multi-Tone Clinic Heading */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] mb-1.5 font-display">
                      {(() => {
                        const fullName = currentUserProfile?.clinicName || clinicInfo?.name || "Clinic";
                        const parts = fullName.trim().split(/\s+/);
                        if (parts.length === 1) {
                          return <span className="text-slate-900">{parts[0]}</span>;
                        }
                        const first = parts[0];
                        const rest = parts.slice(1).join(" ");
                        return (
                          <>
                            <span className="text-slate-900">{first}</span>{" "}
                            <span className="text-[#059669]">{rest}</span>
                          </>
                        );
                      })()}
                    </h1>

                    <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-2.5">
                      Clinic Administrator • {currentUserProfile?.displayName || user.displayName || user.email?.split("@")[0] || "Administrator"}
                    </p>

                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#e8fbf3]/95 backdrop-blur-md border border-[#a7f3d0] rounded-full text-[#065f46] text-[10px] font-black uppercase tracking-wider mb-2 shadow-xs">
                      <Building2 size={12} className="text-[#059669]" />
                      <span>{currentUserProfile?.clinicName || clinicInfo?.name || "CLINIC WORKSPACE"}</span>
                      <span className="text-[#6ee7b7]">•</span>
                      <span className="font-mono text-[#059669] font-bold">ID: {currentUserProfile?.clinicId || "—"}</span>
                    </div>

                    <p className="text-slate-600 text-xs font-medium max-w-md">
                      Manage your clinic efficiently with modern tools and seamless workflow.
                    </p>
                  </div>

                  {/* Compact Glassmorphism Interactive Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full max-w-3xl px-2 sm:px-0">
                    {/* Card 1 — Manage Staff & Users */}
                    <button
                      onClick={() => setActiveTab("users")}
                      className="group text-left rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-white/80 hover:bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden cursor-pointer"
                    >
                      <div>
                        {/* Real Medical Staff Team Photo */}
                        <div className="w-full h-32 sm:h-36 rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-b from-emerald-50/50 via-white/40 to-teal-50/40 relative flex items-center justify-center border border-white/70 shadow-2xs mb-2">
                          <img
                            src="/assets/staff_team_photo.jpg"
                            alt="Manage Staff & Users"
                            className="w-full h-full object-cover object-[center_20%] group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>

                        {/* Floating Icon Badge + Category Tag */}
                        <div className="flex items-center justify-between w-full relative z-10 -mt-6 px-1 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-emerald-100/90 shadow-md flex items-center justify-center text-[#064e3b] group-hover:scale-105 transition-transform">
                            <Users size={18} className="stroke-[2.2]" />
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#dcfce7] border border-[#86efac] text-[#15803d] text-[9px] font-black uppercase tracking-wider shadow-2xs">
                            Staff Control
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div className="relative z-10 px-1">
                          <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#064e3b] transition-colors">
                            Manage Staff & Users
                          </h3>
                          <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1">
                            Add doctors and receptionists with email & password. Assign categories, doctor pairings, and edit roles.
                          </p>
                        </div>
                      </div>

                      {/* Footer with Registered Doctor Count & Action Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100/90 flex items-center justify-between w-full relative z-10 px-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                          <span className="font-mono text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            {clinicDoctors.length} Doctors Registered
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#e8fbf3] border border-[#a7f3d0] flex items-center justify-center text-[#065f46] group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-xs">
                          <ArrowRight size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </button>

                    {/* Card 2 — Clinic Profile & Settings */}
                    <button
                      onClick={() => setActiveView("profile")}
                      className="group text-left rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-white/80 hover:bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_40px_rgba(6,78,59,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden cursor-pointer"
                    >
                      <div>
                        {/* Real Clinic Facility Photo */}
                        <div className="w-full h-32 sm:h-36 rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-b from-emerald-50/50 via-white/40 to-teal-50/40 relative flex items-center justify-center border border-white/70 shadow-2xs mb-2">
                          <img
                            src="/assets/clinic_building_photo.png"
                            alt="Clinic Profile & Settings"
                            className="w-full h-full object-cover object-[center_35%] group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>

                        {/* Floating Icon Badge + Settings Tag */}
                        <div className="flex items-center justify-between w-full relative z-10 -mt-6 px-1 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-emerald-100/90 shadow-md flex items-center justify-center text-[#064e3b] group-hover:scale-105 transition-transform">
                            <Building2 size={18} className="stroke-[2.2]" />
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#dcfce7] border border-[#86efac] text-[#15803d] text-[9px] font-black uppercase tracking-wider shadow-2xs">
                            Settings
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div className="relative z-10 px-1">
                          <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#064e3b] transition-colors">
                            Clinic Profile & Settings
                          </h3>
                          <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1">
                            Manage clinic name, security tokens, system preferences, and administrative details.
                          </p>
                        </div>
                      </div>

                      {/* Footer with Clinic ID & Action Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100/90 flex items-center justify-between w-full relative z-10 px-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            Clinic ID: {currentUserProfile?.clinicId || "—"}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#e8fbf3] border border-[#a7f3d0] flex items-center justify-center text-[#065f46] group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-xs">
                          <ArrowRight size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* ── Clinic Live Activity & Queue Overview Banner ── */}
                  <div className="w-full max-w-3xl px-2 sm:px-0 mt-5">
                    <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="bg-[#e8fbf3] text-[#065f46] w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[#a7f3d0]/80">
                          <Activity size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-slate-900">Clinic Queue & Activity Summary</h3>
                          <p className="text-[11px] text-slate-500">Live monitoring of patients across all consultation rooms and front desk.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0 text-center w-full md:w-auto">
                        <div className="px-3.5 py-1.5 bg-white/80 rounded-xl border border-slate-100 shadow-2xs">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Waiting</p>
                          <p className="text-lg font-black text-amber-600">
                            {patients.filter((p) => p.status === "Waiting").length}
                          </p>
                        </div>
                        <div className="px-3.5 py-1.5 bg-white/80 rounded-xl border border-slate-100 shadow-2xs">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">In Room</p>
                          <p className="text-lg font-black text-emerald-600">
                            {patients.filter((p) => p.status === "Called").length}
                          </p>
                        </div>
                        <div className="px-3.5 py-1.5 bg-white/80 rounded-xl border border-slate-100 shadow-2xs">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Done</p>
                          <p className="text-lg font-black text-[#059669]">
                            {patients.filter((p) => p.status === "Completed").length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                )
              )}

              {/* ── Users Management Tab ── */}
              {activeView === "dashboard" && activeTab === "users" && isAdmin && (
                <AdminUsersPanel
                  clinicId={currentUserProfile?.clinicId || ""}
                  clinicName={currentUserProfile?.clinicName || ""}
                  onBack={() => setActiveTab("dashboard")}
                  db={db}
                  showToast={showToast}
                />
              )}


              {activeView === "profile" && (
                <motion.div
                  key="profile-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-5xl mx-auto py-2 relative z-10"
                >
                  <button
                    onClick={() => {
                      const canonicalPath = isAdmin ? "/admin" : isDoctor ? "/doctor" : "/receptionist";
                      const canonicalPortal = isAdmin ? "dashboard" : isDoctor ? "doctor" : "receptionist";
                      window.history.pushState(null, "", canonicalPath);
                      setActiveView(canonicalPortal);
                    }}
                    className="flex items-center gap-1.5 text-[#065f46] font-bold text-xs uppercase tracking-wider mb-5 hover:text-[#064e3b] transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={15} /> BACK TO {isAdmin ? "DASHBOARD" : isDoctor ? "DOCTOR SUITE" : "RECEPTION DESK"}
                  </button>

                  {isAdmin ? (
                    <div className="bg-white/85 backdrop-blur-2xl rounded-[32px] p-6 sm:p-9 border border-white/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-[#e8fbf3] border border-[#a7f3d0] flex items-center justify-center text-[#064e3b] shadow-2xs shrink-0">
                            <UserCircle size={32} />
                          </div>
                          <div>
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                              System Administrator Profile
                            </h2>
                            <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                              Personal administrative account settings.
                            </p>
                          </div>
                        </div>

                        {/* Verified Administrator Badge chip */}
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl shadow-2xs shrink-0 self-start sm:self-auto">
                          <ShieldCheck size={22} className="text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-xs font-black text-emerald-900 leading-tight">Administrator</p>
                            <p className="text-[10px] font-semibold text-emerald-600 leading-tight">Full System Access</p>
                          </div>
                        </div>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 pt-7">
                        {/* Left Column — Account Details */}
                        <div className="lg:col-span-7 space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[#e8fbf3] text-[#064e3b] flex items-center justify-center">
                                <UserIcon size={16} />
                              </div>
                              <div>
                                <h3 className="text-base font-black text-slate-900">Personal Information</h3>
                                <p className="text-xs text-slate-400 font-medium">Your administrative account details and contact information.</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const newName = window.prompt("Enter new Person of Contact name:", currentUserProfile?.displayName || user.displayName || "");
                                if (newName && newName.trim()) {
                                  updateDoc(doc(db, "users", user.uid), {
                                    displayName: newName.trim(),
                                    updatedAt: serverTimestamp(),
                                  }).then(() => {
                                    setCurrentUserProfile((p) => p ? { ...p, displayName: newName.trim() } : p);
                                    showToast("Profile name updated!");
                                  }).catch(() => showToast("Failed to update name."));
                                }
                              }}
                              className="px-3.5 py-1.5 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
                            >
                              <Pencil size={12} />
                              <span>Edit Profile</span>
                            </button>
                          </div>

                          {/* Row 1 — Person of Contact */}
                          <div className="p-4 bg-white/95 rounded-2xl border border-slate-100 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-[#e8fbf3] text-[#064e3b] flex items-center justify-center shrink-0">
                                <UserIcon size={18} />
                              </div>
                              <div>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">PERSON OF CONTACT</p>
                                <p className="text-sm font-black text-slate-900 mt-0.5">
                                  {currentUserProfile?.displayName || user.displayName || "Zaid"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Row 2 — Contact Email */}
                          <div className="p-4 bg-white/95 rounded-2xl border border-slate-100 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <Mail size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">CONTACT EMAIL</p>
                                <p className="text-sm font-black text-slate-900 truncate mt-0.5">
                                  {user.email || currentUserProfile?.email || "—"}
                                </p>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-[#e8fbf3] text-[#065f46] border border-[#a7f3d0] rounded-full text-xs font-black flex items-center gap-1 shadow-2xs shrink-0">
                              <Check size={12} className="stroke-[3]" /> Verified
                            </span>
                          </div>

                          {/* Row 3 — Contact Phone */}
                          <div className="p-4 bg-white/95 rounded-2xl border border-slate-100 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                                <Phone size={18} />
                              </div>
                              <div>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">CONTACT PHONE</p>
                                <p className="text-sm font-black text-slate-900 mt-0.5">
                                  {currentUserProfile?.contactNumber || currentUserProfile?.phone || "Not Set"}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const newPhone = window.prompt("Enter contact phone number:", currentUserProfile?.contactNumber || currentUserProfile?.phone || "+91 ");
                                if (newPhone && newPhone.trim()) {
                                  updateDoc(doc(db, "users", user.uid), {
                                    contactNumber: newPhone.trim(),
                                    phone: newPhone.trim(),
                                    updatedAt: serverTimestamp(),
                                  }).then(() => {
                                    setCurrentUserProfile((p) => p ? { ...p, contactNumber: newPhone.trim(), phone: newPhone.trim() } : p);
                                    showToast("Contact phone updated!");
                                  }).catch(() => showToast("Failed to update phone."));
                                }
                              }}
                              className="px-3.5 py-1 text-xs font-bold text-[#065f46] border border-dashed border-[#a7f3d0] hover:bg-emerald-50 rounded-full transition-colors cursor-pointer shrink-0"
                            >
                              {currentUserProfile?.contactNumber || currentUserProfile?.phone ? "Edit Phone" : "Add Phone"}
                            </button>
                          </div>
                        </div>

                        {/* Right Column — 3D Admin Identity Card */}
                        <div className="lg:col-span-5">
                          <div className="rounded-3xl overflow-hidden border border-slate-100 bg-white shadow-md flex flex-col">
                            <div className="w-full h-52 sm:h-56 overflow-hidden relative bg-slate-100">
                              <img
                                src="/assets/admin_doctor_profile.png"
                                alt="System Administrator"
                                className="w-full h-full object-cover object-[center_12%]"
                              />
                            </div>
                            <div className="p-5 bg-white">
                              <h3 className="text-xl font-black text-slate-900">
                                {currentUserProfile?.displayName || user.displayName || "Zaid"}
                              </h3>
                              <p className="text-xs font-bold text-[#065f46] mt-0.5">System Administrator</p>
                              <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">
                                Managing clinic operations and system settings.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[32px] shadow-sm overflow-hidden">
                      <div className="p-10 bg-slate-50/50">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="bg-[#e8fbf3] text-[#064e3b] p-3 rounded-2xl">
                            <UserCircle size={32} />
                          </div>
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                            Clinic Profile
                          </h2>
                        </div>
                        <p className="text-slate-500 font-medium">
                          Details of the registered clinic you are working with.
                        </p>
                      </div>

                      <div className="p-10 space-y-10">
                        <div className="flex items-start gap-6">
                          <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                            <Building2 size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Clinic Name
                            </p>
                            <p className="text-xl font-black text-slate-900">
                              {clinicInfo?.name || currentUserProfile?.clinicName || "Not Set"}
                            </p>
                          </div>
                        </div>

                        {(clinicInfo?.address || currentUserProfile?.clinicAddress) && (
                          <div className="flex items-start gap-6">
                            <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                              <Monitor size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Clinic Address
                              </p>
                              <p className="text-xl font-black text-slate-900">
                                {clinicInfo?.address || currentUserProfile?.clinicAddress}
                              </p>
                            </div>
                          </div>
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
                              {currentUserProfile?.displayName || user?.displayName || "Not Set"}
                            </p>
                          </div>
                        </div>

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

                        <div className="flex items-start gap-6">
                          <div className="bg-slate-50 p-3 rounded-xl text-slate-400">
                            <Mail size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Contact Email
                            </p>
                            <p className="text-xl font-black text-slate-900">
                              {currentUserProfile?.email || user?.email || "Not Set"}
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

                      <div className="p-8 bg-slate-50 border-t border-slate-100">
                        <div className="flex flex-col gap-4">
                          <div className="bg-white px-6 py-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Clinic Connection
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900">
                                  {currentUserProfile?.clinicName || clinicInfo?.name || "Connected Clinic"}
                                </p>
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                  {currentUserProfile?.clinicId || "Active"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Signed in as: <span className="font-mono text-slate-700">{user?.email}</span> ({currentUserProfile?.role || "Staff"})
                              </p>
                            </div>
                            {currentUserProfile?.assignedDoctorEmail && (
                              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl px-4 py-2 shrink-0">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider">Connected Doctor</p>
                                <p className="text-xs font-bold text-slate-800">{currentUserProfile.assignedDoctorName || "Doctor"}</p>
                                <p className="text-[11px] font-mono text-[#065f46]">{currentUserProfile.assignedDoctorEmail}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                      className="px-6 py-3 bg-[#064e3b] hover:bg-[#043d2e] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-900/20 cursor-pointer"
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
                        <Activity className="text-[#059669] animate-pulse" size={28} />
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
                            <div className="bg-emerald-50 text-[#065f46] p-2 rounded-xl">
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
                              className="w-full bg-[#064e3b] text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-blue-700 transition-all disabled:opacity-50"
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
                                              ? "bg-emerald-100 text-[#065f46]"
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
                      className="px-6 py-3 bg-[#064e3b] hover:bg-[#043d2e] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-900/20 cursor-pointer"
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
                                      className="bg-white border border-slate-100 hover:border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold text-[#065f46] hover:bg-[#064e3b] hover:text-white hover:shadow-sm transition-all shadow-sm cursor-pointer"
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
                                <div className="bg-[#064e3b] text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl">
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
                                  className="flex items-center gap-2 text-[#065f46] font-bold text-xs uppercase tracking-widest hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all"
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
                                className="w-full h-32 bg-slate-50 rounded-3xl p-6 outline-none focus:ring-2 focus:ring-[#064e3b] transition-all border-none"
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
                                  className="text-[#065f46] font-bold text-xs flex items-center gap-1 hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors"
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
                                className="w-5 h-5 rounded border-slate-300 text-[#065f46] focus:ring-[#064e3b]"
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
                              className="w-full bg-[#064e3b] text-white py-5 rounded-3xl font-black shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 hover:bg-blue-700 transition-all"
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
                              className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${p.status === "Completed" ? "bg-emerald-100 text-emerald-600" : "bg-emerald-100 text-[#065f46]"}`}
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
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#065f46] flex items-center justify-center font-black shrink-0">
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
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-[#065f46]">
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
                        <span className="text-[10px] font-bold text-[#065f46] bg-emerald-50 px-2 py-0.5 rounded-md">
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
                                  <p className="text-[10px] font-black text-blue-500 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
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
            className="fixed bottom-20 left-4 right-4 sm:right-auto sm:left-8 sm:bottom-8 z-[1000] flex items-center justify-between sm:justify-start gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl sm:rounded-[24px] shadow-2xl shadow-slate-900/50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Pill className="text-blue-400" size={16} />
              </div>
              <p className="text-xs sm:text-sm font-black tracking-tight leading-snug">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
              className="ml-2 p-1 hover:bg-slate-800 rounded-full transition-colors shrink-0"
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-left"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col gap-5 sm:gap-6 max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              <div className="flex flex-col gap-2">
                <h4 className={`text-base sm:text-lg font-black uppercase tracking-wider ${customModal.isDanger ? "text-red-500" : "text-slate-900"}`}>
                  {customModal.title}
                </h4>
                <p className="text-slate-500 text-xs font-bold leading-relaxed whitespace-pre-wrap">
                  {customModal.message}
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-4 justify-end mt-2">
                {customModal.cancelText && (
                  <button
                    onClick={() => setCustomModal(null)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 border border-slate-100 transition-all font-sans cursor-pointer text-center"
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
                  className={`w-full sm:w-auto px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-all active:scale-95 font-sans cursor-pointer text-center ${customModal.isDanger ? "bg-red-500 hover:bg-red-600 shadow-red-100" : "bg-[#064e3b] hover:bg-[#043d2e] shadow-emerald-950/20"}`}
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-5 shadow-2xl space-y-3.5 relative border border-slate-100 max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar">
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
                  <span className="font-mono font-bold text-[#065f46] text-xs">{publicInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Patient Name</span>
                  <span className="font-extrabold text-slate-900 text-xs">{publicInvoice.patientName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Consulting Doctor</span>
                  <span className="font-bold text-slate-800 text-xs">{publicInvoice.doctorName || "—"}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-700 font-extrabold text-xs">Total Amount Paid</span>
                  <span className="font-black text-[#065f46] text-base">₹{publicInvoice.amount}.00</span>
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
              className="w-full py-2.5 bg-[#064e3b] hover:bg-[#043d2e] text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
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
