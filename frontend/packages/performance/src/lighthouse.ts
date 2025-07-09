import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

export interface LighthouseConfig {
  url: string;
  options?: {
    port?: number;
    chromeFlags?: string[];
    logLevel?: 'silent' | 'error' | 'info' | 'verbose';
    output?: 'json' | 'html' | 'csv';
    onlyCategories?: string[];
    skipAudits?: string[];
    budgets?: Array<{
      resourceType: string;
      budget: number;
    }>;
  };
}

export interface LighthouseResults {
  url: string;
  timestamp: number;
  categories: {
    performance?: { score: number; title: string };
    accessibility?: { score: number; title: string };
    'best-practices'?: { score: number; title: string };
    seo?: { score: number; title: string };
    pwa?: { score: number; title: string };
  };
  audits: Record<string, {
    id: string;
    title: string;
    description: string;
    score: number | null;
    scoreDisplayMode: string;
    numericValue?: number;
    displayValue?: string;
    details?: any;
  }>;
  metrics: {
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    cumulativeLayoutShift?: number;
    totalBlockingTime?: number;
    speedIndex?: number;
    timeToInteractive?: number;
  };
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    numericValue: number;
    displayValue: string;
  }>;
  diagnostics: Array<{
    id: string;
    title: string;
    description: string;
    displayValue: string;
  }>;
}

export interface PerformanceBudgets {
  resources: Array<{
    resourceType: 'document' | 'font' | 'image' | 'media' | 'script' | 'stylesheet' | 'other' | 'total';
    budget: number; // in KB
  }>;
  timings: Array<{
    metric: 'first-contentful-paint' | 'largest-contentful-paint' | 'speed-index' | 'interactive';
    budget: number; // in milliseconds
  }>;
}

/**
 * Default performance budgets based on industry best practices
 */
export const DEFAULT_PERFORMANCE_BUDGETS: PerformanceBudgets = {
  resources: [
    { resourceType: 'total', budget: 1600 },
    { resourceType: 'script', budget: 350 },
    { resourceType: 'stylesheet', budget: 150 },
    { resourceType: 'image', budget: 900 },
    { resourceType: 'font', budget: 100 },
    { resourceType: 'media', budget: 200 }
  ],
  timings: [
    { metric: 'first-contentful-paint', budget: 1800 },
    { metric: 'largest-contentful-paint', budget: 2500 },
    { metric: 'speed-index', budget: 3000 },
    { metric: 'interactive', budget: 5000 }
  ]
};

/**
 * Run Lighthouse audit programmatically
 */
export async function runLighthouseAudit(config: LighthouseConfig): Promise<LighthouseResults> {
  const chrome = await launch({
    chromeFlags: config.options?.chromeFlags || ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
  });

  const options = {
    logLevel: config.options?.logLevel || 'info',
    output: config.options?.output || 'json',
    onlyCategories: config.options?.onlyCategories || ['performance', 'accessibility', 'best-practices', 'seo'],
    skipAudits: config.options?.skipAudits || [],
    port: chrome.port,
    ...config.options
  };

  try {
    const runnerResult = await lighthouse(config.url, options);
    
    if (!runnerResult) {
      throw new Error('Lighthouse failed to return results');
    }

    const { lhr } = runnerResult;
    
    // Extract key metrics
    const metrics: LighthouseResults['metrics'] = {};
    const audits = lhr.audits;
    
    if (audits['first-contentful-paint']) {
      metrics.firstContentfulPaint = audits['first-contentful-paint'].numericValue;
    }
    if (audits['largest-contentful-paint']) {
      metrics.largestContentfulPaint = audits['largest-contentful-paint'].numericValue;
    }
    if (audits['cumulative-layout-shift']) {
      metrics.cumulativeLayoutShift = audits['cumulative-layout-shift'].numericValue;
    }
    if (audits['total-blocking-time']) {
      metrics.totalBlockingTime = audits['total-blocking-time'].numericValue;
    }
    if (audits['speed-index']) {
      metrics.speedIndex = audits['speed-index'].numericValue;
    }
    if (audits['interactive']) {
      metrics.timeToInteractive = audits['interactive'].numericValue;
    }

    // Extract opportunities
    const opportunities = Object.entries(audits)
      .filter(([_, audit]) => audit.details?.type === 'opportunity')
      .map(([id, audit]) => ({
        id,
        title: audit.title,
        description: audit.description,
        numericValue: audit.numericValue || 0,
        displayValue: audit.displayValue || ''
      }));

    // Extract diagnostics
    const diagnostics = Object.entries(audits)
      .filter(([_, audit]) => audit.details?.type === 'debugdata')
      .map(([id, audit]) => ({
        id,
        title: audit.title,
        description: audit.description,
        displayValue: audit.displayValue || ''
      }));

    return {
      url: config.url,
      timestamp: Date.now(),
      categories: lhr.categories,
      audits: lhr.audits,
      metrics,
      opportunities,
      diagnostics
    };

  } finally {
    await chrome.kill();
  }
}

