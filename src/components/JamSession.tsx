import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCw, Maximize, Clock, Zap, Target, Palette, Check, X, Globe, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../hooks/useToast';

interface JamSessionProps {
  noteId: string;
  user: any;
  currentCode: { html: string; css: string; js: string };
  onUpdate: (newCode: { html: string; css: string; js: string }) => void;
  onClose: () => void;
}

export default function JamSession({ noteId, user, currentCode, onUpdate, onClose }: JamSessionProps) {
  const { addToast } = useToast();
  const [isHost, setIsHost] = useState(true);
  const [participants, setParticipants] = useState([{ id: 'you', name: 'Du', color: 'cyan' }]);
  const [activeEffect, setActiveEffect] = useState<'none' | 'cursor' | 'selection'>('none');

  return (
    <div className="absolute inset-0 z-50 bg-[#0B0D17] border-t border-white/10 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Globe className="text-white" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white italic uppercase tracking-widest">Jam Session</h3>
            <p className="text-[10px] text-zinc-500 font-bold">Real-time code collaboration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isHost ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Host
          </span>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"><X size={18} /></button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto no-scrollbar">
        {/* Session Info */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
            <Users size={12} /> Participants ({participants.length})
          </label>
          <div className="flex gap-2">
            {participants.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800/50">
                <div className="w-2 h-2 rounded-full" style={{ background: p.color === 'cyan' ? '#00F2FF' : p.color === 'indigo' ? '#4F46E5' : '#00F2FF' }} />
                <span className="text-xs text-zinc-200 font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
            <Zap size={12} /> Session mode
          </label>
          <div className="flex gap-2">
            {(['none', 'cursor', 'selection'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setActiveEffect(mode)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                  activeEffect === mode
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-white/10 hover:bg-zinc-700"
                )}
              >
                {mode === 'none' && <Play size={14} />}
                {mode === 'cursor' && <Target size={14} />}
                {mode === 'selection' && <Palette size={14} />}
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Current Code Preview */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Current code</label>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl">
              <div className="text-[10px] text-cyan-400 font-mono mb-1">HTML</div>
              <div className="text-[10px] text-zinc-500 truncate">{currentCode.html ? `${currentCode.html.length} tecken` : 'Blank'}</div>
            </div>
            <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl">
              <div className="text-[10px] text-indigo-400 font-mono mb-1">CSS</div>
              <div className="text-[10px] text-zinc-500 truncate">{currentCode.css ? `${currentCode.css.length} tecken` : 'Blank'}</div>
            </div>
            <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl">
              <div className="text-[10px] text-yellow-400 font-mono mb-1">JS</div>
              <div className="text-[10px] text-zinc-500 truncate">{currentCode.js ? `${currentCode.js.length} tecken` : 'Blank'}</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            onUpdate(currentCode);
            addToast('Code synced with all participants.', 'success');
          }}
          className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3"
        >
          <Globe size={16} /> Synkronisera kod
        </button>
      </div>
    </div>
  );
}


