import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  type UserCredential,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Google sign-in rules (do not weaken these):
 *
 * 1. Prefer popup. Cross-site redirect loses sessionStorage when authDomain
 *    differs from the app host ("missing initial state").
 * 2. Redirect only when the app host IS the authDomain (same-origin), e.g.
 *    nexnote.vercel.app with the /__/auth rewrite in vercel.json.
 * 3. Never fall back to redirect on nrnworld.one, GitHub Pages, or other
 *    hosts that cannot proxy Firebase's auth handler.
 */
const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

/** Hosts that proxy /__/auth to Firebase and may use that host as authDomain. */
const SAME_ORIGIN_AUTH_HOSTS = new Set([
  'nexnote.vercel.app',
]);

const authDomain =
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
  (SAME_ORIGIN_AUTH_HOSTS.has(currentHost) ? currentHost : 'nexnote-1.firebaseapp.com');

const canUseSameOriginRedirect =
  Boolean(currentHost) && (currentHost === authDomain || currentHost === 'localhost');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCanAf3XY1nJDnyqfQhB6dufDp4W6Oovb0',
  authDomain,
  databaseURL: 'https://nexnote-1-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'nexnote-1',
  storageBucket: 'nexnote-1.firebasestorage.app',
  messagingSenderId: '950801399914',
  appId: '1:950801399914:web:b8af074a9369d5e0da8a13',
  measurementId: 'G-7RRW673DNZ',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

function createAuth() {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();

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

/** Stale redirect leftovers / partitioned storage — not actionable on cold load. */
function isIgnorableRedirectError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (
    code === 'auth/no-auth-event' ||
    code === 'auth/argument-error' ||
    code === 'auth/invalid-credential'
  ) {
    return true;
  }
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: string }).message || '')
      : String(error || '');
  return /missing initial state|sessionStorage/i.test(message);
}

export function isEmbeddedBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|Twitter|LinkedInApp/i.test(ua);
}

export function getAuthErrorMessage(error: unknown): string {
  if (isEmbeddedBrowser()) {
    return 'Öppna NexNote i Chrome eller Safari (inte i Instagram/Facebook-webbläsaren) och försök igen.';
  }

  switch (getErrorCode(error)) {
    case 'auth/popup-blocked':
    case 'auth/operation-not-supported-in-this-environment':
      return canUseSameOriginRedirect
        ? 'Webbläsaren blockerade popup. Försöker öppna Google i samma flik…'
        : 'Webbläsaren blockerade inloggningsfönstret. Tillåt popup för den här sajten och försök igen.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/redirect-cancelled-by-user':
      return 'Inloggningen avbröts.';
    case 'auth/unauthorized-domain': {
      const host = currentHost || 'okänd host';
      return `Domänen "${host}" är inte godkänd för Google-inloggning. Lägg till den under Firebase → Authentication → Authorized domains.`;
    }
    case 'auth/network-request-failed':
      return 'Nätverksfel. Kontrollera din anslutning och försök igen.';
    case 'auth/account-exists-with-different-credential':
      return 'Det finns redan ett konto med samma e-postadress.';
    default: {
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: string }).message)
          : '';
      return message
        ? `Inloggningen misslyckades: ${message}`
        : 'Inloggningen misslyckades. Försök igen.';
    }
  }
}

/**
 * Completes a same-origin redirect if one is pending.
 * Ignores stale cross-site redirect failures so the login screen stays clean.
 */
export async function completeGoogleRedirect(): Promise<UserCredential | null> {
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    if (isIgnorableRedirectError(error)) return null;
    throw error;
  }
}

export const signInWithGoogle = async (): Promise<UserCredential | void> => {
  if (isEmbeddedBrowser()) {
    throw Object.assign(new Error('Embedded browser'), {
      code: 'auth/operation-not-supported-in-this-environment',
    });
  }

  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const code = getErrorCode(error);

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw error;
    }

    const popupUnavailable =
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment';

    // Redirect is only safe when auth handler stays on the same origin.
    // Cross-site redirect (app on nrnworld.one → auth on firebaseapp.com) breaks login.
    if (popupUnavailable && canUseSameOriginRedirect) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
  }
};
