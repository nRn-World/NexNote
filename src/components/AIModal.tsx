import React, { useState } from 'react';
import { Sparkles, Brain, Code2, X, Play, Wand2, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../hooks/useToast';

interface AIModalProps {
  onInsert: (code: { html: string; css: string; js: string }) => void;
  onClose: () => void;
  isDark: boolean;
}

export default function AIModal({ onInsert, onClose, isDark }: AIModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<any>(null);
  const { addToast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    
    // Simulating high-quality AI generation for the demo
    // In a real scenario, we would call the GoogleGenerativeAI API here
    setTimeout(() => {
      const mockCode = generateMockCode(prompt);
      setGeneratedPreview(mockCode);
      setIsGenerating(false);
      addToast('AI creation is ready!', 'success');
    }, 2000);
  };

  const generateMockCode = (p: string) => {
    // A set of smart templates to make the demo feel responsive and "smart"
    const lower = p.toLowerCase();
    if (lower.includes('neon') || lower.includes('glow')) {
      return {
        html: '<div class="neon-card">\n  <h2>NexNote AI</h2>\n  <p>Pulsing Neon Design</p>\n  <div class="glow-ring"></div>\n</div>',
        css: '.neon-card { background: #0a0a0f; color: #fff; padding: 40px; border-radius: 20px; border: 1px solid #00f2ff; box-shadow: 0 0 20px rgba(0,242,255,0.2); position: relative; overflow: hidden; }\n.glow-ring { position: absolute; width: 200px; height: 200px; border: 2px solid #00f2ff; border-radius: 50%; top: -50px; right: -50px; filter: blur(50px); animation: pulse 3s infinite; }\n@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }',
        js: '// Smooth entrance\ndocument.querySelector(".neon-card").style.opacity = 0;\nsetTimeout(() => {\n  document.querySelector(".neon-card").style.transition = "all 1s";\n  document.querySelector(".neon-card").style.opacity = 1;\n}, 100);'
      };
    }
    if (lower.includes('glass') || lower.includes('blur')) {
      return {
        html: '<div class="glass-orb">\n  <div class="content">Glassmorphism</div>\n</div>',
        css: '.glass-orb { width: 200px; height: 200px; background: rgba(255,255,255,0.1); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }\nbody { background: linear-gradient(45deg, #0f0c29, #302b63, #24243e); }',
        js: 'document.addEventListener("mousemove", (e) => {\n  const orb = document.querySelector(".glass-orb");\n  if(!orb) return;\n  const x = (window.innerWidth / 2 - e.pageX) / 20;\n  const y = (window.innerHeight / 2 - e.pageY) / 20;\n  orb.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;\n});'
      };
    }
    // Default high-quality placeholder
    return {
      html: '<div class="animated-bg">\n  <div class="particle"></div>\n  <h1 class="title">NexNote AI Assistant</h1>\n  <p>Your prompt inspired this design.</p>\n</div>',
      css: '.animated-bg { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #fff; background: #0b0d17; overflow: hidden; }\n.title { background: linear-gradient(to right, #00f2ff, #00b4ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 3rem; margin-bottom: 10px; }\n.particle { position: absolute; width: 4px; height: 4px; background: #00f2ff; border-radius: 50%; animation: drift 10s linear infinite; }\n@keyframes drift { from { transform: translateY(100vh); } to { transform: translateY(-100px); } }',
      js: 'console.log("AI code active.");'
    };
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className={cn(
        "relative w-full max-w-4xl bg-[#0B0D17] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]",
        isGenerating && "animate-pulse"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white italic tracking-tight">AI Assistant</h2>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">NexNote Design-to-Code v1.0</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          {!generatedPreview ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400 ml-1">Describe your vision</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="e.g. 'A futuristic crystal orb with floating particles' or 'A neon pulsing subscribe button with glow effects'"
                  className="w-full h-32 bg-[#0E111C] border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/50 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => setPrompt("Minimalist glassmorphism contact form")} className="text-left p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Preset 01</span>
                  <p className="text-xs text-white font-medium group-hover:text-cyan-400">Glassmorphism Form</p>
                </button>
                <button onClick={() => setPrompt("Animated galaxy with rotating stars")} className="text-left p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Preset 02</span>
                  <p className="text-xs text-white font-medium group-hover:text-cyan-400">Animated Galaxy</p>
                </button>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl text-white font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl shadow-cyan-500/10 hover:shadow-cyan-500/30 transition-all disabled:opacity-40"
              >
                {isGenerating ? (
                  <><Brain className="animate-spin" size={16} /> Architecting code...</>
                ) : (
                  <><Sparkles size={16} /> Generate Magic</>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                    <Play size={14} /> AI Preview
                  </span>
                  <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400/20" />
                    <span className="w-2 h-2 rounded-full bg-yellow-400/20" />
                    <span className="w-2 h-2 rounded-full bg-green-400/20" />
                  </div>
                </div>
                <div className="h-64 bg-white relative">
                  <iframe 
                    title="AI Preview" 
                    srcDoc={`<!DOCTYPE html><html><head><style>html,body{margin:0;padding:20px;display:flex;justify-content:center;align-items:center;height:100vh;background:#0a0a0f;}${generatedPreview.css}</style></head><body>${generatedPreview.html}<script>${generatedPreview.js}<\/script></body></html>`}
                    className="w-full h-full border-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => { onInsert(generatedPreview); onClose(); }}
                  className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <Code2 size={16} /> Insert into editor
                </button>
                <button
                  onClick={() => setGeneratedPreview(null)}
                  className="px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
