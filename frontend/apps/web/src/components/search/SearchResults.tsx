'use client';

import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Grid3X3, List, Map, Loader2 } from 'lucide-react';

import { Button } from '@datatourisme/ui';
import { useSearchStore } from '../../stores/search-store';
import { SearchResultCard } from './SearchResultCard';
import { SearchResultList } from './SearchResultList';
import { SearchResultsMap } from '../map/SearchResultsMap';

interface SearchResultsProps {
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

// Mock API function - in real app this would call your backend
async function searchResources({ 
  pageParam = 1, 
  query, 
  filters 
}: { 
  pageParam?: number; 
  query?: string; 
  filters?: any;
}) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock data - in real app this would come from your API
  const mockResource = (id: number) => ({
    id: id.toString(),
    name: `Destination ${id}`,
    description: `Une destination incroyable avec des activités pour tous les goûts. Découvrez la beauté de ce lieu unique.`,
    location: {
      name: `Ville ${id}, Région`,
      latitude: 45.7640 + (Math.random() - 0.5) * 0.1,
      longitude: 4.8357 + (Math.random() - 0.5) * 0.1,
    },
    category: {
      id: 'culture',
      name: 'Culture',
    },
    rating: 4.2 + Math.random() * 0.8,
    reviewCount: Math.floor(Math.random() * 1000) + 100,
    priceRange: ['FREE', 'LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 4)],
    images: [
      {
        id: `img-${id}`,
        url: `/placeholder-${(id % 6) + 1}.jpg`,
        alt: `Image de destination ${id}`,
        width: 400,
        height: 300,
      },
    ],
    accessibility: {
      wheelchairAccessible: Math.random() > 0.5,
    },
  });

  const resources = Array.from({ length: 20 }, (_, i) => 
    mockResource(pageParam * 20 - 20 + i + 1)
  );

  return {
    results: resources,
    count: 1247, // Total count
    next: pageParam < 5 ? `page=${pageParam + 1}` : null,
    previous: pageParam > 1 ? `page=${pageParam - 1}` : null,
  };
}

export function SearchResults({ searchParams }: SearchResultsProps) {
  const { view, setView } = useSearchStore();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Build filters from search params
  const filters = {
    query: searchParams.q || '',
    category: searchParams.category,
    priceRange: searchParams.priceRange,
    rating: searchParams.rating ? parseInt(searchParams.rating) : undefined,
    sort: searchParams.sort || 'relevance',
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['search-resources', filters],
    queryFn: ({ pageParam }) => searchResources({ 
      pageParam, 
      query: filters.query,
      filters 
    }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined;
      const url = new URL(lastPage.next, 'http://localhost');
      return parseInt(url.searchParams.get('page') || '1');
    },
    initialPageParam: 1,
  });

  const allResults = data?.pages.flatMap(page => page.results) || [];
  const totalCount = data?.pages[0]?.count || 0;

  const handleLoadMore = async () => {
    if (hasNextPage && !isFetchingNextPage) {
      setIsLoadingMore(true);
      await fetchNextPage();
      setIsLoadingMore(false);
    }
  };

  // Auto-load more when scrolling near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000
      ) {
        if (hasNextPage && !isFetchingNextPage && !isLoadingMore) {
          handleLoadMore();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, isLoadingMore]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">
          Une erreur est survenue lors du chargement des résultats.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {totalCount.toLocaleString('fr-FR')} résultat{totalCount > 1 ? 's' : ''} trouvé{totalCount > 1 ? 's' : ''}
            {filters.query && ` pour "${filters.query}"`}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={view.type === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView({ type: 'grid' })}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={view.type === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView({ type: 'list' })}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view.type === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView({ type: 'map' })}
          >
            <Map className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results */}
      {allResults.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-neutral-600 dark:text-neutral-400">
            Aucun résultat trouvé pour votre recherche.
          </p>
          <p className="text-sm text-neutral-500 mt-2">
            Essayez de modifier vos filtres ou votre terme de recherche.
          </p>
        </div>
      ) : (
        <>
          {view.type === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {allResults.map((resource) => (
                <SearchResultCard key={resource.id} resource={resource} />
              ))}
            </div>
          )}

          {view.type === 'list' && (
            <div className="space-y-4">
              {allResults.map((resource) => (
                <SearchResultList key={resource.id} resource={resource} />
              ))}
            </div>
          )}

          {view.type === 'map' && (
            <div className="h-96">
              <SearchResultsMap 
                results={allResults}
                onMarkerClick={(resourceId) => {
                  // Navigate to resource detail or show in sidebar
                  window.open(`/resources/${resourceId}`, '_blank');
                }}
              />
            </div>
          )}

          {/* Load More Button */}
          {hasNextPage && (
            <div className="text-center pt-6">
              <Button 
                onClick={handleLoadMore}
                disabled={isFetchingNextPage || isLoadingMore}
                variant="outline"
              >
                {isFetchingNextPage || isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  'Charger plus de résultats'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}