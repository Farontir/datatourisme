# ADR-004: Performance Optimization Strategy for Lighthouse Score ≥95

## Status
Accepted

## Context
The DataTourisme application must achieve and maintain a **Lighthouse performance score of ≥95** with specific Core Web Vitals targets:

- **First Contentful Paint (FCP)**: < 1.0s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms
- **Interaction to Next Paint (INP)**: < 200ms

## Decision
We will implement a **comprehensive performance optimization strategy** covering all aspects of the application lifecycle, from build-time optimizations to runtime monitoring.

## Core Strategies

### 1. Build-Time Optimizations

#### Bundle Optimization
```javascript
// Next.js configuration
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
};
```

#### Code Splitting Strategy
```typescript
// Route-based splitting
const MapView = dynamic(() => import('../components/map/MapView'), {
  loading: () => <MapSkeleton />,
  ssr: false,
});

// Component-based splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### 2. Critical Resource Optimization

#### Critical CSS Inlining
```typescript
// Inline critical styles for above-the-fold content
const criticalCSS = `
  .hero-section { display: block; }
  .navigation { display: flex; }
  .search-bar { display: block; }
`;
```

#### Resource Hints
```typescript
// DNS prefetch and preconnect
const resourceHints = [
  'https://fonts.googleapis.com',
  'https://api.datatourisme.fr',
  'https://tiles.openstreetmap.org',
];
```

### 3. Image Optimization Strategy

#### Modern Formats and Responsive Images
```typescript
// Next.js Image component with optimization
<Image
  src={resource.image.url}
  alt={resource.image.alt}
  width={400}
  height={300}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={index < 3} // LCP optimization
  placeholder="blur"
  blurDataURL={resource.image.blurDataURL}
/>
```

#### Lazy Loading Implementation
```typescript
// Intersection Observer for below-the-fold images
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target as HTMLImageElement;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    }
  });
}, { threshold: 0.1 });
```

### 4. JavaScript Optimization

#### Main Thread Optimization
```typescript
// Scheduler API for non-critical tasks
if ('scheduler' in window) {
  const scheduler = (window as any).scheduler;
  
  scheduler.postTask(() => {
    // Defer analytics initialization
    initAnalytics();
  }, { priority: 'background' });
}
```

#### Efficient Event Handling
```typescript
// Debounced search with useMemo
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    setFilters({ query });
  }, 300),
  []
);
```

### 5. Network Optimization

#### Service Worker for Caching
```typescript
// Progressive enhancement with service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

#### API Response Optimization
```typescript
// Efficient pagination and prefetching
export function useSearchResults(params: SearchParams) {
  return useInfiniteQuery({
    queryKey: ['search', params],
    queryFn: ({ pageParam = 1 }) => 
      searchApi.getResults({ ...params, page: pageParam }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    prefetchPages: 2, // Prefetch next pages
  });
}
```

## Performance Monitoring

### 1. Core Web Vitals Tracking
```typescript
// Real User Monitoring (RUM)
export function initPerformanceMonitoring(): void {
  // Measure FCP
  measureFCP();
  // Measure LCP
  measureLCP();
  // Measure FID/INP
  measureFID();
  // Measure CLS
  measureCLS();
}
```

### 2. Custom Metrics
```typescript
interface CustomMetrics {
  searchTime: number | null;
  mapLoadTime: number | null;
  imageLoadTime: number | null;
  routeChangeTime: number | null;
}
```

### 3. Performance Budget
```json
{
  "performanceBudget": {
    "FCP": 1000,
    "LCP": 2500,
    "CLS": 0.1,
    "FID": 100,
    "bundle.js": "150kb",
    "images": "500kb",
    "total": "1mb"
  }
}
```

## Implementation Details

### 1. Font Optimization
```css
/* Preload critical fonts */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap;
  font-weight: 100 900;
}
```

