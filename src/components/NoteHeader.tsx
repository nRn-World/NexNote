import React from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  ChevronLeft, Pin, Sparkles, FileIcon, HistoryIcon,
  ImageIcon, Paperclip, Code, Share2, FolderOpen
} from 'lucide-react';
import { Note, Category } from '../types';
import { cn } from '../lib/utils';

interface NoteHeaderProps {
  note: Note;
  isAiProcessing: boolean;
  showHistory: boolean;
  categories: Category[];
  onBack: () => void;
  onTogglePin: () => void;
  onToggleHistory: () => void;
  onAiFix: () => void;
  onAiSummarize: () => void;
  onImageClick: () => void;
  onFileClick: () => void;
  onToggleCode: () => void;
  onShare: () => void;
  onCategoryChange: (categoryId: string | undefined) => void;
}

export default function NoteHeader({
  note, isAiProcessing, showHistory, categories,
  onBack, onTogglePin, onToggleHistory,
  onAiFix, onAiSummarize, onImageClick, onFileClick, onToggleCode, onShare, onCategoryChange,
}: NoteHeaderProps) {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700 flex flex-col bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="h-14 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {note.isPinned && <Pin size={12} className="inline mr-1 text-zinc-400 fill-zinc-400" />}
            Ändrad {format(note.updatedAt, 'd MMM HH:mm', { locale: sv })}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center gap-1 mr-1 pr-1 border-r border-zinc-200 dark:border-zinc-700">
            <button onClick={onAiFix} disabled={isAiProcessing}
              className="p-1.5 text-zinc-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors disabled:opacity-50" title="Förbättra text med AI">
              <Sparkles size={17} className={cn(isAiProcessing && 'animate-pulse')} />
            </button>
            <button onClick={onAiSummarize} disabled={isAiProcessing}
              className="p-1.5 text-zinc-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors disabled:opacity-50" title="Sammanfatta med AI">
              <FileIcon size={17} />
            </button>
          </div>

          <div className="flex items-center gap-1 mr-1 pr-1 border-r border-zinc-200 dark:border-zinc-700">
            <button onClick={onTogglePin}
              className={cn('p-1.5 rounded-md transition-colors',
                note.isPinned ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )} title={note.isPinned ? 'Ta bort nål' : 'Nåla fast'}>
              <Pin size={17} className={cn(note.isPinned && 'fill-blue-600')} />
            </button>
            <button onClick={onToggleHistory}
              className={cn('p-1.5 rounded-md transition-colors',
                showHistory ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )} title="Historik">
              <HistoryIcon size={17} />
            </button>
            <button onClick={onShare}
              className={cn('p-1.5 rounded-md transition-colors',
                note.isShared ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )} title="Dela anteckning">
              <Share2 size={17} />
            </button>
          </div>

          <button onClick={onImageClick} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Lägg till bild">
            <ImageIcon size={17} />
          </button>
          <button onClick={onFileClick} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Bifoga fil">
            <Paperclip size={17} />
          </button>
          <button onClick={onToggleCode}
            className={cn('p-1.5 rounded-md transition-colors',
              note.code ? 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
            )} title="Kodredigerare">
            <Code size={17} />
          </button>
        </div>
      </div>

      {/* Category bar */}
      <div className="px-4 pb-2 flex items-center gap-2">
        <FolderOpen size={13} className="text-zinc-400 shrink-0" />
        <select
          value={note.categoryId || ''}
          onChange={e => onCategoryChange(e.target.value || undefined)}
          className="text-xs text-zinc-500 dark:text-zinc-400 bg-transparent border-none outline-none cursor-pointer hover:text-zinc-900 dark:hover:text-white"
        >
          <option value="">Ingen kategori</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
