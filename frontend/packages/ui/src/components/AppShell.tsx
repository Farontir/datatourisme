import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search } from 'lucide-react';

import { cn } from '../utils/cn';
import { Button } from './Button';
import { Sheet, SheetContent, SheetTrigger } from './Sheet';

interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

interface MobileNavProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
  collapsed?: boolean;
}

interface HeaderProps {
  children: React.ReactNode;
  className?: string;
  searchComponent?: React.ReactNode;
  userComponent?: React.ReactNode;
}

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(
  ({ children, header, sidebar, className }, ref) => {
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn(
          'min-h-screen bg-neutral-50 dark:bg-neutral-950',
          className
        )}
      >
        {/* Mobile sidebar overlay */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-80">
            {sidebar}
          </SheetContent>
        </Sheet>

        {/* Desktop layout */}
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-0">
          {/* Desktop sidebar */}
          {sidebar && (
            <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:w-72">
              {sidebar}
            </aside>
          )}

          {/* Main content area */}
          <div className={cn(sidebar && 'lg:pl-72')}>
            {/* Header */}
            {header && (
              <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-neutral-800 dark:bg-neutral-950/95 dark:supports-[backdrop-filter]:bg-neutral-950/60">
                <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
                  {sidebar && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setSidebarOpen(true)}
                    >
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Open sidebar</span>
                    </Button>
                  )}
                  {header}
                </div>
              </header>
            )}

            {/* Main content */}
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </div>
    );
  }
);
AppShell.displayName = 'AppShell';

const AppSidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ children, className, collapsed = false }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn(
          'flex h-full flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950',
          collapsed ? 'w-16' : 'w-full',
          className
        )}
      >
        {children}
      </nav>
    );
  }
);
AppSidebar.displayName = 'AppSidebar';

const AppHeader = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({ children, className, searchComponent, userComponent }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-1 items-center justify-between gap-4', className)}
      >
        <div className="flex items-center gap-4">
          {children}
        </div>
        
        <div className="flex items-center gap-4">
          {searchComponent && (
            <div className="hidden sm:flex">
              {searchComponent}
            </div>
          )}
          {userComponent}
        </div>
      </div>
    );
  }
);
AppHeader.displayName = 'AppHeader';

const AppContent = React.forwardRef<HTMLDivElement, MainContentProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('container mx-auto px-4 py-6 sm:px-6 lg:px-8', className)}
      >
        {children}
      </div>
    );
  }
);
AppContent.displayName = 'AppContent';

const MobileNav = React.forwardRef<HTMLDivElement, MobileNavProps>(
  ({ children, open, onOpenChange }, ref) => {
    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
              onClick={() => onOpenChange(false)}
            />
            
            {/* Mobile navigation */}
            <motion.div
              ref={ref}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg dark:bg-neutral-950 lg:hidden"
            >
              <div className="flex h-16 items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close menu</span>
                </Button>
              </div>
              <nav className="p-4">
                {children}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);
MobileNav.displayName = 'MobileNav';

export {
  AppShell,
  AppSidebar,
  AppHeader,
  AppContent,
  MobileNav,
};