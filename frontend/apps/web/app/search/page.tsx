import { Suspense } from 'react';
import { Metadata } from 'next';

import { SearchResults } from '../../src/components/search/SearchResults';
import { SearchFilters } from '../../src/components/search/SearchFilters';
import { SearchHeader } from '../../src/components/search/SearchHeader';

export const metadata: Metadata = {
  title: 'Recherche',
  description: 'Recherchez parmi des milliers de ressources touristiques en France',
};

interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string;
    location?: string;
    priceRange?: string;
    rating?: string;
    sort?: string;
    view?: string;
    page?: string;
  };
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <div className="space-y-6">
      {/* Search Header */}
      <SearchHeader />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24">
            <Suspense fallback={<div className="h-96 animate-pulse bg-neutral-100 rounded-lg" />}>
              <SearchFilters searchParams={searchParams} />
            </Suspense>
          </div>
        </aside>

        {/* Results Area */}
        <main className="lg:col-span-3">
          <Suspense fallback={<SearchResultsSkeleton />}>
            <SearchResults searchParams={searchParams} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Results header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse bg-neutral-200 rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-20 animate-pulse bg-neutral-200 rounded" />
          <div className="h-8 w-20 animate-pulse bg-neutral-200 rounded" />
        </div>
      </div>

      {/* Results grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse bg-neutral-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}