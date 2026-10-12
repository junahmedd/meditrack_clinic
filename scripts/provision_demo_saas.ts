import fs from "fs";

const appCfg = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const API_KEY = appCfg.apiKey;
const PROJECT = appCfg.projectId || "meditrack-d03cb";

// Read refreshed access token from firebase-tools.json
const fbCfg = JSON.parse(fs.readFileSync("C:\\Users\\zaidj\\.config\\configstore\\firebase-tools.json", "utf-8"));
const token = fbCfg.tokens?.access_token;

const demoUsers = [
  {
    email: "doctor.demo@meditrack.io",
    password: "DoctorDemo@123!",
    displayName: "Dr. Zaid",
    role: "doctor",
    clinicId: "MEDI-DEMO-001",
    clinicName: "MediTrack Central Clinic",
    doctorId: "DOC-ZAID-001",
    receptionistId: "REC-JUNAID-001",
    doctorEmail: "doctor.demo@meditrack.io",
    receptionistEmail: "receptionist.demo@meditrack.io",
    assignedDoctorId: "DOC-ZAID-001",
    category: "GP",
    specialty: "General Practitioner",
    accountStatus: "active"
  },
  {
    email: "receptionist.demo@meditrack.io",
    password: "ReceptionDemo@123!",
    displayName: "Junaid (Reception)",
    role: "receptionist",
    clinicId: "MEDI-DEMO-001",
    clinicName: "MediTrack Central Clinic",
    receptionistId: "REC-JUNAID-001",
    doctorId: "DOC-ZAID-001",
    assignedDoctorId: "DOC-ZAID-001",
    assignedDoctorEmail: "doctor.demo@meditrack.io",
    assignedDoctorName: "Dr. Zaid",
    doctorEmail: "doctor.demo@meditrack.io",
    receptionistEmail: "receptionist.demo@meditrack.io",
    category: "GP",
    specialty: "Front Desk & Triage",
    accountStatus: "active"
  },
  {
    email: "admin.demo@meditrack.io",
    password: "AdminDemo@123!",
    displayName: "MediTrack Administrator",
    role: "admin",
    clinicId: "MEDI-DEMO-001",
    clinicName: "MediTrack Central Clinic",
    accountStatus: "active"
  },
  // Also preserve existing drzaid & junaidreceptionist
  {
    email: "drzaid@meditrack.io",
    password: "Password123!",
    displayName: "Dr. Zaid",
    role: "doctor",
    clinicId: "MT0001",
    clinicName: "MedPlus HealthCare",
    doctorId: "DOC-ZAID-001",
    receptionistId: "REC-JUNAID-001",
    doctorEmail: "drzaid@meditrack.io",
    receptionistEmail: "junaidreceptionist@meditrack.io",
    assignedDoctorId: "DOC-ZAID-001",
    category: "GP",
    specialty: "General Practitioner",
    accountStatus: "active"
  },
  {
    email: "junaidreceptionist@meditrack.io",
    password: "Password123!",
    displayName: "Junaid (Reception)",
    role: "receptionist",
    clinicId: "MT0001",
    clinicName: "MedPlus HealthCare",
    receptionistId: "REC-JUNAID-001",
    doctorId: "DOC-ZAID-001",
    assignedDoctorId: "DOC-ZAID-001",
    assignedDoctorEmail: "drzaid@meditrack.io",
    assignedDoctorName: "Dr. Zaid",
    doctorEmail: "drzaid@meditrack.io",
    receptionistEmail: "junaidreceptionist@meditrack.io",
    category: "GP",
    specialty: "Front Desk & Triage",
    accountStatus: "active"
  }
];

