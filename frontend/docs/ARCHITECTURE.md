# DataTourisme Frontend Architecture

This document outlines the technical architecture, design decisions, and implementation details of the DataTourisme frontend application.

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Client                         │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App Router                                             │
│  ├── App Pages (RSC)     ├── API Routes      ├── Middleware     │
│  ├── Client Components   ├── Server Actions  ├── Auth           │
│  └── Static Generation   └── Data Fetching   └── Security       │
├─────────────────────────────────────────────────────────────────┤
│  Design System & UI Components                                  │
│  ├── Atomic Components   ├── Compound Components               │
│  ├── Layout Components   ├── Feature Components                │
│  └── Utility Functions   └── Styling System                    │
├─────────────────────────────────────────────────────────────────┤
│  State Management & Data Layer                                  │
│  ├── TanStack Query      ├── Zustand Stores                   │
│  ├── Form State          ├── Auth State                        │
│  └── Cache Management    └── Optimistic Updates               │
├─────────────────────────────────────────────────────────────────┤
│  External Services & APIs                                       │
│  ├── DataTourisme API    ├── Payment (Stripe)                 │
│  ├── Authentication      ├── Maps (Mapbox)                     │
│  ├── Search (Elasticsearch) ├── Analytics                      │
│  └── CDN & Assets        └── Monitoring                        │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Core Framework
- **Next.js 14**: App Router with React Server Components
- **React 18**: Concurrent features, Suspense, and Server Components
- **TypeScript**: Strict type checking and enhanced developer experience

#### State Management
- **TanStack Query**: Server state management and caching
- **Zustand**: Client-side state management
- **React Hook Form**: Form state management

#### Styling & Design
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **CVA**: Class variance authority for component variants
- **Framer Motion**: Animation library

#### Data & API
- **GraphQL**: Type-safe API queries
- **REST**: Legacy API support
- **WebSockets**: Real-time features
- **Elasticsearch**: Search functionality

## 🎨 Design System Architecture

### Component Hierarchy

```
Design System
├── Foundations
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   ├── Breakpoints
│   └── Animations
├── Tokens
│   ├── CSS Variables
│   ├── Tailwind Config
│   └── Theme System
├── Atoms
│   ├── Button
│   ├── Input
│   ├── Icon
│   └── Badge
├── Molecules
│   ├── Form Field
│   ├── Card
│   ├── Navigation Item
│   └── Search Bar
├── Organisms
│   ├── Header
│   ├── Footer
│   ├── Search Results
│   └── Booking Form
└── Templates
    ├── Page Layout
    ├── Dashboard Layout
    └── Modal Layout
```

### Component Patterns

#### Base Component Pattern
```typescript
// Base component with variants
import { cva, type VariantProps } from 'class-variance-authority';

const componentVariants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: 'default-classes',
        primary: 'primary-classes',
      },
      size: {
        sm: 'small-classes',
        md: 'medium-classes',
        lg: 'large-classes',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface ComponentProps extends VariantProps<typeof componentVariants> {
  // Additional props
}
```

#### Compound Component Pattern
```typescript
// Compound components for complex UI
const Card = ({ children, className, ...props }) => (
  <div className={cn('card-classes', className)} {...props}>
    {children}
  </div>
);

const CardHeader = ({ children, className, ...props }) => (
  <div className={cn('card-header-classes', className)} {...props}>
    {children}
  </div>
);

const CardContent = ({ children, className, ...props }) => (
  <div className={cn('card-content-classes', className)} {...props}>
    {children}
  </div>
);

// Usage
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```

## 🔄 Data Flow Architecture

### Server-Side Data Flow

```
Request → Middleware → Route Handler → Server Action → Database → Response
                ↓
        Security Checks
        Rate Limiting
        Authentication
```

### Client-Side Data Flow

```
User Action → React Component → TanStack Query → API Call → Server
                     ↓
               State Update → Re-render → UI Update
```

### State Management Strategy

#### Server State (TanStack Query)
```typescript
// Server state management
const { data, isLoading, error } = useQuery({
  queryKey: ['destinations', filters],
  queryFn: () => fetchDestinations(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

#### Client State (Zustand)
```typescript
// Client state management
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  language: 'en' | 'fr';
  preferences: UserPreferences;
}

