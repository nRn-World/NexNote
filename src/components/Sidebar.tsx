import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Plus, Search, Paperclip, Pin, Trash2, Moon, Sun, FolderInput, Pencil, Image, CheckSquare, Square, X, FolderOpen, Globe } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Note, Category } from '../types';
import { cn } from '../lib/utils';
import CategoryManager from './CategoryManager';
import ContextMenu, { ContextMenuItem } from './ContextMenu';

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
  onMoveNote: (noteId: string, categoryId: string | undefined) => void;
  onMoveManyNotes: (noteIds: string[], categoryId: string | undefined) => void;
  onDeleteManyNotes: (noteIds: string[]) => void;
  onRenameNote: (noteId: string, title: string) => void;
  onChangeCoverImage: (noteId: string) => void;
  onChangeColor?: (id: string, color: string) => void;
  onOpenCommunity: () => void;
}

// Submenu for category selection
function CategorySubmenu({ categories, onSelect, onClose, anchorX, anchorY }: {
  categories: Category[]; onSelect: (id: string | undefined) => void;
  onClose: () => void; anchorX: number; anchorY: number;
}) {
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(anchorY, window.innerHeight - 300),
    left: Math.min(anchorX + 210, window.innerWidth - 220),
    zIndex: 10000,
  };
  return (
    <div style={style} className="w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl py-1 overflow-hidden">
      <button onClick={() => { onSelect(undefined); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
        <FolderOpen size={13} className="opacity-50" /> Ingen kategori
      </button>
      {categories.map(cat => (
        <button key={cat.id} onClick={() => { onSelect(cat.id); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
          {cat.name}
        </button>
      ))}
    </div>
  );
}

function SortableNote({
  note, activeNoteId, isSelected, isSelecting, onSelect, onToggleSelect, onContextMenu
}: {
  note: Note; activeNoteId: string | null; isSelected: boolean; isSelecting: boolean;
  onSelect: (id: string) => void; onToggleSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, note: Note) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || isSelecting) { onToggleSelect(note.id); return; }
    onSelect(note.id);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={handleClick}
      onContextMenu={e => { e.preventDefault(); onContextMenu(e, note); }}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-colors group relative cursor-pointer flex gap-3 select-none',
        isSelected ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700'
          : activeNoteId === note.id ? 'bg-zinc-100 dark:bg-zinc-700'
          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
      )}
    >
      {/* Checkbox for multi-select */}
      {(isSelecting || isSelected) && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
          {isSelected
            ? <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
            : <Square size={16} className="text-zinc-300 dark:text-zinc-600" />
          }
        </div>
      )}
      {note.isPinned && !isSelecting && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-zinc-900 dark:bg-white rounded-r-full" />
      )}
      <div className={cn('flex-1 min-w-0', (isSelecting || isSelected) && 'pl-5')}>
        <div className="flex items-center gap-1.5">
          {note.isPinned && <Pin size={12} className="text-zinc-400 fill-zinc-400 shrink-0" />}
          <h3 className="font-medium truncate flex-1 text-zinc-900 dark:text-zinc-100">{note.title || 'Namnlös anteckning'}</h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">{note.content.replace(/<[^>]*>/g, '') || 'Ingen text...'}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-zinc-400">
            <span>{format(note.updatedAt, 'd MMM', { locale: sv })}</span>
            {note.attachments.length > 0 && <span className="flex items-center gap-1"><Paperclip size={10} /> {note.attachments.length}</span>}
          </div>
          {note.tags && note.tags.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-500" title={note.tags.join(', ')} />}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({
  notes, activeNoteId, searchQuery, onSearchChange,
  onSelectNote, onCreateNote, onDeleteNote, onLogout, onImageClick,
  onReorderNotes, isDark, onToggleDark,
  categories, activeCategoryId, onSelectCategory,
  onCreateCategory, onRenameCategory, onDeleteCategory,
  onMoveNote, onMoveManyNotes, onDeleteManyNotes,
  onRenameNote, onChangeCoverImage, onChangeColor, onOpenCommunity,
}: SidebarProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [subMenu, setSubMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCatMenu, setBulkCatMenu] = useState<{ x: number; y: number } | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [pendingCoverNoteId, setPendingCoverNoteId] = useState<string | null>(null);

  const isSelecting = selectedIds.size > 0;

  const filtered = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.replace(/<[^>]*>/g, '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategoryId === null || n.categoryId === activeCategoryId;
    return matchesSearch && matchesCategory;
  });

  const noteCountByCategory: Record<string, number> = {};
  categories.forEach(c => { noteCountByCategory[c.id] = notes.filter(n => n.categoryId === c.id).length; });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filtered.findIndex(n => n.id === active.id);
    const newIndex = filtered.findIndex(n => n.id === over.id);
    const reordered = arrayMove(filtered, oldIndex, newIndex).map((n, i) => ({ ...n, order: i }));
    onReorderNotes(reordered);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleNoteContextMenu = (e: React.MouseEvent, note: Note) => {
    // If note is not selected, select only it; if already in selection keep all
    if (!selectedIds.has(note.id)) setSelectedIds(new Set([note.id]));

    const items: ContextMenuItem[] = [
      {
        label: 'Byt namn',
        icon: <Pencil size={14} />,
        onClick: () => {
          const newTitle = window.prompt('Nytt namn:', note.title);
          if (newTitle !== null) onRenameNote(note.id, newTitle);
        },
      },
      {
        label: 'Byt omslagsbild',
        icon: <Image size={14} />,
        onClick: () => { setPendingCoverNoteId(note.id); coverInputRef.current?.click(); },
      },
      {
        label: 'Flytta till kategori →',
        icon: <FolderInput size={14} />,
        divider: true,
        onClick: () => setSubMenu({ x: e.clientX, y: e.clientY, noteId: note.id }),
      },
      {
        label: 'Ta bort anteckning',
        icon: <Trash2 size={14} />,
        danger: true,
        divider: true,
        onClick: () => onDeleteNote(note.id),
      },
    ];
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingCoverNoteId) return;
    const reader = new FileReader();
    reader.onload = () => {
      window.dispatchEvent(new CustomEvent('nexnote:coverimage', {
        detail: { noteId: pendingCoverNoteId, dataUrl: reader.result }
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setPendingCoverNoteId(null);
  };

  return (
    <div className={cn(
      'flex-col w-full md:w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700 h-full flex-shrink-0 z-20 absolute md:relative transition-transform duration-300 ease-in-out',
      activeNoteId ? '-translate-x-full md:translate-x-0' : 'translate-x-0 flex'
    )}>
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">NexNote</h1>
          <div className="flex items-center gap-1">
            <button onClick={onToggleDark} className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={onLogout} className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Logga ut
            </button>
            <button onClick={onCreateNote} className="p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md hover:opacity-90 transition-opacity">
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
          <input type="text" placeholder="Sök anteckningar..." value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-transparent rounded-md text-sm focus:bg-white dark:focus:bg-zinc-700 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-600 outline-none transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
          />
        </div>
      </div>

      <div className="border-b border-zinc-100 dark:border-zinc-800 py-2">
        <CategoryManager
          categories={categories} activeCategoryId={activeCategoryId}
          onSelect={onSelectCategory} onCreate={onCreateCategory}
          onRename={onRenameCategory} onDelete={onDeleteCategory}
          onChangeColor={onChangeColor || (() => {})}
          noteCountByCategory={noteCountByCategory}
        />
      </div>

      {/* Community button */}
      <div className="px-2 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={onOpenCommunity}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Globe size={14} className="text-blue-500" />
          <span className="flex-1 text-left font-medium">Community</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">Live</span>
        </button>
      </div>

      {/* Bulk action bar */}
      {isSelecting && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 flex-1">{selectedIds.size} markerade</span>
          <button
            onClick={e => setBulkCatMenu({ x: e.clientX, y: e.clientY })}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            <FolderInput size={12} /> Flytta
          </button>
          <button
            onClick={() => { onDeleteManyNotes(Array.from(selectedIds)); clearSelection(); }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 hover:bg-red-100"
          >
            <Trash2 size={12} /> Radera
          </button>
          <button onClick={clearSelection} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center text-zinc-500 dark:text-zinc-400 py-8 text-sm">Inga anteckningar hittades.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map(n => n.id)} strategy={verticalListSortingStrategy}>
              {filtered.map(note => (
                <SortableNote
                  key={note.id} note={note} activeNoteId={activeNoteId}
                  isSelected={selectedIds.has(note.id)} isSelecting={isSelecting}
                  onSelect={id => { clearSelection(); onSelectNote(id); }}
                  onToggleSelect={toggleSelect}
                  onContextMenu={handleNoteContextMenu}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
        {!isSelecting && filtered.length > 0 && (
          <p className="text-center text-[10px] text-zinc-300 dark:text-zinc-600 pt-2">Ctrl+klick för att markera flera</p>
        )}
      </div>

      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverImageChange} />

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}

      {/* Single note category submenu */}
      {subMenu && (
        <CategorySubmenu
          categories={categories}
          anchorX={subMenu.x} anchorY={subMenu.y}
          onSelect={catId => { onMoveNote(subMenu.noteId, catId); setSubMenu(null); }}
          onClose={() => setSubMenu(null)}
        />
      )}

      {/* Bulk move category submenu */}
      {bulkCatMenu && (
        <CategorySubmenu
          categories={categories}
          anchorX={bulkCatMenu.x} anchorY={bulkCatMenu.y}
          onSelect={catId => { onMoveManyNotes(Array.from(selectedIds), catId); clearSelection(); setBulkCatMenu(null); }}
          onClose={() => setBulkCatMenu(null)}
        />
      )}
    </div>
  );
}
