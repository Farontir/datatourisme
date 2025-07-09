import { BundleAnalyzer, BundleStats, BundleAnalysis } from './bundle-analyzer';

export interface BundleMonitorConfig {
  enabled: boolean;
  budgetFile?: string;
  reportFile?: string;
  baselineFile?: string;
  webhookUrl?: string;
  slackChannel?: string;
  failOnError: boolean;
  failOnWarning: boolean;
}

export interface BundleReport {
  timestamp: string;
  version: string;
  branch: string;
  commit: string;
  analysis: BundleAnalysis;
  environment: string;
  buildId: string;
}

export class BundleMonitor {
  private analyzer: BundleAnalyzer;
  private config: BundleMonitorConfig;

  constructor(config: BundleMonitorConfig) {
    this.config = config;
    this.analyzer = new BundleAnalyzer();
  }

  /**
   * Monitor bundle and generate report
   */
  async monitor(stats: BundleStats): Promise<BundleReport> {
    const baselineStats = await this.loadBaseline();
    const analysis = this.analyzer.analyzeBundle(stats, baselineStats);
    
    const report: BundleReport = {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      branch: process.env.GITHUB_REF_NAME || 'main',
      commit: process.env.GITHUB_SHA || 'unknown',
      analysis,
      environment: process.env.NODE_ENV || 'development',
      buildId: process.env.BUILD_ID || Date.now().toString(),
    };

    // Save report
    if (this.config.reportFile) {
      await this.saveReport(report);
    }

    // Send notifications
    if (this.config.webhookUrl) {
      await this.sendWebhook(report);
    }

    if (this.config.slackChannel) {
      await this.sendSlackNotification(report);
    }

    // Check if build should fail
    if (this.shouldFailBuild(analysis)) {
      throw new Error('Bundle size budget exceeded');
    }

    return report;
  }

  /**
   * Load baseline bundle stats for comparison
   */
  private async loadBaseline(): Promise<BundleStats | undefined> {
    if (!this.config.baselineFile) return undefined;

    try {
      const fs = await import('fs').then(m => m.promises);
      const data = await fs.readFile(this.config.baselineFile, 'utf-8');
      return JSON.parse(data) as BundleStats;
    } catch (error) {
      console.warn('Could not load baseline bundle stats:', error);
      return undefined;
    }
  }

