// Performance monitoring utilities

export interface PerformanceMetrics {
  FCP: number | null; // First Contentful Paint
  LCP: number | null; // Largest Contentful Paint
  FID: number | null; // First Input Delay
  CLS: number | null; // Cumulative Layout Shift
  TTFB: number | null; // Time to First Byte
}

export interface CustomMetrics {
  searchTime: number | null;
  mapLoadTime: number | null;
  imageLoadTime: number | null;
}

let performanceMetrics: PerformanceMetrics = {
  FCP: null,
  LCP: null,
  FID: null,
  CLS: null,
  TTFB: null,
};

let customMetrics: CustomMetrics = {
  searchTime: null,
  mapLoadTime: null,
  imageLoadTime: null,
};

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Measure Core Web Vitals
  measureWebVitals();

  // Measure custom metrics
  measureCustomMetrics();

  // Report metrics to analytics (in production)
  if (process.env.NODE_ENV === 'production') {
    window.addEventListener('beforeunload', reportMetrics);
  }

  // Log metrics in development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      console.group('🚀 Performance Metrics');
      console.table(performanceMetrics);
      console.table(customMetrics);
      console.groupEnd();
    }, 5000);
  }
}

/**
 * Measure Core Web Vitals
 */
function measureWebVitals(): void {
  // First Contentful Paint (FCP)
  measureFCP();

  // Largest Contentful Paint (LCP)
  measureLCP();

  // First Input Delay (FID)
  measureFID();

  // Cumulative Layout Shift (CLS)
  measureCLS();

  // Time to First Byte (TTFB)
  measureTTFB();
}

function measureFCP(): void {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        performanceMetrics.FCP = fcpEntry.startTime;
        observer.disconnect();
      }
    });
    observer.observe({ entryTypes: ['paint'] });
  } catch (error) {
    console.warn('FCP measurement not supported:', error);
  }
}

function measureLCP(): void {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      performanceMetrics.LCP = lastEntry.startTime;
    });
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (error) {
    console.warn('LCP measurement not supported:', error);
  }
}

function measureFID(): void {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0];
      performanceMetrics.FID = firstEntry.processingStart - firstEntry.startTime;
      observer.disconnect();
    });
    observer.observe({ entryTypes: ['first-input'] });
  } catch (error) {
    console.warn('FID measurement not supported:', error);
  }
}

function measureCLS(): void {
  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          performanceMetrics.CLS = clsValue;
        }
      }
    });
    observer.observe({ entryTypes: ['layout-shift'] });
  } catch (error) {
    console.warn('CLS measurement not supported:', error);
  }
}

function measureTTFB(): void {
  try {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationTiming) {
      performanceMetrics.TTFB = navigationTiming.responseStart - navigationTiming.fetchStart;
    }
  } catch (error) {
    console.warn('TTFB measurement not supported:', error);
  }
}

/**
 * Measure custom application metrics
 */
function measureCustomMetrics(): void {
  // Measure search response time
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = args[0] as string;
    if (url.includes('/api/search') || url.includes('search')) {
      const startTime = performance.now();
      const response = await originalFetch(...args);
      const endTime = performance.now();
      customMetrics.searchTime = endTime - startTime;
      return response;
    }
    return originalFetch(...args);
  };

  // Measure image load times
  const imageObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const imageEntries = entries.filter(entry => 
      entry.initiatorType === 'img' || entry.name.includes('.jpg') || entry.name.includes('.png')
    );
    
    if (imageEntries.length > 0) {
      const avgImageLoadTime = imageEntries.reduce((sum, entry) => 
        sum + entry.duration, 0) / imageEntries.length;
      customMetrics.imageLoadTime = avgImageLoadTime;
    }
  });
  
  try {
    imageObserver.observe({ entryTypes: ['resource'] });
  } catch (error) {
    console.warn('Image load time measurement not supported:', error);
  }
}

/**
 * Report metrics to analytics service
 */
function reportMetrics(): void {
  // In a real application, you would send this to your analytics service
  const metricsData = {
    ...performanceMetrics,
    ...customMetrics,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  };

  // Example: Send to analytics
  // analytics.track('Performance Metrics', metricsData);
  
  console.log('Performance metrics collected:', metricsData);
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics & CustomMetrics {
  return { ...performanceMetrics, ...customMetrics };
}

/**
 * Mark a custom timing event
 */
export function markCustomTiming(name: string): void {
  try {
    performance.mark(name);
  } catch (error) {
    console.warn(`Failed to mark timing "${name}":`, error);
  }
}

/**
 * Measure duration between two marks
 */
export function measureDuration(startMark: string, endMark: string, measureName: string): number | null {
  try {
    performance.measure(measureName, startMark, endMark);
    const measure = performance.getEntriesByName(measureName)[0];
    return measure ? measure.duration : null;
  } catch (error) {
    console.warn(`Failed to measure duration "${measureName}":`, error);
    return null;
  }
}

/**
 * Optimize images with lazy loading and size detection
 */
export function optimizeImageLoading(): void {
  if (typeof window === 'undefined') return;

  // Add intersection observer for lazy loading
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

  // Observe all images with data-src attribute
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources(): void {
  if (typeof window === 'undefined') return;

  // Preload critical CSS
  const criticalCSSLink = document.createElement('link');
  criticalCSSLink.rel = 'preload';
  criticalCSSLink.as = 'style';
  criticalCSSLink.href = '/_next/static/css/app.css';
  document.head.appendChild(criticalCSSLink);

  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.as = 'font';
  fontLink.type = 'font/woff2';
  fontLink.href = '/fonts/inter-var.woff2';
  fontLink.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink);
}

/**
 * Optimize third-party scripts
 */
export function optimizeThirdPartyScripts(): void {
  if (typeof window === 'undefined') return;

  // Delay non-critical scripts until page is loaded
  window.addEventListener('load', () => {
    setTimeout(() => {
      // Load analytics after page load
      // loadAnalytics();
      
      // Load other non-critical scripts
      // loadChatWidget();
    }, 1000);
  });
}