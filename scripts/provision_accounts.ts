import fs from "fs";

const cfg = JSON.parse(fs.readFileSync("C:\\Users\\zaidj\\.config\\configstore\\firebase-tools.json", "utf-8"));
const token = cfg.tokens?.access_token;
const PROJECT = "meditrack-d03cb";

// Accounts to provision
const accounts = [
  {
    uid: "4KNLRJhXQ1SYjxN2RkkG9y5YZgE2",
    email: "drzaid@meditrack.io",
    displayName: "Dr. Zaid",
    role: "doctor",
    authorizedRole: "doctor",
    clinicId: "MT0001",
    clinicName: "MedPlus HealthCare",
    doctorId: "DOC-ZAID-001",
    receptionistId: "REC-JUNAID-001",
    doctorEmail: "drzaid@meditrack.io",
    receptionistEmail: "junaidreceptionist@meditrack.io",
    category: "GP",
    specialty: "General Practitioner",
    registeredPhoneNumber: "+919108200414",
    phoneVerified: false,
    initialVerificationCompleted: false,
    accountStatus: "active"
  },
  {
    uid: "a8iA7o5bFtNgY2OsDjMUgspFSbt2",
    email: "junaidreceptionist@meditrack.io",
    displayName: "Junaid (Reception)",
    role: "receptionist",
    authorizedRole: "receptionist",
    clinicId: "MT0001",
    clinicName: "MedPlus HealthCare",
    receptionistId: "REC-JUNAID-001",
    doctorId: "DOC-ZAID-001",
    assignedDoctorId: "DOC-ZAID-001",
    assignedDoctorEmail: "drzaid@meditrack.io",
    assignedDoctorName: "Dr. Zaid",
    doctorEmail: "drzaid@meditrack.io",
    receptionistEmail: "junaidreceptionist@meditrack.io",
    registeredPhoneNumber: "+918618912871",
    phoneVerified: false,
    initialVerificationCompleted: false,
    accountStatus: "active"
  }
];

function toFirestoreFields(obj: any) {
  const fields: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === "boolean") {
      fields[k] = { booleanValue: v };
    } else if (typeof v === "number") {
      fields[k] = { integerValue: String(v) };
    } else if (typeof v === "string") {
      fields[k] = { stringValue: v };
    } else if (v instanceof Date) {
      fields[k] = { timestampValue: v.toISOString() };
    }
  }
  return fields;
}

async function writeDoc(collection: string, docId: string, data: any) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${docId}`;
  const now = new Date().toISOString();
  const payload = {
    fields: {
      ...toFirestoreFields(data),
      createdAt: { timestampValue: now },
      updatedAt: { timestampValue: now }
    }
  };

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const resData = await res.json();
  if (!res.ok) {
    console.error(`Error writing ${collection}/${docId}:`, resData);
  } else {
    console.log(`Successfully wrote ${collection}/${docId}`);
  }
}

async function provision() {
  console.log("Starting backend provisioning of authorized MediTrack accounts...");
  for (const acc of accounts) {
    // 1. Write to userAccess by UID
    await writeDoc("userAccess", acc.uid, acc);

    // 2. Write to authorizedAccounts by email for pre-authorization lookup
    const emailKey = acc.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    await writeDoc("authorizedAccounts", emailKey, acc);

    // 3. Write / update users/{uid} for application UI compatibility
    const userDocData = {
      uid: acc.uid,
      email: acc.email,
      displayName: acc.displayName,
      role: acc.role,
      status: "active",
      clinicId: acc.clinicId,
      clinicName: acc.clinicName,
      doctorId: acc.doctorId,
      receptionistId: acc.receptionistId,
      assignedDoctorId: acc.assignedDoctorId || acc.doctorId,
      assignedDoctorEmail: acc.assignedDoctorEmail || acc.doctorEmail,
      assignedDoctorName: acc.displayName === "Dr. Zaid" ? "Dr. Zaid" : "Dr. Zaid",
      category: acc.category || "GP",
      specialty: acc.specialty || (acc.role === "doctor" ? "General Practitioner" : ""),
      contactNumber: acc.registeredPhoneNumber,
      registeredPhoneNumber: acc.registeredPhoneNumber,
      phoneVerified: acc.phoneVerified,
      initialVerificationCompleted: acc.initialVerificationCompleted,
      accountStatus: acc.accountStatus,
      photoURL: `/assets/admin_doctor_avatar.png`
    };
    await writeDoc("users", acc.uid, userDocData);

    // 4. Create doctorReceptionistMappings & clinic_assignments
    const mappingId = `${acc.clinicId}_DOC_ZAID_001_REC_JUNAID_001`;
    await writeDoc("doctorReceptionistMappings", mappingId, {
      clinicId: "MT0001",
      doctorId: "DOC-ZAID-001",
      doctorEmail: "drzaid@meditrack.io",
      doctorName: "Dr. Zaid",
      receptionistId: "REC-JUNAID-001",
      receptionistEmail: "junaidreceptionist@meditrack.io",
      receptionistName: "Junaid",
      doctorCategory: "GP",
      active: true
    });

    const assignmentId = `MT0001_4KNLRJhXQ1SYjxN2RkkG9y5YZgE2_a8iA7o5bFtNgY2OsDjMUgspFSbt2`;
    await writeDoc("clinic_assignments", assignmentId, {
      clinicId: "MT0001",
      doctorId: "DOC-ZAID-001",
      doctorUid: "4KNLRJhXQ1SYjxN2RkkG9y5YZgE2",
      doctorEmail: "drzaid@meditrack.io",
      doctorName: "Dr. Zaid",
      receptionistId: "REC-JUNAID-001",
      receptionistUid: "a8iA7o5bFtNgY2OsDjMUgspFSbt2",
      receptionistEmail: "junaidreceptionist@meditrack.io",
      receptionistName: "Junaid",
      status: "active"
    });
  }

  // Also ensure clinic MT0001 has both linked
  await writeDoc("clinics", "MT0001", {
    clinicId: "MT0001",
    name: "MedPlus HealthCare",
    address: "MedPlus HealthCare Clinic, Main Boulevard",
    primaryDoctorId: "DOC-ZAID-001",
    primaryDoctorEmail: "drzaid@meditrack.io",
    primaryReceptionistId: "REC-JUNAID-001",
    primaryReceptionistEmail: "junaidreceptionist@meditrack.io"
  });

  console.log("Backend provisioning complete!");
}

provision().catch(console.error);