  /**
   * Save report to file
   */
  private async saveReport(report: BundleReport): Promise<void> {
    if (!this.config.reportFile) return;

    try {
      const fs = await import('fs').then(m => m.promises);
      await fs.writeFile(this.config.reportFile, JSON.stringify(report, null, 2));
      console.log(`Bundle report saved to ${this.config.reportFile}`);
    } catch (error) {
      console.error('Failed to save bundle report:', error);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(report: BundleReport): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      const payload = {
        timestamp: report.timestamp,
        buildId: report.buildId,
        branch: report.branch,
        commit: report.commit,
        bundleSize: this.analyzer.formatSize(report.analysis.stats.totalSize),
        violations: report.analysis.violations.length,
        recommendations: report.analysis.recommendations.length,
        sizeChange: report.analysis.comparison?.sizeChange || 0,
        status: report.analysis.violations.some(v => v.severity === 'error') ? 'error' : 
                report.analysis.violations.some(v => v.severity === 'warning') ? 'warning' : 'success',
      };

      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(report: BundleReport): Promise<void> {
    if (!this.config.slackChannel) return;

    const { analysis } = report;
    const hasErrors = analysis.violations.some(v => v.severity === 'error');
    const hasWarnings = analysis.violations.some(v => v.severity === 'warning');
    
    const color = hasErrors ? 'danger' : hasWarnings ? 'warning' : 'good';
    const status = hasErrors ? 'Failed' : hasWarnings ? 'Warning' : 'Passed';
    
    const sizeChange = analysis.comparison?.sizeChange || 0;
    const sizeChangeText = sizeChange !== 0 ? 
      `(${sizeChange > 0 ? '+' : ''}${this.analyzer.formatSize(Math.abs(sizeChange))})` : '';

    const message = {
      channel: this.config.slackChannel,
      username: 'Bundle Monitor',
      icon_emoji: ':package:',
      attachments: [
        {
          color,
          title: `Bundle Analysis ${status}`,
          fields: [
            {
              title: 'Branch',
              value: report.branch,
              short: true,
            },
            {
              title: 'Bundle Size',
              value: `${this.analyzer.formatSize(analysis.stats.totalSize)} ${sizeChangeText}`,
              short: true,
            },
            {
              title: 'Violations',
              value: analysis.violations.length.toString(),
              short: true,
            },
            {
              title: 'Recommendations',
              value: analysis.recommendations.length.toString(),
              short: true,
            },
          ],
          footer: `Build ID: ${report.buildId}`,
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    // Add violation details
    if (analysis.violations.length > 0) {
      const violationText = analysis.violations
        .map(v => `• ${v.message}`)
        .join('\n');
      
      message.attachments.push({
        color: 'danger',
        title: 'Budget Violations',
        text: violationText,
      });
    }

    // Add top recommendations
    if (analysis.recommendations.length > 0) {
      const topRecommendations = analysis.recommendations
        .slice(0, 3)
        .map(r => `• ${r.target}: ${r.description}`)
        .join('\n');
      
      message.attachments.push({
        color: 'warning',
        title: 'Top Recommendations',
        text: topRecommendations,
      });
    }

    try {
      // This would normally use a Slack webhook URL
      console.log('Slack notification:', JSON.stringify(message, null, 2));
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Check if build should fail based on violations
   */
  private shouldFailBuild(analysis: BundleAnalysis): boolean {
    if (!this.config.enabled) return false;

    const hasErrors = analysis.violations.some(v => v.severity === 'error');
    const hasWarnings = analysis.violations.some(v => v.severity === 'warning');

    return (this.config.failOnError && hasErrors) || 
           (this.config.failOnWarning && hasWarnings);
  }

  /**
   * Generate CI comment for pull requests
   */
  generateCIComment(report: BundleReport): string {
    const { analysis } = report;
    const hasErrors = analysis.violations.some(v => v.severity === 'error');
    const hasWarnings = analysis.violations.some(v => v.severity === 'warning');
    
    let comment = '## 📦 Bundle Analysis Report\n\n';
    
    // Status indicator
    if (hasErrors) {
      comment += '❌ **Bundle analysis failed**\n\n';
    } else if (hasWarnings) {
      comment += '⚠️ **Bundle analysis passed with warnings**\n\n';
    } else {
      comment += '✅ **Bundle analysis passed**\n\n';
    }
    
    // Bundle stats
    comment += '### Bundle Statistics\n';
    comment += `- **Total Size**: ${this.analyzer.formatSize(analysis.stats.totalSize)}\n`;
    comment += `- **Gzipped Size**: ${this.analyzer.formatSize(analysis.stats.gzippedSize)}\n`;
    comment += `- **Chunks**: ${analysis.stats.chunks.length}\n`;
    comment += `- **Dependencies**: ${analysis.stats.dependencies.length}\n\n`;
    
    // Size comparison
    if (analysis.comparison) {
      const sizeChange = analysis.comparison.sizeChange;
      const changePercent = ((sizeChange / analysis.comparison.baseline.totalSize) * 100).toFixed(1);
      const changeEmoji = sizeChange > 0 ? '📈' : sizeChange < 0 ? '📉' : '➖';
      
      comment += '### Size Comparison\n';
      comment += `${changeEmoji} **Change**: ${sizeChange > 0 ? '+' : ''}${this.analyzer.formatSize(Math.abs(sizeChange))} (${changePercent}%)\n\n`;
    }
    
    // Violations
    if (analysis.violations.length > 0) {
      comment += '### ⚠️ Budget Violations\n';
      for (const violation of analysis.violations) {
        const emoji = violation.severity === 'error' ? '❌' : '⚠️';
        comment += `${emoji} ${violation.message}\n`;
      }
      comment += '\n';
    }
    
    // Recommendations
    if (analysis.recommendations.length > 0) {
      comment += '### 💡 Optimization Recommendations\n';
      for (const rec of analysis.recommendations.slice(0, 5)) {
        const impactEmoji = rec.impact === 'high' ? '🔴' : rec.impact === 'medium' ? '🟡' : '🟢';
        comment += `${impactEmoji} **${rec.target}**: ${rec.description}\n`;
        comment += `   - Estimated savings: ${this.analyzer.formatSize(rec.estimatedSavings)}\n`;
      }
      comment += '\n';
    }
    
    comment += `---\n*Report generated at ${report.timestamp}*`;
    
    return comment;
  }

  /**
   * Create bundle size tracking metrics
   */
  createMetrics(report: BundleReport): Record<string, number> {
    const { analysis } = report;
    
    return {
      'bundle.size.total': analysis.stats.totalSize,
      'bundle.size.gzipped': analysis.stats.gzippedSize,
      'bundle.chunks.count': analysis.stats.chunks.length,
      'bundle.dependencies.count': analysis.stats.dependencies.length,
      'bundle.violations.count': analysis.violations.length,
      'bundle.violations.errors': analysis.violations.filter(v => v.severity === 'error').length,
      'bundle.violations.warnings': analysis.violations.filter(v => v.severity === 'warning').length,
      'bundle.recommendations.count': analysis.recommendations.length,
      'bundle.size.change': analysis.comparison?.sizeChange || 0,
      'bundle.size.change.percent': analysis.comparison ? 
        (analysis.comparison.sizeChange / analysis.comparison.baseline.totalSize) * 100 : 0,
    };
  }
}