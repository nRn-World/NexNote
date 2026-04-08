import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'note-card';
  width?: string;
  height?: string;
}

export default function Skeleton({ className, variant = 'text', width, height }: SkeletonProps) {
  if (variant === 'note-card') {
    return (
      <div className={cn('w-full p-3.5 rounded-2xl mb-2', className)}>
        <div className="flex gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/5 animate-pulse shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-white/5 rounded-lg w-3/4 animate-pulse" />
            <div className="h-3 bg-white/5 rounded-lg w-full animate-pulse" />
            <div className="h-3 bg-white/5 rounded-lg w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const base = 'animate-pulse bg-white/5';
  const shapes = {
    text: 'rounded-lg h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(base, shapes[variant], className)}
      style={{ width, height }}
    />
  );
}
