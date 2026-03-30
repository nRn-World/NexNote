import React, { useState, useEffect, useRef } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove,
  addDoc, query, orderBy, setDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Heart, Upload, Trophy, X, User, AlertTriangle, Clock,
  Shield, Trash2, AlertOctagon, Ban, ChevronDown, ChevronUp,
  Copy, Check, MessageSquare, Code2, Eye, EyeOff, Crown, Flame
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Note } from '../types';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export interface CommunityPost {
  id: string;
  uid: string;
  displayName: string;
  photoURL?: string;
  title: string;
  content: string;
  coverImage?: string;
  likes: string[];
  createdAt: number;
}

interface BanRecord {
  uid: string;
  email: string;
  displayName: string;
  reason: string;
  until: number | 'forever';
  bannedAt: number;
}

interface CommunityViewProps {
  user: any;
  userNotes: Note[];
  onClose: () => void;
}

const MAX_MONTHLY = 2;
const COUNTDOWN_SECONDS = 30;
const ADMIN_EMAIL = 'bynrnworld@gmail.com';

// Detects if content is HTML/SVG/code and renders live iframe, otherwise plain text
function PostContent({ content, title }: { content: string; title: string }) {
  const isCode = /<[a-z][\s\S]*>/i.test(content);
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isCode) {
    const iframeDoc = `<!DOCTYPE html><html><head><style>*{box-sizing:border-box;}html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff;}</style></head><body>${content}</body></html>`;
    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Code2 size={12} />
            <span>Kod</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors">
              {copied ? <><Check size={11} className="text-green-400" /> Kopierad</> : <><Copy size={11} /> Kopiera kod</>}
            </button>
            <button onClick={() => setShowPreview(p => !p)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors">
              {showPreview ? <><EyeOff size={11} /> Dölj</> : <><Eye size={11} /> Visa preview</>}
            </button>
          </div>
        </div>
        {showPreview && (
          <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950" style={{ height: 260 }}>
            <iframe
              srcDoc={iframeDoc}
              title={title}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-green-400 text-[10px] rounded-full font-mono border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </div>
          </div>
        )}
      </div>
    );
  }

  const plain = content.replace(/<[^>]*>/g, '');
  return (
    <div className="mt-2">
      <p className={cn('text-sm text-zinc-400 leading-relaxed', !expanded && 'line-clamp-3')}>{plain}</p>
      {plain.length > 150 && (
        <button onClick={() => setExpanded(e => !e)} className="text-xs text-blue-400 hover:text-blue-300 mt-1 flex items-center gap-1">
          {expanded ? <><ChevronUp size={12} /> Visa mindre</> : <><ChevronDown size={12} /> Visa mer</>}
        </button>
      )}
    </div>
  );
}

