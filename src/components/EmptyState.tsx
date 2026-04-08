import React from 'react';
import { FilePlus, SearchX, FolderOpen, Inbox, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  variant?: 'notes' | 'search' | 'category' | 'community' | 'default';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const VARIANTS = {
  notes: {
    icon: <Inbox size={40} />,
    title: 'No notes yet',
    description: 'Create your first note to get started',
  },
  search: {
    icon: <SearchX size={40} />,
    title: 'No results found',
    description: 'Try a different search term',
  },
  category: {
    icon: <FolderOpen size={40} />,
    title: 'No notes in this category',
    description: 'Move some notes here or create a new one',
  },
  community: {
    icon: <FilePlus size={40} />,
    title: 'No posts yet',
    description: 'Be the first to share a project with the community',
  },
  default: {
    icon: <Inbox size={40} />,
    title: 'Nothing here',
    description: 'This section is empty',
  },
};

export default function EmptyState({ variant = 'default', title, description, actionLabel, onAction, className }: EmptyStateProps) {
  const v = VARIANTS[variant];
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-8 text-center', className)}>
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-cyan-400/10 blur-3xl rounded-full scale-150" />
        <div className="relative text-[var(--text-secondary)]/30">
          {v.icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
        {title || v.title}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] max-w-xs mb-6 leading-relaxed">
        {description || v.description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="group flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 rounded-xl text-sm font-medium text-[var(--text-primary)] transition-all"
        >
          {actionLabel}
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}
