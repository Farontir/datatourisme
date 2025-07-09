import { WebVitalsReport, initWebVitals, getWebVitalsSummary } from './web-vitals';
import { LighthouseResults } from './lighthouse';

export interface PerformanceAlert {
  id: string;
  type: 'regression' | 'threshold' | 'budget';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  url?: string;
  suggestions: string[];
}

export interface PerformanceMonitoringConfig {
  webVitals: {
    enabled: boolean;
    thresholds: {
      [key: string]: { warning: number; error: number };
    };
  };
  lighthouse: {
    enabled: boolean;
    scheduledAudits: {
      frequency: 'hourly' | 'daily' | 'weekly';
      urls: string[];
    };
    scoreThresholds: {
      performance: number;
      accessibility: number;
      bestPractices: number;
      seo: number;
    };
  };
  alerts: {
    webhook?: string;
    email?: string[];
    slack?: {
      webhook: string;
      channel: string;
    };
  };
  retention: {
    days: number;
  };
}

export const DEFAULT_MONITORING_CONFIG: PerformanceMonitoringConfig = {
  webVitals: {
    enabled: true,
    thresholds: {
      LCP: { warning: 2500, error: 4000 },
      FID: { warning: 100, error: 300 },
      CLS: { warning: 0.1, error: 0.25 },
      FCP: { warning: 1800, error: 3000 },
      TTFB: { warning: 800, error: 1800 },
      INP: { warning: 200, error: 500 }
    }
  },
  lighthouse: {
    enabled: true,
    scheduledAudits: {
      frequency: 'daily',
      urls: ['/']
    },
    scoreThresholds: {
      performance: 0.9,
      accessibility: 0.95,
      bestPractices: 0.9,
      seo: 0.9
    }
  },
  alerts: {},
  retention: {
    days: 30
  }
};

export class PerformanceMonitor {
  private config: PerformanceMonitoringConfig;
  private alerts: PerformanceAlert[] = [];
  private metrics: Map<string, any> = new Map();
  private isInitialized = false;

