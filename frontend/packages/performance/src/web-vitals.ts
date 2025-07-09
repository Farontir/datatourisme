import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface WebVitalsReport {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  navigationType: string;
  timestamp: number;
}

export interface WebVitalsThresholds {
  CLS: { good: number; poor: number };
  FCP: { good: number; poor: number };
  FID: { good: number; poor: number };
  INP: { good: number; poor: number };
  LCP: { good: number; poor: number };
  TTFB: { good: number; poor: number };
}

// Official Core Web Vitals thresholds (in milliseconds, except CLS which is unitless)
export const WEB_VITALS_THRESHOLDS: WebVitalsThresholds = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 }
};

export type WebVitalsCallback = (report: WebVitalsReport) => void;

let vitalsData: Map<string, WebVitalsReport> = new Map();

/**
 * Get the rating for a metric value
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name as keyof WebVitalsThresholds];
  if (!thresholds) return 'good';
  
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Convert a web-vitals Metric to our WebVitalsReport format
 */
function createReport(metric: Metric): WebVitalsReport {
  return {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    entries: metric.entries as PerformanceEntry[],
    navigationType: metric.navigationType,
    timestamp: Date.now()
  };
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals(callback?: WebVitalsCallback): void {
  if (typeof window === 'undefined') return;

  const handleMetric = (metric: Metric) => {
    const report = createReport(metric);
    vitalsData.set(metric.name, report);
    
    // Call custom callback if provided
    if (callback) {
      callback(report);
    }
    
    // Log in development
    if (window.location.hostname === 'localhost') {
      console.log(`📊 ${metric.name}:`, {
        value: metric.value,
        rating: report.rating,
        delta: metric.delta
      });
    }
    
    // Send to analytics in production
    if (window.location.hostname !== 'localhost') {
      sendToAnalytics(report);
    }
  };

  // Monitor all Core Web Vitals
  onCLS(handleMetric);
  onFCP(handleMetric);
  onFID(handleMetric);
  onINP(handleMetric);
  onLCP(handleMetric);
  onTTFB(handleMetric);
}

/**
 * Get current Web Vitals data
 */
export function getWebVitals(): Map<string, WebVitalsReport> {
  return new Map(vitalsData);
}

/**
 * Get Web Vitals summary
 */
export function getWebVitalsSummary(): {
  overall: 'good' | 'needs-improvement' | 'poor';
  scores: Record<string, WebVitalsReport>;
  passedCount: number;
  totalCount: number;
} {
  const scores: Record<string, WebVitalsReport> = {};
  let goodCount = 0;
  let needsImprovementCount = 0;
  let poorCount = 0;

  vitalsData.forEach((report, name) => {
    scores[name] = report;
    
    switch (report.rating) {
      case 'good':
        goodCount++;
        break;
      case 'needs-improvement':
        needsImprovementCount++;
        break;
      case 'poor':
        poorCount++;
        break;
    }
  });

  const totalCount = vitalsData.size;
  let overall: 'good' | 'needs-improvement' | 'poor' = 'good';
  
  if (poorCount > 0) {
    overall = 'poor';
  } else if (needsImprovementCount > 0) {
    overall = 'needs-improvement';
  }

  return {
    overall,
    scores,
    passedCount: goodCount,
    totalCount
  };
}

/**
 * Send Web Vitals data to analytics service
 */
function sendToAnalytics(report: WebVitalsReport): void {
  // Example implementation - replace with your analytics service
  if (typeof window !== 'undefined' && 'gtag' in window) {
    // Google Analytics 4
    (window as any).gtag('event', report.name, {
      custom_map: { metric_value: 'value' },
      value: Math.round(report.name === 'CLS' ? report.value * 1000 : report.value),
      metric_id: report.id,
      metric_value: report.value,
      metric_delta: report.delta,
      metric_rating: report.rating
    });
  }
  
  // Example: Send to custom analytics endpoint
  if ('sendBeacon' in navigator) {
    const analyticsData = {
      event: 'web_vitals',
      metric_name: report.name,
      metric_value: report.value,
      metric_rating: report.rating,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: report.timestamp
    };
    
    navigator.sendBeacon('/api/analytics', JSON.stringify(analyticsData));
  }
}

/**
 * Create a performance budget checker
 */
export function createPerformanceBudget(customThresholds?: Partial<WebVitalsThresholds>) {
  const thresholds = { ...WEB_VITALS_THRESHOLDS, ...customThresholds };
  
  return {
    check(): {
      passed: boolean;
      failures: Array<{ metric: string; value: number; threshold: number }>;
      warnings: Array<{ metric: string; value: number; threshold: number }>;
    } {
      const failures: Array<{ metric: string; value: number; threshold: number }> = [];
      const warnings: Array<{ metric: string; value: number; threshold: number }> = [];
      
      vitalsData.forEach((report, name) => {
        const threshold = thresholds[name as keyof WebVitalsThresholds];
        if (!threshold) return;
        
        if (report.rating === 'poor') {
          failures.push({
            metric: name,
            value: report.value,
            threshold: threshold.poor
          });
        } else if (report.rating === 'needs-improvement') {
          warnings.push({
            metric: name,
            value: report.value,
            threshold: threshold.good
          });
        }
      });
      
      return {
        passed: failures.length === 0,
        failures,
        warnings
      };
    },
    
    getThresholds() {
      return thresholds;
    },
    
    updateThresholds(newThresholds: Partial<WebVitalsThresholds>) {
      Object.assign(thresholds, newThresholds);
    }
  };
}

/**
 * Enhanced monitoring with custom metrics
 */
export function initEnhancedWebVitals(): void {
  initWebVitals();
  
  // Add custom metrics monitoring
  if (typeof window !== 'undefined') {
    // Monitor resource loading times
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Track slow resources
          if (resourceEntry.duration > 1000) {
            console.warn(`Slow resource detected: ${resourceEntry.name} (${Math.round(resourceEntry.duration)}ms)`);
          }
        }
      });
    });
    
    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('Performance observer not supported');
    }
    
    // Monitor long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 50) {
          console.warn(`Long task detected: ${Math.round(entry.duration)}ms`);
        }
      });
    });
    
    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn('Long task observer not supported');
    }
  }
}

/**
 * React hook for Web Vitals
 */
export function useWebVitals(callback?: WebVitalsCallback) {
  if (typeof window !== 'undefined') {
    // Initialize only once
    if (!vitalsData.size) {
      initWebVitals(callback);
    }
  }
  
  return {
    vitals: getWebVitals(),
    summary: getWebVitalsSummary(),
    refresh: () => {
      vitalsData.clear();
      initWebVitals(callback);
    }
  };
}