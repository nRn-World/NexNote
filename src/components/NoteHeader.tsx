import React from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  ChevronLeft, Pin, HistoryIcon,
  ImageIcon, Paperclip, Code, Share2, FolderOpen, Save, Check, Loader2,
  Printer, Copy, Maximize, Maximize2, Image, Clock, Bell
} from 'lucide-react';
import { Note, Category } from '../types';
import { cn } from '../lib/utils';

interface NoteHeaderProps {
  note: Note;
  isAiProcessing?: boolean;
  showHistory: boolean;
  categories: Category[];
  isSaving: boolean;
  isSaved: boolean;
  onBack: () => void;
  onTogglePin: () => void;
  onToggleHistory: () => void;
  onImageClick: () => void;
  onFileClick: () => void;
  onToggleCode: () => void;
  onShare: () => void;
  onSave: () => void;
  onCategoryChange: (categoryId: string | undefined) => void;
  onPrint: () => void;
  onDuplicate: () => void;
  onToggleFocus: () => void;
  onDownloadImage: () => void;
  isFocusMode: boolean;
  wordCount: number;
  readingTime: number;
  onSetReminder: (reminderAt: number | null) => void;
}

export default function NoteHeader({
  note, isAiProcessing, showHistory, categories, isSaving, isSaved,
  onBack, onTogglePin, onToggleHistory,
  onImageClick, onFileClick, onToggleCode, onShare, onSave, onCategoryChange,
  onPrint, onDuplicate, onToggleFocus, onDownloadImage, isFocusMode,
  wordCount, readingTime, onSetReminder,
}: NoteHeaderProps) {
  return (
    <div className="glass-panel border-b border-white/10 sticky top-0 z-20 transition-all">
      <div className="h-16 flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Status</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            </div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
              Uppdaterad {format(note.updatedAt, 'd MMM HH:mm', { locale: enUS })}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-0.5">
              <span>{wordCount} ord</span>
              <span className="w-px h-2 bg-zinc-700 mx-1" />
              <span>{readingTime} min lästid</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2 pr-3 border-r border-white/10">
            <button onClick={onTogglePin}
              className={cn('p-2 rounded-xl transition-all',
                note.isPinned ? 'text-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(0,242,255,0.15)] neon-border-cyan' : 'text-zinc-500 hover:text-white hover:bg-white/3'
              )} title={note.isPinned ? 'Avfäst' : 'Fäst'}>
              <Pin size={18} className={cn(note.isPinned && 'fill-cyan-400')} />
            </button>
            <button onClick={onToggleHistory}
              className={cn('p-2 rounded-xl transition-all',
                showHistory ? 'text-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(0,242,255,0.15)] neon-border-cyan' : 'text-zinc-500 hover:text-white hover:bg-white/3'
              )} title="Historik">
              <HistoryIcon size={18} />
            </button>
            <button onClick={onShare}
              className={cn('p-2 rounded-xl transition-all',
                note.isShared ? 'text-purple-400 bg-purple-400/10 shadow-[0_0_15px_rgba(188,0,255,0.15)]' : 'text-zinc-500 hover:text-white hover:bg-white/3'
              )} title="Dela anteckning">
              <Share2 size={18} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={onImageClick} className="p-2 text-zinc-400 hover:text-white hover:bg-white/3 rounded-xl transition-colors" title="Lägg till bild">
              <ImageIcon size={18} />
            </button>
            <button onClick={onFileClick} className="p-2 text-zinc-400 hover:text-white hover:bg-white/3 rounded-xl transition-colors" title="Bifoga fil">
              <Paperclip size={18} />
            </button>
            <button onClick={onToggleCode}
              className={cn('p-2 rounded-xl transition-all',
                note.code ? 'text-cyan-400 bg-cyan-400/10' : 'text-zinc-500 hover:text-white hover:bg-white/3'
              )} title="Kodeditor">
              <Code size={18} />
            </button>
            <button onClick={onPrint}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/3 rounded-xl transition-colors" title="Skriv ut anteckning">
              <Printer size={18} />
            </button>
            <button onClick={onDuplicate}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/3 rounded-xl transition-colors" title="Duplicera anteckning">
              <Copy size={18} />
            </button>
            <button onClick={onToggleFocus}
              className={cn('p-2 rounded-xl transition-all',
                isFocusMode ? 'text-cyan-400 bg-cyan-400/10' : 'text-zinc-500 hover:text-white hover:bg-white/3'
              )} title={isFocusMode ? 'Avsluta fokusläge' : 'Fokusläge'}>
              {isFocusMode ? <Maximize2 size={18} /> : <Maximize size={18} />}
            </button>
            <button onClick={onDownloadImage}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/3 rounded-xl transition-colors" title="Ladda ned som bild">
              <Image size={18} />
            </button>
            <button onClick={() => onSetReminder(note.reminderAt ? null : Date.now() + 3600000)}
              className={cn('p-2 rounded-xl transition-all', 
                note.reminderAt ? 'text-yellow-400 bg-yellow-400/10' : 'text-zinc-500 hover:text-yellow-400 hover:bg-white/3'
              )} title={note.reminderAt ? 'Ta bort påminnelse' : 'Sätt påminnelse (1 timme)'}>
              <Bell size={18} />
              {note.reminderAt && <span className="text-[10px] font-bold text-yellow-400">⏰</span>}
            </button>
          </div>

          <button
            onClick={onSave}
            disabled={isSaving || isSaved}
            className={cn(
              'ml-3 flex items-center gap-2 px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
              isSaved
                ? 'bg-transparent text-green-400 border border-green-400/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                : 'bg-zinc-900 text-white hover:scale-105 active:scale-95 disabled:opacity-50'
            )}
            title="Spara (Ctrl+S)"
          >
            {isSaving
              ? <Loader2 size={14} className="animate-spin" />
              : isSaved
                ? <Check size={14} />
                : <Save size={14} />}
            <span className="hidden sm:inline">
              {isSaving ? 'Synkar...' : isSaved ? 'Sparad' : 'Spara'}
            </span>
          </button>
        </div>
      </div>

      <div className="px-6 h-10 flex items-center gap-3 border-t border-white/10 bg-white/3">
        <FolderOpen size={12} className="text-zinc-500 shrink-0" />
        <select
          value={note.categoryId || ''}
          onChange={e => onCategoryChange(e.target.value || undefined)}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 bg-transparent border-none outline-none cursor-pointer hover:text-cyan-400 transition-colors"
        >
          <option value="" className="bg-[#0B0D17]">Ingen kategori</option>
          {categories.map(c => (
            <option key={c.id} value={c.id} className="bg-[#0B0D17]">{c.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
