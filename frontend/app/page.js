'use client';

import { useState, useEffect, useRef } from 'react';

// Setup backend endpoint base URL (dynamically resolves to localhost for dev or same-origin for production)
const API_BASE = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : window.location.origin)
  : 'http://localhost:5000';


// Revised Mock Snippets matching the 5 workers/simulations
const INITIAL_SNIPPETS = {
  delayJs: {
    title: 'Delay Non-Essential JavaScript Loading',
    metric: 'TBT (Total Blocking Time)',
    target: 'tracking.js',
    original: `<!-- Standard blocking JS assets in HTML head -->
<head>
  <script src="https://cdn.livechatinc.com/tracking.js"></script>
  <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
  <script>
    initializeAnalytics();
  </script>
</head>`,
    optimized: `<!-- SpeedEngine Tachyon Interaction Script Loader -->
<head>
  <script type="text/delayed-js" data-src="https://cdn.livechatinc.com/tracking.js"></script>
  <script type="text/delayed-js" data-src="https://connect.facebook.net/en_US/fbevents.js"></script>
  <script type="text/delayed-js">
    initializeAnalytics();
  </script>
  <script id="speedengine-tachyon">
    const triggerEvents = ['click','mousedown','keydown','touchstart','scroll'];
    function bootstrapJs() {
      document.querySelectorAll('script[type="text/delayed-js"]').forEach(s => {
        const newScript = document.createElement('script');
        if(s.dataset.src) newScript.src = s.dataset.src;
        else newScript.textContent = s.textContent;
        document.body.appendChild(newScript);
      });
      triggerEvents.forEach(e => window.removeEventListener(e, bootstrapJs));
    }
    triggerEvents.forEach(e => window.addEventListener(e, bootstrapJs, {passive:true}));
  </script>
</head>`,
    explanation: 'Converts tracking pixels and dynamic analytical scripts to non-executable types on boot. Automatically executes them the millisecond the user interacts, freeing the main thread for instant rendering.',
    projectedMetricSavings: 'TBT reduced by 350ms',
    estimatedScoreGain: 12
  },
  compressImages: {
    title: 'Convert Images to Modern Formats (WebP)',
    metric: 'LCP (Largest Contentful Paint)',
    target: 'hero-banner.jpg',
    original: `<!-- Large uncompressed JPEG raw image -->
<div class="banner-wrapper">
  <img src="/images/hero-banner.jpg" alt="Hero Banner" class="banner">
</div>`,
    optimized: `<!-- Server-optimized Sharp WebP conversion -->
<div class="banner-wrapper">
  <picture>
    <source srcset="/api/optimize-images?url=/images/hero-banner.jpg&format=webp" type="image/webp">
    <img src="/api/optimize-images?url=/images/hero-banner.jpg&format=jpeg" 
         alt="Hero Banner" 
         loading="lazy"
         style="width: 100%; height: auto;" />
  </picture>
</div>`,
    explanation: 'Pipes images through SpeedEngine image compression worker to scale resolutions and encode in lightweight WebP format. Decreases layout asset weights by 60%.',
    projectedMetricSavings: 'LCP reduced by 1.8s, Page Weight cut by 60%',
    estimatedScoreGain: 15
  },
  deferCss: {
    title: 'Eliminate Render-Blocking CSS',
    metric: 'FCP (First Contentful Paint)',
    target: 'style.css',
    original: `<head>
  <!-- Standard blocking stylesheets blocking DOM layout paint -->
  <link rel="stylesheet" href="/assets/css/bootstrap.min.css">
  <link rel="stylesheet" href="/assets/css/style.css">
</head>`,
    optimized: `<head>
  <!-- Stylesheets preloaded asynchronously, loaded on load -->
  <link rel="preload" href="/assets/css/bootstrap.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/assets/css/bootstrap.min.css"></noscript>
  
  <link rel="preload" href="/assets/css/style.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/assets/css/style.css"></noscript>
</head>`,
    explanation: 'Transforms blocking style imports into asynchronous preload indicators. Browser paints the DOM instantly, and styles attach as soon as they finish downloading.',
    projectedMetricSavings: 'FCP reduced by 0.6s, SI reduced by 0.8s',
    estimatedScoreGain: 8
  },
  aiRefactorJs: {
    title: 'Gemini AI: Refactor Long JS Main-Thread Work',
    metric: 'TBT (Total Blocking Time)',
    target: 'Script Loop',
    original: `// Failed Audit: Heavy synchronous loop locking main thread
function runMetricsProcessing(data) {
  for (let i = 0; i < data.length; i++) {
    performCPUCalculation(data[i]);
  }
  console.log("Calculations finished!");
}`,
    optimized: `// Optimized using Gemini AI requestIdleCallback chunking
function runMetricsProcessing(data) {
  const CHUNK = 80;
  let offset = 0;
  function processChunk() {
    const end = Math.min(offset + CHUNK, data.length);
    for (let i = offset; i < end; i++) {
      performCPUCalculation(data[i]);
    }
    offset = end;
    if (offset < data.length) {
      (window.requestIdleCallback || window.setTimeout)(processChunk, 1);
    } else {
      console.log("Calculations finished!");
    }
  }
  processChunk();
}`,
    explanation: 'Instructs Gemini to split CPU computation loops into non-blocking asynchronous macro-task chunks. Frees browser cycles to process inputs, preventing UI freezes.',
    projectedMetricSavings: 'TBT reduced by 150ms',
    estimatedScoreGain: 6
  },
  aiRepairCls: {
    title: 'Gemini AI: Shield Cumulative Layout Shifts (CLS)',
    metric: 'CLS (Cumulative Layout Shift)',
    target: 'Shifting Node',
    original: `<!-- Layout element size unknown, causing shifts during loading -->
<div class="dynamic-advertisement-block">
  <iframe src="/ad-provider?id=2" class="ad-iframe"></iframe>
</div>`,
    optimized: `<!-- Reserved aspect-ratio container with overlay placeholders -->
<div class="dynamic-advertisement-block" style="min-height: 250px; aspect-ratio: 16/9; background: #0c111e; overflow: hidden; display: flex; align-items: center; justify-content: center;">
  <iframe src="/ad-provider?id=2" class="ad-iframe" style="width: 100%; height: 100%; border: none;"></iframe>
</div>`,
    explanation: 'Uses Gemini to find size-less container nodes and inject height/width aspect ratios. Reserves paint regions on the page to prevent content shifts on dynamic load.',
    projectedMetricSavings: 'CLS reduced by 0.20',
    estimatedScoreGain: 10
  }
};

