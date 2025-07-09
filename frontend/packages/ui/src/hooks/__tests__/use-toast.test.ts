import { renderHook, act } from '@testing-library/react';
import { useToast, setGlobalToast, toast, successToast, errorToast, warningToast, infoToast } from '../use-toast';

// Mock console.warn to avoid noise in tests
const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('useToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('useToast hook', () => {
    it('initializes with empty toasts array', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toEqual([]);
    });

    it('adds a toast with default values', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Test Toast',
          description: 'Test description',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        title: 'Test Toast',
        description: 'Test description',
        duration: 5000,
        variant: undefined,
      });
      expect(result.current.toasts[0].id).toMatch(/toast-\d+/);
    });

    it('adds multiple toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Toast 1' });
        result.current.toast({ title: 'Toast 2' });
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts[0].title).toBe('Toast 1');
      expect(result.current.toasts[1].title).toBe('Toast 2');
    });

    it('removes a toast by id', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;

      act(() => {
        toastId = result.current.toast({ title: 'Test Toast' });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.removeToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('removes all toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Toast 1' });
        result.current.toast({ title: 'Toast 2' });
        result.current.toast({ title: 'Toast 3' });
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.removeAllToasts();
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('auto-removes toast after duration', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Auto-remove toast',
          duration: 1000,
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('does not auto-remove toast with duration 0', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Persistent toast',
          duration: 0,
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.toasts).toHaveLength(1);
    });

    describe('convenience methods', () => {
      it('creates success toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.success('Success message', 'Success Title');
        });

        expect(result.current.toasts[0]).toMatchObject({
          variant: 'success',
          title: 'Success Title',
          description: 'Success message',
        });
      });

      it('creates error toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.error('Error message', 'Error Title');
        });

        expect(result.current.toasts[0]).toMatchObject({
          variant: 'destructive',
          title: 'Error Title',
          description: 'Error message',
        });
      });

      it('creates warning toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.warning('Warning message', 'Warning Title');
        });

        expect(result.current.toasts[0]).toMatchObject({
          variant: 'warning',
          title: 'Warning Title',
          description: 'Warning message',
        });
      });

      it('creates info toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.info('Info message', 'Info Title');
        });

        expect(result.current.toasts[0]).toMatchObject({
          variant: 'info',
          title: 'Info Title',
          description: 'Info message',
        });
      });

      it('creates toast with action', () => {
        const { result } = renderHook(() => useToast());
        const actionFn = jest.fn();

        act(() => {
          result.current.toast({
            title: 'Toast with action',
            action: {
              label: 'Click me',
              onClick: actionFn,
            },
          });
        });

        expect(result.current.toasts[0].action).toEqual({
          label: 'Click me',
          onClick: actionFn,
        });
      });
    });
  });

  describe('global toast functions', () => {
    it('warns when global toast not initialized', () => {
      toast({ title: 'Test' });
      successToast('Success');
      errorToast('Error');
      warningToast('Warning');
      infoToast('Info');

      expect(consoleSpy).toHaveBeenCalledTimes(5);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Toast function not initialized. Make sure to call setGlobalToast in your app.'
      );
    });

    it('works when global toast is initialized', () => {
      const { result } = renderHook(() => useToast());

      // Initialize global toast
      act(() => {
        setGlobalToast(result.current);
      });

      // Test global functions
      act(() => {
        toast({ title: 'Global toast' });
        successToast('Global success');
        errorToast('Global error');
        warningToast('Global warning');
        infoToast('Global info');
      });

      expect(result.current.toasts).toHaveLength(5);
      expect(result.current.toasts[0].title).toBe('Global toast');
      expect(result.current.toasts[1]).toMatchObject({
        variant: 'success',
        description: 'Global success',
      });
      expect(result.current.toasts[2]).toMatchObject({
        variant: 'destructive',
        description: 'Global error',
      });
      expect(result.current.toasts[3]).toMatchObject({
        variant: 'warning',
        description: 'Global warning',
      });
      expect(result.current.toasts[4]).toMatchObject({
        variant: 'info',
        description: 'Global info',
      });

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('toast counter', () => {
    it('generates unique IDs for multiple toasts', () => {
      const { result } = renderHook(() => useToast());

      const ids: string[] = [];

      act(() => {
        ids.push(result.current.toast({ title: 'Toast 1' }));
        ids.push(result.current.toast({ title: 'Toast 2' }));
        ids.push(result.current.toast({ title: 'Toast 3' }));
      });

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);

      // IDs should follow the pattern
      ids.forEach(id => {
        expect(id).toMatch(/^toast-\d+$/);
      });
    });
  });
});