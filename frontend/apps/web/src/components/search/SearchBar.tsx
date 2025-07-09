'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { Button, Input, Search, X } from '@datatourisme/ui';
import { cn } from '@datatourisme/ui';
import { useSearchStore } from '../../stores/search-store';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  showRecentSearches?: boolean;
}

export function SearchBar({ 
  className, 
  placeholder = 'Rechercher des destinations, activités...',
  showRecentSearches = true 
}: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { 
    filters, 
    setFilters, 
    recentSearches, 
    addRecentSearch,
    clearRecentSearches 
  } = useSearchStore();

  const debouncedSearch = useDebouncedCallback((searchQuery: string) => {
    setFilters({ query: searchQuery });
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      addRecentSearch(trimmedQuery);
      setFilters({ query: trimmedQuery });
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      setShowSuggestions(false);
    }
  };

  const handleRecentSearchClick = (searchTerm: string) => {
    setQuery(searchTerm);
    setFilters({ query: searchTerm });
    router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
    setShowSuggestions(false);
  };

  const clearInput = () => {
    setQuery('');
    setFilters({ query: '' });
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (filters.query !== query) {
      setQuery(filters.query);
    }
  }, [filters.query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(showRecentSearches && recentSearches.length > 0)}
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={clearInput}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </form>

      {/* Recent searches dropdown */}
      {showSuggestions && showRecentSearches && recentSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-50 dark:bg-neutral-950 dark:border-neutral-800">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Recherches récentes
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs text-neutral-500 hover:text-neutral-700"
                onClick={clearRecentSearches}
              >
                Effacer
              </Button>
            </div>
            <div className="space-y-1">
              {recentSearches.slice(0, 5).map((searchTerm, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  onClick={() => handleRecentSearchClick(searchTerm)}
                >
                  <Search className="inline w-3 h-3 mr-2 text-neutral-400" />
                  {searchTerm}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}