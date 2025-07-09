#!/usr/bin/env node

const { runLighthouseAudit, generatePerformanceReport } = require('../dist/lighthouse');
const fs = require('fs').promises;
const path = require('path');

const DEFAULT_URLS = [
  'http://localhost:3000',
  'http://localhost:3000/search',
  'http://localhost:3000/map',
  'http://localhost:3000/favorites'
];

async function runPerformanceAudit() {
  const urls = process.argv.slice(2);
  const urlsToTest = urls.length > 0 ? urls : DEFAULT_URLS;
  
  console.log('🚀 Starting performance audit...');
  console.log('URLs to test:', urlsToTest);
  
  const results = [];
  
  for (const url of urlsToTest) {
    console.log(`\n📊 Auditing ${url}...`);
    
    try {
      const result = await runLighthouseAudit({
        url,
        options: {
          chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
        }
      });
      
      results.push(result);
      
      // Log immediate results
      console.log(`✅ ${url} completed:`);
      console.log(`   Performance: ${Math.round((result.categories.performance?.score || 0) * 100)}%`);
      console.log(`   Accessibility: ${Math.round((result.categories.accessibility?.score || 0) * 100)}%`);
      console.log(`   Best Practices: ${Math.round((result.categories['best-practices']?.score || 0) * 100)}%`);
      console.log(`   SEO: ${Math.round((result.categories.seo?.score || 0) * 100)}%`);
      
    } catch (error) {
      console.error(`❌ Failed to audit ${url}:`, error.message);
    }
  }
  
  if (results.length === 0) {
    console.error('❌ No successful audits completed');
    process.exit(1);
  }
  
  // Generate comprehensive report
  console.log('\n📈 Generating performance report...');
  const report = generatePerformanceReport(results);
  
  // Create reports directory
  const reportsDir = path.join(process.cwd(), 'reports');
  await fs.mkdir(reportsDir, { recursive: true });
  
  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(reportsDir, `lighthouse-results-${timestamp}.json`);
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
  
  // Save summary report
  const reportFile = path.join(reportsDir, `performance-report-${timestamp}.json`);
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
  
  // Generate HTML report
  const htmlReport = generateHTMLReport(report, results);
  const htmlFile = path.join(reportsDir, `performance-report-${timestamp}.html`);
  await fs.writeFile(htmlFile, htmlReport);
  
  console.log('\n📊 Performance Audit Summary:');
  console.log('===============================');
  
  // Display summary
  Object.entries(report.summary.averageScores).forEach(([category, score]) => {
    const percentage = Math.round(score * 100);
    const status = percentage >= 90 ? '✅' : percentage >= 70 ? '⚠️' : '❌';
    console.log(`${status} ${category.padEnd(15)}: ${percentage}%`);
  });
  
  console.log(`\n📈 Total Audits: ${report.summary.totalAudits}`);
  console.log(`✅ Passed: ${report.summary.passedAudits}`);
  console.log(`❌ Failed: ${report.summary.failedAudits}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n🔧 Top Recommendations:');
    report.recommendations.slice(0, 5).forEach((rec, index) => {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`${priority} ${index + 1}. ${rec.title}`);
      console.log(`   ${rec.impact}`);
    });
  }
  
  console.log(`\n📁 Reports saved to:`);
  console.log(`   Results: ${resultsFile}`);
  console.log(`   Summary: ${reportFile}`);
  console.log(`   HTML: ${htmlFile}`);
  
  // Exit with error code if performance is poor
  const avgPerformance = report.summary.averageScores.performance || 0;
  if (avgPerformance < 0.7) {
    console.log('\n❌ Performance audit failed: average score below 70%');
    process.exit(1);
  }
  
  console.log('\n✅ Performance audit completed successfully!');
}

function generateHTMLReport(report, results) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Audit Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 2rem; line-height: 1.6; }
        .header { border-bottom: 2px solid #e1e5e9; padding-bottom: 1rem; margin-bottom: 2rem; }
        .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
        .score-card { background: #f8f9fa; border-radius: 8px; padding: 1rem; text-align: center; }
        .score { font-size: 2rem; font-weight: bold; margin: 0.5rem 0; }
        .score.good { color: #0cce6b; }
        .score.okay { color: #ffa400; }
        .score.poor { color: #ff5722; }
        .recommendations { margin: 2rem 0; }
        .recommendation { background: #fff; border: 1px solid #e1e5e9; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
        .priority { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem; font-weight: bold; }
        .priority.high { background: #ffebee; color: #c62828; }
        .priority.medium { background: #fff8e1; color: #f57c00; }
        .priority.low { background: #e8f5e8; color: #2e7d32; }
        .urls { margin: 2rem 0; }
        .url-result { background: #fff; border: 1px solid #e1e5e9; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
        .url-scores { display: flex; gap: 1rem; margin: 0.5rem 0; }
        .url-score { flex: 1; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Audit Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="score-grid">
        ${Object.entries(report.summary.averageScores).map(([category, score]) => {
          const percentage = Math.round(score * 100);
          const scoreClass = percentage >= 90 ? 'good' : percentage >= 70 ? 'okay' : 'poor';
          return `
            <div class="score-card">
                <h3>${category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                <div class="score ${scoreClass}">${percentage}%</div>
            </div>
          `;
        }).join('')}
    </div>
    
    <div class="recommendations">
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation">
                <div class="priority ${rec.priority}">${rec.priority.toUpperCase()}</div>
                <h3>${rec.title}</h3>
                <p>${rec.description}</p>
                <p><strong>Impact:</strong> ${rec.impact}</p>
            </div>
        `).join('')}
    </div>
    
    <div class="urls">
        <h2>URL Results</h2>
        ${results.map(result => {
          const perfScore = Math.round((result.categories.performance?.score || 0) * 100);
          const a11yScore = Math.round((result.categories.accessibility?.score || 0) * 100);
          const bpScore = Math.round((result.categories['best-practices']?.score || 0) * 100);
          const seoScore = Math.round((result.categories.seo?.score || 0) * 100);
          
          return `
            <div class="url-result">
                <h3>${result.url}</h3>
                <div class="url-scores">
                    <div class="url-score">
                        <div>Performance</div>
                        <div class="score ${perfScore >= 90 ? 'good' : perfScore >= 70 ? 'okay' : 'poor'}">${perfScore}%</div>
                    </div>
                    <div class="url-score">
                        <div>Accessibility</div>
                        <div class="score ${a11yScore >= 90 ? 'good' : a11yScore >= 70 ? 'okay' : 'poor'}">${a11yScore}%</div>
                    </div>
                    <div class="url-score">
                        <div>Best Practices</div>
                        <div class="score ${bpScore >= 90 ? 'good' : bpScore >= 70 ? 'okay' : 'poor'}">${bpScore}%</div>
                    </div>
                    <div class="url-score">
                        <div>SEO</div>
                        <div class="score ${seoScore >= 90 ? 'good' : seoScore >= 70 ? 'okay' : 'poor'}">${seoScore}%</div>
                    </div>
                </div>
            </div>
          `;
        }).join('')}
    </div>
</body>
</html>
  `;
}

// Run the audit
runPerformanceAudit().catch(error => {
  console.error('❌ Performance audit failed:', error);
  process.exit(1);
});