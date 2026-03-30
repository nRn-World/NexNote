import React, { useEffect } from 'react';
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
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle size={16} className="text-green-500 shrink-0" />,
    error: <AlertCircle size={16} className="text-red-500 shrink-0" />,
    info: <Info size={16} className="text-blue-500 shrink-0" />,
  };

  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 bg-white border rounded-lg shadow-lg text-sm max-w-sm w-full",
      toast.type === 'error' ? 'border-red-200' : toast.type === 'success' ? 'border-green-200' : 'border-zinc-200'
    )}>
      {icons[toast.type]}
      <p className="flex-1 text-zinc-700">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-zinc-400 hover:text-zinc-700 shrink-0">
        <X size={14} />
      </button>
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
