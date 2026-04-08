import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Zap, MessageSquare, X, Play, Copy, Check, Globe, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '../hooks/useToast';

interface JamSessionProps {
  noteId: string;
  user: any;
  currentCode: { html: string; css: string; js: string };
  onUpdate: (code: { html: string; css: string; js: string }) => void;
  onClose: () => void;
}

export default function JamSession({ noteId, user, currentCode, onUpdate, onClose }: JamSessionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const { addToast } = useToast();

  const handleGoLive = async () => {
    setIsActive(true);
    const sessionRef = doc(db, 'jam_sessions', noteId);
    setSessionId(noteId);
    
    // Create session in Firestore
    await setDoc(sessionRef, {
      host: user.uid,
      hostName: user.displayName,
      hostPhoto: user.photoURL,
      code: currentCode,
      active: true,
      updatedAt: Date.now(),
      participants: [{ uid: user.uid, name: user.displayName, photo: user.photoURL }]
    });

    addToast('Jam Session started! Share the ID to invite friends.', 'success');
  };

  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSnapshot(doc(db, 'jam_sessions', sessionId), snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.host !== user.uid) {
          // Sync code if we are not the host (or if host pushes)
          // For now, let's just listen for code updates
          onUpdate(data.code);
        }
        setParticipants(data.participants || []);
      }
    });
    return () => unsub();
  }, [sessionId]);

  const copyId = async () => {
    await navigator.clipboard.writeText(noteId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0B0D17] border-t border-white/10 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Globe className="text-white" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white italic uppercase tracking-widest">Global Jam</h3>
            <p className="text-[10px] text-zinc-500 font-bold">Real-time Collaboration Suite</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
      </div>

      <div className="flex-1 p-8 space-y-10 overflow-y-auto no-scrollbar">
        {!isActive ? (
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full scale-150" />
              <div className="relative flex justify-center">
                <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl relative">
                   <Users className="text-emerald-400" size={40} />
                   <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 border-4 border-zinc-900 animate-pulse" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-xl font-black text-white italic">Code with Friends</h4>
              <p className="text-zinc-500 text-xs font-medium leading-relaxed">NexNote Jam lets you share your creative screen live. Perfect for design feedback and coding together.</p>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleGoLive}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Play size={16} /> Go Live Now
              </button>
            </div>

            <div className="flex items-center gap-3 justify-center py-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500/40" />
               <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">End-to-End Synced</span>
               <span className="w-2 h-2 rounded-full bg-emerald-500/40" />
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Live Status and Invite */}
            <div className="p-6 bg-emerald-600/5 border border-emerald-500/20 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Session Active</span>
                </div>
                <button onClick={copyId} className="flex items-center gap-2 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all">
                  {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />} Session ID: {noteId.slice(0, 8)}...
                </button>
              </div>

              <div className="pt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-2">Active Participants</label>
                <div className="flex -space-x-3">
                  {participants.map((p, i) => (
                    <div key={p.uid} className={cn(
                      "w-10 h-10 rounded-full border-4 border-[#0B0D17] bg-zinc-800 flex items-center justify-center overflow-hidden shadow-lg",
                      i === 0 && "border-emerald-500/50"
                    )}>
                      {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-white">{p.name.charAt(0)}</span>}
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-4 border-[#0B0D17] bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-white/10 cursor-pointer transition-all">
                    <UserPlus size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Status Code */}
            <div className="space-y-3">
               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block">Session Settings</label>
               <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                     <Shield className="text-zinc-500" size={16} />
                     <div>
                        <p className="text-[10px] font-black text-white italic uppercase tracking-tighter">Private Stream</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase">Code Only Sync</p>
                     </div>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                     <MessageSquare className="text-zinc-500" size={16} />
                     <div>
                        <p className="text-[10px] font-black text-white italic uppercase tracking-tighter">Voice Chat</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase">Coming Soon</p>
                     </div>
                  </div>
               </div>
            </div>

            <button 
              onClick={() => setIsActive(false)}
              className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-2xl transition-all border border-red-500/10"
            >
              Terminate Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
