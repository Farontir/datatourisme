export interface BundleStats {
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
  treemap: TreemapData;
}

export interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: ModuleInfo[];
  isEntry: boolean;
  isInitial: boolean;
}

export interface ModuleInfo {
  name: string;
  size: number;
  chunks: string[];
  reasons: string[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  size: number;
  gzippedSize: number;
  treeshakeable: boolean;
  sideEffects: boolean;
}

export interface TreemapData {
  name: string;
  size: number;
  children: TreemapData[];
}

export interface BundleBudget {
  type: 'initial' | 'all' | 'chunk' | 'asset';
  name?: string;
  baseline: number;
  maximumWarning: number;
  maximumError: number;
  unit: 'bytes' | 'kb' | 'mb';
}

export interface BundleAnalysis {
  stats: BundleStats;
  budgets: BundleBudget[];
  violations: BudgetViolation[];
  recommendations: OptimizationRecommendation[];
  comparison?: BundleComparison;
}

export interface BudgetViolation {
  budget: BundleBudget;
  actual: number;
  diff: number;
  severity: 'warning' | 'error';
  message: string;
}

export interface OptimizationRecommendation {
  type: 'split' | 'lazy' | 'remove' | 'update' | 'compress';
  target: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'medium' | 'hard';
  estimatedSavings: number;
}

export interface BundleComparison {
  baseline: BundleStats;
  current: BundleStats;
  sizeChange: number;
  significantChanges: SignificantChange[];
}

export interface SignificantChange {
  type: 'added' | 'removed' | 'increased' | 'decreased';
  target: string;
  change: number;
  impact: 'high' | 'medium' | 'low';
}

// Default bundle budgets for different types
export const DEFAULT_BUNDLE_BUDGETS: BundleBudget[] = [
  {
    type: 'initial',
    baseline: 200,
    maximumWarning: 250,
    maximumError: 300,
    unit: 'kb',
  },
  {
    type: 'all',
    baseline: 1000,
    maximumWarning: 1200,
    maximumError: 1500,
    unit: 'kb',
  },
  {
    type: 'asset',
    name: 'main.js',
    baseline: 150,
    maximumWarning: 200,
    maximumError: 250,
    unit: 'kb',
  },
  {
    type: 'asset',
    name: 'vendor.js',
    baseline: 400,
    maximumWarning: 500,
    maximumError: 600,
    unit: 'kb',
  },
  {
    type: 'chunk',
    name: 'react',
    baseline: 100,
    maximumWarning: 120,
    maximumError: 150,
    unit: 'kb',
  },
];

export class BundleAnalyzer {
  private budgets: BundleBudget[];
  
  constructor(budgets: BundleBudget[] = DEFAULT_BUNDLE_BUDGETS) {
    this.budgets = budgets;
  }

  /**
   * Analyze bundle statistics and generate recommendations
   */
  analyzeBundle(stats: BundleStats, baselineStats?: BundleStats): BundleAnalysis {
    const violations = this.checkBudgetViolations(stats);
    const recommendations = this.generateRecommendations(stats);
    const comparison = baselineStats ? this.compareWithBaseline(stats, baselineStats) : undefined;

    return {
      stats,
      budgets: this.budgets,
      violations,
      recommendations,
      comparison,
    };
  }

  /**
   * Check if current bundle violates any budget constraints
   */
  private checkBudgetViolations(stats: BundleStats): BudgetViolation[] {
    const violations: BudgetViolation[] = [];

    for (const budget of this.budgets) {
      const actual = this.getBudgetActualSize(stats, budget);
      const actualKb = this.convertToKb(actual);
      
      if (actualKb > budget.maximumError) {
        violations.push({
          budget,
          actual: actualKb,
          diff: actualKb - budget.maximumError,
          severity: 'error',
          message: `${budget.type} bundle size (${actualKb}kb) exceeds maximum allowed (${budget.maximumError}kb)`,
        });
      } else if (actualKb > budget.maximumWarning) {
        violations.push({
          budget,
          actual: actualKb,
          diff: actualKb - budget.maximumWarning,
          severity: 'warning',
          message: `${budget.type} bundle size (${actualKb}kb) exceeds warning threshold (${budget.maximumWarning}kb)`,
        });
      }
    }

    return violations;
  }

