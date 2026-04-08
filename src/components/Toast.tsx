import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);
  const DURATION = 4000;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 16);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, DURATION);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle size={16} className="text-green-400 shrink-0" />,
    error: <AlertCircle size={16} className="text-red-400 shrink-0" />,
    info: <Info size={16} className="text-blue-400 shrink-0" />,
  };

  const borders = {
    success: 'border-green-400/20',
    error: 'border-red-400/20',
    info: 'border-blue-400/20',
  };

  const progressColors = {
    success: 'bg-green-400',
    error: 'bg-red-400',
    info: 'bg-blue-400',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 bg-[var(--bg-panel)] border rounded-xl shadow-2xl text-sm max-w-sm w-full backdrop-blur-xl transition-all duration-300',
        borders[toast.type],
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      {icons[toast.type]}
      <p className="flex-1 text-[var(--text-primary)]">{toast.message}</p>
      <button onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 transition-colors">
        <X size={14} />
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
        <div
          className={cn('h-full transition-none', progressColors[toast.type])}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={onRemove} />)}
    </div>
  );
}
