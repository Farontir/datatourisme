# ADR-003: State Management Architecture with Zustand and React Query

## Status
Accepted

## Context
The DataTourisme application requires sophisticated state management for:

- **Search state**: Filters, view modes, pagination
- **User preferences**: Favorites, settings, theme
- **Server state**: API data, caching, synchronization
- **URL state**: Deep linking, browser back/forward
- **Form state**: Complex forms with validation

## Decision
We will use a **hybrid state management approach**:

1. **Zustand** for client-side global state
2. **React Query** for server state management
3. **nuqs** for URL-driven state synchronization
4. **React Hook Form** for form state

## Architecture Overview

```typescript
// State layers
┌─────────────────┐
│   URL State     │ ← nuqs (searchParams)
├─────────────────┤
│  Client State   │ ← Zustand (search, user prefs)
├─────────────────┤
│  Server State   │ ← React Query (API data)
├─────────────────┤
│   Form State    │ ← React Hook Form (local forms)
└─────────────────┘
```

## Implementation Strategy

### 1. Zustand for Global Client State

```typescript
// Search store
interface SearchState {
  filters: SearchFilters;
  view: ViewMode;
  favorites: string[];
  setFilters: (filters: Partial<SearchFilters>) => void;
  setView: (view: ViewMode) => void;
  toggleFavorite: (id: string) => void;
}

export const useSearchStore = create<SearchState>()(
  devtools(
    persist(
      (set, get) => ({
        filters: initialFilters,
        view: { type: 'grid' },
        favorites: [],
        // ... actions
      }),
      { name: 'search-store' }
    )
  )
);
```

**Benefits:**
- Small bundle size (~2.8kb)
- TypeScript-first design
- No boilerplate
- DevTools support
- Persistence out of the box

### 2. React Query for Server State

```typescript
// API queries
export function useSearchResults(params: SearchParams) {
  return useInfiniteQuery({
    queryKey: ['search', params],
    queryFn: ({ pageParam = 1 }) => 
      searchApi.getResults({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}
```

**Benefits:**
- Automatic caching and revalidation
- Background updates
- Optimistic updates
- Offline support
- DevTools integration

### 3. URL State Synchronization

```typescript
// URL-driven state
export function useSearchParams() {
  const [query, setQuery] = useQueryState('q');
  const [category, setCategory] = useQueryState('category');
  const [filters, setFilters] = useQueryState('filters', {
    parse: JSON.parse,
    serialize: JSON.stringify,
  });
  
  return { query, category, filters, setQuery, setCategory, setFilters };
}
```

**Benefits:**
- Deep linking support
- Browser back/forward
- Shareable URLs
- SSR compatibility

## State Boundaries

### Client State (Zustand)
- User preferences and settings
- View modes and UI state
- Favorites and bookmarks
- Theme and personalization
- Transient application state

### Server State (React Query)
- API data and responses
- Search results and pagination
- Resource details
- User profile data
- Static content (categories, locations)

### URL State (nuqs)
- Search query and filters
- Current page and pagination
- View parameters
- Sort options
- Active tabs or sections

### Form State (React Hook Form)
- Form field values
- Validation errors
- Form submission state
- Field-level state

## Data Flow Patterns

### 1. Search Flow
```
User Input → URL State → React Query → UI Update
     ↓
Zustand Store (view preferences)
```

### 2. User Preferences Flow
```
User Action → Zustand Store → localStorage → UI Update
```

### 3. API Data Flow
```
Component Mount → React Query → API Call → Cache → UI Update
                              ↓
Background Refetch → Cache Update → UI Update
```

## Alternative Approaches Considered

### Redux Toolkit
- **Pros**: Mature ecosystem, time-travel debugging
- **Cons**: Boilerplate, learning curve, bundle size
- **Decision**: Too complex for our needs

### Context + useReducer
- **Pros**: Built-in React, no dependencies
- **Cons**: Performance issues, prop drilling, no persistence
- **Decision**: Doesn't scale well

### Jotai/Valtio
- **Pros**: Atomic state, fine-grained reactivity
- **Cons**: Different mental model, smaller ecosystem
- **Decision**: Zustand is more straightforward

### SWR vs React Query
- **Pros**: Lighter weight, simpler API
- **Cons**: Less features, smaller ecosystem
- **Decision**: React Query has better TypeScript support

## Implementation Guidelines

### 1. Store Structure
```typescript
// ✅ Good: Focused stores
const useSearchStore = create(/* search-related state */);
const useUserStore = create(/* user-related state */);

// ❌ Bad: Monolithic store
const useAppStore = create(/* everything */);
```

### 2. Action Patterns
```typescript
// ✅ Good: Immutable updates
set((state) => ({ ...state, filters: { ...state.filters, query } }));

// ❌ Bad: Direct mutation
set((state) => { state.filters.query = query; });
```

### 3. Server State Keys
```typescript
// ✅ Good: Hierarchical keys
['search', 'results', { query, filters }]
['resource', 'detail', resourceId]

// ❌ Bad: Flat keys
['searchResults']
['resourceDetail']
```

## Testing Strategy

### 1. Zustand Stores
```typescript
// Store testing with act
import { act, renderHook } from '@testing-library/react';

test('updates search query', () => {
  const { result } = renderHook(() => useSearchStore());
  
  act(() => {
    result.current.setFilters({ query: 'test' });
  });
  
  expect(result.current.filters.query).toBe('test');
});
```

### 2. React Query
```typescript
// Query testing with MSW
import { server } from '../mocks/server';

test('fetches search results', async () => {
  server.use(/* mock handlers */);
  
  const { result } = renderHook(() => 
    useSearchResults({ query: 'test' }), 
    { wrapper: QueryClientProvider }
  );
  
  await waitFor(() => {
    expect(result.current.data).toBeDefined();
  });
});
```

## Performance Considerations

### 1. Selector Optimization
```typescript
// ✅ Good: Memoized selectors
const searchQuery = useSearchStore(
  useCallback((state) => state.filters.query, [])
);

// ❌ Bad: Object destructuring
const { filters } = useSearchStore(); // Re-renders on any state change
```

### 2. Query Optimization
```typescript
// ✅ Good: Stable query keys
const queryKey = useMemo(() => 
  ['search', cleanParams(params)], [params]
);

// ❌ Bad: New objects every render
const queryKey = ['search', { ...params, timestamp: Date.now() }];
```

## Consequences

### Positive
- ✅ Clean separation of concerns
- ✅ Excellent TypeScript support
- ✅ Great developer experience
- ✅ Optimal performance characteristics
- ✅ Easy testing and debugging
- ✅ URL-driven features

### Negative
- ❌ Multiple libraries to learn
- ❌ Coordination between state layers
- ❌ Potential for state synchronization bugs

### Neutral
- 🔄 Need clear state ownership boundaries
- 🔄 Requires discipline in state management patterns

## Success Metrics
- Bundle size impact < 30kb
- State update performance < 16ms
- Developer onboarding time < 1 day
- Bug rate related to state management
- User experience metrics (navigation, search speed)

## Migration Path
1. **Phase 1**: Implement Zustand stores
2. **Phase 2**: Add React Query for API data
3. **Phase 3**: Integrate URL state synchronization
4. **Phase 4**: Optimize and refactor existing state

## References
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [nuqs Documentation](https://nuqs.47ng.com/)
- [React Hook Form Documentation](https://react-hook-form.com/)