  /**
   * Generate optimization recommendations based on bundle analysis
   */
  private generateRecommendations(stats: BundleStats): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check for large dependencies
    const largeDependencies = stats.dependencies
      .filter(dep => dep.size > 100 * 1024) // > 100kb
      .sort((a, b) => b.size - a.size);

    for (const dep of largeDependencies.slice(0, 5)) {
      if (dep.name.includes('moment')) {
        recommendations.push({
          type: 'update',
          target: dep.name,
          description: `Consider replacing ${dep.name} with date-fns or day.js for smaller bundle size`,
          impact: 'high',
          effort: 'medium',
          estimatedSavings: dep.size * 0.8, // Estimated 80% savings
        });
      } else if (dep.name.includes('lodash')) {
        recommendations.push({
          type: 'update',
          target: dep.name,
          description: `Use specific lodash imports instead of full library`,
          impact: 'high',
          effort: 'easy',
          estimatedSavings: dep.size * 0.6, // Estimated 60% savings
        });
      } else if (!dep.treeshakeable) {
        recommendations.push({
          type: 'split',
          target: dep.name,
          description: `${dep.name} is not tree-shakeable. Consider code splitting or finding alternatives`,
          impact: 'medium',
          effort: 'medium',
          estimatedSavings: dep.size * 0.4,
        });
      }
    }

    // Check for large chunks that could be code split
    const largeChunks = stats.chunks
      .filter(chunk => chunk.size > 200 * 1024 && !chunk.isInitial) // > 200kb non-initial chunks
      .sort((a, b) => b.size - a.size);

    for (const chunk of largeChunks.slice(0, 3)) {
      recommendations.push({
        type: 'lazy',
        target: chunk.name,
        description: `Consider lazy loading ${chunk.name} to reduce initial bundle size`,
        impact: 'medium',
        effort: 'easy',
        estimatedSavings: chunk.size * 0.3, // Estimated 30% initial bundle reduction
      });
    }

    // Check for duplicate modules
    const moduleMap = new Map<string, number>();
    stats.chunks.forEach(chunk => {
      chunk.modules.forEach(module => {
        moduleMap.set(module.name, (moduleMap.get(module.name) || 0) + 1);
      });
    });

    const duplicates = Array.from(moduleMap.entries())
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a);

    for (const [moduleName, count] of duplicates.slice(0, 3)) {
      recommendations.push({
        type: 'split',
        target: moduleName,
        description: `Module ${moduleName} is duplicated across ${count} chunks. Consider extracting to shared chunk`,
        impact: 'medium',
        effort: 'medium',
        estimatedSavings: 50 * 1024, // Estimated savings per duplicate
      });
    }

