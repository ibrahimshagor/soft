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

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Authentication state & helper
let currentFirebaseUser: FirebaseUser | null = null;
let authPromise: Promise<FirebaseUser | null> | null = null;
const authListeners: Array<(user: FirebaseUser | null, error?: string) => void> = [];

export function subscribeToAuthStatus(callback: (user: FirebaseUser | null, error?: string) => void): () => void {
  authListeners.push(callback);
  callback(currentFirebaseUser);
  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx !== -1) authListeners.splice(idx, 1);
  };
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
    // If not yet authenticated, trigger ensureFirebaseAuth in background
    if (!currentFirebaseUser) {
      ensureFirebaseAuth().catch(() => {});
    }
    const cleanData = sanitizeForFirestore(data);
    const docRef = doc(db, collectionName, String(docId));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err: any) {
    console.warn(`[Firebase] Error saving to ${collectionName}/${docId}:`, err);
  }
}

// Delete document from collection
export async function deleteFirestoreDoc(collectionName: string, docId: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, String(docId));
    await deleteDoc(docRef);
  } catch (err: any) {
    console.warn(`[Firebase] Error deleting ${collectionName}/${docId}:`, err);
  }
}

// Real-time listener for a collection
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const items: T[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          onData(items);
        }
      },
      (error) => {
        console.warn(`[Firebase] Snapshot error for ${collectionName}:`, error.message);
        onError?.(error);
      }
    );
  } catch (err: any) {
    console.warn(`[Firebase] Listener setup error for ${collectionName}:`, err);
    onError?.(err);
    return () => {};
  }
}

// Real-time listener for a single document
export function subscribeToDoc<T>(
  collectionName: string,
  docId: string,
  onData: (data: T) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const docRef = doc(db, collectionName, String(docId));
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onData(docSnap.data() as T);
        }
      },
      (error) => {
        console.warn(`[Firebase] Doc snapshot error for ${collectionName}/${docId}:`, error.message);
        onError?.(error);
      }
    );
  } catch (err: any) {
    console.warn(`[Firebase] Listener setup error for ${collectionName}/${docId}:`, err);
    onError?.(err);
    return () => {};
  }
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
      origin: window.location.origin,
      authUser: user ? user.uid : 'anonymous_none',
    });
    return {
      success: true,
      message: 'ফায়ারবেস ডাটাবেজের সাথে সফলভাবে সংযোগ স্থাপিত হয়েছে এবং রিয়েলটাইম সিঙ্কিং সক্রিয়!',
      isAuth: !!user,
      userUid: user?.uid,
    };
  } catch (err: any) {
    console.error('[Firebase] Connection test error:', err);
    let msg = err.message || 'Unknown error';
    if (err.code === 'permission-denied' || msg.includes('permission')) {
      msg =
        'অনুমতি পাওয়া যায়নি (Permission Denied)। অনুগ্রহ করে Firebase Console -> Firestore Database -> Rules এ গিয়ে rules চেক করুন অথবা Authentication -> Sign-in method এ Anonymous এনাবল করুন।';
    }
    return {
      success: false,
      message: msg,
      isAuth: !!currentFirebaseUser,
      userUid: currentFirebaseUser?.uid,
    };
  }
}

// Bulk sync all initial and local state to Firestore
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