/**
 * Run multiple Lighthouse audits
 */
export async function runMultipleAudits(configs: LighthouseConfig[]): Promise<LighthouseResults[]> {
  const results: LighthouseResults[] = [];
  
  for (const config of configs) {
    try {
      const result = await runLighthouseAudit(config);
      results.push(result);
    } catch (error) {
      console.error(`Lighthouse audit failed for ${config.url}:`, error);
    }
  }
  
  return results;
}

/**
 * Check performance budgets against Lighthouse results
 */
export function checkPerformanceBudgets(
  results: LighthouseResults, 
  budgets: PerformanceBudgets = DEFAULT_PERFORMANCE_BUDGETS
): {
  passed: boolean;
  violations: Array<{
    type: 'resource' | 'timing';
    budget: number;
    actual: number;
    metric: string;
    severity: 'error' | 'warning';
  }>;
} {
  const violations: Array<{
    type: 'resource' | 'timing';
    budget: number;
    actual: number;
    metric: string;
    severity: 'error' | 'warning';
  }> = [];

  // Check timing budgets
  budgets.timings.forEach(timing => {
    const metricValue = results.metrics[timing.metric as keyof typeof results.metrics];
    if (metricValue && metricValue > timing.budget) {
      violations.push({
        type: 'timing',
        budget: timing.budget,
        actual: metricValue,
        metric: timing.metric,
        severity: metricValue > timing.budget * 1.5 ? 'error' : 'warning'
      });
    }
  });

  // Check resource budgets (simplified - would need actual resource analysis)
  const resourceAudits = {
    'resource-summary': results.audits['resource-summary'],
    'total-byte-weight': results.audits['total-byte-weight'],
    'unused-javascript': results.audits['unused-javascript'],
    'unused-css-rules': results.audits['unused-css-rules']
  };

  // Total byte weight check
  if (resourceAudits['total-byte-weight']?.numericValue) {
    const totalBytes = resourceAudits['total-byte-weight'].numericValue;
    const totalBudget = budgets.resources.find(r => r.resourceType === 'total')?.budget;
    if (totalBudget && totalBytes > totalBudget * 1024) {
      violations.push({
        type: 'resource',
        budget: totalBudget * 1024,
        actual: totalBytes,
        metric: 'total-byte-weight',
        severity: totalBytes > totalBudget * 1024 * 1.5 ? 'error' : 'warning'
      });
    }
  }

  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations
  };
}

/**
 * Generate performance report from Lighthouse results
 */
