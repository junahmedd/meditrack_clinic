import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { doc, getDocFromServer } from 'firebase/firestore';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Helper to detect if IndexedDB and persistent cache are fully functional
function isPersistenceSupported() {
  // Always return false in dev/preview environment to prevent IndexedDB lock/storage deadlocks and endless loading screens.
  return false;
}

// Initialize Firestore with robust local persistent IndexedDB cache, with safe fallback for iframes/sandboxes
let dbInstance;
const databaseId = (firebaseConfig as any).firestoreDatabaseId;

if (isPersistenceSupported()) {
  try {
    dbInstance = databaseId && databaseId !== '(default)'
      ? initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        }, databaseId)
      : initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        });
  } catch (err) {
    console.warn("Firestore: Failed to initialize persistent cache, falling back to default memory-only.", err);
    dbInstance = databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);
  }
} else {
  dbInstance = databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db = dbInstance;

// Initialize Auth
export const auth = getAuth(app);

// Connectivity Test
async function testConnection() {
  try {
    // Attempt to reach the backend
    // If we get any response (even error like permission denied), we are "online"
    await getDocFromServer(doc(db, 'system', 'ping'));
    console.log("Firestore connection confirmed.");
  } catch (error: any) {
    if (error.code === 'unavailable' || (error.message && error.message.includes('offline'))) {
      console.warn("Firestore: Client is offline or service is initializing. Background sync will handle operations.");
    } else {
      // Permission denied or Not found still counts as a successful roundtrip to the server
      console.log("Firestore connection check: Handshake successful.");
    }
  }
}
testConnection();

export { firebaseConfig };

export async function createSecondaryAuthUser(email: string, pass: string) {
  const existingApp = getApps().find(a => a.name === 'SecondaryStaffCreator');
  const secondaryApp = existingApp || initializeApp(firebaseConfig, 'SecondaryStaffCreator');
  const secondaryAuth = getAuth(secondaryApp);
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
  await signOut(secondaryAuth);
  return cred.user;
}

export default app;
