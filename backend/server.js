import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runAudit } from './scanner.js';
import { optimizeImage, optimizeHtml } from './optimizer.js';
import { refactorSnippet } from './refactorer.js';
import { handleShadowProxy, handleOriginalProxy } from './proxy.js';
import { generatePdf } from './pdf.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Endpoint: /api/health (used for monitoring and keeping Render active)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Self-ping mechanism to keep the service awake on Render's free tier
const selfUrl = process.env.RENDER_EXTERNAL_URL;
if (selfUrl) {
  // Ping every 13 minutes (Render free tier sleeps after 15 minutes of inactivity)
  setInterval(async () => {
    try {
      console.log(`[Self-Ping] Pinging health endpoint: ${selfUrl}/api/health`);
      const response = await fetch(`${selfUrl}/api/health`);
      console.log(`[Self-Ping] Response status: ${response.status}`);
    } catch (error) {
      console.error('[Self-Ping] Error:', error.message);
    }
  }, 13 * 60 * 1000);
}


/**
 * Endpoint: /api/scan
 * Runs a performance analysis and returns site assets and Lighthouse metrics.
 */
app.get('/api/scan', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL parameter is required.' });
  }

  try {
    const report = await runAudit(url);
    res.json(report);
  } catch (error) {
    console.error('Scan Endpoint Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Endpoint: /api/optimize-images
 * Fetches an image, compresses it to WebP using Sharp, and returns the optimized binary.
 * Redirects to the original URL if compression fails (graceful fallback).
 */
app.get('/api/optimize-images', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).send('Image URL parameter is required.');
  }

  const result = await optimizeImage(url);
  
  if (result.success) {
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    return res.send(result.buffer);
  } else {
    // Fallback: redirect to original unoptimized image so site visual does not break
    return res.redirect(url);
  }
});

/**
 * Endpoint: /api/refactor
 * Post route that accepts a code snippet and failed audit details,
 * calling Gemini to optimize it and estimate metric savings.
 */
app.post('/api/refactor', async (req, res) => {
  const { code, auditTitle, metricName } = req.body;
  
  if (!code || !auditTitle || !metricName) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required body fields: code, auditTitle, metricName.' 
    });
  }

  try {
    const optimization = await refactorSnippet(code, auditTitle, metricName);
    res.json({ success: true, optimization });
  } catch (error) {
    console.error('Refactor Endpoint Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Endpoint: /api/shadow-proxy
 * Acts as the NitroPack shadow instance proxy, rewriting assets and delivering optimized code.
 */
app.get('/api/shadow-proxy', handleShadowProxy);

/**
 * Endpoint: /api/original-proxy
 * Acts as the original target website proxy without optimizations applied.
 */
app.get('/api/original-proxy', handleOriginalProxy);

/**
 * Endpoint: /api/export
 * Downloads the fully optimized, shadow-perfected single-file HTML.
 */
app.get('/api/export', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).send('URL query parameter is required.');
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SpeedEngineAI/1.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch original HTML: ${response.statusText}`);
    }

    let html = await response.text();
    
    // Convert relative URLs to absolute in HTML before exporting so it runs standalone
    const targetUrl = new URL(url);
    const baseUrl = targetUrl.origin;

    // We replace relative src/href with absolute paths
    const relativeSrc = /src=["'](?!http|data:|\/\/)([^"']+)["']/gi;
    html = html.replace(relativeSrc, `src="${baseUrl}/$1"`);
    
    const relativeHref = /href=["'](?!http|data:|\/\/|#)([^"']+)["']/gi;
    html = html.replace(relativeHref, `href="${baseUrl}/$1"`);

    // Run optimizations
    const optimized = optimizeHtml(html, url);

    res.setHeader('Content-Disposition', 'attachment; filename="speed-perfected.html"');
    res.setHeader('Content-Type', 'text/html');
    res.send(optimized);
  } catch (error) {
    res.status(500).send(`Failed to generate export file: ${error.message}`);
  }
});

/**
 * Endpoint: /api/pdf-report
 * Compiles website audit results, scores, and AI recommendations into a styled executive PDF download.
 */
app.post('/api/pdf-report', async (req, res) => {
  try {
    const pdfBuffer = await generatePdf(req.body);
    
    // Normalize URL for target filename
    const cleanUrl = req.body.url.replace(/https?:\/\//i, '').replace(/[^a-z0-9]/gi, '_');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SpeedEngine-Report-${cleanUrl}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[PDF Endpoint Error]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fallback to index.html for SPA client-side routing (must be defined AFTER all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express Listener
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` SpeedEngine AI Backend is running on port ${PORT}`);
  console.log(` - Scan Audit: http://localhost:${PORT}/api/scan`);
  console.log(` - Refactor AI: http://localhost:${PORT}/api/refactor`);
  console.log(` - Shadow Proxy: http://localhost:${PORT}/api/shadow-proxy`);
  console.log(`===============================================`);
});

