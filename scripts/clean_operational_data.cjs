const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');
const fs = require('fs');

const appCfg = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(appCfg);
const auth = getAuth(app);
const db = getFirestore(app);

const TARGET_COLLECTIONS = [
  'patients',
  'consultations',
  'invoices',
  'payments',
  'appointments',
  'activity',
  'audit_logs',
  'messages'
];

async function runClean() {
  console.log('Signing in as admin.demo@meditrack.io...');
  const userCred = await signInWithEmailAndPassword(auth, 'admin.demo@meditrack.io', 'AdminDemo@123!');
  console.log('Signed in successfully as Admin UID:', userCred.user.uid);

  for (const collName of TARGET_COLLECTIONS) {
    try {
      const colRef = collection(db, collName);
      const snapshot = await getDocs(colRef);
      console.log(`\nCollection "${collName}": found ${snapshot.size} document(s).`);
      
      for (const d of snapshot.docs) {
        const data = d.data();
        console.log(` - Deleting ${collName}/${d.id} (clinicId: ${data.clinicId || 'n/a'}, name: ${data.name || data.patientName || data.title || 'n/a'})`);
        await deleteDoc(doc(db, collName, d.id));
      }
      console.log(`All documents in "${collName}" deleted successfully.`);
    } catch (err) {
      console.error(`Error processing collection "${collName}":`, err.message);
    }
  }

  // Verify all collections are empty
  console.log('\n--- VERIFICATION AUDIT ---');
  let allZero = true;
  for (const collName of TARGET_COLLECTIONS) {
    const colRef = collection(db, collName);
    const snapshot = await getDocs(colRef);
    console.log(`Collection "${collName}": ${snapshot.size} documents remaining.`);
    if (snapshot.size !== 0) {
      allZero = false;
    }
  }

  if (allZero) {
    console.log('\nSUCCESS: All operational collections verified at 0 documents!');
  } else {
    console.warn('\nWARNING: Some documents still remain in collections.');
  }

  process.exit(0);
}

runClean().catch(err => {
  console.error('Fatal error during clean:', err);
  process.exit(1);
});
