import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Patient } from "../App";

export interface SeedDoctorInfo {
  uid: string;
  id?: string;
  doctorId?: string;
  name: string;
  email: string;
  category?: "GP" | "PEDIATRICIAN" | "DENTIST" | string;
}

export interface SeedReceptionistInfo {
  uid: string;
  id?: string;
  receptionistId?: string;
  name: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────
// 1. RECURRING PATIENTS POOL (Seen on past days AND returning today)
// These patients have past visits, so when they visit today, they are
// counted as "OLD PATIENT (Returning today)"!
// ─────────────────────────────────────────────────────────────
const RECURRING_PATIENT_TEMPLATES = [
  { name: "Rohan Mehra", phone: "+91 98201 44521", age: "34", gender: "Male", notes: "Acute viral fever follow-up and chest checkup", diagnosis: "Viral Upper Respiratory Infection", rx: "Paracetamol 650mg TDS, Cetirizine 10mg OD" },
  { name: "Amit Patel", phone: "+91 98765 12345", age: "48", gender: "Male", notes: "Hypertension review and blood sugar refill", diagnosis: "Essential Hypertension", rx: "Telmisartan 40mg OD, Metformin 500mg BD" },
  { name: "Fatima Al-Sabah", phone: "+965 9912 3456", age: "36", gender: "Female", notes: "Allergic rhinitis seasonal follow-up", diagnosis: "Allergic Rhinosinusitis", rx: "Fluticasone Nasal Spray, Levocetirizine 5mg OD" },
  { name: "Sunita Verma", phone: "+91 97654 98765", age: "53", gender: "Female", notes: "Knee osteoarthritis review and physiotherapy advice", diagnosis: "Bilateral Knee Osteoarthritis", rx: "Paracetamol 1000mg PRN, Calcium + Vit D3 daily" },
  { name: "Vikram Malhotra", phone: "+91 99887 66554", age: "39", gender: "Male", notes: "GERD follow-up and dietary compliance check", diagnosis: "Gastroesophageal Reflux Disease", rx: "Pantoprazole 40mg OD before breakfast" },
  { name: "Rajesh Kothari", phone: "+91 98334 55667", age: "61", gender: "Male", notes: "Chronic low back pain physiotherapy review", diagnosis: "Lumbar Spondylosis", rx: "Aceclofenac + Paracetamol BD" },
];

// ─────────────────────────────────────────────────────────────
// 2. PAST-ONLY PATIENT POOL (Seen on past days only)
// Provides historical baseline for past days so past days also have New Patients.
// ─────────────────────────────────────────────────────────────
const PAST_ONLY_PATIENT_TEMPLATES = [
  { name: "Priya Sharma", phone: "+91 98192 33412", age: "28", gender: "Female", notes: "Throbbing headache with light sensitivity", diagnosis: "Migraine with Aura", rx: "Naproxen 500mg SOS" },
  { name: "Mohammed Al-Kandari", phone: "+965 9876 5432", age: "43", gender: "Male", notes: "Annual liver enzyme and lipid panel review", diagnosis: "Non-Alcoholic Fatty Liver (Grade 1)", rx: "Atorvastatin 10mg at night" },
  { name: "Neha Gupta", phone: "+91 97112 33445", age: "29", gender: "Female", notes: "Skin eruption with erythema and itching", diagnosis: "Contact Dermatitis", rx: "Hydrocortisone cream 1% topical" },
  { name: "Kavita Rao", phone: "+91 99001 12233", age: "41", gender: "Female", notes: "Thyroid profile evaluation", diagnosis: "Subclinical Hypothyroidism", rx: "Levothyroxine 50mcg" },
];

// ─────────────────────────────────────────────────────────────
// 3. TODAY'S BRAND NEW PATIENTS (NEVER appear in past days!)
// Their first visit timestamp is TODAY, guaranteeing they are
// counted as "NEW PATIENT (First-time today)"!
// ─────────────────────────────────────────────────────────────
const TODAY_NEW_PATIENT_TEMPLATES = [
  { name: "Ananya Deshmukh", phone: "+91 91234 56789", age: "22", gender: "Female", notes: "Mild intermittent dizziness and general fatigue", diagnosis: "Nutritional Microcytic Anemia", rx: "Ferrous Ascorbate + Folic Acid OD, Dietary counseling" },
  { name: "Tariq Al-Enezi", phone: "+965 9445 1122", age: "35", gender: "Male", notes: "Productive morning cough with whitish sputum", diagnosis: "Acute Bronchitis", rx: "Amoxicillin-Clavulanate 625mg BD, Bromhexine syrup TDS" },
  { name: "Deepak Soni", phone: "+91 98991 22334", age: "37", gender: "Male", notes: "Right eye redness, grittiness, and watery discharge", diagnosis: "Acute Bacterial Conjunctivitis", rx: "Moxifloxacin Eye Drops 0.5% 1 drop 4 times daily" },
  { name: "Mariam Al-Mutawa", phone: "+965 9667 8899", age: "46", gender: "Female", notes: "Recurrent burning micturition and lower abdominal pain", diagnosis: "Acute Uncomplicated UTI", rx: "Nitrofurantoin 100mg BD for 5 days, Alkalinizing agent" },
  { name: "Zaid Ahmed", phone: "+91 98451 99887", age: "31", gender: "Male", notes: "Annual wellness checkup and preventive health screening", diagnosis: "General Health Checkup — Normal", rx: "Multivitamin + Zinc daily, Routine exercise advised" },
];

/**
 * Purges all patient documents for a clinic completely from Firestore.
 */
export async function clearAllClinicPatients(clinicId: string): Promise<number> {
  if (!clinicId) return 0;
  try {
    const qExisting = query(
      collection(db, "patients"),
      where("clinicId", "==", clinicId)
    );
    const snap = await getDocs(qExisting);
    const docsToDelete = snap.docs;
    for (let i = 0; i < docsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = docsToDelete.slice(i, i + 400);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    console.log(`[DailyDataGenerator] Purged ${docsToDelete.length} patients for clinic ${clinicId}`);
    return docsToDelete.length;
  } catch (err) {
    console.error("[DailyDataGenerator] Error purging clinic patients:", err);
    return 0;
  }
}

/**
 * Automatically seeds fresh daily clinic data with a balanced mix of:
 * - OLD / RETURNING patients (phone numbers existed in past days)
 * - NEW / FIRST-TIME patients (phone numbers NEVER existed before today)
 *
 * Guarantees that:
 * 1. "OLD PATIENT" card shows active returning patients for today (> 0).
 * 2. "NEW PATIENT" card shows active first-time patients for today (> 0).
 * 3. 7-Day Bar Chart renders BOTH Green (New Patients) and Blue (Old Patients) on EVERY day including Today.
 * 4. Today's live queue (Waiting & Consulting) and afternoon appointments are fully populated.
 */
export async function seedClinicDailyLiveData(
  clinicId: string,
  doctorInfo: SeedDoctorInfo,
  receptionistInfo?: SeedReceptionistInfo,
  clearExisting: boolean = true
): Promise<{ count: number }> {
  if (!clinicId) throw new Error("Clinic ID is required to seed live data.");

  console.log(`[DailyDataGenerator] Seeding balanced daily live data for clinic: ${clinicId}`);

  // 1. Purge existing patients for this clinic
  if (clearExisting) {
    await clearAllClinicPatients(clinicId);
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const fee = doctorInfo.category === "DENTIST" ? 700 : doctorInfo.category === "PEDIATRICIAN" ? 600 : 500;

  const docUid = doctorInfo.uid || "";
  const docId = doctorInfo.doctorId || doctorInfo.id || (docUid ? `DOC-${clinicId}-${docUid.slice(0, 4).toUpperCase()}` : `DOC-${clinicId}-01`);
  const docEmail = (doctorInfo.email || "").toLowerCase().trim();
  const docName = doctorInfo.name || "Doctor";
  const docCat = doctorInfo.category || "GP";

  const recUid = receptionistInfo?.uid || "";
  const recId = receptionistInfo?.receptionistId || receptionistInfo?.id || `REC-${clinicId}-01`;
  const recEmail = (receptionistInfo?.email || "").toLowerCase().trim();
  const recName = receptionistInfo?.name || "Front Desk";

  const patientsToInsert: any[] = [];
  let tokenCounter = 1;

  // ─────────────────────────────────────────────────────────────
  // A. HISTORICAL PATIENTS (Past 6 Days: Day -6 down to Day -1)
  // ─────────────────────────────────────────────────────────────
  // We use RECURRING_PATIENT_TEMPLATES and PAST_ONLY_PATIENT_TEMPLATES.
  // Note: We deliberately DO NOT use TODAY_NEW_PATIENT_TEMPLATES here,
  // guaranteeing that today's new patients are 100% genuine first-time visitors!
  for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
    const targetDate = new Date(todayStart);
    targetDate.setDate(targetDate.getDate() - dayOffset);

    // 5 visits per past day (2 from recurring pool, 3 from past-only pool)
    const dayTemplates = [
      RECURRING_PATIENT_TEMPLATES[(dayOffset * 2) % RECURRING_PATIENT_TEMPLATES.length],
      RECURRING_PATIENT_TEMPLATES[(dayOffset * 2 + 1) % RECURRING_PATIENT_TEMPLATES.length],
      PAST_ONLY_PATIENT_TEMPLATES[dayOffset % PAST_ONLY_PATIENT_TEMPLATES.length],
      PAST_ONLY_PATIENT_TEMPLATES[(dayOffset + 1) % PAST_ONLY_PATIENT_TEMPLATES.length],
      PAST_ONLY_PATIENT_TEMPLATES[(dayOffset + 2) % PAST_ONLY_PATIENT_TEMPLATES.length],
    ];

    dayTemplates.forEach((tmpl, v) => {
      const visitHour = 9 + Math.floor((v / dayTemplates.length) * 8); // 9 AM to 5 PM
      const visitMinute = (v * 19) % 60;
      const visitTime = new Date(targetDate);
      visitTime.setHours(visitHour, visitMinute, 0, 0);

      const isUPI = (v + dayOffset) % 2 === 0;
      const paymentMethod = isUPI ? "UPI" : "Cash";
      const invoiceNum = `INV-${targetDate.getFullYear()}${(targetDate.getMonth() + 1).toString().padStart(2, "0")}-${(dayOffset * 10 + v + 1).toString().padStart(3, "0")}`;

      patientsToInsert.push({
        name: tmpl.name,
        phone: tmpl.phone,
        age: tmpl.age,
        gender: tmpl.gender,
        queueNumber: v + 1,
        status: "Completed",
        billingStatus: "Paid",
        paymentMethod,
        consultationFee: fee,
        billingAmount: fee,
        invoiceNumber: invoiceNum,
        clinicId,
        doctorUid: docUid,
        doctorId: docId,
        doctorEmail: docEmail,
        doctorName: docName,
        doctorCategory: docCat,
        receptionistUid: recUid,
        receptionistId: recId,
        receptionistEmail: recEmail,
        receptionistName: recName,
        addedBy: recUid || docUid || "system",
        notes: tmpl.notes,
        diagnosis: tmpl.diagnosis,
        prescription: tmpl.rx,
        appointmentType: v % 2 === 0 ? "General Consultation" : "Follow-up",
        appointmentDate: targetDate.toISOString().split("T")[0],
        appointmentTime: visitTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        timestamp: Timestamp.fromDate(visitTime),
        createdAt: Timestamp.fromDate(visitTime),
        calledAt: Timestamp.fromDate(new Date(visitTime.getTime() + 15 * 60000)),
        consultationCompletedAt: Timestamp.fromDate(new Date(visitTime.getTime() + 30 * 60000)),
        paidAt: Timestamp.fromDate(new Date(visitTime.getTime() + 35 * 60000)),
        vitals: {
          bp: `${115 + (v % 4) * 5}/${75 + (v % 3) * 5}`,
          pulse: `${70 + (v % 5) * 2}`,
          temp: `${98.4 + (v % 3) * 0.2}°F`,
          spo2: "99%",
        },
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // B. TODAY'S COMPLETED VISITS (4 treated earlier today)
  // ─────────────────────────────────────────────────────────────
  // - 2 Old / Returning Patients (Rohan & Amit from recurring pool)
  // - 2 New / First-Time Patients (Ananya & Tariq from today's new pool)
  const todayCompleted = [
    { tmpl: RECURRING_PATIENT_TEMPLATES[0], hour: 9, min: 15, isUPI: false, type: "Follow-up" },            // OLD (Rohan)
    { tmpl: TODAY_NEW_PATIENT_TEMPLATES[0], hour: 9, min: 50, isUPI: true, type: "General Consultation" }, // NEW (Ananya)
    { tmpl: RECURRING_PATIENT_TEMPLATES[1], hour: 10, min: 25, isUPI: true, type: "Routine Checkup" },      // OLD (Amit)
    { tmpl: TODAY_NEW_PATIENT_TEMPLATES[1], hour: 11, min: 10, isUPI: false, type: "General Consultation" },// NEW (Tariq)
  ];

  todayCompleted.forEach(({ tmpl, hour, min, isUPI, type }) => {
    const visitTime = new Date(todayStart);
    visitTime.setHours(hour, min, 0, 0);
    const invoiceNum = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}-${tokenCounter.toString().padStart(3, "0")}`;

    patientsToInsert.push({
      name: tmpl.name,
      phone: tmpl.phone,
      age: tmpl.age,
      gender: tmpl.gender,
      queueNumber: tokenCounter++,
      status: "Completed",
      billingStatus: "Paid",
      paymentMethod: isUPI ? "UPI" : "Cash",
      consultationFee: fee,
      billingAmount: fee,
      invoiceNumber: invoiceNum,
      clinicId,
      doctorUid: docUid,
      doctorId: docId,
      doctorEmail: docEmail,
      doctorName: docName,
      doctorCategory: docCat,
      receptionistUid: recUid,
      receptionistId: recId,
      receptionistEmail: recEmail,
      receptionistName: recName,
      addedBy: recUid || docUid || "system",
      notes: tmpl.notes,
      diagnosis: tmpl.diagnosis,
      prescription: tmpl.rx,
      appointmentType: type,
      appointmentDate: todayStart.toISOString().split("T")[0],
      appointmentTime: visitTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      timestamp: Timestamp.fromDate(visitTime),
      createdAt: Timestamp.fromDate(visitTime),
      calledAt: Timestamp.fromDate(new Date(visitTime.getTime() + 10 * 60000)),
      consultationCompletedAt: Timestamp.fromDate(new Date(visitTime.getTime() + 25 * 60000)),
      paidAt: Timestamp.fromDate(new Date(visitTime.getTime() + 30 * 60000)),
      vitals: {
        bp: "120/80",
        pulse: "74",
        temp: "98.6°F",
        spo2: "99%",
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // C. TODAY'S ACTIVE IN-CONSULTATION PATIENT (Called right now)
  // ─────────────────────────────────────────────────────────────
  // Fatima (OLD / Returning patient)
  const inConsultTmpl = RECURRING_PATIENT_TEMPLATES[2];
  const inConsultTime = new Date(todayStart);
  inConsultTime.setHours(11, 45, 0, 0);

  patientsToInsert.push({
    name: inConsultTmpl.name,
    phone: inConsultTmpl.phone,
    age: inConsultTmpl.age,
    gender: inConsultTmpl.gender,
    queueNumber: tokenCounter++,
    status: "Called",
    billingStatus: "Pending",
    consultationFee: fee,
    clinicId,
    doctorUid: docUid,
    doctorId: docId,
    doctorEmail: docEmail,
    doctorName: docName,
    doctorCategory: docCat,
    receptionistUid: recUid,
    receptionistId: recId,
    receptionistEmail: recEmail,
    receptionistName: recName,
    addedBy: recUid || docUid || "system",
    notes: inConsultTmpl.notes,
    appointmentType: "Follow-up",
    appointmentDate: todayStart.toISOString().split("T")[0],
    appointmentTime: inConsultTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    timestamp: Timestamp.fromDate(inConsultTime),
    createdAt: Timestamp.fromDate(inConsultTime),
    calledAt: Timestamp.fromDate(inConsultTime),
    vitals: {
      bp: "124/82",
      pulse: "76",
      temp: "98.5°F",
      spo2: "99%",
    },
  });

  // ─────────────────────────────────────────────────────────────
  // D. TODAY'S LIVE WAITING QUEUE PATIENTS (Waiting in queue)
  // ─────────────────────────────────────────────────────────────
  // - Sunita (OLD / Returning)
  // - Deepak (NEW / First-time)
  const waitingList = [
    { tmpl: RECURRING_PATIENT_TEMPLATES[3], type: "Routine Checkup" },     // OLD (Sunita)
    { tmpl: TODAY_NEW_PATIENT_TEMPLATES[2], type: "General Consultation" },// NEW (Deepak)
  ];

  waitingList.forEach(({ tmpl, type }, idx) => {
    const queueTime = new Date(todayStart);
    queueTime.setHours(12, 10 + idx * 15, 0, 0);

    patientsToInsert.push({
      name: tmpl.name,
      phone: tmpl.phone,
      age: tmpl.age,
      gender: tmpl.gender,
      queueNumber: tokenCounter++,
      status: "Waiting",
      billingStatus: "Pending",
      consultationFee: fee,
      clinicId,
      doctorUid: docUid,
      doctorId: docId,
      doctorEmail: docEmail,
      doctorName: docName,
      doctorCategory: docCat,
      receptionistUid: recUid,
      receptionistId: recId,
      receptionistEmail: recEmail,
      receptionistName: recName,
      addedBy: recUid || docUid || "system",
      notes: tmpl.notes,
      appointmentType: type,
      appointmentDate: todayStart.toISOString().split("T")[0],
      appointmentTime: queueTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      timestamp: Timestamp.fromDate(queueTime),
      createdAt: Timestamp.fromDate(queueTime),
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E. TODAY'S SCHEDULED APPOINTMENTS (Afternoon / Evening)
  // ─────────────────────────────────────────────────────────────
  // - Mariam (NEW / First-Time)
  // - Zaid (NEW / First-Time)
  const scheduledList = [
    { tmpl: TODAY_NEW_PATIENT_TEMPLATES[3], time: "02:30 PM", hour: 14, min: 30, type: "Routine Checkup" },     // NEW (Mariam)
    { tmpl: TODAY_NEW_PATIENT_TEMPLATES[4], time: "04:15 PM", hour: 16, min: 15, type: "General Consultation" },// NEW (Zaid)
  ];

  scheduledList.forEach(({ tmpl, time, hour, min, type }) => {
    const aptTime = new Date(todayStart);
    aptTime.setHours(hour, min, 0, 0);

    patientsToInsert.push({
      name: tmpl.name,
      phone: tmpl.phone,
      age: tmpl.age,
      gender: tmpl.gender,
      queueNumber: tokenCounter++,
      status: "SCHEDULED",
      billingStatus: "Pending",
      consultationFee: fee,
      clinicId,
      doctorUid: docUid,
      doctorId: docId,
      doctorEmail: docEmail,
      doctorName: docName,
      doctorCategory: docCat,
      receptionistUid: recUid,
      receptionistId: recId,
      receptionistEmail: recEmail,
      receptionistName: recName,
      addedBy: recUid || docUid || "system",
      notes: tmpl.notes,
      appointmentType: type,
      appointmentDate: todayStart.toISOString().split("T")[0],
      appointmentTime: time,
      timestamp: Timestamp.fromDate(aptTime),
      createdAt: Timestamp.fromDate(aptTime),
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Commit all prepared patient documents to Firestore in batches
  // ─────────────────────────────────────────────────────────────
  console.log(`[DailyDataGenerator] Writing ${patientsToInsert.length} active records to Firestore...`);

  for (let i = 0; i < patientsToInsert.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = patientsToInsert.slice(i, i + 400);
    chunk.forEach((pData) => {
      const newRef = doc(collection(db, "patients"));
      batch.set(newRef, pData);
    });
    await batch.commit();
  }

  console.log(`[DailyDataGenerator] Successfully committed ${patientsToInsert.length} live records!`);
  return { count: patientsToInsert.length };
}

/**
/**
 * Checks whether the clinic needs a new daily rollover.
 * Archives any stale active patients (Waiting / Called) from previous days
 * so today's live queue starts strictly and cleanly from ZERO (0) every single day.
 * NEVER inserts fake/mock patients — all data is 100% live clinic data!
 */
export async function checkAndAutoRollOverDaily(
  clinicId: string,
  _doctorInfo?: SeedDoctorInfo,
  _receptionistInfo?: SeedReceptionistInfo,
  currentPatients: Patient[] = []
): Promise<boolean> {
  if (!clinicId) return false;

  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Check for any stale active patients (Waiting, Called, or Consulting) from yesterday or older
  const staleActivePatients = currentPatients.filter((p) => {
    if (p.status !== "Waiting" && p.status !== "Called" && p.status !== "Consulting") return false;
    const ts = p.timestamp || p.createdAt;
    if (!ts) return false;
    let d: Date | null = null;
    if (ts.toDate && typeof ts.toDate === "function") d = ts.toDate();
    else if (ts.seconds) d = new Date(ts.seconds * 1000);
    else if (typeof ts === "string" || typeof ts === "number") d = new Date(ts);
    if (!d || isNaN(d.getTime())) return false;
    return d.toISOString().split("T")[0] < todayStr;
  });

  if (staleActivePatients.length > 0) {
    console.log(`[DailyDataGenerator] Closing ${staleActivePatients.length} stale active patients from previous day for clean live start at 0...`);
    try {
      const batch = writeBatch(db);
      staleActivePatients.forEach((p) => {
        batch.update(doc(db, "patients", p.id), {
          status: "Completed",
          notes: (p.notes || "") + " [Closed on daily rollover]",
        });
      });
      await batch.commit();
      return true;
    } catch (err) {
      console.error("[DailyDataGenerator] Error archiving stale patients:", err);
    }
  }

  return false;
}

