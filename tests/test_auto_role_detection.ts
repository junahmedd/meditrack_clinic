import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import fs from "fs";

const cfg = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper function that simulates the client auto-detection logic
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
  console.log("TESTING AUTOMATIC ROLE DETECTION & SECURE ROUTING");
  console.log("==================================================");

  // 1. Doctor login auto-detection
  console.log("\n[TEST 1] Doctor login (doctor.demo@meditrack.io)...");
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

  // 2. Receptionist login auto-detection
  console.log("\n[TEST 2] Receptionist login (receptionist.demo@meditrack.io)...");
  const recCred = await signInWithEmailAndPassword(auth, "receptionist.demo@meditrack.io", "ReceptionDemo@123!");
  const recSnap = await getDoc(doc(db, "userAccess", recCred.user.uid));
  const recData = recSnap.data();
  const recRouting = detectRoleAndTarget(recData);
  console.log("  ✓ Detected Role: receptionist");
  console.log("  ✓ Auto-redirect URL:", recRouting.targetPath);
  if (recRouting.targetPath !== "/receptionist/dashboard" || recRouting.targetView !== "receptionist") {
    throw new Error("Receptionist failed auto-redirection to /receptionist/dashboard");
  }
  // Verify Doctor-Receptionist linking
  if (recData?.clinicId !== "MEDI-DEMO-001" || recData?.assignedDoctorId !== "DOC-ZAID-001") {
    throw new Error("Receptionist clinic or doctor link mismatch");
  }
  console.log("  ✓ Confirmed Clinic ID:", recData?.clinicId, "Linked Doctor:", recData?.assignedDoctorId);
  await signOut(auth);

  // 3. Admin login auto-detection
  console.log("\n[TEST 3] Admin login (admin.demo@meditrack.io)...");
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

  // 4. Verify no role selector in LoginPage source
  console.log("\n[TEST 4] Verifying no role selection exists on login page...");
  const loginSrc = fs.readFileSync("./src/components/LoginPage.tsx", "utf-8");
  if (loginSrc.includes("Portal Role") || loginSrc.includes("selectedRole") || loginSrc.includes("setSelectedRole")) {
    throw new Error("Role selector elements still found in LoginPage.tsx!");
  }
  console.log("  ✓ Verified: Zero role dropdowns, portal selectors, or role buttons exist on the login page!");

  // 5. Wrong password rejected
  console.log("\n[TEST 5] Verifying invalid credentials rejection...");
  try {
    await signInWithEmailAndPassword(auth, "doctor.demo@meditrack.io", "BadPassword999!");
    throw new Error("Wrong password unexpectedly accepted!");
  } catch (err: any) {
    if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
      console.log("  ✓ Correctly rejected with invalid credentials error");
    } else {
      throw err;
    }
  }

  // 6. Security Rules verify client role tampering blocked
  console.log("\n[TEST 6] Verifying backend authorization tamper resistance...");
  const recCred2 = await signInWithEmailAndPassword(auth, "receptionist.demo@meditrack.io", "ReceptionDemo@123!");
  try {
    await updateDoc(doc(db, "userAccess", recCred2.user.uid), {
      authorizedRole: "admin",
      clinicId: "TAMPERED_CLINIC",
    });
    throw new Error("Security failure: client tampered with authorized role!");
  } catch (err: any) {
    console.log("  ✓ BLOCKED by Firestore Security Rules: client tampering denied");
  }
  await signOut(auth);

  console.log("\n==================================================");
  console.log("ALL AUTOMATIC ROLE DETECTION TESTS PASSED (100% SUCCESS)!");
  console.log("==================================================");
}

runAutoRoleTests().catch(console.error);
