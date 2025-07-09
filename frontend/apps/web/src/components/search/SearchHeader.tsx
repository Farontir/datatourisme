'use client';

import { useState } from 'react';

import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, Search, SlidersHorizontal } from '@datatourisme/ui';
import { SearchBar } from './SearchBar';
import { SearchFilters } from './SearchFilters';

export function SearchHeader() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Recherche
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Découvrez des expériences uniques à travers la France
          </p>
        </div>

        {/* Mobile filters button */}
        <div className="lg:hidden">
          <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtres
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-6 border-b">
                <SheetTitle>Filtres de recherche</SheetTitle>
              </SheetHeader>
              <div className="p-6">
                <SearchFilters />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main search bar */}
      <div className="max-w-2xl">
        <SearchBar />
      </div>
    </div>
  );
}