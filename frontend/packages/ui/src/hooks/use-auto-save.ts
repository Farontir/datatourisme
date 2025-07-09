import { useEffect, useRef, useCallback } from 'react';
import { useWatch, UseFormReturn } from 'react-hook-form';
import { debounce } from '@datatourisme/utils';

export interface UseAutoSaveOptions {
  /** Form instance from react-hook-form */
  form: UseFormReturn<any>;
  /** Function to save the form data */
  onSave: (data: any) => Promise<void> | void;
  /** Debounce delay in milliseconds (default: 2000) */
  delay?: number;
  /** Only save when form is valid (default: true) */
  saveOnlyWhenValid?: boolean;
  /** Fields to exclude from auto-save */
  exclude?: string[];
  /** Enable/disable auto-save */
  enabled?: boolean;
}

export interface UseAutoSaveReturn {
  /** Manually trigger save */
  save: () => Promise<void>;
  /** Whether auto-save is currently running */
  isSaving: boolean;
  /** Last save timestamp */
  lastSaved: Date | null;
  /** Last save error */
  lastError: Error | null;
}

export function useAutoSave({
  form,
  onSave,
  delay = 2000,
  saveOnlyWhenValid = true,
  exclude = [],
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const { watch, formState } = form;
  const { isValid, errors } = formState;
  
  const isSavingRef = useRef(false);
  const lastSavedRef = useRef<Date | null>(null);
  const lastErrorRef = useRef<Error | null>(null);
  const initialDataRef = useRef<any>(null);

  // Watch all form values except excluded fields
  const watchedData = useWatch({ control: form.control });

  // Initialize with current form data
  useEffect(() => {
    if (initialDataRef.current === null) {
      initialDataRef.current = watchedData;
    }
  }, []);

  const saveData = useCallback(async () => {
    if (!enabled || isSavingRef.current) {
      return;
    }

    const currentData = form.getValues();
    
    // Filter out excluded fields
    const filteredData = Object.keys(currentData).reduce((acc, key) => {
      if (!exclude.includes(key)) {
        acc[key] = currentData[key];
      }
      return acc;
    }, {} as any);

    // Check if data has actually changed
    if (JSON.stringify(filteredData) === JSON.stringify(initialDataRef.current)) {
      return;
    }

    // Only save if form is valid (when enabled)
    if (saveOnlyWhenValid && !isValid) {
      return;
    }

    try {
      isSavingRef.current = true;
      lastErrorRef.current = null;
      
      await onSave(filteredData);
      
      lastSavedRef.current = new Date();
      initialDataRef.current = filteredData;
    } catch (error) {
      lastErrorRef.current = error as Error;
      console.error('Auto-save failed:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [form, onSave, enabled, saveOnlyWhenValid, exclude, isValid]);

  // Create debounced save function
  const debouncedSave = useCallback(
    debounce(saveData, delay),
    [saveData, delay]
  );

  // Auto-save when form data changes
  useEffect(() => {
    if (enabled && watchedData && initialDataRef.current !== null) {
      debouncedSave();
    }
  }, [watchedData, enabled, debouncedSave]);

  // Manual save function
  const manualSave = useCallback(async () => {
    await saveData();
  }, [saveData]);

  return {
    save: manualSave,
    isSaving: isSavingRef.current,
    lastSaved: lastSavedRef.current,
    lastError: lastErrorRef.current,
  };
}

// Hook for localStorage auto-save
export function useLocalStorageAutoSave(
  key: string,
  form: UseFormReturn<any>,
  options?: Omit<UseAutoSaveOptions, 'form' | 'onSave'>
) {
  const onSave = useCallback(
    (data: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
        throw error;
      }
    },
    [key]
  );

  // Load initial data from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsedData = JSON.parse(saved);
        form.reset(parsedData);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }, [key, form]);

  return useAutoSave({
    form,
    onSave,
    ...options,
  });
}

// Hook for session storage auto-save
export function useSessionStorageAutoSave(
  key: string,
  form: UseFormReturn<any>,
  options?: Omit<UseAutoSaveOptions, 'form' | 'onSave'>
) {
  const onSave = useCallback(
    (data: any) => {
      try {
        sessionStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save to sessionStorage:', error);
        throw error;
      }
    },
    [key]
  );

  // Load initial data from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsedData = JSON.parse(saved);
        form.reset(parsedData);
      }
    } catch (error) {
      console.error('Failed to load from sessionStorage:', error);
    }
  }, [key, form]);

  return useAutoSave({
    form,
    onSave,
    ...options,
  });
}