import React from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Plus, Search, Paperclip, Maximize2, Pin, Trash2 } from 'lucide-react';
import { Note } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onLogout: () => void;
  onImageClick: (url: string) => void;
}

export default function Sidebar({
  notes, activeNoteId, searchQuery, onSearchChange,
  onSelectNote, onCreateNote, onDeleteNote, onLogout, onImageClick,
}: SidebarProps) {
  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn(
      "flex-col w-full md:w-80 bg-white border-r border-zinc-200 h-full flex-shrink-0 z-20 absolute md:relative transition-transform duration-300 ease-in-out",
      activeNoteId ? "-translate-x-full md:translate-x-0" : "translate-x-0 flex"
    )}>
      <div className="p-4 border-b border-zinc-200 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">NexNote</h1>
          <div className="flex items-center gap-2">
            <button onClick={onLogout} className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors" title="Logga ut">
              Logga ut
            </button>
            <button onClick={onCreateNote} className="p-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors" title="Ny anteckning (Ctrl+N)">
              <Plus size={20} />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Sök anteckningar..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-100 border-transparent rounded-md text-sm focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center text-zinc-500 py-8 text-sm">Inga anteckningar hittades.</div>
        ) : (
          filtered.map(note => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors group relative cursor-pointer flex gap-3",
                activeNoteId === note.id ? "bg-zinc-100" : "hover:bg-zinc-50"
              )}
            >
              {note.isPinned && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-zinc-900 rounded-r-full" />
              )}
              {(note.coverImage || note.attachments.some(a => a.type.startsWith('image/'))) && (
                <div
                  className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-zinc-200 border border-zinc-200 relative group/img cursor-zoom-in"
                  onClick={e => {
                    e.stopPropagation();
                    const url = note.coverImage || note.attachments.find(a => a.type.startsWith('image/'))?.data;
                    if (url) onImageClick(url);
                  }}
                >
                  <img
                    src={note.coverImage || note.attachments.find(a => a.type.startsWith('image/'))?.data}
                    alt="Thumbnail"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 size={16} className="text-white" />
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {note.isPinned && <Pin size={12} className="text-zinc-400 fill-zinc-400" />}
                  <h3 className="font-medium truncate flex-1">{note.title || 'Namnlös anteckning'}</h3>
                </div>
                <p className="text-xs text-zinc-500 mt-1 truncate">{note.content || 'Ingen text...'}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-zinc-400">
                    <span>{format(note.updatedAt, 'd MMM', { locale: sv })}</span>
                    {note.attachments.length > 0 && (
                      <span className="flex items-center gap-1"><Paperclip size={10} /> {note.attachments.length}</span>
                    )}
                  </div>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" title={note.tags.join(', ')} />
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onDeleteNote(note.id); }}
                className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