### 2. Third-Party Script Optimization
```typescript
// Delayed loading of non-critical scripts
window.addEventListener('load', () => {
  setTimeout(() => {
    // Load analytics after page load
    import('./analytics').then(module => {
      module.initAnalytics();
    });
  }, 1000);
});
```

### 3. Component-Level Optimizations
```typescript
// Memoization for expensive calculations
const ExpensiveComponent = memo(({ data }: Props) => {
  const processedData = useMemo(() => 
    heavyCalculation(data), [data]
  );
  
  return <div>{processedData}</div>;
});
```

## Testing and Validation

### 1. Lighthouse CI Integration
```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  run: |
    npm install -g @lhci/cli@0.12.x
    lhci autorun
```

### 2. Performance Testing
```typescript
// Performance test example
describe('Performance', () => {
  it('should load search results within 2 seconds', async () => {
    const startTime = performance.now();
    
    render(<SearchResults params={{ query: 'test' }} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Resource')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(2000);
  });
});
```

### 3. Real User Monitoring
```typescript
// Send metrics to analytics
function reportMetrics(metrics: PerformanceMetrics): void {
  if (process.env.NODE_ENV === 'production') {
    analytics.track('Performance Metrics', {
      ...metrics,
      url: window.location.href,
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType,
    });
  }
}
```

## Lighthouse Score Breakdown

### Performance (Target: ≥95)
- **FCP**: 25% weight - Target < 1.0s
- **LCP**: 25% weight - Target < 2.5s
- **CLS**: 25% weight - Target < 0.1
- **Speed Index**: 10% weight
- **TTI**: 10% weight
- **TBT**: 5% weight

### Optimization Priorities
1. **High Impact**: Image optimization, code splitting, critical CSS
2. **Medium Impact**: Font loading, third-party scripts, prefetching
3. **Low Impact**: Micro-optimizations, advanced caching strategies

## Alternative Approaches Considered

### Server-Side Rendering vs Static Generation
- **Decision**: Hybrid approach with ISR for dynamic content
- **Rationale**: Balance between performance and freshness

### CDN Strategy
- **Decision**: Vercel Edge Network with global distribution
- **Rationale**: Lowest latency for static assets

### Image Optimization Service
- **Decision**: Next.js built-in image optimization
- **Rationale**: Integrated solution with automatic format selection

## Success Metrics

### Primary KPIs
- Lighthouse Performance Score ≥ 95
- Core Web Vitals passing thresholds
- Page load time < 2 seconds
- Time to interactive < 3 seconds

### Secondary KPIs
- Bundle size reduction
- Cache hit rates
- User engagement metrics
- Conversion rates

## Consequences

### Positive
- ✅ Excellent user experience
- ✅ Better SEO rankings
- ✅ Higher conversion rates
- ✅ Reduced bounce rates
- ✅ Improved accessibility

### Negative
- ❌ Increased development complexity
- ❌ Additional monitoring overhead
- ❌ Potential over-optimization

### Neutral
- 🔄 Ongoing performance budget maintenance
- 🔄 Regular performance audits required

## Monitoring and Alerts

### 1. Performance Budgets
```json
{
  "budgets": [
    {
      "resourceSizes": [
        { "resourceType": "script", "budget": 150 },
        { "resourceType": "image", "budget": 500 }
      ]
    }
  ]
}
```

### 2. Real User Monitoring Alerts
- Performance degradation > 10%
- Core Web Vitals failing thresholds
- Bundle size increases > 20%

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- Set up Lighthouse CI
- Implement core optimizations
- Add performance monitoring

### Phase 2: Advanced Optimizations (Week 3-4)
- Service worker implementation
- Advanced image optimization
- Third-party script optimization

### Phase 3: Monitoring & Refinement (Week 5-6)
- Real user monitoring
- Performance budget enforcement
- Continuous optimization

## References
- [Lighthouse Performance Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/basic-features/performance-optimization)
- [Web Performance Best Practices](https://web.dev/fast/)