// Context menu for right-click on posts
function PostContextMenu({ x, y, post, isAdmin, onClose, onDelete, onBan, onWarn, onMessage }: {
  x: number; y: number; post: CommunityPost; isAdmin: boolean;
  onClose: () => void; onDelete: () => void;
  onBan: () => void; onWarn: () => void; onMessage: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [onClose]);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 220),
    left: Math.min(x, window.innerWidth - 200),
    zIndex: 9999,
  };

  return (
    <div ref={ref} style={style} className="w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1.5 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-zinc-800 mb-1">
        <p className="text-xs font-medium text-zinc-300 truncate">{post.displayName}</p>
      </div>
      <button onClick={() => { onMessage(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
        <MessageSquare size={14} className="text-blue-400" /> Skicka meddelande
      </button>
      {isAdmin && (
        <>
          <button onClick={() => { onWarn(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
            <AlertOctagon size={14} className="text-amber-400" /> Varna användaren
          </button>
          <button onClick={() => { onBan(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
            <Ban size={14} className="text-orange-400" /> Spärra användaren
          </button>
          <div className="my-1 border-t border-zinc-800" />
          <button onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 transition-colors">
            <Trash2 size={14} /> Radera inlägg
          </button>
        </>
      )}
    </div>
  );
}

// Upload modal
function UploadModal({ userNotes, monthlyCount, onConfirm, onCancel }: {
  userNotes: Note[]; monthlyCount: number;
  onConfirm: (noteId: string) => void; onCancel: () => void;
}) {
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [step, setStep] = useState<'pick' | 'warn'>('pick');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [uploading, setUploading] = useState(false);
  const timerRef = useRef<any>(null);
  const selectedNote = userNotes.find(n => n.id === selectedNoteId);

  useEffect(() => {
    if (step !== 'warn') return;
    setCountdown(COUNTDOWN_SECONDS);
    let c = COUNTDOWN_SECONDS;
    timerRef.current = setInterval(() => { c--; setCountdown(c); if (c <= 0) clearInterval(timerRef.current); }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {step === 'pick' ? (
          <>
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-base font-semibold text-white">Välj anteckning att dela</h2>
              <p className="text-sm text-zinc-500 mt-1">{MAX_MONTHLY - monthlyCount} av {MAX_MONTHLY} kvar denna månad</p>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto space-y-2">
              {userNotes.filter(n => n.title).map(note => (
                <button key={note.id} onClick={() => setSelectedNoteId(note.id)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    selectedNoteId === note.id ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 hover:border-zinc-600'
                  )}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-800">
                    {note.coverImage || note.attachments.some(a => a.type.startsWith('image/')) ? (
                      <img src={note.coverImage || note.attachments.find(a => a.type.startsWith('image/'))?.data} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-zinc-500">{note.title.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white truncate">{note.title}</p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{note.content.replace(/<[^>]*>/g, '').slice(0, 60) || 'Ingen text...'}</p>
                  </div>
                  {selectedNoteId === note.id && <div className="w-4 h-4 rounded-full bg-blue-500 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-zinc-800 flex gap-3">
              <button onClick={() => selectedNoteId && setStep('warn')} disabled={!selectedNoteId}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-colors">Fortsätt</button>
              <button onClick={onCancel} className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-700">Avbryt</button>
            </div>
          </>
        ) : (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-amber-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Bekräfta delning</h2>
                <p className="text-xs text-zinc-500">Läs igenom noggrant innan du delar</p>
              </div>
            </div>
            {selectedNote && (
              <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl mb-4 border border-zinc-700">
                {selectedNote.coverImage && <img src={selectedNote.coverImage} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                <p className="font-medium text-sm text-white truncate">{selectedNote.title}</p>
              </div>
            )}
            <div className="space-y-2 mb-5">
              {['Anteckningen blir synlig för ALLA inloggade användare.','Du kan inte ångra eller ta bort den efter delning.','Den räknas mot din kvot på 2 uppladdningar per månad.','Dela aldrig personlig eller känslig information.'].map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                  <span className="text-amber-400 shrink-0">⚠</span>{w}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-5 p-3 bg-zinc-800 rounded-xl">
              <Clock size={15} className="text-zinc-500 shrink-0" />
              <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%` }} />
              </div>
              <span className="text-xs font-mono text-zinc-500 w-7 text-right">{countdown}s</span>
            </div>
            <div className="flex gap-3">
              <button onClick={async () => { setUploading(true); await onConfirm(selectedNoteId); setUploading(false); }}
                disabled={countdown > 0 || uploading}
                className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
                  countdown > 0 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}>
                {uploading ? 'Delar...' : countdown > 0 ? `Vänta ${countdown}s...` : '✓ Bekräfta delning'}
              </button>
              <button onClick={() => { setStep('pick'); clearInterval(timerRef.current); }}
                className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-700">Avbryt</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommunityView({ user, userNotes, onClose }: CommunityViewProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; post: CommunityPost } | null>(null);
  const [banTarget, setBanTarget] = useState<CommunityPost | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('1week');
  const [warnTarget, setWarnTarget] = useState<CommunityPost | null>(null);
  const [warnMsg, setWarnMsg] = useState('');
  const [msgTarget, setMsgTarget] = useState<CommunityPost | null>(null);
  const [msgText, setMsgText] = useState('');
  const [myWarning, setMyWarning] = useState<any>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const myBan = bans.find(b => b.uid === user?.uid);
  const isBanned = myBan && (myBan.until === 'forever' || (myBan.until as number) > Date.now());

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'community'), orderBy('createdAt', 'desc')), snap => {
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityPost));
      loaded.sort((a, b) => b.likes.length - a.likes.length);
      setPosts(loaded);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'community_bans'), snap => {
      setBans(snap.docs.map(d => ({ uid: d.id, ...d.data() } as BanRecord)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'community_warnings', user.uid), snap => {
      setMyWarning(snap.exists() ? snap.data() : null);
    });
    return () => unsub();
  }, [user]);

  const monthlyCount = user ? posts.filter(p => {
    if (p.uid !== user.uid) return false;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    return p.createdAt >= startOfMonth;
  }).length : 0;

  const handleLike = async (post: CommunityPost) => {
    if (!user) return;
    const hasLiked = post.likes.includes(user.uid);
    await updateDoc(doc(db, 'community', post.id), { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const handleUpload = async (noteId: string) => {
    if (!noteId || !user || isBanned) return;
    if (monthlyCount >= MAX_MONTHLY) { alert(`Max ${MAX_MONTHLY} uppladdningar per månad.`); return; }
    const note = userNotes.find(n => n.id === noteId);
    if (!note) return;
    try {
      await addDoc(collection(db, 'community'), {
        uid: user.uid, displayName: user.displayName || 'Anonym',
        photoURL: user.photoURL || null, title: note.title || 'Namnlös anteckning',
        content: note.content, coverImage: note.coverImage || null,
        likes: [], createdAt: Date.now(),
      });
    } catch (err) { console.error(err); alert('Kunde inte dela. Försök igen.'); }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, 'community', id));
  };

  const handleBan = async () => {
    if (!isAdmin || !banTarget) return;
    const now = Date.now();
    const until = banDuration === 'forever' ? 'forever'
      : banDuration === '1week' ? now + 7 * 86400000
      : banDuration === '1month' ? now + 30 * 86400000
      : now + 365 * 86400000;
    await setDoc(doc(db, 'community_bans', banTarget.uid), {
      uid: banTarget.uid, email: '', displayName: banTarget.displayName,
      reason: banReason, until, bannedAt: now,
    });
    setBanTarget(null); setBanReason('');
  };

  const handleWarn = async () => {
    if (!isAdmin || !warnTarget) return;
    await setDoc(doc(db, 'community_warnings', warnTarget.uid), {
      uid: warnTarget.uid, name: warnTarget.displayName, message: warnMsg, warnedAt: Date.now(),
    });
    setWarnTarget(null); setWarnMsg('');
  };

  const handleMessage = async () => {
    if (!msgTarget || !user) return;
    await addDoc(collection(db, 'community_messages'), {
      fromUid: user.uid, fromName: user.displayName || 'Anonym',
      toUid: msgTarget.uid, toName: msgTarget.displayName,
      message: msgText, createdAt: Date.now(),
    });
    setMsgTarget(null); setMsgText('');
    alert('Meddelande skickat!');
  };

  const canUpload = monthlyCount < MAX_MONTHLY && !isBanned;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0f0a 100%)' }}>
      {/* Header */}
      <div className="relative px-6 py-5 border-b border-white/5" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 50%, rgba(59,130,246,0.15) 100%)' }}>
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Trophy size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Community</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 rounded-full uppercase tracking-wider">Live</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">Delade anteckningar · sorterade efter likes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => {}}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">
                <Shield size={13} /> Admin
              </button>
            )}
            <button onClick={() => setShowUpload(true)} disabled={!canUpload}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                canUpload
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              )}>
              <Upload size={15} />
              Dela
              <span className="text-xs opacity-70">({monthlyCount}/{MAX_MONTHLY})</span>
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors"><X size={20} /></button>
          </div>
        </div>
      </div>

      {/* Warning banner */}
      {myWarning && (
        <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-3 max-w-4xl mx-auto w-full">
          <AlertOctagon size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">Varning från admin</p>
            <p className="text-xs text-amber-400/70 mt-0.5">{myWarning.message}</p>
          </div>
          <button onClick={() => deleteDoc(doc(db, 'community_warnings', user.uid))} className="text-amber-500 hover:text-amber-300 text-xs">Stäng</button>
        </div>
      )}

      {/* Ban banner */}
      {isBanned && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
          <Ban size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            Du är spärrad från Community.
            {myBan?.until !== 'forever' && ` Upphör ${format(myBan!.until as number, 'd MMM yyyy', { locale: sv })}.`}
            {myBan?.until === 'forever' && ' Permanent spärr.'}
          </p>
        </div>
      )}

      {/* Quota */}
      <div className="px-6 py-2 border-b border-white/5 flex items-center gap-3 max-w-4xl mx-auto w-full">
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_MONTHLY }).map((_, i) => (
            <div key={i} className={cn('w-2 h-2 rounded-full', i < monthlyCount ? 'bg-indigo-500' : 'bg-zinc-700')} />
          ))}
        </div>
        <span className="text-xs text-zinc-600">{monthlyCount}/{MAX_MONTHLY} uppladdningar denna månad</span>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        {loading ? (
          <div className="text-center text-zinc-600 py-20">Laddar...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-indigo-500/10">
              <Trophy size={28} className="text-indigo-400 opacity-50" />
            </div>
            <p className="text-zinc-400 font-medium">Inga inlägg ännu</p>
            <p className="text-zinc-600 text-sm mt-1">Bli den första att dela!</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {posts.map((post, index) => {
              const hasLiked = post.likes.includes(user?.uid);
              const isTop = index < 3;
              const rankGradients = [
                'from-yellow-500/20 to-amber-500/10 border-yellow-500/20',
                'from-zinc-400/10 to-zinc-500/5 border-zinc-500/20',
                'from-orange-500/15 to-amber-500/10 border-orange-500/20',
              ];
              const rankColors = ['text-yellow-400', 'text-zinc-400', 'text-orange-400'];

              return (
                <div
                  key={post.id}
                  onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, post }); }}
                  className={cn(
                    'rounded-2xl border overflow-hidden transition-all hover:border-white/10 cursor-default',
                    isTop
                      ? `bg-gradient-to-br ${rankGradients[index]} border`
                      : 'bg-white/3 border-white/5 hover:bg-white/5'
                  )}
                  style={{ background: isTop ? undefined : 'rgba(255,255,255,0.02)' }}
                >
                  {post.coverImage && (
                    <div className="relative h-44 overflow-hidden">
                      <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      {isTop && (
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0', rankColors[index])}>
                          {index === 0 ? <Crown size={16} /> : index + 1}
                        </div>
                      )}
                      {post.photoURL
                        ? <img src={post.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-white/10 shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">{post.displayName.charAt(0)}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-white truncate">{post.displayName}</p>
                          {post.uid === ADMIN_EMAIL && <Shield size={11} className="text-red-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-zinc-600">{format(post.createdAt, 'd MMM · HH:mm', { locale: sv })}</p>
                      </div>
                      <button onClick={() => handleLike(post)}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                          hasLiked
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-white/5 text-zinc-400 border border-white/10 hover:border-red-500/30 hover:text-red-400'
                        )}>
                        <Heart size={13} className={cn(hasLiked && 'fill-red-400')} />
                        {post.likes.length}
                      </button>
                    </div>
                    <h3 className="font-semibold text-white text-base leading-snug">{post.title}</h3>
                    <PostContent content={post.content} title={post.title} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <PostContextMenu
          x={ctxMenu.x} y={ctxMenu.y} post={ctxMenu.post} isAdmin={isAdmin}
          onClose={() => setCtxMenu(null)}
          onDelete={() => handleDelete(ctxMenu.post.id)}
          onBan={() => setBanTarget(ctxMenu.post)}
          onWarn={() => setWarnTarget(ctxMenu.post)}
          onMessage={() => setMsgTarget(ctxMenu.post)}
        />
      )}

      {showUpload && <UploadModal userNotes={userNotes} monthlyCount={monthlyCount} onConfirm={async (id) => { await handleUpload(id); setShowUpload(false); }} onCancel={() => setShowUpload(false)} />}

      {/* Ban modal */}
      {banTarget && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-white mb-1">Spärra {banTarget.displayName}</h3>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Anledning..." rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none mb-3 resize-none mt-3" />
            <select value={banDuration} onChange={e => setBanDuration(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none mb-4">
              <option value="1week">1 vecka</option>
              <option value="1month">1 månad</option>
              <option value="1year">1 år</option>
              <option value="forever">För alltid</option>
            </select>
            <div className="flex gap-3">
              <button onClick={handleBan} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Spärra</button>
              <button onClick={() => setBanTarget(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium">Avbryt</button>
            </div>
          </div>
        </div>
      )}

      {/* Warn modal */}
      {warnTarget && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-white mb-3">Varna {warnTarget.displayName}</h3>
            <textarea value={warnMsg} onChange={e => setWarnMsg(e.target.value)} placeholder="Varningsmeddelande..." rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none mb-4 resize-none" />
            <div className="flex gap-3">
              <button onClick={handleWarn} className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">Skicka varning</button>
              <button onClick={() => setWarnTarget(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium">Avbryt</button>
            </div>
          </div>
        </div>
      )}

      {/* Message modal */}
      {msgTarget && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-white mb-1">Meddelande till {msgTarget.displayName}</h3>
            <p className="text-xs text-zinc-500 mb-3">Meddelandet sparas och visas för mottagaren.</p>
            <textarea value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Skriv ditt meddelande..." rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none mb-4 resize-none" />
            <div className="flex gap-3">
              <button onClick={handleMessage} disabled={!msgText.trim()} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-40">Skicka</button>
              <button onClick={() => setMsgTarget(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium">Avbryt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