const useAppStore = create<AppState>((set) => ({
  user: null,
  theme: 'light',
  language: 'en',
  preferences: {},
  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme }),
}));
```

#### Form State (React Hook Form)
```typescript
// Form state management
const { control, handleSubmit, formState } = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {
    // Default values
  },
});
```

## 🔐 Security Architecture

### Authentication Flow

```
User Login → NextAuth.js → JWT Token → Session Store → Protected Routes
                 ↓
         OAuth Providers
         Email/Password
         Two-Factor Auth
```

### Security Layers

#### 1. Network Security
- **HTTPS**: TLS 1.3 encryption
- **HSTS**: HTTP Strict Transport Security
- **CSP**: Content Security Policy
- **Rate Limiting**: API protection

#### 2. Application Security
- **Input Validation**: Zod schema validation
- **XSS Protection**: Content sanitization
- **CSRF Protection**: Token-based protection
- **SQL Injection**: Parameterized queries

#### 3. Data Security
- **Encryption**: Data at rest and in transit
- **Access Control**: Role-based permissions
- **Audit Logging**: Security event tracking
- **Data Masking**: Sensitive data protection

### Security Implementation

```typescript
// Security middleware
export async function securityMiddleware(req: NextRequest) {
  // Rate limiting
  const rateLimitResult = await rateLimit(req);
  if (rateLimitResult.blocked) {
    return new Response('Too Many Requests', { status: 429 });
  }

  // CSP headers
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}
```

## 🚀 Performance Architecture

### Performance Strategy

#### 1. Code Splitting
```typescript
// Route-based code splitting
const DashboardPage = dynamic(() => import('./DashboardPage'), {
  loading: () => <DashboardSkeleton />,
});

// Component-based code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

#### 2. Caching Strategy
```typescript
// Multi-layer caching
const cacheStrategy = {
  browser: {
    staticAssets: '1 year',
    apiResponses: '5 minutes',
  },
  cdn: {
    images: '30 days',
    css: '1 year',
    js: '1 year',
  },
  server: {
    pages: '1 hour',
    api: '5 minutes',
  },
};
```

#### 3. Bundle Optimization
```typescript
// Webpack optimization
const webpackConfig = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          priority: 20,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
      },
    },
  },
};
```

### Performance Monitoring

```typescript
// Web Vitals monitoring
export function reportWebVitals(metric: NextWebVitalsMetric) {
  switch (metric.name) {
    case 'CLS':
    case 'FID':
    case 'FCP':
    case 'LCP':
    case 'TTFB':
      // Send to analytics
      analytics.track('web_vital', {
        name: metric.name,
        value: metric.value,
        label: metric.label,
      });
      break;
  }
}
```

## 🧪 Testing Architecture

### Testing Strategy

#### 1. Unit Testing
```typescript
// Component testing
describe('Button Component', () => {
  it('renders with correct variant', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('calls onClick handler', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

#### 2. Integration Testing
```typescript
// Page testing
test('search functionality', async ({ page }) => {
  await page.goto('/search');
  
  await page.fill('[data-testid="search-input"]', 'Paris');
  await page.click('[data-testid="search-button"]');
  
  await expect(page.locator('[data-testid="results"]')).toBeVisible();
});
```

#### 3. Visual Testing
```typescript
// Storybook visual testing
export const Default: Story = {
  args: {
    children: 'Button',
  },
  parameters: {
    chromatic: {
      viewports: [375, 768, 1200],
      delay: 300,
    },
  },
};
```

### Testing Tools

- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **Playwright**: E2E testing
- **Chromatic**: Visual regression testing
- **axe-core**: Accessibility testing

## 📱 Mobile Architecture

### Responsive Design Strategy

#### 1. Mobile-First Approach
```css
/* Base styles for mobile */
.component {
  @apply p-4 text-sm;
}

/* Tablet styles */
@media (min-width: 768px) {
  .component {
    @apply p-6 text-base;
  }
}

