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
      className="w-56 glass-panel rounded-2xl shadow-2xl py-2 overflow-hidden border border-white/10 animate-in fade-in zoom-in-95 duration-150"
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.divider && i > 0 && <div className="my-1.5 border-t border-white/5 mx-2" />}
          <button
            onClick={(e) => { e.stopPropagation(); item.onClick(); onClose(); }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold tracking-tight transition-all text-left',
              item.danger
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            )}
          >
            {item.icon && <span className="shrink-0 opacity-60 group-hover:opacity-100">{item.icon}</span>}
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
