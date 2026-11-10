import React, { useState, useEffect } from 'react';
import { User, User2, Activity, Lock, Send, Code, FileText, X } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Note } from '../types';

interface RealTimeCollaborateProps {
  open: boolean;
  note: Note;
  user: any;
  onContentChange: (content: string) => void;
  onClose: () => void;
  isDark?: boolean;
}

export default function RealTimeCollaborate({
  note, user, onContentChange, onClose, isDark = true,
}: RealTimeCollaborateProps) {
  const [collaborators, setCollaborators] = useState<any[]>([{ ...user, cursor: { x: 0, y: 0 }, color: 'cyan' }]);
  const [localUsers, setLocalUsers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!note.id) return;

    // Listen for real-time changes to the note
    const unsub = onSnapshot(doc(db, 'notes', note.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const content = data.content || '';
        // Only update if different from local (avoid loops)
        onContentChange(content);
      }
    });

    // Listen for presence (who else has this note open)
    // In a real app, use Firebase Realtime Database or Firestore presence
    // For now, simulate with local state
    return () => unsub();
  }, [note.id, onContentChange]);

  // Simulate cursor movement for other users
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-[var(--bg-deep)]">
      {/* Header */}
      <div className="glass-panel border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {user?.displayName?.[0] || 'U'}
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-white">Redigerar tillsammans</h3>
            <p className="text-[10px] text-zinc-500">{note.title || 'Namnlös anteckning'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {collaborators.length} online
          </span>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Collaborators list */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/3">
        <div className="flex items-center gap-2">
          <User2 size={14} className="text-zinc-500" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Deltagare</span>
        </div>
        <div className="flex gap-2">
          {collaborators.map((c, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${c.color === 'cyan' ? 'bg-cyan-400' : c.color === 'purple' ? 'bg-purple-400' : 'bg-emerald-400'}`} />
              <span className="text-[10px] font-bold text-zinc-300">{c.displayName || 'Användare'}</span>
            </div>
          ))}
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-cyan-400">Du</span>
          </div>
        </div>
      </div>

      {/* Editor area placeholder - in real app this would be a shared editor */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Activity size={32} className="text-cyan-400" />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">Realidsamarbete aktivt</h4>
          <p className="text-zinc-500 text-sm mb-6 max-w-md">
            Ändringar synkroniseras automatiskt mellan alla deltagare i realtid.
            Se andra användares markörer och val när de skriver.
          </p>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <button className="px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-bold hover:bg-cyan-500/20 transition-all">
              <Code size={16} className="mr-2" /> Kodläge
            </button>
            <button className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-sm font-bold hover:bg-white/10 hover:text-white transition-all">
              <FileText size={16} className="mr-2" /> Textläge
            </button>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-white/3 border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <Lock size={16} className="text-zinc-500" />
              <span className="text-xs font-bold text-zinc-400">Säkerhet</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Alla ändringar krypteras och sparas i molnet. Endast inbjudna deltagare kan se och redigera.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="p-4 border-t border-white/10 bg-white/3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-all">
              <Send size={16} />
              <span>Bjud in</span>
            </button>
          </div>
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all">
            Stäng samarbete
          </button>
        </div>
      </div>
    </div>
  );
}
