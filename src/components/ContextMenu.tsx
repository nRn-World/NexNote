import React, { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position so menu doesn't go off screen
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 300),
    left: Math.min(x, window.innerWidth - 220),
    zIndex: 9999,
  };

  return (
    <div
      ref={ref}
      style={style}
      className="w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl py-1 overflow-hidden"
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.divider && i > 0 && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}
          <button
            onClick={() => { item.onClick(); onClose(); }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left',
              item.danger
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            )}
          >
            {item.icon && <span className="shrink-0 opacity-70">{item.icon}</span>}
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
