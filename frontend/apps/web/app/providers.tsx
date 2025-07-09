'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { AccessibilityProvider } from '../src/components/common/AccessibilityProvider';
import { IntlProvider } from '@datatourisme/i18n';
import { initPerformanceMonitoring } from '@datatourisme/performance';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error) => {
              if (error instanceof Error && error.message.includes('404')) {
                return false;
              }
              return failureCount < 3;
            },
          },
        },
      })
  );

  useEffect(() => {
    // Initialize enhanced performance monitoring
    initPerformanceMonitoring({
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
        enabled: process.env.NODE_ENV === 'development',
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
      alerts: {
        webhook: process.env.PERFORMANCE_WEBHOOK_URL
      }
    });
  }, []);

  return (
    <IntlProvider>
      <AccessibilityProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </AccessibilityProvider>
    </IntlProvider>
  );
}