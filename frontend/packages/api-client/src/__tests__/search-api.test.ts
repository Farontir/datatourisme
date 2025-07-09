import { searchApi } from '../search-api';
import { SearchParams, SearchResult, PaginatedResponse } from '@datatourisme/types';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('searchApi', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getResults', () => {
    const mockSearchParams: SearchParams = {
      query: 'château',
      category: 'heritage',
      location: 'paris',
      page: 1,
      limit: 20,
    };

    const mockResponse: PaginatedResponse<SearchResult> = {
      results: [
        {
          id: '1',
          name: 'Château de Versailles',
          description: 'Historic palace',
          location: {
            name: 'Versailles',
            latitude: 48.8049,
            longitude: 2.1204,
          },
          category: {
            id: 'heritage',
            name: 'Patrimoine',
          },
          rating: 4.8,
          reviewCount: 15647,
          priceRange: 'MEDIUM',
          images: [],
          accessibility: {
            wheelchairAccessible: true,
          },
        },
      ],
      count: 1,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
    };

    it('should fetch search results successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await searchApi.getResults(mockSearchParams);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search'),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should build correct query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await searchApi.getResults(mockSearchParams);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      const url = new URL(calledUrl, 'http://localhost');
      
      expect(url.searchParams.get('q')).toBe('château');
      expect(url.searchParams.get('category')).toBe('heritage');
      expect(url.searchParams.get('location')).toBe('paris');
      expect(url.searchParams.get('page')).toBe('1');
      expect(url.searchParams.get('limit')).toBe('20');
    });

    it('should handle empty query parameters', async () => {
      const emptyParams: SearchParams = {
        query: '',
        page: 1,
        limit: 20,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await searchApi.getResults(emptyParams);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      const url = new URL(calledUrl, 'http://localhost');
      
      expect(url.searchParams.get('q')).toBe('');
      expect(url.searchParams.has('category')).toBe(false);
      expect(url.searchParams.has('location')).toBe(false);
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Internal Server Error';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: errorMessage,
      } as Response);

      await expect(searchApi.getResults(mockSearchParams)).rejects.toThrow(
        `Search API error: ${errorMessage}`
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(searchApi.getResults(mockSearchParams)).rejects.toThrow(
        'Network error'
      );
    });

    it('should validate search parameters', async () => {
      const invalidParams = {
        query: 'test',
        page: -1, // Invalid page
        limit: 0,  // Invalid limit
      } as SearchParams;

      await expect(searchApi.getResults(invalidParams)).rejects.toThrow();
    });

    it('should handle rating filter', async () => {
      const paramsWithRating: SearchParams = {
        ...mockSearchParams,
        rating: 4,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await searchApi.getResults(paramsWithRating);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      const url = new URL(calledUrl, 'http://localhost');
      
      expect(url.searchParams.get('rating')).toBe('4');
    });

    it('should handle accessibility filter', async () => {
      const paramsWithAccessibility: SearchParams = {
        ...mockSearchParams,
        accessibility: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await searchApi.getResults(paramsWithAccessibility);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      const url = new URL(calledUrl, 'http://localhost');
      
      expect(url.searchParams.get('accessibility')).toBe('true');
    });
  });

  describe('getResourceById', () => {
    const mockResource: SearchResult = {
      id: '1',
      name: 'Château de Versailles',
      description: 'Historic palace with beautiful gardens',
      location: {
        name: 'Versailles',
        latitude: 48.8049,
        longitude: 2.1204,
      },
      category: {
        id: 'heritage',
        name: 'Patrimoine',
      },
      rating: 4.8,
      reviewCount: 15647,
      priceRange: 'MEDIUM',
      images: [],
      accessibility: {
        wheelchairAccessible: true,
      },
    };

    it('should fetch resource by ID successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResource,
      } as Response);

      const result = await searchApi.getResourceById('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/resources/1'),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result).toEqual(mockResource);
    });

    it('should handle 404 errors for non-existent resources', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(searchApi.getResourceById('999')).rejects.toThrow(
        'Search API error: Not Found'
      );
    });
  });
});