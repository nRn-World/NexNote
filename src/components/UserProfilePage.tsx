import React, { useState, useEffect, useRef } from 'react';
import {
  collection, query, where, onSnapshot, doc, setDoc, getDoc, updateDoc
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { Heart, UserPlus, UserCheck, X, ArrowLeft, Camera, Flame, Globe, Star, Check, Pencil, Link2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { CommunityPost } from './CommunityView';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

function decodeContent(raw: string): string {
  if (raw.startsWith('<!DOCTYPE') || raw.startsWith('<html')) return raw;
  let d = raw.replace(/<p>([\s\S]*?)<\/p>/g, '$1\n');
  d = d.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
       .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
  d = d.replace(/<a[^>]*>(.*?)<\/a>/g,'$1');
  return d.trim();
}

function LivePreview({ content, title }: { content: string; title: string }) {
  const doc = `<!DOCTYPE html><html><head><style>*{box-sizing:border-box;margin:0;padding:0;}html,body{width:100%;height:100%;overflow:hidden;background:#0a0a0f;}</style></head><body>${content}</body></html>`;
  return (
    <iframe srcDoc={doc} title={title} className="w-full h-full border-none block"
      sandbox="allow-scripts allow-same-origin" style={{ display: 'block' }} />
  );
}

const compressImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
    reader.onerror = (err) => reject(err);
  });
};



type Tab = 'popular' | 'public' | 'loved';

interface UserProfilePageProps {
  uid: string;
  currentUser: any;
  allPosts: CommunityPost[];
  onClose: () => void;
}

