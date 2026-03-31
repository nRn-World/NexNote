import React, { useState, useEffect, useRef } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove,
  addDoc, query, orderBy, setDoc, deleteDoc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Heart, Upload, Trophy, X, User, AlertTriangle, Clock,
  Trash2, AlertOctagon, Ban, Copy, Check, Code2, Eye, EyeOff,
  UserPlus, UserCheck, MessageSquare, Search, TrendingUp, Users, Crown
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
  fullCode?: string;
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

function decodeContent(raw: string): string {
  if (raw.startsWith('<!DOCTYPE') || raw.startsWith('<html')) return raw;
  let d = raw.replace(/<p>([\s\S]*?)<\/p>/g, '$1\n');
  d = d.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
       .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
  d = d.replace(/<a[^>]*>(.*?)<\/a>/g,'$1');
  return d.trim();
}

function LivePreview({ content, title }: { content: string; title: string }) {
  const decoded = decodeContent(content);
  const doc = `<!DOCTYPE html><html><head><style>*{box-sizing:border-box;margin:0;padding:0;}html,body{width:100%;height:100%;overflow:hidden;background:#0a0a0f;}</style></head><body>${decoded}</body></html>`;
  return (
    <div className="relative w-full h-full bg-zinc-950">
      <iframe srcDoc={doc} title={title} className="w-full h-full border-none block"
        sandbox="allow-scripts allow-same-origin" style={{ display: 'block' }} />
      <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/70 text-green-400 text-[9px] rounded-full font-mono border border-green-500/20 pointer-events-none">
        <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" /> LIVE
      </div>
    </div>
  );
}

// Post card — CodePen style
function PostCard({ post, index, userId, isAdmin, following, onLike, onFollow, onContextMenu, onExpand }: {
  post: CommunityPost; index: number; userId: string; isAdmin: boolean;
  following: string[]; onLike: () => void; onFollow: () => void;
  onContextMenu: (e: React.MouseEvent) => void; onExpand: () => void;
}) {
  const hasLiked = post.likes.includes(userId);
  const isFollowing = following.includes(post.uid);
  const isOwn = post.uid === userId;
  const decoded = decodeContent(post.fullCode || post.content);

  return (
    <div
      onContextMenu={onContextMenu}
      className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all duration-200 cursor-pointer"
    >
      {/* Preview area */}
      <div className="relative overflow-hidden" style={{ paddingBottom: '62%' }} onClick={onExpand}>
        <div className="absolute inset-0">
          <LivePreview content={decoded} title={post.title} />
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs font-medium border border-white/10">
            <Eye size={12} /> Visa fullskärm
          </div>
        </div>
        {/* Rank badge */}
        {index < 3 && (
          <div className={cn('absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border',
            index === 0 ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' :
            index === 1 ? 'bg-zinc-400/20 border-zinc-400/40 text-zinc-300' :
            'bg-orange-500/20 border-orange-500/40 text-orange-400'
          )}>
            {index === 0 ? <Crown size={12} /> : index + 1}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3">
        <p className="text-sm font-medium text-white truncate mb-2 leading-snug">{post.title}</p>
        <div className="flex items-center gap-2">
          {post.photoURL
            ? <img src={post.photoURL} alt="" className="w-6 h-6 rounded-full ring-1 ring-white/10 shrink-0" />
            : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 text-[10px] font-bold text-white">{post.displayName.charAt(0)}</div>
          }
          <span className="text-xs text-zinc-400 truncate flex-1">{post.displayName}</span>
          {!isOwn && (
            <button onClick={e => { e.stopPropagation(); onFollow(); }}
              className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border shrink-0',
                isFollowing
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400'
              )}>
              {isFollowing ? <UserCheck size={9} /> : <UserPlus size={9} />}
              {isFollowing ? 'Följer' : 'Följ'}
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onLike(); }}
            className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border shrink-0',
              hasLiked
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/30'
            )}>
            <Heart size={9} className={cn(hasLiked && 'fill-red-400')} />
            {post.likes.length}
          </button>
        </div>
      </div>
    </div>
  );
}