export function generatePerformanceReport(results: LighthouseResults[]): {
  summary: {
    averageScores: Record<string, number>;
    totalAudits: number;
    passedAudits: number;
    failedAudits: number;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
    urls: string[];
  }>;
  trends: {
    performance: number[];
    accessibility: number[];
    bestPractices: number[];
    seo: number[];
  };
} {
  if (results.length === 0) {
    throw new Error('No Lighthouse results provided');
  }

  // Calculate average scores
  const averageScores: Record<string, number> = {};
  const categoryKeys = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'];
  
  categoryKeys.forEach(category => {
    const scores = results
      .map(r => (r.categories as any)[category]?.score)
      .filter((score): score is number => score !== undefined && score !== null);
    
    if (scores.length > 0) {
      averageScores[category] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
  });

  // Count audits
  let totalAudits = 0;
  let passedAudits = 0;
  let failedAudits = 0;

  results.forEach(result => {
    Object.values(result.audits).forEach(audit => {
      if (audit.score !== null) {
        totalAudits++;
        if (audit.score >= 0.9) {
          passedAudits++;
        } else if (audit.score < 0.5) {
          failedAudits++;
        }
      }
    });
  });

  // Generate recommendations based on most common issues
  const commonIssues = new Map<string, { count: number; urls: string[] }>();
  
  results.forEach(result => {
    result.opportunities.forEach(opportunity => {
      if (!commonIssues.has(opportunity.id)) {
        commonIssues.set(opportunity.id, { count: 0, urls: [] });
      }
      const issue = commonIssues.get(opportunity.id)!;
      issue.count++;
      issue.urls.push(result.url);
    });
  });

  const recommendations = Array.from(commonIssues.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([id, data]) => {
      const sampleAudit = results[0].audits[id];
      return {
        priority: data.count > results.length * 0.7 ? 'high' : 
                 data.count > results.length * 0.3 ? 'medium' : 'low',
        title: sampleAudit?.title || id,
        description: sampleAudit?.description || 'Performance optimization opportunity',
        impact: `Affects ${data.count}/${results.length} pages`,
        urls: data.urls
      } as const;
    });

  // Generate trends
  const trends = {
    performance: results.map(r => r.categories.performance?.score || 0),
    accessibility: results.map(r => r.categories.accessibility?.score || 0),
    bestPractices: results.map(r => r.categories['best-practices']?.score || 0),
    seo: results.map(r => r.categories.seo?.score || 0)
  };

  return {
    summary: {
      averageScores,
      totalAudits,
      passedAudits,
      failedAudits
    },
    recommendations,
    trends
  };
}

/**
 * Compare Lighthouse results over time
 */
export function compareLighthouseResults(
  baseline: LighthouseResults,
  current: LighthouseResults
): {
  improvements: Array<{ metric: string; before: number; after: number; improvement: number }>;
  regressions: Array<{ metric: string; before: number; after: number; regression: number }>;
  overall: 'improved' | 'degraded' | 'stable';
} {
  const improvements: Array<{ metric: string; before: number; after: number; improvement: number }> = [];
  const regressions: Array<{ metric: string; before: number; after: number; regression: number }> = [];

  // Compare category scores
  Object.keys(baseline.categories).forEach(category => {
    const beforeScore = (baseline.categories as any)[category]?.score || 0;
    const afterScore = (current.categories as any)[category]?.score || 0;
    const diff = afterScore - beforeScore;

    if (Math.abs(diff) > 0.05) { // 5% threshold
      if (diff > 0) {
        improvements.push({
          metric: category,
          before: beforeScore,
          after: afterScore,
          improvement: diff
        });
      } else {
        regressions.push({
          metric: category,
          before: beforeScore,
          after: afterScore,
          regression: Math.abs(diff)
        });
      }
    }
  });

  // Compare core metrics
  const coreMetrics: Array<keyof LighthouseResults['metrics']> = [
    'firstContentfulPaint',
    'largestContentfulPaint',
    'cumulativeLayoutShift',
    'totalBlockingTime'
  ];

  coreMetrics.forEach(metric => {
    const beforeValue = baseline.metrics[metric];
    const afterValue = current.metrics[metric];

    if (beforeValue && afterValue) {
      const percentChange = ((afterValue - beforeValue) / beforeValue) * 100;
      
      if (Math.abs(percentChange) > 10) { // 10% threshold
        if (percentChange < 0) { // Lower is better for timing metrics
          improvements.push({
            metric,
            before: beforeValue,
            after: afterValue,
            improvement: Math.abs(percentChange) / 100
          });
        } else {
          regressions.push({
            metric,
            before: beforeValue,
            after: afterValue,
            regression: percentChange / 100
          });
        }
      }
    }
  });

  // Determine overall trend
  const improvementScore = improvements.reduce((sum, imp) => sum + imp.improvement, 0);
  const regressionScore = regressions.reduce((sum, reg) => sum + reg.regression, 0);
  
  let overall: 'improved' | 'degraded' | 'stable';
  if (improvementScore > regressionScore * 1.2) {
    overall = 'improved';
  } else if (regressionScore > improvementScore * 1.2) {
    overall = 'degraded';
  } else {
    overall = 'stable';
  }

  return {
    improvements,
    regressions,
    overall
  };
}