import React from 'react';
import { Keyboard, X, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
}

const shortcuts = [
  { key: '⌘/ Ctrl + N', label: 'New note' },
  { key: '⌘/ Ctrl + S', label: 'Save note' },
  { key: '⌘/ Ctrl + /', label: 'Show shortcuts' },
  { key: 'Esc', label: 'Go back / close panels' },
  { key: '?', label: 'Shortcut list' },
];

export default function ShortcutsModal({ open, onClose, isDark }: ShortcutsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10 overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-800/30">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-cyan-400" />
            <h2 className="text-base font-bold text-white">Keyboard shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto max-h-[60vh] no-scrollbar">
          <p className="text-sm text-zinc-400">
            Works throughout the app. <span className="font-mono text-xs text-zinc-500">⌘</span> = Command (Mac), <span className="font-mono text-xs text-zinc-500">Ctrl</span> = Windows/Linux.
          </p>
          <div className="space-y-1.5">
            {shortcuts.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800/40 bg-zinc-800/30">
                <span className="text-sm text-zinc-300">{s.label}</span>
                <span className="text-xs font-mono font-bold text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 select-none">
                  {s.key}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800/50 bg-zinc-800/30">
          <button onClick={onClose} className="w-full py-2 px-4 rounded-xl text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
