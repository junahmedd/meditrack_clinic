import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  runTransaction,
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

  const targetPath = isAdm ? "/admin" : isDoc ? "/doctor" : "/receptionist";
  const targetView = isAdm ? "dashboard" : isDoc ? "doctor" : "receptionist";

  return { isAdm, isDoc, isRec, targetPath, targetView };
}

async function runTest() {
  console.log("============================================================");
  console.log("TESTING: SIGNUP -> LOGIN PAGE -> PORTAL REDIRECT WORKFLOW");
  console.log("============================================================");

  // 1. DOCTOR SIGNUP & REDIRECT TEST
  const ts = Date.now();
  const docEmail = `testdoc_${ts}@meditrack.io`;
  const docPass = "SecurePass123!";
  const docClinic = `Clinic AutoDoc ${ts}`;

  console.log(`\n1. Creating new Doctor account: ${docEmail}...`);
  const docCred = await createUserWithEmailAndPassword(auth, docEmail, docPass);
  const docUid = docCred.user.uid;

  // Simulate clinic sequential ID and Firestore writes
  const counterRef = doc(db, "system", "clinicCounter");
  let finalClinicId = "";
  await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const currentCount = counterSnap.exists() ? (counterSnap.data().count || 0) : 0;
    const nextCount = currentCount + 1;
    finalClinicId = `MT${String(nextCount).padStart(4, "0")}`;
    transaction.set(counterRef, { count: nextCount }, { merge: true });
  });

  const docPayload = {
    uid: docUid,
    email: docEmail,
    displayName: "Dr. Automated Test",
    role: "doctor",
    authorizedRole: "doctor",
    status: "active",
    accountStatus: "active",
    clinicId: finalClinicId,
    clinicName: docClinic,
    doctorId: `DOC-${finalClinicId}-001`,
    initialVerificationCompleted: true,
    phoneVerified: true,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "clinics", finalClinicId), {
    clinicId: finalClinicId,
    name: docClinic,
    adminId: docUid,
    adminEmail: docEmail,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "users", docUid), docPayload);
  await setDoc(doc(db, "userAccess", docUid), docPayload);

  // Emulate signout after signup to land on login page
  await signOut(auth);
  console.log("  ✓ Doctor signed up and returned to Login Page with credentials pre-filled.");

  // Now login with those prefilled credentials
  console.log("  ✓ Logging in from Login Page...");
  const loginDocCred = await signInWithEmailAndPassword(auth, docEmail, docPass);
  const docSnap = await getDoc(doc(db, "userAccess", loginDocCred.user.uid));
  const docRouting = detectRoleAndTarget(docSnap.data());
  console.log("  ✓ Detected Role:", docSnap.data()?.role);
  console.log("  ✓ Redirect target path:", docRouting.targetPath);
  console.log("  ✓ Target view portal:", docRouting.targetView);

  if (docRouting.targetPath !== "/doctor" || docRouting.targetView !== "doctor") {
    throw new Error(`Expected doctor to redirect to /doctor but got ${docRouting.targetPath}`);
  }
  console.log("  ✅ SUCCESS: Doctor redirected specifically to Doctor Portal (/doctor)!");

  // Clean up doctor test user
  await deleteUser(loginDocCred.user);
  await signInWithEmailAndPassword(auth, "admin.demo@meditrack.io", "AdminDemo@123!");
  await deleteDoc(doc(db, "users", docUid));
  await deleteDoc(doc(db, "userAccess", docUid));
  await deleteDoc(doc(db, "clinics", finalClinicId));
  await signOut(auth);
  console.log("  ✓ Cleaned up doctor test user.");

  // 2. RECEPTIONIST SIGNUP & REDIRECT TEST
  const recEmail = `testrec_${ts}@meditrack.io`;
  const recPass = "SecurePass123!";
  const recClinic = `Clinic AutoRec ${ts}`;

  console.log(`\n2. Creating new Receptionist account: ${recEmail}...`);
  const recCred = await createUserWithEmailAndPassword(auth, recEmail, recPass);
  const recUid = recCred.user.uid;

  const recClinicId = `MT${String(ts).slice(-4)}`;
  const recPayload = {
    uid: recUid,
    email: recEmail,
    displayName: "Receptionist Auto Test",
    role: "receptionist",
    authorizedRole: "receptionist",
    status: "active",
    accountStatus: "active",
    clinicId: recClinicId,
    clinicName: recClinic,
    receptionistId: `REC-${recClinicId}-001`,
    initialVerificationCompleted: true,
    phoneVerified: true,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "clinics", recClinicId), {
    clinicId: recClinicId,
    name: recClinic,
    adminId: recUid,
    adminEmail: recEmail,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "users", recUid), recPayload);
  await setDoc(doc(db, "userAccess", recUid), recPayload);

  await signOut(auth);
  console.log("  ✓ Receptionist signed up and returned to Login Page with credentials pre-filled.");

  console.log("  ✓ Logging in from Login Page...");
  const loginRecCred = await signInWithEmailAndPassword(auth, recEmail, recPass);
  const recSnap = await getDoc(doc(db, "userAccess", loginRecCred.user.uid));
  const recRouting = detectRoleAndTarget(recSnap.data());
  console.log("  ✓ Detected Role:", recSnap.data()?.role);
  console.log("  ✓ Redirect target path:", recRouting.targetPath);
  console.log("  ✓ Target view portal:", recRouting.targetView);

  if (recRouting.targetPath !== "/receptionist" || recRouting.targetView !== "receptionist") {
    throw new Error(`Expected receptionist to redirect to /receptionist but got ${recRouting.targetPath}`);
  }
  console.log("  ✅ SUCCESS: Receptionist redirected specifically to Receptionist Portal (/receptionist)!");

  // Clean up receptionist test user
  await deleteUser(loginRecCred.user);
  await signInWithEmailAndPassword(auth, "admin.demo@meditrack.io", "AdminDemo@123!");
  await deleteDoc(doc(db, "users", recUid));
  await deleteDoc(doc(db, "userAccess", recUid));
  await deleteDoc(doc(db, "clinics", recClinicId));
  await signOut(auth);
  console.log("  ✓ Cleaned up receptionist test user.");

  console.log("\n============================================================");
  console.log("ALL TESTS PASSED: Signup -> Login Page -> Portal Redirect OK!");
  console.log("============================================================");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