// Expanded post modal
function PostModal({ post, userId, isAdmin, following, onLike, onFollow, onClose, onContextMenu }: {
  post: CommunityPost; userId: string; isAdmin: boolean; following: string[];
  onLike: () => void; onFollow: () => void; onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const [copied, setCopied] = useState(false);
  const decoded = decodeContent(post.fullCode || post.content);
  const hasLiked = post.likes.includes(userId);
  const isFollowing = following.includes(post.uid);
  const isOwn = post.uid === userId;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(decoded);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            {post.photoURL
              ? <img src={post.photoURL} alt="" className="w-8 h-8 rounded-full ring-1 ring-white/10" />
              : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">{post.displayName.charAt(0)}</div>
            }
            <div>
              <p className="text-sm font-medium text-white">{post.displayName}</p>
              <p className="text-xs text-zinc-500">{format(post.createdAt, 'd MMM yyyy · HH:mm', { locale: sv })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors">
              {copied ? <><Check size={12} className="text-green-400" /> Kopierad</> : <><Copy size={12} /> Kopiera kod</>}
            </button>
            {!isOwn && (
              <button onClick={onFollow} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
                isFollowing ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-500/30 hover:text-indigo-400'
              )}>
                {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
                {isFollowing ? 'Följer' : 'Följ'}
              </button>
            )}
            <button onClick={onLike} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
              hasLiked ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-red-400'
            )}>
              <Heart size={12} className={cn(hasLiked && 'fill-red-400')} /> {post.likes.length}
            </button>
            <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg"><X size={16} /></button>
          </div>
        </div>
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-white">{post.title}</h2>
        </div>
        <div className="flex-1 min-h-0" style={{ height: '60vh' }}>
          <LivePreview content={decoded} title={post.title} />
        </div>
      </div>
    </div>
  );
}

