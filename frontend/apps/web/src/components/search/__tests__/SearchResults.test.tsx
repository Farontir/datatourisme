import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithA11y, expectNoA11yViolations, createMockSearchResults } from '../../../test-utils/test-utils';
import { SearchResults } from '../SearchResults';

// Mock the map component to avoid leaflet issues in tests
jest.mock('../../map/SearchResultsMap', () => ({
  SearchResultsMap: ({ results }: any) => (
    <div data-testid="search-results-map">
      Map with {results.length} results
    </div>
  ),
}));

// Mock React Query
const mockFetchNextPage = jest.fn();
const mockData = {
  pages: [createMockSearchResults(5)],
  pageParams: [1],
};

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: () => ({
    data: mockData,
    fetchNextPage: mockFetchNextPage,
    hasNextPage: true,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
  }),
}));

// Mock zustand store
const mockSetView = jest.fn();
jest.mock('../../../stores/search-store', () => ({
  useSearchStore: () => ({
    view: { type: 'grid' },
    setView: mockSetView,
    toggleFavorite: jest.fn(),
    isFavorite: jest.fn(() => false),
  }),
}));

describe('SearchResults', () => {
  const defaultSearchParams = {
    q: 'test query',
    category: 'mountains',
  };

  beforeEach(() => {
    mockSetView.mockClear();
    mockFetchNextPage.mockClear();
  });

  it('renders search results with proper accessibility', async () => {
    const { a11yResults } = await renderWithA11y(
      <SearchResults searchParams={defaultSearchParams} />
    );
    
    expect(screen.getByText(/5 résultats trouvés/)).toBeInTheDocument();
    expect(screen.getByText(/pour "test query"/)).toBeInTheDocument();
    
    // Check that results are rendered
    expect(screen.getByText('Test Resource 1')).toBeInTheDocument();
    expect(screen.getByText('Test Resource 2')).toBeInTheDocument();
    
    expectNoA11yViolations(a11yResults);
  });

  it('switches between grid and list views', async () => {
    const user = userEvent.setup();
    await renderWithA11y(<SearchResults searchParams={defaultSearchParams} />);
    
    const listViewButton = screen.getByRole('button', { name: /list/i });
    await user.click(listViewButton);
    
    expect(mockSetView).toHaveBeenCalledWith({ type: 'list' });
  });

  it('shows map view when map button is clicked', async () => {
    const user = userEvent.setup();
    await renderWithA11y(<SearchResults searchParams={defaultSearchParams} />);
    
    const mapViewButton = screen.getByRole('button', { name: /map/i });
    await user.click(mapViewButton);
    
    expect(mockSetView).toHaveBeenCalledWith({ type: 'map' });
  });

  it('displays map when view type is map', async () => {
    // Mock store to return map view
    jest.mocked(require('../../../stores/search-store').useSearchStore).mockReturnValue({
      view: { type: 'map' },
      setView: mockSetView,
      toggleFavorite: jest.fn(),
      isFavorite: jest.fn(() => false),
    });

    await renderWithA11y(<SearchResults searchParams={defaultSearchParams} />);
    
    expect(screen.getByTestId('search-results-map')).toBeInTheDocument();
    expect(screen.getByText('Map with 5 results')).toBeInTheDocument();
  });

  it('shows load more button when there are more pages', async () => {
    await renderWithA11y(<SearchResults searchParams={defaultSearchParams} />);
    
    const loadMoreButton = screen.getByRole('button', { name: /charger plus/i });
    expect(loadMoreButton).toBeInTheDocument();
  });

  it('handles load more button click', async () => {
    const user = userEvent.setup();
    await renderWithA11y(<SearchResults searchParams={defaultSearchParams} />);
    
    const loadMoreButton = screen.getByRole('button', { name: /charger plus/i });
    await user.click(loadMoreButton);
    
    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('shows empty state when no results', async () => {
    // Mock empty results
    jest.mocked(require('@tanstack/react-query').useInfiniteQuery).mockReturnValue({
      data: { pages: [{ results: [], count: 0 }] },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      isError: false,
    });

    await renderWithA11y(<SearchResults searchParams={defaultSearchParams} />);
    
    expect(screen.getByText(/aucun résultat trouvé/i)).toBeInTheDocument();
    expect(screen.getByText(/essayez de modifier vos filtres/i)).toBeInTheDocument();
  });

  it('shows loading state', async () => {
    // Mock loading state
    jest.mocked(require('@tanstack/react-query').useInfiniteQuery).mockReturnValue({
      data: undefined,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: true,
      isError: false,
    });

    await renderWithA11y(<SearchResults searchParams={defaultSearchParams} />);
    
    expect(screen.getByRole('generic', { name: /loading/i }) || 
           screen.getByTestId(/loading/i) ||
           document.querySelector('[data-loading]')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    // Mock error state
    jest.mocked(require('@tanstack/react-query').useInfiniteQuery).mockReturnValue({
      data: undefined,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      isError: true,
    });

    await renderWithA11y(<SearchResults searchParams={defaultSearchParams} />);
    
    expect(screen.getByText(/une erreur est survenue/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
  });

  it('has proper ARIA attributes for view toggle buttons', async () => {
    const { a11yResults } = await renderWithA11y(
      <SearchResults searchParams={defaultSearchParams} />
    );
    
    const gridButton = screen.getByRole('button', { name: /grid/i });
    const listButton = screen.getByRole('button', { name: /list/i });
    const mapButton = screen.getByRole('button', { name: /map/i });
    
    expect(gridButton).toBeInTheDocument();
    expect(listButton).toBeInTheDocument();
    expect(mapButton).toBeInTheDocument();
    
    expectNoA11yViolations(a11yResults);
  });
});