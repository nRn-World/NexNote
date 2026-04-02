import React, { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { Category } from '../types';
import { cn } from '../lib/utils';
import ContextMenu, { ContextMenuItem } from './ContextMenu';

const PRESET_COLORS = [
  '#00F2FF', '#BC00FF', '#FF00E5', '#FF4D00',
  '#FFD600', '#00FF66', '#0094FF', '#FFFFFF',
];

interface CategoryManagerProps {
  categories: Category[];
  activeCategoryId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, color: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
  noteCountByCategory: Record<string, number>;
}

interface CtxState { x: number; y: number; items: ContextMenuItem[]; }

export default function CategoryManager({
  categories, activeCategoryId, onSelect, onCreate, onRename, onDelete, onChangeColor, noteCountByCategory
}: CategoryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [ctxMenu, setCtxMenu] = useState<CtxState | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim(), newColor);
    setNewName(''); setNewColor(PRESET_COLORS[0]); setIsAdding(false);
  };

  const handleCategoryContextMenu = (e: React.MouseEvent, cat: Category) => {
    e.preventDefault();
    e.stopPropagation();
    const items: ContextMenuItem[] = [
      {
        label: 'Rename',
        icon: <span className="text-xs">✏️</span>,
        onClick: () => {
          const name = window.prompt('New name:', cat.name);
          if (name?.trim()) onRename(cat.id, name.trim());
        },
      },
      {
        label: 'Change color',
        icon: <span className="text-xs">🎨</span>,
        onClick: () => {
          const color = window.prompt('Hex color (e.g. #00F2FF):', cat.color);
          if (color?.trim()) onChangeColor(cat.id, color.trim());
        },
      },
      {
        label: 'Delete category',
        icon: <span className="text-xs">🗑️</span>,
        danger: true,
        divider: true,
        onClick: () => onDelete(cat.id),
      },
    ];
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  const totalCount = Object.values(noteCountByCategory).reduce((a, b) => a + b, 0);

  return (
    <div className="px-1 space-y-1">
      {/* All notes */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group relative overflow-hidden mb-2',
          activeCategoryId === null
            ? 'bg-white/10 text-white'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        )}
      >
        <FolderOpen size={16} className={activeCategoryId === null ? 'text-slate-300' : 'text-slate-500'} />
        <span className="flex-1 text-left font-medium">All notes</span>
      </button>

      {/* Categories */}
      <div className="space-y-0.5">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            onContextMenu={e => handleCategoryContextMenu(e, cat)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[13px] transition-all group relative',
              activeCategoryId === cat.id
                ? 'bg-white/5 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
              <span className="font-medium truncate">{cat.name}</span>
            </div>
            <span className="text-xs text-slate-500">{noteCountByCategory[cat.id] || 0}</span>
          </button>
        ))}
      </div>

      {/* Add new */}
      {isAdding ? (
        <div className="mt-2 p-4 glass-panel rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <input
            autoFocus value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsAdding(false); }}
            placeholder="Category name..."
            className="w-full text-xs font-bold uppercase tracking-widest bg-white/5 rounded-xl px-4 py-3 outline-none border border-white/5 focus:neon-border-cyan mb-4 text-white placeholder:text-slate-700 transition-all"
          />
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={cn('w-6 h-6 rounded-lg transition-all border-2 border-transparent', newColor === c && 'scale-125 border-white shadow-lg')}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-white text-black rounded-xl hover:scale-105 transition-transform">Create</button>
            <button onClick={() => setIsAdding(false)} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-white/5 text-slate-500 rounded-xl hover:bg-white/10 transition-colors">Close</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsAdding(true)}
          className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-slate-500 hover:text-slate-300 transition-all mt-2 group">
          <Plus size={14} className="text-slate-500" />
          <span>New category</span>
        </button>
      )}

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}
    </div>
  );
}
