import React, { useState, useEffect, useRef } from 'react';
import {
  collection, query, where, onSnapshot, doc, setDoc, getDoc, updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Heart, UserPlus, UserCheck, X, ArrowLeft, Camera, Flame, Globe, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { CommunityPost } from './CommunityView';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

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
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwn = uid === currentUser?.uid;
  const userPosts = allPosts.filter(p => p.uid === uid);

  // Load profile data
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'community_profiles', uid), snap => {
      if (snap.exists()) setProfile(snap.data());
      else setProfile({ displayName: allPosts.find(p => p.uid === uid)?.displayName || 'Anonym', photoURL: allPosts.find(p => p.uid === uid)?.photoURL });
    });
    return () => unsub();
  }, [uid]);

  // Count followers (how many people follow this uid)
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

  // Count following (how many this uid follows)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'community_following', uid), snap => {
      setFollowingCount(snap.exists() ? (snap.data()?.uids?.length || 0) : 0);
    });
    return () => unsub();
  }, [uid]);

  // Check if current user follows this profile
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
    if (!file || !currentUser) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `users/${currentUser.uid}/profile/avatar`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await setDoc(doc(db, 'community_profiles', currentUser.uid), { photoURL: url }, { merge: true });
      // Update local state immediately
      setProfile((prev: any) => ({ ...(prev || {}), photoURL: url }));
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Kunde inte ladda upp bilden. Kontrollera att du är inloggad.');
    } finally { setUploading(false); e.target.value = ''; }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `users/${currentUser.uid}/profile/banner`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await setDoc(doc(db, 'community_profiles', currentUser.uid), { bannerURL: url }, { merge: true });
      // Update local state immediately
      setProfile((prev: any) => ({ ...(prev || {}), bannerURL: url }));
    } catch (err) {
      console.error('Banner upload failed:', err);
      alert('Kunde inte ladda upp bannern.');
    } finally { setUploading(false); e.target.value = ''; }
  };

  const displayName = profile?.displayName || allPosts.find(p => p.uid === uid)?.displayName || 'Anonym';
  const photoURL = profile?.photoURL || allPosts.find(p => p.uid === uid)?.photoURL;
  const bannerURL = profile?.bannerURL;

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
    <div className="fixed inset-0 z-[450] flex flex-col bg-zinc-950 overflow-y-auto">
      {/* Back button */}
      <button onClick={onClose} className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm text-zinc-300 hover:text-white text-sm rounded-lg border border-white/10 transition-colors">
        <ArrowLeft size={15} /> Tillbaka
      </button>

      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-br from-zinc-900 via-indigo-950 to-zinc-900 overflow-hidden shrink-0">
        {bannerURL && <img src={bannerURL} alt="" className="w-full h-full object-cover opacity-60" />}
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(99,102,241,0.3) 40px, rgba(99,102,241,0.3) 41px)',
        }} />
        {isOwn && (
          <>
            <button onClick={() => bannerInputRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-xs rounded-lg border border-white/20 hover:bg-black/80 transition-colors">
              <Camera size={13} /> Byt banner
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          </>
        )}
        {/* Followers/Following top right */}
        <div className="absolute top-4 right-4 flex items-center gap-4 text-sm text-zinc-300">
          <span><span className="font-bold text-white">{followersCount}</span> Följare</span>
          <span><span className="font-bold text-white">{followingCount}</span> Följer</span>
        </div>
      </div>

      {/* Avatar + name section */}
      <div className="relative px-8 pb-6 bg-zinc-950">
        <div className="flex items-end gap-5 -mt-12 mb-4">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-zinc-950 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl">
              {photoURL
                ? <img src={photoURL} alt="" className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold text-white">{displayName.charAt(0)}</span>
              }
            </div>
            {isOwn && (
              <button onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center border-2 border-zinc-950 transition-colors">
                <Camera size={13} className="text-white" />
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*,image/gif" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 pb-1">
            <h1 className="text-2xl font-bold text-white">{displayName}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{userPosts.length} delade projekt · {userPosts.reduce((s, p) => s + p.likes.length, 0)} totala likes</p>
          </div>
          {!isOwn && (
            <button onClick={handleFollow}
              className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border mb-1',
                isFollowing
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-red-900/20 hover:border-red-500/30 hover:text-red-400'
                  : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
              )}>
              {isFollowing ? <><UserCheck size={15} /> Följer</> : <><UserPlus size={15} /> Följ</>}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-800 mt-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
                tab === t.key ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              )}>
              {t.icon} {t.label}
              <span className={cn('ml-1 text-xs px-1.5 py-0.5 rounded-full', tab === t.key ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800 text-zinc-500')}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Posts grid */}
      <div className="flex-1 px-8 pb-8">
        {tabPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Star size={40} className="mb-3 opacity-20" />
            <p className="text-sm">{tab === 'loved' ? 'Inga gillade projekt ännu.' : 'Inga projekt delade ännu.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tabPosts.map(post => (
              <div key={post.id} onClick={() => setExpandedPost(post)}
                className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-zinc-600 transition-all">
                <div className="relative overflow-hidden" style={{ paddingBottom: '62%' }}>
                  <div className="absolute inset-0">
                    <LivePreview content={decodeContent(post.fullCode || post.content)} title={post.title} />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-white truncate mb-2">{post.title}</p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Heart size={11} className={cn(post.likes.includes(currentUser?.uid) && 'fill-red-400 text-red-400')} />
                      {post.likes.length}
                    </span>
                    <span>{format(post.createdAt, 'd MMM yyyy', { locale: sv })}</span>
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
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden max-w-4xl w-full" style={{ height: '80vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <p className="text-sm font-medium text-white">{expandedPost.title}</p>
              <button onClick={() => setExpandedPost(null)} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg"><X size={16} /></button>
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
