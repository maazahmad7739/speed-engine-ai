import puppeteer from 'puppeteer';

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildReportHtml(data) {
  const { 
    url = '', 
    device = 'mobile', 
    scores = {}, 
    metrics = {}, 
    failedAudits = {}, 
    aiFixes = [], 
    appliedFixIds = [] 
  } = data || {};
  
  const baseScores = scores.base || { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };
  const simulatedScores = scores.simulated || { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };
  
  const baseMetrics = metrics.base || { fcp: 0, si: 0, lcp: 0, tbt: 0, cls: 0 };
  const simulatedMetrics = metrics.simulated || { fcp: 0, si: 0, lcp: 0, tbt: 0, cls: 0 };
  
  const dateStr = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
  
  const getScoreColorClass = (score) => {
    if (score >= 90) return 'score-good';
    if (score >= 50) return 'score-improvement';
    return 'score-poor';
  };
  
  const getMetricBadge = (val, type) => {
    let status = 'good';
    if (type === 'fcp') {
      if (val <= 1.8) status = 'good';
      else if (val <= 3.0) status = 'improvement';
      else status = 'poor';
    } else if (type === 'si') {
      if (val <= 3.4) status = 'good';
      else if (val <= 5.8) status = 'improvement';
      else status = 'poor';
    } else if (type === 'lcp') {
      if (val <= 2.5) status = 'good';
      else if (val <= 4.0) status = 'improvement';
      else status = 'poor';
    } else if (type === 'tbt') {
      if (val <= 200) status = 'good';
      else if (val <= 600) status = 'improvement';
      else status = 'poor';
    } else if (type === 'cls') {
      if (val <= 0.1) status = 'good';
      else if (val <= 0.25) status = 'improvement';
      else status = 'poor';
    }
    
    if (status === 'good') return '<span class="badge-status badge-good">Good</span>';
    if (status === 'improvement') return '<span class="badge-status badge-improvement">Needs Imp.</span>';
    return '<span class="badge-status badge-poor">Poor</span>';
  };

  // Compile individual categories of audits
  let diagnosticsHtml = '';
  const cats = [
    { key: 'performance', label: 'Performance' },
    { key: 'accessibility', label: 'Accessibility' },
    { key: 'bestPractices', label: 'Best Practices' },
    { key: 'seo', label: 'SEO' }
  ];
  
  cats.forEach(cat => {
    const list = failedAudits[cat.key] || [];
    if (list.length > 0) {
      diagnosticsHtml += `<h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 25px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; page-break-after: avoid;">${cat.label} Issues (${list.length})</h3>`;
      list.forEach(audit => {
        let itemsHtml = '';
        if (audit.items && audit.items.length > 0) {
          itemsHtml += `<div style="margin-top: 8px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px;">`;
          audit.items.slice(0, 3).forEach(item => {
            if (item.selector) itemsHtml += `<div style="margin-bottom: 4px;"><strong>Selector:</strong> <code>${escapeHtml(item.selector)}</code></div>`;
            if (item.url) itemsHtml += `<div style="word-break:break-all; margin-bottom: 4px;"><strong>Source Asset:</strong> <span style="color:#0284c7;">${escapeHtml(item.url)}</span></div>`;
            if (item.snippet) itemsHtml += `<pre style="margin-top: 6px; padding: 8px; font-size:10px; color:#334155; background:#f1f5f9; border-left:3px solid #94a3b8; border-radius:4px;">${escapeHtml(item.snippet)}</pre>`;
          });
          itemsHtml += `</div>`;
        }
        
        diagnosticsHtml += `
          <div class="issue-card">
            <div class="issue-header">
              <div class="issue-title">${escapeHtml(audit.title)}</div>
              <span class="issue-badge">${escapeHtml(audit.displayValue || 'Failing')}</span>
            </div>
            <div class="issue-desc">${escapeHtml(audit.description)}</div>
            ${itemsHtml}
          </div>
        `;
      });
    }
  });

  // Compile AI fixes
  let fixesHtml = '';
  if (aiFixes && aiFixes.length > 0) {
    aiFixes.forEach((fix, index) => {
      const isApplied = (appliedFixIds || []).includes(fix.auditId);
      fixesHtml += `
        <div class="issue-card" style="border: 1px solid #e2e8f0; ${isApplied ? 'border-left: 4px solid #10b981;' : 'border-left: 4px solid #94a3b8;'}">
          <div class="issue-header">
            <div class="issue-title">Fix #${index + 1}: ${escapeHtml(fix.auditId)}</div>
            <div style="display:flex; gap: 8px;">
              <span class="badge-status badge-good">+${fix.scoreGain} Pts</span>
              <span class="badge-status" style="background:#e0f2fe; color:#0369a1;">${fix.improvementPercentage}% Impact</span>
            </div>
          </div>
          <div class="issue-desc" style="font-weight: 500; color: #1e293b; margin-bottom: 12px; font-size: 13px;">${escapeHtml(fix.explanation)}</div>
          
          <div class="code-diff">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #991b1b; margin-bottom: 4px; text-transform: uppercase; letter-spacing:0.5px;">Original Code Block:</div>
              <pre class="original">${escapeHtml(fix.originalCode)}</pre>
            </div>
            <div style="margin-top: 10px;">
              <div style="font-size: 11px; font-weight: 700; color: #065f46; margin-bottom: 4px; text-transform: uppercase; letter-spacing:0.5px;">AI-Optimized Solution:</div>
              <pre class="optimized">${escapeHtml(fix.optimizedCode)}</pre>
            </div>
          </div>
        </div>
      `;
    });
  } else {
    fixesHtml = '<p style="color: #64748b; font-size: 13px;">No AI-powered optimization fixes were generated for this run.</p>';
  }

  // HTML Template
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>SpeedEngine AI Executive Performance Report</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            line-height: 1.5;
            background: #ffffff;
            padding: 40px;
            margin: 0;
          }
          .report-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .report-header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .brand-name {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .brand-name span {
            color: #06b6d4;
          }
          .doc-type {
            font-size: 12px;
            font-weight: 700;
            background: #ecfeff;
            color: #0891b2;
            padding: 5px 12px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 20px;
            background: #f8fafc;
            border-radius: 8px;
            padding: 15px;
            border: 1px solid #f1f5f9;
          }
          .meta-item {
            font-size: 13px;
          }
          .meta-label {
            color: #64748b;
            font-weight: 500;
            margin-bottom: 2px;
          }
          .meta-value {
            font-weight: 600;
            color: #0f172a;
            word-break: break-all;
          }
          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 35px;
            margin-bottom: 15px;
            border-left: 4px solid #06b6d4;
            padding-left: 10px;
            page-break-after: avoid;
          }
          .score-card-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
          }
          .score-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
          }
          .score-card-title {
            font-size: 11px;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          .score-values {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
          }
          .score-val {
            font-size: 24px;
            font-weight: 800;
            font-family: monospace;
          }
          .score-arrow {
            color: #94a3b8;
            font-size: 14px;
          }
          .score-good { color: #10b981; }
          .score-improvement { color: #f59e0b; }
          .score-poor { color: #ef4444; }
          
          .vitals-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          .vitals-table th {
            background: #f8fafc;
            text-align: left;
            font-size: 12px;
            color: #475569;
            font-weight: 600;
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .vitals-table td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
          }
          .badge-status {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            display: inline-block;
          }
          .badge-good { background: #d1fae5; color: #065f46; }
          .badge-improvement { background: #fef3c7; color: #92400e; }
          .badge-poor { background: #fee2e2; color: #991b1b; }
          
          .issue-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
          }
          .issue-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
          }
          .issue-badge {
            background: #fee2e2;
            color: #991b1b;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 4px;
          }
          .issue-desc {
            font-size: 12.5px;
            color: #475569;
            margin-bottom: 10px;
          }
          .code-diff {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
            margin-top: 10px;
          }
          pre {
            background: #0f172a;
            color: #f8fafc;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            padding: 10px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 0;
            white-space: pre-wrap;
            word-break: break-all;
          }
          pre.original {
            border-left: 3px solid #ef4444;
            background: #fef2f2;
            color: #991b1b;
          }
          pre.optimized {
            border-left: 3px solid #10b981;
            background: #ecfdf5;
            color: #065f46;
          }
          code {
            font-family: 'JetBrains Mono', monospace;
            background: #f1f5f9;
            color: #334155;
            padding: 1px 4px;
            border-radius: 3px;
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="report-header">
            <div class="brand-name">SpeedEngine <span>AI</span></div>
            <div class="doc-type">Executive Performance Audit</div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Target URL</div>
              <div class="meta-value">${escapeHtml(url)}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Audit Date & Time</div>
              <div class="meta-value">${dateStr}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Device Profile</div>
              <div class="meta-value" style="text-transform: uppercase;">${device}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Optimization Framework</div>
              <div class="meta-value">SpeedEngine AI Shadow Middleware</div>
            </div>
          </div>
          
          <div class="section-title">Executive Score Summary</div>
          <div class="score-card-grid">
            <div class="score-card">
              <div class="score-card-title">Performance</div>
              <div class="score-values">
                <span class="score-val ${getScoreColorClass(scores.base.performance)}">${scores.base.performance}</span>
                <span class="score-arrow">➔</span>
                <span class="score-val ${getScoreColorClass(scores.simulated.performance)}">${scores.simulated.performance}</span>
              </div>
            </div>
            <div class="score-card">
              <div class="score-card-title">Accessibility</div>
              <div class="score-values">
                <span class="score-val ${getScoreColorClass(scores.base.accessibility)}">${scores.base.accessibility}</span>
                <span class="score-arrow">➔</span>
                <span class="score-val ${getScoreColorClass(scores.simulated.accessibility)}">${scores.simulated.accessibility}</span>
              </div>
            </div>
            <div class="score-card">
              <div class="score-card-title">Best Practices</div>
              <div class="score-values">
                <span class="score-val ${getScoreColorClass(scores.base.bestPractices)}">${scores.base.bestPractices}</span>
                <span class="score-arrow">➔</span>
                <span class="score-val ${getScoreColorClass(scores.simulated.bestPractices)}">${scores.simulated.bestPractices}</span>
              </div>
            </div>
            <div class="score-card">
              <div class="score-card-title">SEO</div>
              <div class="score-values">
                <span class="score-val ${getScoreColorClass(scores.base.seo)}">${scores.base.seo}</span>
                <span class="score-arrow">➔</span>
                <span class="score-val ${getScoreColorClass(scores.simulated.seo)}">${scores.simulated.seo}</span>
              </div>
            </div>
          </div>
          
          <div class="section-title">Core Web Vitals Comparison</div>
          <table class="vitals-table">
            <thead>
              <tr>
                <th>Web Vital Metric</th>
                <th>Base Value</th>
                <th>Status</th>
                <th>Optimized Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>First Contentful Paint (FCP)</strong></td>
                <td>${metrics.base.fcp} s</td>
                <td>${getMetricBadge(metrics.base.fcp, 'fcp')}</td>
                <td><strong>${metrics.simulated.fcp} s</strong></td>
                <td>${getMetricBadge(metrics.simulated.fcp, 'fcp')}</td>
              </tr>
              <tr>
                <td><strong>Speed Index (SI)</strong></td>
                <td>${metrics.base.si} s</td>
                <td>${getMetricBadge(metrics.base.si, 'si')}</td>
                <td><strong>${metrics.simulated.si} s</strong></td>
                <td>${getMetricBadge(metrics.simulated.si, 'si')}</td>
              </tr>
              <tr>
                <td><strong>Largest Contentful Paint (LCP)</strong></td>
                <td>${metrics.base.lcp} s</td>
                <td>${getMetricBadge(metrics.base.lcp, 'lcp')}</td>
                <td><strong>${metrics.simulated.lcp} s</strong></td>
                <td>${getMetricBadge(metrics.simulated.lcp, 'lcp')}</td>
              </tr>
              <tr>
                <td><strong>Total Blocking Time (TBT)</strong></td>
                <td>${metrics.base.tbt} ms</td>
                <td>${getMetricBadge(metrics.base.tbt, 'tbt')}</td>
                <td><strong>${metrics.simulated.tbt} ms</strong></td>
                <td>${getMetricBadge(metrics.simulated.tbt, 'tbt')}</td>
              </tr>
              <tr>
                <td><strong>Cumulative Layout Shift (CLS)</strong></td>
                <td>${metrics.base.cls}</td>
                <td>${getMetricBadge(metrics.base.cls, 'cls')}</td>
                <td><strong>${metrics.simulated.cls}</strong></td>
                <td>${getMetricBadge(metrics.simulated.cls, 'cls')}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="page-break-before: always;"></div>
          
          <div class="section-title">Diagnostics & Identified Issues</div>
          ${diagnosticsHtml}
          
          <div style="page-break-before: always;"></div>
          
          <div class="section-title">AI-Powered Optimization Recommendations</div>
          ${fixesHtml}
        </div>
      </body>
    </html>
  `;
}

export async function generatePdf(payload) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const htmlContent = buildReportHtml(payload);
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Print background is required to display correct badge and card borders/colors
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm'
      }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