// Context menu
function PostContextMenu({ x, y, post, isAdmin, onClose, onDelete, onBan, onWarn, onMessage }: {
  x: number; y: number; post: CommunityPost; isAdmin: boolean;
  onClose: () => void; onDelete: () => void; onBan: () => void; onWarn: () => void; onMessage: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [onClose]);
  const style: React.CSSProperties = { position: 'fixed', top: Math.min(y, window.innerHeight - 200), left: Math.min(x, window.innerWidth - 200), zIndex: 9999 };
  return (
    <div ref={ref} style={style} className="w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1.5 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-zinc-800 mb-1">
        <p className="text-xs font-medium text-zinc-300 truncate">{post.displayName}</p>
      </div>
      {isAdmin && <>
        <button onClick={() => { onMessage(); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
          <MessageSquare size={13} className="text-blue-400" /> Skicka meddelande
        </button>
        <button onClick={() => { onWarn(); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
          <AlertOctagon size={13} className="text-amber-400" /> Varna användaren
        </button>
        <button onClick={() => { onBan(); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
          <Ban size={13} className="text-orange-400" /> Spärra användaren
        </button>
        <div className="my-1 border-t border-zinc-800" />
        <button onClick={() => { onDelete(); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20">
          <Trash2 size={13} /> Radera inlägg
        </button>
      </>}
    </div>
  );
}

// Warning banner with reply
function WarningBanner({ warning, userId, onDismiss }: { warning: any; userId: string; onDismiss: () => void }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sent, setSent] = useState(false);
  const handleReply = async () => {
    if (!replyText.trim()) return;
    await addDoc(collection(db, 'community_messages'), {
      fromUid: userId, fromName: warning.name || 'Användare',
      toUid: ADMIN_EMAIL, toName: 'Admin',
      message: replyText, isReply: true, replyToWarning: warning.message, createdAt: Date.now(),
    });
    setSent(true); setReplyText(''); setTimeout(() => setShowReply(false), 2000);
  };
  return (
    <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20">
      <div className="flex items-start gap-3 max-w-4xl mx-auto">
        <AlertOctagon size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-300">Varning från admin</p>
          <p className="text-xs text-amber-400/70 mt-0.5">{warning.message}</p>
          {!showReply && !sent && <button onClick={() => setShowReply(true)} className="text-xs text-blue-400 hover:text-blue-300 mt-1.5 underline">Svara på varningen</button>}
          {showReply && (
            <div className="mt-2 flex gap-2">
              <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Skriv ditt svar..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none" />
              <button onClick={handleReply} disabled={!replyText.trim()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg disabled:opacity-40">Skicka</button>
              <button onClick={() => setShowReply(false)} className="px-2 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded-lg">Avbryt</button>
            </div>
          )}
          {sent && <p className="text-xs text-green-400 mt-1">Svar skickat.</p>}
        </div>
        <button onClick={onDismiss} className="text-amber-500 hover:text-amber-300 text-xs shrink-0">Stäng</button>
      </div>
    </div>
  );
}

// Upload modal
function UploadModal({ userNotes, monthlyCount, onConfirm, onCancel }: {
  userNotes: Note[]; monthlyCount: number; onConfirm: (noteId: string) => void; onCancel: () => void;
}) {
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [step, setStep] = useState<'pick' | 'warn'>('pick');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [uploading, setUploading] = useState(false);
  const timerRef = useRef<any>(null);
  const selectedNote = userNotes.find(n => n.id === selectedNoteId);
  useEffect(() => {
    if (step !== 'warn') return;
    setCountdown(COUNTDOWN_SECONDS); let c = COUNTDOWN_SECONDS;
    timerRef.current = setInterval(() => { c--; setCountdown(c); if (c <= 0) clearInterval(timerRef.current); }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {step === 'pick' ? (
          <>
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-base font-semibold text-white">Välj kod att dela</h2>
              <p className="text-sm text-zinc-500 mt-1">{MAX_MONTHLY - monthlyCount} av {MAX_MONTHLY} kvar denna månad · Endast anteckningar med kodredigerare</p>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto space-y-2">
              {userNotes.filter(n => n.title && n.code).length === 0
                ? <p className="text-sm text-zinc-500 text-center py-8">Inga anteckningar med kodredigerare hittades.</p>
                : userNotes.filter(n => n.title && n.code).map(note => (
                  <button key={note.id} onClick={() => setSelectedNoteId(note.id)}
                    className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      selectedNoteId === note.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-800 hover:border-zinc-600'
                    )}>
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center">
                      {note.coverImage ? <img src={note.coverImage} alt="" className="w-full h-full object-cover" /> : <Code2 size={20} className="text-zinc-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-white truncate">{note.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">HTML · CSS · JS</p>
                    </div>
                    {selectedNoteId === note.id && <div className="w-4 h-4 rounded-full bg-indigo-500 shrink-0" />}
                  </button>
                ))
              }
            </div>
            <div className="p-4 border-t border-zinc-800 flex gap-3">
              <button onClick={() => selectedNoteId && setStep('warn')} disabled={!selectedNoteId}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-colors">Fortsätt</button>
              <button onClick={onCancel} className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-700">Avbryt</button>
            </div>
          </>
        ) : (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0"><AlertTriangle size={20} className="text-amber-400" /></div>
              <div><h2 className="font-semibold text-white">Bekräfta delning</h2><p className="text-xs text-zinc-500">Läs igenom noggrant</p></div>
            </div>
            {selectedNote && (
              <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl mb-4 border border-zinc-700">
                <Code2 size={16} className="text-indigo-400 shrink-0" />
                <p className="font-medium text-sm text-white truncate">{selectedNote.title}</p>
              </div>
            )}
            <div className="space-y-2 mb-5">
              {['Koden blir synlig för ALLA inloggade användare.','Du kan inte ångra eller ta bort den efter delning.','Den räknas mot din kvot på 2 uppladdningar per månad.','Dela aldrig personlig eller känslig information.'].map((w,i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-zinc-400"><span className="text-amber-400 shrink-0">⚠</span>{w}</div>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-5 p-3 bg-zinc-800 rounded-xl">
              <Clock size={14} className="text-zinc-500 shrink-0" />
              <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%` }} />
              </div>
              <span className="text-xs font-mono text-zinc-500 w-7 text-right">{countdown}s</span>
            </div>
            <div className="flex gap-3">
              <button onClick={async () => { setUploading(true); await onConfirm(selectedNoteId); setUploading(false); }}
                disabled={countdown > 0 || uploading}
                className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
                  countdown > 0 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
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
  const [following, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [expandedPost, setExpandedPost] = useState<CommunityPost | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; post: CommunityPost } | null>(null);
  const [banTarget, setBanTarget] = useState<CommunityPost | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('1week');
  const [warnTarget, setWarnTarget] = useState<CommunityPost | null>(null);
  const [warnMsg, setWarnMsg] = useState('');
  const [msgTarget, setMsgTarget] = useState<CommunityPost | null>(null);
  const [msgText, setMsgText] = useState('');
  const [myWarning, setMyWarning] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'following'>('trending');

  const isAdmin = user?.email === ADMIN_EMAIL;
  const myBan = bans.find(b => b.uid === user?.uid);
  const isBanned = myBan && (myBan.until === 'forever' || (myBan.until as number) > Date.now());

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'community'), orderBy('createdAt', 'desc')), snap => {
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityPost));
      loaded.sort((a, b) => b.likes.length - a.likes.length);
      setPosts(loaded); setLoading(false);
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
    const ref = doc(db, 'community_following', user.uid);
    const unsub = onSnapshot(ref,
      snap => { setFollowing(snap.exists() ? (snap.data()?.uids || []) : []); },
      err => { console.warn('Following read failed:', err.code); setFollowing([]); }
    );
    return () => unsub();
  }, [user]);

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

  const handleFollow = async (targetUid: string) => {
    if (!user || !targetUid || targetUid === user.uid) return;
    const ref = doc(db, 'community_following', user.uid);
    const isNowFollowing = following.includes(targetUid);
    const newList = isNowFollowing
      ? following.filter(u => u !== targetUid)
      : [...following, targetUid];
    setFollowing(newList);
    try {
      await setDoc(ref, { uids: newList });
    } catch (err) {
      setFollowing(following);
      console.error('Follow failed:', err);
    }
  };

  const handleUpload = async (noteId: string) => {
    if (!noteId || !user || isBanned) return;
    if (monthlyCount >= MAX_MONTHLY) { alert(`Max ${MAX_MONTHLY} uppladdningar per månad.`); return; }
    const note = userNotes.find(n => n.id === noteId);
    if (!note?.code) return;
    const fullCode = `<!DOCTYPE html><html><head><style>${note.code.css||''}</style></head><body>${note.code.html||''}<script>${note.code.js||''}<\/script></body></html>`;
    try {
      await addDoc(collection(db, 'community'), {
        uid: user.uid, displayName: user.displayName || 'Anonym',
        photoURL: user.photoURL || null, title: note.title || 'Namnlös',
        content: note.code.html || '', fullCode,
        coverImage: note.coverImage || null, likes: [], createdAt: Date.now(),
      });
      setShowUpload(false);
    } catch (err) { console.error(err); alert('Kunde inte dela.'); }
  };

  const handleDelete = async (id: string) => { if (isAdmin) await deleteDoc(doc(db, 'community', id)); };
  const handleBan = async () => {
    if (!isAdmin || !banTarget) return;
    const now = Date.now();
    const until = banDuration === 'forever' ? 'forever' : banDuration === '1week' ? now + 7*86400000 : banDuration === '1month' ? now + 30*86400000 : now + 365*86400000;
    await setDoc(doc(db, 'community_bans', banTarget.uid), { uid: banTarget.uid, email: '', displayName: banTarget.displayName, reason: banReason, until, bannedAt: now });
    setBanTarget(null); setBanReason('');
  };
  const handleWarn = async () => {
    if (!isAdmin || !warnTarget) return;
    await setDoc(doc(db, 'community_warnings', warnTarget.uid), { uid: warnTarget.uid, name: warnTarget.displayName, message: warnMsg, warnedAt: Date.now() });
    setWarnTarget(null); setWarnMsg('');
  };
  const handleMessage = async () => {
    if (!msgTarget || !user) return;
    await addDoc(collection(db, 'community_messages'), { fromUid: user.uid, fromName: user.displayName || 'Admin', toUid: msgTarget.uid, toName: msgTarget.displayName, message: msgText, isReply: false, createdAt: Date.now() });
    setMsgTarget(null); setMsgText(''); alert('Meddelande skickat!');
  };

  const canUpload = monthlyCount < MAX_MONTHLY && !isBanned;

  const filteredPosts = posts.filter(p => {
    const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTab = activeTab === 'trending' || (activeTab === 'following' && following.length > 0 && following.includes(p.uid));
    return matchSearch && matchTab;
  });

  // People to follow (users not yet followed, excluding self)
  const uniqueUsers = Array.from(new Map(posts.filter(p => p.uid !== user?.uid && !following.includes(p.uid)).map(p => [p.uid, p])).values()).slice(0, 6);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col" style={{ background: '#0d0d0d' }}>
      {/* Top nav */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Trophy size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">NexNote Community</span>
          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500/15 text-green-400 border border-green-500/25 rounded-full uppercase tracking-wider">Live</span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
          {([['trending', 'Trending', TrendingUp], ['following', 'Följer', Users]] as const).map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeTab === tab ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Sök..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowUpload(true)} disabled={!canUpload}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              canUpload ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            )}>
            <Upload size={13} /> Dela kod
            <span className="opacity-60">({monthlyCount}/{MAX_MONTHLY})</span>
          </button>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"><X size={18} /></button>
        </div>
      </div>

      {myWarning && <WarningBanner warning={myWarning} userId={user?.uid} onDismiss={() => deleteDoc(doc(db, 'community_warnings', user.uid))} />}
      {isBanned && (
        <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
          <Ban size={14} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-300">Du är spärrad från Community.{myBan?.until !== 'forever' && ` Upphör ${format(myBan!.until as number, 'd MMM yyyy', { locale: sv })}.`}</p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">Laddar...</div>
        ) : (
          <div className="max-w-6xl mx-auto px-6 py-6">
            {/* People to follow */}
            {activeTab === 'trending' && uniqueUsers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                  <Users size={12} /> Intressanta att följa
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {uniqueUsers.map(p => (
                    <div key={p.uid} className="flex items-center gap-2.5 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl shrink-0 hover:border-zinc-700 transition-colors">
                      {p.photoURL
                        ? <img src={p.photoURL} alt="" className="w-7 h-7 rounded-full ring-1 ring-white/10" />
                        : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">{p.displayName.charAt(0)}</div>
                      }
                      <div>
                        <p className="text-xs font-medium text-white">{p.displayName}</p>
                        <p className="text-[10px] text-zinc-500">{posts.filter(x => x.uid === p.uid).length} inlägg</p>
                      </div>
                      <button onClick={() => handleFollow(p.uid)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-medium rounded-full transition-colors ml-1">
                        <UserPlus size={9} /> Följ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid */}
            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
                <Trophy size={40} className="mb-3 opacity-20" />
                <p className="text-sm">{activeTab === 'following' ? 'Följ användare för att se deras inlägg här.' : 'Inga inlägg ännu.'}</p>
              </div>
            ) : (
              <>
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                  <TrendingUp size={12} /> {activeTab === 'trending' ? 'Trending' : 'Från dem du följer'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPosts.map((post, i) => (
                    <PostCard
                      key={post.id} post={post} index={i}
                      userId={user?.uid || ''} isAdmin={isAdmin}
                      following={following}
                      onLike={() => handleLike(post)}
                      onFollow={() => handleFollow(post.uid)}
                      onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, post }); }}
                      onExpand={() => setExpandedPost(post)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {expandedPost && (
        <PostModal post={expandedPost} userId={user?.uid || ''} isAdmin={isAdmin} following={following}
          onLike={() => handleLike(expandedPost)} onFollow={() => handleFollow(expandedPost.uid)}
          onClose={() => setExpandedPost(null)}
          onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, post: expandedPost }); }}
        />
      )}

      {ctxMenu && <PostContextMenu x={ctxMenu.x} y={ctxMenu.y} post={ctxMenu.post} isAdmin={isAdmin}
        onClose={() => setCtxMenu(null)} onDelete={() => handleDelete(ctxMenu.post.id)}
        onBan={() => setBanTarget(ctxMenu.post)} onWarn={() => setWarnTarget(ctxMenu.post)}
        onMessage={() => setMsgTarget(ctxMenu.post)} />}

      {showUpload && <UploadModal userNotes={userNotes} monthlyCount={monthlyCount} onConfirm={async id => { await handleUpload(id); setShowUpload(false); }} onCancel={() => setShowUpload(false)} />}

      {banTarget && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-white mb-3">Spärra {banTarget.displayName}</h3>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Anledning..." rows={3} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none mb-3 resize-none" />
            <select value={banDuration} onChange={e => setBanDuration(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none mb-4">
              <option value="1week">1 vecka</option><option value="1month">1 månad</option><option value="1year">1 år</option><option value="forever">För alltid</option>
            </select>
            <div className="flex gap-3">
              <button onClick={handleBan} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Spärra</button>
              <button onClick={() => setBanTarget(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium">Avbryt</button>
            </div>
          </div>
        </div>
      )}

      {warnTarget && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-white mb-3">Varna {warnTarget.displayName}</h3>
            <textarea value={warnMsg} onChange={e => setWarnMsg(e.target.value)} placeholder="Varningsmeddelande..." rows={4} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none mb-4 resize-none" />
            <div className="flex gap-3">
              <button onClick={handleWarn} className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">Skicka varning</button>
              <button onClick={() => setWarnTarget(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium">Avbryt</button>
            </div>
          </div>
        </div>
      )}

      {msgTarget && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-white mb-1">Meddelande till {msgTarget.displayName}</h3>
            <p className="text-xs text-zinc-500 mb-3">Mottagaren kan svara på meddelandet.</p>
            <textarea value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Skriv ditt meddelande..." rows={4} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none mb-4 resize-none" />
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
