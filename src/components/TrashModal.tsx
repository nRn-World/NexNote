import React, { useEffect, useState } from 'react';
import { Trash2, RotateCcw, X, Clock, AlertTriangle } from 'lucide-react';
import { Note } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface TrashModalProps {
  open: boolean;
  trash: Note[];
  onClose: () => void;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
  onEmpty: () => void;
}

export default function TrashModal({ open, trash, onClose, onRestore, onDeleteForever, onEmpty }: TrashModalProps) {
  if (!open) return null;

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full border border-white/10 overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-800/30">
          <div className="flex items-center gap-2">
            <Trash2 size={20} className="text-amber-500" />
            <h2 className="text-base font-bold text-white">Trash</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-widest font-bold">
            Notes stay here for 30 days before being permanently deleted.
          </p>

          {trash.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trash2 size={48} className="text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">Trash is empty</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[60vh] no-scrollbar space-y-2">
              {trash.map(note => (
                <div key={note.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/50 bg-zinc-800/30 group hover:bg-zinc-800/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{note.title || 'Untitled note'}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                      {plainExcerpt(note.content)} · {format(new Date(note.deletedAt || note.updatedAt), 'MMM d, HH:mm', { locale: enUS })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <button onClick={() => onRestore(note.id)} className="p-1.5 text-green-500 hover:bg-green-900/20 rounded-lg transition-colors" title="Restore">
                      <RotateCcw size={16} />
                    </button>
                    <button onClick={() => onDeleteForever(note.id)} className="p-1.5 text-red-500 hover:bg-red-900/20 rounded-lg transition-colors" title="Delete permanently">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {trash.length > 0 && (
          <div className="p-4 border-t border-zinc-800/50 bg-zinc-800/30">
            <button onClick={onEmpty} className="w-full py-2 px-4 text-xs font-bold text-red-500 hover:bg-red-900/20 rounded-xl transition-colors border border-red-900/20">
              <AlertTriangle size={14} className="mr-1.5" /> Empty trash permanent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function plainExcerpt(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) + (html.length > 90 ? '…' : '');
}
