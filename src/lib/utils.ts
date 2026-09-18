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
    if (!ev.data || !ev.data.type) return;
    if (ev.data.type === 'nexnote-capture-ping') {
      parent.postMessage({ type: 'nexnote-capture-pong', captureId: ev.data.captureId }, '*');
      return;
    }
    if (ev.data.type !== 'nexnote-capture') return;
    (async function(){
      try {
        if (typeof html2canvas !== 'function' && ev.data.html2canvasSource) {
          var savedModule = window.module;
          var savedExports = window.exports;
          var savedDefine = window.define;
          try {
            window.module = undefined;
            window.exports = undefined;
            window.define = undefined;
            var s = document.createElement('script');
            s.text = ev.data.html2canvasSource;
            (document.documentElement || document.body).appendChild(s);
          } finally {
            window.module = savedModule;
            window.exports = savedExports;
            window.define = savedDefine;
          }
        }
        if (typeof html2canvas !== 'function') throw new Error('html2canvas unavailable');
        var w = ev.data.width || document.documentElement.clientWidth || 800;
        var h = ev.data.height || document.documentElement.clientHeight || 600;
        var canvas = await html2canvas(document.body || document.documentElement, {
          backgroundColor: '#ffffff',
          useCORS: true,
          scale: 1,
          width: w,
          height: h,
          windowWidth: w,
          windowHeight: h,
          logging: false
        });
        parent.postMessage({ type: 'nexnote-capture-result', captureId: ev.data.captureId, dataUrl: canvas.toDataURL('image/jpeg', 0.85) }, '*');
      } catch (err) {
        parent.postMessage({ type: 'nexnote-capture-result', captureId: ev.data.captureId, error: String(err && err.message || err) }, '*');
      }
    })();
  }, true);
})();
<\/script>`;

export function buildPreviewSrcDoc(html = '', css = '', js = '', withCaptureHelper = false) {
  const helper = withCaptureHelper ? PREVIEW_CAPTURE_HELPER : '';
  const style = `html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}${css || ''}`;
  return `<!DOCTYPE html><html><head><base target="_self">${helper}<style>${style}</style></head><body>${html || ''}<script>${js || ''}<\/script></body></html>`;
}

export function parseNoteCode(raw: unknown): { html: string; css: string; js: string } | undefined {
  if (raw == null || raw === '') return undefined;
  let value: unknown = raw;
  if (typeof raw === 'string') {
    const parsed = parseStoredJson<unknown>(raw, null);
    if (parsed == null) {
      return raw.includes('<') ? { html: raw, css: '', js: '' } : undefined;
    }
    value = parsed;
  }
  if (!value || typeof value !== 'object') return undefined;
  const code = value as { html?: unknown; css?: unknown; js?: unknown };
  return {
    html: typeof code.html === 'string' ? code.html : '',
    css: typeof code.css === 'string' ? code.css : '',
    js: typeof code.js === 'string' ? code.js : '',
  };
}

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