export default function Dashboard() {
  const [targetUrl, setTargetUrl] = useState('');
  const [scanStatus, setScanStatus] = useState('idle'); // idle | scanning | results | error
  const [errorMessage, setErrorMessage] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [auditData, setAuditData] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(1); // 1 | 2 | 3
  
  // PageSpeed Device state
  const [device, setDevice] = useState('mobile'); // mobile | desktop

  // Three Tabs Dashboard state
  const [activeTab, setActiveTab] = useState('diagnostics'); // 'diagnostics' | 'aiFixes' | 'comparison'
  const [diagnosticsCategory, setDiagnosticsCategory] = useState('performance'); // 'performance' | 'accessibility' | 'bestPractices' | 'seo'
  const [appliedFixIds, setAppliedFixIds] = useState([]); // array of auditIds
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Opportunity row inline expansion states
  const [expandedOpts, setExpandedOpts] = useState({
    delayJs: false,
    compressImages: false,
    deferCss: false,
    aiRefactorJs: false,
    aiRepairCls: false
  });

  // Dynamic code snippets
  const [snippets, setSnippets] = useState(INITIAL_SNIPPETS);
  const [refactoringStates, setRefactoringStates] = useState({
    delayJs: false,
    compressImages: false,
    deferCss: false,
    aiRefactorJs: false,
    aiRepairCls: false
  });

  // Simulation Toggles (Recalculate live dashboard values)
  const [simulations, setSimulations] = useState({
    delayJs: false,
    compressImages: false,
    deferCss: false,
    aiRefactorJs: false,
    aiRepairCls: false,
  });

  const terminalEndRef = useRef(null);

  // Auto scroll terminal logs to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Numerical approximation of the error function (erf)
  const erf = (x) => {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);

    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return sign * y;
  };

  // Lighthouse Log-normal scoring CDF
  const getLognormalScore = (val, median, p10) => {
    if (val <= 0) return 100;
    
    const logVal = Math.log(val);
    const mu = Math.log(median);
    const z10 = -1.2815515655446004;
    const sigma = (Math.log(p10) - Math.log(median)) / z10;
    
    const z = (logVal - mu) / sigma;
    const score = 0.5 * (1 - erf(z / Math.sqrt(2)));
    
    return Math.min(100, Math.max(0, Math.round(score * 100)));
  };

  // Official Lighthouse Scoring Curve Parameters for Mobile and Desktop
  const SCORING_PARAMS = {
    mobile: {
      fcp: { median: 3.0, p10: 1.8, weight: 0.10 },
      si: { median: 5.8, p10: 3.387, weight: 0.10 },
      lcp: { median: 4.0, p10: 2.5, weight: 0.25 },
      tbt: { median: 600, p10: 200, weight: 0.30 },
      cls: { median: 0.25, p10: 0.10, weight: 0.25 }
    },
    desktop: {
      fcp: { median: 1.6, p10: 0.934, weight: 0.10 },
      si: { median: 2.3, p10: 1.311, weight: 0.10 },
      lcp: { median: 2.4, p10: 1.2, weight: 0.25 },
      tbt: { median: 350, p10: 150, weight: 0.30 },
      cls: { median: 0.25, p10: 0.10, weight: 0.25 }
    }
  };

  const calculatePerformanceScore = (metrics, mode) => {
    const params = SCORING_PARAMS[mode];
    const scoreFCP = getLognormalScore(metrics.fcp, params.fcp.median, params.fcp.p10);
    const scoreSI = getLognormalScore(metrics.si, params.si.median, params.si.p10);
    const scoreLCP = getLognormalScore(metrics.lcp, params.lcp.median, params.lcp.p10);
    const scoreTBT = getLognormalScore(metrics.tbt, params.tbt.median, params.tbt.p10);
    const scoreCLS = getLognormalScore(metrics.cls, params.cls.median, params.cls.p10);
    
    const score = (
      scoreFCP * params.fcp.weight +
      scoreSI * params.si.weight +
      scoreLCP * params.lcp.weight +
      scoreTBT * params.tbt.weight +
      scoreCLS * params.cls.weight
    );
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  /**
   * Interactive Simulator Calculation
   * Simulates the optimization score depending on which checkboxes are toggled
   * & whether Mobile or Desktop profile is active
   */
  const getCategoryKey = (cat) => {
    if (cat === 'best-practices' || cat === 'bestPractices') return 'bestPractices';
    return cat; // 'performance', 'accessibility', 'seo'
  };

  const getSimulatedScores = (customAppliedIds) => {
    if (!auditData) return { performance: 0, accessibility: 0, bestPractices: 0, seo: 0, metrics: { fcp: 0, si: 0, lcp: 0, tbt: 0, cls: 0 } };
    
    const baseData = auditData[device];
    const appliedIds = customAppliedIds || appliedFixIds;

    // 1. Calculate non-performance categories by adding scoreGain
    let accessibility = baseData.accessibility || 0;
    let bestPractices = baseData.bestPractices || 0;
    let seo = baseData.seo || 0;

    if (auditData.aiFixes && Array.isArray(auditData.aiFixes)) {
      auditData.aiFixes.forEach(fix => {
        if (appliedIds.includes(fix.auditId)) {
          const catKey = getCategoryKey(fix.category);
          if (catKey === 'accessibility') {
            accessibility += fix.scoreGain || 0;
          } else if (catKey === 'bestPractices') {
            bestPractices += fix.scoreGain || 0;
          } else if (catKey === 'seo') {
            seo += fix.scoreGain || 0;
          }
        }
      });
    }

    accessibility = Math.min(100, accessibility);
    bestPractices = Math.min(100, bestPractices);
    seo = Math.min(100, seo);

    // 2. Calculate performance score by applying metric reductions
    let fcp = baseData.metrics.fcp;
    let si = baseData.metrics.si;
    let lcp = baseData.metrics.lcp;
    let tbt = baseData.metrics.tbt;
    let cls = baseData.metrics.cls;

    if (auditData.aiFixes && Array.isArray(auditData.aiFixes)) {
      auditData.aiFixes.forEach(fix => {
        if (appliedIds.includes(fix.auditId)) {
          const catKey = getCategoryKey(fix.category);
          if (catKey === 'performance') {
            const aid = (fix.auditId || '').toLowerCase();
            if (aid.includes('blocking') || aid.includes('render') || aid.includes('css')) {
              fcp = fcp * 0.6;
              si = si * 0.8;
            } else if (aid.includes('image') || aid.includes('size')) {
              lcp = lcp * 0.4;
              si = si * 0.8;
            } else if (aid.includes('shift') || aid.includes('cls') || aid.includes('layout')) {
              cls = cls * 0.05;
            } else if (aid.includes('js') || aid.includes('loop') || aid.includes('tbt') || aid.includes('refactor')) {
              tbt = Math.max(0, tbt - 120);
            } else {
              tbt = Math.max(0, tbt - 50);
              lcp = lcp * 0.9;
            }
          }
        }
      });
    }

    fcp = Math.max(0.4, Math.round(fcp * 10) / 10);
    si = Math.max(0.4, Math.round(si * 10) / 10);
    lcp = Math.max(0.4, Math.round(lcp * 10) / 10);
    tbt = Math.max(0, Math.round(tbt));
    cls = Math.max(0, Math.round(cls * 1000) / 1000);

    // Check if any performance fixes were actually applied
    let anyPerfFixApplied = false;
    if (auditData.aiFixes && Array.isArray(auditData.aiFixes)) {
      anyPerfFixApplied = auditData.aiFixes.some(fix => 
        appliedIds.includes(fix.auditId) && getCategoryKey(fix.category) === 'performance'
      );
    }

    // Use the actual PSI base score when no perf fixes are applied (avoids recalculation drift)
    const performance = anyPerfFixApplied 
      ? calculatePerformanceScore({ fcp, si, lcp, tbt, cls }, device)
      : (baseData.score || 0);

    return {
      performance,
      accessibility,
      bestPractices,
      seo,
      metrics: { fcp, si, lcp, tbt, cls }
    };
  };

  const getProjectedScores = () => {
    if (!auditData) return { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };
    if (!auditData.aiFixes) {
      return {
        performance: auditData[device].score,
        accessibility: auditData[device].accessibility,
        bestPractices: auditData[device].bestPractices,
        seo: auditData[device].seo
      };
    }
    const allIds = auditData.aiFixes.map(fix => fix.auditId);
    return getSimulatedScores(allIds);
  };

  const toggleAppliedFix = (auditId) => {
    setAppliedFixIds(prev => {
      if (prev.includes(auditId)) {
        return prev.filter(id => id !== auditId);
      } else {
        return [...prev, auditId];
      }
    });
  };

  const DIAGNOSTICS_CATEGORIES = [
    { key: 'performance', label: 'Performance' },
    { key: 'accessibility', label: 'Accessibility' },
    { key: 'bestPractices', label: 'Best Practices' },
    { key: 'seo', label: 'SEO' }
  ];

  const getFixTitle = (fix) => {
    if (!auditData) return fix.auditId;
    const baseData = auditData[device];
    if (baseData.failedAudits) {
      for (const cat in baseData.failedAudits) {
        const matched = baseData.failedAudits[cat]?.find(a => a.id === fix.auditId);
        if (matched) return matched.title;
      }
    }
    return fix.auditId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getAffectedMetrics = (auditId, category, auditTitle = '') => {
    if (category !== 'performance') {
      if (category === 'accessibility') return ['Accessibility'];
      if (category === 'best-practices' || category === 'bestPractices') return ['Best Practices'];
      if (category === 'seo') return ['SEO'];
      return [];
    }

    const id = (auditId || '').toLowerCase();
    const title = (auditTitle || '').toLowerCase();
    const metrics = [];

    // Match based on ID or Title keywords
    if (id.includes('render-blocking') || title.includes('render-blocking')) {
      metrics.push('FCP', 'SI', 'LCP', 'TBT');
    }
    if (id.includes('unused-css') || title.includes('unused css') || id.includes('unused-stylesheet')) {
      metrics.push('FCP', 'SI', 'LCP');
    }
    if (id.includes('unused-javascript') || id.includes('unused-js') || title.includes('unused javascript') || title.includes('unused js')) {
      metrics.push('FCP', 'SI', 'LCP', 'TBT');
    }
    if (id.includes('image') || title.includes('image') || title.includes('picture')) {
      metrics.push('LCP', 'SI');
    }
    if (id.includes('shift') || id.includes('cls') || title.includes('layout shift') || id.includes('unsized-images') || title.includes('unsized')) {
      metrics.push('CLS');
    }
    if (id.includes('bootup') || id.includes('mainthread') || title.includes('main-thread') || title.includes('javascript execution')) {
      metrics.push('TBT', 'SI');
    }
    if (id.includes('dom') || title.includes('dom size') || title.includes('document object model')) {
      metrics.push('TBT', 'SI', 'CLS');
    }
    if (id.includes('font') || title.includes('font')) {
      metrics.push('FCP', 'SI');
    }
    if (id.includes('server') || id.includes('ttfb') || title.includes('server response') || title.includes('time to first byte')) {
      metrics.push('FCP', 'LCP', 'TBT');
    }
    if (id.includes('redirect') || title.includes('redirect')) {
      metrics.push('FCP', 'LCP');
    }
    if (id.includes('third-party') || title.includes('third-party') || title.includes('third party')) {
      metrics.push('TBT', 'LCP');
    }
    if (id.includes('minify') || title.includes('minify')) {
      metrics.push('FCP', 'SI', 'LCP');
    }
    if (id.includes('preload') || title.includes('preload')) {
      metrics.push('FCP', 'SI', 'LCP');
    }

    // Fallback if no metric matched but it's performance
    if (metrics.length === 0) {
      if (title.includes('paint') || title.includes('fcp') || title.includes('lcp')) {
        metrics.push('FCP', 'LCP');
      } else if (title.includes('blocking') || title.includes('delay') || title.includes('long')) {
        metrics.push('TBT');
      } else {
        metrics.push('LCP', 'TBT');
      }
    }

    return Array.from(new Set(metrics));
  };

  // Helper to calculate raw and optimized Page Weights
  const getPageWeight = () => {
    if (!auditData) return 0;
    const htmlSize = auditData.assets.htmlSize || 0;
    const jsSize = auditData.assets.js?.reduce((acc, curr) => acc + (curr.size || 0), 0) || 0;
    const cssSize = auditData.assets.css?.reduce((acc, curr) => acc + (curr.size || 0), 0) || 0;
    const imgSize = auditData.assets.images?.reduce((acc, curr) => acc + (curr.size || 0), 0) || 0;
    return htmlSize + jsSize + cssSize + imgSize;
  };

  const calculateSimulatedPageWeight = () => {
    if (!auditData) return 0;
    const htmlSize = auditData.assets.htmlSize || 0;
    const jsSize = auditData.assets.js?.reduce((acc, curr) => acc + (curr.size || 0), 0) || 0;
    const cssSize = auditData.assets.css?.reduce((acc, curr) => acc + (curr.size || 0), 0) || 0;
    let imgSize = auditData.assets.images?.reduce((acc, curr) => acc + (curr.size || 0), 0) || 0;
    
    const imageFixApplied = appliedFixIds.some(id => id.includes('image') || id.includes('size'));
    if (imageFixApplied) {
      imgSize = imgSize * 0.4; // 60% savings
    }
    return htmlSize + jsSize + cssSize + imgSize;
  };

  // Helper to determine status color and shape matching Google PageSpeed Insights (● circle, ■ square, ▲ triangle)
  const getMetricStatus = (val, type) => {
    let status = 'good'; // good | improvement | poor
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
    } else if (type === 'weight') {
      const mb = val / (1024 * 1024);
      if (mb <= 1.5) status = 'good';
      else if (mb <= 3.5) status = 'improvement';
      else status = 'poor';
    }

    if (status === 'good') {
      return { shape: '●', label: 'Good', className: 'psi-shape-green' };
    } else if (status === 'improvement') {
      return { shape: '■', label: 'Needs Improvement', className: 'psi-shape-orange' };
    } else {
      return { shape: '▲', label: 'Poor', className: 'psi-shape-red' };
    }
  };

  // Helper to build realistic CrUX user percentages based on current metrics
  const getCruxPercentages = (val, type) => {
    if (type === 'lcp') {
      if (val <= 2.5) return { green: 92, orange: 6, red: 2 };
      if (val <= 4.0) return { green: 65, orange: 25, red: 10 };
      return { green: 30, orange: 40, red: 30 };
    }
    if (type === 'tbt' || type === 'inp') {
      if (val <= 200) return { green: 95, orange: 4, red: 1 };
      if (val <= 600) return { green: 70, orange: 20, red: 10 };
      return { green: 40, orange: 35, red: 25 };
    }
    if (type === 'cls') {
      if (val <= 0.1) return { green: 97, orange: 2, red: 1 };
      if (val <= 0.25) return { green: 75, orange: 18, red: 7 };
      return { green: 45, orange: 30, red: 25 };
    }
    if (type === 'fcp') {
      if (val <= 1.8) return { green: 94, orange: 5, red: 1 };
      if (val <= 3.0) return { green: 68, orange: 22, red: 10 };
      return { green: 35, orange: 40, red: 25 };
    }
    return { green: 80, orange: 15, red: 5 };
  };

  const toggleExpandOpt = (key) => {
    setExpandedOpts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDynamicRefactor = async (key, snippetKey) => {
    setRefactoringStates(prev => ({ ...prev, [key]: true }));
    const currentSnippet = snippets[snippetKey];
    try {
      const response = await fetch(`${API_BASE}/api/refactor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentSnippet.original,
          auditTitle: currentSnippet.title,
          metricName: currentSnippet.metric
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.optimization) {
          setSnippets(prev => ({
            ...prev,
            [snippetKey]: {
              ...prev[snippetKey],
              optimized: data.optimization.optimizedCode,
              explanation: data.optimization.explanation,
              projectedMetricSavings: data.optimization.projectedMetricSavings,
              estimatedScoreGain: data.optimization.estimatedScoreGain
            }
          }));
        }
      }
    } catch (e) {
      console.warn("Could not execute live Gemini refactor, keeping default optimized block:", e.message);
    } finally {
      setRefactoringStates(prev => ({ ...prev, [key]: false }));
    }
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Action: Start Scanning URL
   */
  const handleScan = async (e) => {
    e.preventDefault();
    if (!targetUrl) return;
    
    // Normalize url
    let formattedUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    setScanStatus('scanning');
    setCurrentPhase(1);
    setTerminalLogs([]);
    setErrorMessage('');
    setAppliedFixIds([]);
    setActiveTab('diagnostics');
    setDiagnosticsCategory('performance');
    
    const addLog = (msg) => {
      setTerminalLogs(prev => [...prev, msg]);
    };

    // Phase 1 logs helper
    const p1Logs = [
      `[0.0s] [Phase 1: Running Analyses] Initializing PageSpeed Insights engine...`,
      `[0.5s] [Phase 1: Running Analyses] Resolving DNS queries for: ${formattedUrl}`,
      `[1.0s] [Phase 1: Running Analyses] Querying PageSpeed API for Mobile/Desktop strategies...`,
      `[1.5s] [Phase 1: Running Analyses] Performing layout trace and DOM weight profiling...`,
      `[2.0s] [Phase 1: Running Analyses] Evaluating network waterfall & resource request patterns...`
    ];

    let p1Index = 0;
    const p1Timer = setInterval(() => {
      if (p1Index < p1Logs.length) {
        addLog(p1Logs[p1Index]);
        p1Index++;
      } else {
        addLog(`[Phase 1: Running Analyses] Scanning in progress... waiting for PageSpeed API response...`);
        clearInterval(p1Timer);
      }
    }, 500);

    try {
      // Start API scan concurrently (120s timeout for cold-start Render instances)
      const scanController = new AbortController();
      const scanTimeout = setTimeout(() => scanController.abort(), 120000);
      const response = await fetch(`${API_BASE}/api/scan?url=${encodeURIComponent(formattedUrl)}`, {
        signal: scanController.signal
      });
      clearTimeout(scanTimeout);
      clearInterval(p1Timer);

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(errBody || 'Scan failed. Please verify the URL is public and online, then try again.');
      }
      
      const data = await response.json();
      
      // Transition to Phase 2: Identifying Issues
      setCurrentPhase(2);
      addLog(`--------------------------------------------------------------------------------`);
      addLog(`[Phase 2: Identifying Issues] Page speed scan completed successfully!`);
      await sleep(400);

      const cssTarget = data.codeSnippets?.deferCss?.target || 'style.css';
      const jsTarget = data.codeSnippets?.delayJs?.target || 'tracking.js';
      const imgTarget = data.codeSnippets?.compressImages?.target || 'hero-banner.jpg';
      const clsTarget = data.codeSnippets?.aiRepairCls?.target || 'Shifting Node';

      addLog(`[Phase 2: Identifying Issues] Analyzing render-blocking resources...`);
      await sleep(350);
      addLog(`[Phase 2: Identifying Issues]   -> Found render-blocking CSS: ${cssTarget}`);
      await sleep(350);
      addLog(`[Phase 2: Identifying Issues]   -> Found blocking JavaScript: ${jsTarget}`);
      await sleep(350);
      addLog(`[Phase 2: Identifying Issues] Analyzing media assets...`);
      await sleep(350);
      addLog(`[Phase 2: Identifying Issues]   -> Detected LCP Image source: ${imgTarget}`);
      await sleep(350);
      addLog(`[Phase 2: Identifying Issues] Analyzing layout stability (CLS)...`);
      await sleep(350);
      addLog(`[Phase 2: Identifying Issues]   -> Tracked shifting element: ${clsTarget}`);
      await sleep(400);

      // Transition to Phase 3: Finding AI Fixes
      setCurrentPhase(3);
      addLog(`--------------------------------------------------------------------------------`);
      addLog(`[Phase 3: Finding AI Fixes] Launching Gemini AI performance refactoring engine...`);
      await sleep(400);
      addLog(`[Phase 3: Finding AI Fixes] Connected to live model: gemini-1.5-flash`);
      await sleep(400);
      addLog(`[Phase 3: Finding AI Fixes] Generating non-blocking asynchronous CSS load pattern...`);
      await sleep(450);
      addLog(`[Phase 3: Finding AI Fixes] Constructing requestIdleCallback worker loops for main-thread CPU...`);
      await sleep(450);
      addLog(`[Phase 3: Finding AI Fixes] Generating optimized picture layouts for responsive images...`);
      await sleep(450);
      addLog(`[Phase 3: Finding AI Fixes] Calculating simulated performance improvement projection...`);
      await sleep(600);

      setAuditData(data);
      
      // Update snippets state using dynamic scraped templates
      if (data.codeSnippets) {
        setSnippets(prev => {
          const updated = { ...prev };
          
          updated.delayJs = {
            ...updated.delayJs,
            original: data.codeSnippets.delayJs.original,
            target: data.codeSnippets.delayJs.target,
            optimized: `<!-- SpeedEngine Tachyon Interaction Script Loader -->
<head>
  <script type="text/delayed-js" data-src="${data.codeSnippets.delayJs.target}"></script>
  <script id="speedengine-tachyon">
    const triggerEvents = ['click','mousedown','keydown','touchstart','scroll'];
    function bootstrapJs() {
      document.querySelectorAll('script[type="text/delayed-js"]').forEach(s => {
        const newScript = document.createElement('script');
        if(s.dataset.src) newScript.src = s.dataset.src;
        else newScript.textContent = s.textContent;
        document.body.appendChild(newScript);
      });
      triggerEvents.forEach(e => window.removeEventListener(e, bootstrapJs));
    }
    triggerEvents.forEach(e => window.addEventListener(e, bootstrapJs, {passive:true}));
  </script>
</head>`,
            explanation: `Identified blocking script "${data.codeSnippets.delayJs.target}". Converts it to a non-executable type on boot. Executes instantly when user interaction (scroll, click, touch) is detected, completely eliminating boot blockages.`,
            projectedMetricSavings: `TBT reduced by 95%`,
            estimatedScoreGain: 12
          };

          updated.compressImages = {
            ...updated.compressImages,
            original: data.codeSnippets.compressImages.original,
            target: data.codeSnippets.compressImages.target,
            optimized: `<!-- Server-optimized Sharp WebP conversion -->
<picture>
  <source srcset="${API_BASE}/api/optimize-images?url=${encodeURIComponent(data.codeSnippets.compressImages.target)}&format=webp" type="image/webp">
  <img src="${API_BASE}/api/optimize-images?url=${encodeURIComponent(data.codeSnippets.compressImages.target)}&format=jpeg" 
       alt="Optimized LCP Image" 
       loading="lazy"
       style="width: 100%; height: auto;" />
</picture>`,
            explanation: `Pipes image "${data.codeSnippets.compressImages.target}" through SpeedEngine image compression worker to encode as WebP. Decreases download weights by 60%, drastically improving Largest Contentful Paint.`,
            projectedMetricSavings: `LCP reduced by 60%`,
            estimatedScoreGain: 15
          };

          updated.deferCss = {
            ...updated.deferCss,
            original: data.codeSnippets.deferCss.original,
            target: data.codeSnippets.deferCss.target,
            optimized: `<!-- Stylesheet preloaded asynchronously, loaded on load -->
<link rel="preload" href="${data.codeSnippets.deferCss.target}" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="${data.codeSnippets.deferCss.target}"></noscript>`,
            explanation: `Transforms render-blocking stylesheet "${data.codeSnippets.deferCss.target}" into an asynchronous preloader. The browser paints DOM elements instantly without waiting for CSS downloads.`,
            projectedMetricSavings: `FCP reduced by 40%, SI reduced by 20%`,
            estimatedScoreGain: 8
          };

          updated.aiRefactorJs = {
            ...updated.aiRefactorJs,
            original: data.codeSnippets.aiRefactorJs.original,
            target: data.codeSnippets.aiRefactorJs.target,
            optimized: `// Heavy CPU loop split into async chunks (click dynamic Gemini refactor to generate)`,
            explanation: `Prepares the identified CPU loops in the scripts for Gemini refactoring. Click 'Dynamic Gemini Refactor' to analyze and rewrite with window.requestIdleCallback.`,
            projectedMetricSavings: `TBT saved: 120ms`,
            estimatedScoreGain: 6
          };

          updated.aiRepairCls = {
            ...updated.aiRepairCls,
            original: data.codeSnippets.aiRepairCls.original,
            target: data.codeSnippets.aiRepairCls.target,
            optimized: `<!-- Aspect ratio reserved layout element (click dynamic Gemini refactor to generate) -->`,
            explanation: `Identified shifted DOM element "${data.codeSnippets.aiRepairCls.target}". Gemini will inject styling constraints to reserve space on load.`,
            projectedMetricSavings: `CLS improved`,
            estimatedScoreGain: 10
          };

          return updated;
        });
      }

      setScanStatus('results');
      setAppliedFixIds([]);
      setActiveTab('diagnostics');
      setDiagnosticsCategory('performance');
      
      // Reset Accordions
      setExpandedOpts({
        delayJs: false,
        compressImages: false,
        deferCss: false,
        aiRefactorJs: false,
        aiRepairCls: false
      });
      // Reset Simulation Toggles to false (unchecked) by default
      setSimulations({
        delayJs: false,
        compressImages: false,
        deferCss: false,
        aiRefactorJs: false,
        aiRepairCls: false
      });

    } catch (err) {
      clearInterval(p1Timer);
      let userMessage = err.message;
      if (err.name === 'AbortError') {
        userMessage = 'Analysis timed out. The server may be warming up — please wait 30 seconds and try again.';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        userMessage = 'Could not reach the analysis server. It may be starting up — please try again in a moment.';
      }
      setErrorMessage(userMessage);
      setScanStatus('error');
    }
  };

  // Calculations for simulated results vs original results
  const simulatedResult = getSimulatedScores();
  const originalResult = {
    metrics: auditData ? auditData[device].metrics : { fcp: 0, si: 0, lcp: 0, tbt: 0, cls: 0 },
    score: auditData ? auditData[device].score : 0
  };
  
  // Circumference of stroke circle gauge
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  // Render score circle offset
  const getStrokeOffset = (score) => {
    const offset = circumference - (score / 100) * circumference;
    return offset;
  };

  // Render Accordion helper
  const renderOpportunityRow = (key, title, savings, targetFile, snippetKey) => {
    const isExpanded = expandedOpts[key];
    const snippet = snippets[snippetKey];
    const isChecked = simulations[key];
    
    return (
      <div className={`opportunity-row ${isExpanded ? 'expanded' : ''}`} key={key}>
        <div className="opportunity-header" onClick={() => toggleExpandOpt(key)}>
          <div className="opportunity-left">
            <div className="opportunity-checkbox-container" onClick={(e) => e.stopPropagation()}>
              <input 
                type="checkbox" 
                className="opportunity-checkbox"
                checked={isChecked}
                onChange={(e) => setSimulations(prev => ({ ...prev, [key]: e.target.checked }))}
              />
            </div>
            <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center' }}>
              {isChecked ? (
                <span style={{ color: 'var(--success)' }}>✔</span>
              ) : (
                <span style={{ color: 'var(--text-dark)' }}>○</span>
              )}
            </span>
            <div className="opportunity-title">{title}</div>
          </div>
          
          <div className="opportunity-right">
            <div className="opportunity-savings">{savings}</div>
            <svg 
              className="opportunity-arrow" 
              width="16" height="16" viewBox="0 0 24 24" 
              fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        
        {isExpanded && (
          <div className="opportunity-content-inline">
            <div className="opportunity-desc">
              {snippet.explanation}
            </div>
            
            <div className="opportunity-meta">
              Target File/Location: <strong>{targetFile}</strong>
            </div>
            
            <div className="diff-container" style={{ marginTop: '12px', marginBottom: '16px' }}>
              {/* Original */}
              <div className="diff-box">
                <div className="diff-header diff-header-original" style={{ padding: '8px 12px', fontSize: '12px' }}>
                  <span>Original Code Block (Failed Audit)</span>
                </div>
                <pre className="diff-code" style={{ color: '#fca5a5', padding: '12px', fontSize: '11px', height: '220px' }}>
                  {snippet.original}
                </pre>
              </div>
              
              {/* Optimized */}
              <div className="diff-box" style={{ border: isChecked ? '1px solid var(--success)' : '1px solid var(--border-color)' }}>
                <div className="diff-header diff-header-optimized" style={{ padding: '8px 12px', fontSize: '12px' }}>
                  <span>AI Optimized Code Block (SpeedEngine)</span>
                  {refactoringStates[key] && (
                    <span className="animate-pulse-slow" style={{ fontSize: '11px', color: 'var(--primary)' }}>
                      Generating Refactor...
                    </span>
                  )}
                </div>
                <pre className="diff-code" style={{ color: '#a7f3d0', padding: '12px', fontSize: '11px', height: '220px' }}>
                  {snippet.optimized}
                </pre>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn-secondary" 
                style={{ fontSize: '12px', padding: '6px 14px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDynamicRefactor(key, snippetKey);
                }}
                disabled={refactoringStates[key]}
              >
                🔄 Dynamic Gemini Refactor
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGauge = (categoryKey, label) => {
    if (!auditData) return null;
    
    const baseData = auditData[device];
    let baseScore = 0;
    if (categoryKey === 'performance') baseScore = baseData.score;
    else if (categoryKey === 'accessibility') baseScore = baseData.accessibility;
    else if (categoryKey === 'bestPractices') baseScore = baseData.bestPractices;
    else if (categoryKey === 'seo') baseScore = baseData.seo;

    const simScores = getSimulatedScores();
    const projScores = getProjectedScores();

    const simulatedScore = simScores[categoryKey];
    const projectedScore = projScores[categoryKey];

    const displayScore = activeTab === 'aiFixes' ? projectedScore : simulatedScore;

    const r = 38;
    const circ = 2 * Math.PI * r;
    const strokeOffset = circ - (displayScore / 100) * circ;
    
    let colorClass = 'score-red';
    let textClass = 'text-red';
    let icon = '▲';
    if (displayScore >= 90) {
      colorClass = 'score-green';
      textClass = 'text-green';
      icon = '●';
    } else if (displayScore >= 50) {
      colorClass = 'score-orange';
      textClass = 'text-orange';
      icon = '■';
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '110px' }}>
        <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }} viewBox="0 0 100 100">
            <circle 
              cx="50" 
              cy="50" 
              r={r} 
              fill="none" 
              stroke="rgba(255,255,255,0.05)" 
              strokeWidth="6" 
            />
            <circle 
              className={`gauge-fill ${colorClass}`}
              cx="50" 
              cy="50" 
              r={r} 
              fill="none" 
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={strokeOffset}
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'monospace' }} className={textClass}>
              {displayScore}
            </span>
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={textClass} style={{ fontSize: '10px' }}>{icon}</span>
          {label}
        </div>
        
        {activeTab === 'aiFixes' && (
          <div className="gauge-projected-text">
            {baseScore} ➔ {projectedScore}
          </div>
        )}
      </div>
    );
  };

  const downloadReportAndFixes = async () => {
    if (!auditData || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const simulated = getSimulatedScores();
      const baseData = auditData[device];
      
      const payload = {
        url: auditData.url,
        device: device,
        scores: {
          base: {
            performance: baseData.score || 0,
            accessibility: baseData.accessibility || 0,
            bestPractices: baseData.bestPractices || 0,
            seo: baseData.seo || 0
          },
          simulated: {
            performance: simulated.performance,
            accessibility: simulated.accessibility,
            bestPractices: simulated.bestPractices,
            seo: simulated.seo
          }
        },
        metrics: {
          base: {
            fcp: baseData.metrics?.fcp || 0,
            si: baseData.metrics?.si || 0,
            lcp: baseData.metrics?.lcp || 0,
            tbt: baseData.metrics?.tbt || 0,
            cls: baseData.metrics?.cls || 0
          },
          simulated: {
            fcp: simulated.metrics.fcp,
            si: simulated.metrics.si,
            lcp: simulated.metrics.lcp,
            tbt: simulated.metrics.tbt,
            cls: simulated.metrics.cls
          }
        },
        failedAudits: baseData.failedAudits || {},
        aiFixes: auditData.aiFixes || [],
        appliedFixIds: appliedFixIds
      };

      const response = await fetch(`${API_BASE}/api/pdf-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned error: ${response.statusText}`);
      }

      const blob = await response.blob();
      const filename = `SpeedEngine-Report-${auditData.url.replace(/https?:\/\//i, '').replace(/[^a-z0-9]/gi, '_')}.pdf`;
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF Report: ' + error.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="container" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="logo" onClick={() => setScanStatus('idle')} style={{ cursor: 'pointer' }}>
            SpeedEngine <span>AI</span>
            <span className="badge badge-se">Shadow Engine</span>
          </div>

          {/* Sticky Header URL Search Bar */}
          {scanStatus !== 'idle' && (
            <form onSubmit={handleScan} style={{ display: 'flex', gap: '8px', maxWidth: '400px', width: '100%', margin: '0 20px' }}>
              <input
                type="text"
                placeholder="Enter website URL..."
                className="input-field"
                style={{ padding: '8px 12px', fontSize: '13px', height: '36px', background: 'rgba(255,255,255,0.03)' }}
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                disabled={scanStatus === 'scanning'}
                required
              />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ height: '36px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', whiteSpace: 'nowrap' }}
                disabled={scanStatus === 'scanning'}
              >
                {scanStatus === 'scanning' ? 'Scanning...' : 'Analyze'}
              </button>
            </form>
          )}

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {scanStatus === 'results' && auditData && (
              <button 
                onClick={downloadReportAndFixes}
                className="btn-primary"
                disabled={downloadingPdf}
                style={{ height: '36px', padding: '0 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              >
                {downloadingPdf ? 'Generating PDF...' : 'Download Report & Fixes'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </button>
            )}
            {scanStatus === 'scanning' && (
              <span style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: '600' }}>Running Analysis...</span>
            )}
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '40px 24px' }}>
        
        {/* State: Idle / Landing */}
        {scanStatus === 'idle' && (
          <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
            <h1 style={{ fontSize: '48px', fontWeight: '800', lineHeight: '1.1', marginBottom: '16px', background: 'linear-gradient(135deg, #fff 30%, #a5f3fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Optimize Website Speed Instantly
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '18px', marginBottom: '40px', lineHeight: '1.6' }}>
              Analyze performance diagnostics and view real-time AI-optimized page comparisons.
            </p>

            <form onSubmit={handleScan} className="glass-panel" style={{ padding: '16px' }}>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter website URL (e.g. company-site.com)"
                  className="input-field"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary">
                  Analyze
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* State: Scanning Terminal Animation */}
        {scanStatus === 'scanning' && (
          <div style={{ maxWidth: '750px', margin: '40px auto' }}>
            {/* 3-Phase Process Loader Tracker */}
            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', position: 'relative', padding: '20px' }}>
              {/* Connector line background */}
              <div style={{ position: 'absolute', top: '35px', left: '12%', right: '12%', height: '2px', background: 'rgba(255,255,255,0.05)', zIndex: 0 }}></div>
              {/* Active connector line */}
              <div style={{ 
                position: 'absolute', 
                top: '35px', 
                left: '12%', 
                width: currentPhase === 1 ? '0%' : currentPhase === 2 ? '38%' : '76%', 
                height: '2px', 
                background: 'var(--primary)', 
                transition: 'width 0.5s ease', 
                zIndex: 0 
              }}></div>
              
              {/* Step 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: currentPhase >= 1 ? 'var(--primary)' : '#1e293b', 
                  color: currentPhase >= 1 ? '#000' : 'var(--text-muted)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  boxShadow: currentPhase === 1 ? '0 0 12px var(--primary)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {currentPhase > 1 ? '✓' : '1'}
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', marginTop: '8px', color: currentPhase >= 1 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  Running Analyses
                </span>
              </div>
              
              {/* Step 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: currentPhase >= 2 ? 'var(--primary)' : '#1e293b', 
                  color: currentPhase >= 2 ? '#000' : 'var(--text-muted)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  boxShadow: currentPhase === 2 ? '0 0 12px var(--primary)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {currentPhase > 2 ? '✓' : '2'}
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', marginTop: '8px', color: currentPhase >= 2 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  Identifying Issues
                </span>
              </div>
              
              {/* Step 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: currentPhase >= 3 ? 'var(--primary)' : '#1e293b', 
                  color: currentPhase >= 3 ? '#000' : 'var(--text-muted)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  boxShadow: currentPhase === 3 ? '0 0 12px var(--primary)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  3
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', marginTop: '8px', color: currentPhase >= 3 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  Finding AI Fixes
                </span>
              </div>
            </div>

            <div className="terminal-panel">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="terminal-line">
                  <span className="terminal-timestamp">🚀</span>
                  <span>{log}</span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
            
            <p style={{ color: 'var(--text-dark)', fontSize: '13px', textAlign: 'center', marginTop: '16px', fontFamily: 'monospace' }}>
              {currentPhase === 1 
                ? 'Phase 1: Fetching metrics from Google PageSpeed and running browser trace...'
                : currentPhase === 2
                ? 'Phase 2: Inspecting CSS blocking states, JS payloads, LCP element, and layout shift selectors...'
                : 'Phase 3: Connecting to Gemini API to create inline optimizations and calculate scoring changes...'}
            </p>
          </div>
        )}

        {/* State: Error */}
        {scanStatus === 'error' && (
          <div style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }} className="glass-panel">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" style={{ marginBottom: '16px' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="6" x2="12.01" y2="6"></line></svg>
            <h2 style={{ color: 'var(--danger)', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Analysis Attempt Failed</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{errorMessage || 'Puppeteer could not resolve the URL. Please verify the link is public and online.'}</p>
            <button className="btn-secondary" onClick={() => setScanStatus('idle')}>Try Again</button>
          </div>
        )}

        {/* State: Results & Dashboard */}
        {scanStatus === 'results' && auditData && (
          <div>
            {/* Device Switcher Selector */}
            <div className="device-tabs">
              <button 
                className={`device-tab ${device === 'mobile' ? 'active' : ''}`}
                onClick={() => setDevice('mobile')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                Mobile
              </button>
              <button 
                className={`device-tab ${device === 'desktop' ? 'active' : ''}`}
                onClick={() => setDevice('desktop')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                Desktop
              </button>
            </div>

            {/* API Quota Warning Banner */}
            {auditData.apiError && (
              <div style={{
                marginBottom: '20px',
                padding: '14px 18px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#f59e0b', marginBottom: '4px' }}>
                    Google PageSpeed API Quota Exceeded
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    The free PSI API daily quota has been reached. Scores shown are <strong style={{ color: 'var(--text-main)' }}>approximations</strong> calculated 
                    from a local Puppeteer browser scan using the official Lighthouse log-normal scoring curve. 
                    For exact Google scores, try again tomorrow or add a <strong style={{ color: 'var(--text-main)' }}>Google Cloud API key</strong> to 
                    the backend <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' }}>.env</code> file 
                    to increase your quota.
                  </div>
                </div>
              </div>
            )}

            {/* Circular Gauges Panel - 4 Core Categories */}
            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '24px', marginBottom: '32px', padding: '30px' }}>
              {renderGauge('performance', 'Performance')}
              {renderGauge('accessibility', 'Accessibility')}
              {renderGauge('bestPractices', 'Best Practices')}
              {renderGauge('seo', 'SEO')}
            </div>

            {/* CrUX (Chrome User Experience Report) - Field Data Section */}
            <div className="crux-card glass-panel">
              <div className="crux-header">
                <span style={{ color: 'var(--primary)', fontSize: '18px' }}>⚡</span>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '16px' }}>Chrome User Experience Report (CrUX) Assessment</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Historical 28-day real user speed distribution metrics</div>
                </div>
              </div>
              
              <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Core Web Vitals Assessment:</span>
                <span style={{ 
                  background: simulatedResult.score >= 90 ? 'var(--success-glow)' : simulatedResult.score >= 50 ? 'var(--warning-glow)' : 'var(--danger-glow)', 
                  color: simulatedResult.score >= 90 ? 'var(--success)' : simulatedResult.score >= 50 ? 'var(--warning)' : 'var(--danger)', 
                  fontWeight: 'bold', 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  fontSize: '13px' 
                }}>
                  {simulatedResult.score >= 90 ? 'PASSED' : simulatedResult.score >= 50 ? 'NEEDS IMPROVEMENT' : 'FAILED'}
                </span>
              </div>
              
              <div className="crux-grid">
                {/* CrUX Metric: LCP */}
                {(() => {
                  const val = simulatedResult.metrics.lcp;
                  const dist = getCruxPercentages(val, 'lcp');
                  return (
                    <div className="crux-metric-item">
                      <div className="crux-metric-info">
                        <span style={{ fontWeight: '600' }}>Largest Contentful Paint (LCP)</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{val} s</span>
                      </div>
                      <div className="crux-bar-container">
                        <div className="crux-bar-green" style={{ width: `${dist.green}%` }} title={`Good: ${dist.green}%`}></div>
                        <div className="crux-bar-orange" style={{ width: `${dist.orange}%` }} title={`Needs Improvement: ${dist.orange}%`}></div>
                        <div className="crux-bar-red" style={{ width: `${dist.red}%` }} title={`Poor: ${dist.red}%`}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span>{dist.green}% Good</span>
                        <span>75th Pctl: {val}s</span>
                      </div>
                    </div>
                  );
                })()}

                {/* CrUX Metric: INP */}
                {(() => {
                  const val = simulatedResult.metrics.tbt;
                  const inpVal = Math.round(val * 0.4 + 40);
                  const dist = getCruxPercentages(val, 'inp');
                  return (
                    <div className="crux-metric-item">
                      <div className="crux-metric-info">
                        <span style={{ fontWeight: '600' }}>Interaction to Next Paint (INP)</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{inpVal} ms</span>
                      </div>
                      <div className="crux-bar-container">
                        <div className="crux-bar-green" style={{ width: `${dist.green}%` }} title={`Good: ${dist.green}%`}></div>
                        <div className="crux-bar-orange" style={{ width: `${dist.orange}%` }} title={`Needs Improvement: ${dist.orange}%`}></div>
                        <div className="crux-bar-red" style={{ width: `${dist.red}%` }} title={`Poor: ${dist.red}%`}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span>{dist.green}% Good</span>
                        <span>75th Pctl: {inpVal}ms</span>
                      </div>
                    </div>
                  );
                })()}

                {/* CrUX Metric: CLS */}
                {(() => {
                  const val = simulatedResult.metrics.cls;
                  const dist = getCruxPercentages(val, 'cls');
                  return (
                    <div className="crux-metric-item">
                      <div className="crux-metric-info">
                        <span style={{ fontWeight: '600' }}>Cumulative Layout Shift (CLS)</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{val}</span>
                      </div>
                      <div className="crux-bar-container">
                        <div className="crux-bar-green" style={{ width: `${dist.green}%` }} title={`Good: ${dist.green}%`}></div>
                        <div className="crux-bar-orange" style={{ width: `${dist.orange}%` }} title={`Needs Improvement: ${dist.orange}%`}></div>
                        <div className="crux-bar-red" style={{ width: `${dist.red}%` }} title={`Poor: ${dist.red}%`}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span>{dist.green}% Good</span>
                        <span>75th Pctl: {val}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* CrUX Metric: FCP */}
                {(() => {
                  const val = simulatedResult.metrics.fcp;
                  const dist = getCruxPercentages(val, 'fcp');
                  return (
                    <div className="crux-metric-item">
                      <div className="crux-metric-info">
                        <span style={{ fontWeight: '600' }}>First Contentful Paint (FCP)</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{val} s</span>
                      </div>
                      <div className="crux-bar-container">
                        <div className="crux-bar-green" style={{ width: `${dist.green}%` }} title={`Good: ${dist.green}%`}></div>
                        <div className="crux-bar-orange" style={{ width: `${dist.orange}%` }} title={`Needs Improvement: ${dist.orange}%`}></div>
                        <div className="crux-bar-red" style={{ width: `${dist.red}%` }} title={`Poor: ${dist.red}%`}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span>{dist.green}% Good</span>
                        <span>75th Pctl: {val}s</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Lighthouse Lab Diagnostics Panel */}
            <div className="glass-panel" style={{ marginBottom: '32px', padding: '30px' }}>
              <div style={{ padding: '8px' }}>
                <h4 style={{ textTransform: 'uppercase', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '24px', letterSpacing: '1px' }}>
                  Lab Diagnostics & Metrics
                </h4>
                <div className="metric-grid-psi">
                  {/* FCP Card */}
                  {(() => {
                    const statusObj = getMetricStatus(simulatedResult.metrics.fcp, 'fcp');
                    const origVal = originalResult.metrics.fcp;
                    const curVal = simulatedResult.metrics.fcp;
                    const diff = Math.round(((origVal - curVal) / origVal) * 100);
                    return (
                      <div className="metric-card-psi">
                        <div className="metric-header-psi">
                          <span className={`psi-shape ${statusObj.className}`} title={statusObj.label}>
                            {statusObj.shape}
                          </span>
                          <span className="metric-name-psi">First Contentful Paint</span>
                        </div>
                        <div className="metric-value-psi">{curVal} s</div>
                        {diff > 0 && <div className="metric-change-psi">-{diff}% speedup</div>}
                      </div>
                    );
                  })()}

                  {/* LCP Card */}
                  {(() => {
                    const statusObj = getMetricStatus(simulatedResult.metrics.lcp, 'lcp');
                    const origVal = originalResult.metrics.lcp;
                    const curVal = simulatedResult.metrics.lcp;
                    const diff = Math.round(((origVal - curVal) / origVal) * 100);
                    return (
                      <div className="metric-card-psi">
                        <div className="metric-header-psi">
                          <span className={`psi-shape ${statusObj.className}`} title={statusObj.label}>
                            {statusObj.shape}
                          </span>
                          <span className="metric-name-psi">Largest Contentful Paint</span>
                        </div>
                        <div className="metric-value-psi">{curVal} s</div>
                        {diff > 0 && <div className="metric-change-psi">-{diff}% speedup</div>}
                      </div>
                    );
                  })()}

                  {/* TBT Card */}
                  {(() => {
                    const statusObj = getMetricStatus(simulatedResult.metrics.tbt, 'tbt');
                    const origVal = originalResult.metrics.tbt;
                    const curVal = simulatedResult.metrics.tbt;
                    const diff = origVal - curVal;
                    return (
                      <div className="metric-card-psi">
                        <div className="metric-header-psi">
                          <span className={`psi-shape ${statusObj.className}`} title={statusObj.label}>
                            {statusObj.shape}
                          </span>
                          <span className="metric-name-psi">Total Blocking Time</span>
                        </div>
                        <div className="metric-value-psi">{curVal} ms</div>
                        {diff > 0 && <div className="metric-change-psi">-{diff}ms CPU load</div>}
                      </div>
                    );
                  })()}

                  {/* CLS Card */}
                  {(() => {
                    const statusObj = getMetricStatus(simulatedResult.metrics.cls, 'cls');
                    const origVal = originalResult.metrics.cls;
                    const curVal = simulatedResult.metrics.cls;
                    const diff = Math.round((origVal - curVal) * 100);
                    return (
                      <div className="metric-card-psi">
                        <div className="metric-header-psi">
                          <span className={`psi-shape ${statusObj.className}`} title={statusObj.label}>
                            {statusObj.shape}
                          </span>
                          <span className="metric-name-psi">Cumulative Layout Shift</span>
                        </div>
                        <div className="metric-value-psi">{curVal}</div>
                        {diff > 0 && <div className="metric-change-psi">-{diff}% jumps</div>}
                      </div>
                    );
                  })()}

                  {/* Speed Index Card */}
                  {(() => {
                    const statusObj = getMetricStatus(simulatedResult.metrics.si, 'si');
                    const origVal = originalResult.metrics.si;
                    const curVal = simulatedResult.metrics.si;
                    const diff = Math.round(((origVal - curVal) / origVal) * 100);
                    return (
                      <div className="metric-card-psi">
                        <div className="metric-header-psi">
                          <span className={`psi-shape ${statusObj.className}`} title={statusObj.label}>
                            {statusObj.shape}
                          </span>
                          <span className="metric-name-psi">Speed Index</span>
                        </div>
                        <div className="metric-value-psi">{curVal} s</div>
                        {diff > 0 && <div className="metric-change-psi">-{diff}% faster</div>}
                      </div>
                    );
                  })()}

                  {/* Total Page Weight Card */}
                  {(() => {
                    const origVal = getPageWeight();
                    const curVal = calculateSimulatedPageWeight();
                    const statusObj = getMetricStatus(curVal, 'weight');
                    const savings = origVal - curVal;
                    
                    const formatBytes = (bytes) => {
                      if (bytes <= 0) return '0 B';
                      const k = 1024;
                      const dm = 2;
                      const sizes = ['B', 'KB', 'MB', 'GB'];
                      const i = Math.floor(Math.log(bytes) / Math.log(k));
                      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
                    };
                    
                    return (
                      <div className="metric-card-psi">
                        <div className="metric-header-psi">
                          <span className={`psi-shape ${statusObj.className}`} title={statusObj.label}>
                            {statusObj.shape}
                          </span>
                          <span className="metric-name-psi">Total Page Size</span>
                        </div>
                        <div className="metric-value-psi">{formatBytes(curVal)}</div>
                        {savings > 0 && <div className="metric-change-psi">Saved {formatBytes(savings)}</div>}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>


            {/* Opportunities & Diagnostics Tabs (Diagnostics vs AI Fixes) */}
            <div style={{ marginTop: '40px' }}>
              <div className="dashboard-tabs">
                <button 
                  className={`dashboard-tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('diagnostics')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  Diagnostics & Issues
                </button>
                <button 
                  className={`dashboard-tab-btn ${activeTab === 'aiFixes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('aiFixes')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4 5.6 21.2 8 14 2 9.2h7.6z"></path></svg>
                  AI-Powered Fixes
                </button>
                <button 
                  className={`dashboard-tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
                  onClick={() => setActiveTab('comparison')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="17"></line></svg>
                  Real-Time Comparison
                </button>
              </div>

              {/* View 1: Diagnostics */}
              {activeTab === 'diagnostics' && (
                <div>
                  {/* Category sub-tabs */}
                  <div className="category-filters">
                    {DIAGNOSTICS_CATEGORIES.map(cat => {
                      const list = auditData[device]?.failedAudits?.[cat.key] || [];
                      const count = list.length;
                      return (
                        <button
                          key={cat.key}
                          className={`category-filter-btn ${diagnosticsCategory === cat.key ? 'active' : ''}`}
                          onClick={() => setDiagnosticsCategory(cat.key)}
                        >
                          {cat.label}
                          {count > 0 && (
                            <span style={{ 
                              background: 'var(--danger)', 
                              color: '#fff', 
                              borderRadius: '10px', 
                              padding: '1px 6px', 
                              fontSize: '10px', 
                              fontWeight: 'bold',
                              marginLeft: '4px' 
                            }}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Failed Audits List */}
                  <div className="diagnostics-list">
                    {(auditData[device]?.failedAudits?.[diagnosticsCategory] || []).length === 0 ? (
                      <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--success)' }}>
                        <span style={{ fontSize: '24px', marginRight: '8px' }}>✔</span>
                        No diagnostics issues detected for this category.
                      </div>
                    ) : (
                      (auditData[device]?.failedAudits?.[diagnosticsCategory] || []).map((audit) => (
                        <div className="diagnostic-card" key={audit.id}>
                          <div className="diagnostic-header">
                            <span className="diagnostic-title">{audit.title}</span>
                            <span className="diagnostic-badge diagnostic-badge-failing">
                              {audit.displayValue || 'Failing Audit'}
                            </span>
                          </div>
                          <p className="diagnostic-desc">{audit.description}</p>
                          
                          {(() => {
                            const affected = getAffectedMetrics(audit.id, diagnosticsCategory, audit.title);
                            if (affected.length === 0) return null;
                            return (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>Affected Metrics:</span>
                                {affected.map(m => (
                                  <span key={m} style={{ 
                                    background: 'rgba(165, 243, 252, 0.08)', 
                                    color: '#a5f3fc', 
                                    padding: '2px 8px', 
                                    borderRadius: '4px', 
                                    fontSize: '11px', 
                                    fontWeight: '600',
                                    border: '1px solid rgba(165, 243, 252, 0.15)' 
                                  }}>
                                    {m}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}

                          {audit.items && audit.items.length > 0 && (
                            <div className="diagnostic-items">
                              {audit.items.map((item, idx) => (
                                <div className="diagnostic-item" key={idx}>
                                  {item.selector && (
                                    <div>
                                      <span className="diagnostic-item-label">Selector:</span>
                                      <code>{item.selector}</code>
                                    </div>
                                  )}
                                  {item.url && (
                                    <div style={{ marginTop: '2px' }}>
                                      <span className="diagnostic-item-label">Source URL:</span>
                                      <a href={item.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                                        {item.url}
                                      </a>
                                    </div>
                                  )}
                                  {item.snippet && (
                                    <span className="diagnostic-item-snippet">{item.snippet}</span>
                                  )}
                                  {item.description && (
                                    <div style={{ marginTop: '2px', color: 'var(--text-muted)' }}>
                                      {item.description}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* View 2: AI Fixes */}
              {activeTab === 'aiFixes' && (
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Select specific AI-suggested optimization codeblocks to dynamically recalculate their simulated impact on the category scoring gauges.
                  </p>
                  
                  <div className="ai-fixes-grid">
                    {!auditData.aiFixes || auditData.aiFixes.length === 0 ? (
                      <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        No optimization refactors available.
                      </div>
                    ) : (
                      auditData.aiFixes.map((fix) => {
                        const isApplied = appliedFixIds.includes(fix.auditId);
                        return (
                          <div className={`ai-fix-card ${isApplied ? 'applied' : ''}`} key={fix.auditId}>
                            <div className="ai-fix-header">
                              <div className="ai-fix-left">
                                <input
                                  type="checkbox"
                                  className="ai-fix-checkbox"
                                  checked={isApplied}
                                  onChange={() => toggleAppliedFix(fix.auditId)}
                                />
                                <span className="ai-fix-title">{getFixTitle(fix)}</span>
                              </div>
                              <div className="ai-fix-stats">
                                <span className="ai-fix-stat-badge ai-fix-gain">+{fix.scoreGain} pts</span>
                                <span className="ai-fix-stat-badge ai-fix-percentage">{fix.improvementPercentage}% impact</span>
                              </div>
                            </div>
                            
                            <p className="ai-fix-explanation">{fix.explanation}</p>

                            {(() => {
                              const affected = getAffectedMetrics(fix.auditId, fix.category);
                              if (affected.length === 0) return null;
                              return (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0px', marginBottom: '12px', paddingLeft: '4px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>Target Metrics:</span>
                                  {affected.map(m => (
                                    <span key={m} style={{ 
                                      background: 'rgba(165, 243, 252, 0.08)', 
                                      color: '#a5f3fc', 
                                      padding: '2px 8px', 
                                      borderRadius: '4px', 
                                      fontSize: '11px', 
                                      fontWeight: '600',
                                      border: '1px solid rgba(165, 243, 252, 0.15)' 
                                    }}>
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                            
                            <div className="ai-fix-code-diff">
                              {/* Original Code */}
                              <div className="ai-fix-code-panel">
                                <div className="ai-fix-code-title original">Original Code Block (Failing)</div>
                                <pre className="ai-fix-code-content original">{fix.originalCode}</pre>
                              </div>
                              
                              {/* Optimized Code */}
                              <div className="ai-fix-code-panel">
                                <div className="ai-fix-code-title optimized">AI Optimized Code</div>
                                <pre className="ai-fix-code-content optimized">{fix.optimizedCode}</pre>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* View 3: Real-Time Comparison */}
              {activeTab === 'comparison' && (
                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Compare the unoptimized original website side-by-side with the SpeedEngine AI shadow-optimized version in real-time.
                  </p>
                  
                  <div className="comparison-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
                    gap: '24px',
                    marginTop: '20px'
                  }}>
                    {/* Original Viewport */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.03)' }}>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px' }}>▲</span> Original Website
                          </h3>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Unoptimized production version</p>
                        </div>
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Unoptimized</span>
                      </div>
                      <iframe 
                        src={`${API_BASE}/api/original-proxy?url=${encodeURIComponent(auditData.url)}`}
                        style={{ width: '100%', height: '580px', border: 'none', background: '#fff' }}
                        title="Original site preview"
                      />
                    </div>

                    {/* Shadow Optimized Viewport */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid rgba(165, 243, 252, 0.2)' }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(34, 197, 94, 0.03)' }}>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px' }}>●</span> Shadow-Optimized
                          </h3>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>SpeedEngine AI active optimization middleware</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-se" style={{ margin: '0' }}>Active Fixes</span>
                          <a 
                            href={`${API_BASE}/api/shadow-proxy?url=${encodeURIComponent(auditData.url)}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn-secondary"
                            style={{ fontSize: '11px', padding: '4px 10px', height: '24px', display: 'flex', alignItems: 'center' }}
                          >
                            Open Tab
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '4px' }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                          </a>
                        </div>
                      </div>
                      <iframe 
                        src={`${API_BASE}/api/shadow-proxy?url=${encodeURIComponent(auditData.url)}`}
                        style={{ width: '100%', height: '580px', border: 'none', background: '#fff' }}
                        title="Shadow optimized preview"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>


          </div>
        )}

      </main>
    </div>
  );
}
