import React, { useEffect, useRef, useState } from 'react';
import { Activity, CheckCircle2, CloudOff, RefreshCw, X } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../firebase';
import { Note } from '../types';

interface RealTimeCollaborateProps {
  open: boolean;
  note?: Note | null;
  user: any;
  onContentChange: (content: string) => void;
  onClose: () => void;
  isDark?: boolean;
}

/**
 * Shows the note's real cloud sync state.
 * The previous version simulated other participants and an "online" count;
 * NexNote syncs note content through Firestore but has no presence tracking.
 */
export default function RealTimeCollaborate({
  open, note, onContentChange, onClose,
}: RealTimeCollaborateProps) {
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  const noteId = note?.id;
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);

  useEffect(() => {
    if (!open || !noteId) return;
    setLastSync(null);
    setSyncFailed(false);
    const unsub = onSnapshot(
      doc(db, 'notes', noteId),
      snapshot => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        onContentChangeRef.current(typeof data.content === 'string' ? data.content : '');
        setLastSync(Date.now());
        setSyncFailed(false);
      },
      () => setSyncFailed(true),
    );
    return () => unsub();
  }, [open, noteId]);

  if (!open || !note) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-[var(--bg-deep)]">
      {/* Header */}
      <div className="glass-panel border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {typeof note.title === 'string' && note.title.trim() ? note.title.trim().charAt(0) : 'N'}
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-white">Molnsynk</h3>
            <p className="text-[10px] text-zinc-500">{note.title || 'Namnlös anteckning'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Status */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-zinc-500" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Status</span>
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${syncFailed ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-green-500/15 text-green-400 border-green-500/30'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${syncFailed ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
          {syncFailed ? 'Ingen kontakt med Firestore' : 'Molnsynk aktiv'}
        </span>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            {syncFailed ? <CloudOff size={32} className="text-red-400" /> : <CheckCircle2 size={32} className="text-cyan-400" />}
          </div>
          <h4 className="text-lg font-bold text-white mb-2">
            {syncFailed ? 'Kunde inte läsa anteckningen' : 'Ändringar sparas direkt i molnet'}
          </h4>
          <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
            Anteckningens innehåll lyssnas av i realtid från Firestore, så det du skriver här
            syns på andra enheter som har anteckningen öppen. Innehållet är det som synkas —
            markörpositioner eller deltagarlistor visas inte.
          </p>

          <div className="w-full p-4 rounded-xl bg-white/3 border border-white/5 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 flex items-center gap-2"><RefreshCw size={12} /> Senaste synk</span>
              <span className="text-xs font-mono text-zinc-300">
                {lastSync ? format(lastSync, 'HH:mm:ss') : 'väntar…'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Antecknings-id</span>
              <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[220px]">{note.id}</span>
            </div>
          </div>

          <p className="mt-6 text-[10px] text-zinc-600 leading-relaxed">
            Stäng panelen och fortsätt skriva — synken sker i bakgrunden.
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-white/10 bg-white/3 flex justify-end">
        <button onClick={onClose} className="px-6 py-2 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all">
          Stäng
        </button>
      </div>
    </div>
  );
}
