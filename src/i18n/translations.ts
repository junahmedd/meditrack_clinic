export type Language = "en" | "ar";

export interface TranslationDictionary {
  // Navigation & General
  dashboard: string;
  appointments: string;
  billing: string;
  consultation: string;
  medicine: string;
  profile: string;
  queue: string;
  patients: string;
  logout: string;
  search: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  print: string;
  status: string;
  date: string;
  time: string;
  actions: string;
  close: string;
  refresh: string;
  back: string;
  total: string;
  loading: string;
  noData: string;

  // Periods
  today: string;
  month: string;
  year: string;
  allTime: string;

  // Language Menu
  language: string;
  english: string;
  arabicKuwait: string;

  // Header & Roles
  frontDesk: string;
  doctorConsultant: string;
  clinicSystem: string;
  receptionist: string;
  doctor: string;
  admin: string;
  noUnreadAlerts: string;

  // Dashboard Stat Cards (Receptionist)
  oldPatient: string;
  newPatient: string;
  totalPatient: string;
  todayPatient: string;
  returningToday: string;
  firstTimeToday: string;
  registeredPatients: string;
  inQueueToday: string;
  returningPeriod: string;
  firstTimePeriod: string;

  // Dashboard Stat Cards (Doctor)
  waitingPatients: string;
  completedToday: string;
  averageWaitTime: string;
  revenue: string;
  totalConsultations: string;
  startConsultation: string;
  viewHistory: string;
  goodMorning: string;
  betterCareTagline: string;
  minutesAbbr: string;
  paidVisits: string;
  feeLabel: string;

  // Charts
  patientsLast7Days: string;
  newVsOldPatients: string;
  patientVisitsByDoctor: string;
  patientStatistics: string;
  revenueOverview: string;
  consultationRevenueLast7Days: string;
  numberOfPatientsLast7Days: string;
  highestVisitsToday: string;
  totalVisits: string;
  noVisitsYet: string;
  newPatientLegend: string;
  oldPatientLegend: string;

  // Buttons & Actions
  newAppointment: string;
  openBillingQueue: string;
  collectPayment: string;
  dispatchReceipt: string;
  addMedicine: string;
  markComplete: string;
  callNextPatient: string;

  // Patient / Queue Terms
  patientName: string;
  civilIdOrPhone: string;
  phone: string;
  age: string;
  gender: string;
  male: string;
  female: string;
  waiting: string;
  inConsultation: string;
  inBilling: string;
  completed: string;
  cancelled: string;
  scheduled: string;

  // Billing
  pendingBilling: string;
  pendingCollections: string;
  paidInvoices: string;
  invoice: string;
  amount: string;
  cash: string;
  knetUpi: string;
  currencySymbol: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    // Navigation & General
    dashboard: "Dashboard",
    appointments: "Appointments",
    billing: "Billing",
    consultation: "Consultation",
    medicine: "Medicine",
    profile: "Profile",
    queue: "Queue",
    patients: "Patients",
    logout: "Logout",
    search: "Search...",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    print: "Print",
    status: "Status",
    date: "Date",
    time: "Time",
    actions: "Actions",
    close: "Close",
    refresh: "Refresh",
    back: "Back",
    total: "Total",
    loading: "Loading...",
    noData: "No data available",

    // Periods
    today: "Today",
    month: "This Month",
    year: "This Year",
    allTime: "All-Time",

    // Language Menu
    language: "Language",
    english: "English",
    arabicKuwait: "العربية (الكويت)",

    // Header & Roles
    frontDesk: "Front Desk",
    doctorConsultant: "Consultant Doctor",
    clinicSystem: "CLINIC SYSTEM",
    receptionist: "Receptionist",
    doctor: "Doctor",
    admin: "Administrator",
    noUnreadAlerts: "No unread alerts",

    // Dashboard Stat Cards (Receptionist)
    oldPatient: "Old Patient",
    newPatient: "New Patient",
    totalPatient: "Total Patient",
    todayPatient: "Today Patient",
    returningToday: "Returning today",
    firstTimeToday: "First-time today",
    registeredPatients: "registered",
    inQueueToday: "in queue today",
    returningPeriod: "Returning",
    firstTimePeriod: "First-time",

    // Dashboard Stat Cards (Doctor)
    waitingPatients: "Waiting Patients",
    completedToday: "Completed Today",
    averageWaitTime: "Average Wait Time",
    revenue: "Revenue",
    totalConsultations: "Total Consultations",
    startConsultation: "Start Consultation",
    viewHistory: "View History",
    goodMorning: "Good Morning,",
    betterCareTagline: "Better care. Healthier tomorrows.",
    minutesAbbr: "min",
    paidVisits: "paid visits",
    feeLabel: "fee",

    // Charts
    patientsLast7Days: "Patients (Last 7 Days)",
    newVsOldPatients: "New vs. Old (Returning) Patients",
    patientVisitsByDoctor: "Patient Visits by Doctor",
    patientStatistics: "Patient Statistics",
    revenueOverview: "Revenue Overview",
    consultationRevenueLast7Days: "Consultation revenue (Last 7 Days)",
    numberOfPatientsLast7Days: "Number of patients (Last 7 Days)",
    highestVisitsToday: "Highest visit count today:",
    totalVisits: "TOTAL VISITS",
    noVisitsYet: "No visits yet",
    newPatientLegend: "New Patient",
    oldPatientLegend: "Old Patient",

    // Buttons & Actions
    newAppointment: "+ New Appointment",
    openBillingQueue: "Open Billing Queue →",
    collectPayment: "Collect Payment",
    dispatchReceipt: "Dispatch Receipt",
    addMedicine: "+ Add Medicine",
    markComplete: "Mark Complete",
    callNextPatient: "Call Next Patient",

