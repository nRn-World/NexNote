import React, { useState, useEffect, useRef } from 'react';
import {
  collection, query, where, onSnapshot, doc, setDoc, getDoc, updateDoc
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { Heart, UserPlus, UserCheck, X, ArrowLeft, Camera, Flame, Globe, Star, Palette, Check, Pencil } from 'lucide-react';
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

const BANNERS: { id: string; name: string; dot: string }[] = [
  { id: 'ocean', name: 'Ocean', dot: 'bg-cyan-500' },
  { id: 'aurora', name: 'Aurora', dot: 'bg-gradient-to-br from-emerald-400 to-purple-500' },
  { id: 'volcano', name: 'Volcano', dot: 'bg-orange-500' },
  { id: 'circuit', name: 'Circuit', dot: 'bg-slate-400' },
  { id: 'sunset', name: 'Sunset', dot: 'bg-gradient-to-r from-amber-400 to-rose-500' },
];

function BannerVisual({ themeId }: { themeId: string }) {
  switch (themeId) {
    case 'ocean':
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a2540] via-[#0d3868] to-[#041020]" />
          {/* Animated wave lines */}
          <svg className="absolute bottom-0 left-0 w-full h-24 opacity-20" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,60 C150,100 350,0 600,60 C850,120 1050,20 1200,60 L1200,120 L0,120Z" fill="rgba(56,189,248,0.3)" />
            <path d="M0,80 C200,40 400,120 600,80 C800,40 1000,100 1200,80 L1200,120 L0,120Z" fill="rgba(56,189,248,0.15)" />
          </svg>
          {/* Floating bubbles */}
          <div className="absolute top-6 left-[15%] w-3 h-3 rounded-full bg-cyan-400/20 animate-pulse" />
          <div className="absolute top-12 left-[45%] w-2 h-2 rounded-full bg-cyan-300/15 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-8 right-[25%] w-4 h-4 rounded-full bg-blue-400/10 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-16 right-[40%] w-2 h-2 rounded-full bg-cyan-200/20 animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/8 blur-[80px] rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-blue-600/10 blur-[60px] rounded-full" />
        </>
      );
    case 'aurora':
      return (
        <>
          <div className="absolute inset-0 bg-[#050a15]" />
          {/* Northern lights ribbons */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-40" style={{
              background: 'linear-gradient(135deg, transparent 20%, rgba(52,211,153,0.15) 30%, rgba(139,92,246,0.12) 45%, transparent 55%, rgba(52,211,153,0.1) 65%, rgba(59,130,246,0.08) 75%, transparent 85%)',
            }} />
            <div className="absolute top-4 left-[10%] w-[80%] h-16 rounded-full opacity-20" style={{
              background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.6), rgba(139,92,246,0.4), rgba(59,130,246,0.3), transparent)',
              filter: 'blur(20px)',
            }} />
            <div className="absolute top-12 left-[5%] w-[70%] h-12 rounded-full opacity-15" style={{
              background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), rgba(236,72,153,0.3), transparent)',
              filter: 'blur(25px)',
            }} />
            <div className="absolute top-20 left-[20%] w-[60%] h-10 rounded-full opacity-10" style={{
              background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.4), rgba(59,130,246,0.5), transparent)',
              filter: 'blur(30px)',
            }} />
          </div>
          {/* Stars */}
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute w-px h-px bg-white rounded-full animate-pulse"
              style={{ top: `${10 + Math.random() * 70}%`, left: `${5 + Math.random() * 90}%`, opacity: 0.3 + Math.random() * 0.5, animationDelay: `${Math.random() * 3}s`, width: Math.random() > 0.7 ? '2px' : '1px', height: Math.random() > 0.7 ? '2px' : '1px' }} />
          ))}
        </>
      );
    case 'volcano':
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0000] via-[#2d0a00] to-[#0d0000]" />
          {/* Lava cracks */}
          <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 400 200">
            <path d="M0,180 Q50,160 80,170 T160,150 T240,165 T320,145 T400,155" stroke="#f97316" strokeWidth="1.5" fill="none" opacity="0.6" />
            <path d="M0,190 Q60,175 100,185 T200,170 T300,180 T400,170" stroke="#ef4444" strokeWidth="1" fill="none" opacity="0.4" />
          </svg>
          {/* Embers floating up */}
          <div className="absolute bottom-4 left-[20%] w-1.5 h-1.5 rounded-full bg-orange-500/60 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute bottom-8 left-[50%] w-1 h-1 rounded-full bg-red-400/50 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
          <div className="absolute bottom-6 right-[30%] w-1.5 h-1.5 rounded-full bg-orange-400/40 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
          <div className="absolute bottom-10 left-[35%] w-1 h-1 rounded-full bg-amber-500/50 animate-ping" style={{ animationDuration: '3.5s', animationDelay: '1.5s' }} />
          {/* Heat glow at bottom */}
          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-orange-900/20 to-transparent" />
          <div className="absolute -bottom-16 left-[30%] w-56 h-32 bg-orange-600/15 blur-[60px] rounded-full" />
          <div className="absolute -bottom-12 right-[20%] w-48 h-28 bg-red-600/10 blur-[50px] rounded-full" />
        </>
      );
    case 'circuit':
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c1222] via-[#111827] to-[#0a0f1a]" />
          {/* Circuit board pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.07]" viewBox="0 0 400 200">
            {/* Horizontal lines */}
            <line x1="0" y1="40" x2="120" y2="40" stroke="#94a3b8" strokeWidth="1" />
            <line x1="140" y1="40" x2="400" y2="40" stroke="#94a3b8" strokeWidth="1" />
            <line x1="0" y1="100" x2="200" y2="100" stroke="#94a3b8" strokeWidth="1" />
            <line x1="220" y1="100" x2="400" y2="100" stroke="#94a3b8" strokeWidth="1" />
            <line x1="0" y1="160" x2="80" y2="160" stroke="#94a3b8" strokeWidth="1" />
            <line x1="100" y1="160" x2="300" y2="160" stroke="#94a3b8" strokeWidth="1" />
            <line x1="320" y1="160" x2="400" y2="160" stroke="#94a3b8" strokeWidth="1" />
            {/* Vertical connectors */}
            <line x1="120" y1="40" x2="120" y2="100" stroke="#94a3b8" strokeWidth="1" />
            <line x1="220" y1="100" x2="220" y2="160" stroke="#94a3b8" strokeWidth="1" />
            <line x1="300" y1="40" x2="300" y2="160" stroke="#94a3b8" strokeWidth="1" />
            {/* Nodes */}
            <circle cx="120" cy="40" r="3" fill="#94a3b8" />
            <circle cx="140" cy="40" r="3" fill="#94a3b8" />
            <circle cx="120" cy="100" r="3" fill="#94a3b8" />
            <circle cx="220" cy="100" r="3" fill="#94a3b8" />
            <circle cx="220" cy="160" r="3" fill="#94a3b8" />
            <circle cx="300" cy="40" r="3" fill="#94a3b8" />
            <circle cx="300" cy="160" r="3" fill="#94a3b8" />
            <circle cx="80" cy="160" r="3" fill="#94a3b8" />
            <circle cx="100" cy="160" r="3" fill="#94a3b8" />
            <circle cx="320" cy="160" r="3" fill="#94a3b8" />
            {/* IC chip shapes */}
            <rect x="185" y="30" width="30" height="20" rx="2" stroke="#94a3b8" fill="none" strokeWidth="1" />
            <rect x="60" y="90" width="25" height="20" rx="2" stroke="#94a3b8" fill="none" strokeWidth="1" />
            <rect x="340" y="90" width="25" height="20" rx="2" stroke="#94a3b8" fill="none" strokeWidth="1" />
          </svg>
          {/* Blinking node lights */}
          <div className="absolute top-[20%] left-[30%] w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse" style={{ animationDuration: '2s' }} />
          <div className="absolute top-[50%] right-[25%] w-1.5 h-1.5 rounded-full bg-slate-400/30 animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-[25%] left-[55%] w-1.5 h-1.5 rounded-full bg-blue-400/30 animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
          <div className="absolute -top-8 left-[40%] w-32 h-32 bg-slate-500/5 blur-[60px] rounded-full" />
        </>
      );
    case 'sunset':
      return (
        <>
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top, #1a0a1e 0%, #2d1b3d 20%, #6b2f5f 40%, #c4456d 60%, #e8855c 75%, #f5b942 90%, #fcd770 100%)',
          }} />
          {/* Sun */}
          <div className="absolute top-2 right-[25%] w-16 h-16 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(252,215,112,0.9) 0%, rgba(245,185,66,0.6) 40%, rgba(232,133,92,0.2) 70%, transparent 100%)',
          }} />
          {/* Cloud silhouettes */}
          <svg className="absolute bottom-12 left-0 w-full h-16 opacity-15" viewBox="0 0 400 60">
            <ellipse cx="80" cy="40" rx="50" ry="15" fill="#1a0a1e" />
            <ellipse cx="110" cy="35" rx="40" ry="18" fill="#1a0a1e" />
            <ellipse cx="60" cy="42" rx="35" ry="12" fill="#1a0a1e" />
            <ellipse cx="300" cy="38" rx="45" ry="14" fill="#1a0a1e" />
            <ellipse cx="330" cy="33" rx="35" ry="16" fill="#1a0a1e" />
            <ellipse cx="280" cy="40" rx="30" ry="11" fill="#1a0a1e" />
          </svg>
          {/* Mountain/horizon silhouette */}
          <svg className="absolute bottom-0 left-0 w-full h-20 opacity-90" viewBox="0 0 400 80" preserveAspectRatio="none">
            <path d="M0,80 L0,60 Q30,50 60,55 Q100,40 140,50 Q180,30 220,45 Q260,35 300,50 Q340,42 370,48 Q390,55 400,52 L400,80 Z" fill="#0d0512" />
          </svg>
          {/* Warm glow */}
          <div className="absolute top-0 right-[20%] w-48 h-32 bg-amber-400/10 blur-[60px] rounded-full" />
        </>
      );
    default:
      return <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e3b] via-[#05141f] to-[#040b12]" />;
  }
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
  const [showBannerPicker, setShowBannerPicker] = useState(false);
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
    if (!file || !currentUser) return;
    setUploading(true);
    try {
      const compressedBase64 = await compressImage(file, 400, 400);
      await setDoc(doc(db, 'community_profiles', currentUser.uid), { photoURL: compressedBase64 }, { merge: true });
      await updateProfile(currentUser, { photoURL: compressedBase64 });
      setProfile((prev: any) => ({ ...(prev || {}), photoURL: compressedBase64 }));
      window.location.reload();
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Could not save the image.');
      setUploading(false);
    } finally { e.target.value = ''; }
  };

  const handleNameSave = async () => {
    if (!auth.currentUser || !editingName.trim()) return;
    try {
      console.log('Attempting to save name:', editingName.trim());
      // 1. Update Firestore Profile
      await setDoc(doc(db, 'community_profiles', auth.currentUser.uid), { 
        displayName: editingName.trim(),
        uid: auth.currentUser.uid // Ensure UID is present if rules or other logic expect it
      }, { merge: true });
      
      // 2. Update Firebase Auth Profile
      await updateProfile(auth.currentUser, { displayName: editingName.trim() });
      
      console.log('Name successfully updated in both Firestore and Auth');
      setProfile((prev: any) => ({ ...(prev || {}), displayName: editingName.trim() }));
      setIsEditingName(false);
    } catch (err: any) {
      console.error('Name update failed significantly:', err);
      // Inform the user of the specific error code if possible
      alert(`Could not save the name: ${err.message || 'Unknown error'}`);
    }
  };

  const selectBanner = (bannerId: string) => {
    if (!isOwn) return;
    // Save to localStorage — instant, no permissions needed
    localStorage.setItem(`nexnote_banner_${uid}`, bannerId);
    setSelectedBanner(bannerId);
    setShowBannerPicker(false);
  };

  const [selectedBanner, setSelectedBanner] = useState(() => {
    return localStorage.getItem(`nexnote_banner_${uid}`) || 'ocean';
  });

  const displayName = profile?.displayName || allPosts.find(p => p.uid === uid)?.displayName || 'Anonymous';
  const photoURL = profile?.photoURL || allPosts.find(p => p.uid === uid)?.photoURL;
  const currentBannerId = selectedBanner;
  const activeBanner = BANNERS.find(b => b.id === currentBannerId) || BANNERS[0];

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
      <div className="relative h-48 overflow-hidden shrink-0 border-b border-[var(--border-glass)]">
        {/* Theme-specific visual */}
        <BannerVisual themeId={currentBannerId} />

        {isOwn && (
          <div className="absolute bottom-4 left-6 z-10 flex items-center gap-2">
            <button onClick={() => setShowBannerPicker(!showBannerPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md text-white text-xs rounded-lg border border-white/10 hover:bg-black/60 transition-colors">
              <Palette size={13} /> Select theme
            </button>
            {showBannerPicker && (
              <div className="flex items-center gap-3 px-3 py-2 bg-black/70 backdrop-blur-md rounded-xl border border-white/10">
                {BANNERS.map(b => (
                  <button key={b.id} onClick={() => selectBanner(b.id)}
                    title={b.name}
                    className={cn('w-7 h-7 rounded-full border-2 transition-all hover:scale-125 flex items-center justify-center shadow-lg', 
                      b.dot, 
                      currentBannerId === b.id ? 'border-white scale-110' : 'border-white/20 hover:border-white/50'
                    )}>
                    {currentBannerId === b.id && <Check size={12} className="text-white drop-shadow-md" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
              <button onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-cyan-600 hover:bg-cyan-700 rounded-lg flex items-center justify-center border-2 border-[var(--bg-deep)] transition-colors shadow-sm cursor-pointer group">
                <Camera size={13} className={cn('transition-all', uploading ? 'text-cyan-300 animate-pulse' : 'text-white group-hover:scale-110')} />
              </button>
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
