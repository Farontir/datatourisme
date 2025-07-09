'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@datatourisme/ui';
import { BundleAnalyzer, BundleStats, BundleAnalysis } from '../../lib/performance/bundle-analyzer';

interface BundlePerformanceProps {
  className?: string;
}

interface BundleInfo {
  size: number;
  gzippedSize: number;
  chunks: number;
  dependencies: number;
  loadTime: number;
  cacheHitRate: number;
}

export function BundlePerformance({ className }: BundlePerformanceProps) {
  const [bundleInfo, setBundleInfo] = useState<BundleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Simulate bundle analysis data
    const mockBundleInfo: BundleInfo = {
      size: 850 * 1024, // 850kb
      gzippedSize: 280 * 1024, // 280kb
      chunks: 12,
      dependencies: 156,
      loadTime: 1.2, // seconds
      cacheHitRate: 0.85, // 85%
    };

    // Simulate loading delay
    setTimeout(() => {
      setBundleInfo(mockBundleInfo);
      setLoading(false);
    }, 1000);
  }, []);

  const formatSize = (bytes: number): string => {
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)}kb`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)}mb`;
  };

  const getPerformanceStatus = (size: number) => {
    if (size > 1024 * 1024) return { status: 'poor', color: 'text-red-500', bg: 'bg-red-100' };
    if (size > 512 * 1024) return { status: 'fair', color: 'text-yellow-500', bg: 'bg-yellow-100' };
    return { status: 'good', color: 'text-green-500', bg: 'bg-green-100' };
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Bundle Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bundleInfo) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Bundle Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Unable to load bundle performance data</p>
        </CardContent>
      </Card>
    );
  }

  const performanceStatus = getPerformanceStatus(bundleInfo.size);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Bundle Performance
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overview */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bundle Size</p>
              <p className="text-2xl font-semibold">{formatSize(bundleInfo.size)}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${performanceStatus.bg} ${performanceStatus.color}`}>
              {performanceStatus.status.toUpperCase()}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Gzipped</span>
                <span className="text-sm font-medium">{formatSize(bundleInfo.gzippedSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Load Time</span>
                <span className="text-sm font-medium">{bundleInfo.loadTime.toFixed(1)}s</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Chunks</span>
                <span className="text-sm font-medium">{bundleInfo.chunks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cache Hit</span>
                <span className="text-sm font-medium">{(bundleInfo.cacheHitRate * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Compression Ratio */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Compression Ratio</span>
              <span className="font-medium">
                {((1 - bundleInfo.gzippedSize / bundleInfo.size) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(bundleInfo.gzippedSize / bundleInfo.size) * 100}%` }}
              />
            </div>
          </div>

          {expanded && (
            <>
              {/* Detailed Breakdown */}
              <div className="mt-6 space-y-4">
                <h4 className="font-medium">Bundle Breakdown</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Main Bundle</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatSize(bundleInfo.size * 0.4)}</div>
                      <div className="text-xs text-gray-500">40%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Vendor Libraries</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatSize(bundleInfo.size * 0.35)}</div>
                      <div className="text-xs text-gray-500">35%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Async Chunks</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatSize(bundleInfo.size * 0.25)}</div>
                      <div className="text-xs text-gray-500">25%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Recommendations */}
              <div className="mt-6 space-y-3">
                <h4 className="font-medium">Recommendations</h4>
                
                <div className="space-y-2">
                  {bundleInfo.size > 512 * 1024 && (
                    <div className="flex items-start space-x-2">
                      <span className="text-yellow-500 text-sm">⚠️</span>
                      <p className="text-sm text-gray-600">
                        Consider implementing code splitting for large components to reduce initial bundle size.
                      </p>
                    </div>
                  )}
                  
                  {bundleInfo.chunks > 20 && (
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500 text-sm">💡</span>
                      <p className="text-sm text-gray-600">
                        High number of chunks detected. Consider optimizing chunk strategy.
                      </p>
                    </div>
                  )}
                  
                  {bundleInfo.cacheHitRate < 0.8 && (
                    <div className="flex items-start space-x-2">
                      <span className="text-orange-500 text-sm">📈</span>
                      <p className="text-sm text-gray-600">
                        Cache hit rate is below 80%. Consider implementing better caching strategies.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bundle Actions */}
              <div className="mt-6 flex space-x-2">
                <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                  Analyze Bundle
                </button>
                <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                  View Report
                </button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default BundlePerformance;