    // Patient / Queue Terms
    patientName: "Patient Name",
    civilIdOrPhone: "Civil ID / Phone",
    phone: "Phone",
    age: "Age",
    gender: "Gender",
    male: "Male",
    female: "Female",
    waiting: "Waiting",
    inConsultation: "Consulting",
    inBilling: "In Billing",
    completed: "Completed",
    cancelled: "Cancelled",
    scheduled: "Scheduled",

    // Billing
    pendingBilling: "Completed Consultation(s) Awaiting Payment",
    pendingCollections: "Pending Collections",
    paidInvoices: "Paid Invoices",
    invoice: "Invoice",
    amount: "Amount",
    cash: "Cash",
    knetUpi: "K-NET / Digital",
    currencySymbol: "KD",
  },

  ar: {
    // Navigation & General
    dashboard: "لوحة التحكم",
    appointments: "المواعيد",
    billing: "الفواتير والتحصيل",
    consultation: "الاستشارة الطبية",
    medicine: "دليل الأدوية",
    profile: "الملف الشخصي",
    queue: "قائمة الانتظار",
    patients: "سجل المرضى",
    logout: "تسجيل الخروج",
    search: "بحث...",
    save: "حفظ",
    cancel: "إلغاء",
    edit: "تعديل",
    delete: "حذف",
    print: "طباعة",
    status: "الحالة",
    date: "التاريخ",
    time: "الوقت",
    actions: "الإجراءات",
    close: "إغلاق",
    refresh: "تحديث",
    back: "رجوع",
    total: "الإجمالي",
    loading: "جاري التحميل...",
    noData: "لا توجد بيانات متاحة",

    // Periods
    today: "اليوم",
    month: "هذا الشهر",
    year: "هذه السنة",
    allTime: "جميع الفترات",

    // Language Menu
    language: "اللغة",
    english: "English",
    arabicKuwait: "العربية (الكويت)",

    // Header & Roles
    frontDesk: "مكتب الاستقبال",
    doctorConsultant: "طبيب استشاري",
    clinicSystem: "نظام إدارة العيادة",
    receptionist: "موظف الاستقبال",
    doctor: "طبيب",
    admin: "مسؤول النظام",
    noUnreadAlerts: "لا توجد تنبيهات جديدة",

    // Dashboard Stat Cards (Receptionist)
    oldPatient: "مريض سابق",
    newPatient: "مريض جديد",
    totalPatient: "إجمالي المرضى",
    todayPatient: "مرضى اليوم",
    returningToday: "مراجع سابق اليوم",
    firstTimeToday: "زيارة أولى اليوم",
    registeredPatients: "مسجل بالعيادة",
    inQueueToday: "في الانتظار اليوم",
    returningPeriod: "مراجعين سابقين",
    firstTimePeriod: "زيارات جديدة",

    // Dashboard Stat Cards (Doctor)
    waitingPatients: "المرضى في الانتظار",
    completedToday: "اكتملت اليوم",
    averageWaitTime: "متوسط وقت الانتظار",
    revenue: "الإيرادات",
    totalConsultations: "إجمالي الاستشارات",
    startConsultation: "بدء الاستشارة",
    viewHistory: "عرض السجل الطبي",
    goodMorning: "صباح الخير،",
    betterCareTagline: "رعاية أفضل، لغدٍ أكثر صحة.",
    minutesAbbr: "دقيقة",
    paidVisits: "زيارات مدفوعة",
    feeLabel: "الرسوم",

    // Charts
    patientsLast7Days: "المرضى (آخر 7 أيام)",
    newVsOldPatients: "المرضى الجدد مقابل المراجعين السابقين",
    patientVisitsByDoctor: "زيارات المرضى حسب الطبيب",
    patientStatistics: "إحصائيات المرضى",
    revenueOverview: "نظرة عامة على الإيرادات",
    consultationRevenueLast7Days: "إيرادات الاستشارات (آخر 7 أيام)",
    numberOfPatientsLast7Days: "أعداد المراجعين (آخر 7 أيام)",
    highestVisitsToday: "أعلى زيارات اليوم:",
    totalVisits: "إجمالي الزيارات",
    noVisitsYet: "لا توجد زيارات بعد",
    newPatientLegend: "مريض جديد",
    oldPatientLegend: "مريض سابق",

    // Buttons & Actions
    newAppointment: "+ حجز موعد جديد",
    openBillingQueue: "فتح طابور الفواتير ←",
    collectPayment: "تحصيل الرسوم",
    dispatchReceipt: "إرسال الإيصال عبر الواتساب",
    addMedicine: "+ إضافة دواء",
    markComplete: "إتمام الاستشارة",
    callNextPatient: "استدعاء المريض التالي",

    // Patient / Queue Terms
    patientName: "اسم المريض",
    civilIdOrPhone: "الرقم المدني / الهاتف",
    phone: "رقم الهاتف",
    age: "العمر",
    gender: "الجنس",
    male: "ذكر",
    female: "أنثى",
    waiting: "في الانتظار",
    inConsultation: "قيد الاستشارة",
    inBilling: "في قسم المحاسبة",
    completed: "مكتمل",
    cancelled: "ملغي",
    scheduled: "مجدول",

    // Billing
    pendingBilling: "استشارات مكتملة بانتظار التحصيل",
    pendingCollections: "فواتير معلقة",
    paidInvoices: "فواتير مسددة",
    invoice: "فاتورة ضريبية",
    amount: "المبلغ",
    cash: "نقدي (كاش)",
    knetUpi: "كي نت / دفع إلكتروني",
    currencySymbol: "د.ك",
  },
};
