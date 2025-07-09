import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { CategoryId, LocationId } from '@datatourisme/types';

export interface SearchFilters {
  query: string;
  category?: CategoryId;
  location?: LocationId;
  priceRange?: string[];
  rating?: number;
  accessibility?: {
    wheelchairAccessible?: boolean;
    hearingImpaired?: boolean;
    visuallyImpaired?: boolean;
  };
  sortBy?: 'relevance' | 'name' | 'rating' | 'distance';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchView {
  type: 'grid' | 'list' | 'map';
  itemsPerPage: number;
}

interface SearchState {
  filters: SearchFilters;
  view: SearchView;
  recentSearches: string[];
  favorites: string[];

  // Actions
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  setView: (view: Partial<SearchView>) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const initialFilters: SearchFilters = {
  query: '',
  sortBy: 'relevance',
  sortOrder: 'desc',
};

const initialView: SearchView = {
  type: 'grid',
  itemsPerPage: 20,
};

export const useSearchStore = create<SearchState>()(
  devtools(
    persist(
      (set, get) => ({
        filters: initialFilters,
        view: initialView,
        recentSearches: [],
        favorites: [],

        setFilters: (newFilters) =>
          set(
            (state) => ({
              filters: { ...state.filters, ...newFilters },
            }),
            false,
            'search/setFilters'
          ),

        resetFilters: () =>
          set(
            { filters: initialFilters },
            false,
            'search/resetFilters'
          ),

        setView: (newView) =>
          set(
            (state) => ({
              view: { ...state.view, ...newView },
            }),
            false,
            'search/setView'
          ),

        addRecentSearch: (query) =>
          set(
            (state) => {
              const trimmedQuery = query.trim();
              if (!trimmedQuery || state.recentSearches.includes(trimmedQuery)) {
                return state;
              }
              
              const newRecentSearches = [
                trimmedQuery,
                ...state.recentSearches.slice(0, 9), // Keep only 10 recent searches
              ];
              
              return { recentSearches: newRecentSearches };
            },
            false,
            'search/addRecentSearch'
          ),

        clearRecentSearches: () =>
          set(
            { recentSearches: [] },
            false,
            'search/clearRecentSearches'
          ),

        toggleFavorite: (id) =>
          set(
            (state) => {
              const isFavorited = state.favorites.includes(id);
              const newFavorites = isFavorited
                ? state.favorites.filter((fav) => fav !== id)
                : [...state.favorites, id];
              
              return { favorites: newFavorites };
            },
            false,
            'search/toggleFavorite'
          ),

        isFavorite: (id) => get().favorites.includes(id),
      }),
      {
        name: 'datatourisme-search',
        partialize: (state) => ({
          view: state.view,
          recentSearches: state.recentSearches,
          favorites: state.favorites,
        }),
      }
    ),
    {
      name: 'search-store',
    }
  )
);