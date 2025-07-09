import { useState, useCallback, useEffect } from 'react';
import { FavoriteItem, Collection } from '../components/Favorites';

export interface UseFavoritesOptions {
  /** Initial favorites data */
  initialFavorites?: FavoriteItem[];
  /** Initial collections data */
  initialCollections?: Collection[];
  /** Function to persist favorites */
  onFavoritesChange?: (favorites: FavoriteItem[]) => void;
  /** Function to persist collections */
  onCollectionsChange?: (collections: Collection[]) => void;
  /** Storage key for localStorage persistence */
  storageKey?: string;
  /** Enable localStorage persistence */
  enableStorage?: boolean;
}

export interface UseFavoritesReturn {
  // State
  favorites: FavoriteItem[];
  collections: Collection[];
  
  // Favorites management
  addFavorite: (item: Omit<FavoriteItem, 'id' | 'createdAt'>) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  getFavorite: (id: string) => FavoriteItem | undefined;
  updateFavorite: (id: string, updates: Partial<FavoriteItem>) => void;
  
  // Collections management
  createCollection: (collection: Omit<Collection, 'id' | 'itemCount' | 'createdAt' | 'updatedAt'>) => string;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  getCollection: (id: string) => Collection | undefined;
  
  // Item-Collection operations
  moveToCollection: (itemId: string, collectionId: string | null) => void;
  getCollectionItems: (collectionId: string) => FavoriteItem[];
  
  // Bulk operations
  clearFavorites: () => void;
  importFavorites: (items: FavoriteItem[]) => void;
  exportFavorites: () => { favorites: FavoriteItem[]; collections: Collection[] };
}

let idCounter = 0;
const generateId = () => `${Date.now()}-${++idCounter}`;

