import React, { useEffect } from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './Toast';
import { useToast, setGlobalToast } from '../hooks/use-toast';

export function Toaster() {
  const toastHook = useToast();
  const { toasts, removeToast } = toastHook;

  // Set global toast function
  useEffect(() => {
    setGlobalToast(toastHook);
  }, [toastHook]);

  return (
    <ToastProvider>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          duration={toast.duration}
          onOpenChange={(open) => {
            if (!open) {
              removeToast(toast.id);
            }
          }}
        >
          <div className="grid gap-1">
            {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
            {toast.description && (
              <ToastDescription>{toast.description}</ToastDescription>
            )}
          </div>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:border-neutral-800 dark:hover:bg-neutral-800"
            >
              {toast.action.label}
            </button>
          )}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}