/* Desktop styles */
@media (min-width: 1024px) {
  .component {
    @apply p-8 text-lg;
  }
}
```

#### 2. Touch-Friendly Design
```typescript
// Touch interactions
const TouchButton = ({ children, ...props }) => (
  <button
    className="min-h-[44px] min-w-[44px] touch-manipulation"
    {...props}
  >
    {children}
  </button>
);
```

#### 3. Progressive Web App
```typescript
// PWA configuration
const pwaConfig = {
  name: 'DataTourisme',
  short_name: 'DataTourisme',
  theme_color: '#0570de',
  background_color: '#ffffff',
  display: 'standalone',
  start_url: '/',
  icons: [
    {
      src: '/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
  ],
};
```

## 🌐 Internationalization Architecture

### i18n Implementation

```typescript
// i18n configuration
const i18nConfig = {
  defaultLocale: 'fr',
  locales: ['fr', 'en', 'es', 'de'],
  fallbackLocale: 'fr',
  interpolation: {
    escapeValue: false,
  },
};

// Usage
const { t } = useTranslation('common');
const title = t('page.title', { name: 'DataTourisme' });
```

### Localization Strategy

```typescript
// Namespace organization
const namespaces = {
  common: 'Common UI elements',
  auth: 'Authentication flow',
  search: 'Search functionality',
  booking: 'Booking process',
  profile: 'User profile',
};

// Translation loading
const loadTranslations = async (locale: string, namespace: string) => {
  const translations = await import(`../locales/${locale}/${namespace}.json`);
  return translations.default;
};
```

## 🔍 Search Architecture

### Search Implementation

```typescript
// Search service
class SearchService {
  async search(query: string, filters: SearchFilters) {
    const searchQuery = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['title^2', 'description', 'location'],
              },
            },
          ],
          filter: this.buildFilters(filters),
        },
      },
      highlight: {
        fields: {
          title: {},
          description: {},
        },
      },
    };

    return await this.elasticsearchClient.search({
      index: 'destinations',
      body: searchQuery,
    });
  }
}
```

### Search Features

- **Full-text search**: Elasticsearch with relevance scoring
- **Faceted search**: Category, location, price filters
- **Autocomplete**: Real-time suggestions
- **Geosearch**: Location-based search
- **Personalization**: User preference-based ranking

## 📊 Analytics Architecture

### Analytics Implementation

```typescript
// Analytics service
class AnalyticsService {
  track(event: string, properties: Record<string, any>) {
    // Privacy-compliant tracking
    if (this.hasConsent()) {
      this.gtag('event', event, {
        custom_parameter: properties,
        anonymize_ip: true,
      });
    }
  }

  identifyUser(userId: string, traits: UserTraits) {
    if (this.hasConsent()) {
      this.gtag('config', 'GA_TRACKING_ID', {
        user_id: userId,
        custom_map: traits,
      });
    }
  }
}
```

### Privacy-First Analytics

- **Cookie-less tracking**: First-party data only
- **Consent management**: GDPR compliance
- **Data minimization**: Collect only necessary data
- **Anonymization**: IP and user data anonymization

## 🔧 Build & Deployment Architecture

### Build Process

```typescript
// Build configuration
const buildConfig = {
  target: 'serverless',
  experimental: {
    appDir: true,
    serverActions: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    loader: 'custom',
  },
  webpack: (config) => {
    // Bundle optimization
    config.optimization.splitChunks = {
      // Chunk configuration
    };
    return config;
  },
};
```

### Deployment Strategy

```yaml
# CI/CD pipeline
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test
      - name: Build application
        run: pnpm build
      - name: Deploy to Vercel
        run: vercel --prod
```

## 🚦 Monitoring & Observability

### Monitoring Stack

```typescript
// Monitoring configuration
const monitoringConfig = {
  errorTracking: {
    service: 'Sentry',
    sampleRate: 0.1,
    environment: process.env.NODE_ENV,
  },
  performance: {
    service: 'DataDog',
    metrics: ['web_vitals', 'api_response_time'],
  },
  logging: {
    level: 'info',
    structured: true,
    service: 'Winston',
  },
};
```

### Health Checks

```typescript
// Health check endpoint
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      elasticsearch: await checkElasticsearch(),
    },
  };

  return Response.json(health);
}
```

## 🔄 Future Architecture Considerations

### Scalability Plans

1. **Micro-frontends**: Module federation for team autonomy
2. **Edge computing**: Vercel Edge Functions for global performance
3. **Serverless architecture**: Functions-as-a-Service for API routes
4. **Database sharding**: Horizontal scaling for large datasets

### Technology Evolution

1. **React 19**: New features and performance improvements
2. **Next.js 15**: Enhanced App Router and Server Components
3. **Web Components**: Framework-agnostic components
4. **WebAssembly**: Performance-critical computations

### Performance Optimizations

1. **Streaming SSR**: Progressive page rendering
2. **Islands architecture**: Selective hydration
3. **Service Workers**: Advanced caching strategies
4. **HTTP/3**: Next-generation protocol adoption

---

This architecture document serves as a living guide for understanding and evolving the DataTourisme frontend system. It should be updated as the architecture evolves and new patterns emerge.