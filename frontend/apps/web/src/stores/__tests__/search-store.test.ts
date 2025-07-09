import { act, renderHook } from '@testing-library/react';
import { useSearchStore } from '../search-store';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('search-store', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset store state
    useSearchStore.getState().clearFilters();
    useSearchStore.getState().setView({ type: 'grid' });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useSearchStore());
    
    expect(result.current.filters).toEqual({
      query: '',
      category: '',
      location: '',
      priceRange: '',
      rating: null,
      accessibility: false,
    });
    
    expect(result.current.view).toEqual({ type: 'grid' });
    expect(result.current.favorites).toEqual([]);
  });

  it('updates filters correctly', () => {
    const { result } = renderHook(() => useSearchStore());
    
    act(() => {
      result.current.setFilters({
        query: 'château',
        category: 'heritage',
      });
    });
    
    expect(result.current.filters.query).toBe('château');
    expect(result.current.filters.category).toBe('heritage');
    // Other filters should remain unchanged
    expect(result.current.filters.location).toBe('');
    expect(result.current.filters.priceRange).toBe('');
  });

  it('clears filters correctly', () => {
    const { result } = renderHook(() => useSearchStore());
    
    // Set some filters first
    act(() => {
      result.current.setFilters({
        query: 'test',
        category: 'nature',
        rating: 4,
      });
    });
    
    expect(result.current.filters.query).toBe('test');
    expect(result.current.filters.category).toBe('nature');
    expect(result.current.filters.rating).toBe(4);
    
    // Clear filters
    act(() => {
      result.current.clearFilters();
    });
    
    expect(result.current.filters).toEqual({
      query: '',
      category: '',
      location: '',
      priceRange: '',
      rating: null,
      accessibility: false,
    });
  });

  it('changes view mode correctly', () => {
    const { result } = renderHook(() => useSearchStore());
    
    expect(result.current.view.type).toBe('grid');
    
    act(() => {
      result.current.setView({ type: 'list' });
    });
    
    expect(result.current.view.type).toBe('list');
    
    act(() => {
      result.current.setView({ type: 'map' });
    });
    
    expect(result.current.view.type).toBe('map');
  });

  it('manages favorites correctly', () => {
    const { result } = renderHook(() => useSearchStore());
    
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite('resource-1')).toBe(false);
    
    // Add to favorites
    act(() => {
      result.current.toggleFavorite('resource-1');
    });
    
    expect(result.current.favorites).toContain('resource-1');
    expect(result.current.isFavorite('resource-1')).toBe(true);
    
    // Remove from favorites
    act(() => {
      result.current.toggleFavorite('resource-1');
    });
    
    expect(result.current.favorites).not.toContain('resource-1');
    expect(result.current.isFavorite('resource-1')).toBe(false);
  });

  it('handles multiple favorites correctly', () => {
    const { result } = renderHook(() => useSearchStore());
    
    // Add multiple favorites
    act(() => {
      result.current.toggleFavorite('resource-1');
      result.current.toggleFavorite('resource-2');
      result.current.toggleFavorite('resource-3');
    });
    
    expect(result.current.favorites).toHaveLength(3);
    expect(result.current.favorites).toEqual(['resource-1', 'resource-2', 'resource-3']);
    
    // Remove one favorite
    act(() => {
      result.current.toggleFavorite('resource-2');
    });
    
    expect(result.current.favorites).toHaveLength(2);
    expect(result.current.favorites).toEqual(['resource-1', 'resource-3']);
    expect(result.current.isFavorite('resource-2')).toBe(false);
  });

  it('persists state to localStorage', () => {
    const { result } = renderHook(() => useSearchStore());
    
    act(() => {
      result.current.setFilters({ query: 'test query' });
    });
    
    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'search-store',
      expect.stringContaining('"query":"test query"')
    );
  });

  it('loads state from localStorage', () => {
    // Mock localStorage to return saved state
    const savedState = {
      state: {
        filters: { query: 'saved query', category: 'nature' },
        view: { type: 'list' },
        favorites: ['saved-resource'],
      },
      version: 0,
    };
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));
    
    // Create new hook instance (simulating page reload)
    const { result } = renderHook(() => useSearchStore());
    
    expect(result.current.filters.query).toBe('saved query');
    expect(result.current.filters.category).toBe('nature');
    expect(result.current.view.type).toBe('list');
    expect(result.current.favorites).toContain('saved-resource');
  });

  it('handles invalid localStorage data gracefully', () => {
    // Mock localStorage to return invalid JSON
    localStorageMock.getItem.mockReturnValue('invalid json');
    
    // Should not throw and should use default state
    const { result } = renderHook(() => useSearchStore());
    
    expect(result.current.filters.query).toBe('');
    expect(result.current.view.type).toBe('grid');
    expect(result.current.favorites).toEqual([]);
  });

  it('validates filter values', () => {
    const { result } = renderHook(() => useSearchStore());
    
    // Test rating validation
    act(() => {
      result.current.setFilters({ rating: 6 }); // Invalid rating
    });
    
    // Should clamp to valid range
    expect(result.current.filters.rating).toBeLessThanOrEqual(5);
    
    act(() => {
      result.current.setFilters({ rating: -1 }); // Invalid rating
    });
    
    // Should clamp to valid range
    expect(result.current.filters.rating).toBeGreaterThanOrEqual(0);
  });

  it('handles concurrent updates correctly', () => {
    const { result } = renderHook(() => useSearchStore());
    
    // Simulate multiple rapid updates
    act(() => {
      result.current.setFilters({ query: 'first' });
      result.current.setFilters({ category: 'nature' });
      result.current.setFilters({ location: 'paris' });
    });
    
    // All updates should be applied
    expect(result.current.filters.query).toBe('first');
    expect(result.current.filters.category).toBe('nature');
    expect(result.current.filters.location).toBe('paris');
  });

  it('provides search query getter', () => {
    const { result } = renderHook(() => useSearchStore());
    
    act(() => {
      result.current.setFilters({
        query: 'château',
        category: 'heritage',
        location: 'paris',
        rating: 4,
        accessibility: true,
      });
    });
    
    // Should be able to extract search parameters for API calls
    const searchParams = {
      q: result.current.filters.query,
      category: result.current.filters.category,
      location: result.current.filters.location,
      rating: result.current.filters.rating,
      accessibility: result.current.filters.accessibility,
    };
    
    expect(searchParams.q).toBe('château');
    expect(searchParams.category).toBe('heritage');
    expect(searchParams.location).toBe('paris');
    expect(searchParams.rating).toBe(4);
    expect(searchParams.accessibility).toBe(true);
  });
});