  constructor(config: Partial<PerformanceMonitoringConfig> = {}) {
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };
  }

  /**
   * Initialize performance monitoring
   */
  init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Initialize Web Vitals monitoring
    if (this.config.webVitals.enabled) {
      initWebVitals((report) => this.handleWebVitalsReport(report));
    }

    // Set up periodic checks
    this.setupPeriodicChecks();

    this.isInitialized = true;
  }

  /**
   * Handle Web Vitals reports
   */
  private handleWebVitalsReport(report: WebVitalsReport): void {
    this.metrics.set(`webvitals_${report.name}`, report);

    // Check thresholds
    const thresholds = this.config.webVitals.thresholds[report.name];
    if (thresholds) {
      if (report.value > thresholds.error) {
        this.createAlert({
          type: 'threshold',
          severity: 'high',
          metric: report.name,
          value: report.value,
          threshold: thresholds.error,
          message: `${report.name} exceeded error threshold: ${report.value} > ${thresholds.error}`,
          suggestions: this.getWebVitalsSuggestions(report.name, report.value)
        });
      } else if (report.value > thresholds.warning) {
        this.createAlert({
          type: 'threshold',
          severity: 'medium',
          metric: report.name,
          value: report.value,
          threshold: thresholds.warning,
          message: `${report.name} exceeded warning threshold: ${report.value} > ${thresholds.warning}`,
          suggestions: this.getWebVitalsSuggestions(report.name, report.value)
        });
      }
    }
  }

  /**
   * Process Lighthouse results
   */
  processLighthouseResults(results: LighthouseResults): void {
    this.metrics.set(`lighthouse_${results.url}_${results.timestamp}`, results);

    // Check category score thresholds
    Object.entries(this.config.lighthouse.scoreThresholds).forEach(([category, threshold]) => {
      const score = (results.categories as any)[category]?.score;
      if (score && score < threshold) {
        this.createAlert({
          type: 'threshold',
          severity: score < threshold * 0.8 ? 'high' : 'medium',
          metric: `lighthouse_${category}`,
          value: score,
          threshold,
          message: `Lighthouse ${category} score below threshold: ${(score * 100).toFixed(1)}% < ${(threshold * 100).toFixed(1)}%`,
          url: results.url,
          suggestions: this.getLighthouseSuggestions(category, results)
        });
      }
    });

    // Check for critical performance issues
    this.checkCriticalIssues(results);
  }

  /**
   * Create a performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...alertData
    };

    this.alerts.push(alert);

    // Send notifications
    this.sendAlert(alert);

    // Clean up old alerts
    this.cleanupAlerts();
  }

  /**
   * Send alert notifications
   */
  private async sendAlert(alert: PerformanceAlert): Promise<void> {
    console.warn('🚨 Performance Alert:', alert);

    // Webhook notification
    if (this.config.alerts.webhook) {
      try {
        await fetch(this.config.alerts.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      } catch (error) {
        console.error('Failed to send webhook alert:', error);
      }
    }

    // Slack notification
    if (this.config.alerts.slack) {
      try {
        const slackMessage = {
          channel: this.config.alerts.slack.channel,
          text: `🚨 Performance Alert: ${alert.message}`,
          attachments: [{
            color: this.getSlackColor(alert.severity),
            fields: [
              { title: 'Metric', value: alert.metric, short: true },
              { title: 'Value', value: alert.value.toString(), short: true },
              { title: 'Threshold', value: alert.threshold.toString(), short: true },
              { title: 'URL', value: alert.url || 'N/A', short: true }
            ]
          }]
        };

        await fetch(this.config.alerts.slack.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackMessage)
        });
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }

    // Browser notification (for development)
    if (typeof window !== 'undefined' && 'Notification' in window && window.location.hostname === 'localhost') {
      if (Notification.permission === 'granted') {
        new Notification(`Performance Alert: ${alert.metric}`, {
          body: alert.message,
          icon: '/favicon.ico'
        });
      }
    }
  }

  /**
   * Get Slack color based on severity
   */
  private getSlackColor(severity: PerformanceAlert['severity']): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return '#ffaa00';
      case 'low': return 'good';
      default: return '#cccccc';
    }
  }

  /**
   * Setup periodic performance checks
   */
  private setupPeriodicChecks(): void {
    // Check Web Vitals summary every 30 seconds
    setInterval(() => {
      const summary = getWebVitalsSummary();
      if (summary.overall === 'poor') {
        this.createAlert({
          type: 'threshold',
          severity: 'medium',
          metric: 'web_vitals_overall',
          value: summary.passedCount / summary.totalCount,
          threshold: 0.8,
          message: `Overall Web Vitals performance is poor: ${summary.passedCount}/${summary.totalCount} metrics passing`,
          suggestions: ['Review and optimize Core Web Vitals', 'Check for performance regressions']
        });
      }
    }, 30000);

    // Cleanup old data every hour
    setInterval(() => {
      this.cleanupMetrics();
    }, 3600000);
  }

  /**
   * Check for critical performance issues in Lighthouse results
   */
  private checkCriticalIssues(results: LighthouseResults): void {
    // Check for critical Core Web Vitals
    if (results.metrics.largestContentfulPaint && results.metrics.largestContentfulPaint > 4000) {
      this.createAlert({
        type: 'threshold',
        severity: 'critical',
        metric: 'lcp_critical',
        value: results.metrics.largestContentfulPaint,
        threshold: 4000,
        message: `Critical LCP detected: ${Math.round(results.metrics.largestContentfulPaint)}ms`,
        url: results.url,
        suggestions: [
          'Optimize largest contentful element',
          'Reduce server response times',
          'Optimize critical resource loading'
        ]
      });
    }

    if (results.metrics.cumulativeLayoutShift && results.metrics.cumulativeLayoutShift > 0.25) {
      this.createAlert({
        type: 'threshold',
        severity: 'critical',
        metric: 'cls_critical',
        value: results.metrics.cumulativeLayoutShift,
        threshold: 0.25,
        message: `Critical CLS detected: ${results.metrics.cumulativeLayoutShift.toFixed(3)}`,
        url: results.url,
        suggestions: [
          'Set explicit dimensions for images and embeds',
          'Avoid inserting content above existing content',
          'Preload fonts to avoid layout shifts'
        ]
      });
    }

    // Check for security issues
    const securityAudits = ['is-on-https', 'uses-http2', 'no-vulnerable-libraries'];
    securityAudits.forEach(auditId => {
      const audit = results.audits[auditId];
      if (audit && audit.score !== null && audit.score < 1) {
        this.createAlert({
          type: 'threshold',
          severity: 'high',
          metric: `security_${auditId}`,
          value: audit.score,
          threshold: 1,
          message: `Security issue detected: ${audit.title}`,
          url: results.url,
          suggestions: [audit.description]
        });
      }
    });
  }

  /**
   * Get suggestions for Web Vitals improvements
   */
  private getWebVitalsSuggestions(metric: string, value: number): string[] {
    const suggestions: Record<string, string[]> = {
      LCP: [
        'Optimize server response times',
        'Use a Content Delivery Network (CDN)',
        'Optimize and compress images',
        'Preload critical resources',
        'Remove unnecessary JavaScript'
      ],
      FID: [
        'Reduce JavaScript execution time',
        'Split long tasks',
        'Use web workers for heavy computations',
        'Minimize main thread work',
        'Remove unused JavaScript'
      ],
      CLS: [
        'Set size attributes for images and videos',
        'Reserve space for ad slots',
        'Avoid inserting content above existing content',
        'Use CSS aspect-ratio',
        'Preload fonts'
      ],
      FCP: [
        'Optimize server response times',
        'Eliminate render-blocking resources',
        'Minify CSS and JavaScript',
        'Use efficient cache policies',
        'Optimize web fonts'
      ],
      TTFB: [
        'Optimize server configuration',
        'Use a CDN',
        'Optimize database queries',
        'Implement caching strategies',
        'Minimize redirects'
      ],
      INP: [
        'Optimize event handlers',
        'Reduce JavaScript execution time',
        'Use requestIdleCallback for non-urgent work',
        'Debounce expensive operations',
        'Optimize DOM manipulations'
      ]
    };

    return suggestions[metric] || ['Review performance optimization guides'];
  }

  /**
   * Get suggestions for Lighthouse improvements
   */
  private getLighthouseSuggestions(category: string, results: LighthouseResults): string[] {
    const suggestions: Record<string, string[]> = {
      performance: [
        'Optimize images and use modern formats',
        'Minimize and compress JavaScript and CSS',
        'Use efficient caching strategies',
        'Eliminate render-blocking resources',
        'Reduce server response times'
      ],
      accessibility: [
        'Ensure sufficient color contrast',
        'Add alt text to images',
        'Use semantic HTML elements',
        'Ensure keyboard navigation works',
        'Add ARIA labels where needed'
      ],
      'best-practices': [
        'Use HTTPS for all resources',
        'Avoid deprecated APIs',
        'Fix JavaScript errors',
        'Use efficient image formats',
        'Implement proper error handling'
      ],
      seo: [
        'Add meta descriptions to pages',
        'Use descriptive page titles',
        'Implement structured data',
        'Ensure text is readable',
        'Use descriptive link text'
      ]
    };

    return suggestions[category] || ['Review Lighthouse recommendations'];
  }

  /**
   * Clean up old alerts
   */
  private cleanupAlerts(): void {
    const cutoffTime = Date.now() - (this.config.retention.days * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffTime);
  }

  /**
   * Clean up old metrics
   */
  private cleanupMetrics(): void {
    const cutoffTime = Date.now() - (this.config.retention.days * 24 * 60 * 60 * 1000);
    
    this.metrics.forEach((value, key) => {
      if (value.timestamp && value.timestamp < cutoffTime) {
        this.metrics.delete(key);
      }
    });
  }

  /**
   * Get current alerts
   */
  getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return [...this.alerts];
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    alerts: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    webVitals: ReturnType<typeof getWebVitalsSummary>;
    metrics: { [key: string]: any };
  } {
    const alertCounts = this.alerts.reduce((counts, alert) => {
      counts[alert.severity]++;
      counts.total++;
      return counts;
    }, { total: 0, critical: 0, high: 0, medium: 0, low: 0 });

    return {
      alerts: alertCounts,
      webVitals: getWebVitalsSummary(),
      metrics: Object.fromEntries(this.metrics)
    };
  }

  /**
   * Export performance data
   */
  exportData(): {
    alerts: PerformanceAlert[];
    metrics: { [key: string]: any };
    config: PerformanceMonitoringConfig;
    exportTimestamp: number;
  } {
    return {
      alerts: this.alerts,
      metrics: Object.fromEntries(this.metrics),
      config: this.config,
      exportTimestamp: Date.now()
    };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<PerformanceMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Initialize global performance monitoring
 */
export function initPerformanceMonitoring(config?: Partial<PerformanceMonitoringConfig>): void {
  if (config) {
    performanceMonitor.updateConfig(config);
  }
  performanceMonitor.init();
}