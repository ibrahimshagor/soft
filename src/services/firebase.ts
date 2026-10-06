import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: 'AIzaSyBWwVZ5xOyXTnTpDuBPzW-b0IpGz6eJGtg',
  authDomain: 'rm-automobile.firebaseapp.com',
  projectId: 'rm-automobile',
  storageBucket: 'rm-automobile.firebasestorage.app',
  messagingSenderId: '630774495377',
  appId: '1:630774495377:web:19adab898070907f522730',
};

// Complete copy-pasteable Firestore Security Rules for RM Automobiles
export const firestoreRulesContent = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read & write for all authenticated requests (including anonymous auth)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Explicit collection access
    match /products/{id} { allow read, write: if request.auth != null; }
    match /customers/{id} { allow read, write: if request.auth != null; }
    match /suppliers/{id} { allow read, write: if request.auth != null; }
    match /accounts/{id} { allow read, write: if request.auth != null; }
    match /sales/{id} { allow read, write: if request.auth != null; }
    match /purchases/{id} { allow read, write: if request.auth != null; }
    match /expenses/{id} { allow read, write: if request.auth != null; }
    match /incomes/{id} { allow read, write: if request.auth != null; }
    match /stockAdjustments/{id} { allow read, write: if request.auth != null; }
    match /loanParties/{id} { allow read, write: if request.auth != null; }
    match /loanRecords/{id} { allow read, write: if request.auth != null; }
    match /paymentRecords/{id} { allow read, write: if request.auth != null; }
    match /dailyClosings/{id} { allow read, write: if request.auth != null; }
    match /auditLogs/{id} { allow read, write: if request.auth != null; }
    match /users/{id} { allow read, write: if request.auth != null; }
    match /settings/{id} { allow read, write: if request.auth != null; }
    match /_connection_test/{id} { allow read, write: if true; }
  }
}`;

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Authentication state & helper
let currentFirebaseUser: FirebaseUser | null = null;
let authPromise: Promise<FirebaseUser | null> | null = null;
const authListeners: Array<(user: FirebaseUser | null, error?: string) => void> = [];
const errorListeners: Array<(errorMsg: string) => void> = [];

export function subscribeToAuthStatus(callback: (user: FirebaseUser | null, error?: string) => void): () => void {
  authListeners.push(callback);
  callback(currentFirebaseUser);
  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx !== -1) authListeners.splice(idx, 1);
  };
}

export function subscribeToFirebaseErrors(callback: (errorMsg: string) => void): () => void {
  errorListeners.push(callback);
  return () => {
    const idx = errorListeners.indexOf(callback);
    if (idx !== -1) errorListeners.splice(idx, 1);
  };
}

function broadcastError(msg: string) {
  errorListeners.forEach((cb) => {
    try {
      cb(msg);
    } catch (e) {}
  });
}

// Automatically ensure anonymous sign-in so Firestore 'request.auth != null' rules are satisfied
export async function ensureFirebaseAuth(): Promise<FirebaseUser | null> {
  if (currentFirebaseUser) return currentFirebaseUser;
  if (authPromise) return authPromise;

  authPromise = new Promise((resolve) => {
    try {
      const unsub = onAuthStateChanged(auth, async (user) => {
        if (user) {
          currentFirebaseUser = user;
          authListeners.forEach((cb) => cb(user));
          unsub();
          resolve(user);
        } else {
          try {
            const cred = await signInAnonymously(auth);
            currentFirebaseUser = cred.user;
            authListeners.forEach((cb) => cb(cred.user));
            unsub();
            resolve(cred.user);
          } catch (err: any) {
            console.warn('[Firebase Auth] Anonymous sign-in notice:', err.message);
            authListeners.forEach((cb) => cb(null, err.message));
            unsub();
            resolve(null);
          }
        }
      });
    } catch (e: any) {
      console.warn('[Firebase Auth] Init error:', e);
      authListeners.forEach((cb) => cb(null, e.message));
      resolve(null);
    }
  });

  return authPromise;
}

// Start auth immediately on file load
ensureFirebaseAuth().catch(() => {});

// Helper to remove any undefined fields before writing to Firestore
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) return data;
  return JSON.parse(JSON.stringify(data));
}

// Write document to collection
export async function setFirestoreDoc(collectionName: string, docId: string, data: any): Promise<void> {
  try {
    await ensureFirebaseAuth();
    const cleanData = sanitizeForFirestore(data);
    const docRef = doc(db, collectionName, String(docId));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err: any) {
    console.warn(`[Firebase] Error saving to ${collectionName}/${docId}:`, err);
    if (err.code === 'permission-denied' || String(err.message).includes('permission')) {
      broadcastError('ফায়ারবেসে ডাটা সংরক্ষণের অনুমতি নেই (Permission Denied)। অনুগ্রহ করে Settings -> Firebase থেকে রুলস কপি করে Firebase Console-এ আপডেট ও Publish করুন।');
    }
  }
}

// Delete document from collection
export async function deleteFirestoreDoc(collectionName: string, docId: string): Promise<void> {
  try {
    await ensureFirebaseAuth();
    const docRef = doc(db, collectionName, String(docId));
    await deleteDoc(docRef);
  } catch (err: any) {
    console.warn(`[Firebase] Error deleting ${collectionName}/${docId}:`, err);
  }
}

// Clear all documents in a collection (used for clean slate reset)
export async function clearFirestoreCollection(collectionName: string): Promise<void> {
  try {
    await ensureFirebaseAuth();
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const deletes = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.allSettled(deletes);
    }
  } catch (err: any) {
    console.warn(`[Firebase] Error clearing collection ${collectionName}:`, err);
  }
}

// Real-time listener for a collection with auto-auth and robust reconnection
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  let unsubSnapshot: (() => void) | null = null;
  let isCancelled = false;

  const initListener = async () => {
    try {
      await ensureFirebaseAuth();
      if (isCancelled) return;
      const colRef = collection(db, collectionName);
      unsubSnapshot = onSnapshot(
        colRef,
        (snapshot) => {
          const items: T[] = [];
          if (!snapshot.empty) {
            snapshot.forEach((docSnap) => {
              items.push({ id: docSnap.id, ...(docSnap.data() as any) });
            });
          }
          onData(items);
        },
        async (error) => {
          console.warn(`[Firebase] Snapshot error for ${collectionName}:`, error.message);
          if (error.code === 'permission-denied') {
            broadcastError(`ফায়ারবেস রিড পারমিশন এরর (${collectionName})! Firebase Console-এ Rules আপডেট করুন।`);
          }
          onError?.(error);
          if (!isCancelled) {
            setTimeout(() => {
              if (!isCancelled) initListener();
            }, 3000);
          }
        }
      );
    } catch (err: any) {
      console.warn(`[Firebase] Listener setup error for ${collectionName}:`, err);
      onError?.(err);
    }
  };

  initListener();

  return () => {
    isCancelled = true;
    if (unsubSnapshot) unsubSnapshot();
  };
}

// Real-time listener for a single document with auto-auth
export function subscribeToDoc<T>(
  collectionName: string,
  docId: string,
  onData: (data: T) => void,
  onError?: (err: Error) => void
): () => void {
  let unsubSnapshot: (() => void) | null = null;
  let isCancelled = false;

  const initListener = async () => {
    try {
      await ensureFirebaseAuth();
      if (isCancelled) return;
      const docRef = doc(db, collectionName, String(docId));
      unsubSnapshot = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            onData(docSnap.data() as T);
          }
        },
        async (error) => {
          console.warn(`[Firebase] Doc snapshot error for ${collectionName}/${docId}:`, error.message);
          onError?.(error);
          if (!isCancelled) {
            setTimeout(() => {
              if (!isCancelled) initListener();
            }, 3000);
          }
        }
      );
    } catch (err: any) {
      console.warn(`[Firebase] Listener setup error for ${collectionName}/${docId}:`, err);
      onError?.(err);
    }
  };

  initListener();

  return () => {
    isCancelled = true;
    if (unsubSnapshot) unsubSnapshot();
  };
}

// Test Firestore Connection and permissions
export async function testFirestoreConnection(): Promise<{
  success: boolean;
  message: string;
  isAuth: boolean;
  userUid?: string;
}> {
  try {
    const user = await ensureFirebaseAuth();
    const testDocRef = doc(db, '_connection_test', 'status');
    const now = new Date().toISOString();
    await setDoc(testDocRef, {
      lastPing: now,
      origin: typeof window !== 'undefined' ? window.location.origin : 'server',
      authUser: user ? user.uid : 'anonymous_none',
    });
    return {
      success: true,
      message: 'ফায়ারবেস ডাটাবেজের সাথে সফলভাবে সংযোগ স্থাপিত হয়েছে এবং রিয়েলটাইম রিড/রাইট সক্রিয়!',
      isAuth: !!user,
      userUid: user?.uid,
    };
  } catch (err: any) {
    console.error('[Firebase] Connection test error:', err);
    let msg = err.message || 'Unknown error';
    if (err.code === 'permission-denied' || msg.includes('permission')) {
      msg =
        'অনুমতি পাওয়া যায়নি (Permission Denied)। অনুগ্রহ করে Settings -> Firebase কার্ড থেকে Rules কপি করে Firebase Console -> Firestore Database -> Rules-এ পেস্ট করে Publish করুন এবং Authentication -> Sign-in method এ Anonymous এনাবল আছে কিনা নিশ্চিত করুন।';
    }
    return {
      success: false,
      message: msg,
      isAuth: !!currentFirebaseUser,
      userUid: currentFirebaseUser?.uid,
    };
  }
}

// Bulk sync all state to Firestore
export async function syncAllToFirestore(data: {
  products: any[];
  customers: any[];
  suppliers: any[];
  accounts: any[];
  sales: any[];
  purchases: any[];
  expenses: any[];
  incomes?: any[];
  stockAdjustments?: any[];
  loanParties: any[];
  loanRecords: any[];
  paymentRecords: any[];
  businessProfile: any;
  users: any[];
  categories: any[];
  brands: any[];
  paymentMethods: any[];
  expenseCategories?: any[];
  countries?: any[];
}): Promise<void> {
  const promises: Promise<any>[] = [];

  promises.push(setFirestoreDoc('settings', 'businessProfile', data.businessProfile));
  promises.push(
    setFirestoreDoc('settings', 'appMasters', {
      categories: data.categories,
      brands: data.brands,
      paymentMethods: data.paymentMethods,
      expenseCategories: data.expenseCategories || [],
      countries: data.countries || [],
    })
  );

  data.products?.forEach((p) => promises.push(setFirestoreDoc('products', p.id, p)));
  data.customers?.forEach((c) => promises.push(setFirestoreDoc('customers', c.id, c)));
  data.suppliers?.forEach((s) => promises.push(setFirestoreDoc('suppliers', s.id, s)));
  data.accounts?.forEach((a) => promises.push(setFirestoreDoc('accounts', a.id, a)));
  data.sales?.forEach((s) => promises.push(setFirestoreDoc('sales', s.id, s)));
  data.purchases?.forEach((p) => promises.push(setFirestoreDoc('purchases', p.id, p)));
  data.expenses?.forEach((e) => promises.push(setFirestoreDoc('expenses', e.id, e)));
  data.incomes?.forEach((i) => promises.push(setFirestoreDoc('incomes', i.id, i)));
  data.stockAdjustments?.forEach((sa) => promises.push(setFirestoreDoc('stockAdjustments', sa.id, sa)));
  data.loanParties?.forEach((lp) => promises.push(setFirestoreDoc('loanParties', lp.id, lp)));
  data.loanRecords?.forEach((lr) => promises.push(setFirestoreDoc('loanRecords', lr.id, lr)));
  data.paymentRecords?.forEach((pr) => promises.push(setFirestoreDoc('paymentRecords', pr.id, pr)));
  data.users?.forEach((u) => promises.push(setFirestoreDoc('users', u.id, u)));

  await Promise.allSettled(promises);
}

export default app;