    return recommendations.sort((a, b) => {
      const impactWeight = { high: 3, medium: 2, low: 1 };
      const effortWeight = { easy: 3, medium: 2, hard: 1 };
      
      const scoreA = (impactWeight[a.impact] * effortWeight[a.effort]) + a.estimatedSavings / 1024;
      const scoreB = (impactWeight[b.impact] * effortWeight[b.effort]) + b.estimatedSavings / 1024;
      
      return scoreB - scoreA;
    });
  }

  /**
   * Compare current bundle with baseline
   */
  private compareWithBaseline(current: BundleStats, baseline: BundleStats): BundleComparison {
    const sizeChange = current.totalSize - baseline.totalSize;
    const significantChanges: SignificantChange[] = [];

    // Check for significant size changes (>10% or >50kb)
    const significantThreshold = Math.max(baseline.totalSize * 0.1, 50 * 1024);
    
    if (Math.abs(sizeChange) > significantThreshold) {
      significantChanges.push({
        type: sizeChange > 0 ? 'increased' : 'decreased',
        target: 'total bundle',
        change: Math.abs(sizeChange),
        impact: Math.abs(sizeChange) > baseline.totalSize * 0.2 ? 'high' : 'medium',
      });
    }

    // Check for new or removed dependencies
    const baselineDeps = new Set(baseline.dependencies.map(d => d.name));
    const currentDeps = new Set(current.dependencies.map(d => d.name));

    for (const dep of currentDeps) {
      if (!baselineDeps.has(dep)) {
        const depInfo = current.dependencies.find(d => d.name === dep);
        if (depInfo && depInfo.size > 20 * 1024) {
          significantChanges.push({
            type: 'added',
            target: dep,
            change: depInfo.size,
            impact: depInfo.size > 100 * 1024 ? 'high' : 'medium',
          });
        }
      }
    }

    for (const dep of baselineDeps) {
      if (!currentDeps.has(dep)) {
        const depInfo = baseline.dependencies.find(d => d.name === dep);
        if (depInfo && depInfo.size > 20 * 1024) {
          significantChanges.push({
            type: 'removed',
            target: dep,
            change: depInfo.size,
            impact: depInfo.size > 100 * 1024 ? 'high' : 'medium',
          });
        }
      }
    }

    return {
      baseline,
      current,
      sizeChange,
      significantChanges,
    };
  }

  /**
   * Get actual size for a specific budget type
   */
  private getBudgetActualSize(stats: BundleStats, budget: BundleBudget): number {
    switch (budget.type) {
      case 'initial':
        return stats.chunks
          .filter(chunk => chunk.isInitial)
          .reduce((sum, chunk) => sum + chunk.size, 0);
      
      case 'all':
        return stats.totalSize;
      
      case 'chunk':
        const chunk = stats.chunks.find(c => c.name === budget.name);
        return chunk ? chunk.size : 0;
      
      case 'asset':
        // For assets, we'll look for chunks with similar names
        const assetChunk = stats.chunks.find(c => c.name.includes(budget.name || ''));
        return assetChunk ? assetChunk.size : 0;
      
      default:
        return 0;
    }
  }

  /**
   * Convert bytes to kilobytes
   */
  private convertToKb(bytes: number): number {
    return Math.round(bytes / 1024);
  }

  /**
   * Format size for display
   */
  formatSize(bytes: number): string {
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)}kb`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)}mb`;
  }

  /**
   * Generate bundle report
   */
  generateReport(analysis: BundleAnalysis): string {
    const { stats, violations, recommendations, comparison } = analysis;
    
    let report = `# Bundle Analysis Report\n\n`;
    
    // Overall stats
    report += `## Bundle Statistics\n`;
    report += `- Total size: ${this.formatSize(stats.totalSize)}\n`;
    report += `- Gzipped size: ${this.formatSize(stats.gzippedSize)}\n`;
    report += `- Number of chunks: ${stats.chunks.length}\n`;
    report += `- Dependencies: ${stats.dependencies.length}\n\n`;
    
    // Budget violations
    if (violations.length > 0) {
      report += `## 🚨 Budget Violations\n`;
      for (const violation of violations) {
        const emoji = violation.severity === 'error' ? '❌' : '⚠️';
        report += `${emoji} ${violation.message}\n`;
      }
      report += `\n`;
    }
    
    // Recommendations
    if (recommendations.length > 0) {
      report += `## 💡 Optimization Recommendations\n`;
      for (const rec of recommendations.slice(0, 5)) {
        const impactEmoji = rec.impact === 'high' ? '🔴' : rec.impact === 'medium' ? '🟡' : '🟢';
        report += `${impactEmoji} **${rec.target}**: ${rec.description}\n`;
        report += `   - Impact: ${rec.impact}, Effort: ${rec.effort}\n`;
        report += `   - Estimated savings: ${this.formatSize(rec.estimatedSavings)}\n\n`;
      }
    }
    
    // Comparison with baseline
    if (comparison) {
      report += `## 📊 Comparison with Baseline\n`;
      const changeEmoji = comparison.sizeChange > 0 ? '📈' : '📉';
      report += `${changeEmoji} Size change: ${this.formatSize(Math.abs(comparison.sizeChange))} `;
      report += `(${comparison.sizeChange > 0 ? '+' : ''}${((comparison.sizeChange / comparison.baseline.totalSize) * 100).toFixed(1)}%)\n\n`;
      
      if (comparison.significantChanges.length > 0) {
        report += `### Significant Changes\n`;
        for (const change of comparison.significantChanges) {
          const emoji = change.type === 'added' ? '➕' : change.type === 'removed' ? '➖' : 
                       change.type === 'increased' ? '📈' : '📉';
          report += `${emoji} ${change.target}: ${this.formatSize(change.change)}\n`;
        }
      }
    }
    
    return report;
  }
}