'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, Home, Search, MapPin, Heart, User, Settings } from '@datatourisme/ui';
import { cn } from '@datatourisme/ui';
import { useTranslation, LocaleSwitcherCompact } from '@datatourisme/i18n';

const getNavigationItems = (t: (key: string) => string) => [
  {
    titleKey: 'nav.home',
    title: t('nav.home'),
    href: '/',
    icon: Home,
    description: t('nav.homeDescription') || 'Homepage',
  },
  {
    titleKey: 'nav.search',
    title: t('nav.search'),
    href: '/search',
    icon: Search,
    description: t('nav.searchDescription') || 'Search tourism resources',
  },
  {
    titleKey: 'nav.map',
    title: t('nav.map') || 'Map',
    href: '/map',
    icon: MapPin,
    description: t('nav.mapDescription') || 'Explore on the map',
  },
  {
    titleKey: 'nav.favorites',
    title: t('nav.favorites'),
    href: '/favorites',
    icon: Heart,
    description: t('nav.favoritesDescription') || 'Your favorite resources',
  },
];

interface MainNavigationProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function MainNavigation({ className, orientation = 'horizontal' }: MainNavigationProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const navigationItems = getNavigationItems(t);

  if (orientation === 'vertical') {
    return (
      <nav className={cn('flex flex-col space-y-1', className)}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
        <div className="pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-700">
          <LocaleSwitcherCompact className="w-full justify-start" />
        </div>
      </nav>
    );
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <NavigationMenu>
        <NavigationMenuList>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:bg-neutral-100 focus:text-neutral-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-neutral-100/50 data-[state=open]:bg-neutral-100/50 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 dark:focus:bg-neutral-800 dark:focus:text-neutral-50 dark:data-[active]:bg-neutral-800/50 dark:data-[state=open]:bg-neutral-800/50',
                      isActive && 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50'
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>
      <LocaleSwitcherCompact />
    </div>
  );
}