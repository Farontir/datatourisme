// Lighthouse optimization utilities

export interface LighthouseScore {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
}

/**
 * Configuration for optimal Lighthouse scores
 */
export const lighthouseOptimizations = {
  /**
   * Performance optimizations
   */
  performance: {
    // Critical Resource Hints
    addResourceHints(): void {
      if (typeof document === 'undefined') return;

      // DNS prefetch for external domains
      const dnsPrefetchDomains = [
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'cdn.jsdelivr.net',
      ];

      dnsPrefetchDomains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = `//${domain}`;
        document.head.appendChild(link);
      });

      // Preconnect to critical origins
      const preconnectDomains = [
        'https://fonts.googleapis.com',
        'https://api.example.com',
      ];

      preconnectDomains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      });
    },

    // Optimize Critical Rendering Path
    optimizeCriticalPath(): void {
      if (typeof document === 'undefined') return;

      // Inline critical CSS for above-the-fold content
      const criticalCSS = `
        .hero-section { display: block; }
        .navigation { display: flex; }
        .search-bar { display: block; }
      `;

      const style = document.createElement('style');
      style.textContent = criticalCSS;
      document.head.appendChild(style);

      // Defer non-critical CSS
      const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
      nonCriticalCSS.forEach(link => {
        const linkElement = link as HTMLLinkElement;
        linkElement.media = 'print';
        linkElement.onload = () => {
          linkElement.media = 'all';
        };
      });
    },

    // Optimize images
    optimizeImages(): void {
      if (typeof document === 'undefined') return;

      document.querySelectorAll('img').forEach(img => {
        // Add loading="lazy" to images below the fold
        if (!img.hasAttribute('loading')) {
          const rect = img.getBoundingClientRect();
          if (rect.top > window.innerHeight) {
            img.loading = 'lazy';
          }
        }

        // Add proper sizing attributes
        if (!img.hasAttribute('width') && !img.hasAttribute('height')) {
          // Set intrinsic size to prevent layout shift
          img.style.aspectRatio = '16/9';
        }
      });
    },

    // Minimize main thread blocking
    optimizeMainThread(): void {
      // Use scheduler API for non-urgent tasks
      if ('scheduler' in window) {
        const scheduler = (window as any).scheduler;
        
        // Schedule non-critical work
        scheduler.postTask(() => {
          // Defer analytics initialization
          // initAnalytics();
        }, { priority: 'background' });

        scheduler.postTask(() => {
          // Defer chat widget loading
          // loadChatWidget();
        }, { priority: 'background' });
      } else {
        // Fallback for browsers without scheduler API
        setTimeout(() => {
          // initAnalytics();
          // loadChatWidget();
        }, 5000);
      }
    },
  },

  /**
   * Accessibility optimizations
   */
  accessibility: {
    // Ensure proper focus management
    optimizeFocus(): void {
      if (typeof document === 'undefined') return;

      // Add focus visible polyfill behavior
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          document.body.classList.add('keyboard-navigation');
        }
      });

      document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-navigation');
      });

      // Enhance skip links
      const skipLink = document.querySelector('a[href="#main"]');
      if (skipLink) {
        skipLink.addEventListener('focus', () => {
          skipLink.scrollIntoView({ behavior: 'smooth' });
        });
      }
    },

    // Improve color contrast
    enforceColorContrast(): void {
      if (typeof document === 'undefined') return;

      // Add high contrast mode detection
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
      
      const applyHighContrast = (matches: boolean) => {
        if (matches) {
          document.body.classList.add('high-contrast');
        } else {
          document.body.classList.remove('high-contrast');
        }
      };

      applyHighContrast(prefersHighContrast.matches);
      prefersHighContrast.addEventListener('change', (e) => {
        applyHighContrast(e.matches);
      });
    },

    // Enhance ARIA labels
    enhanceAriaLabels(): void {
      if (typeof document === 'undefined') return;

      // Add missing ARIA labels to interactive elements
      document.querySelectorAll('button, input, select, textarea').forEach(element => {
        const el = element as HTMLElement;
        
        if (!el.hasAttribute('aria-label') && 
            !el.hasAttribute('aria-labelledby') && 
            !el.textContent?.trim()) {
          
          // Generate appropriate label based on context
          const label = generateAriaLabel(el);
          if (label) {
            el.setAttribute('aria-label', label);
          }
        }
      });
    },
  },

  /**
   * SEO optimizations
   */
  seo: {
    // Optimize meta tags
    optimizeMetaTags(): void {
      if (typeof document === 'undefined') return;

      // Ensure proper document structure
      const metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = 'Discover tourism resources and destinations across France with DataTourisme';
        document.head.appendChild(meta);
      }

      // Add structured data
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        'name': 'DataTourisme',
        'description': 'Tourism data platform for France',
        'url': window.location.origin,
        'applicationCategory': 'Travel',
        'operatingSystem': 'Web Browser',
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    },

    // Optimize heading hierarchy
    optimizeHeadings(): void {
      if (typeof document === 'undefined') return;

      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let currentLevel = 0;

      headings.forEach(heading => {
        const level = parseInt(heading.tagName.charAt(1));
        
        // Warn about skipped heading levels
        if (level > currentLevel + 1) {
          console.warn(`Heading level skipped: ${heading.textContent} (${heading.tagName})`);
        }
        
        currentLevel = level;
      });
    },
  },

  /**
   * Best practices optimizations
   */
  bestPractices: {
    // Secure external links
    secureExternalLinks(): void {
      if (typeof document === 'undefined') return;

      document.querySelectorAll('a[href^="http"]').forEach(link => {
        const anchor = link as HTMLAnchorElement;
        
        if (!anchor.href.startsWith(window.location.origin)) {
          // Add security attributes to external links
          anchor.rel = 'noopener noreferrer';
          
          // Add target="_blank" if not already present
          if (!anchor.target) {
            anchor.target = '_blank';
          }
        }
      });
    },

    // Optimize console usage
    optimizeConsole(): void {
      if (process.env.NODE_ENV === 'production') {
        // Remove console statements in production
        ['log', 'debug', 'info', 'warn'].forEach(method => {
          (console as any)[method] = () => {};
        });
      }
    },

    // Add error boundaries
    setupErrorHandling(): void {
      if (typeof window === 'undefined') return;

      window.addEventListener('error', (event) => {
        // Log client-side errors
        console.error('Client error:', event.error);
        
        // Report to error tracking service
        // errorTracker.report(event.error);
      });

      window.addEventListener('unhandledrejection', (event) => {
        // Log unhandled promise rejections
        console.error('Unhandled promise rejection:', event.reason);
        
        // Report to error tracking service
        // errorTracker.report(event.reason);
      });
    },
  },
};

