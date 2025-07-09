'use client';

import { AppShell, AppSidebar, AppHeader, AppContent } from '@datatourisme/ui';
import { MainNavigation } from '../navigation/MainNavigation';
import { UserMenu } from '../navigation/UserMenu';
import { SearchBar } from '../search/SearchBar';

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  // Mock user data - in real app this would come from auth context
  const mockUser = {
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
  };

  const sidebarContent = (
    <AppSidebar>
      <div className="flex h-16 items-center border-b border-neutral-200 px-4 dark:border-neutral-800">
        <h1 className="text-lg font-semibold">DataTourisme</h1>
      </div>
      <div className="flex-1 p-4">
        <MainNavigation orientation="vertical" />
      </div>
    </AppSidebar>
  );

  const headerContent = (
    <AppHeader
      searchComponent={
        <SearchBar className="w-full max-w-md" />
      }
      userComponent={<UserMenu user={mockUser} />}
    >
      <div className="lg:hidden">
        <h1 className="text-lg font-semibold">DataTourisme</h1>
      </div>
      <div className="hidden lg:block">
        <MainNavigation orientation="horizontal" />
      </div>
    </AppHeader>
  );

  return (
    <AppShell 
      header={headerContent}
      sidebar={sidebarContent}
    >
      <AppContent>
        {children}
      </AppContent>
    </AppShell>
  );
}