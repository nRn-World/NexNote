import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Plus, Search, Paperclip, Pin, Trash2, FolderInput, Pencil, Image, CheckSquare, Square, X, FolderOpen, Globe, UserCircle, LogOut } from 'lucide-react';
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
  onOpenProfile: () => void;
  onOpenPrivacy: () => void;
  user: any;
}

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
    <div style={style} className="w-56 glass-panel rounded-2xl shadow-2xl py-1.5 overflow-hidden border border-white/10">
      <button onClick={() => { onSelect(undefined); onClose(); }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors">
        <FolderOpen size={14} className="opacity-50" /> No category
      </button>
      {categories.map(cat => (
        <button key={cat.id} onClick={() => { onSelect(cat.id); onClose(); }}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ background: cat.color }} />
          {cat.name}
        </button>
      ))}
    </div>
  );
}

function SortableNote({
  note, activeNoteId, isSelected, isSelecting, onSelect, onToggleSelect, onContextMenu, onImageClick
}: {
  note: Note; activeNoteId: string | null; isSelected: boolean; isSelecting: boolean;
  onSelect: (id: string) => void; onToggleSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, note: Note) => void;
  onImageClick: (url: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || isSelecting) { onToggleSelect(note.id); return; }
    onSelect(note.id);
  };

  const isActive = activeNoteId === note.id;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={handleClick}
      onContextMenu={e => { e.preventDefault(); onContextMenu(e, note); }}
      className={cn(
        'w-full text-left p-3.5 rounded-2xl transition-all duration-300 group relative cursor-pointer flex gap-4 select-none mb-2',
        isSelected ? 'bg-blue-500/20 border border-blue-400/30'
          : isActive ? 'bg-[var(--bg-panel-hover)] shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-[var(--border-glass)]'
          : 'hover:bg-[var(--bg-panel-hover)] border border-transparent'
      )}
    >
      {isActive && !isSelecting && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
      )}
      
      {(note.coverImage || note.attachments.some(a => a.type.startsWith('image/'))) && !isSelecting && (
        <div
          className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-slate-800 border border-white/10 shadow-lg cursor-zoom-in group-hover:scale-105 transition-transform"
          onClick={e => {
            e.stopPropagation();
            const url = note.coverImage || note.attachments.find(a => a.type.startsWith('image/'))?.data;
            if (url) onImageClick(url);
          }}
        >
          <img src={note.coverImage || note.attachments.find(a => a.type.startsWith('image/'))?.data} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className={cn('flex-1 min-w-0 flex flex-col justify-center', (isSelecting || isSelected) && 'pl-2')}>
        <div className="flex items-center gap-2">
          {note.isPinned && <Pin size={12} className="text-cyan-400 fill-cyan-400 shrink-0" />}
          <h3 className={cn(
            'font-semibold truncate flex-1 tracking-tight',
            isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
          )}>{note.title || 'Untitled Note'}</h3>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate leading-relaxed">{note.content.replace(/<[^>]*>/g, '') || 'Empty note...'}</p>
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-3 text-[10px] font-bold tracking-wider text-slate-500">
            <span>{format(note.updatedAt, 'MMM d', { locale: enUS })}</span>
            {note.attachments.length > 0 && <span className="flex items-center gap-1"><Paperclip size={10} /> {note.attachments.length}</span>}
          </div>
          {note.tags && note.tags.length > 0 && (
             <div className="flex gap-1">
                {note.tags.slice(0, 2).map(t => (
                  <div key={t} className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
                ))}
             </div>
          )}
        </div>
      </div>

      {/* Multi-select checkmark */}
      {(isSelecting || isSelected) && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
           <div className={cn(
             "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
             isSelected ? "bg-cyan-500 border-cyan-500" : "border-white/20"
           )}>
             {isSelected && <CheckSquare size={12} className="text-white" />}
           </div>
        </div>
      )}
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
  onRenameNote, onChangeCoverImage, onChangeColor, onOpenCommunity, onOpenProfile, onOpenPrivacy, user,
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
    if (!selectedIds.has(note.id)) setSelectedIds(new Set([note.id]));

    const items: ContextMenuItem[] = [
      {
        label: 'Rename',
        icon: <Pencil size={14} />,
        onClick: () => {
          const newTitle = window.prompt('New name:', note.title);
          if (newTitle !== null) onRenameNote(note.id, newTitle);
        },
      },
      {
        label: 'Change cover image',
        icon: <Image size={14} />,
        onClick: () => { setPendingCoverNoteId(note.id); coverInputRef.current?.click(); },
      },
      {
        label: 'Move to category →',
        icon: <FolderInput size={14} />,
        divider: true,
        onClick: () => setSubMenu({ x: e.clientX, y: e.clientY, noteId: note.id }),
      },
      {
        label: 'Delete note',
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
      'flex-col w-full md:w-80 glass-panel h-full flex-shrink-0 z-20 absolute md:relative transition-transform duration-300 ease-in-out border-r border-white/5 shadow-2xl',
      activeNoteId ? '-translate-x-full md:translate-x-0' : 'translate-x-0 flex'
    )}>      {/* Header with Logo and Actions */}
      <div className="p-5 pb-6 flex flex-col gap-6 border-b border-white/5">
        <div className="flex justify-center w-full">
             <img 
               src={isDark ? "/logoandtext2.png" : "/logoandtextWhite2.png"} 
               alt="NexNote" 
               onClick={onOpenProfile} 
               className="h-20 w-auto cursor-pointer hover:scale-105 transition-all duration-300" 
             />
        </div>
        
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
             <button onClick={onToggleDark} className="w-10 h-10 flex items-center justify-center text-lg hover:bg-white/5 transition-all rounded-xl border border-white/5 active:scale-95" title="Toggle Theme">
               {isDark ? '🌙' : '☀️'}
             </button>
             
             <div className="relative group cursor-pointer" onClick={onOpenProfile} title="Profile">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 group-hover:border-cyan-500/50 transition-all group-hover:scale-105">
                   {user?.photoURL
                     ? <img src={user.photoURL} alt="" className="w-full h-full bg-slate-800 object-cover" />
                     : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-cyan-400"><UserCircle size={20} /></div>
                   }
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={onLogout} className="text-[13px] font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest" title="Logout">
              Logout
            </button>
            <button onClick={onCreateNote} className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all shadow-lg active:scale-95" title="New Note">
               <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

        <div className="relative mt-2 px-4">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input type="text" placeholder="Search notes..." value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-panel-hover)] rounded-lg text-sm placeholder:text-slate-500 border-none outline-none focus:ring-1 focus:ring-slate-500/20 transition-all font-medium"
          />
        </div>


      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin">
        <div className="mb-6">
          <CategoryManager
            categories={categories} activeCategoryId={activeCategoryId}
            onSelect={onSelectCategory} onCreate={onCreateCategory}
            onRename={onRenameCategory} onDelete={onDeleteCategory}
            onChangeColor={onChangeColor || (() => {})}
            noteCountByCategory={noteCountByCategory}
          />
        </div>

        <div className="space-y-4">
          <button
            onClick={onOpenCommunity}
            className="w-full flex items-center gap-3 px-4 py-2 mt-4 text-sm text-slate-500 hover:text-white transition-all group"
          >
            <Globe size={16} className="text-[#3b82f6]" />
            <span className="flex-1 text-left font-medium">Community</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1e3a8a] text-blue-300 rounded text-[10px] font-bold">
               Live
            </div>
          </button>
        </div>

        <div className="mt-4 pt-2">
           <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Notes</span>
              {isSelecting && <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest animate-pulse">{selectedIds.size} Selected</span>}
           </div>

           {filtered.length === 0 ? (
            <div className="text-center text-slate-600 py-12 text-sm italic font-medium">No notes found...</div>
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
                    onImageClick={onImageClick}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Bulk action floating bar */}
      {isSelecting && (
        <div className="absolute bottom-16 left-4 right-4 p-3 glass-panel rounded-2xl flex items-center gap-3 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={e => setBulkCatMenu({ x: e.clientX, y: e.clientY })}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 rounded-xl text-slate-200 transition-all"
          >
            <FolderInput size={14} /> Move
          </button>
          <button
            onClick={() => { onDeleteManyNotes(Array.from(selectedIds)); clearSelection(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 transition-all border border-red-500/10"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={clearSelection} className="p-2 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverImageChange} />

      <div className="p-4 border-t border-white/5 flex items-center justify-between">
        <button onClick={onOpenPrivacy} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
          Privacy Policy
        </button>
      </div>

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}

      {subMenu && (
        <CategorySubmenu
          categories={categories}
          anchorX={subMenu.x} anchorY={subMenu.y}
          onSelect={catId => { onMoveNote(subMenu.noteId, catId); setSubMenu(null); }}
          onClose={() => setSubMenu(null)}
        />
      )}

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
