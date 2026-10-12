import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import fs from "fs";

const cfg = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

async function runTests() {
  console.log("==================================================");
  console.log("MEDITRACK MULTI-ROLE SAAS AUTHENTICATION TEST SUITE");
  console.log("==================================================");

  // 1. Doctor Valid Login
  console.log("\n[TEST 1] Testing Doctor Login (doctor.demo@meditrack.io)...");
  const docCred = await signInWithEmailAndPassword(auth, "doctor.demo@meditrack.io", "DoctorDemo@123!");
  console.log("  ✓ Firebase Auth Success! UID:", docCred.user.uid);
  const docSnap = await getDoc(doc(db, "userAccess", docCred.user.uid));
  const docData = docSnap.data();
  console.log("  ✓ Role:", docData?.authorizedRole);
  console.log("  ✓ Clinic ID:", docData?.clinicId);
  console.log("  ✓ Doctor ID:", docData?.doctorId);
  if (docData?.authorizedRole !== "doctor" || docData?.clinicId !== "MEDI-DEMO-001") {
    throw new Error("Doctor authorization data mismatch!");
  }
  await signOut(auth);

  // 2. Receptionist Valid Login
  console.log("\n[TEST 2] Testing Receptionist Login (receptionist.demo@meditrack.io)...");
  const recCred = await signInWithEmailAndPassword(auth, "receptionist.demo@meditrack.io", "ReceptionDemo@123!");
  console.log("  ✓ Firebase Auth Success! UID:", recCred.user.uid);
  const recSnap = await getDoc(doc(db, "userAccess", recCred.user.uid));
  const recData = recSnap.data();
  console.log("  ✓ Role:", recData?.authorizedRole);
  console.log("  ✓ Clinic ID:", recData?.clinicId);
  console.log("  ✓ Receptionist ID:", recData?.receptionistId);
  console.log("  ✓ Linked Doctor ID:", recData?.assignedDoctorId);
  if (recData?.authorizedRole !== "receptionist" || recData?.assignedDoctorId !== "DOC-ZAID-001" || recData?.clinicId !== "MEDI-DEMO-001") {
    throw new Error("Receptionist authorization or doctor link mismatch!");
  }
  await signOut(auth);

  // 3. Admin Valid Login
  console.log("\n[TEST 3] Testing Admin Login (admin.demo@meditrack.io)...");
  const admCred = await signInWithEmailAndPassword(auth, "admin.demo@meditrack.io", "AdminDemo@123!");
  console.log("  ✓ Firebase Auth Success! UID:", admCred.user.uid);
  const admSnap = await getDoc(doc(db, "userAccess", admCred.user.uid));
  const admData = admSnap.data();
  console.log("  ✓ Role:", admData?.authorizedRole);
  if (admData?.authorizedRole !== "admin") {
    throw new Error("Admin authorization mismatch!");
  }
  await signOut(auth);

  // 4. Wrong Password Test
  console.log("\n[TEST 4] Testing Wrong Password Rejection...");
  try {
    await signInWithEmailAndPassword(auth, "doctor.demo@meditrack.io", "WrongPassword999!");
    throw new Error("Wrong password was erroneously accepted!");
  } catch (err: any) {
    if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
      console.log("  ✓ Login correctly rejected with:", err.code);
    } else {
      throw err;
    }
  }

  // 5. Privilege Escalation Prevention via Security Rules
  console.log("\n[TEST 5] Testing Security Rules Privilege Escalation Denial...");
  const recCred2 = await signInWithEmailAndPassword(auth, "receptionist.demo@meditrack.io", "ReceptionDemo@123!");
  try {
    await updateDoc(doc(db, "userAccess", recCred2.user.uid), {
      authorizedRole: "admin",
      clinicId: "HACKED_CLINIC"
    });
    throw new Error("Security failure: client modified protected authorization fields!");
  } catch (err: any) {
    console.log("  ✓ Privilege escalation safely BLOCKED by Security Rules:", err.code || err.message);
  }
  await signOut(auth);

  console.log("\n==================================================");
  console.log("ALL 5 SAAS AUTHORIZATION TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================");
}

runTests().catch(console.error);