export default function UserProfilePage({ uid, currentUser, allPosts, onClose }: UserProfilePageProps) {
  const [tab, setTab] = useState<Tab>('popular');
  const [profile, setProfile] = useState<any>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [expandedPost, setExpandedPost] = useState<CommunityPost | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isOwn = uid === currentUser?.uid;
  const userPosts = allPosts.filter(p => p.uid === uid);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'community_profiles', uid), snap => {
      if (snap.exists()) setProfile(snap.data());
      else setProfile({ displayName: allPosts.find(p => p.uid === uid)?.displayName || 'Anonymous', photoURL: allPosts.find(p => p.uid === uid)?.photoURL });
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'community_following'), snap => {
      let count = 0;
      snap.docs.forEach(d => {
        const uids: string[] = d.data().uids || [];
        if (uids.includes(uid)) count++;
      });
      setFollowersCount(count);
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'community_following', uid), snap => {
      setFollowingCount(snap.exists() ? (snap.data()?.uids?.length || 0) : 0);
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'community_following', currentUser.uid), snap => {
      setIsFollowing(snap.exists() ? (snap.data()?.uids || []).includes(uid) : false);
    });
    return () => unsub();
  }, [uid, currentUser]);

  const handleFollow = async () => {
    if (!currentUser || isOwn) return;
    const ref2 = doc(db, 'community_following', currentUser.uid);
    const snap = await getDoc(ref2);
    const current: string[] = snap.exists() ? (snap.data()?.uids || []) : [];
    const newList = isFollowing ? current.filter(u => u !== uid) : [...current, uid];
    await setDoc(ref2, { uids: newList });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    
    // Firestore document limit is 1MB total. Base64 adds ~33% overhead.
    // 780KB is the absolute physical peak before the database denies the write.
    if (file.size > 780 * 1024) {
      alert('The file is too large for the database. Because of the code overhead, pictures over ~780KB exceed the 1MB database limit. For larger GIFs, please use the "Paste Link" (🔗) button instead!');
      return;
    }

    setUploading(true);
    try {
      let finalData: string;
      
      // GIF Support: Skip canvas compression for GIFs to stay animated
      if (file.type === 'image/gif') {
        finalData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        // JPEG/PNG: Use canvas to resize and compress
        finalData = await compressImage(file, 400, 400);
      }

      // Save to Firestore (Base64 string)
      await setDoc(doc(db, 'community_profiles', auth.currentUser.uid), { 
        photoURL: finalData,
        uid: auth.currentUser.uid 
      }, { merge: true });
      
      // Update Firebase Auth Profile
      await updateProfile(auth.currentUser, { photoURL: finalData });
      
      setProfile((prev: any) => ({ ...(prev || {}), photoURL: finalData }));
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      alert(`Could not save the image: ${err.message || 'Unknown error'}`);
    } finally { 
      setUploading(false);
      e.target.value = ''; 
    }
  };

  const handleNameSave = async () => {
    if (!auth.currentUser || !editingName.trim()) return;
    try {
      console.log('Attempting to save name:', editingName.trim());
      await setDoc(doc(db, 'community_profiles', auth.currentUser.uid), { 
        displayName: editingName.trim(),
        uid: auth.currentUser.uid 
      }, { merge: true });
      await updateProfile(auth.currentUser, { displayName: editingName.trim() });
      setProfile((prev: any) => ({ ...(prev || {}), displayName: editingName.trim() }));
      setIsEditingName(false);
    } catch (err: any) {
      console.error('Name update failed:', err);
      alert(`Could not save the name: ${err.message || 'Unknown error'}`);
    }
  };

  const handleLinkAvatar = async () => {
    const url = prompt('Paste a direct link to your image or animated GIF (e.g. from Imgur or Discord):');
    if (!url || !auth.currentUser) return;
    
    if (!url.startsWith('http')) {
      alert('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setUploading(true);
    try {
      await setDoc(doc(db, 'community_profiles', auth.currentUser.uid), { 
        photoURL: url,
        uid: auth.currentUser.uid 
      }, { merge: true });
      await updateProfile(auth.currentUser, { photoURL: url });
      setProfile((prev: any) => ({ ...(prev || {}), photoURL: url }));
    } catch (err: any) {
      console.error('Link avatar failed:', err);
      alert(`Could not save the link: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const [uploading, setUploading] = useState(false);

  const displayName = profile?.displayName || allPosts.find(p => p.uid === uid)?.displayName || 'Anonymous';
  const photoURL = profile?.photoURL || allPosts.find(p => p.uid === uid)?.photoURL;

  const sortedPosts = [...userPosts].sort((a, b) => b.likes.length - a.likes.length || b.createdAt - a.createdAt);
  const lovedPosts = sortedPosts.filter(p => p.likes.length > 0);

  const tabPosts: CommunityPost[] = tab === 'popular' ? sortedPosts
    : tab === 'public' ? sortedPosts
    : lovedPosts;

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'popular', label: 'Popular', icon: <Flame size={13} />, count: sortedPosts.length },
    { key: 'public', label: 'Public', icon: <Globe size={13} />, count: sortedPosts.length },
    { key: 'loved', label: 'Loved', icon: <Heart size={13} />, count: lovedPosts.length },
  ];

  return (
    <div className="fixed inset-0 z-[450] flex flex-col bg-[var(--bg-deep)] text-[var(--text-primary)] overflow-y-auto">
      {/* Back button */}
      <button onClick={onClose} className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm text-zinc-300 hover:text-white text-sm rounded-lg border border-white/10 transition-colors">
        <ArrowLeft size={15} /> Back
      </button>

      {/* Dynamic Banner System */}
      <div className="relative h-48 overflow-hidden shrink-0 border-b border-[var(--border-glass)] bg-gradient-to-br from-[#0a1e3b] via-[#05141f] to-[#040b12]">

        {/* Global Stats Overlay */}
        <div className="absolute bottom-4 right-6 z-10 flex items-center gap-6 text-sm text-white font-medium">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-white/50">Followers</span>
            <span className="drop-shadow-md">{followersCount}</span>
          </div>
          <div className="flex flex-col items-end border-l border-white/10 pl-6">
            <span className="text-[10px] uppercase tracking-wider text-white/50">Following</span>
            <span className="drop-shadow-md">{followingCount}</span>
          </div>
        </div>
      </div>

      {/* Avatar + name section */}
      <div className="relative px-8 pb-6 bg-[var(--bg-deep)]">
        <div className="flex items-end gap-5 -mt-12 mb-4">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-[var(--bg-deep)] bg-[var(--bg-panel-hover)] flex items-center justify-center shadow-2xl">
              {photoURL
                ? <img src={photoURL} alt="" className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold text-[var(--text-secondary)]">{displayName.charAt(0)}</span>
              }
            </div>
            {isOwn && (
              <div className="absolute -bottom-1 -right-1 flex gap-1">
                <button onClick={() => avatarInputRef.current?.click()}
                  disabled={uploading}
                  title="Upload image"
                  className="w-7 h-7 bg-cyan-600 hover:bg-cyan-700 rounded-lg flex items-center justify-center border-2 border-[var(--bg-deep)] transition-colors shadow-sm cursor-pointer group">
                  <Camera size={13} className={cn('transition-all', uploading ? 'text-cyan-300 animate-pulse' : 'text-white group-hover:scale-110')} />
                </button>
                <button onClick={handleLinkAvatar}
                  disabled={uploading}
                  title="Paste link"
                  className="w-7 h-7 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center border-2 border-[var(--bg-deep)] transition-colors shadow-sm cursor-pointer group">
                  <Link2 size={13} className="text-white group-hover:scale-110" />
                </button>
              </div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*,image/gif" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 group">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                    className="bg-[var(--bg-panel-hover)] border border-white/10 rounded-lg px-2 py-1 text-xl font-bold outline-none focus:border-cyan-500/50"
                  />
                  <button onClick={handleNameSave} className="p-1 px-3 bg-cyan-600 rounded-lg text-xs font-bold hover:bg-cyan-700 transition-colors">Save</button>
                  <button onClick={() => setIsEditingName(false)} className="p-1 text-[var(--text-secondary)] hover:text-white"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                  {isOwn && (
                    <button onClick={() => { setIsEditingName(true); setEditingName(displayName); }} 
                      className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-cyan-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-white/5">
                      <Pencil size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{userPosts.length} shared projects · {userPosts.reduce((s, p) => s + p.likes.length, 0)} total likes</p>
          </div>
          {!isOwn && (
            <button onClick={handleFollow}
              className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border mb-1',
                isFollowing
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-red-900/20 hover:border-red-500/30 hover:text-red-400'
                  : 'bg-cyan-600 border-cyan-600 text-white hover:bg-cyan-700'
              )}>
              {isFollowing ? <><UserCheck size={15} /> Following</> : <><UserPlus size={15} /> Follow</>}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[var(--border-glass)] mt-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
                tab === t.key ? 'border-cyan-500 text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}>
              {t.icon} {t.label}
              <span className={cn('ml-1 text-xs px-1.5 py-0.5 rounded-full', tab === t.key ? 'bg-cyan-500/20 text-cyan-300' : 'bg-[var(--bg-panel-hover)] text-[var(--text-secondary)]')}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Posts grid */}
      <div className="flex-1 px-8 pb-8">
        {tabPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
            <Star size={40} className="mb-3 opacity-20" />
            <p className="text-sm">{tab === 'loved' ? 'No liked projects yet.' : 'No projects shared yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tabPosts.map(post => (
              <div key={post.id} onClick={() => setExpandedPost(post)}
                className="group bg-[var(--bg-panel)] border border-[var(--border-glass)] rounded-xl overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-all">
                <div className="relative overflow-hidden" style={{ paddingBottom: '62%' }}>
                  <div className="absolute inset-0">
                    <LivePreview content={decodeContent(post.fullCode || post.content)} title={post.title} />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate mb-2">{post.title}</p>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Heart size={11} className={cn(post.likes.includes(currentUser?.uid) && 'fill-red-400 text-red-400')} />
                      {post.likes.length}
                    </span>
                    <span>{format(post.createdAt, 'MMM d, yyyy', { locale: enUS })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded post */}
      {expandedPost && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-4" onClick={() => setExpandedPost(null)}>
          <div className="bg-[var(--bg-panel)] border border-[var(--border-glass)] rounded-2xl overflow-hidden max-w-4xl w-full" style={{ height: '80vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-glass)]">
              <p className="text-sm font-medium">{expandedPost.title}</p>
              <button onClick={() => setExpandedPost(null)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] rounded-lg"><X size={16} /></button>
            </div>
            <div style={{ height: 'calc(80vh - 52px)' }}>
              <LivePreview content={decodeContent(expandedPost.fullCode || expandedPost.content)} title={expandedPost.title} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