async function createOrUpdateAuthUser(user: typeof demoUsers[0]) {
  console.log(`\nProvisioning Auth user: ${user.email}...`);
  // Try signUp
  const signupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
  const signupRes = await fetch(signupUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      returnSecureToken: true
    })
  });

  const signupData = await signupRes.json();
  if (signupRes.ok && signupData.localId) {
    console.log(`✓ Created new Firebase Auth account! UID: ${signupData.localId}`);
    return signupData.localId;
  }

  if (signupData.error?.message?.includes("EMAIL_EXISTS")) {
    console.log(`User ${user.email} already exists. Signing in to retrieve UID and update password...`);
    const signinUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
    const signinRes = await fetch(signinUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        returnSecureToken: true
      })
    });
    const signinData = await signinRes.json();
    if (signinRes.ok && signinData.localId) {
      console.log(`✓ Signed in existing user. UID: ${signinData.localId}`);
      return signinData.localId;
    }

    // If password was different, update via Google Cloud Identity Toolkit using OAuth token
    console.log(`Resetting password with Google Identity Toolkit Admin API...`);
    const adminLookupUrl = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`;
    const lookupRes = await fetch(adminLookupUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: [user.email] })
    });
    const lookupData = await lookupRes.json();
    const existingUid = lookupData.users?.[0]?.localId;
    if (existingUid) {
      // Update password
      const updateUrl = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`;
      const updateRes = await fetch(updateUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          localId: existingUid,
          password: user.password,
          displayName: user.displayName
        })
      });
      const updateData = await updateRes.json();
      console.log(`✓ Updated password for existing user UID: ${existingUid}`);
      return existingUid;
    }
  }

  throw new Error(`Failed to create/update auth user: ${JSON.stringify(signupData)}`);
}

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

async function run() {
  console.log("==================================================");
  console.log("PROVISIONING MEDITRACK DEMO SAAS ACCOUNTS");
  console.log("==================================================");

  for (const u of demoUsers) {
    const uid = await createOrUpdateAuthUser(u);

    const docRecord = {
      uid,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      authorizedRole: u.role,
      clinicId: u.clinicId,
      clinicName: u.clinicName,
      doctorId: u.doctorId || null,
      receptionistId: u.receptionistId || null,
      assignedDoctorId: u.assignedDoctorId || u.doctorId || null,
      assignedDoctorEmail: u.assignedDoctorEmail || u.doctorEmail || null,
      assignedDoctorName: u.assignedDoctorName || null,
      doctorEmail: u.doctorEmail || null,
      receptionistEmail: u.receptionistEmail || null,
      category: u.category || null,
      specialty: u.specialty || null,
      phoneVerified: true,
      initialVerificationCompleted: true,
      accountStatus: "active",
      status: "active",
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=064e3b&color=fff`
    };

    // 1. userAccess collection (checked by Firestore rules and auth guard)
    await writeDoc("userAccess", uid, docRecord);

    // 2. users collection (application user state)
    await writeDoc("users", uid, docRecord);

    // 3. authorizedAccounts collection
    const emailKey = u.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    await writeDoc("authorizedAccounts", emailKey, docRecord);
  }

  // Provision Clinic MEDI-DEMO-001
  await writeDoc("clinics", "MEDI-DEMO-001", {
    clinicId: "MEDI-DEMO-001",
    name: "MediTrack Central Clinic",
    address: "742 Healthcare Ave, Medical District",
    phone: "+91 9876543210",
    email: "clinic@meditrack.io",
    primaryDoctorId: "DOC-ZAID-001",
    primaryDoctorEmail: "doctor.demo@meditrack.io",
    primaryReceptionistId: "REC-JUNAID-001",
    primaryReceptionistEmail: "receptionist.demo@meditrack.io",
    status: "active"
  });

  // Doctor Receptionist mapping for MEDI-DEMO-001
  await writeDoc("doctorReceptionistMappings", "MEDI_DEMO_001_DOC_ZAID_001_REC_JUNAID_001", {
    clinicId: "MEDI-DEMO-001",
    doctorId: "DOC-ZAID-001",
    doctorEmail: "doctor.demo@meditrack.io",
    doctorName: "Dr. Zaid",
    receptionistId: "REC-JUNAID-001",
    receptionistEmail: "receptionist.demo@meditrack.io",
    receptionistName: "Junaid (Reception)",
    doctorCategory: "GP",
    active: true
  });

  console.log("\n==================================================");
  console.log("PROVISIONING COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
}

run().catch(console.error);
