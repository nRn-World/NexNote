import React, { useState, useEffect, useRef } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove,
  addDoc, query, orderBy, where, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { Heart, Upload, Trophy, X, User, AlertTriangle, Clock } from 'lucide-react';
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

interface CommunityViewProps {
  user: any;
  userNotes: Note[];
  onClose: () => void;
}

const MAX_MONTHLY = 2;
const COUNTDOWN_SECONDS = 30;

// Upload modal with note picker, warning and countdown
function UploadModal({ userNotes, monthlyCount, onConfirm, onCancel, uploading }: {
  userNotes: Note[];
  monthlyCount: number;
  onConfirm: (noteId: string) => void;
  onCancel: () => void;
  uploading: boolean;
}) {
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [step, setStep] = useState<'pick' | 'warn'>('pick');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const timerRef = useRef<any>(null);

  const selectedNote = userNotes.find(n => n.id === selectedNoteId);

  // Start countdown when entering warn step
  useEffect(() => {
    if (step !== 'warn') return;
    setCountdown(COUNTDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full border border-zinc-200 dark:border-zinc-700 overflow-hidden">

        {step === 'pick' ? (
          <>
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">Dela en anteckning</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {MAX_MONTHLY - monthlyCount} av {MAX_MONTHLY} uppladdningar kvar denna månad
              </p>
            </div>

            {/* Note picker with images */}
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {userNotes.filter(n => n.title).length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">Inga anteckningar med titel hittades.</p>
              ) : userNotes.filter(n => n.title).map(note => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    selectedNoteId === note.id
                      ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                      : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'
                  )}
                >
                  {/* Cover image or placeholder */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    {note.coverImage || note.attachments.some(a => a.type.startsWith('image/')) ? (
                      <img
                        src={note.coverImage || note.attachments.find(a => a.type.startsWith('image/'))?.data}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800">
                        <span className="text-lg">{note.title.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{note.title}</p>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {note.content.replace(/<[^>]*>/g, '').slice(0, 60) || 'Ingen text...'}
                    </p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {note.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedNoteId === note.id && (
                    <div className="w-4 h-4 rounded-full bg-zinc-900 dark:bg-white shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
              <button
                onClick={() => selectedNoteId && setStep('warn')}
                disabled={!selectedNoteId}
                className="flex-1 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Fortsätt
              </button>
              <button onClick={onCancel} className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium hover:opacity-90">
                Avbryt
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Warning step */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Är du säker?</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Läs igenom innan du bekräftar</p>
                </div>
              </div>

              {/* Selected note preview */}
              {selectedNote && (
                <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl mb-4 border border-zinc-200 dark:border-zinc-700">
                  {(selectedNote.coverImage || selectedNote.attachments.some(a => a.type.startsWith('image/'))) && (
                    <img
                      src={selectedNote.coverImage || selectedNote.attachments.find(a => a.type.startsWith('image/'))?.data}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{selectedNote.title}</p>
                </div>
              )}

              <div className="space-y-2 mb-6">
                {[
                  'Anteckningen blir synlig för ALLA inloggade användare.',
                  'Du kan inte ångra eller ta bort den efter delning.',
                  'Den räknas mot din kvot på 2 uppladdningar per månad.',
                  'Dela aldrig personlig eller känslig information.',
                ].map((warning, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
                    {warning}
                  </div>
                ))}
              </div>

              {/* Countdown */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <Clock size={16} className="text-zinc-400 shrink-0" />
                <div className="flex-1">
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all duration-1000"
                      style={{ width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 w-6 text-right">{countdown}s</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => onConfirm(selectedNoteId)}
                  disabled={countdown > 0 || uploading}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
                    countdown > 0
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                      : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90'
                  )}
                >
                  {uploading ? 'Delar...' : countdown > 0 ? `Vänta ${countdown}s...` : 'Bekräfta delning'}
                </button>
                <button
                  onClick={() => { setStep('pick'); clearInterval(timerRef.current); }}
                  className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium hover:opacity-90"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CommunityView({ user, userNotes, onClose }: CommunityViewProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'community'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityPost));
      loaded.sort((a, b) => b.likes.length - a.likes.length);
      setPosts(loaded);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const q = query(collection(db, 'community'), where('uid', '==', user.uid), where('createdAt', '>=', startOfMonth));
    getDocs(q).then(snap => setMonthlyCount(snap.size));
  }, [user, posts]);

  const handleLike = async (post: CommunityPost) => {
    if (!user) return;
    const ref = doc(db, 'community', post.id);
    const hasLiked = post.likes.includes(user.uid);
    await updateDoc(ref, { likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const handleUpload = async (noteId: string) => {
    if (!noteId || !user) return;
    const note = userNotes.find(n => n.id === noteId);
    if (!note) return;
    setUploading(true);
    try {
      await addDoc(collection(db, 'community'), {
        uid: user.uid,
        displayName: user.displayName || 'Anonym',
        photoURL: user.photoURL || null,
        title: note.title || 'Namnlös anteckning',
        content: note.content,
        coverImage: note.coverImage || null,
        likes: [],
        createdAt: Date.now(),
      });
      setShowUpload(false);
    } finally {
      setUploading(false);
    }
  };

  const canUpload = monthlyCount < MAX_MONTHLY;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <Trophy size={20} className="text-yellow-500" />
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Community</h1>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:block">Delade anteckningar från alla användare</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowUpload(true)} disabled={!canUpload}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              canUpload ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            )}
            title={!canUpload ? `Gräns på ${MAX_MONTHLY} uppladdningar per månad nådd` : ''}>
            <Upload size={15} />
            Dela
            {!canUpload && <span className="text-xs opacity-70">({monthlyCount}/{MAX_MONTHLY})</span>}
          </button>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="px-6 py-2 bg-zinc-100 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: MAX_MONTHLY }).map((_, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-full', i < monthlyCount ? 'bg-zinc-500' : 'bg-zinc-300 dark:bg-zinc-600')} />
          ))}
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{monthlyCount}/{MAX_MONTHLY} uppladdningar denna månad</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-zinc-400 py-16">Laddar...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-zinc-400 py-16">
            <Trophy size={40} className="mx-auto mb-3 opacity-20" />
            <p>Inga anteckningar ännu. Bli den första att dela!</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {posts.map((post, index) => {
              const hasLiked = post.likes.includes(user?.uid);
              const isExpanded = expandedId === post.id;
              return (
                <div key={post.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
                  {post.coverImage && (
                    <img src={post.coverImage} alt="" className="w-full h-40 object-cover" />
                  )}
                  <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                    {index < 3 && (
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : index === 1 ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      )}>{index + 1}</div>
                    )}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {post.photoURL
                        ? <img src={post.photoURL} alt="" className="w-7 h-7 rounded-full shrink-0" />
                        : <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0"><User size={14} className="text-zinc-400" /></div>
                      }
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{post.displayName}</p>
                        <p className="text-[10px] text-zinc-400">{format(post.createdAt, 'd MMM yyyy', { locale: sv })}</p>
                      </div>
                    </div>
                    <button onClick={() => handleLike(post)}
                      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                        hasLiked ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                      )}>
                      <Heart size={14} className={cn(hasLiked && 'fill-red-500')} />
                      {post.likes.length}
                    </button>
                  </div>
                  <div className="px-5 pb-4">
                    <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">{post.title}</h3>
                    <div className={cn('prose prose-zinc dark:prose-invert max-w-none text-sm text-zinc-600 dark:text-zinc-400 overflow-hidden transition-all', isExpanded ? '' : 'max-h-20')}
                      dangerouslySetInnerHTML={{ __html: post.content }} />
                    {post.content.length > 200 && (
                      <button onClick={() => setExpandedId(isExpanded ? null : post.id)} className="text-xs text-blue-500 hover:text-blue-600 mt-1">
                        {isExpanded ? 'Visa mindre' : 'Visa mer'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          userNotes={userNotes}
          monthlyCount={monthlyCount}
          uploading={uploading}
          onConfirm={handleUpload}
          onCancel={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
