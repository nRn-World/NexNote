import React, { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { Category } from '../types';
import { cn } from '../lib/utils';
import ContextMenu, { ContextMenuItem } from './ContextMenu';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
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
        label: 'Byt namn',
        icon: <span className="text-xs">✏️</span>,
        onClick: () => {
          const name = window.prompt('Nytt namn:', cat.name);
          if (name?.trim()) onRename(cat.id, name.trim());
        },
      },
      {
        label: 'Byt färg',
        icon: <span className="text-xs">🎨</span>,
        onClick: () => {
          const color = window.prompt('Hex-färg (t.ex. #6366f1):', cat.color);
          if (color?.trim()) onChangeColor(cat.id, color.trim());
        },
      },
      {
        label: 'Ta bort kategori',
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
    <div className="px-2 pb-2">
      {/* All notes */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
          activeCategoryId === null
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        )}
      >
        <FolderOpen size={14} />
        <span className="flex-1 text-left font-medium">Alla anteckningar</span>
        <span className="text-xs opacity-60">{totalCount}</span>
      </button>

      {/* Categories */}
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          onContextMenu={e => handleCategoryContextMenu(e, cat)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            activeCategoryId === cat.id
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          )}
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
          <span className="flex-1 text-left truncate">{cat.name}</span>
          <span className="text-xs opacity-60">{noteCountByCategory[cat.id] || 0}</span>
        </button>
      ))}

      {/* Add new */}
      {isAdding ? (
        <div className="mt-1 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <input
            autoFocus value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsAdding(false); }}
            placeholder="Kategorinamn..."
            className="w-full text-sm bg-white dark:bg-zinc-900 rounded px-2 py-1.5 outline-none border border-zinc-200 dark:border-zinc-600 mb-2"
          />
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={cn('w-5 h-5 rounded-full transition-transform', newColor === c && 'ring-2 ring-offset-1 ring-zinc-400 scale-110')}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 py-1 text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded hover:opacity-90">Skapa</button>
            <button onClick={() => setIsAdding(false)} className="flex-1 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded hover:opacity-90">Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsAdding(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors mt-1">
          <Plus size={13} /> Ny kategori
        </button>
      )}

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}
    </div>
  );
}
