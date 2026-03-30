import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, FolderOpen } from 'lucide-react';
import { Category } from '../types';
import { cn } from '../lib/utils';

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
  noteCountByCategory: Record<string, number>;
}

export default function CategoryManager({
  categories, activeCategoryId, onSelect, onCreate, onRename, onDelete, noteCountByCategory
}: CategoryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim(), newColor);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
    setIsAdding(false);
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    onRename(id, editName.trim());
    setEditingId(null);
  };

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
        <span className="text-xs opacity-60">{Object.values(noteCountByCategory).reduce((a, b) => a + b, 0)}</span>
      </button>

      {/* Categories */}
      {categories.map(cat => (
        <div key={cat.id} className="group relative">
          {editingId === cat.id ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(cat.id); if (e.key === 'Escape') setEditingId(null); }}
                className="flex-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded px-2 py-0.5 outline-none border border-zinc-300 dark:border-zinc-600"
              />
              <button onClick={() => handleRename(cat.id)} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                <Check size={13} />
              </button>
              <button onClick={() => setEditingId(null)} className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelect(cat.id)}
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
          )}

          {/* Edit/Delete buttons */}
          {editingId !== cat.id && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-zinc-900 rounded shadow-sm border border-zinc-100 dark:border-zinc-700 px-0.5">
              <button
                onClick={e => { e.stopPropagation(); setEditingId(cat.id); setEditName(cat.name); }}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(cat.id); }}
                className="p-1 text-zinc-400 hover:text-red-500 rounded"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add new category */}
      {isAdding ? (
        <div className="mt-1 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsAdding(false); }}
            placeholder="Kategorinamn..."
            className="w-full text-sm bg-white dark:bg-zinc-900 rounded px-2 py-1.5 outline-none border border-zinc-200 dark:border-zinc-600 mb-2"
          />
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={cn('w-5 h-5 rounded-full transition-transform', newColor === c && 'ring-2 ring-offset-1 ring-zinc-400 scale-110')}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 py-1 text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded hover:opacity-90 transition-opacity">
              Skapa
            </button>
            <button onClick={() => setIsAdding(false)} className="flex-1 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded hover:opacity-90 transition-opacity">
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors mt-1"
        >
          <Plus size={13} /> Ny kategori
        </button>
      )}
    </div>
  );
}
