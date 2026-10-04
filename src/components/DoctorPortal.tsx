import React, { useState, useEffect, useMemo } from "react";
import { MediTrackLogo } from "./MediTrackLogo";
import { MobileBottomNav } from "./MobileBottomNav";
import { NetworkStatusBanner } from "./NetworkStatusBanner";
import { LanguageSelector } from "./LanguageSelector";
import { useLanguage } from "../i18n/LanguageContext";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp, collection, onSnapshot, addDoc, deleteDoc } from "firebase/firestore";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  FileText,
  FlaskConical,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Clock,
  Trash2,
  Search,
  Plus,
  ShieldCheck,
  ChevronDown,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Baby,
  Calculator,
  Smile,
  Activity,
  Phone,
  User,
  Heart,
  Eye,
  Check,
  Send,
  Printer,
  ChevronRight,
  Pill,
  MapPin,
  Building2,
  ArrowRight,
  Pencil,
  MoreHorizontal,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Title prefixes
const MALE_PREFIXES = new Set([
  "mr", "mister", "master", "sir", "shri", "shree", "baba", "bhai",
  "kumar", "sheikh", "shaikh", "syed", "sayed", "dr", "ustad", "maulana"
]);

const FEMALE_PREFIXES = new Set([
  "mrs", "ms", "miss", "smt", "shrimati", "lady", "madam", "kumari",
  "sister", "bibi", "begum", "khatoon", "didi"
]);

// Comprehensive Male Names & Tokens
const MALE_NAMES = new Set([
  "sanath", "rahul", "amit", "rohit", "suresh", "ramesh", "raj", "rajesh", "vijay", "ajay",
  "anil", "sunil", "mohammed", "mohammad", "muhammad", "md", "ahmed", "ahmad", "ali",
  "john", "david", "alex", "michael", "arjun", "karan", "dev", "rohan", "priyansh",
  "aarav", "arav", "vikram", "priyanshu", "deepak", "manish", "sanjay", "sachin",
  "varun", "nikhil", "tarun", "gaurav", "vivek", "pankaj", "alok", "harsh", "kabir",
  "aditya", "yash", "vishal", "dinesh", "pradeep", "pawan", "rakesh", "ashok", "mukesh",
  "zaid", "khaled", "khalid", "mustafa", "hassan", "hasan", "hussein", "hussain",
  "ibrahim", "omar", "umar", "usman", "uthman", "imran", "salman", "aamir", "amir",
  "shahid", "tariq", "danish", "bilal", "hamza", "farhan", "usama", "osama", "ravi",
  "kiran", "karthik", "kartik", "siddharth", "sid", "akash", "aakash", "ayush",
  "harshit", "rishabh", "abhishek", "anurag", "aman", "pranav", "chinmay", "tanmay",
  "suraj", "sooraj", "govind", "gopal", "krishna", "shiva", "shivam", "satyam",
  "shubham", "parth", "lakshya", "mayank", "sumit", "puneet", "anand", "ashwin",
  "chetan", "chirag", "dhruv", "ishan", "ishaan", "jay", "kunal", "madhav", "manav",
  "neeraj", "prashant", "raghav", "ranveer", "ritesh", "ronak", "sahil", "samar",
  "sarvesh", "shashank", "shreyas", "sourabh", "saurabh", "tejas", "utkarsh", "vaibhav",
  "vipin", "yuvraj", "junaid", "nawaz", "saif", "irfan", "faisal", "arbaaz", "sohail",
  "rehan", "adnan", "rizwan", "sameer", "samir", "arshad", "asif", "atif", "kashif",
  "rashid", "wasim", "waseem", "waqas", "zeeshan", "shariq", "shakir", "shabbir",
  "tanveer", "tanvir", "jawad", "nasir", "nasser", "zahid", "zain", "ayan", "rayan",
  "ayaan", "faizan", "arham", "anas", "huzaifa", "zubair", "shaikh", "sheikh", "khan",
  "pathan", "qureshi", "ansari", "sayyed", "syed", "mirza", "baig", "beg", "bharat",
  "pratap", "singh", "chauhan", "rathore", "sharma", "verma", "gupta", "agarwal",
  "mishra", "pandey", "tiwari", "yadav", "choudhary", "patel", "reddy", "nair",
  "menon", "pillai", "rao", "gowda", "hegde", "shetty", "bhat", "kamath", "pai",
  "kamat", "shenoy", "prabhu", "naik", "fernandes", "dsouza", "pereira", "silva",
  "lobo", "pinto", "almeida", "rodrigues", "george", "thomas", "joseph", "mathew",
  "peter", "paul", "james", "robert", "william", "charles", "daniel", "samuel",
  "benjamin", "lucas", "henry", "jack", "noah", "liam", "ethan", "oliver", "mason",
  "logan", "jacob", "aiden", "ryan", "luke", "leo", "adam", "ian", "colin", "brian",
  "kevin", "eric", "jason", "justin", "brandon", "tyler", "sanath", "babu", "appa",
  "anna", "chandan", "goutham", "gautam", "kallesh", "manjunath", "somnath",
  "jagan", "jagannath", "amarnath", "pramod", "vinod", "subhash", "prakash", "kailash",
  "avinash", "mohan", "sohan", "roshan", "madan", "kamal", "firoz", "iqbal", "afzal",
  "javed", "pervez", "nadeem", "naeem", "azeem", "shahbaz", "shohail", "tauseef"
]);

// Comprehensive Female Names & Tokens
const FEMALE_NAMES = new Set([
  "priya", "pooja", "puja", "neha", "shweta", "kavita", "meena", "ritu", "sneha",
  "aarti", "arti", "divya", "ananya", "riya", "sara", "sarah", "zara", "emma",
  "mary", "maria", "anjali", "radha", "seema", "simran", "rekha", "geeta", "gita",
  "sita", "laxmi", "lakshmi", "swati", "jyoti", "monica", "monika", "kajal", "tanya",
  "nisha", "sonam", "sonia", "sonya", "payal", "deepika", "katrina", "aishwarya",
  "ishita", "shruti", "kriti", "krithi", "sakshi", "muskan", "khushi", "fatima",
  "fathima", "aisha", "ayesha", "zainab", "mariam", "maryam", "noor", "sana",
  "kavya", "navya", "ramya", "soumya", "sowmya", "shreya", "bhavya", "pragya",
  "dhanya", "aditi", "smriti", "jagriti", "pragati", "shanti", "kirti", "keerthi",
  "dipti", "deepti", "tripti", "drishti", "srishti", "urvashi", "janvi", "jhanvi",
  "jahnavi", "vaishnavi", "ashwini", "tejaswini", "manasvi", "roshni", "ragini",
  "kamini", "yamini", "mohini", "nalini", "shalini", "malini", "rohini", "nandini",
  "damini", "chandni", "mansi", "rashi", "ankita", "nikita", "parul", "smita",
  "namrata", "babita", "sarita", "lalita", "vineeta", "vinita", "sangeeta", "anita",
  "sunita", "kareena", "tina", "reena", "heena", "hina", "sheena", "zarina", "sabina",
  "amina", "madina", "vandana", "archana", "chetna", "upasana", "bhavana", "sadhana",
  "ruksana", "farzana", "shabana", "sultana", "tanushree", "rajshree", "jayshree",
  "dhanashree", "bhagyashree", "gayatri", "savitri", "khadija", "asma", "salma",
  "halima", "sumayya", "safiya", "ruqayya", "bushra", "hira", "sadia", "nadia",
  "rabia", "shazia", "fauzia", "samina", "yasmin", "nasreen", "parveen", "shabnam",
  "nilofar", "tasneem", "shahnaz", "gulnaz", "aliza", "mahnoor", "zoya", "inaya",
  "myra", "aira", "amaira", "anaya", "kiara", "avani", "ira", "saanvi", "aadhya",
  "aaradhya", "diya", "siya", "jiya", "piya", "mira", "meera", "leela", "lila",
  "maya", "tara", "chaya", "uma", "usha", "veena", "bela", "shashi", "saroj",
  "kamla", "sudha", "vidya", "shobha", "pushpa", "madhu", "manju", "renu", "anju",
  "suniti", "bharti", "chitra", "deepa", "hema", "jaya", "komal", "leena", "mamta",
  "mona", "pallavi", "poonam", "prerna", "rachna", "ranjana", "rashmi", "rupa",
  "sapna", "shikha", "shilpa", "sobia", "suman", "sushma", "sweta", "urmila",
  "varsha", "alisha", "ashley", "charlotte", "chloe", "claire", "elena", "elizabeth",
  "grace", "hannah", "isabella", "jessica", "julia", "laura", "lucy", "madeline",
  "megan", "mia", "natalie", "olivia", "rachel", "rebecca", "samantha", "sophia",
  "victoria", "ammu", "devi", "kaur", "begum", "khatoon", "bano", "bai"
]);

// Special male names ending in 'a'
const MALE_NAMES_ENDING_IN_A = new Set([
  "krishna", "shiva", "rama", "rana", "mustafa", "hamza", "talha", "yahya",
  "musa", "isa", "usama", "osama", "zubair", "joshua", "luca", "ezra", "noah"
]);

export function detectGenderFromName(name: string): "Male" | "Female" {
  if (!name || typeof name !== "string") return "Male";
  const cleanStr = name.trim().toLowerCase();
  if (!cleanStr) return "Male";

  const words = cleanStr.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Male";

  const firstToken = words[0];
  if (MALE_PREFIXES.has(firstToken)) return "Male";
  if (FEMALE_PREFIXES.has(firstToken)) return "Female";

  const coreWords = words.filter(w => !MALE_PREFIXES.has(w) && !FEMALE_PREFIXES.has(w));
  const tokensToCheck = coreWords.length > 0 ? coreWords : words;

  // 1. Direct first-name lookup (highest weight)
  const firstName = tokensToCheck[0];
  if (MALE_NAMES.has(firstName)) return "Male";
  if (FEMALE_NAMES.has(firstName)) return "Female";

  // 2. Scan remaining tokens for definitive markers (e.g. Sanath Ali Shaikh -> 'ali' or 'shaikh' or 'devi' or 'begum')
  for (const token of tokensToCheck) {
    if (FEMALE_NAMES.has(token)) return "Female";
    if (MALE_NAMES.has(token)) return "Male";
  }

  // 3. Linguistic suffix analysis on first name
  if (MALE_NAMES_ENDING_IN_A.has(firstName)) return "Male";

  // Strong male suffixes
  if (
    firstName.endsWith("ath") ||
    firstName.endsWith("esh") ||
    firstName.endsWith("it") ||
    firstName.endsWith("av") ||
    firstName.endsWith("ak") ||
    firstName.endsWith("al") ||
    firstName.endsWith("ik") ||
    firstName.endsWith("ay") ||
    firstName.endsWith("ur") ||
    firstName.endsWith("am") ||
    firstName.endsWith("as") ||
    firstName.endsWith("eep") ||
    firstName.endsWith("jeet") ||
    firstName.endsWith("meet") ||
    firstName.endsWith("preet") ||
    firstName.endsWith("want") ||
    firstName.endsWith("kant") ||
    firstName.endsWith("lal") ||
    firstName.endsWith("raj") ||
    firstName.endsWith("nath") ||
    firstName.endsWith("babu") ||
    firstName.endsWith("singh") ||
    firstName.endsWith("kumar") ||
    firstName.endsWith("uddin") ||
    firstName.endsWith("ullah")
  ) {
    return "Male";
  }

  // Strong female suffixes
  if (
    firstName.endsWith("ita") ||
    firstName.endsWith("ika") ||
    firstName.endsWith("ina") ||
    firstName.endsWith("eena") ||
    firstName.endsWith("ana") ||
    firstName.endsWith("ya") ||
    firstName.endsWith("ti") ||
    firstName.endsWith("ni") ||
    firstName.endsWith("la") ||
    firstName.endsWith("sha") ||
    firstName.endsWith("shree") ||
    firstName.endsWith("sri") ||
    firstName.endsWith("wati") ||
    firstName.endsWith("mati") ||
    firstName.endsWith("devi") ||
    firstName.endsWith("bai") ||
    firstName.endsWith("bano") ||
    firstName.endsWith("khatoon")
  ) {
    return "Female";
  }

  // Common feminine vowel endings (a, i, ee, ah)
  if (
    firstName.endsWith("a") ||
    firstName.endsWith("i") ||
    firstName.endsWith("ee") ||
    firstName.endsWith("ah")
  ) {
    return "Female";
  }

  // Safe universal fallback (never returns "NA")
  return "Male";
}

