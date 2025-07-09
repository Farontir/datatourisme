# DataTourisme Frontend

A modern, scalable tourism platform built with Next.js, TypeScript, and a comprehensive design system. DataTourisme helps users discover authentic French tourism experiences through an intuitive and performant web application.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run Storybook
pnpm storybook
```

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Core Features
- **🏛️ Tourism Discovery**: Explore authentic French destinations, accommodations, and experiences
- **📱 Progressive Web App**: Offline support with service workers and caching
- **🔐 Authentication**: Secure user authentication with NextAuth.js
- **💳 Payment Integration**: Stripe integration for bookings and payments
- **🗺️ Interactive Maps**: Leaflet-based maps for location discovery
- **🔍 Advanced Search**: Elasticsearch-powered search with filters
- **📊 Real-time Updates**: WebSocket integration for live data

### Developer Experience
- **🎨 Component Library**: Comprehensive UI components with Storybook
- **🧪 Testing Suite**: Unit, integration, and E2E tests with 90%+ coverage
- **🔒 Security Hardening**: CSP, rate limiting, and security monitoring
- **📈 Performance Monitoring**: Bundle analysis and web vitals tracking
- **🎯 Accessibility**: WCAG 2.1 AA compliance with screen reader support
- **🌐 Internationalization**: Multi-language support with i18next

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: Custom design system with [Radix UI](https://www.radix-ui.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)

### Development Tools
- **Monorepo**: [Turborepo](https://turbo.build/) with pnpm workspaces
- **Build System**: [Webpack 5](https://webpack.js.org/) with advanced optimization
- **Testing**: [Jest](https://jestjs.io/) + [Playwright](https://playwright.dev/)
- **Linting**: [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/)
- **Type Checking**: [TypeScript](https://www.typescriptlang.org/) with strict mode

### Quality Assurance
- **Visual Testing**: [Chromatic](https://www.chromatic.com/) for visual regression
- **A11y Testing**: [axe-core](https://github.com/dequelabs/axe-core) for accessibility
- **Bundle Analysis**: [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- **Performance**: [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- **Security**: CSP, rate limiting, and security headers

## 🏗️ Architecture

### Project Structure
```
frontend/
├── apps/
│   ├── web/                 # Next.js web application
│   └── storybook/           # Component documentation
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── auth/                # Authentication logic
│   ├── api-client/          # API client and types
│   ├── types/               # Shared TypeScript types
│   ├── utils/               # Utility functions
│   ├── i18n/                # Internationalization
│   ├── performance/         # Performance monitoring
│   └── config/              # Shared configuration
├── tooling/
│   ├── eslint-config/       # ESLint configuration
│   ├── typescript-config/   # TypeScript configuration
│   └── tailwind-config/     # Tailwind CSS configuration
└── docs/                    # Documentation
```

### Design System
- **Atomic Design**: Components organized by atoms, molecules, organisms
- **Theme System**: Consistent colors, typography, and spacing
- **Responsive Design**: Mobile-first approach with breakpoints
- **Accessibility**: WCAG 2.1 AA compliance built-in
- **Dark Mode**: Full dark theme support

### Performance
- **Bundle Optimization**: Code splitting and tree shaking
- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Caching Strategy**: Static generation with ISR
- **Web Vitals**: Monitoring CLS, FCP, LCP, FID, and TTFB
- **Bundle Budgets**: Automated size monitoring with CI enforcement

## 🚀 Getting Started

### Prerequisites
- **Node.js**: 18.x or higher
- **pnpm**: 8.x or higher
- **Git**: Latest version

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/datatourisme/frontend.git
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

The application will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/datatourisme"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# API
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"

# Payment
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."

# Maps
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="pk...."

# Search
ELASTICSEARCH_URL="http://localhost:9200"

# Monitoring
NEXT_PUBLIC_SENTRY_DSN="https://..."
```

## 💻 Development

### Development Workflow

1. **Branch Creation**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Development**
   ```bash
   # Start development server
   pnpm dev
   
   # Run tests in watch mode
   pnpm test:watch
   
   # Start Storybook
   pnpm storybook
   ```

3. **Code Quality**
   ```bash
   # Lint and format code
   pnpm lint
   pnpm format
   
   # Type checking
   pnpm type-check
   
   # Run all tests
   pnpm test
   ```

4. **Build and Deploy**
   ```bash
   # Build for production
   pnpm build
   
   # Analyze bundle
   pnpm bundle:analyze
   ```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm test` | Run all tests |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint` | Lint code |
| `pnpm format` | Format code |
| `pnpm type-check` | Type checking |
| `pnpm storybook` | Start Storybook |
| `pnpm chromatic` | Run visual tests |
| `pnpm bundle:analyze` | Analyze bundle size |

### Code Style

- **TypeScript**: Strict mode with comprehensive type checking
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Conventions**: Camel case for variables, Pascal case for components

## 🧪 Testing