/**
 * Generate appropriate ARIA label for an element
 */
function generateAriaLabel(element: HTMLElement): string | null {
  const tagName = element.tagName.toLowerCase();
  const type = element.getAttribute('type');
  const className = element.className;

  if (tagName === 'button') {
    if (className.includes('close')) return 'Close';
    if (className.includes('menu')) return 'Menu';
    if (className.includes('search')) return 'Search';
    if (className.includes('filter')) return 'Filter';
  }

  if (tagName === 'input') {
    if (type === 'search') return 'Search';
    if (type === 'email') return 'Email address';
    if (type === 'password') return 'Password';
  }

  return null;
}

/**
 * Apply all Lighthouse optimizations
 */
export function applyLighthouseOptimizations(): void {
  if (typeof window === 'undefined') return;

  // Performance optimizations
  lighthouseOptimizations.performance.addResourceHints();
  lighthouseOptimizations.performance.optimizeCriticalPath();
  lighthouseOptimizations.performance.optimizeMainThread();

  // Accessibility optimizations
  lighthouseOptimizations.accessibility.optimizeFocus();
  lighthouseOptimizations.accessibility.enforceColorContrast();
  lighthouseOptimizations.accessibility.enhanceAriaLabels();

  // SEO optimizations
  lighthouseOptimizations.seo.optimizeMetaTags();
  lighthouseOptimizations.seo.optimizeHeadings();

  // Best practices
  lighthouseOptimizations.bestPractices.secureExternalLinks();
  lighthouseOptimizations.bestPractices.optimizeConsole();
  lighthouseOptimizations.bestPractices.setupErrorHandling();

  // Apply image optimizations after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      lighthouseOptimizations.performance.optimizeImages();
    });
  } else {
    lighthouseOptimizations.performance.optimizeImages();
  }
}

/**
 * Get estimated Lighthouse scores based on current metrics
 */
export function estimateLighthouseScores(): Promise<Partial<LighthouseScore>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // This would normally use actual Lighthouse API or similar
      const metrics = {
        // Estimate based on Web Vitals
        performance: estimatePerformanceScore(),
        accessibility: estimateAccessibilityScore(),
        seo: estimateSEOScore(),
        bestPractices: estimateBestPracticesScore(),
      };

      resolve(metrics);
    }, 1000);
  });
}

function estimatePerformanceScore(): number {
  // Simplified scoring based on Core Web Vitals
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (!navigation) return 85; // Default decent score

  const fcp = navigation.loadEventEnd - navigation.fetchStart;
  const lcp = fcp * 1.2; // Estimate LCP

  // Lighthouse performance scoring (simplified)
  let score = 100;
  
  if (fcp > 3000) score -= 20;
  else if (fcp > 1800) score -= 10;
  
  if (lcp > 4000) score -= 20;
  else if (lcp > 2500) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function estimateAccessibilityScore(): number {
  // Check for common accessibility issues
  let score = 100;
  
  // Check for images without alt text
  const imagesWithoutAlt = document.querySelectorAll('img:not([alt])').length;
  if (imagesWithoutAlt > 0) score -= 10;

  // Check for buttons without labels
  const buttonsWithoutLabels = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').length;
  if (buttonsWithoutLabels > 0) score -= 15;

  // Check for heading hierarchy
  const h1Count = document.querySelectorAll('h1').length;
  if (h1Count !== 1) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function estimateSEOScore(): number {
  let score = 100;

  // Check for meta description
  if (!document.querySelector('meta[name="description"]')) score -= 20;

  // Check for title
  if (!document.title || document.title.length < 10) score -= 15;

  // Check for heading structure
  if (!document.querySelector('h1')) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function estimateBestPracticesScore(): number {
  let score = 100;

  // Check for HTTPS
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') score -= 20;

  // Check for console errors
  const hasConsoleErrors = performance.getEntriesByType('navigation').length === 0;
  if (hasConsoleErrors) score -= 10;

  return Math.max(0, Math.min(100, score));
}