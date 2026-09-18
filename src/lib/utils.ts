import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth } from '../firebase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Scripts may run in the preview, but they cannot navigate the parent app. */
export const PREVIEW_SANDBOX = 'allow-scripts';

/** Runs inside the sandboxed preview so Save Image can capture JS-rendered UI. */
export const PREVIEW_CAPTURE_HELPER = `<script data-nexnote-capture="1">
(function(){
  if (window.__nexnoteCaptureBound) return;
  window.__nexnoteCaptureBound = true;
  window.addEventListener('message', function(ev){
    if (!ev.data || ev.data.type !== 'nexnote-capture') return;
    (async function(){
      try {
        if (typeof html2canvas !== 'function') {
          await new Promise(function(resolve, reject){
            var s = document.createElement('script');
            s.src = ev.data.scriptUrl;
            s.onload = resolve;
            s.onerror = function(){ reject(new Error('html2canvas load failed')); };
            document.head.appendChild(s);
          });
        }
        var w = ev.data.width || document.documentElement.clientWidth || 800;
        var h = ev.data.height || document.documentElement.clientHeight || 600;
        var canvas = await html2canvas(document.documentElement, {
          backgroundColor: '#ffffff',
          useCORS: true,
          scale: 1,
          width: w,
          height: h,
          windowWidth: w,
          windowHeight: h
        });
        parent.postMessage({ type: 'nexnote-capture-result', dataUrl: canvas.toDataURL('image/jpeg', 0.85) }, '*');
      } catch (err) {
        parent.postMessage({ type: 'nexnote-capture-result', error: String(err && err.message || err) }, '*');
      }
    })();
  }, true);
})();
<\/script>`;

export function compressCoverImage(dataUrl: string, maxWidth = 480, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / Math.max(1, img.width));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Could not compress image'));
    img.src = dataUrl;
  });
}

export function parseStoredJson<T>(raw: unknown, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'object') return raw as T;
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Do not re-throw — callers (e.g. onSnapshot) should handle errors gracefully
}
