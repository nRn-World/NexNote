import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const productionHost = 'nexnote.vercel.app';
const authDomain =
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
  (typeof window !== 'undefined' && window.location.hostname === productionHost
    ? productionHost
    : 'nexnote-1.firebaseapp.com');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCanAf3XY1nJDnyqfQhB6dufDp4W6Oovb0",
  authDomain,
  databaseURL: "https://nexnote-1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "nexnote-1",
  storageBucket: "nexnote-1.firebasestorage.app",
  messagingSenderId: "950801399914",
  appId: "1:950801399914:web:b8af074a9369d5e0da8a13",
  measurementId: "G-7RRW673DNZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const code = 'code' in error ? String((error as { code?: string }).code || '') : '';
  if (code) return code;
  const message = 'message' in error ? String((error as { message?: string }).message || '') : '';
  const match = message.match(/auth\/[a-z0-9-]+/i);
  return match ? match[0] : '';
}

export function getAuthErrorMessage(error: unknown): string {
  switch (getErrorCode(error)) {
    case 'auth/popup-blocked':
    case 'auth/operation-not-supported-in-this-environment':
      return 'Webbläsaren blockerade inloggningsfönstret. Ladda om sidan och försök igen.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/redirect-cancelled-by-user':
      return 'Inloggningen avbröts.';
    case 'auth/unauthorized-domain':
      return 'Den här domänen är inte godkänd för Google-inloggning.';
    case 'auth/network-request-failed':
      return 'Nätverksfel. Kontrollera din anslutning och försök igen.';
    case 'auth/account-exists-with-different-credential':
      return 'Det finns redan ett konto med samma e-postadress.';
    default: {
      const message = typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: string }).message)
        : '';
      return message ? `Inloggningen misslyckades: ${message}` : 'Inloggningen misslyckades. Försök igen.';
    }
  }
}

export async function completeGoogleRedirect() {
  return getRedirectResult(auth, browserPopupRedirectResolver);
}

export const signInWithGoogle = async () => {
  await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver);
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
  }
};
