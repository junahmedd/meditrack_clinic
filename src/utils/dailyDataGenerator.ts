import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
  serverTimestamp,
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

// Generate realistic Indian and Kuwaiti patient names, phones, symptoms
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
 * Generates fresh, dynamic live clinic data for the specified clinic.
 * Automatically crafts:
 * 1. Today's live waiting queue (Waiting, Called/In Consultation)
 * 2. Today's completed consultations with bills and invoices
 * 3. Today's scheduled appointments for later in the afternoon
 * 4. Past 6 days of historical patients (giving full 7-day analytics for New/Old patients and Cash/UPI revenue)
 */
export async function seedClinicDailyLiveData(
  clinicId: string,
  doctorInfo: SeedDoctorInfo,
  receptionistInfo?: SeedReceptionistInfo,
  clearExisting: boolean = true
): Promise<{ count: number }> {
  if (!clinicId) throw new Error("Clinic ID is required to seed live data.");

  console.log(`[DailyDataGenerator] Seeding live data for clinic: ${clinicId}, Doctor: ${doctorInfo.name}, ClearExisting: ${clearExisting}`);

  // 1. If clearExisting is requested, delete old patient documents for this clinic
  if (clearExisting) {
    try {
      const qExisting = query(
        collection(db, "patients"),
        where("clinicId", "==", clinicId)
      );
      const snap = await getDocs(qExisting);
      console.log(`[DailyDataGenerator] Found ${snap.docs.length} existing patients to purge.`);

      // Batch delete in chunks of 400 (Firestore batch limit is 500)
      const docsToDelete = snap.docs;
      for (let i = 0; i < docsToDelete.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = docsToDelete.slice(i, i + 400);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      console.log("[DailyDataGenerator] Purged existing patients successfully.");
    } catch (err) {
      console.error("[DailyDataGenerator] Error purging old patients:", err);
    }
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
  // We create 5-8 visits per past day with realistic Cash/UPI distributions
  // and recurring phone numbers to generate genuine New vs Old patient data!
  for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
    const targetDate = new Date(todayStart);
    targetDate.setDate(targetDate.getDate() - dayOffset);

    // Number of visits on this past day
    const visitsCount = 5 + (dayOffset % 3); // 5 to 7 visits per day

    for (let v = 0; v < visitsCount; v++) {
      // Pick patient template (cycling through to create returning patients)
      const tmplIndex = (v * 2 + dayOffset) % MOCK_PATIENT_TEMPLATES.length;
      const tmpl = MOCK_PATIENT_TEMPLATES[tmplIndex];

      const visitHour = 9 + Math.floor((v / visitsCount) * 8); // 9 AM to 5 PM
      const visitMinute = (v * 17) % 60;
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
  // B. TODAY'S COMPLETED PATIENTS (Treated Earlier Today)
  // ─────────────────────────────────────────────────────────────
  const completedTodayCount = 4;
  for (let c = 0; c < completedTodayCount; c++) {
    const tmpl = MOCK_PATIENT_TEMPLATES[c];
    const visitHour = 9 + Math.floor(c * 0.75); // 9:00, 9:45, 10:30, 11:15
    const visitMinute = (c * 25) % 60;
    const visitTime = new Date(todayStart);
    visitTime.setHours(visitHour, visitMinute, 0, 0);

    const isUPI = c % 2 === 0;
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
      appointmentType: c === 0 ? "Follow-up" : "General Consultation",
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
  }

  // ─────────────────────────────────────────────────────────────
  // C. TODAY'S ACTIVE PATIENT IN CONSULTATION / CALLED
  // ─────────────────────────────────────────────────────────────
  const inConsultTmpl = MOCK_PATIENT_TEMPLATES[4];
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
    appointmentType: "General Consultation",
    appointmentDate: todayStart.toISOString().split("T")[0],
    appointmentTime: inConsultTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    timestamp: Timestamp.fromDate(inConsultTime),
    createdAt: Timestamp.fromDate(inConsultTime),
    calledAt: Timestamp.fromDate(inConsultTime),
    vitals: {
      bp: "126/82",
      pulse: "76",
      temp: "98.5°F",
      spo2: "99%",
    },
  });

  // ─────────────────────────────────────────────────────────────
  // D. TODAY'S WAITING QUEUE PATIENTS (Waiting to be called right now)
  // ─────────────────────────────────────────────────────────────
  const waitingPatients = [
    MOCK_PATIENT_TEMPLATES[5],
    MOCK_PATIENT_TEMPLATES[6],
    MOCK_PATIENT_TEMPLATES[7],
    MOCK_PATIENT_TEMPLATES[8],
  ];

  waitingPatients.forEach((tmpl, idx) => {
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
      appointmentType: idx % 2 === 0 ? "General Consultation" : "Routine Checkup",
      appointmentDate: todayStart.toISOString().split("T")[0],
      appointmentTime: queueTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      timestamp: Timestamp.fromDate(queueTime),
      createdAt: Timestamp.fromDate(queueTime),
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E. TODAY'S SCHEDULED APPOINTMENTS (For Afternoon/Evening Today)
  // ─────────────────────────────────────────────────────────────
  const scheduledPatients = [
    { tmpl: MOCK_PATIENT_TEMPLATES[9], time: "02:30 PM", hour: 14, min: 30, type: "Follow-up" },
    { tmpl: MOCK_PATIENT_TEMPLATES[10], time: "03:15 PM", hour: 15, min: 15, type: "General Consultation" },
    { tmpl: MOCK_PATIENT_TEMPLATES[11], time: "04:00 PM", hour: 16, min: 0, type: "Report Review" },
    { tmpl: MOCK_PATIENT_TEMPLATES[12], time: "04:45 PM", hour: 16, min: 45, type: "General Consultation" },
  ];

  scheduledPatients.forEach(({ tmpl, time, hour, min, type }) => {
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
  console.log(`[DailyDataGenerator] Writing ${patientsToInsert.length} patient records to Firestore...`);

  for (let i = 0; i < patientsToInsert.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = patientsToInsert.slice(i, i + 400);
    chunk.forEach((pData) => {
      const newRef = doc(collection(db, "patients"));
      batch.set(newRef, pData);
    });
    await batch.commit();
  }

  console.log(`[DailyDataGenerator] Successfully committed ${patientsToInsert.length} documents!`);
  return { count: patientsToInsert.length };
}

/**
 * Checks whether the clinic needs a new daily rollover.
 * If the latest patient in Firestore is from before today (or if patient list is empty),
 * it seamlessly generates fresh live data for TODAY so that the app always has live data every day!
 */
export async function checkAndAutoRollOverDaily(
  clinicId: string,
  doctorInfo: SeedDoctorInfo,
  receptionistInfo?: SeedReceptionistInfo,
  currentPatients: Patient[] = []
): Promise<boolean> {
  if (!clinicId) return false;

  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Check if any patient in the current list was created or visited today
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

  if (!hasTodayPatient) {
    console.log(`[DailyDataGenerator] No patients found for today (${todayStr}). Auto-rolling over daily live data...`);
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
