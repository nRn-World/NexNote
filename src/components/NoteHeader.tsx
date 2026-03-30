import React from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  ChevronLeft, Pin, Sparkles, FileIcon, HistoryIcon,
  ImageIcon, Paperclip, Code
} from 'lucide-react';
import { Note } from '../types';
import { cn } from '../lib/utils';

interface NoteHeaderProps {
  note: Note;
  isAiProcessing: boolean;
  showHistory: boolean;
  onBack: () => void;
  onTogglePin: () => void;
  onToggleHistory: () => void;
  onAiFix: () => void;
  onAiSummarize: () => void;
  onImageClick: () => void;
  onFileClick: () => void;
  onToggleCode: () => void;
}

export default function NoteHeader({
  note, isAiProcessing, showHistory,
  onBack, onTogglePin, onToggleHistory,
  onAiFix, onAiSummarize, onImageClick, onFileClick, onToggleCode,
}: NoteHeaderProps) {
  return (
    <div className="h-16 border-b border-zinc-200 flex items-center px-4 justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="text-xs text-zinc-500">
          {note.isPinned && <Pin size={12} className="inline mr-1 text-zinc-400 fill-zinc-400" />}
          Ändrad {format(note.updatedAt, 'd MMM HH:mm', { locale: sv })}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="hidden sm:flex items-center gap-1 mr-2 pr-2 border-r border-zinc-200">
          <button
            onClick={onAiFix}
            disabled={isAiProcessing}
            className="p-1.5 text-zinc-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50"
            title="Förbättra text med AI"
          >
            <Sparkles size={18} className={cn(isAiProcessing && 'animate-pulse')} />
          </button>
          <button
            onClick={onAiSummarize}
            disabled={isAiProcessing}
            className="p-1.5 text-zinc-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50"
            title="Sammanfatta med AI"
          >
            <FileIcon size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-zinc-200">
          <button
            onClick={onTogglePin}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              note.isPinned ? 'text-blue-600 bg-blue-50' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            )}
            title={note.isPinned ? 'Ta bort nål' : 'Nåla fast'}
          >
            <Pin size={18} className={cn(note.isPinned && 'fill-blue-600')} />
          </button>
          <button
            onClick={onToggleHistory}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              showHistory ? 'text-blue-600 bg-blue-50' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            )}
            title="Historik"
          >
            <HistoryIcon size={18} />
          </button>
        </div>

        <button onClick={onImageClick} className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors" title="Lägg till bild">
          <ImageIcon size={18} />
        </button>
        <button onClick={onFileClick} className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors" title="Bifoga fil">
          <Paperclip size={18} />
        </button>
        <button
          onClick={onToggleCode}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            note.code ? 'text-blue-700 bg-blue-100 hover:bg-blue-200' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
          )}
          title="Kodredigerare"
        >
          <Code size={18} />
        </button>
      </div>
    </div>
  );
}
