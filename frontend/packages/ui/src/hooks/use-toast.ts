import { useState, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: ToastMessage[];
}

let toastCount = 0;

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${++toastCount}`;
    const newToast: ToastMessage = {
      id,
      duration: 5000,
      ...toast,
    };

    setState((prev) => ({
      toasts: [...prev.toasts, newToast],
    }));

    // Auto-remove toast after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setState((prev) => ({
      toasts: prev.toasts.filter((toast) => toast.id !== id),
    }));
  }, []);

  const removeAllToasts = useCallback(() => {
    setState({ toasts: [] });
  }, []);

  // Convenience methods
  const toast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    return addToast(toast);
  }, [addToast]);

  const success = useCallback((message: string, title?: string) => {
    return addToast({
      variant: 'success',
      title,
      description: message,
    });
  }, [addToast]);

  const error = useCallback((message: string, title?: string) => {
    return addToast({
      variant: 'destructive',
      title,
      description: message,
    });
  }, [addToast]);

  const warning = useCallback((message: string, title?: string) => {
    return addToast({
      variant: 'warning',
      title,
      description: message,
    });
  }, [addToast]);

  const info = useCallback((message: string, title?: string) => {
    return addToast({
      variant: 'info',
      title,
      description: message,
    });
  }, [addToast]);

  return {
    toasts: state.toasts,
    toast,
    success,
    error,
    warning,
    info,
    removeToast,
    removeAllToasts,
  };
}

// Global toast instance for use across the app
let globalToastFn: ReturnType<typeof useToast> | null = null;

export function setGlobalToast(toastFn: ReturnType<typeof useToast>) {
  globalToastFn = toastFn;
}

export function toast(message: Omit<ToastMessage, 'id'>) {
  if (globalToastFn) {
    return globalToastFn.toast(message);
  }
  console.warn('Toast function not initialized. Make sure to call setGlobalToast in your app.');
}

export function successToast(message: string, title?: string) {
  if (globalToastFn) {
    return globalToastFn.success(message, title);
  }
  console.warn('Toast function not initialized. Make sure to call setGlobalToast in your app.');
}

export function errorToast(message: string, title?: string) {
  if (globalToastFn) {
    return globalToastFn.error(message, title);
  }
  console.warn('Toast function not initialized. Make sure to call setGlobalToast in your app.');
}

export function warningToast(message: string, title?: string) {
  if (globalToastFn) {
    return globalToastFn.warning(message, title);
  }
  console.warn('Toast function not initialized. Make sure to call setGlobalToast in your app.');
}

export function infoToast(message: string, title?: string) {
  if (globalToastFn) {
    return globalToastFn.info(message, title);
  }
  console.warn('Toast function not initialized. Make sure to call setGlobalToast in your app.');
}