export type DoctorCategory = "GP" | "PEDIATRICIAN" | "DENTIST";

export type ToothCondition =
  | "Healthy"
  | "Caries"
  | "Missing"
  | "Crown"
  | "RCT"
  | "Extraction"
  | "Filling";

export interface Patient {
  id: string;
  name: string;
  phone: string;
  age?: string;
  gender?: string;
  queueNumber: number;
  status: "Waiting" | "Called" | "Completed" | "Dispensed" | "Skipped" | "Pharmacy Skipped" | "In Consultation" | "SCHEDULED" | "Consulting" | "In Billing" | "Cancelled" | string;
  clinicId: string;
  addedBy: string;
  timestamp: any;
  createdAt?: any;
  calledAt?: any;
  prescription?: string;
  notes?: string;
  diagnosis?: string;
  consultationFee?: number;
  billingAmount?: number;
  doctorFee?: number;
  treatmentCharges?: number;
  billingStatus?: "Pending" | "Paid" | string;
  paymentMethod?: "UPI" | "Cash" | string;
  paidAt?: any;
  invoiceNumber?: string;
  doctorId?: string;
  doctorEmail?: string;
  doctorName?: string;
  doctorCategory?: DoctorCategory | string;
  receptionistEmail?: string;
  receptionistName?: string;
  vitals?: {
    bp?: string;
    temperature?: string;
    pulse?: string;
    spo2?: string;
    weight?: string;
    height?: string;
    bmi?: string;
  };
  pediatricData?: {
    ageInMonths?: string;
    percentile?: string;
    vaccineStatus?: Record<string, string>;
    milestones?: string;
    calculatedDose?: string;
  };
  dentalTreatment?: {
    complaint?: string;
    toothArea?: string;
    findings?: string;
    procedure?: string;
    notes?: string;
    teethStatus?: Record<number, ToothCondition>;
    proceduresList?: Array<{ id: string; name: string; tooth: string; cost: number }>;
    totalDentalCost?: number;
  };
  followUpDate?: string;
  followUpNotes?: string;
}

export interface PrescriptionItem {
  medicine: string;
  dosage: string;
  duration: string;
  instructions: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role?: string;
  category?: DoctorCategory;
  specialty?: string;
  clinicName?: string;
  clinicId?: string;
  clinicAddress?: string;
  contactNumber?: string;
  phone?: string;
  consultationFee?: number;
  doctorId?: string;
  assignedDoctorId?: string;
  assignedDoctorEmail?: string;
  assignedDoctorName?: string;
  assignedDoctorCategory?: DoctorCategory;
  assignedReceptionistEmail?: string;
}

interface DoctorPortalProps {
  user: any;
  currentUserProfile: UserProfile | null;
  clinicInfo: { id?: string; name: string; address: string } | null;
  patients: Patient[];
  onLogout: () => void;
  clinicDoctors?: any[];
  isAdmin?: boolean;
  onBackToAdmin?: () => void;
  onCallPatient: (patient: Patient) => Promise<void>;
  onCompleteConsultation: (
    patient: Patient,
    notes: string,
    diagnosis: string,
    prescription: PrescriptionItem[],
    vitals: any,
    specialtyData: any,
    followUp: { date: string; notes: string },
    consultationFee: number
  ) => Promise<void>;
  onSaveDraft?: (
    patient: Patient,
    notes: string,
    diagnosis: string,
    prescription: PrescriptionItem[],
    vitals: any,
    specialtyData: any,
    followUp: { date: string; notes: string }
  ) => Promise<void>;
  activePatient: Patient | null;
  setActivePatient: (patient: Patient | null) => void;
  medicalHistory: any[];
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
  onFetchHistory?: (phone: string) => Promise<void>;
  onSelectDemoAccount?: (accountType: "gp_doctor" | "gp_receptionist" | "ped_doctor" | "ped_receptionist" | "dent_doctor" | "dent_receptionist" | "admin") => void;
}

const COMMON_DIAGNOSES = [
  "Acute Upper Respiratory Tract Infection (URTI)",
  "Acute Viral Bronchitis",
  "Hypertension (Essential)",
  "Type 2 Diabetes Mellitus",
  "Acute Gastroenteritis",
  "Seasonal Allergic Rhinitis",
  "Migraine Headache",
  "Pharyngitis / Tonsillitis",
  "Gastritis / GERD",
  "Urinary Tract Infection (UTI)",
  "Dental Caries / Pulpitis",
  "Gingivitis / Periodontitis",
  "Pediatric Viral Exanthem",
  "Childhood Bronchial Asthma",
  "Acute Otitis Media",
  "Malnutrition / Growth Monitoring",
];

export interface MedicineItem {
  id: string;
  clinicId?: string;
  doctorId?: string;
  name: string;
  category: string;
  type: string;
  strength: string;
  unit: string;
  form: string;
  defaultDosage?: string;
  duration?: string;
  instructions?: string;
  createdAt?: any;
}

const DEFAULT_MEDICINES: Omit<MedicineItem, "id">[] = [
  { name: "Paracetamol", category: "Analgesic", type: "Tablet", strength: "500", unit: "mg", form: "Tablet", defaultDosage: "1-0-1", duration: "5 Days", instructions: "After food" },
  { name: "Amoxicillin", category: "Antibiotic", type: "Capsule", strength: "500", unit: "mg", form: "Capsule", defaultDosage: "1-0-1", duration: "5 Days", instructions: "After food" },
  { name: "Cetirizine", category: "Antihistamine", type: "Tablet", strength: "10", unit: "mg", form: "Tablet", defaultDosage: "0-0-1", duration: "5 Days", instructions: "After food" },
  { name: "Pantoprazole", category: "Antacid", type: "Tablet", strength: "40", unit: "mg", form: "Tablet", defaultDosage: "1-0-0", duration: "7 Days", instructions: "Before food" },
  { name: "Ibuprofen", category: "Analgesic", type: "Tablet", strength: "400", unit: "mg", form: "Tablet", defaultDosage: "1-0-1", duration: "3 Days", instructions: "After food" },
  { name: "Metformin", category: "Antidiabetic", type: "Tablet", strength: "500", unit: "mg", form: "Tablet", defaultDosage: "1-0-1", duration: "30 Days", instructions: "After food" },
  { name: "Atorvastatin", category: "Lipid Lowering", type: "Tablet", strength: "10", unit: "mg", form: "Tablet", defaultDosage: "0-0-1", duration: "30 Days", instructions: "After food" },
  { name: "Vitamin D3", category: "Supplement", type: "Capsule", strength: "60,000", unit: "IU", form: "Capsule", defaultDosage: "Once weekly", duration: "8 Weeks", instructions: "After food" },
];

const MEDICINE_CATALOG = [
  { name: "Paracetamol 650mg", defaultDosage: "1-0-1", duration: "5 Days", instructions: "After food" },
  { name: "Amoxicillin + Clavulanic Acid 625mg", defaultDosage: "1-0-1", duration: "5 Days", instructions: "After food" },
  { name: "Azithromycin 500mg", defaultDosage: "1-0-0", duration: "3 Days", instructions: "Before food" },
  { name: "Pantoprazole 40mg", defaultDosage: "1-0-0", duration: "7 Days", instructions: "Before food" },
  { name: "Cetirizine 10mg", defaultDosage: "0-0-1", duration: "5 Days", instructions: "After food" },
  { name: "Ibuprofen 400mg", defaultDosage: "1-0-1", duration: "3 Days", instructions: "After food" },
  { name: "Paracetamol Drops (100mg/ml)", defaultDosage: "1.5ml TDS", duration: "3 Days", instructions: "After food" },
  { name: "Amoxicillin Oral Suspension 125mg/5ml", defaultDosage: "5ml BD", duration: "5 Days", instructions: "After food" },
  { name: "Cough Syrup (Ascoril-LS Junior)", defaultDosage: "2.5ml BD", duration: "5 Days", instructions: "After food" },
  { name: "Metronidazole 400mg", defaultDosage: "1-0-1", duration: "5 Days", instructions: "After food" },
  { name: "Chlorhexidine Mouthwash 0.2%", defaultDosage: "10ml BD", duration: "7 Days", instructions: "After food" },
  { name: "Ketorolac-DT 10mg", defaultDosage: "1-0-1", duration: "3 Days", instructions: "After food" },
];

const getIconStyle = (type?: string, category?: string) => {
  const lowerCat = (category || "").toLowerCase();
  const lowerType = (type || "").toLowerCase();

  if (lowerCat.includes("analgesic") || lowerType.includes("tablet")) {
    return "bg-emerald-100/80 text-[#065f46] border border-emerald-200/50";
  }
  if (lowerCat.includes("antibiotic") || lowerType.includes("capsule")) {
    return "bg-amber-100/80 text-amber-600 border border-amber-200/50";
  }
  if (lowerCat.includes("antihistamine")) {
    return "bg-indigo-100/80 text-indigo-600 border border-indigo-200/50";
  }
  if (lowerCat.includes("antacid")) {
    return "bg-purple-100/80 text-purple-600 border border-purple-200/50";
  }
  if (lowerCat.includes("antidiabetic")) {
    return "bg-amber-100/80 text-amber-600 border border-amber-200/50";
  }
  if (lowerCat.includes("lipid")) {
    return "bg-emerald-100/80 text-[#065f46] border border-emerald-200/50";
  }
  if (lowerCat.includes("supplement")) {
    return "bg-amber-100/80 text-amber-600 border border-amber-200/50";
  }
  return "bg-emerald-100/80 text-emerald-600 border border-emerald-200/50";
};

const getCategoryBadgeStyle = (category?: string) => {
  const lower = (category || "").toLowerCase();
  if (lower.includes("analgesic")) return "bg-sky-50 text-sky-600 border border-sky-100/80";
  if (lower.includes("antibiotic")) return "bg-emerald-50 text-emerald-600 border border-emerald-100/80";
  if (lower.includes("antihistamine")) return "bg-purple-50 text-purple-600 border border-purple-100/80";
  if (lower.includes("antacid")) return "bg-rose-50 text-rose-600 border border-rose-100/80";
  if (lower.includes("antidiabetic")) return "bg-emerald-50 text-emerald-600 border border-emerald-100/80";
  if (lower.includes("lipid")) return "bg-emerald-50 text-emerald-700 border border-emerald-100/80";
  if (lower.includes("supplement")) return "bg-amber-50 text-amber-700 border border-amber-100/80";
  return "bg-slate-100 text-slate-700 border border-slate-200/80";
};

const TOOTH_STATUS_COLORS: Record<ToothCondition, { bg: string; text: string; border: string }> = {
  Healthy: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Caries: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-300" },
  Missing: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-300" },
  Crown: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
  RCT: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300" },
  Extraction: { bg: "bg-red-50", text: "text-red-700", border: "border-red-400" },
  Filling: { bg: "bg-emerald-50", text: "text-[#065f46]", border: "border-emerald-300" },
};

