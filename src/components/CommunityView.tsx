import React, { useState, useEffect, useRef } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove,
  addDoc, query, orderBy, setDoc, getDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Heart, Upload, Trophy, X, User, AlertTriangle, Clock,
  Shield, Trash2, AlertOctagon, Ban, ChevronDown, ChevronUp, Eye
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

// Renders post content: if it looks like HTML/SVG, show live preview
function ContentPreview({ content, title }: { content: string; title: string }) {
  const isCode = /<[a-z][\s\S]*>/i.test(content);
  const [expanded, setExpanded] = useState(false);

  if (isCode) {
    const doc = `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff;}</style></head><body>${content}</body></html>`;
    return (
      <div className="mt-3">
        <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white" style={{ height: 220 }}>
          <iframe srcDoc={doc} title={title} className="w-full h-full border-none" sandbox="allow-scripts" />
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] rounded-full font-mono">LIVE</div>
        </div>
      </div>
    );
  }

  const plain = content.replace(/<[^>]*>/g, '');
  return (
    <div className="mt-2">
      <p className={cn('text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed', !expanded && 'line-clamp-3')}>{plain}</p>
      {plain.length > 150 && (
        <button onClick={() => setExpanded(e => !e)} className="text-xs text-blue-500 hover:text-blue-400 mt-1 flex items-center gap-1">
          {expanded ? <><ChevronUp size={12} /> Visa mindre</> : <><ChevronDown size={12} /> Visa mer</>}
        </button>
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
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        {step === 'pick' ? (
          <>
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Välj anteckning att dela</h2>
              <p className="text-sm text-zinc-500 mt-1">{MAX_MONTHLY - monthlyCount} av {MAX_MONTHLY} kvar denna månad</p>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto space-y-2">
              {userNotes.filter(n => n.title).map(note => (
                <button key={note.id} onClick={() => setSelectedNoteId(note.id)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    selectedNoteId === note.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'
                  )}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                    {note.coverImage || note.attachments.some(a => a.type.startsWith('image/')) ? (
                      <img src={note.coverImage || note.attachments.find(a => a.type.startsWith('image/'))?.data} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-zinc-400">{note.title.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{note.title}</p>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{note.content.replace(/<[^>]*>/g, '').slice(0, 60) || 'Ingen text...'}</p>
                  </div>
                  {selectedNoteId === note.id && <div className="w-4 h-4 rounded-full bg-blue-500 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
              <button onClick={() => selectedNoteId && setStep('warn')} disabled={!selectedNoteId}
                className="flex-1 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-medium disabled:opacity-40">Fortsätt</button>
              <button onClick={onCancel} className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium">Avbryt</button>
            </div>
          </>
        ) : (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-amber-500" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-white">Bekräfta delning</h2>
                <p className="text-xs text-zinc-500">Läs igenom noggrant</p>
              </div>
            </div>
            {selectedNote && (
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl mb-4 border border-zinc-200 dark:border-zinc-700">
                {selectedNote.coverImage && <img src={selectedNote.coverImage} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{selectedNote.title}</p>
              </div>
            )}
            <div className="space-y-2 mb-5">
              {['Anteckningen blir synlig för ALLA inloggade användare.','Du kan inte ångra eller ta bort den efter delning.','Den räknas mot din kvot på 2 uppladdningar per månad.','Dela aldrig personlig eller känslig information.'].map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="text-amber-500 shrink-0">⚠</span>{w}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-5 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
              <Clock size={15} className="text-zinc-400 shrink-0" />
              <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%` }} />
              </div>
              <span className="text-xs font-mono text-zinc-500 w-7 text-right">{countdown}s</span>
            </div>
            <div className="flex gap-3">
              <button onClick={async () => { setUploading(true); await onConfirm(selectedNoteId); setUploading(false); }}
                disabled={countdown > 0 || uploading}
                className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
                  countdown > 0 ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}>
                {uploading ? 'Delar...' : countdown > 0 ? `Vänta ${countdown}s...` : '✓ Bekräfta delning'}
              </button>
              <button onClick={() => { setStep('pick'); clearInterval(timerRef.current); }}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium">Avbryt</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Admin panel
function AdminPanel({ posts, bans, onDelete, onBan, onWarn, onUnban, onClose }: {
  posts: CommunityPost[]; bans: BanRecord[];
  onDelete: (id: string) => void; onBan: (uid: string, email: string, name: string, reason: string, duration: string) => void;
  onWarn: (uid: string, name: string, msg: string) => void; onUnban: (uid: string) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<'posts' | 'bans'>('posts');
  const [banTarget, setBanTarget] = useState<CommunityPost | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('1week');
  const [warnTarget, setWarnTarget] = useState<CommunityPost | null>(null);
  const [warnMsg, setWarnMsg] = useState('');

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-zinc-950 text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-red-400" />
          <h1 className="text-lg font-bold">Admin Panel</h1>
          <span className="text-xs px-2 py-0.5 bg-red-900/50 text-red-400 rounded-full border border-red-800">ADMIN</span>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"><X size={20} /></button>
      </div>

      <div className="flex border-b border-zinc-800">
        {(['posts', 'bans'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-6 py-3 text-sm font-medium transition-colors border-b-2',
              tab === t ? 'border-red-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}>
            {t === 'posts' ? `Inlägg (${posts.length})` : `Spärrade (${bans.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'posts' && (
          <div className="space-y-3 max-w-3xl mx-auto">
            {posts.map(post => (
              <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-4">
                {post.coverImage && <img src={post.coverImage} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{post.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{post.displayName} · {format(post.createdAt, 'd MMM yyyy', { locale: sv })} · {post.likes.length} likes</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setWarnTarget(post)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-900/30 text-amber-400 border border-amber-800 rounded-lg hover:bg-amber-900/50">
                    <AlertOctagon size={13} /> Varna
                  </button>
                  <button onClick={() => setBanTarget(post)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-900/30 text-orange-400 border border-orange-800 rounded-lg hover:bg-orange-900/50">
                    <Ban size={13} /> Spärra
                  </button>
                  <button onClick={() => onDelete(post.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-900/30 text-red-400 border border-red-800 rounded-lg hover:bg-red-900/50">
                    <Trash2 size={13} /> Radera
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'bans' && (
          <div className="space-y-3 max-w-3xl mx-auto">
            {bans.length === 0 && <p className="text-zinc-500 text-center py-12">Inga spärrade användare.</p>}
            {bans.map(ban => (
              <div key={ban.uid} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{ban.displayName}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{ban.email} · Anledning: {ban.reason}</p>
                  <p className="text-xs text-red-400 mt-0.5">
                    Spärrad till: {ban.until === 'forever' ? 'För alltid' : format(ban.until as number, 'd MMM yyyy', { locale: sv })}
                  </p>
                </div>
                <button onClick={() => onUnban(ban.uid)}
                  className="px-3 py-1.5 text-xs bg-green-900/30 text-green-400 border border-green-800 rounded-lg hover:bg-green-900/50">
                  Häv spärr
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ban modal */}
      {banTarget && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-white mb-1">Spärra {banTarget.displayName}</h3>
            <p className="text-xs text-zinc-500 mb-4">Användaren kan inte posta i Community under spärrtiden.</p>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Anledning..." rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none mb-3 resize-none" />
            <select value={banDuration} onChange={e => setBanDuration(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none mb-4">
              <option value="1week">1 vecka</option>
              <option value="1month">1 månad</option>
              <option value="1year">1 år</option>
              <option value="forever">För alltid</option>
            </select>
            <div className="flex gap-3">
              <button onClick={() => { onBan(banTarget.uid, banTarget.displayName, banTarget.displayName, banReason, banDuration); setBanTarget(null); setBanReason(''); }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Spärra</button>
              <button onClick={() => setBanTarget(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium">Avbryt</button>
            </div>
          </div>
        </div>
      )}

      {/* Warn modal */}
      {warnTarget && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-white mb-1">Varna {warnTarget.displayName}</h3>
            <textarea value={warnMsg} onChange={e => setWarnMsg(e.target.value)} placeholder="Varningsmeddelande..." rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none mb-4 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => { onWarn(warnTarget.uid, warnTarget.displayName, warnMsg); setWarnTarget(null); setWarnMsg(''); }}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">Skicka varning</button>
              <button onClick={() => setWarnTarget(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium">Avbryt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityView({ user, userNotes, onClose }: CommunityViewProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [warnings, setWarnings] = useState<{ uid: string; message: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Check if current user is banned
  const myBan = bans.find(b => b.uid === user?.uid);
  const isBanned = myBan && (myBan.until === 'forever' || (myBan.until as number) > Date.now());

  // My warning
  const myWarning = warnings.find(w => w.uid === user?.uid);

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
      if (snap.exists()) setWarnings([{ uid: user.uid, ...snap.data() } as any]);
      else setWarnings([]);
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
    const ref = doc(db, 'community', post.id);
    const hasLiked = post.likes.includes(user.uid);
    await updateDoc(ref, { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const handleUpload = async (noteId: string) => {
    if (!noteId || !user) return;
    if (isBanned) { alert('Du är spärrad från Community.'); return; }
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
      setShowUpload(false);
    } catch (err) { console.error(err); alert('Kunde inte dela. Försök igen.'); }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, 'community', id));
  };

  const handleBan = async (uid: string, email: string, name: string, reason: string, duration: string) => {
    if (!isAdmin) return;
    const now = Date.now();
    const until = duration === 'forever' ? 'forever'
      : duration === '1week' ? now + 7 * 24 * 60 * 60 * 1000
      : duration === '1month' ? now + 30 * 24 * 60 * 60 * 1000
      : now + 365 * 24 * 60 * 60 * 1000;
    await setDoc(doc(db, 'community_bans', uid), { uid, email, displayName: name, reason, until, bannedAt: now });
  };

  const handleWarn = async (uid: string, name: string, message: string) => {
    if (!isAdmin) return;
    await setDoc(doc(db, 'community_warnings', uid), { uid, name, message, warnedAt: Date.now() });
  };

  const handleUnban = async (uid: string) => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, 'community_bans', uid));
  };

  const dismissWarning = async () => {
    if (!user) return;
    await deleteDoc(doc(db, 'community_warnings', user.uid));
  };

  const canUpload = monthlyCount < MAX_MONTHLY && !isBanned;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Trophy size={22} className="text-yellow-400" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Community</h1>
            <p className="text-xs text-zinc-500">Delade anteckningar · sorterade efter likes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={() => setShowAdmin(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-900/40 text-red-400 border border-red-800 rounded-lg hover:bg-red-900/60">
              <Shield size={14} /> Admin
            </button>
          )}
          <button onClick={() => setShowUpload(true)} disabled={!canUpload}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              canUpload ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            )}>
            <Upload size={15} />
            Dela
            <span className="text-xs opacity-70">({monthlyCount}/{MAX_MONTHLY})</span>
          </button>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"><X size={20} /></button>
        </div>
      </div>

      {/* Warning banner */}
      {myWarning && (
        <div className="px-6 py-3 bg-amber-900/30 border-b border-amber-800 flex items-start gap-3">
          <AlertOctagon size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">Du har fått en varning från admin</p>
            <p className="text-xs text-amber-400/80 mt-0.5">{(myWarning as any).message}</p>
          </div>
          <button onClick={dismissWarning} className="text-amber-500 hover:text-amber-300 text-xs underline shrink-0">Stäng</button>
        </div>
      )}

      {/* Ban banner */}
      {isBanned && (
        <div className="px-6 py-3 bg-red-900/30 border-b border-red-800 flex items-center gap-3">
          <Ban size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            Du är spärrad från Community.
            {myBan?.until !== 'forever' && ` Spärren upphör ${format(myBan!.until as number, 'd MMM yyyy', { locale: sv })}.`}
            {myBan?.until === 'forever' && ' Permanent spärr.'}
          </p>
        </div>
      )}

      {/* Quota bar */}
      <div className="px-6 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center gap-3">
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_MONTHLY }).map((_, i) => (
            <div key={i} className={cn('w-2.5 h-2.5 rounded-full', i < monthlyCount ? 'bg-blue-500' : 'bg-zinc-700')} />
          ))}
        </div>
        <span className="text-xs text-zinc-500">{monthlyCount}/{MAX_MONTHLY} uppladdningar denna månad</span>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-zinc-500 py-20">Laddar...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-zinc-500 py-20">
            <Trophy size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-lg font-medium">Inga inlägg ännu</p>
            <p className="text-sm mt-1">Bli den första att dela!</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {posts.map((post, index) => {
              const hasLiked = post.likes.includes(user?.uid);
              const rankColors = ['text-yellow-400', 'text-zinc-400', 'text-orange-400'];
              const rankBg = ['bg-yellow-400/10 border-yellow-400/20', 'bg-zinc-400/10 border-zinc-400/20', 'bg-orange-400/10 border-orange-400/20'];
              return (
                <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
                  {post.coverImage && <img src={post.coverImage} alt="" className="w-full h-48 object-cover" />}
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      {index < 3 && (
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border shrink-0', rankBg[index], rankColors[index])}>
                          {index + 1}
                        </div>
                      )}
                      {post.photoURL
                        ? <img src={post.photoURL} alt="" className="w-8 h-8 rounded-full shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0"><User size={15} className="text-zinc-400" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{post.displayName}</p>
                        <p className="text-xs text-zinc-500">{format(post.createdAt, 'd MMM yyyy · HH:mm', { locale: sv })}</p>
                      </div>
                      <button onClick={() => handleLike(post)}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                          hasLiked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-red-500/30 hover:text-red-400'
                        )}>
                        <Heart size={14} className={cn(hasLiked && 'fill-red-400')} />
                        {post.likes.length}
                      </button>
                    </div>
                    <h3 className="font-semibold text-white text-base mb-1">{post.title}</h3>
                    <ContentPreview content={post.content} title={post.title} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal userNotes={userNotes} monthlyCount={monthlyCount} onConfirm={handleUpload} onCancel={() => setShowUpload(false)} />
      )}

      {showAdmin && isAdmin && (
        <AdminPanel posts={posts} bans={bans} onDelete={handleDelete} onBan={handleBan} onWarn={handleWarn} onUnban={handleUnban} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
}
