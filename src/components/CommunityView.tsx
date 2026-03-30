import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove,
  addDoc, query, orderBy, where, getDocs, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Heart, Upload, Trophy, X, User } from 'lucide-react';
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
  likes: string[]; // array of uids
  createdAt: number;
}

interface CommunityViewProps {
  user: any;
  userNotes: Note[];
  onClose: () => void;
}

export default function CommunityView({ user, userNotes, onClose }: CommunityViewProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const MAX_MONTHLY = 2;

  // Load posts sorted by likes desc
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

  // Check how many posts user has made this month
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const q = query(
      collection(db, 'community'),
      where('uid', '==', user.uid),
      where('createdAt', '>=', startOfMonth)
    );
    getDocs(q).then(snap => setMonthlyCount(snap.size));
  }, [user, posts]);

  const handleLike = async (post: CommunityPost) => {
    if (!user) return;
    const ref = doc(db, 'community', post.id);
    const hasLiked = post.likes.includes(user.uid);
    await updateDoc(ref, {
      likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  const handleUpload = async () => {
    if (!selectedNoteId || !user) return;
    const note = userNotes.find(n => n.id === selectedNoteId);
    if (!note) return;
    setUploading(true);
    try {
      await addDoc(collection(db, 'community'), {
        uid: user.uid,
        displayName: user.displayName || 'Anonym',
        photoURL: user.photoURL || null,
        title: note.title || 'Namnlös anteckning',
        content: note.content,
        likes: [],
        createdAt: Date.now(),
      });
      setShowUpload(false);
      setSelectedNoteId('');
    } finally {
      setUploading(false);
    }
  };

  const canUpload = monthlyCount < MAX_MONTHLY;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <Trophy size={20} className="text-yellow-500" />
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Community</h1>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Delade anteckningar från alla användare</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUpload(true)}
            disabled={!canUpload}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              canUpload
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            )}
            title={!canUpload ? `Du har nått gränsen på ${MAX_MONTHLY} uppladdningar denna månad` : ''}
          >
            <Upload size={15} />
            Dela anteckning
            {!canUpload && <span className="text-xs opacity-70">({monthlyCount}/{MAX_MONTHLY})</span>}
          </button>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Monthly quota info */}
      <div className="px-6 py-2 bg-zinc-100 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: MAX_MONTHLY }).map((_, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-full', i < monthlyCount ? 'bg-zinc-500' : 'bg-zinc-300 dark:bg-zinc-600')} />
          ))}
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {monthlyCount}/{MAX_MONTHLY} uppladdningar denna månad
        </span>
      </div>

      {/* Posts */}
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
                  {/* Rank badge for top 3 */}
                  <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                    {index < 3 && (
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : index === 1 ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      )}>
                        {index + 1}
                      </div>
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
                    <button
                      onClick={() => handleLike(post)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                        hasLiked
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                      )}
                    >
                      <Heart size={14} className={cn(hasLiked && 'fill-red-500')} />
                      {post.likes.length}
                    </button>
                  </div>

                  <div className="px-5 pb-4">
                    <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">{post.title}</h3>
                    <div
                      className={cn('prose prose-zinc dark:prose-invert max-w-none text-sm text-zinc-600 dark:text-zinc-400 overflow-hidden transition-all', isExpanded ? '' : 'max-h-20')}
                      dangerouslySetInnerHTML={{ __html: post.content }}
                    />
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

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-700">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">Dela en anteckning</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Välj en av dina anteckningar att dela med community. ({MAX_MONTHLY - monthlyCount} kvar denna månad)
            </p>
            <select
              value={selectedNoteId}
              onChange={e => setSelectedNoteId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none mb-4 text-zinc-900 dark:text-white"
            >
              <option value="">Välj anteckning...</option>
              {userNotes.filter(n => n.title).map(n => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!selectedNoteId || uploading}
                className="flex-1 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {uploading ? 'Delar...' : 'Dela'}
              </button>
              <button
                onClick={() => { setShowUpload(false); setSelectedNoteId(''); }}
                className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:opacity-90"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
