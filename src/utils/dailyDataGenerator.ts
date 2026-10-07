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

// Realistic patient templates for clinical simulation
const MOCK_PATIENT_TEMPLATES = [
  { name: "Rohan Mehra", phone: "+91 98201 44521", age: "34", gender: "Male", notes: "Acute viral fever and persistent dry cough", diagnosis: "Viral Upper Respiratory Infection", rx: "Paracetamol 650mg TDS, Cetirizine 10mg OD, Azithromycin 500mg OD" },
  { name: "Priya Sharma", phone: "+91 98192 33412", age: "28", gender: "Female", notes: "Severe throbbing headache with nausea and light sensitivity", diagnosis: "Migraine with Aura", rx: "Naproxen 500mg SOS, Domperidone 10mg TDS, Adequate hydration" },
  { name: "Amit Patel", phone: "+91 98765 12345", age: "48", gender: "Male", notes: "Routine follow-up for high blood pressure and fasting blood sugar", diagnosis: "Essential Hypertension & Pre-diabetes", rx: "Telmisartan 40mg OD, Metformin 500mg BD after meals" },
  { name: "Fatima Al-Sabah", phone: "+965 9912 3456", age: "36", gender: "Female", notes: "Seasonal rhinitis, nasal congestion, and throat irritation", diagnosis: "Allergic Rhinosinusitis", rx: "Fluticasone Nasal Spray, Levocetirizine 5mg OD at bedtime" },
  { name: "Sunita Verma", phone: "+91 97654 98765", age: "53", gender: "Female", notes: "Bilateral knee joint pain aggravated by stair climbing", diagnosis: "Bilateral Knee Osteoarthritis Grade II", rx: "Paracetamol 1000mg PRN, Calcium + Vit D3 daily, Physiotherapy" },
  { name: "Vikram Malhotra", phone: "+91 99887 66554", age: "39", gender: "Male", notes: "Post-prandial retrosternal burning and acid regurgitation", diagnosis: "Gastroesophageal Reflux Disease (GERD)", rx: "Pantoprazole 40mg OD before breakfast, Sucralfate syrup" },
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
 * Seeds clinic data where:
 * 1. Historical data (Past 6 days: Day -6 to Day -1) is seeded so 7-day charts and patient history work.
 * 2. TODAY STARTS STRICTLY FROM ZERO (0 waiting, 0 in consultation, 0 completed today, 0 revenue today).
 *    Live queue starts at Token #1 as soon as receptionist registers a new patient today!
 * 3. Optional parameter `includeTodayDemoPatients: true` can populate demo patients for today if requested.
 */
export async function seedClinicDailyLiveData(
  clinicId: string,
  doctorInfo: SeedDoctorInfo,
  receptionistInfo?: SeedReceptionistInfo,
  clearExisting: boolean = true,
  includeTodayDemoPatients: boolean = false
): Promise<{ count: number }> {
  if (!clinicId) throw new Error("Clinic ID is required to seed live data.");

  console.log(`[DailyDataGenerator] Initializing fresh live data from ZERO for clinic: ${clinicId}`);

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

  // ─────────────────────────────────────────────────────────────
  // A. HISTORICAL PATIENTS (Past 6 Days: Day -6 down to Day -1)
  // ─────────────────────────────────────────────────────────────
  // Populates past days so 7-Day Performance Charts (New vs Old Patients, Cash vs UPI)
  // have authentic historical trendlines, while TODAY remains strictly at ZERO!
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
  // B. TODAY'S QUEUE: STRICTLY ZERO BY DEFAULT!
  // ─────────────────────────────────────────────────────────────
  // On a new day, today's queue starts completely clean (from ZERO):
  // - 0 Waiting
  // - 0 Called / In Consultation
  // - 0 Completed today
  // - Today visits = 0
  // - Today revenue = 0
  // The first patient registered today will receive Token #1.
  if (includeTodayDemoPatients) {
    let tokenCounter = 1;
    const waitingPatients = [MOCK_PATIENT_TEMPLATES[0], MOCK_PATIENT_TEMPLATES[1]];
    waitingPatients.forEach((tmpl, idx) => {
      const qTime = new Date(todayStart);
      qTime.setHours(9, 30 + idx * 15, 0, 0);
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
        appointmentTime: qTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        timestamp: Timestamp.fromDate(qTime),
        createdAt: Timestamp.fromDate(qTime),
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Commit all prepared patient documents to Firestore in batches
  // ─────────────────────────────────────────────────────────────
  console.log(`[DailyDataGenerator] Writing ${patientsToInsert.length} historical records (Today starts at ZERO)...`);

  for (let i = 0; i < patientsToInsert.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = patientsToInsert.slice(i, i + 400);
    chunk.forEach((pData) => {
      const newRef = doc(collection(db, "patients"));
      batch.set(newRef, pData);
    });
    await batch.commit();
  }

  console.log(`[DailyDataGenerator] Successfully committed! Today queue initialized to ZERO.`);
  return { count: patientsToInsert.length };
}

/**
 * Checks whether the clinic needs a new daily rollover.
 * If the date has changed or no patients exist:
 * 1. Archives/completes any stale active patients from yesterday.
 * 2. Ensures today's live queue starts strictly from ZERO.
 * 3. Pre-seeds rolling 6-day history so charts and performance KPIs remain functional.
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
  const hasTodayPatient = currentPatients.some((p) => {
    const ts = p.paidAt || p.consultationCompletedAt || p.calledAt || p.timestamp || p.createdAt;
    if (!ts) return false;
    let d: Date | null = null;
    if (ts.toDate && typeof ts.toDate === "function") d = ts.toDate();
    else if (ts.seconds) d = new Date(ts.seconds * 1000);
    else if (typeof ts === "string" || typeof ts === "number") d = new Date(ts);
    if (!d || isNaN(d.getTime())) return false;

    return d.toISOString().split("T")[0] === todayStr;
  });

  // If patient list is completely empty, initialize fresh live data with today at ZERO
  if (currentPatients.length === 0) {
    console.log(`[DailyDataGenerator] Empty clinic database. Seeding fresh historical baseline with today starting from ZERO...`);
    try {
      await seedClinicDailyLiveData(clinicId, doctorInfo, receptionistInfo, true, false);
      return true;
    } catch (err) {
      console.error("[DailyDataGenerator] Auto-seed failed:", err);
      return false;
    }
  }

  // If there are patients, check if ANY patient is from yesterday or older while today is clean
  // Stale active patients (Waiting or Called from yesterday) must be closed so they don't leak into today's queue
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
    console.log(`[DailyDataGenerator] Archiving ${staleActivePatients.length} stale active patients from previous day...`);
    try {
      const batch = writeBatch(db);
      staleActivePatients.forEach((p) => {
        batch.update(doc(db, "patients", p.id), {
          status: "Completed",
          billingStatus: "Paid",
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
