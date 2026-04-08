import React, { useState, useEffect } from 'react';
import { X, Sparkles, Wand2, Palette, Zap, Code2, Globe, MessageSquare, Send, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface DesignAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  isDark: boolean;
}

export default function DesignAIModal({ isOpen, onClose, initialPrompt, isDark }: DesignAIModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [selectedType, setSelectedType] = useState<'ui' | 'anim' | 'bg' | 'svg'>('ui');

  const categories = [
    { id: 'ui', label: 'UI Element', icon: <Palette size={14} />, desc: 'Buttons, Cards, Inputs' },
    { id: 'anim', label: 'Animation', icon: <Zap size={14} />, desc: 'Keyframes, Transitions' },
    { id: 'bg', label: 'Background', icon: <Globe size={14} />, desc: 'Gradients, Orbs, Patterns' },
    { id: 'svg', label: 'SVG Graphics', icon: <Code2 size={14} />, desc: 'Icons, Illustrations' },
  ];

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsComingSoon(true);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md">
      <div className={cn(
        "relative w-full max-w-2xl bg-[#0B0D17] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col",
        isComingSoon && "scale-[0.98] transition-all"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white italic tracking-tight">NexAI <span className="text-cyan-400">Design Studio</span></h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Generative Design Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Category Selector */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">What are we building?</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedType(cat.id as any)}
                  className={cn(
                    "flex flex-col gap-3 p-4 rounded-2xl border transition-all text-left group",
                    selectedType === cat.id 
                      ? "bg-cyan-500/10 border-cyan-500/30 ring-1 ring-cyan-500/20" 
                      : "bg-white/2 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    selectedType === cat.id ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "bg-zinc-800 text-zinc-400 group-hover:text-zinc-200"
                  )}>
                    {cat.icon}
                  </div>
                  <div>
                    <div className={cn("text-xs font-bold", selectedType === cat.id ? "text-white" : "text-zinc-400")}>{cat.label}</div>
                    <div className="text-[9px] text-zinc-600 mt-0.5 leading-none">{cat.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Area */}
          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Describe your vision</h4>
              <span className="text-[9px] text-zinc-600 font-bold italic">Example: "A neon sunset button with ripple effect"</span>
            </div>
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="I want to design a..."
                className="w-full h-32 bg-white/2 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-cyan-500/50 transition-all resize-none placeholder:text-zinc-700"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <div className="px-2 py-1 bg-zinc-900 border border-white/5 rounded text-[9px] text-zinc-500 font-bold">
                  JS + CSS Support
                </div>
              </div>
            </div>
          </div>

          {/* AI Restrictions Info */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              <span className="text-amber-400 font-bold uppercase italic mr-1">Design Focus:</span> 
              This AI is specialized in frontend design, SVG graphics, and visual animations. It will not answer general questions or chat about topics unrelated to web creation.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/2 flex flex-col gap-4">
          {isComingSoon ? (
            <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
               <div className="flex items-center gap-2 py-3 px-6 bg-yellow-500 text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-yellow-500/20">
                  <Clock size={16} /> Coming Soon
               </div>
               <button onClick={() => setIsComingSoon(false)} className="text-[10px] text-zinc-600 hover:text-zinc-400 underline mt-2">Go back</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-cyan-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100"
              >
                <Wand2 size={16} /> Generate Design
              </button>
              <button onClick={onClose} className="px-8 py-4 bg-white/5 text-zinc-400 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 hover:text-white transition-all">
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 blur-[60px] pointer-events-none" />
      </div>
    </div>
  );
}
