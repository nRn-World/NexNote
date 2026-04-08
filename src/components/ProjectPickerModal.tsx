import React, { useState } from 'react';
import { X, Search, FileCode, Globe, Check, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Note } from '../types';

interface ProjectPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  communityPosts: any[];
  onSelect: (project: any) => void;
  onRemove: () => void;
  currentProject: any;
}

function decodeContent(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith('<!DOCTYPE') || raw.startsWith('<html')) return raw;
  let d = raw.replace(/<p>([\s\S]*?)<\/p>/g, '$1\n');
  d = d.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
       .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
  d = d.replace(/<a[^>]*>(.*?)<\/a>/g,'$1');
  return d.trim();
}

function MiniCodePreview({ code, title }: { code: any, title: string }) {
  if (!code) return null;
  
  let srcContent = '';
  
  if (typeof code === 'string') {
    const decoded = decodeContent(code);
    if (decoded.startsWith('<!DOCTYPE') || decoded.startsWith('<html')) {
      srcContent = decoded;
    } else {
      srcContent = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:100%;height:100%;overflow:hidden;background:#050508;}</style></head><body>${decoded}</body></html>`;
    }
  } else {
    srcContent = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:100%;height:100%;overflow:hidden;background:#050508;}${code.css || ''}</style></head><body>${code.html || ''}<script>${code.js || ''}<\/script></body></html>`;
  }

  return (
    <iframe
      title={title}
      srcDoc={srcContent}
      className="w-full h-full border-none block"
      style={{ pointerEvents: 'none' }}
    />
  );
}

export default function ProjectPickerModal({ 
  isOpen, onClose, notes, communityPosts, onSelect, onRemove, currentProject 
}: ProjectPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'my' | 'community'>('my');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredMy = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));
  const filteredCommunity = communityPosts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[#0B0D17] border border-white/10 rounded-[32px] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)]">
        
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                 <FileCode className="text-white" size={20} />
              </div>
              <div>
                 <h2 className="text-lg font-black text-white italic uppercase tracking-widest">Select Design</h2>
                 <p className="text-[10px] text-zinc-500 font-bold uppercase">Choose a project for your Top 5</p>
              </div>
           </div>
           {currentProject && (
              <button 
                onClick={() => { onRemove(); onClose(); }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all mr-4"
              >
                 <Trash2 size={14} /> Remove Slot
              </button>
           )}
           <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-4 bg-white/2 border-b border-white/5 flex items-center gap-4">
           <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5 shadow-inner">
              <button 
                onClick={() => setActiveTab('my')}
                className={cn(
                  "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeTab === 'my' ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                 My Vault
              </button>
              <button 
                onClick={() => setActiveTab('community')}
                className={cn(
                  "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeTab === 'community' ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                 Community
              </button>
           </div>
           <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full bg-white/2 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
              />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 max-h-[400px] no-scrollbar space-y-2">
           {activeTab === 'my' ? (
              filteredMy.length > 0 ? filteredMy.map(n => (
                 <button 
                   key={n.id}
                   onClick={() => onSelect({ 
                     id: n.id, 
                     title: n.title, 
                     image: n.coverImage, 
                     type: 'note', 
                     code: n.code 
                   })}
                   className="w-full p-4 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all text-left group"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-zinc-900 overflow-hidden flex items-center justify-center border border-white/5 shadow-inner">
                          {n.code ? <MiniCodePreview code={n.code} title={n.title} /> : n.coverImage ? <img src={n.coverImage} alt="" className="w-full h-full object-cover" /> : <FileCode size={16} className="text-zinc-500" />}
                       </div>
                       <div>
                          <p className="text-xs font-bold text-white uppercase tracking-wider">{n.title}</p>
                          <p className="text-[9px] text-zinc-600 font-bold uppercase italic mt-0.5">Note • {n.attachments.length} Assets</p>
                       </div>
                    </div>
                    {currentProject?.id === n.id ? <Check size={18} className="text-green-500" /> : <Plus className="text-zinc-700 opacity-0 group-hover:opacity-100" size={18} />}
                 </button>
              )) : <div className="text-center py-12 text-zinc-600 italic text-xs">No matching notes found.</div>
           ) : (
              filteredCommunity.length > 0 ? filteredCommunity.map(p => (
                 <button 
                   key={p.id}
                   onClick={() => onSelect({ 
                     id: p.id, 
                     title: p.title, 
                     image: p.photoURL, 
                     type: 'community', 
                     code: p.fullCode || p.content 
                   })}
                   className="w-full p-4 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all text-left group"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-zinc-900 overflow-hidden flex items-center justify-center border border-white/5 shadow-inner">
                          {(p.fullCode || p.content) ? <MiniCodePreview code={p.fullCode || p.content} title={p.title} /> : p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : <Globe size={16} className="text-zinc-500" />}
                       </div>
                       <div>
                          <p className="text-xs font-bold text-white uppercase tracking-wider">{p.title}</p>
                          <p className="text-[9px] text-zinc-600 font-bold uppercase italic mt-0.5">Community • by {p.displayName}</p>
                       </div>
                    </div>
                    {currentProject?.id === p.id ? <Check size={18} className="text-green-500" /> : <Plus className="text-zinc-700 opacity-0 group-hover:opacity-100" size={18} />}
                 </button>
              )) : <div className="text-center py-12 text-zinc-600 italic text-xs">No matching community posts.</div>
           )}
        </div>

        <div className="p-4 bg-white/2 border-t border-white/5 text-center">
           <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em]">Select a design to feature it on your home screen</p>
        </div>
      </div>
    </div>
  );
}

// Reuse Plus icon from lucide-react (using local Plus in Picker is fine)
function Plus({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