export function useFavorites({
  initialFavorites = [],
  initialCollections = [],
  onFavoritesChange,
  onCollectionsChange,
  storageKey = 'favorites-data',
  enableStorage = true,
}: UseFavoritesOptions = {}): UseFavoritesReturn {
  
  // Load initial data from storage if enabled
  const loadFromStorage = useCallback(() => {
    if (!enableStorage || typeof window === 'undefined') {
      return { favorites: initialFavorites, collections: initialCollections };
    }
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          favorites: parsed.favorites?.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
          })) || initialFavorites,
          collections: parsed.collections?.map((collection: any) => ({
            ...collection,
            createdAt: new Date(collection.createdAt),
            updatedAt: new Date(collection.updatedAt),
          })) || initialCollections,
        };
      }
    } catch (error) {
      console.error('Failed to load favorites from storage:', error);
    }
    
    return { favorites: initialFavorites, collections: initialCollections };
  }, [initialFavorites, initialCollections, storageKey, enableStorage]);

  const [state, setState] = useState(loadFromStorage);

  // Save to storage whenever state changes
  useEffect(() => {
    if (enableStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save favorites to storage:', error);
      }
    }
  }, [state, storageKey, enableStorage]);

  // Call change handlers
  useEffect(() => {
    onFavoritesChange?.(state.favorites);
  }, [state.favorites, onFavoritesChange]);

  useEffect(() => {
    onCollectionsChange?.(state.collections);
  }, [state.collections, onCollectionsChange]);

  // Update collection item counts
  const updateCollectionCounts = useCallback((favorites: FavoriteItem[], collections: Collection[]) => {
    return collections.map(collection => ({
      ...collection,
      itemCount: favorites.filter(item => item.collectionId === collection.id).length,
      updatedAt: new Date(),
    }));
  }, []);

  // Favorites management
  const addFavorite = useCallback((item: Omit<FavoriteItem, 'id' | 'createdAt'>) => {
    setState(prevState => {
      const newFavorite: FavoriteItem = {
        ...item,
        id: generateId(),
        createdAt: new Date(),
      };
      
      const newFavorites = [...prevState.favorites, newFavorite];
      const updatedCollections = updateCollectionCounts(newFavorites, prevState.collections);
      
      return {
        favorites: newFavorites,
        collections: updatedCollections,
      };
    });
  }, [updateCollectionCounts]);

  const removeFavorite = useCallback((id: string) => {
    setState(prevState => {
      const newFavorites = prevState.favorites.filter((item: FavoriteItem) => item.id !== id);
      const updatedCollections = updateCollectionCounts(newFavorites, prevState.collections);
      
      return {
        favorites: newFavorites,
        collections: updatedCollections,
      };
    });
  }, [updateCollectionCounts]);

  const isFavorite = useCallback((id: string) => {
    return state.favorites.some((item: FavoriteItem) => item.id === id);
  }, [state.favorites]);

  const getFavorite = useCallback((id: string) => {
    return state.favorites.find((item: FavoriteItem) => item.id === id);
  }, [state.favorites]);

  const updateFavorite = useCallback((id: string, updates: Partial<FavoriteItem>) => {
    setState(prevState => {
      const newFavorites = prevState.favorites.map((item: FavoriteItem) =>
        item.id === id ? { ...item, ...updates } : item
      );
      const updatedCollections = updateCollectionCounts(newFavorites, prevState.collections);
      
      return {
        favorites: newFavorites,
        collections: updatedCollections,
      };
    });
  }, [updateCollectionCounts]);

  // Collections management
  const createCollection = useCallback((collection: Omit<Collection, 'id' | 'itemCount' | 'createdAt' | 'updatedAt'>) => {
    const id = generateId();
    const now = new Date();
    
    const newCollection: Collection = {
      ...collection,
      id,
      itemCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    setState(prevState => ({
      ...prevState,
      collections: [...prevState.collections, newCollection],
    }));
    
    return id;
  }, []);

  const updateCollection = useCallback((id: string, updates: Partial<Collection>) => {
    setState(prevState => ({
      ...prevState,
      collections: prevState.collections.map((collection: Collection) =>
        collection.id === id
          ? { ...collection, ...updates, updatedAt: new Date() }
          : collection
      ),
    }));
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setState(prevState => {
      // Move items from deleted collection to uncategorized
      const newFavorites = prevState.favorites.map((item: FavoriteItem) =>
        item.collectionId === id ? { ...item, collectionId: undefined } : item
      );
      const newCollections = prevState.collections.filter((collection: Collection) => collection.id !== id);
      
      return {
        favorites: newFavorites,
        collections: newCollections,
      };
    });
  }, []);

  const getCollection = useCallback((id: string) => {
    return state.collections.find((collection: Collection) => collection.id === id);
  }, [state.collections]);

  // Item-Collection operations
  const moveToCollection = useCallback((itemId: string, collectionId: string | null) => {
    setState(prevState => {
      const newFavorites = prevState.favorites.map((item: FavoriteItem) =>
        item.id === itemId ? { ...item, collectionId: collectionId || undefined } : item
      );
      const updatedCollections = updateCollectionCounts(newFavorites, prevState.collections);
      
      return {
        favorites: newFavorites,
        collections: updatedCollections,
      };
    });
  }, [updateCollectionCounts]);

  const getCollectionItems = useCallback((collectionId: string) => {
    return state.favorites.filter((item: FavoriteItem) => item.collectionId === collectionId);
  }, [state.favorites]);

  // Bulk operations
  const clearFavorites = useCallback(() => {
    setState(prevState => ({
      favorites: [],
      collections: prevState.collections.map((collection: Collection) => ({
        ...collection,
        itemCount: 0,
        updatedAt: new Date(),
      })),
    }));
  }, []);

  const importFavorites = useCallback((items: FavoriteItem[]) => {
    setState(prevState => {
      const newFavorites = [...prevState.favorites, ...items];
      const updatedCollections = updateCollectionCounts(newFavorites, prevState.collections);
      
      return {
        favorites: newFavorites,
        collections: updatedCollections,
      };
    });
  }, [updateCollectionCounts]);

  const exportFavorites = useCallback(() => {
    return {
      favorites: state.favorites,
      collections: state.collections,
    };
  }, [state]);

  return {
    favorites: state.favorites,
    collections: state.collections,
    addFavorite,
    removeFavorite,
    isFavorite,
    getFavorite,
    updateFavorite,
    createCollection,
    updateCollection,
    deleteCollection,
    getCollection,
    moveToCollection,
    getCollectionItems,
    clearFavorites,
    importFavorites,
    exportFavorites,
  };
}