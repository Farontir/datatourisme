import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithA11y, expectNoA11yViolations } from '../../../test-utils/test-utils';
import { SearchBar } from '../SearchBar';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock zustand store
jest.mock('../../../stores/search-store', () => ({
  useSearchStore: () => ({
    filters: { query: '' },
    setFilters: jest.fn(),
    recentSearches: ['Paris', 'Lyon', 'Marseille'],
    addRecentSearch: jest.fn(),
    clearRecentSearches: jest.fn(),
  }),
}));

describe('SearchBar', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders search input with proper accessibility', async () => {
    const { a11yResults } = await renderWithA11y(<SearchBar />);
    
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder');
    
    expectNoA11yViolations(a11yResults);
  });

  it('shows recent searches when focused', async () => {
    const user = userEvent.setup();
    await renderWithA11y(<SearchBar showRecentSearches={true} />);
    
    const searchInput = screen.getByRole('searchbox');
    await user.click(searchInput);
    
    await waitFor(() => {
      expect(screen.getByText('Recherches récentes')).toBeInTheDocument();
      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('Lyon')).toBeInTheDocument();
    });
  });

  it('navigates to search page on form submission', async () => {
    const user = userEvent.setup();
    await renderWithA11y(<SearchBar />);
    
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'test search');
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/search?q=test%20search');
    });
  });

  it('clears search input when clear button is clicked', async () => {
    const user = userEvent.setup();
    await renderWithA11y(<SearchBar />);
    
    const searchInput = screen.getByRole('searchbox') as HTMLInputElement;
    await user.type(searchInput, 'test');
    
    expect(searchInput.value).toBe('test');
    
    const clearButton = screen.getByRole('button', { name: /clear search/i });
    await user.click(clearButton);
    
    expect(searchInput.value).toBe('');
  });

  it('handles keyboard navigation in recent searches', async () => {
    const user = userEvent.setup();
    await renderWithA11y(<SearchBar showRecentSearches={true} />);
    
    const searchInput = screen.getByRole('searchbox');
    await user.click(searchInput);
    
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    
    const firstRecentSearch = screen.getByText('Paris');
    await user.click(firstRecentSearch);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/search?q=Paris');
    });
  });

  it('has proper ARIA labels and roles', async () => {
    const { a11yResults } = await renderWithA11y(<SearchBar />);
    
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveAttribute('type', 'search');
    
    const searchForm = searchInput.closest('form');
    expect(searchForm).toBeInTheDocument();
    
    expectNoA11yViolations(a11yResults);
  });
});