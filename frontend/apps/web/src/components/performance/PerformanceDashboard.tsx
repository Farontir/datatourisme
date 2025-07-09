'use client';

import React, { useState, useEffect } from 'react';
import { useWebVitals, performanceMonitor } from '@datatourisme/performance';
import type { WebVitalsReport, PerformanceAlert } from '@datatourisme/performance';

interface PerformanceMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'good' | 'warning' | 'error';
  unit: string;
  description: string;
}

export function PerformanceDashboard() {
  const { vitals, summary } = useWebVitals();
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or when explicitly enabled
    const shouldShow = 
      process.env.NODE_ENV === 'development' || 
      localStorage.getItem('show-performance-dashboard') === 'true';
    setIsVisible(shouldShow);

    // Get current alerts
    const currentAlerts = performanceMonitor.getAlerts();
    setAlerts(currentAlerts);

    // Update alerts periodically
    const interval = setInterval(() => {
      const newAlerts = performanceMonitor.getAlerts();
      setAlerts(newAlerts);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const metrics: PerformanceMetric[] = Array.from(vitals.entries()).map(([name, report]) => ({
    name,
    value: report.value,
    threshold: getThreshold(name),
    status: report.rating === 'good' ? 'good' : report.rating === 'needs-improvement' ? 'warning' : 'error',
    unit: getUnit(name),
    description: getDescription(name)
  }));

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Performance Monitor
          </h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Overall Status */}
        <div className="mb-4">
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            summary.overall === 'good' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : summary.overall === 'needs-improvement'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {summary.overall === 'good' && '✅'}
            {summary.overall === 'needs-improvement' && '⚠️'}
            {summary.overall === 'poor' && '❌'}
            {summary.passedCount}/{summary.totalCount} metrics passing
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-2 mb-4">
          {metrics.map((metric) => (
            <div key={metric.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${
                  metric.status === 'good' ? 'bg-green-500' :
                  metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {metric.name}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {formatValue(metric.value, metric.unit)}
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Recent Alerts ({alerts.length})
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2 rounded text-xs ${
                    alert.severity === 'critical' || alert.severity === 'high'
                      ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                      : 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
                  }`}
                >
                  <div className="font-medium">{alert.metric}</div>
                  <div className="opacity-75">{alert.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex space-x-2">
          <button
            onClick={() => {
              const summary = performanceMonitor.getSummary();
              console.group('📊 Performance Summary');
              console.log('Web Vitals:', summary.webVitals);
              console.log('Alerts:', summary.alerts);
              console.log('Metrics:', summary.metrics);
              console.groupEnd();
            }}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
          >
            Log Details
          </button>
          <button
            onClick={() => {
              const data = performanceMonitor.exportData();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `performance-data-${new Date().toISOString()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

function getThreshold(metricName: string): number {
  const thresholds: Record<string, number> = {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    FCP: 1800,
    TTFB: 800,
    INP: 200
  };
  return thresholds[metricName] || 0;
}

function getUnit(metricName: string): string {
  if (metricName === 'CLS') return '';
  return 'ms';
}

function getDescription(metricName: string): string {
  const descriptions: Record<string, string> = {
    LCP: 'Largest Contentful Paint - Time when the largest content element becomes visible',
    FID: 'First Input Delay - Time from first user interaction to browser response',
    CLS: 'Cumulative Layout Shift - Visual stability of the page',
    FCP: 'First Contentful Paint - Time when first content appears',
    TTFB: 'Time to First Byte - Time from navigation to first response byte',
    INP: 'Interaction to Next Paint - Responsiveness to user interactions'
  };
  return descriptions[metricName] || '';
}

function formatValue(value: number, unit: string): string {
  if (unit === '') {
    return value.toFixed(3);
  }
  return `${Math.round(value)}${unit}`;
}

export function PerformanceDashboardToggle() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const enabled = localStorage.getItem('show-performance-dashboard') === 'true';
    setIsEnabled(enabled);
  }, []);

  const toggleDashboard = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('show-performance-dashboard', newState.toString());
    
    if (newState) {
      window.location.reload(); // Reload to initialize monitoring
    }
  };

  // Only show toggle in development
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <button
      onClick={toggleDashboard}
      className="fixed bottom-4 left-4 z-50 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg"
      title="Toggle Performance Dashboard"
    >
      📊 {isEnabled ? 'Hide' : 'Show'} Performance
    </button>
  );
}