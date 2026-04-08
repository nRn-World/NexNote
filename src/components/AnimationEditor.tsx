import React, { useState } from 'react';
import { Play, Pause, RotateCw, Maximize, Clock, Zap, Target, Palette, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface AnimationEditorProps {
  onUpdate: (css: string) => void;
  currentCode: { html: string; css: string; js: string };
  onClose: () => void;
}

export default function AnimationEditor({ onUpdate, currentCode, onClose }: AnimationEditorProps) {
  const [duration, setDuration] = useState(2);
  const [intensity, setIntensity] = useState(10);
  const [activeEffect, setActiveEffect] = useState<'none' | 'pulse' | 'float' | 'shake' | 'rotate'>('none');
  const [targetId, setTargetId] = useState('');

  const applyAnimation = () => {
    let animationCss = '';
    const selector = targetId ? `#${targetId}` : '.nexnote-animated';
    
    switch (activeEffect) {
      case 'pulse':
        animationCss = `
${selector} {
  animation: nexnote-pulse ${duration}s infinite ease-in-out;
}
@keyframes nexnote-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(${1 + intensity / 100}); }
}`;
        break;
      case 'float':
        animationCss = `
${selector} {
  animation: nexnote-float ${duration}s infinite ease-in-out;
}
@keyframes nexnote-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-${intensity}px); }
}`;
        break;
      case 'rotate':
        animationCss = `
${selector} {
  animation: nexnote-rotate ${duration}s infinite linear;
}
@keyframes nexnote-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`;
        break;
      case 'shake':
        animationCss = `
${selector} {
  animation: nexnote-shake ${duration}s infinite;
}
@keyframes nexnote-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-${intensity}px); }
  75% { transform: translateX(${intensity}px); }
}`;
        break;
    }

    onUpdate(currentCode.css + '\n' + animationCss);
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0B0D17] border-t border-white/10 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Zap className="text-white" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white italic uppercase tracking-widest">Motion Studio</h3>
            <p className="text-[10px] text-zinc-500 font-bold">Visual Animation Timeline</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white"><X size={18} /></button>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto no-scrollbar">
        {/* Selector Section */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
            <Target size={12} /> Target Element ID
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              placeholder="e.g. logo, my-button (defaults to .nexnote-animated)"
              className="flex-1 bg-[#0E111C] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500/50"
            />
          </div>
          <p className="text-[10px] text-zinc-600 italic">Add 'id="target-name"' to your HTML element first.</p>
        </div>

        {/* Effects Grid */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-purple-400">Select Magic Effect</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['pulse', 'float', 'rotate', 'shake'] as const).map(effect => (
              <button
                key={effect}
                onClick={() => setActiveEffect(effect)}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
                  activeEffect === effect 
                    ? "bg-purple-600 border-purple-600 text-white shadow-xl" 
                    : "bg-white/5 border-white/5 text-zinc-500 hover:border-white/10"
                )}
              >
                {effect === 'pulse' && <Maximize size={20} className={cn(activeEffect === effect && "animate-pulse")} />}
                {effect === 'float' && <Palette size={20} className={cn(activeEffect === effect && "animate-bounce")} />}
                {effect === 'rotate' && <RotateCw size={20} className={cn(activeEffect === effect && "animate-spin")} />}
                {effect === 'shake' && <Zap size={20} />}
                <span className="text-[10px] font-black uppercase tracking-widest">{effect}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-purple-400">Duration (${duration}s)</label>
              <Clock size={14} className="text-zinc-600" />
            </div>
            <input 
              type="range" min="0.1" max="10" step="0.1" 
              value={duration} onChange={e => setDuration(parseFloat(e.target.value))}
              className="w-full transition-all accent-purple-500" 
            />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-purple-400">Intensity (${intensity}px/%)</label>
              <Play size={14} className="text-zinc-600" />
            </div>
            <input 
              type="range" min="1" max="100" step="1" 
              value={intensity} onChange={e => setIntensity(parseInt(e.target.value))}
              className="w-full transition-all accent-purple-500" 
            />
          </div>
        </div>

        <button
          onClick={applyAnimation}
          disabled={activeEffect === 'none'}
          className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-40"
        >
          <Zap size={16} /> Bake Animation into code
        </button>
      </div>
    </div>
  );
}
