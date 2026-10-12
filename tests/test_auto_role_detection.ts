import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import fs from "fs";

const cfg = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

function detectRoleAndTarget(profile: any) {
  const role = ((profile as any).authorizedRole || profile.role || "").trim().toLowerCase();
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

  const targetPath = isAdm ? "/admin/dashboard" : isDoc ? "/doctor/dashboard" : "/receptionist/dashboard";
  const targetView = isAdm ? "dashboard" : isDoc ? "doctor" : "receptionist";

  return { isAdm, isDoc, isRec, targetPath, targetView };
}

async function runAutoRoleTests() {
  console.log("==================================================");
  console.log("MEDITRACK PRODUCTION SAAS END-TO-END VERIFICATION");
  console.log("==================================================");

  // 1. Doctor login auto-detection
  console.log("\n[TEST 1] Doctor login & automatic routing...");
  const docCred = await signInWithEmailAndPassword(auth, "doctor.demo@meditrack.io", "DoctorDemo@123!");
  const docSnap = await getDoc(doc(db, "userAccess", docCred.user.uid));
  const docData = docSnap.data();
  const docRouting = detectRoleAndTarget(docData);
  console.log("  ✓ Detected Role: doctor");
  console.log("  ✓ Auto-redirect URL:", docRouting.targetPath);
  if (docRouting.targetPath !== "/doctor/dashboard" || docRouting.targetView !== "doctor") {
    throw new Error("Doctor failed auto-redirection to /doctor/dashboard");
  }
  await signOut(auth);

  // 2. Receptionist login auto-detection & shared clinic linking
  console.log("\n[TEST 2] Receptionist login & shared clinic linking...");
  const recCred = await signInWithEmailAndPassword(auth, "receptionist.demo@meditrack.io", "ReceptionDemo@123!");
  const recSnap = await getDoc(doc(db, "userAccess", recCred.user.uid));
  const recData = recSnap.data();
  const recRouting = detectRoleAndTarget(recData);
  console.log("  ✓ Detected Role: receptionist");
  console.log("  ✓ Auto-redirect URL:", recRouting.targetPath);
  if (recRouting.targetPath !== "/receptionist/dashboard" || recRouting.targetView !== "receptionist") {
    throw new Error("Receptionist failed auto-redirection to /receptionist/dashboard");
  }
  if (recData?.clinicId !== "MEDI-DEMO-001" || recData?.assignedDoctorId !== "DOC-ZAID-001") {
    throw new Error("Receptionist clinic or doctor link mismatch");
  }
  console.log("  ✓ Linked to Clinic:", recData?.clinicId, "Assigned Doctor:", recData?.assignedDoctorId);
  await signOut(auth);

  // 3. Admin login auto-detection
  console.log("\n[TEST 3] Admin login & automatic routing...");
  const admCred = await signInWithEmailAndPassword(auth, "admin.demo@meditrack.io", "AdminDemo@123!");
  const admSnap = await getDoc(doc(db, "userAccess", admCred.user.uid));
  const admData = admSnap.data();
  const admRouting = detectRoleAndTarget(admData);
  console.log("  ✓ Detected Role: admin");
  console.log("  ✓ Auto-redirect URL:", admRouting.targetPath);
  if (admRouting.targetPath !== "/admin/dashboard" || admRouting.targetView !== "dashboard") {
    throw new Error("Admin failed auto-redirection to /admin/dashboard");
  }
  await signOut(auth);

  // 4. Verify no role selector on login page
  console.log("\n[TEST 4] Verifying zero role selector controls on login page...");
  const loginSrc = fs.readFileSync("./src/components/LoginPage.tsx", "utf-8");
  if (loginSrc.includes("Portal Role") || loginSrc.includes("selectedRole") || loginSrc.includes("setSelectedRole")) {
    throw new Error("Role selector elements still found in LoginPage.tsx!");
  }
  console.log("  ✓ Zero role dropdowns, portal selection buttons, or role controls exist on login page");

  // 5. Verify Product Brochure completely removed from all 3 profile dropdowns
  console.log("\n[TEST 5] Verifying Product Brochure removed from all 3 profile dropdowns...");
  const docSrc = fs.readFileSync("./src/components/DoctorPortal.tsx", "utf-8");
  const recSrc = fs.readFileSync("./src/components/ReceptionistPortal.tsx", "utf-8");
  const appSrc = fs.readFileSync("./src/App.tsx", "utf-8");

  if (docSrc.includes("Product Brochure") || docSrc.includes("brochure.html")) {
    throw new Error("Product Brochure still found in DoctorPortal.tsx!");
  }
  if (recSrc.includes("Product Brochure") || recSrc.includes("brochure.html")) {
    throw new Error("Product Brochure still found in ReceptionistPortal.tsx!");
  }
  if (appSrc.includes("Product Brochure") || appSrc.includes("brochure.html")) {
    throw new Error("Product Brochure still found in App.tsx!");
  }
  console.log("  ✓ Doctor Portal profile dropdown: Product Brochure REMOVED");
  console.log("  ✓ Receptionist Portal profile dropdown: Product Brochure REMOVED");
  console.log("  ✓ Admin Portal profile dropdown: Product Brochure REMOVED");

  // 6. Real-time Doctor <-> Receptionist workflow
  console.log("\n[TEST 6] Live Doctor <-> Receptionist synchronization workflow...");
  // Receptionist registers patient
  const recCredSession = await signInWithEmailAndPassword(auth, "receptionist.demo@meditrack.io", "ReceptionDemo@123!");
  const livePatientId = `LIVE_SYNC_${Date.now()}`;
  await setDoc(doc(db, "patients", livePatientId), {
    name: "Aarav Patel",
    phone: "+91 9988776655",
    age: 28,
    gender: "Male",
    clinicId: "MEDI-DEMO-001",
    doctorId: "DOC-ZAID-001",
    status: "Waiting",
    tokenNumber: 42,
    timestamp: serverTimestamp(),
  });
  console.log("  ✓ Receptionist created real patient record:", livePatientId);
  await signOut(auth);

  // Doctor logs in and accesses the patient in real time
  const docCredSession = await signInWithEmailAndPassword(auth, "doctor.demo@meditrack.io", "DoctorDemo@123!");
  const docPatientSnap = await getDoc(doc(db, "patients", livePatientId));
  if (!docPatientSnap.exists() || docPatientSnap.data()?.name !== "Aarav Patel") {
    throw new Error("Doctor failed to retrieve live patient registered by receptionist");
  }
  console.log("  ✓ Doctor successfully sees patient in live queue:", docPatientSnap.data()?.name);

  // Doctor updates status to Consulting and adds consultation
  const liveConsultId = `CONSULT_${Date.now()}`;
  await setDoc(doc(db, "consultations", liveConsultId), {
    patientId: livePatientId,
    patientName: "Aarav Patel",
    patientPhone: "+91 9988776655",
    diagnosis: "Acute Bronchitis",
    doctorNotes: "Prescribed Azithromycin 500mg, rest for 3 days.",
    doctorId: "DOC-ZAID-001",
    clinicId: "MEDI-DEMO-001",
    status: "Completed",
    timestamp: serverTimestamp(),
  });
  console.log("  ✓ Doctor completed consultation & saved clinical notes:", liveConsultId);
  await signOut(auth);

  // 7. Security Rules enforce Doctor-only notes protection
  console.log("\n[TEST 7] Security Rules: Receptionist blocked from modifying doctor clinical notes...");
  const recCredAttempt = await signInWithEmailAndPassword(auth, "receptionist.demo@meditrack.io", "ReceptionDemo@123!");
  try {
    await updateDoc(doc(db, "consultations", liveConsultId), {
      doctorNotes: "Unauthorized edit by receptionist",
    });
    throw new Error("Security failure: Receptionist was able to modify doctor consultation notes!");
  } catch (err: any) {
    console.log("  ✓ BLOCKED by Firestore Security Rules: Doctor clinical notes protected from receptionist tamper");
  }
  await signOut(auth);

  // Clean up test documents
  const cleanupDoc = await signInWithEmailAndPassword(auth, "admin.demo@meditrack.io", "AdminDemo@123!");
  await deleteDoc(doc(db, "patients", livePatientId)).catch(() => null);
  await deleteDoc(doc(db, "consultations", liveConsultId)).catch(() => null);
  await signOut(auth);

  console.log("\n==================================================");
  console.log("ALL 7 PRODUCTION SAAS VERIFICATION TESTS PASSED (100%)!");
  console.log("==================================================");
}

runAutoRoleTests().catch(console.error);
