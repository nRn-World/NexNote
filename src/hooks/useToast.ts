import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Toast, { ToastMessage, ToastType } from '../components/Toast';

export interface ToastApi {
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const noop = () => {};

/**
 * Renders one shared toast stack for the whole app.
 * Without this, every component that called useToast() had its own private list
 * that was never mounted, so their feedback to the user disappeared.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    setToasts(prev => [...prev, { id: uuidv4(), message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = useMemo<ToastApi>(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast],
  );

  return React.createElement(
    ToastContext.Provider,
    { value },
    children,
    React.createElement(Toast, { toasts, onRemove: removeToast }),
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? { toasts: [], addToast: noop, removeToast: noop };
}
