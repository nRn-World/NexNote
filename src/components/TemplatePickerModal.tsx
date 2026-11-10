import React from 'react';
import { Sparkles, X, Code2, FileText, Calendar, Mail } from 'lucide-react';
import { cn } from '../lib/utils';

interface Template {
  id: string;
  title: string;
  content: string;
  tags: string[];
  categoryId?: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'blank', title: 'Blank note', content: '<p>Start writing here…</p>', tags: [],
    icon: <FileText size={16} />, label: 'Blank', desc: 'An empty note to fill in.',
  },
  {
    id: 'code', title: 'Code snippet', content: '<h3>Description</h3><p>What does the code do?</p><h3>Code</h3><pre><code>// Your code here</code></pre>', tags: ['code'],
    icon: <Code2 size={16} />, label: 'Code', desc: 'For code snippets and technical notes.',
  },
  {
    id: 'meeting', title: 'Meeting notes', content: '<h3>Meeting</h3><p><strong>Date:</strong> <br/><strong>Attendees:</strong> <br/><strong>Topic:</strong> </p><h3>Discussed</h3><ul><li></li></ul><h3>Action items</h3><ul><li>[ ] </li></ul>', tags: ['meeting', 'work'],
    icon: <Mail size={16} />, label: 'Meeting', desc: 'Structure for meeting notes and actions.',
  },
  {
    id: 'journal', title: 'Journal / Diary', content: '<h3>{date}</h3><p>Today feels like…</p><h3>Good things today</h3><ul><li></li></ul><h3>Things to remember</h3><ul><li></li></ul>', tags: ['journal', 'personal'],
    icon: <Calendar size={16} />, label: 'Journal', desc: 'A template for your daily thoughts.',
  },
];

interface TemplatePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: { id: string; title: string; content: string; tags?: string[]; categoryId?: string }) => void;
}

export default function TemplatePickerModal({ open, onClose, onSelect }: TemplatePickerModalProps) {
  if (!open) return null;

  const now = new Date();
  const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full border border-white/10 overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-800/30">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-cyan-400" />
            <h2 className="text-base font-bold text-white">New note from template</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh] no-scrollbar">
          <p className="text-sm text-zinc-400 mb-6">
            Pick a template. The date is filled in automatically in the journal template.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map(t => {
              const content = t.id === 'journal' ? t.content.replace('{date}', dateString) : t.content;
              return (
                <button
                  key={t.id}
                  onClick={() => { onSelect({ ...t, content }); }}
                  className={cn(
                    'flex flex-col gap-3 p-4 rounded-xl border transition-all text-left group',
                    'bg-zinc-800/30 border-zinc-700 hover:bg-zinc-800/50 hover:border-cyan-500/50'
                  )}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-900/20 text-cyan-400 group-hover:bg-cyan-400 group-hover:text-black transition-colors shrink-0">
                    {t.icon}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{t.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800/50 bg-zinc-800/30">
          <button onClick={onClose} className="w-full py-2 px-4 rounded-xl text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
