import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type UserCredential,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Google sign-in rules (do not weaken):
 *
 * 1. Use getAuth() — it registers the browser popup/redirect resolver.
 *    initializeAuth without popupRedirectResolver causes auth/argument-error.
 * 2. Prefer popup. Cross-site redirect loses sessionStorage when authDomain
 *    differs from the app host.
 * 3. Redirect only when the app host IS the authDomain (same-origin), e.g.
 *    nexnote.vercel.app with the /__/auth rewrite in vercel.json.
 */
const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

const SAME_ORIGIN_AUTH_HOSTS = new Set(['nexnote.vercel.app']);

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
export const auth = getAuth(app);
export const storage = getStorage(app);

// Best-effort durable session; never block sign-in if persistence setup fails.
void setPersistence(auth, indexedDBLocalPersistence).catch(() =>
  setPersistence(auth, browserLocalPersistence).catch(() => undefined),
);

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

function isIgnorableRedirectError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (
    code === 'auth/no-auth-event' ||
    code === 'auth/argument-error' ||
    code === 'auth/invalid-credential' ||
    code === 'auth/null-user'
  ) {
    return true;
  }
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: string }).message || '')
      : String(error || '');
  return /missing initial state|sessionStorage|argument-error/i.test(message);
}

export function isEmbeddedBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|Twitter|LinkedInApp/i.test(ua);
}

export function getAuthErrorMessage(error: unknown): string {
  if (isEmbeddedBrowser()) {
    return 'Open NexNote in Chrome or Safari (not the Instagram/Facebook in-app browser) and try again.';
  }

  switch (getErrorCode(error)) {
    case 'auth/popup-blocked':
    case 'auth/operation-not-supported-in-this-environment':
      return canUseSameOriginRedirect
        ? 'Your browser blocked the sign-in popup. Trying to open Google in this tab…'
        : 'Your browser blocked the sign-in popup. Allow pop-ups for this site and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/redirect-cancelled-by-user':
      return 'Sign-in was cancelled.';
    case 'auth/argument-error':
      return 'Could not start sign-in. Reload the page and try again.';
    case 'auth/unauthorized-domain': {
      const host = currentHost || 'unknown host';
      return `${host} is not an authorized domain for Google sign-in.`;
    }
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account with this email address already exists.';
    default:
      return 'Sign-in failed. Reload the page and try again.';
  }
}

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
