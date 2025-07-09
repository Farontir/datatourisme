import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface UIState {
  // Theme
  theme: Theme;
  
  // Navigation
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Loading states
  isLoading: boolean;
  loadingMessage?: string;
  
  // Mobile
  isMobile: boolean;
  
  // Modals and overlays
  activeModal?: string;
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setLoading: (loading: boolean, message?: string) => void;
  setIsMobile: (isMobile: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      theme: 'system',
      sidebarOpen: false,
      sidebarCollapsed: false,
      isLoading: false,
      isMobile: false,
      activeModal: undefined,

      setTheme: (theme) =>
        set(
          { theme },
          false,
          'ui/setTheme'
        ),

      toggleSidebar: () =>
        set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          false,
          'ui/toggleSidebar'
        ),

      setSidebarOpen: (open) =>
        set(
          { sidebarOpen: open },
          false,
          'ui/setSidebarOpen'
        ),

      toggleSidebarCollapsed: () =>
        set(
          (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
          false,
          'ui/toggleSidebarCollapsed'
        ),

      setLoading: (loading, message) =>
        set(
          { isLoading: loading, loadingMessage: message },
          false,
          'ui/setLoading'
        ),

      setIsMobile: (isMobile) =>
        set(
          { isMobile },
          false,
          'ui/setIsMobile'
        ),

      openModal: (modalId) =>
        set(
          { activeModal: modalId },
          false,
          'ui/openModal'
        ),

      closeModal: () =>
        set(
          { activeModal: undefined },
          false,
          'ui/closeModal'
        ),
    }),
    {
      name: 'ui-store',
    }
  )
);