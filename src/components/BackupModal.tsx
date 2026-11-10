import React, { useState } from 'react';
import { Download, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface BackupModalProps {
  open: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function BackupModal({ open, onClose, onExport, onImport }: BackupModalProps) {
  const [imported, setImported] = useState<string | null>(null);

  if (!open) return null;

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      setImported(null);
      alert('Choose a .json file exported from NexNote.');
      return;
    }
    onImport(file);
    setImported(file.name);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10 overflow-hidden flex flex-col max-h-[75vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-800/30">
          <div className="flex items-center gap-2">
            <Download size={20} className="text-indigo-500" />
            <h2 className="text-base font-bold text-white">Backup</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[50vh] no-scrollbar">
          <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-800/30">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Download backup</h3>
            <p className="text-sm text-zinc-400 mb-4">
              All your notes, trash, and categories are saved in a JSON file that you can import later — on another device or after reinstalling.
            </p>
            <button onClick={onExport} className="w-full py-3 px-4 rounded-xl text-xs font-bold text-indigo-400 bg-indigo-900/20 hover:bg-indigo-900/30 border border-indigo-800 transition-colors flex items-center justify-center gap-2">
              <Download size={16} /> Export all notes
            </button>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-800/30">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Restore from file</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Choose a previously exported NexNote file (.json). The notes will be added to your current account.
            </p>
            <label className="block w-full">
              <input type="file" accept=".json" className="sr-only" onChange={handleImportChange} />
              <button className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center justify-center gap-2">
                <Upload size={16} /> Choose backup…
              </button>
            </label>
            {imported && (
              <p className="mt-2 text-xs flex items-center gap-1.5 text-green-400">
                <CheckCircle size={14} /> Imported: <span className="font-mono truncate max-w-xs">{imported}</span>
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl border border-amber-900/30 bg-amber-900/10">
            <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400 mt-1">
              Importing creates new copies of the notes — existing items will not be overwritten.
            </p>
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