### Testing Strategy

- **Unit Tests**: Jest with React Testing Library
- **Integration Tests**: Playwright for full user flows
- **Visual Tests**: Chromatic for UI regression testing
- **A11y Tests**: axe-core for accessibility compliance
- **Performance Tests**: Lighthouse CI for web vitals

### Running Tests

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:e2e

# Visual tests
pnpm chromatic

# Accessibility tests
pnpm test:a11y

# Performance tests
pnpm test:performance
```

### Test Coverage

Maintained at 90%+ coverage across:
- **Statements**: 92%
- **Branches**: 88%
- **Functions**: 94%
- **Lines**: 91%

### Testing Best Practices

- **Test Driven Development**: Write tests before implementation
- **User-Centric Testing**: Focus on user interactions
- **Mock External Services**: Isolate components from dependencies
- **Accessibility Testing**: Include a11y tests for all components
- **Performance Testing**: Monitor bundle size and web vitals

## 🚀 Deployment

### Build Process

1. **Pre-deployment Checks**
   - All tests pass
   - Bundle size within limits
   - Type checking passes
   - Lint errors resolved

2. **Production Build**
   ```bash
   pnpm build
   ```

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

### Deployment Environments

- **Development**: `https://datatourisme-dev.vercel.app`
- **Staging**: `https://datatourisme-staging.vercel.app`
- **Production**: `https://datatourisme.fr`

### CI/CD Pipeline

- **GitHub Actions**: Automated testing and deployment
- **Quality Gates**: Code coverage, bundle size, security checks
- **Visual Regression**: Chromatic integration
- **Performance Monitoring**: Lighthouse CI reports

## 📊 Performance

### Web Vitals Targets

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FCP (First Contentful Paint)**: < 1.8s
- **TTFB (Time to First Byte)**: < 600ms

### Bundle Size Limits

- **Initial Bundle**: < 300kb
- **Total Bundle**: < 1.5MB
- **Individual Chunks**: < 250kb
- **Vendor Libraries**: < 600kb

### Performance Optimizations

- **Code Splitting**: Route-based and component-based
- **Tree Shaking**: Remove unused code
- **Image Optimization**: WebP/AVIF with responsive images
- **Caching**: Static generation with ISR
- **Compression**: Gzip and Brotli compression

## 🔐 Security

### Security Measures

- **Content Security Policy**: Strict CSP headers
- **Rate Limiting**: API protection with different limits
- **Input Validation**: Zod schema validation
- **Authentication**: Secure session management
- **HTTPS**: TLS 1.3 with HSTS headers

### Security Monitoring

- **CSP Violations**: Automatic reporting and alerting
- **Rate Limit Tracking**: Monitor and block abuse
- **Security Headers**: Comprehensive header configuration
- **Dependency Scanning**: Automated vulnerability detection

## ♿ Accessibility

### Accessibility Standards

- **WCAG 2.1 AA**: Full compliance with guidelines
- **Keyboard Navigation**: Complete keyboard accessibility
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Color Contrast**: Meeting minimum contrast ratios
- **Focus Management**: Visible focus indicators

### Accessibility Testing

- **Automated Testing**: axe-core integration
- **Manual Testing**: Screen reader testing
- **User Testing**: Testing with disabled users
- **Compliance Monitoring**: Continuous a11y monitoring

## 🌐 Internationalization

### Supported Languages

- **French**: Primary language
- **English**: Secondary language
- **Spanish**: Planned
- **German**: Planned

### i18n Features

- **Dynamic Loading**: Lazy load translation files
- **Pluralization**: Proper plural forms for all languages
- **Date/Time Formatting**: Locale-specific formatting
- **Number Formatting**: Currency and number localization

## 📈 Monitoring

### Performance Monitoring

- **Web Vitals**: Real User Monitoring (RUM)
- **Bundle Size**: Automated tracking and alerts
- **Error Tracking**: Comprehensive error monitoring
- **User Analytics**: Privacy-focused analytics

### Monitoring Tools

- **Lighthouse CI**: Performance monitoring
- **Sentry**: Error tracking and performance
- **DataDog**: Infrastructure monitoring
- **Google Analytics**: User behavior (privacy-compliant)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Setup

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [docs.datatourisme.fr](https://docs.datatourisme.fr)
- **Issues**: [GitHub Issues](https://github.com/datatourisme/frontend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/datatourisme/frontend/discussions)
- **Email**: [dev@datatourisme.fr](mailto:dev@datatourisme.fr)

## 🎯 Roadmap

### Q1 2024
- [ ] Mobile app development
- [ ] Advanced search filters
- [ ] Booking system v2
- [ ] Performance optimizations

### Q2 2024
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Offline capabilities
- [ ] PWA enhancements

### Q3 2024
- [ ] AI-powered recommendations
- [ ] Social features
- [ ] Advanced personalization
- [ ] Third-party integrations

---

Built with ❤️ by the DataTourisme team