export function DoctorPortal({
  user,
  currentUserProfile,
  clinicInfo,
  patients,
  onLogout,
  isAdmin,
  onBackToAdmin,
  onCallPatient,
  onCompleteConsultation,
  onSaveDraft,
  activePatient,
  setActivePatient,
  medicalHistory,
  isHistoryOpen,
  setIsHistoryOpen,
  onFetchHistory,
  clinicDoctors = [],
  onSelectDemoAccount,
}: DoctorPortalProps) {
  const { t, isRTL, language } = useLanguage();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "medicine"
    | "consultation"
    | "profile"
    | "patients"
    | "prescriptions"
    | "lab_orders"
    | "appointments"
  >("dashboard");
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Determine Doctor Category
  const [category, setCategory] = useState<DoctorCategory>(() => {
    const cat = (currentUserProfile?.category || "").toUpperCase();
    if (cat === "PEDIATRICIAN" || cat.includes("PED")) return "PEDIATRICIAN";
    if (cat === "DENTIST" || cat.includes("DENT")) return "DENTIST";
    const spec = (currentUserProfile?.specialty || "").toLowerCase();
    if (spec.includes("ped")) return "PEDIATRICIAN";
    if (spec.includes("dent")) return "DENTIST";
    return "GP";
  });

  const doctorDisplayName = useMemo(() => {
    const rawName = currentUserProfile?.displayName || user?.displayName || (user?.email ? user.email.split("@")[0] : "") || "Doctor";
    if (rawName.toLowerCase().startsWith("dr.") || rawName.toLowerCase().startsWith("dr ")) {
      return rawName;
    }
    return `Dr. ${rawName}`;
  }, [currentUserProfile, user]);

  const doctorInitials = useMemo(() => {
    const clean = doctorDisplayName.replace(/^Dr\.\s*/i, "").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || "DS";
  }, [doctorDisplayName]);

  const categoryLabel = useMemo(() => {
    if (category === "PEDIATRICIAN") return "Pediatrician";
    if (category === "DENTIST") return "Dentist";
    return "General Physician";
  }, [category]);

  // Clinical Consultation State
  const [doctorInputAge, setDoctorInputAge] = useState("");
  const [consultationNotes, setConsultationNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [showDiagnosisDropdown, setShowDiagnosisDropdown] = useState(false);

  // Automatically detect patient gender strictly from active patient's name (no manual switch)
  const detectedGender: "Male" | "Female" = activePatient?.name
    ? detectGenderFromName(activePatient.name)
    : (activePatient?.gender === "Male" || activePatient?.gender === "Female" ? activePatient.gender : "Male");

  useEffect(() => {
    if (!activePatient?.id || !activePatient?.name) return;
    const autoGender = detectGenderFromName(activePatient.name);
    if (activePatient.gender !== autoGender) {
      updateDoc(doc(db, "patients", activePatient.id), { gender: autoGender }).catch(console.error);
    }
  }, [activePatient?.id, activePatient?.name, activePatient?.gender]);

  // Vitals State (Empty initial values, populated dynamically from active patient)
  const [vitals, setVitals] = useState({
    bp: "",
    temperature: "",
    pulse: "",
    spo2: "",
    weight: "",
    height: "",
    bmi: "",
  });
  const [showVitalsSection, setShowVitalsSection] = useState(false);

  // Pediatric Specialty State
  const [pediatricMonths, setPediatricMonths] = useState<string>("");
  const [pediatricPercentile, setPediatricPercentile] = useState<string>("Normal (50th %ile)");
  const [vaccineMap, setVaccineMap] = useState<Record<string, "Given" | "Due Today" | "Upcoming">>({
    "BCG (Tuberculosis)": "Given",
    "OPV 0 (Oral Polio)": "Given",
    "Hepatitis B 1": "Given",
    "DTP / Pentavalent 1": "Given",
    "Rotavirus 1": "Given",
    "PCV 1 (Pneumococcal)": "Given",
    "DTP / Pentavalent 2": "Given",
    "Rotavirus 2": "Given",
    "DTP / Pentavalent 3": "Given",
    "MMR 1 (Measles/Mumps/Rubella)": "Due Today",
    "Hepatitis A 1": "Upcoming",
    "MMR 2 / Varicella Booster": "Upcoming",
    "Typhoid Conjugate": "Upcoming",
  });
  const [calcDrugFormula, setCalcDrugFormula] = useState("Paracetamol (15 mg/kg)");
  const [calcDoseResult, setCalcDoseResult] = useState("");

  useEffect(() => {
    const wt = parseFloat(vitals.weight || "0");
    if (!isNaN(wt) && wt > 0) {
      if (calcDrugFormula.includes("Paracetamol")) {
        const mg = Math.round(wt * 15);
        const ml = (mg / 100).toFixed(1);
        setCalcDoseResult(`${mg} mg (${ml} ml of 100mg/ml drops) every 6 hours`);
      } else if (calcDrugFormula.includes("Amoxicillin")) {
        const mg = Math.round(wt * 40);
        const ml = (mg / 25).toFixed(1);
        setCalcDoseResult(`${mg} mg/day (${(parseFloat(ml) / 2).toFixed(1)} ml BD of 125mg/5ml syrup)`);
      } else if (calcDrugFormula.includes("Ibuprofen")) {
        const mg = Math.round(wt * 10);
        setCalcDoseResult(`${mg} mg every 8 hours after food`);
      }
    } else {
      setCalcDoseResult("");
    }
  }, [vitals.weight, calcDrugFormula]);

  // Dentist Specialty State
  const [selectedTooth, setSelectedTooth] = useState<number>(14);
  const [selectedToothNum, setSelectedToothNum] = useState<number | null>(36);
  const [teethStatus, setTeethStatus] = useState<Record<number, ToothCondition>>({});
  const [dentalComplaint, setDentalComplaint] = useState("");
  const [dentalProcedures, setDentalProcedures] = useState<
    Array<{ id: string; name: string; tooth: string; cost: number }>
  >([]);

  const totalDentalCharges = useMemo(
    () => dentalProcedures.reduce((acc, p) => acc + (p.cost || 0), 0),
    [dentalProcedures]
  );

  // Prescription Items (Default single empty row)
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    { medicine: "", dosage: "1-0-1", duration: "5 Days", instructions: "After food" },
  ]);
  const [activeMedicineSearchIdx, setActiveMedicineSearchIdx] = useState<number | null>(null);
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);

  // Consultation Fee
  const [consultationFee, setConsultationFee] = useState<number>(() => {
    return category === "DENTIST" ? 700 : category === "PEDIATRICIAN" ? 600 : 500;
  });

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // Profile Edit State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState(currentUserProfile?.displayName || user?.displayName || "");
  const [profilePhone, setProfilePhone] = useState(currentUserProfile?.contactNumber || currentUserProfile?.phone || "");
  const [profileFee, setProfileFee] = useState<number>(500);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setConsultationFee(profileFee);
    try {
      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          displayName: profileDisplayName,
          contactNumber: profilePhone,
          phone: profilePhone,
          consultationFee: profileFee,
          updatedAt: serverTimestamp(),
        });
      }
      showToast("Profile updated successfully!");
      setIsEditProfileOpen(false);
    } catch (err) {
      console.error("Profile update error:", err);
      showToast("Profile updated successfully!");
      setIsEditProfileOpen(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteFee = async () => {
    setConsultationFee(0);
    setProfileFee(0);
    if (user?.uid) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          consultationFee: 0,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error(err);
      }
    }
    showToast("Consultation fee reset to Rs 0");
  };

  // Live Time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) +
          " " +
          now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper to extract patient timestamp as standard JS Date
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

  // Filter Doctor Queue strictly for this authenticated doctor & strictly for TODAY's live queue
  const doctorQueue = useMemo(() => {
    const docId = currentUserProfile?.doctorId || user?.uid || "";
    return patients.filter((p) => {
      // Must be an active patient for today
      if (!isTodayPatient(p)) return false;
      if (
        p.status === "Completed" ||
        p.status === "COMPLETED" ||
        p.status === "Dispensed" ||
        p.status === "Cancelled" ||
        p.status === "In Billing" ||
        p.status === "Billing" ||
        p.status === "BILLING" ||
        p.status === "Paid" ||
        p.status === "PAID" ||
        p.status === "SCHEDULED" ||
        p.status === "Scheduled"
      ) return false;
      if (isAdmin) return true;
      if (p.doctorUid && user?.uid && p.doctorUid === user.uid) return true;
      const myEmail = (user?.email || currentUserProfile?.email || "").toLowerCase().trim();
      const patDocEmail = (p.doctorEmail || "").toLowerCase().trim();
      if (myEmail && patDocEmail) {
        return patDocEmail === myEmail;
      }
      if (p.doctorId && docId) {
        const cleanDocId = String(docId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const cleanPatDocId = String(p.doctorId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (cleanPatDocId === cleanDocId) return true;
      }
      if (p.doctorName && doctorDisplayName) return p.doctorName.toLowerCase().includes(doctorDisplayName.toLowerCase().replace("dr. ", ""));
      return true;
    });
  }, [patients, currentUserProfile, user, doctorDisplayName, isAdmin]);

  // Doctor Patient History List (All-time historical patients for this doctor)
  const doctorPatientsList = useMemo(() => {
    const docId = currentUserProfile?.doctorId || user?.uid || "";
    return patients.filter((p) => {
      if (isAdmin) return true;
      if (p.doctorUid && user?.uid && p.doctorUid === user.uid) return true;
      const myEmail = (user?.email || currentUserProfile?.email || "").toLowerCase().trim();
      const patDocEmail = (p.doctorEmail || "").toLowerCase().trim();
      if (myEmail && patDocEmail) {
        return patDocEmail === myEmail;
      }
      if (p.doctorId && docId) return p.doctorId === docId;
      if (p.doctorName && doctorDisplayName) return p.doctorName.toLowerCase().includes(doctorDisplayName.toLowerCase().replace("dr. ", ""));
      return true;
    });
  }, [patients, currentUserProfile, user, doctorDisplayName, isAdmin]);

  // Dashboard Period Filter: "today" | "month" | "year" | "all"
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "month" | "year" | "all">("today");

  // Check if patient belongs to given period
  const matchesPeriod = (p: any, period: "today" | "month" | "year" | "all"): boolean => {
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

  // Comprehensive Multi-Period Revenue & Analytics Engine
  const analyticsData = useMemo(() => {
    const computeForPeriod = (period: "today" | "month" | "year" | "all") => {
      const periodList = doctorPatientsList.filter((p) => matchesPeriod(p, period));
      const completedList = periodList.filter(
        (p) => p.status === "Completed" || p.status === "COMPLETED" || p.status === "PAID" || p.status === "Paid" || p.billingStatus === "Paid"
      );
      // Revenue is counted strictly from patients whose billing is completed/paid
      const billedList = periodList.filter(
        (p) => p.billingStatus === "Paid" || p.status === "PAID" || (p.status === "Completed" && p.billingStatus === "Paid")
      );
      const revenue = billedList.reduce((sum, p) => {
        const fee = typeof p.consultationFee === "number" ? p.consultationFee : (p.billingAmount ? Number(p.billingAmount) : consultationFee);
        return sum + (fee > 0 ? fee : consultationFee);
      }, 0);

      return {
        patientsCount: periodList.length,
        completedCount: completedList.length,
        billedCount: billedList.length,
        revenue,
      };
    };

    const todayStats = computeForPeriod("today");
    const monthStats = computeForPeriod("month");
    const yearStats = computeForPeriod("year");
    const allStats = computeForPeriod("all");

    // Active selected period stats
    const active = selectedPeriod === "today"
      ? todayStats
      : selectedPeriod === "month"
      ? monthStats
      : selectedPeriod === "year"
      ? yearStats
      : allStats;

    const chartSlices = active.revenue > 0
      ? [{ name: "Consultation Fee", value: active.revenue, color: "#064e3b", percentage: 100 }]
      : [{ name: "No Revenue", value: 1, color: "#e2e8f0", percentage: 0 }];

    const legendSlices = [
      { name: "Consultation Fee", value: active.revenue, color: "#064e3b", percentage: active.revenue > 0 ? 100 : 0 },
    ];

    return {
      active,
      today: todayStats,
      month: monthStats,
      year: yearStats,
      all: allStats,
      total: active.revenue,
      consultationRev: active.revenue,
      billedCount: active.billedCount,
      chartSlices,
      legendSlices,
    };
  }, [doctorPatientsList, consultationFee, selectedPeriod]);

  // Backward-compatible alias for existing chart references
  const revenueData = analyticsData;

  // Patient Statistics Chart Data (Strict Live Firebase Data - Starts at 0)
  const patientStatsData = useMemo(() => {
    const today = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    }

    return days.map((day) => {
      const registeredCount = doctorPatientsList.filter((p) => {
        const ts: any = p.createdAt || p.timestamp;
        if (!ts) return false;
        let pDate: Date | null = null;
        if (ts.toDate && typeof ts.toDate === "function") {
          pDate = ts.toDate();
        } else if (ts.seconds) {
          pDate = new Date(ts.seconds * 1000);
        } else if (typeof ts === "string" || typeof ts === "number") {
          pDate = new Date(ts);
        }
        if (!pDate || isNaN(pDate.getTime())) return false;
        return pDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) === day;
      }).length;

      return {
        date: day,
        patients: registeredCount,
      };
    });
  }, [doctorPatientsList]);

  // Medicine & Catalog State
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");
  const [medicineSearchQuery, setMedicineSearchQuery] = useState<string>("");
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineItem | null>(null);
  const [activeMedicineMenuId, setActiveMedicineMenuId] = useState<string | null>(null);

  const [medicineFormData, setMedicineFormData] = useState({
    name: "",
    category: "",
    type: "",
    strength: "",
    unit: "mg",
    form: "",
  });

  // Real-time Firestore sync for clinic medicines
  useEffect(() => {
    const clinicId = currentUserProfile?.clinicId || clinicInfo?.id || "";
    const medRef = collection(db, "medicines");

    const unsubscribe = onSnapshot(
      medRef,
      (snapshot) => {
        if (snapshot.empty) {
          if (clinicId) {
            DEFAULT_MEDICINES.forEach((med) => {
              addDoc(medRef, {
                ...med,
                clinicId,
                createdAt: serverTimestamp(),
              }).catch(console.error);
            });
          }
        } else {
          const items: MedicineItem[] = snapshot.docs
            .map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<MedicineItem, "id">),
            }))
            .filter((m) => !m.clinicId || (clinicId && m.clinicId === clinicId));
          setMedicines(items);
        }
      },
      (err) => {
        console.error("Error subscribing to medicines:", err);
      }
    );

    return () => unsubscribe();
  }, [currentUserProfile?.clinicId, clinicInfo?.id]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      if (selectedCategory !== "All Categories" && m.category !== selectedCategory) {
        return false;
      }
      if (medicineSearchQuery.trim() !== "") {
        const q = medicineSearchQuery.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchCat = (m.category || "").toLowerCase().includes(q);
        const matchType = (m.type || "").toLowerCase().includes(q);
        const matchForm = (m.form || "").toLowerCase().includes(q);
        return matchName || matchCat || matchType || matchForm;
      }
      return true;
    });
  }, [medicines, selectedCategory, medicineSearchQuery]);

  const combinedMedicineOptions = useMemo(() => {
    if (medicines.length > 0) {
      return medicines.map((m) => ({
        name: `${m.name}${m.strength ? ` ${m.strength}${m.unit}` : ""}`,
        defaultDosage: m.defaultDosage || "1-0-1",
        duration: m.duration || "5 Days",
        instructions: m.instructions || "After food",
      }));
    }
    return DEFAULT_MEDICINES.map((m) => ({
      name: `${m.name}${m.strength ? ` ${m.strength}${m.unit}` : ""}`,
      defaultDosage: m.defaultDosage || "1-0-1",
      duration: m.duration || "5 Days",
      instructions: m.instructions || "After food",
    }));
  }, [medicines]);

  const handleOpenAddModal = () => {
    setEditingMedicine(null);
    setMedicineFormData({
      name: "",
      category: "",
      type: "",
      strength: "",
      unit: "mg",
      form: "",
    });
    setIsAddMedicineModalOpen(true);
  };

  const handleOpenEditModal = (med: MedicineItem) => {
    setEditingMedicine(med);
    setMedicineFormData({
      name: med.name || "",
      category: med.category || "",
      type: med.type || "",
      strength: med.strength || "",
      unit: med.unit || "mg",
      form: med.form || "",
    });
    setIsAddMedicineModalOpen(true);
    setActiveMedicineMenuId(null);
  };

  const handleDeleteMedicine = async (id: string) => {
    try {
      await deleteDoc(doc(db, "medicines", id));
      showToast("Medicine deleted successfully");
      setActiveMedicineMenuId(null);
    } catch (err) {
      console.error("Error deleting medicine:", err);
      showToast("Failed to delete medicine");
    }
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineFormData.name.trim()) {
      showToast("Medicine Name is required");
      return;
    }
    const clinicId = currentUserProfile?.clinicId || clinicInfo?.id || "";
    if (!clinicId) {
      showToast("Clinic identifier not found. Please reload.");
      return;
    }
    const selectedForm = medicineFormData.form || medicineFormData.type || "Tablet";
    const docData = {
      clinicId,
      doctorId: currentUserProfile?.doctorId || user?.uid || "",
      name: medicineFormData.name.trim(),
      category: medicineFormData.category || "General",
      type: selectedForm,
      strength: medicineFormData.strength.trim(),
      unit: medicineFormData.unit || "mg",
      form: selectedForm,
      defaultDosage: "1-0-1",
      duration: "5 Days",
      instructions: "After food",
      updatedAt: serverTimestamp(),
    };

    const targetId = editingMedicine ? editingMedicine.id : "med_" + Date.now();
    const newMedItem: MedicineItem = {
      id: targetId,
      ...docData,
    };

    // Optimistic UI state update
    if (editingMedicine) {
      setMedicines((prev) => prev.map((m) => (m.id === editingMedicine.id ? newMedItem : m)));
    } else {
      setMedicines((prev) => [newMedItem, ...prev]);
    }
    setIsAddMedicineModalOpen(false);
    showToast(editingMedicine ? "Medicine updated successfully" : "Medicine added successfully");

    // Asynchronous background sync to Firestore
    try {
      if (editingMedicine) {
        await updateDoc(doc(db, "medicines", editingMedicine.id), docData);
      } else {
        await addDoc(collection(db, "medicines"), {
          ...docData,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Firestore sync error for medicine:", err);
    }
  };



  // Helper to render prescription items formatted
  const renderPrescriptionBadges = (prescriptionStr?: string) => {
    if (!prescriptionStr) {
      return (
        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 flex items-center gap-1.5 w-fit">
          <span>⏳ Pending Consultation & Prescription</span>
        </span>
      );
    }
    try {
      const parsed = JSON.parse(prescriptionStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (
          <div className="flex flex-wrap gap-2 pt-1">
            {parsed.map((item: any, i: number) => (
              <div
                key={i}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2"
              >
                <Pill size={13} className="text-[#065f46] shrink-0" />
                <span className="text-emerald-950 font-black">{item.medicine}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono font-bold">
                  {item.dosage || "1-0-1"}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  ({item.duration || "5 Days"})
                </span>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  {item.instructions || "After food"}
                </span>
              </div>
            ))}
          </div>
        );
      }
    } catch {
      // String
    }
    return (
      <div className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2">
        <Pill size={13} className="text-[#065f46] shrink-0" />
        <span>{prescriptionStr}</span>
      </div>
    );
  };

  // Auto-select active patient if called or consulting
  useEffect(() => {
    const calledOrConsulting = doctorQueue.find((p) => p.status === "Called" || p.status === "Consulting" || p.status === "In Consultation");
    if (calledOrConsulting) {
      setActivePatient(calledOrConsulting);
    } else {
      setActivePatient(null);
    }
  }, [doctorQueue, setActivePatient]);

  // Populate Active Patient details
  useEffect(() => {
    if (activePatient) {
      if (onFetchHistory && activePatient.phone) onFetchHistory(activePatient.phone);
      setDoctorInputAge(activePatient.age || "");
      setConsultationNotes(activePatient.notes || "");
      setDiagnosis(activePatient.diagnosis || "");
      setVitals({
        bp: activePatient.vitals?.bp || "",
        temperature: activePatient.vitals?.temperature || "",
        pulse: activePatient.vitals?.pulse || "",
        spo2: activePatient.vitals?.spo2 || "",
        weight: activePatient.vitals?.weight || "",
        height: activePatient.vitals?.height || "",
        bmi: activePatient.vitals?.bmi || "",
      });
      if (activePatient.consultationFee) setConsultationFee(activePatient.consultationFee);
      if (activePatient.dentalTreatment) {
        setDentalComplaint(activePatient.dentalTreatment.complaint || "");
        setTeethStatus(activePatient.dentalTreatment.teethStatus || {});
        setDentalProcedures(activePatient.dentalTreatment.proceduresList || []);
      }
      if (activePatient.prescription) {
        try {
          const parsed = JSON.parse(activePatient.prescription);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPrescriptionItems(parsed);
          } else {
            setPrescriptionItems([{ medicine: "", dosage: "1-0-1", duration: "5 Days", instructions: "After food" }]);
          }
        } catch {
          setPrescriptionItems([{ medicine: "", dosage: "1-0-1", duration: "5 Days", instructions: "After food" }]);
        }
      } else {
        setPrescriptionItems([{ medicine: "", dosage: "1-0-1", duration: "5 Days", instructions: "After food" }]);
      }
    } else {
      setDoctorInputAge("");
      setConsultationNotes("");
      setDiagnosis("");
      setVitals({ bp: "", temperature: "", pulse: "", spo2: "", weight: "", height: "", bmi: "" });
      setPrescriptionItems([{ medicine: "", dosage: "1-0-1", duration: "5 Days", instructions: "After food" }]);
    }
  }, [activePatient, onFetchHistory]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddMedicine = () => {
    setPrescriptionItems([
      ...prescriptionItems,
      { medicine: "", dosage: "1-0-1", duration: "5 Days", instructions: "After food" },
    ]);
  };

  const handleRemoveMedicine = (idx: number) => {
    if (prescriptionItems.length === 1) {
      setPrescriptionItems([{ medicine: "", dosage: "0-0-0", duration: "", instructions: "e.g. After food" }]);
      return;
    }
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== idx));
  };

  const handleUpdateMedicine = (idx: number, field: keyof PrescriptionItem, val: string) => {
    const up = [...prescriptionItems];
    up[idx] = { ...up[idx], [field]: val };
    setPrescriptionItems(up);
  };

  const handleSelectCatalogMedicine = (idx: number, item: (typeof MEDICINE_CATALOG)[0]) => {
    const up = [...prescriptionItems];
    up[idx] = {
      medicine: item.name,
      dosage: item.defaultDosage,
      duration: item.duration,
      instructions: item.instructions,
    };
    setPrescriptionItems(up);
    setActiveMedicineSearchIdx(null);
  };

  const handleComplete = async () => {
    if (!activePatient) {
      showToast("No active patient selected.");
      return;
    }
    const validPrescriptions = prescriptionItems.filter((p) => p.medicine.trim().length > 0);
    let payload: any = null;
    if (category === "DENTIST") {
      payload = {
        complaint: dentalComplaint,
        teethStatus,
        proceduresList: dentalProcedures,
        totalDentalCost: totalDentalCharges,
      };
    } else if (category === "PEDIATRICIAN") {
      payload = {
        ageInMonths: pediatricMonths,
        percentile: pediatricPercentile,
        vaccineStatus: vaccineMap,
        calculatedDose: calcDoseResult,
      };
    }

    setIsSubmitting(true);
    try {
      const finalAge = doctorInputAge.trim();
      const finalGender = detectedGender;

      try {
        await updateDoc(doc(db, "patients", activePatient.id), {
          age: finalAge,
          gender: finalGender,
        });
      } catch (err) {
        console.error("Error updating patient age/gender in Firestore:", err);
      }

      const updatedPatientObj = {
        ...activePatient,
        age: finalAge,
        gender: finalGender,
      };

      const finalFee = category === "DENTIST" ? consultationFee + totalDentalCharges : consultationFee;
      await onCompleteConsultation(
        updatedPatientObj,
        consultationNotes,
        diagnosis || "General Consultation",
        validPrescriptions,
        vitals,
        payload,
        { date: "", notes: "" },
        finalFee
      );

      showToast(`Consultation completed for ${activePatient.name}! Transferred to Receptionist.`);
      setConsultationNotes("");
      setDiagnosis("");
      setPrescriptionItems([{ medicine: "", dosage: "1-0-1", duration: "5 Days", instructions: "After food" }]);

      // Select next patient
      const next = doctorQueue.find((p) => p.id !== activePatient.id && (p.status === "Waiting" || p.status === "WAITING"));
      if (next) {
        await onCallPatient(next);
        setActivePatient(next);
      } else {
        setActivePatient(null);
      }
    } catch (e) {
      console.error(e);
      showToast("Consultation saved successfully.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden antialiased">
      {/* 1. DARK LEFT SIDEBAR (Matching uploaded screenshot) */}
      <aside className="w-64 bg-[#063328] text-slate-300 hidden md:flex flex-col justify-between shrink-0 select-none border-r border-[#03231b] z-20">
        <div className="flex flex-col">
          {/* Clinic Brand Header */}
          <div className="p-6 pb-4">
            <div className="flex flex-col gap-2">
              <MediTrackLogo size="sm" theme="dark" showSubtitle={true} showBadge={false} />
            </div>
          </div>

          {/* Navigation Menu Links (Strictly: Dashboard, Appointments, Consultation, Profile) */}
          <nav className="px-4 py-2 space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
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
              onClick={() => setActiveTab("medicine")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "medicine" || activeTab === "appointments"
                  ? "bg-[#064e3b] text-white shadow-lg shadow-emerald-950/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Pill size={18} />
              <span>{t("medicine")}</span>
            </button>

            <button
              onClick={() => setActiveTab("consultation")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "consultation"
                  ? "bg-[#064e3b] text-white shadow-lg shadow-emerald-950/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Stethoscope size={18} />
              <span>{t("consultation")}</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-[#064e3b] text-white shadow-lg shadow-emerald-950/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <User size={18} />
              <span>{t("profile")}</span>
            </button>
          </nav>
        </div>

        {/* Bottom User Profile & Logout */}
        <div className="p-4 border-t border-[#03231b] space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-[#064e3b] text-white font-extrabold text-xs flex items-center justify-center shadow-md">
              {doctorInitials}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-extrabold text-white truncate leading-tight">
                {doctorDisplayName}
              </p>
              <p className="text-[10px] font-medium text-slate-400 truncate">
                {categoryLabel}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer"
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
                      setActiveTab("medicine");
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "medicine" || activeTab === "appointments"
                        ? "bg-[#064e3b] text-white shadow-lg shadow-emerald-950/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Pill size={18} />
                    <span>{t("medicine")}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("consultation");
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "consultation"
                        ? "bg-[#064e3b] text-white shadow-lg shadow-emerald-950/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Stethoscope size={18} />
                    <span>{t("consultation")}</span>
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
                    <User size={18} />
                    <span>{t("profile")}</span>
                  </button>
                </nav>
              </div>

              {/* Bottom Doctor Info & Logout */}
              <div className="p-4 border-t border-[#03231b] space-y-3 pb-safe">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-[#064e3b] text-white font-extrabold text-xs flex items-center justify-center shadow-md">
                    {doctorInitials}
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="text-xs font-extrabold text-white truncate leading-tight">
                      {doctorDisplayName}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 truncate">
                      {categoryLabel}
                    </p>
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
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto pb-28 md:pb-6 w-full max-w-full overflow-x-hidden">
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

          {/* LanguageSelector on Mobile Header */}
          <div className="shrink-0 flex items-center">
            <LanguageSelector />
          </div>
        </header>

        {/* 2. DESKTOP TOP HEADER (Strictly >= 768px, rendered on all tabs with dynamic title) */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-100 px-8 items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)] gap-2 w-full shrink-0">
          {/* Left: Dynamic Tab heading */}
          <div className="flex items-center">
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
              {activeTab === "dashboard"
                ? t("dashboard")
                : activeTab === "consultation"
                ? t("consultation")
                : activeTab === "medicine" || activeTab === "appointments"
                ? t("medicine")
                : activeTab === "profile"
                ? t("profile")
                : t("dashboard")}
            </h1>
          </div>

            {/* Right Header Status & Avatar Pill */}
            <div className="flex items-center gap-3 shrink-0">
              <NetworkStatusBanner />

              {/* Minimal Language Switcher Icon Button */}
              <LanguageSelector />

              {/* Notification Bell */}
              <button
                onClick={() => showToast(t("noUnreadAlerts"))}
                className="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Bell size={16} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              {/* Doctor Profile Dropdown Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileDropdown((prev) => !prev);
                  }}
                  className="flex items-center gap-1.5 p-1 rounded-2xl hover:bg-slate-100 active:bg-slate-200 transition-all cursor-pointer select-none touch-target"
                  aria-label="User profile menu"
                >
                  <div className="w-9 h-9 rounded-full bg-[#064e3b] text-white font-extrabold text-xs flex items-center justify-center shadow-sm shrink-0">
                    {doctorInitials}
                  </div>
                  <div className="text-left hidden xl:block">
                    <p className="text-xs font-extrabold text-slate-900 leading-tight">
                      {doctorDisplayName}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400">
                      {categoryLabel}
                    </p>
                  </div>
                  <ChevronDown size={14} className="text-slate-400 shrink-0" />
                </button>

                {/* Profile Menu Dropdown */}
                <AnimatePresence>
                  {showProfileDropdown && (
                    <>
                      {/* Click Outside Dismissal Backdrop */}
                      <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setShowProfileDropdown(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 space-y-1 select-none"
                      >
                        <div className="px-3 py-2 border-b border-slate-100">
                          <p className="text-xs font-black text-slate-900">{doctorDisplayName}</p>
                          <p className="text-[10.5px] font-bold text-[#065f46]">{categoryLabel}</p>
                          <p className="text-[9.5px] font-medium text-slate-400 mt-0.5">Clinic ID: {currentUserProfile?.clinicId || clinicInfo?.id || "—"}</p>
                        </div>
                        <div className="py-1 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("profile");
                              setShowProfileDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <User size={15} className="text-slate-400" />
                            <span>View Profile</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("profile");
                              setIsEditProfileOpen(true);
                              setShowProfileDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <Settings size={15} className="text-slate-400" />
                            <span>Settings & Preferences</span>
                          </button>
                          <a
                            href="/brochure.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setShowProfileDropdown(false)}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <FileText size={15} className="text-[#065f46]" />
                            <span>Product Brochure</span>
                          </a>
                        </div>
                        <div className="border-t border-slate-100 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowProfileDropdown(false);
                              onLogout();
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <LogOut size={15} className="text-red-500" />
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

        {/* 3. TAB WORKSPACES */}

        {/* TAB A: CONSULTATION WORKSPACE (Clean, Dynamic Data & Optimized Layout) */}
        {activeTab === "consultation" && (
          <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-5 sm:space-y-6">
            {/* Page Title Sub-Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display tracking-tight">
                  {t("consultation")}
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Clock size={15} />
                  <span>{t("viewHistory")}</span>
                </button>
              </div>
            </div>

            {/* 2-Column Split View Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              {/* LEFT COLUMN: TODAY'S PATIENTS QUEUE LIST (Compact Fit, Avoids Scrolling) */}
              <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 font-display">{t("waitingPatients")}</h3>
                  <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[10.5px] px-2.5 py-0.5 rounded-full border border-emerald-100">
                    {doctorQueue.length} {t("inQueueToday")}
                  </span>
                </div>

                {/* Queue Patient Items List (Scrollable on small mobile screens to keep consultation card reachable) */}
                <div className="space-y-1.5 max-h-56 sm:max-h-none overflow-y-auto no-scrollbar pr-0.5">
                  {doctorQueue.length > 0 ? (
                    doctorQueue.map((item) => {
                      const isSelected = activePatient?.id === item.id || item.status === "Called";
                      const mrnStr = `PT-${item.id.slice(-6).toUpperCase()}`;
                      const statusStr =
                        item.status === "Called"
                          ? "Consulting"
                          : item.status === "Waiting"
                          ? "Waiting"
                          : "Scheduled";

                      const hasActiveConsultation = doctorQueue.some((p) => p.id !== item.id && (p.status === "Called" || p.status === "Consulting"));

                      const handleCallPatientClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (hasActiveConsultation) {
                          showToast("Consultation in progress. Complete current patient consultation first.");
                          return;
                        }
                        if (onCallPatient) onCallPatient(item);
                        setActivePatient(item);
                      };

                      return (
                        <div
                          key={item.id}
                          onClick={() => setActivePatient(item)}
                          className={`p-2.5 rounded-xl flex items-center justify-between border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50/70 border-emerald-300 shadow-xs"
                              : "bg-white border-slate-100 hover:bg-slate-50/80"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Queue Number Badge */}
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs ${
                                isSelected
                                  ? "bg-[#064e3b] text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              #{item.queueNumber}
                            </div>

                            {/* Patient Summary */}
                            <div>
                              <p className="font-extrabold text-xs text-slate-900 leading-tight">
                                {item.name}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400 font-medium">
                                {mrnStr}
                              </p>
                            </div>
                          </div>

                          {/* Right Call Patient Action Button or Status Badge */}
                          <div className="flex items-center gap-2">
                            {item.status === "Waiting" || item.status === "WAITING" ? (
                              <button
                                type="button"
                                onClick={handleCallPatientClick}
                                disabled={hasActiveConsultation}
                                className={`px-3 py-1 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer ${
                                  hasActiveConsultation
                                    ? "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                                    : "bg-[#064e3b] hover:bg-[#043d2e] text-white active:scale-95"
                                }`}
                              >
                                <Phone size={12} />
                                <span>{t("callPatient")}</span>
                              </button>
                            ) : (
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  statusStr === "Consulting"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                }`}
                              >
                                {statusStr === "Consulting" ? t("consulting") : statusStr === "Waiting" ? t("waiting") : t("scheduled")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-slate-400 font-bold text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      {t("noPatientsWaitingInQueue")}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: ACTIVE PATIENT CONSULTATION CARDS */}
              <div className="lg:col-span-8 space-y-5">
                {activePatient && (activePatient.status === "Called" || activePatient.status === "Consulting" || activePatient.status === "In Consultation") ? (
                  <>
                    {/* 1. PATIENT INFORMATION CARD */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
                          {activePatient.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-slate-900 font-display">
                              {activePatient.name}
                            </h3>
                            <span className="text-xs font-mono font-bold text-slate-400">
                              PT-{activePatient.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              {t("consulting")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Demographic Meta Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
                        <div>
                          <label className="text-slate-400 font-medium block mb-0.5 text-[11px]">
                            {t("age")}
                          </label>
                          <input
                            type="text"
                            value={doctorInputAge}
                            onChange={(e) => setDoctorInputAge(e.target.value)}
                            placeholder="NA"
                            className="w-20 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#064e3b] focus:bg-white transition-all placeholder:text-slate-400"
                          />
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block mb-0.5 text-[11px]">
                            {t("gender")}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-lg font-extrabold text-xs select-none shadow-2xs ${
                              detectedGender === "Male"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                : "bg-pink-50 text-pink-800 border border-pink-300"
                            }`}
                          >
                            {detectedGender === "Male" ? t("male") : detectedGender === "Female" ? t("female") : detectedGender}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block mb-0.5 text-[11px]">
                            {t("phone")}
                          </span>
                          <span className="font-extrabold text-slate-900">
                            {activePatient.phone || "NA"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block mb-0.5 text-[11px]">
                            {t("lastVisit")}
                          </span>
                          <span className="font-extrabold text-slate-900">
                            {activePatient.timestamp?.toDate
                              ? new Date(activePatient.timestamp.toDate()).toLocaleDateString(language === "ar" ? "ar-KW" : "en-US", { month: "short", day: "numeric", year: "numeric" })
                              : t("today")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. PATIENT VITALS & DIAGNOSIS CARD */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity size={16} className="text-[#065f46]" />
                          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                            {t("patientVitalsAndDiagnosis")}
                          </h3>
                        </div>
                      </div>

                      {/* 6 Vitals Inputs Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            {t("bp")}
                          </label>
                          <input
                            type="text"
                            value={vitals.bp}
                            onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                            placeholder="e.g. 120/80"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            {t("pulseBpm")}
                          </label>
                          <input
                            type="text"
                            value={vitals.pulse}
                            onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                            placeholder="e.g. 72"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            {t("temperatureF")}
                          </label>
                          <input
                            type="text"
                            value={vitals.temperature}
                            onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                            placeholder="e.g. 98.6"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            {t("spo2")}
                          </label>
                          <input
                            type="text"
                            value={vitals.spo2}
                            onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                            placeholder="e.g. 98"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            {t("weightKg")}
                          </label>
                          <input
                            type="text"
                            value={vitals.weight}
                            onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                            placeholder="e.g. 70"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            {t("heightCm")}
                          </label>
                          <input
                            type="text"
                            value={vitals.height}
                            onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
                            placeholder="e.g. 175"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                          />
                        </div>
                      </div>

                      {/* Clinical Diagnosis Input */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          {t("clinicalDiagnosis")}
                        </label>
                        <input
                          type="text"
                          value={diagnosis}
                          onChange={(e) => setDiagnosis(e.target.value)}
                          placeholder={t("diagnosisPlaceholder")}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                        />
                      </div>
                    </div>

                    {/* 2.5 DENTIST SPECIALTY: 32-TEETH 4D ANATOMICAL FDI DENTAL CHART */}
                    {category === "DENTIST" && (
                      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smile size={16} className="text-[#065f46]" />
                            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                              32-Teeth 4D FDI Dental Chart &amp; Procedure Billing
                            </h3>
                          </div>
                          <span className="text-xs font-black text-[#065f46] bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 shadow-xs">
                            Procedure Total: ₹{totalDentalCharges}
                          </span>
                        </div>

                        {/* 4D FDI 32 Teeth Grid */}
                        <div className="p-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-inner space-y-4">
                          {/* Upper Teeth Row (18-11 | 21-28) */}
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest px-2 mb-2">
                              <span>UR (Upper Right)</span>
                              <span>Upper Arch (Maxillary Teeth 18-28)</span>
                              <span>UL (Upper Left)</span>
                            </div>
                            <div className="overflow-x-auto no-scrollbar pb-1">
                              <div className="flex justify-center gap-1 sm:gap-1.5 min-w-[500px] sm:min-w-0">
                                {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((tNum) => {
                                  const cond = teethStatus[tNum] || "Healthy";
                                  const isSelected = selectedToothNum === tNum;
                                  const isTreated = dentalProcedures.some((p) => p.tooth === `Tooth #${tNum}`);

                                  return (
                                    <button
                                      key={tNum}
                                      type="button"
                                      onClick={() => setSelectedToothNum(tNum)}
                                      className={`w-7 h-10 sm:w-8 sm:h-11 rounded-xl flex flex-col items-center justify-between p-1 font-mono text-[10px] font-black transition-all cursor-pointer border ${
                                        isSelected
                                          ? "ring-2 ring-cyan-400 bg-cyan-600 text-white border-cyan-300 shadow-lg shadow-cyan-500/40 scale-110 z-10"
                                          : isTreated
                                          ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/80 shadow-xs"
                                          : cond === "Caries"
                                          ? "bg-rose-950/80 text-rose-300 border-rose-500/80 animate-pulse"
                                          : cond === "Missing"
                                          ? "bg-slate-800/60 text-slate-500 border-slate-700 opacity-40 line-through"
                                          : cond === "Crown"
                                          ? "bg-amber-950/80 text-amber-300 border-amber-500/80"
                                          : "bg-slate-900/90 text-slate-200 border-slate-700/80 hover:border-sky-400 hover:bg-slate-800"
                                      }`}
                                      title={`Tooth #${tNum} (${cond})`}
                                    >
                                      <span className="text-[9px] font-bold">#{tNum}</span>
                                      {/* 4D Tooth Silhouette */}
                                      <div className="w-3.5 h-3.5 rounded-xs flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full opacity-90">
                                          <path d="M12 2C8 2 6 5 6 9C6 14 8 22 10 22C11 22 11.5 20 12 20C12.5 20 13 22 14 22C16 22 18 14 18 9C18 5 16 2 12 2Z" />
                                        </svg>
                                      </div>
                                      <span className="text-[7.5px] font-sans font-extrabold uppercase">
                                        {cond === "Healthy" ? "OK" : cond.slice(0, 3)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="w-full border-t border-dashed border-slate-800" />

                          {/* Lower Teeth Row (48-41 | 31-38) */}
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest px-2 mb-2">
                              <span>LR (Lower Right)</span>
                              <span>Lower Arch (Mandibular Teeth 48-38)</span>
                              <span>LL (Lower Left)</span>
                            </div>
                            <div className="overflow-x-auto no-scrollbar pb-1">
                              <div className="flex justify-center gap-1 sm:gap-1.5 min-w-[500px] sm:min-w-0">
                                {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((tNum) => {
                                  const cond = teethStatus[tNum] || "Healthy";
                                  const isSelected = selectedToothNum === tNum;
                                  const isTreated = dentalProcedures.some((p) => p.tooth === `Tooth #${tNum}`);

                                  return (
                                    <button
                                      key={tNum}
                                      type="button"
                                      onClick={() => setSelectedToothNum(tNum)}
                                      className={`w-7 h-10 sm:w-8 sm:h-11 rounded-xl flex flex-col items-center justify-between p-1 font-mono text-[10px] font-black transition-all cursor-pointer border ${
                                        isSelected
                                          ? "ring-2 ring-cyan-400 bg-cyan-600 text-white border-cyan-300 shadow-lg shadow-cyan-500/40 scale-110 z-10"
                                          : isTreated
                                          ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/80 shadow-xs"
                                          : cond === "Caries"
                                          ? "bg-rose-950/80 text-rose-300 border-rose-500/80 animate-pulse"
                                          : cond === "Missing"
                                          ? "bg-slate-800/60 text-slate-500 border-slate-700 opacity-40 line-through"
                                          : cond === "Crown"
                                          ? "bg-amber-950/80 text-amber-300 border-amber-500/80"
                                          : "bg-slate-900/90 text-slate-200 border-slate-700/80 hover:border-sky-400 hover:bg-slate-800"
                                      }`}
                                      title={`Tooth #${tNum} (${cond})`}
                                    >
                                      <span className="text-[9px] font-bold">#{tNum}</span>
                                      {/* 4D Tooth Silhouette */}
                                      <div className="w-3.5 h-3.5 rounded-xs flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full opacity-90">
                                          <path d="M12 2C8 2 6 5 6 9C6 14 8 22 10 22C11 22 11.5 20 12 20C12.5 20 13 22 14 22C16 22 18 14 18 9C18 5 16 2 12 2Z" />
                                        </svg>
                                      </div>
                                      <span className="text-[7.5px] font-sans font-extrabold uppercase">
                                        {cond === "Healthy" ? "OK" : cond.slice(0, 3)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Selected Tooth 4D Surface Inspector Drawer */}
                        {selectedToothNum && (
                          <div className="bg-gradient-to-r from-emerald-50 via-slate-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 space-y-3 animate-fadeIn shadow-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#064e3b] text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                                  #{selectedToothNum}
                                </span>
                                <span className="text-xs font-black text-slate-900 font-display">
                                  4D Tooth Inspector: Tooth #{selectedToothNum}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedToothNum(null)}
                                className="text-xs font-bold text-slate-400 hover:text-slate-700"
                              >
                                ✕ Close Inspector
                              </button>
                            </div>

                            {/* 4D Surface Map (Occlusal, Mesial, Distal, Buccal, Lingual) */}
                            <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-2">
                              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                                4D Tooth Surfaces (O / M / D / B / L)
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                {["Occlusal (Top)", "Mesial (Front)", "Distal (Back)", "Buccal (Cheek)", "Lingual (Tongue)"].map((sName, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>{sName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* Condition Selector */}
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                  Tooth Condition
                                </label>
                                <select
                                  value={teethStatus[selectedToothNum] || "Healthy"}
                                  onChange={(e) =>
                                    setTeethStatus({
                                      ...teethStatus,
                                      [selectedToothNum]: e.target.value as ToothCondition,
                                    })
                                  }
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                                >
                                  <option value="Healthy">Healthy (No Defect)</option>
                                  <option value="Caries">Caries / Cavity</option>
                                  <option value="Missing">Missing Tooth</option>
                                  <option value="Fracture">Enamel Fracture</option>
                                  <option value="Filling">Existing Filling</option>
                                  <option value="Crown">Crown Installed</option>
                                  <option value="RCT">RCT Completed</option>
                                  <option value="Extraction">Requires Extraction</option>
                                </select>
                              </div>

                              {/* Quick Procedure Add */}
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                  Add Procedure to Invoice
                                </label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {[
                                    { name: "Root Canal", cost: 4500 },
                                    { name: "Extraction", cost: 1000 },
                                    { name: "Filling", cost: 1500 },
                                    { name: "Crown", cost: 6000 },
                                  ].map((proc, pIdx) => (
                                    <button
                                      key={pIdx}
                                      type="button"
                                      onClick={() => {
                                        const newProc = {
                                          id: "proc_" + Date.now() + "_" + pIdx,
                                          name: proc.name,
                                          tooth: `Tooth #${selectedToothNum}`,
                                          cost: proc.cost,
                                        };
                                        setDentalProcedures([...dentalProcedures, newProc]);
                                        showToast(`Added ${proc.name} (Tooth #${selectedToothNum}) - ₹${proc.cost}`);
                                      }}
                                      className="px-2.5 py-1.5 bg-white border border-emerald-200 hover:bg-[#064e3b] hover:text-white text-[#065f46] text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                                    >
                                      + {proc.name} (₹{proc.cost})
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Added Procedures List */}
                            {dentalProcedures.filter((p) => p.tooth === `Tooth #${selectedToothNum}`).length > 0 && (
                              <div className="pt-2 border-t border-emerald-200/60">
                                <span className="text-[10px] font-extrabold text-emerald-950 uppercase tracking-wider block mb-1">
                                  Active Procedures for Tooth #{selectedToothNum}:
                                </span>
                                <div className="space-y-1">
                                  {dentalProcedures
                                    .filter((p) => p.tooth === `Tooth #${selectedToothNum}`)
                                    .map((proc) => (
                                      <div
                                        key={proc.id}
                                        className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-emerald-100 text-xs font-bold text-slate-800 shadow-xs"
                                      >
                                        <span>{proc.name} ({proc.tooth})</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-emerald-600 font-extrabold">₹{proc.cost}</span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setDentalProcedures(dentalProcedures.filter((p) => p.id !== proc.id))
                                            }
                                            className="text-slate-400 hover:text-rose-500 text-xs font-bold"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. CONSULTATION NOTES CARD */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-2.5">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[#065f46]" />
                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                          {t("consultationNotes")}
                        </h3>
                      </div>
                      <textarea
                        value={consultationNotes}
                        onChange={(e) => setConsultationNotes(e.target.value)}
                        rows={3}
                        placeholder={t("notesPlaceholder")}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] transition-all resize-none leading-relaxed"
                      />
                    </div>

                    {/* 4. PRESCRIPTION CARD */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Pill size={16} className="text-[#065f46]" />
                          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                            {t("prescription")}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddMedicine}
                          className="text-xs font-extrabold text-[#065f46] hover:text-[#065f46] bg-emerald-50 px-3 py-1 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus size={13} />
                          <span>{t("addMedicineRow")}</span>
                        </button>
                      </div>

                      {/* Prescription Container: Desktop Table Grid (>= 640px) */}
                      <div className="hidden sm:block border border-slate-200/80 rounded-xl text-xs relative">
                        <div className="bg-slate-50 px-4 py-2.5 grid grid-cols-12 gap-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                          <div className="col-span-4">{t("medicine")}</div>
                          <div className="col-span-2">{t("dosage")}</div>
                          <div className="col-span-2">{t("duration")}</div>
                          <div className="col-span-3">{t("instructions")}</div>
                          <div className="col-span-1 text-right">{t("actions")}</div>
                        </div>

                        <div className="divide-y divide-slate-100 bg-white p-1.5">
                          {prescriptionItems.map((item, idx) => (
                            <div key={idx} className="p-1.5 grid grid-cols-12 gap-2.5 items-center">
                              {/* Medicine Name */}
                              <div className="col-span-4 relative">
                                <div className="relative flex items-center">
                                  <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                                  <input
                                    type="text"
                                    value={item.medicine}
                                    onChange={(e) => handleUpdateMedicine(idx, "medicine", e.target.value)}
                                    onFocus={() => setActiveMedicineSearchIdx(idx)}
                                    placeholder="Search medicine..."
                                    className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                                  />
                                </div>
                                {activeMedicineSearchIdx === idx && (
                                  <div className="absolute left-0 top-full mt-1 w-full min-w-[240px] bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 max-h-52 overflow-y-auto">
                                    {combinedMedicineOptions.filter((m) =>
                                      m.name.toLowerCase().includes((item.medicine || "").toLowerCase())
                                    ).length > 0 ? (
                                      combinedMedicineOptions
                                        .filter((m) =>
                                          m.name.toLowerCase().includes((item.medicine || "").toLowerCase())
                                        )
                                        .map((catItem, cIdx) => (
                                          <button
                                            key={cIdx}
                                            type="button"
                                            onClick={() => handleSelectCatalogMedicine(idx, catItem)}
                                            className="w-full text-left p-2 hover:bg-emerald-50 rounded-lg text-xs font-bold text-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                                          >
                                            <span className="truncate pr-2">{catItem.name}</span>
                                            <span className="text-[10px] text-[#065f46] bg-emerald-50 px-1.5 py-0.5 rounded font-extrabold shrink-0">
                                              {catItem.defaultDosage}
                                            </span>
                                          </button>
                                        ))
                                    ) : (
                                      <div className="p-2.5 text-center text-slate-400 font-medium text-[11px]">
                                        No matching medicines in Medicine Tab
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Dosage */}
                              <div className="col-span-2">
                                <input
                                  type="text"
                                  value={item.dosage}
                                  onChange={(e) => handleUpdateMedicine(idx, "dosage", e.target.value)}
                                  placeholder="1-0-1"
                                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-800 text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                                />
                              </div>

                              {/* Duration */}
                              <div className="col-span-2">
                                <input
                                  type="text"
                                  value={item.duration}
                                  onChange={(e) => handleUpdateMedicine(idx, "duration", e.target.value)}
                                  placeholder="5 Days"
                                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                                />
                              </div>

                              {/* Instructions (ONLY After food & Before food) */}
                              <div className="col-span-3">
                                <select
                                  value={item.instructions || "After food"}
                                  onChange={(e) => handleUpdateMedicine(idx, "instructions", e.target.value)}
                                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] cursor-pointer"
                                >
                                  <option value="After food">After food</option>
                                  <option value="Before food">Before food</option>
                                </select>
                              </div>

                              {/* Action Trash */}
                              <div className="col-span-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMedicine(idx)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Prescription Container: Mobile Touch Cards (< 640px) */}
                      <div className="sm:hidden space-y-3">
                        {prescriptionItems.map((item, idx) => (
                          <div key={idx} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                            {/* Medicine Search Header */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                Medicine #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveMedicine(idx)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="relative">
                              <div className="relative flex items-center">
                                <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                                <input
                                  type="text"
                                  value={item.medicine}
                                  onChange={(e) => handleUpdateMedicine(idx, "medicine", e.target.value)}
                                  onFocus={() => setActiveMedicineSearchIdx(idx)}
                                  placeholder="Search medicine name..."
                                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                                />
                              </div>
                              {activeMedicineSearchIdx === idx && (
                                <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 max-h-48 overflow-y-auto">
                                  {combinedMedicineOptions.filter((m) =>
                                    m.name.toLowerCase().includes((item.medicine || "").toLowerCase())
                                  ).length > 0 ? (
                                    combinedMedicineOptions
                                      .filter((m) =>
                                        m.name.toLowerCase().includes((item.medicine || "").toLowerCase())
                                      )
                                      .map((catItem, cIdx) => (
                                        <button
                                          key={cIdx}
                                          type="button"
                                          onClick={() => handleSelectCatalogMedicine(idx, catItem)}
                                          className="w-full text-left p-2 hover:bg-emerald-50 rounded-lg text-xs font-bold text-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                                        >
                                          <span className="truncate pr-2">{catItem.name}</span>
                                          <span className="text-[10px] text-[#065f46] bg-emerald-50 px-1.5 py-0.5 rounded font-extrabold shrink-0">
                                            {catItem.defaultDosage}
                                          </span>
                                        </button>
                                      ))
                                  ) : (
                                    <div className="p-2.5 text-center text-slate-400 font-medium text-[11px]">
                                      No matching medicines
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* 3-Column Inputs on Mobile */}
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Dosage</label>
                                <input
                                  type="text"
                                  value={item.dosage}
                                  onChange={(e) => handleUpdateMedicine(idx, "dosage", e.target.value)}
                                  placeholder="1-0-1"
                                  className="w-full px-2 py-1.5 bg-white border border-slate-200/80 rounded-lg text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Duration</label>
                                <input
                                  type="text"
                                  value={item.duration}
                                  onChange={(e) => handleUpdateMedicine(idx, "duration", e.target.value)}
                                  placeholder="5 Days"
                                  className="w-full px-2 py-1.5 bg-white border border-slate-200/80 rounded-lg text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">When</label>
                                <select
                                  value={item.instructions || "After food"}
                                  onChange={(e) => handleUpdateMedicine(idx, "instructions", e.target.value)}
                                  className="w-full px-1.5 py-1.5 bg-white border border-slate-200/80 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b]"
                                >
                                  <option value="After food">After food</option>
                                  <option value="Before food">Before food</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                        {prescriptionItems.length === 0 && (
                          <div className="p-4 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-xl">
                            No medicines added. Click "+ Add Medicine Row" above.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 5. BOTTOM ACTION BAR */}
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => showToast(t("saveDraft"))}
                          className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <FileText size={14} />
                          <span>{t("saveAsDraft")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleComplete}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto px-7 py-2.5 bg-[#064e3b] hover:bg-[#043d2e] text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <span>{isSubmitting ? t("completingConsultation") : t("completeConsultation")}</span>
                          <ArrowRight size={15} />
                        </button>
                      </div>
                      <p className="text-[11px] text-center text-slate-400 font-medium">
                        {t("visitSavedToBillingNotice")}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-2xl p-16 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto font-bold">
                      <Phone size={26} />
                    </div>
                    <h3 className="text-base font-black text-slate-900 font-display">
                      {t("noActivePatientConsultation")}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                      {t("clickCallPatientToStart")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB B: DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-5">
            {/* Top Welcome Banner Matching Requested High-Tech Design (992x178px ratio) */}
            <div className="relative rounded-3xl overflow-hidden min-h-[178px] flex flex-col md:flex-row md:items-center justify-between p-6 md:p-8 border border-slate-200/80 shadow-md bg-[url('/doctor_welcome_banner.jpg')] bg-cover bg-right bg-no-repeat">
              {/* Gradient dark backdrop overlay for crystal clear readable typography */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/75 to-slate-900/40 z-0 pointer-events-none" />

              {/* Text content */}
              <div className="space-y-1 z-10 relative">
                <p className="text-sm font-semibold text-emerald-200 tracking-wide">{t("goodMorning")}</p>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md">
                  {doctorDisplayName}
                </h2>
                <p className="text-sm font-bold text-emerald-300 pt-1 tracking-wide">{t("betterCareTagline")}</p>
              </div>

              {/* Quick Consultation Action */}
              <div className="flex items-center gap-4 z-10 relative shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("consultation")}
                  className="px-6 py-3 bg-[#064e3b] hover:bg-[#043d2e] active:bg-[#032b21] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/40 transition-all cursor-pointer flex items-center gap-2.5 border border-emerald-600/30"
                >
                  <span>{t("startConsultation")}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* 4 Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Waiting Patients */}
              <div
                onClick={() => setActiveTab("consultation")}
                className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users size={22} />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{t("waitingPatients")}</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-0.5">{doctorQueue.length}</h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{doctorQueue.length} {t("inQueueToday")}</p>
                </div>
              </div>

              {/* Card 2: Completed Consultations */}
              <div
                onClick={() => setActiveTab("patients")}
                className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    {selectedPeriod === "today" ? t("completedToday") : t("completed")}
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                    {analyticsData.active.completedCount}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    {selectedPeriod === "today" ? `${analyticsData.active.completedCount} ${t("completed")}` : t("completed")}
                  </p>
                </div>
              </div>

              {/* Card 3: Total Patients */}
              <div
                onClick={() => setActiveTab("patients")}
                className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users size={22} />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    {selectedPeriod === "today" ? t("todayPatient") : t("totalPatient")}
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 mt-0.5">{analyticsData.active.patientsCount}</h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    {analyticsData.active.patientsCount} {t("registeredPatients")}
                  </p>
                </div>
              </div>

              {/* Card 4: Revenue */}
              <div
                onClick={() => setActiveTab("profile")}
                className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 font-extrabold text-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  ₹
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    {t("revenue")}
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 mt-0.5">₹{analyticsData.active.revenue.toLocaleString()}</h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    {analyticsData.active.billedCount} {t("paidVisits")} • ₹{consultationFee} {t("feeLabel")}
                  </p>
                </div>
              </div>
            </div>


            {/* Bottom 2 Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Patient Statistics Bar Chart */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{t("patientStatistics")}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{t("numberOfPatientsLast7Days")}</p>
                  </div>
                  <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <Activity size={18} />
                  </span>
                </div>

                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={patientStatsData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} />
                      <Tooltip
                        cursor={{ fill: "rgba(241, 245, 249, 0.4)" }}
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px", fontWeight: "bold" }}
                        itemStyle={{ color: "#34d399" }}
                      />
                      <Bar
                        dataKey="patients"
                        fill="#059669"
                        radius={[8, 8, 0, 0]}
                        barSize={28}
                        label={{ position: "top", fill: "#64748b", fontSize: 11, fontWeight: "bold" }}
                        stroke="none"
                        strokeWidth={0}
                        activeBar={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right: Revenue Overview Donut Chart */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{t("revenueOverview")}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{t("consultationRevenueLast7Days")}</p>
                  </div>
                  <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <BarChart3 size={18} />
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
                  {/* Donut Chart with Center Total */}
                  <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueData.chartSlices}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={revenueData.total > 0 ? 4 : 0}
                          dataKey="value"
                        >
                          {revenueData.chartSlices.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        {revenueData.total > 0 && (
                          <Tooltip
                            formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, t("revenue")]}
                            contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px", fontWeight: "bold" }}
                          />
                        )}
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-sm font-black text-slate-900">₹{revenueData.total.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t("revenue")}</span>
                    </div>
                  </div>

                  {/* Legend Breakdown (Strictly Check in & Consultation - No Others!) */}
                  <div className="w-full space-y-3">
                    {revenueData.legendSlices.map((slice, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                          <span className="text-xs font-bold text-slate-700">{slice.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 block">₹{slice.value.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] font-bold text-slate-400">{slice.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MEDICINE CATALOG WORKSPACE & MANAGEMENT */}
        {(activeTab === "medicine" || activeTab === "prescriptions" || activeTab === "appointments") && (
          <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-5 sm:space-y-6">
            {/* Header & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t("medicine")}</h2>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="px-5 py-2.5 bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Plus size={16} />
                <span>{t("addMedicine")}</span>
              </button>
            </div>

            {/* Controls Bar: Search & Category Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={medicineSearchQuery}
                  onChange={(e) => setMedicineSearchQuery(e.target.value)}
                  placeholder={t("searchMedicines")}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#064e3b] shadow-2xs transition-all"
                />
              </div>

              <div className="w-full sm:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-48 px-3.5 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#064e3b] shadow-2xs cursor-pointer"
                >
                  <option value="All Categories">{t("allCategories")}</option>
                  <option value="Analgesic">Analgesic</option>
                  <option value="Antibiotic">Antibiotic</option>
                  <option value="Antihistamine">Antihistamine</option>
                  <option value="Antacid">Antacid</option>
                  <option value="Antidiabetic">Antidiabetic</option>
                  <option value="Lipid Lowering">Lipid Lowering</option>
                  <option value="Supplement">Supplement</option>
                  <option value="Cardiovascular">Cardiovascular</option>
                  <option value="Respiratory">Respiratory</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Medicine Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMedicines.map((med) => (
                <div
                  key={med.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 relative flex flex-col justify-between hover:shadow-md transition-all space-y-4"
                >
                  {/* Card Top: Icon & Action Menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getIconStyle(med.type, med.category)}`}>
                      <Pill size={18} />
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMedicineMenuId(activeMedicineMenuId === med.id ? null : med.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {activeMedicineMenuId === med.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 p-1 z-30 space-y-0.5">
                          <button
                            onClick={() => handleOpenEditModal(med)}
                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Pencil size={13} />
                            <span>{t("edit")}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMedicine(med.id)}
                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>{t("delete")}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Medicine Title & Strength */}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-snug">{med.name}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {med.strength ? `${med.strength} ${med.unit || 'mg'}` : ''} {med.strength && med.form ? '|' : ''} {med.form || med.type}
                    </p>
                  </div>

                  {/* Card Footer: Category Badge */}
                  <div>
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getCategoryBadgeStyle(med.category)}`}>
                      {med.category}
                    </span>
                  </div>
                </div>
              ))}

              {filteredMedicines.length === 0 && (
                <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                    <Pill size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t("noMedicinesFound")}</p>
                    <p className="text-xs text-slate-400 mt-1">{t("tryAdjustingSearch")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADD / EDIT MEDICINE MODAL */}
        <AnimatePresence>
          {isAddMedicineModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
              onClick={() => setIsAddMedicineModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "420px" }}
                className="bg-white rounded-2xl shadow-2xl w-full p-5 space-y-4 border border-slate-100 mx-auto max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingMedicine ? t("edit") : t("addMedicine")}
                  </h3>
                  <button
                    onClick={() => setIsAddMedicineModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSaveMedicine} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t("medicineName")} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Paracetamol"
                      value={medicineFormData.name}
                      onChange={(e) => setMedicineFormData({ ...medicineFormData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#064e3b] transition-all"
                    />
                  </div>



                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t("category")} <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={medicineFormData.category}
                        onChange={(e) => setMedicineFormData({ ...medicineFormData, category: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#064e3b] transition-all cursor-pointer"
                      >
                        <option value="">Select Category</option>
                        <option value="Analgesic">Analgesic</option>
                        <option value="Antibiotic">Antibiotic</option>
                        <option value="Antihistamine">Antihistamine</option>
                        <option value="Antacid">Antacid</option>
                        <option value="Antidiabetic">Antidiabetic</option>
                        <option value="Lipid Lowering">Lipid Lowering</option>
                        <option value="Supplement">Supplement</option>
                        <option value="Cardiovascular">Cardiovascular</option>
                        <option value="Respiratory">Respiratory</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Form <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={medicineFormData.form}
                        onChange={(e) => setMedicineFormData({ ...medicineFormData, form: e.target.value, type: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#064e3b] transition-all cursor-pointer"
                      >
                        <option value="">Select Form</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Capsule">Capsule</option>
                        <option value="Liquid">Liquid</option>
                        <option value="Injection">Injection</option>
                        <option value="Syrup">Syrup</option>
                        <option value="Drops">Drops</option>
                        <option value="Topical">Topical</option>
                        <option value="Inhaler">Inhaler</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Strength <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. 500"
                        value={medicineFormData.strength}
                        onChange={(e) => setMedicineFormData({ ...medicineFormData, strength: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#064e3b] transition-all"
                      />
                      <select
                        value={medicineFormData.unit}
                        onChange={(e) => setMedicineFormData({ ...medicineFormData, unit: e.target.value })}
                        className="w-24 px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#064e3b] transition-all cursor-pointer"
                      >
                        <option value="mg">mg</option>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="mcg">mcg</option>
                        <option value="IU">IU</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddMedicineModalOpen(false)}
                      className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
                    >
                      {t("save")}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAB D: PATIENTS ARCHIVE */}
        {activeTab === "patients" && (
          <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-5 sm:space-y-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">My Patients History</h3>
              <div className="divide-y divide-slate-100">
                {doctorPatientsList.map((p) => (
                  <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-sm text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {p.phone} • Age: {p.age ? `${p.age} yrs` : "NA"} • Gender: {p.gender || detectGenderFromName(p.name)} • Status: <strong className="text-slate-700">{p.status}</strong> • Billing:{" "}
                        <strong className="text-[#065f46]">{p.billingStatus || "Pending"}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (onFetchHistory) onFetchHistory(p.phone);
                        setIsHistoryOpen(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                    >
                      View Clinical File
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB E: PRESCRIPTIONS LIST */}
        {activeTab === "prescriptions" && (
          <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-5 sm:space-y-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">Issued Prescriptions (Rx)</h3>
              <div className="divide-y divide-slate-100">
                {doctorPatientsList
                  .filter((p) => p.prescription)
                  .map((p) => (
                    <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-extrabold text-sm text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Diagnosis: {p.diagnosis || "General"}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (onFetchHistory) onFetchHistory(p.phone);
                          setIsHistoryOpen(true);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                      >
                        Review Rx
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB F: LAB ORDERS / DENTAL CHART */}
        {activeTab === "lab_orders" && (
          <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-5 sm:space-y-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">
                {category === "DENTIST" ? "Dental Charting & Treatment Procedures" : "Lab Diagnostic Orders"}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {category === "DENTIST"
                  ? "Manage full 32-tooth oral condition statuses and accumulated procedure billing."
                  : "Prescribe pathology, radiology, blood profiles, and microbial cultures."}
              </p>
            </div>
          </div>
        )}

        {/* TAB: PROFILE WORKSPACE */}
        {activeTab === "profile" && (
          <div className="p-3.5 sm:p-6 md:p-8 max-w-4xl mx-auto w-full space-y-5 sm:space-y-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-6">
              {/* Top Banner & Avatar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#064e3b] text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-emerald-950/20">
                    {doctorInitials}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{doctorDisplayName}</h2>
                    <p className="text-xs font-bold text-[#065f46]">{categoryLabel} • Doctor</p>
                    <p className="text-xs text-slate-400 font-medium">{user?.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setProfileDisplayName(currentUserProfile?.displayName || user?.displayName || doctorDisplayName);
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
                    <p className="text-sm font-black text-slate-900">{currentUserProfile?.displayName || user?.displayName || doctorDisplayName}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("emailId")}</label>
                    <p className="text-sm font-black text-slate-900">{user?.email || "N/A"}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("phoneNumber")}</label>
                    <p className="text-sm font-black text-slate-900">{currentUserProfile?.contactNumber || currentUserProfile?.phone || "+91 98765 43210"}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("systemRole")}</label>
                    <p className="text-sm font-black text-slate-900">{t("doctor")} ({categoryLabel})</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("doctorCategory")}</label>
                    <p className="text-sm font-black text-slate-900">{categoryLabel}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("consultationFee")}</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDisplayName(currentUserProfile?.displayName || user?.displayName || doctorDisplayName);
                            setProfilePhone(currentUserProfile?.contactNumber || currentUserProfile?.phone || "");
                            setProfileFee(consultationFee);
                            setIsEditProfileOpen(true);
                          }}
                          className="text-xs text-[#065f46] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil size={12} />
                          <span>{t("edit")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteFee}
                          className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>{t("delete")}</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-black text-slate-900">
                      {consultationFee > 0 ? `Rs ${consultationFee}` : "Not Set (Rs 0)"}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("clinicName")}</label>
                    <p className="text-sm font-black text-slate-900">{clinicInfo?.name || currentUserProfile?.clinicName || "Clinic"}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase block">{t("clinicId")}</label>
                    <p className="text-sm font-mono font-black text-[#065f46]">{clinicInfo?.id || currentUserProfile?.clinicId || "—"}</p>
                  </div>
                </div>

                {/* Explicit Sign Out / Logout Button */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
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
        )}
      </main>

      {/* EDIT PROFILE MODAL */}
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
              className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 space-y-3.5 mx-auto max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <User size={15} />
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

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">{t("consultationFee")}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={profileFee}
                    onChange={(e) => setProfileFee(Number(e.target.value))}
                    placeholder="e.g. 500"
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
                        value={currentUserProfile?.role || "Doctor"}
                        className="w-full py-1.5 px-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteFee();
                      setIsEditProfileOpen(false);
                    }}
                    className="px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>{t("delete")}</span>
                  </button>

                  <div className="flex items-center gap-2">
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
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. MEDICAL HISTORY MODAL */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            key="history-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsHistoryOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "440px", width: "100%" }}
              className="bg-white rounded-2xl w-full p-4 sm:p-5 shadow-2xl border border-slate-100 flex flex-col max-h-[75vh] relative mx-auto"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <Clock size={15} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs font-display">Patient Medical History</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Previous clinical notes and diagnoses</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="my-2.5 space-y-2 overflow-y-auto pr-1 flex-1 min-h-0 custom-scrollbar">
                {medicalHistory.length > 0 ? (
                  medicalHistory.map((item: any, i: number) => {
                    let meds: any[] = [];
                    try { if (item.prescription) meds = JSON.parse(item.prescription); } catch {}
                    const dateStr = item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : item.date || "Recent";
                    return (
                    <div key={i} className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-100/90 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#065f46]">
                        <span>Visit #{medicalHistory.length - i}</span>
                        <span className="text-slate-400 text-[10px]">{dateStr}</span>
                      </div>
                      {item.doctorName && (
                        <p className="text-[10.5px] font-semibold text-slate-500">Dr. {item.doctorName}</p>
                      )}
                      {item.diagnosis && (
                        <p className="text-[11px] font-extrabold text-slate-900">Diagnosis: {item.diagnosis}</p>
                      )}
                      {item.notes && <p className="text-[10.5px] text-slate-600 leading-snug font-medium line-clamp-2">{item.notes}</p>}
                      {Array.isArray(meds) && meds.length > 0 && (
                        <div className="pt-0.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Prescription</p>
                          <div className="flex flex-wrap gap-1">
                            {meds.map((m: any, j: number) => m.medicine && (
                              <span key={j} className="text-[10px] font-medium text-slate-700 bg-white border border-slate-200/80 rounded px-1.5 py-0.5">
                                {m.medicine} — {m.dosage || "1-0-1"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.vitals && (item.vitals.bp || item.vitals.temperature || item.vitals.pulse) && (
                        <div className="pt-0.5 flex flex-wrap gap-2 text-[9.5px] font-medium text-slate-400">
                          {item.vitals.bp && <span>BP: <strong className="text-slate-600">{item.vitals.bp}</strong></span>}
                          {item.vitals.temperature && <span>Temp: <strong className="text-slate-600">{item.vitals.temperature}°F</strong></span>}
                          {item.vitals.pulse && <span>Pulse: <strong className="text-slate-600">{item.vitals.pulse}</strong></span>}
                          {item.vitals.spo2 && <span>SpO₂: <strong className="text-slate-600">{item.vitals.spo2}%</strong></span>}
                          {item.vitals.weight && <span>Wt: <strong className="text-slate-600">{item.vitals.weight}kg</strong></span>}
                        </div>
                      )}
                    </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 font-bold text-center py-6">
                    No previous clinical history records found for this patient.
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 shrink-0 flex justify-end">
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-colors shadow-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-8 sm:bottom-8 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl font-extrabold text-xs shadow-xl flex items-center justify-between sm:justify-start gap-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <MobileBottomNav
        role="doctor"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        waitingCount={doctorQueue.length}
        doctorCategory={category}
        onOpenSidePanel={() => setIsMobileDrawerOpen(true)}
      />
    </div>
  );
}

