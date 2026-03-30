import React from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Plus, Search, Paperclip, Maximize2, Pin, Trash2, Moon, Sun } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Note, Category } from '../types';
import { cn } from '../lib/utils';
import CategoryManager from './CategoryManager';

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
  onReorderNotes: (notes: Note[]) => void;
  isDark: boolean;
  onToggleDark: () => void;
  categories: Category[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onCreateCategory: (name: string, color: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
}

function SortableNote({ note, activeNoteId, onSelect, onDelete, onImageClick }: {
  note: Note; activeNoteId: string | null;
  onSelect: (id: string) => void; onDelete: (id: string) => void; onImageClick: (url: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(note.id)}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-colors group relative cursor-pointer flex gap-3 select-none',
        activeNoteId === note.id
          ? 'bg-zinc-100 dark:bg-zinc-700'
          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
      )}
    >
      {note.isPinned && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-zinc-900 dark:bg-white rounded-r-full" />
      )}
      {(note.coverImage || note.attachments.some(a => a.type.startsWith('image/'))) && (
        <div
          className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-zinc-200 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 relative group/img cursor-zoom-in"
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
          <h3 className="font-medium truncate flex-1 text-zinc-900 dark:text-zinc-100">{note.title || 'Namnlös anteckning'}</h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">{note.content.replace(/<[^>]*>/g, '') || 'Ingen text...'}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-zinc-400">
            <span>{format(note.updatedAt, 'd MMM', { locale: sv })}</span>
            {note.attachments.length > 0 && (
              <span className="flex items-center gap-1"><Paperclip size={10} /> {note.attachments.length}</span>
            )}
          </div>
          {note.tags && note.tags.length > 0 && (
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-500" title={note.tags.join(', ')} />
          )}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(note.id); }}
        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function Sidebar({
  notes, activeNoteId, searchQuery, onSearchChange,
  onSelectNote, onCreateNote, onDeleteNote, onLogout, onImageClick,
  onReorderNotes, isDark, onToggleDark,
  categories, activeCategoryId, onSelectCategory,
  onCreateCategory, onRenameCategory, onDeleteCategory,
}: SidebarProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filtered = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.replace(/<[^>]*>/g, '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategoryId === null || n.categoryId === activeCategoryId;
    return matchesSearch && matchesCategory;
  });

  const noteCountByCategory: Record<string, number> = {};
  categories.forEach(c => { noteCountByCategory[c.id] = notes.filter(n => n.categoryId === c.id).length; });
  const totalCount = notes.length;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filtered.findIndex(n => n.id === active.id);
    const newIndex = filtered.findIndex(n => n.id === over.id);
    const reordered = arrayMove(filtered, oldIndex, newIndex).map((n, i) => ({ ...n, order: i }));
    onReorderNotes(reordered);
  };

  return (
    <div className={cn(
      'flex-col w-full md:w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700 h-full flex-shrink-0 z-20 absolute md:relative transition-transform duration-300 ease-in-out',
      activeNoteId ? '-translate-x-full md:translate-x-0' : 'translate-x-0 flex'
    )}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">NexNote</h1>
          <div className="flex items-center gap-1">
            <button onClick={onToggleDark} className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Byt tema">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={onLogout} className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Logga ut
            </button>
            <button onClick={onCreateNote} className="p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md hover:opacity-90 transition-opacity" title="Ny anteckning (Ctrl+N)">
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
          <input
            type="text"
            placeholder="Sök anteckningar..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-transparent rounded-md text-sm focus:bg-white dark:focus:bg-zinc-700 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-600 outline-none transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="border-b border-zinc-100 dark:border-zinc-800 py-2">
        <CategoryManager
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelect={onSelectCategory}
          onCreate={onCreateCategory}
          onRename={onRenameCategory}
          onDelete={onDeleteCategory}
          noteCountByCategory={{ ...noteCountByCategory, all: totalCount }}
        />
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center text-zinc-500 dark:text-zinc-400 py-8 text-sm">Inga anteckningar hittades.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map(n => n.id)} strategy={verticalListSortingStrategy}>
              {filtered.map(note => (
                <SortableNote
                  key={note.id}
                  note={note}
                  activeNoteId={activeNoteId}
                  onSelect={onSelectNote}
                  onDelete={onDeleteNote}
                  onImageClick={onImageClick}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
