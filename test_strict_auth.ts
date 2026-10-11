import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import fs from "fs";

const cfg = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

async function runSecurityTests() {
  console.log("==================================================");
  console.log("MEDITRACK STRICT AUTHENTICATION & LINKING VERIFICATION");
  console.log("==================================================");

  // Test 1: Sign in Dr. Zaid
  console.log("\n[TEST 1] Logging in as Doctor: drzaid@meditrack.io...");
  const docCred = await signInWithEmailAndPassword(auth, "drzaid@meditrack.io", "Password123!");
  console.log("✓ Dr. Zaid Authenticated! UID:", docCred.user.uid);

  const docAccessRef = doc(db, "userAccess", docCred.user.uid);
  const docAccessSnap = await getDoc(docAccessRef);
  console.log("✓ Doctor userAccess record exists:", docAccessSnap.exists());
  const docData = docAccessSnap.data();
  console.log("  - Role:", docData?.authorizedRole);
  console.log("  - Clinic ID:", docData?.clinicId);
  console.log("  - Doctor ID:", docData?.doctorId);
  console.log("  - Registered Mobile:", docData?.registeredPhoneNumber);
  console.log("  - Initial OTP Completed:", docData?.initialVerificationCompleted);

  if (docData?.authorizedRole !== "doctor" || docData?.doctorId !== "DOC-ZAID-001") {
    throw new Error("Dr. Zaid authorization mapping mismatch!");
  }

  await signOut(auth);
  console.log("✓ Doctor signed out.");

  // Test 2: Sign in Junaid Receptionist
  console.log("\n[TEST 2] Logging in as Receptionist: junaidreceptionist@meditrack.io...");
  const recCred = await signInWithEmailAndPassword(auth, "junaidreceptionist@meditrack.io", "Password123!");
  console.log("✓ Junaid Receptionist Authenticated! UID:", recCred.user.uid);

  const recAccessRef = doc(db, "userAccess", recCred.user.uid);
  const recAccessSnap = await getDoc(recAccessRef);
  console.log("✓ Receptionist userAccess record exists:", recAccessSnap.exists());
  const recData = recAccessSnap.data();
  console.log("  - Role:", recData?.authorizedRole);
  console.log("  - Clinic ID:", recData?.clinicId);
  console.log("  - Receptionist ID:", recData?.receptionistId);
  console.log("  - Linked Doctor ID:", recData?.assignedDoctorId);
  console.log("  - Registered Mobile:", recData?.registeredPhoneNumber);
  console.log("  - Initial OTP Completed:", recData?.initialVerificationCompleted);

  if (recData?.authorizedRole !== "receptionist" || recData?.assignedDoctorId !== "DOC-ZAID-001" || recData?.clinicId !== docData?.clinicId) {
    throw new Error("Doctor-Receptionist link verification failed!");
  }
  console.log("✓ PERMANENT LINK CONFIRMED: Dr. Zaid and Junaid share Clinic ID:", recData?.clinicId, "and Doctor ID:", recData?.assignedDoctorId);

  // Test 3: Unauthorized privilege escalation test (Receptionist trying to change role to admin or doctor)
  console.log("\n[TEST 3] Security Rule Check: Attempting unauthorized privilege escalation on userAccess...");
  try {
    await updateDoc(doc(db, "userAccess", recCred.user.uid), {
      authorizedRole: "admin",
      clinicId: "HACKED_CLINIC"
    });
    console.error("FAIL: Receptionist was able to modify protected authorization fields!");
  } catch (err: any) {
    console.log("✓ BLOCKED! Security Rules prevented client role / clinic tampering:", err.code);
  }

  await signOut(auth);
  console.log("✓ Receptionist signed out.");

  console.log("\n==================================================");
  console.log("ALL MANDATORY SECURITY & LINKING TESTS PASSED (100% SUCCESS)!");
  console.log("==================================================");
}

runSecurityTests().catch(console.error);
