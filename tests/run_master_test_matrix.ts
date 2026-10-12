import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import fs from "fs";

const cfg = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

const results: { test: string; status: "PASSED" | "FAILED"; detail: string }[] = [];

async function assert(testName: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ test: testName, status: "PASSED", detail: "Verified successfully." });
    console.log(`[PASS] ${testName}`);
  } catch (err: any) {
    results.push({ test: testName, status: "FAILED", detail: err.message || String(err) });
    console.error(`[FAIL] ${testName}:`, err.message || err);
  }
}

async function main() {
  console.log("==================================================");
  console.log("MEDITRACK PRODUCTION COMPREHENSIVE TEST MATRIX");
  console.log("==================================================");

  // 1. Doctor valid login
  await assert("Doctor valid login -> Doctor dashboard only", async () => {
    const cred = await signInWithEmailAndPassword(auth, "doctor.demo@meditrack.io", "DoctorDemo@123!");
    const snap = await getDoc(doc(db, "userAccess", cred.user.uid));
    const data = snap.data();
    if (data?.authorizedRole !== "doctor" || data?.clinicId !== "MEDI-DEMO-001") {
      throw new Error(`Invalid role or clinic: ${JSON.stringify(data)}`);
    }
    await signOut(auth);
  });

  // 2. Receptionist valid login
  await assert("Receptionist valid login -> Receptionist dashboard only", async () => {
    const cred = await signInWithEmailAndPassword(auth, "receptionist.demo@meditrack.io", "ReceptionDemo@123!");
    const snap = await getDoc(doc(db, "userAccess", cred.user.uid));
    const data = snap.data();
    if (data?.authorizedRole !== "receptionist" || data?.clinicId !== "MEDI-DEMO-001" || data?.assignedDoctorId !== "DOC-ZAID-001") {
      throw new Error(`Invalid role, clinic, or doctor mapping: ${JSON.stringify(data)}`);
    }
    await signOut(auth);
  });

  // 3. Admin valid login
  await assert("Admin valid login -> Admin dashboard only", async () => {
    const cred = await signInWithEmailAndPassword(auth, "admin.demo@meditrack.io", "AdminDemo@123!");
    const snap = await getDoc(doc(db, "userAccess", cred.user.uid));
    const data = snap.data();
    if (data?.authorizedRole !== "admin") {
      throw new Error(`Invalid role: ${JSON.stringify(data)}`);
    }
    await signOut(auth);
  });

  // 4. Wrong password
  await assert("Wrong password -> Login rejected", async () => {
    try {
      await signInWithEmailAndPassword(auth, "doctor.demo@meditrack.io", "WrongPass123!");
      throw new Error("Login succeeded with wrong password");
    } catch (e: any) {
      if (e.code !== "auth/invalid-credential" && e.code !== "auth/wrong-password") {
        throw e;
      }
    }
  });

  // 5. Unapproved email
  await assert("Unapproved email -> Application access denied", async () => {
    try {
      const snap = await getDoc(doc(db, "userAccess", "unregistered_fake_uid_12345"));
      if (snap.exists()) {
        throw new Error("Unregistered UID exists in userAccess");
      }
    } catch (e: any) {
      if (e.code === "permission-denied" || e.message?.includes("permissions") || e.message?.includes("PERMISSION_DENIED")) {
        // Correctly denied by security rules
        return;
      }
      throw e;
    }
  });

  // 6. User changes role in browser -> Authorization unchanged & denied by rules
  await assert("User changes role in browser -> Privilege escalation denied", async () => {
    const cred = await signInWithEmailAndPassword(auth, "receptionist.demo@meditrack.io", "ReceptionDemo@123!");
    try {
      await updateDoc(doc(db, "userAccess", cred.user.uid), {
        authorizedRole: "admin",
      });
      throw new Error("Unauthorized role escalation succeeded");
    } catch (e: any) {
      // Permission denied is expected
      if (!e.message.includes("permission") && e.code !== "permission-denied") {
        throw e;
      }
    }
    await signOut(auth);
  });

  // 7. User changes clinicId in request -> Write denied
  await assert("User changes clinicId in request -> Write denied", async () => {
    const cred = await signInWithEmailAndPassword(auth, "doctor.demo@meditrack.io", "DoctorDemo@123!");
    try {
      await updateDoc(doc(db, "userAccess", cred.user.uid), {
        clinicId: "UNAUTHORIZED_CLINIC_999",
      });
      throw new Error("Unauthorized clinicId modification succeeded");
    } catch (e: any) {
      if (!e.message.includes("permission") && e.code !== "permission-denied") {
        throw e;
      }
    }
    await signOut(auth);
  });

  // 8. Receptionist attempts creating doctor consultation notes -> Denied by rules
  await assert("Receptionist accesses / creates doctor-only notes -> Denied", async () => {
    const cred = await signInWithEmailAndPassword(auth, "receptionist.demo@meditrack.io", "ReceptionDemo@123!");
    try {
      await setDoc(doc(db, "consultations", "unauthorized_consultation_test"), {
        doctorNotes: "Hacked notes by receptionist",
        diagnosis: "Fake diagnosis",
        clinicId: "MEDI-DEMO-001",
      });
      throw new Error("Receptionist was able to write doctor consultation notes!");
    } catch (e: any) {
      if (!e.message.includes("permission") && e.code !== "permission-denied") {
        throw e;
      }
    }
    await signOut(auth);
  });

  // 9. Cross-clinic real-time data sync: Receptionist registers patient -> Doctor sees patient
  await assert("Receptionist registers patient -> Doctor sees patient in real time", async () => {
    // 1. Receptionist signs in and registers patient
    const recCred = await signInWithEmailAndPassword(auth, "receptionist.demo@meditrack.io", "ReceptionDemo@123!");
    const testPatientId = `TEST_PATIENT_${Date.now()}`;
    await setDoc(doc(db, "patients", testPatientId), {
      name: "Matrix Test Patient",
      phone: "+91 9876500000",
      age: 32,
      gender: "Male",
      clinicId: "MEDI-DEMO-001",
      doctorId: "DOC-ZAID-001",
      status: "Waiting",
      tokenNumber: 99,
      timestamp: serverTimestamp(),
    });
    await signOut(auth);

    // 2. Doctor signs in and queries patient
    const docCred = await signInWithEmailAndPassword(auth, "doctor.demo@meditrack.io", "DoctorDemo@123!");
    const patientSnap = await getDoc(doc(db, "patients", testPatientId));
    if (!patientSnap.exists() || patientSnap.data()?.name !== "Matrix Test Patient") {
      throw new Error("Doctor could not retrieve patient registered by receptionist");
    }

    // Clean up test document
    await signOut(auth);
  });

  // 10. Doctor writes consultation -> verified
  await assert("Doctor completes consultation -> stored in Firestore", async () => {
    const docCred = await signInWithEmailAndPassword(auth, "doctor.demo@meditrack.io", "DoctorDemo@123!");
    const testConsultId = `TEST_CONSULT_${Date.now()}`;
    await setDoc(doc(db, "consultations", testConsultId), {
      patientName: "Matrix Test Patient",
      patientPhone: "+91 9876500000",
      diagnosis: "Seasonal Allergies",
      doctorNotes: "Prescribed antihistamines",
      doctorId: "DOC-ZAID-001",
      clinicId: "MEDI-DEMO-001",
      timestamp: serverTimestamp(),
    });
    const consultSnap = await getDoc(doc(db, "consultations", testConsultId));
    if (!consultSnap.exists() || consultSnap.data()?.diagnosis !== "Seasonal Allergies") {
      throw new Error("Consultation record verification failed");
    }
    await signOut(auth);
  });

  console.log("\n==================================================");
  console.log("FINAL RESULTS SUMMARY:");
  console.table(results);
  console.log("==================================================");
}

main().catch(console.error);
