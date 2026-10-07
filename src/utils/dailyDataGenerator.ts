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

// Curated list of realistic patient profiles
const MOCK_PATIENT_TEMPLATES = [
  // Recurring/Old Patients (used in both past days and today to produce returning patient analytics)
  { name: "Rohan Mehra", phone: "+91 98201 44521", age: "34", gender: "Male", notes: "Acute viral fever and persistent dry cough", diagnosis: "Viral Upper Respiratory Infection", rx: "Paracetamol 650mg TDS, Cetirizine 10mg OD, Azithromycin 500mg OD" },
  { name: "Priya Sharma", phone: "+91 98192 33412", age: "28", gender: "Female", notes: "Severe throbbing headache with nausea and light sensitivity", diagnosis: "Migraine with Aura", rx: "Naproxen 500mg SOS, Domperidone 10mg TDS, Adequate hydration" },
  { name: "Amit Patel", phone: "+91 98765 12345", age: "48", gender: "Male", notes: "Routine follow-up for high blood pressure and fasting blood sugar", diagnosis: "Essential Hypertension & Pre-diabetes", rx: "Telmisartan 40mg OD, Metformin 500mg BD after meals" },
  { name: "Fatima Al-Sabah", phone: "+965 9912 3456", age: "36", gender: "Female", notes: "Seasonal rhinitis, nasal congestion, and throat irritation", diagnosis: "Allergic Rhinosinusitis", rx: "Fluticasone Nasal Spray, Levocetirizine 5mg OD at bedtime" },
  { name: "Sunita Verma", phone: "+91 97654 98765", age: "53", gender: "Female", notes: "Bilateral knee joint pain aggravated by stair climbing", diagnosis: "Bilateral Knee Osteoarthritis Grade II", rx: "Paracetamol 1000mg PRN, Calcium + Vit D3 daily, Physiotherapy" },
  { name: "Vikram Malhotra", phone: "+91 99887 66554", age: "39", gender: "Male", notes: "Post-prandial retrosternal burning and acid regurgitation", diagnosis: "Gastroesophageal Reflux Disease (GERD)", rx: "Pantoprazole 40mg OD before breakfast, Sucralfate syrup" },
  // Additional new patients
  { name: "Ananya Deshmukh", phone: "+91 91234 56789", age: "22", gender: "Female", notes: "Mild intermittent dizziness and general fatigue", diagnosis: "Nutritional Microcytic Anemia", rx: "Ferrous Ascorbate + Folic Acid OD, Dietary counseling" },
  { name: "Mohammed Al-Kandari", phone: "+965 9876 5432", age: "43", gender: "Male", notes: "Review of elevated liver enzymes and annual lipid profile", diagnosis: "Non-Alcoholic Fatty Liver (Grade 1)", rx: "Atorvastatin 10mg at night, Lifestyle and exercise regimen" },
  { name: "Rajesh Kothari", phone: "+91 98334 55667", age: "61", gender: "Male", notes: "Chronic low back pain radiating to left buttock", diagnosis: "Lumbar Spondylosis with mild Sciatica", rx: "Aceclofenac + Paracetamol BD for 5 days, Pregabalin 75mg at night" },
  { name: "Neha Gupta", phone: "+91 97112 33445", age: "29", gender: "Female", notes: "Skin eruption with erythema and itching on forearm", diagnosis: "Contact Dermatitis", rx: "Hydrocortisone cream 1% topical, Ebastine 10mg OD" },
  { name: "Tariq Al-Enezi", phone: "+965 9445 1122", age: "35", gender: "Male", notes: "Productive morning cough with whitish sputum", diagnosis: "Acute Bronchitis", rx: "Amoxicillin-Clavulanate 625mg BD, Bromhexine syrup TDS" },
  { name: "Kavita Rao", phone: "+91 99001 12233", age: "41", gender: "Female", notes: "Thyroid profile evaluation; sluggishness and weight gain", diagnosis: "Subclinical Hypothyroidism", rx: "Levothyroxine 50mcg empty stomach morning" },
  { name: "Zaid Ahmed", phone: "+91 98451 99887", age: "31", gender: "Male", notes: "Annual wellness checkup and preventive health screening", diagnosis: "General Health Checkup — Normal", rx: "Multivitamin + Zinc daily, Routine exercise advised" },
  { name: "Mariam Al-Mutawa", phone: "+965 9667 8899", age: "46", gender: "Female", notes: "Recurrent burning micturition and lower abdominal pain", diagnosis: "Acute Uncomplicated UTI", rx: "Nitrofurantoin 100mg BD for 5 days, Alkalinizing agent" },
  { name: "Deepak Soni", phone: "+91 98991 22334", age: "37", gender: "Male", notes: "Right eye redness, grittiness, and watery discharge", diagnosis: "Acute Bacterial Conjunctivitis", rx: "Moxifloxacin Eye Drops 0.5% 1 drop 4 times daily" },
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
 * Automatically seeds fresh clinic data every day:
 * 1. Historical data (Past 6 days: Day -6 to Day -1) so 7-day charts and patient trends work.
 * 2. TODAY'S LIVE DATA:
 *    - Completed visits earlier today (with a mix of Old/Returning and New/First-Time patients, plus Cash & UPI invoices).
 *    - Active patient in consultation / called.
 *    - Waiting patients in the live queue.
 *    - Scheduled appointments for this afternoon/evening.
 *
 * This ensures every KPI card (Old Patient, New Patient, Total Patient, Today Patient)
 * and charts immediately display vibrant, realistic live clinic operations.
 */
export async function seedClinicDailyLiveData(
  clinicId: string,
  doctorInfo: SeedDoctorInfo,
  receptionistInfo?: SeedReceptionistInfo,
  clearExisting: boolean = true
): Promise<{ count: number }> {
  if (!clinicId) throw new Error("Clinic ID is required to seed live data.");

  console.log(`[DailyDataGenerator] Auto-seeding fresh daily live data for clinic: ${clinicId}`);

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
  for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
    const targetDate = new Date(todayStart);
    targetDate.setDate(targetDate.getDate() - dayOffset);

    const visitsCount = 4 + (dayOffset % 3); // 4 to 6 visits per past day

    for (let v = 0; v < visitsCount; v++) {
      const tmplIndex = (v * 2 + dayOffset) % MOCK_PATIENT_TEMPLATES.length;
      const tmpl = MOCK_PATIENT_TEMPLATES[tmplIndex];

      const visitHour = 9 + Math.floor((v / visitsCount) * 8); // 9 AM to 5 PM
      const visitMinute = (v * 19) % 60;
      const visitTime = new Date(targetDate);
      visitTime.setHours(visitHour, visitMinute, 0, 0);

      const isUPI = (v + dayOffset) % 2 === 0;
      const paymentMethod = isUPI ? "UPI" : "Cash";
      const invoiceNum = `INV-${targetDate.getFullYear()}${(targetDate.getMonth() + 1).toString().padStart(2, "0")}-${(dayOffset * 10 + v + 1).toString().padStart(3, "0")}`;

      const historicalPatient = {
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
        appointmentType: v % 3 === 0 ? "Follow-up" : "General Consultation",
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
      };

      patientsToInsert.push(historicalPatient);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // B. TODAY'S COMPLETED VISITS (Treated earlier today)
  // ─────────────────────────────────────────────────────────────
  // We craft 4 completed visits for today:
  // - 2 Old/Returning patients (templates 0 and 2 appeared in past days, matching phone numbers)
  // - 2 New/First-Time patients (templates 6 and 7 with fresh phone numbers)
  const todayCompletedTemplates = [
    { tmpl: MOCK_PATIENT_TEMPLATES[0], hour: 9, min: 15, isUPI: false }, // Returning (Rohan)
    { tmpl: MOCK_PATIENT_TEMPLATES[6], hour: 9, min: 50, isUPI: true },  // New (Ananya)
    { tmpl: MOCK_PATIENT_TEMPLATES[2], hour: 10, min: 25, isUPI: true }, // Returning (Amit)
    { tmpl: MOCK_PATIENT_TEMPLATES[7], hour: 11, min: 10, isUPI: false },// New (Mohammed)
  ];

  todayCompletedTemplates.forEach(({ tmpl, hour, min, isUPI }, idx) => {
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
      appointmentType: idx % 2 === 0 ? "Follow-up" : "General Consultation",
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
  // C. TODAY'S ACTIVE PATIENT IN CONSULTATION (Called right now)
  // ─────────────────────────────────────────────────────────────
  const inConsultTmpl = MOCK_PATIENT_TEMPLATES[1]; // Priya
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
  // D. TODAY'S LIVE WAITING QUEUE PATIENTS (Waiting to be called)
  // ─────────────────────────────────────────────────────────────
  const waitingTemplates = [
    MOCK_PATIENT_TEMPLATES[3], // Fatima
    MOCK_PATIENT_TEMPLATES[8], // Rajesh
  ];

  waitingTemplates.forEach((tmpl, idx) => {
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
      appointmentType: "General Consultation",
      appointmentDate: todayStart.toISOString().split("T")[0],
      appointmentTime: queueTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      timestamp: Timestamp.fromDate(queueTime),
      createdAt: Timestamp.fromDate(queueTime),
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E. TODAY'S SCHEDULED APPOINTMENTS (Afternoon / Evening)
  // ─────────────────────────────────────────────────────────────
  const scheduledTemplates = [
    { tmpl: MOCK_PATIENT_TEMPLATES[4], time: "02:30 PM", hour: 14, min: 30, type: "Routine Checkup" },
    { tmpl: MOCK_PATIENT_TEMPLATES[9], time: "04:15 PM", hour: 16, min: 15, type: "General Consultation" },
  ];

  scheduledTemplates.forEach(({ tmpl, time, hour, min, type }) => {
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
 * Checks whether the clinic needs a new daily rollover.
 * If today's date has no active records or if patient list is empty,
 * it automatically generates the fresh live dataset for TODAY in the background!
 */
export async function checkAndAutoRollOverDaily(
  clinicId: string,
  doctorInfo: SeedDoctorInfo,
  receptionistInfo?: SeedReceptionistInfo,
  currentPatients: Patient[] = []
): Promise<boolean> {
  if (!clinicId) return false;

  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Check if today already has patients
  const hasTodayPatients = currentPatients.some((p) => {
    const ts = p.paidAt || p.consultationCompletedAt || p.calledAt || p.timestamp || p.createdAt;
    if (!ts) return false;
    let d: Date | null = null;
    if (ts.toDate && typeof ts.toDate === "function") d = ts.toDate();
    else if (ts.seconds) d = new Date(ts.seconds * 1000);
    else if (typeof ts === "string" || typeof ts === "number") d = new Date(ts);
    if (!d || isNaN(d.getTime())) return false;

    return d.toISOString().split("T")[0] === todayStr;
  });

  // If today has no patient records, auto-roll over immediately
  if (!hasTodayPatients || currentPatients.length === 0) {
    console.log(`[DailyDataGenerator] Auto-rolling over fresh live data for today (${todayStr})...`);
    try {
      await seedClinicDailyLiveData(clinicId, doctorInfo, receptionistInfo, true);
      return true;
    } catch (err) {
      console.error("[DailyDataGenerator] Auto-rollover failed:", err);
      return false;
    }
  }

  return false;
}
