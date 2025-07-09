// Web Vitals exports
export {
  initWebVitals,
  getWebVitals,
  getWebVitalsSummary,
  createPerformanceBudget,
  initEnhancedWebVitals,
  useWebVitals,
  WEB_VITALS_THRESHOLDS
} from './web-vitals';

export type {
  WebVitalsReport,
  WebVitalsThresholds,
  WebVitalsCallback
} from './web-vitals';

// Lighthouse exports
export {
  runLighthouseAudit,
  runMultipleAudits,
  checkPerformanceBudgets,
  generatePerformanceReport,
  compareLighthouseResults,
  DEFAULT_PERFORMANCE_BUDGETS
} from './lighthouse';

export type {
  LighthouseConfig,
  LighthouseResults,
  PerformanceBudgets
} from './lighthouse';

// Monitoring exports
export {
  PerformanceMonitor,
  performanceMonitor,
  initPerformanceMonitoring,
  DEFAULT_MONITORING_CONFIG
} from './monitoring';

export type {
  PerformanceAlert,
  PerformanceMonitoringConfig
} from './monitoring';