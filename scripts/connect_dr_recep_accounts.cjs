const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, setDoc, updateDoc } = require('firebase/firestore');
const fs = require('fs');

const cfg = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

const PAIRS = [
  // Pair 1: Apollo HealthCare
  {
    clinicId: "MT0010",
    clinicName: "Apollo HealthCare",
    doctor: {
      email: "dr.zaid@meditrack.io",
      displayName: "Dr. Zaid",
      doctorId: "DOC-MT0010-EFJA",
      category: "GP",
      specialty: "General Physician"
    },
    receptionists: [
      {
        email: "junaidrecep@meditrack.io",
        displayName: "Junaid (Reception)",
        receptionistId: "REC-MT0010-001"
      }
    ]
  },
  // Pair 2: Nitte Clinic
  {
    clinicId: "MT0012",
    clinicName: "Nitte Clinic",
    doctor: {
      email: "dr.arsh@meditrack.io",
      displayName: "Dr. Arsh",
      doctorId: "DOC-MT0012-ZECX",
      category: "GP",
      specialty: "General Physician"
    },
    receptionists: [
      {
        email: "zaidrecep@meditrack.io",
        displayName: "Zaid (Reception)",
        receptionistId: "REC-MT0012-001"
      }
    ]
  },
  // Pair 3: MedPlus HealthCare
  {
    clinicId: "MT0001",
    clinicName: "MedPlus HealthCare",
    doctor: {
      email: "drzaid@meditrack.io",
      displayName: "Dr. Zaid",
      doctorId: "DOC-ZAID-001",
      category: "GP",
      specialty: "General Physician"
    },
    receptionists: [
      {
        email: "junaidreceptionist@meditrack.io",
        displayName: "Junaid (Reception)",
        receptionistId: "REC-JUNAID-001"
      }
    ]
  },
  // Pair 4: MediTrack Central Clinic
  {
    clinicId: "MEDI-DEMO-001",
    clinicName: "MediTrack Central Clinic",
    doctor: {
      email: "doctor.demo@meditrack.io",
      displayName: "Dr. Zaid",
      doctorId: "DOC-ZAID-001",
      category: "GP",
      specialty: "General Physician"
    },
    receptionists: [
      {
        email: "receptionist.demo@meditrack.io",
        displayName: "Junaid (Reception)",
        receptionistId: "REC-JUNAID-001"
      }
    ]
  }
];

async function syncPairs() {
  console.log("Signing in as admin...");
  await signInWithEmailAndPassword(auth, "admin.demo@meditrack.io", "AdminDemo@123!");

  const uSnap = await getDocs(collection(db, "users"));
  const usersByEmail = new Map();
  uSnap.forEach(d => {
    const data = d.data();
    if (data.email) {
      const emailLower = data.email.toLowerCase().trim();
      if (!usersByEmail.has(emailLower)) {
        usersByEmail.set(emailLower, []);
      }
      usersByEmail.get(emailLower).push({ id: d.id, ...data });
    }
  });

  for (const pair of PAIRS) {
    console.log(`\n=== Connecting Clinic: ${pair.clinicName} (ID: ${pair.clinicId}) ===`);
    console.log(` Doctor: ${pair.doctor.email}`);

    // Update Doctor record
    const docUsers = usersByEmail.get(pair.doctor.email.toLowerCase().trim()) || [];
    let docUid = "";
    for (const u of docUsers) {
      docUid = u.id;
      const docPayload = {
        clinicId: pair.clinicId,
        clinicName: pair.clinicName,
        role: "doctor",
        authorizedRole: "doctor",
        doctorId: pair.doctor.doctorId,
        doctorEmail: pair.doctor.email,
        displayName: pair.doctor.displayName,
        category: pair.doctor.category,
        specialty: pair.doctor.specialty,
        assignedDoctorEmail: pair.doctor.email,
        assignedDoctorName: pair.doctor.displayName,
        assignedDoctorId: pair.doctor.doctorId,
        status: "active",
        accountStatus: "active",
        phoneVerified: true,
        initialVerificationCompleted: true
      };
      console.log(` - Updating Doctor user doc ${u.id} (${pair.doctor.email})...`);
      await setDoc(doc(db, "users", u.id), docPayload, { merge: true });
      await setDoc(doc(db, "userAccess", u.id), docPayload, { merge: true });
    }

    // Pre-auth doctor
    const docKey = pair.doctor.email.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
    await setDoc(doc(db, "authorizedAccounts", docKey), {
      email: pair.doctor.email.toLowerCase().trim(),
      clinicId: pair.clinicId,
      clinicName: pair.clinicName,
      role: "doctor",
      authorizedRole: "doctor",
      doctorId: pair.doctor.doctorId,
      doctorEmail: pair.doctor.email,
      displayName: pair.doctor.displayName,
      status: "active",
      accountStatus: "active"
    }, { merge: true });

    // Update Receptionist record(s)
    for (const recep of pair.receptionists) {
      console.log(` Receptionist: ${recep.email} -> Connected to Doctor: ${pair.doctor.email}`);
      const recUsers = usersByEmail.get(recep.email.toLowerCase().trim()) || [];
      for (const u of recUsers) {
        const recPayload = {
          clinicId: pair.clinicId,
          clinicName: pair.clinicName,
          role: "receptionist",
          authorizedRole: "receptionist",
          receptionistId: recep.receptionistId,
          assignedDoctorEmail: pair.doctor.email.toLowerCase().trim(),
          assignedDoctorName: pair.doctor.displayName,
          assignedDoctorId: pair.doctor.doctorId,
          assignedDoctorUid: docUid,
          doctorEmail: pair.doctor.email.toLowerCase().trim(),
          doctorName: pair.doctor.displayName,
          doctorId: pair.doctor.doctorId,
          category: pair.doctor.category,
          status: "active",
          accountStatus: "active",
          phoneVerified: true,
          initialVerificationCompleted: true
        };
        console.log(` - Updating Receptionist user doc ${u.id} (${recep.email})...`);
        await setDoc(doc(db, "users", u.id), recPayload, { merge: true });
        await setDoc(doc(db, "userAccess", u.id), recPayload, { merge: true });
      }

      // Pre-auth receptionist
      const recKey = recep.email.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
      await setDoc(doc(db, "authorizedAccounts", recKey), {
        email: recep.email.toLowerCase().trim(),
        clinicId: pair.clinicId,
        clinicName: pair.clinicName,
        role: "receptionist",
        authorizedRole: "receptionist",
        assignedDoctorEmail: pair.doctor.email.toLowerCase().trim(),
        assignedDoctorName: pair.doctor.displayName,
        assignedDoctorId: pair.doctor.doctorId,
        doctorEmail: pair.doctor.email.toLowerCase().trim(),
        status: "active",
        accountStatus: "active"
      }, { merge: true });
    }

    // Ensure clinic doc exists
    await setDoc(doc(db, "clinics", pair.clinicId), {
      clinicId: pair.clinicId,
      name: pair.clinicName,
      adminEmail: pair.doctor.email,
      primaryDoctorId: pair.doctor.doctorId,
      primaryDoctorEmail: pair.doctor.email,
      primaryDoctorName: pair.doctor.displayName
    }, { merge: true });
  }

  console.log("\nSUCCESS: All doctor and receptionist accounts synchronized to same clinic IDs and connected by email!");
  process.exit(0);
}

syncPairs().catch(err => {
  console.error("Sync error:", err);
  process.exit(1);
});
