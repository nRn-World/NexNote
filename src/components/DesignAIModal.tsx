import React, { useEffect, useState } from 'react';
import { X, Sparkles, Wand2, Palette, Zap, Code2, Globe, AlertTriangle, Loader2 } from 'lucide-react';
import { cn, PREVIEW_SANDBOX } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { generateDesignCode, hasAiKey, type DesignKind, type GeneratedCode } from '../lib/ai';

interface DesignAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  isDark: boolean;
  onInsert: (code: { html: string; css: string; js: string }) => void;
}

const CATEGORIES: { id: DesignKind; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'ui', label: 'UI Element', icon: <Palette size={14} />, desc: 'Buttons, Cards, Inputs' },
  { id: 'anim', label: 'Animation', icon: <Zap size={14} />, desc: 'Keyframes, Transitions' },
  { id: 'bg', label: 'Background', icon: <Globe size={14} />, desc: 'Gradients, Orbs, Patterns' },
  { id: 'svg', label: 'SVG Graphics', icon: <Code2 size={14} />, desc: 'Icons, Illustrations' },
];

export default function DesignAIModal({ isOpen, onClose, initialPrompt, isDark, onInsert }: DesignAIModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [selectedType, setSelectedType] = useState<DesignKind>('ui');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedCode | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (!isOpen) {
      setGenerated(null);
      setIsGenerating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const code = await generateDesignCode(prompt, selectedType);
      setGenerated(code);
      addToast(
        code.source === 'gemini' ? 'Designen är klar.' : 'AI-nyckel saknas — en lokal mall användes.',
        code.source === 'gemini' ? 'success' : 'info',
      );
    } catch {
      addToast('Kunde inte skapa designen. Försök igen.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0B0D17] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white italic tracking-tight">NexAI <span className="text-cyan-400">Design Studio</span></h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                {hasAiKey ? 'Gemini · generative design' : 'Lokal mall · ingen AI-nyckel'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">What are we building?</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedType(cat.id)}
                  className={cn(
                    'flex flex-col gap-3 p-4 rounded-2xl border transition-all text-left group',
                    selectedType === cat.id
                      ? 'bg-cyan-500/10 border-cyan-500/30 ring-1 ring-cyan-500/20'
                      : 'bg-white/2 border-white/5 hover:border-white/10'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                    selectedType === cat.id ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                  )}>
                    {cat.icon}
                  </div>
                  <div>
                    <div className={cn('text-xs font-bold', selectedType === cat.id ? 'text-white' : 'text-zinc-400')}>{cat.label}</div>
                    <div className="text-[9px] text-zinc-600 mt-0.5 leading-none">{cat.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Describe your vision</h4>
              <span className="text-[9px] text-zinc-600 font-bold italic">Example: "A neon sunset button with ripple effect"</span>
            </div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="I want to design a..."
              className="w-full h-32 bg-white/2 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-cyan-500/50 transition-all resize-none placeholder:text-zinc-700"
            />
          </div>

          {generated && (
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white">
              <div className="h-56">
                <iframe
                  title="Design preview"
                  sandbox={PREVIEW_SANDBOX}
                  srcDoc={`<!DOCTYPE html><html><head><style>html,body{margin:0;padding:16px;height:100%;box-sizing:border-box;background:#0a0a0f;}${generated.css}</style></head><body>${generated.html}<script>${generated.js}<\/script></body></html>`}
                  className="w-full h-full border-none"
                />
              </div>
            </div>
          )}

          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              <span className="text-amber-400 font-bold uppercase italic mr-1">Design Focus:</span>
              Verktyget är specialiserat på frontend, SVG och animationer. Utan AI-nyckel returneras en lokal mall.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/2 flex items-center gap-3">
          {generated ? (
            <>
              <button
                onClick={() => { onInsert(generated); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all"
              >
                <Code2 size={16} /> Skapa anteckning
              </button>
              <button
                onClick={() => setGenerated(null)}
                className="px-6 py-4 bg-white/5 text-zinc-400 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 hover:text-white transition-all"
              >
                Nytt försök
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-cyan-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100"
              >
                {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Genererar...</> : <><Wand2 size={16} /> Generate Design</>}
              </button>
              <button onClick={onClose} className="px-8 py-4 bg-white/5 text-zinc-400 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 hover:text-white transition-all">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
