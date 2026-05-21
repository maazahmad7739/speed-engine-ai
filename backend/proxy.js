import { URL } from 'url';
import puppeteer from 'puppeteer';
import { optimizeHtml } from './optimizer.js';

// Shared browser instance for proxy requests
let sharedBrowser = null;
let browserLastUsed = 0;
const BROWSER_IDLE_TIMEOUT = 60000; // 1 minute

async function getSharedBrowser() {
  if (sharedBrowser && sharedBrowser.connected) {
    browserLastUsed = Date.now();
    return sharedBrowser;
  }
  sharedBrowser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
  });
  browserLastUsed = Date.now();
  return sharedBrowser;
}

// Auto-close idle browser
setInterval(() => {
  if (sharedBrowser && sharedBrowser.connected && Date.now() - browserLastUsed > BROWSER_IDLE_TIMEOUT) {
    console.log('[Proxy] Closing idle shared browser.');
    sharedBrowser.close().catch(() => {});
    sharedBrowser = null;
  }
}, 30000);

/**
 * Renders a page using Puppeteer (handles SPAs that need JS execution).
 * Falls back to simple fetch for server-rendered pages.
 */
async function fetchRenderedHtml(targetUrl, timeout = 20000) {
  // First try simple fetch — fast path for server-rendered sites
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    // Check if the HTML has meaningful body content (not just a JS shell)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1].trim() : '';
    // Strip script and style tags to check actual visible content
    const visibleContent = bodyContent
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (visibleContent.length > 200) {
      // Has real content — server-rendered, use it
      console.log(`[Proxy] Using fetch result (${visibleContent.length} chars visible content)`);
      return html;
    }
    
    console.log(`[Proxy] Fetch returned a JS shell (${visibleContent.length} chars). Falling back to Puppeteer render.`);
  } catch (err) {
    console.log(`[Proxy] Fetch failed (${err.message}). Falling back to Puppeteer render.`);
  }

  // Puppeteer path — for SPAs / client-side rendered sites
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    
    // Block heavy media to speed up render
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['media', 'font'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2', 
      timeout 
    });

    // Wait a bit for late-loading SPA content
    await new Promise(r => setTimeout(r, 2000));
    
    const html = await page.content();
    console.log(`[Proxy] Puppeteer rendered page successfully.`);
    return html;
  } finally {
    await page.close();
  }
}

/**
 * Express middleware that proxies requests, injects optimization rules,
 * and delivers the SpeedEngine AI shadow version of the target site.
 */
export async function handleShadowProxy(req, res) {
  const targetUrlStr = req.query.url;
  
  if (!targetUrlStr) {
    return res.status(400).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0b0f19; color: #f3f4f6; height: 100vh;">
        <h1 style="color: #ef4444;">SpeedEngine AI - Proxy Error</h1>
        <p>No URL parameter provided. Please request with <code>?url=https://example.com</code></p>
      </div>
    `);
  }

  try {
    const targetUrl = new URL(targetUrlStr);
    console.log(`[Proxy] Shadowing page: ${targetUrl.href}`);
    
    let html = await fetchRenderedHtml(targetUrl.href);
    const baseUrl = targetUrl.origin;

    // 1. Resolve relative image links to go through our optimizer endpoint
    const imgRegex = /<img\b([^>]*)src=["']([^"']+)["']/gi;
    html = html.replace(imgRegex, (match, attrs, src) => {
      if (src.startsWith('data:')) return match;
      
      const absoluteSrc = src.startsWith('http') ? src : new URL(src, targetUrl.href).href;
      // We point to our local port (which is served by Express)
      const proxyImgUrl = `/api/optimize-images?url=${encodeURIComponent(absoluteSrc)}`;
      return `<img ${attrs} src="${proxyImgUrl}"`;
    });

    // 2. Resolve relative stylesheet paths to absolute URLs (original host)
    const linkRegex = /<link\b([^>]*)href=["']([^"']+)["']/gi;
    html = html.replace(linkRegex, (match, attrs, href) => {
      if (href.startsWith('data:') || href.startsWith('http') || href.startsWith('//')) return match;
      const absoluteHref = new URL(href, targetUrl.href).href;
      return `<link ${attrs} href="${absoluteHref}"`;
    });

    // 3. Resolve relative script paths to absolute URLs
    const scriptSrcRegex = /<script\b([^>]*)src=["']([^"']+)["']/gi;
    html = html.replace(scriptSrcRegex, (match, attrs, src) => {
      if (src.startsWith('data:') || src.startsWith('http') || src.startsWith('//')) return match;
      const absoluteSrc = new URL(src, targetUrl.href).href;
      return `<script ${attrs} src="${absoluteSrc}"`;
    });

    // 4. Intercept links so clicking internal links continues shadowing them
    const aRegex = /<a\b([^>]*)href=["']([^"']+)["']/gi;
    html = html.replace(aRegex, (match, attrs, href) => {
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
        return match;
      }
      const absoluteHref = href.startsWith('http') ? href : new URL(href, targetUrl.href).href;
      const proxyHref = `/api/shadow-proxy?url=${encodeURIComponent(absoluteHref)}`;
      return `<a ${attrs} href="${proxyHref}"`;
    });

    // 5. Run the HTML optimizer (JS Delaying + CSS preloads)
    const optimizedHtml = optimizeHtml(html, targetUrl.href);

    // Send headers and markup
    res.setHeader('Content-Type', 'text/html');
    res.send(optimizedHtml);
  } catch (error) {
    console.error('[Proxy Error]:', error.message);
    res.status(500).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0b0f19; color: #f3f4f6; min-height: 100vh;">
        <h1 style="color: #ef4444;">SpeedEngine AI - Proxy Execution Failed</h1>
        <p>Could not proxy target site: <code>${targetUrlStr}</code></p>
        <p style="color: #9ca3af; font-size: 14px;">Error Details: ${error.message}</p>
      </div>
    `);
  }
}

export async function handleOriginalProxy(req, res) {
  const targetUrlStr = req.query.url;
  
  if (!targetUrlStr) {
    return res.status(400).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0b0f19; color: #f3f4f6; height: 100vh;">
        <h1 style="color: #ef4444;">SpeedEngine AI - Proxy Error</h1>
        <p>No URL parameter provided. Please request with <code>?url=https://example.com</code></p>
      </div>
    `);
  }

  try {
    const targetUrl = new URL(targetUrlStr);
    console.log(`[Proxy] Original page request: ${targetUrl.href}`);
    
    let html = await fetchRenderedHtml(targetUrl.href);

    // Resolve relative image links
    const imgRegex = /<img\b([^>]*)src=["']([^"']+)["']/gi;
    html = html.replace(imgRegex, (match, attrs, src) => {
      if (src.startsWith('data:')) return match;
      const absoluteSrc = src.startsWith('http') ? src : new URL(src, targetUrl.href).href;
      return `<img ${attrs} src="${absoluteSrc}"`;
    });

    // Resolve relative stylesheet paths
    const linkRegex = /<link\b([^>]*)href=["']([^"']+)["']/gi;
    html = html.replace(linkRegex, (match, attrs, href) => {
      if (href.startsWith('data:') || href.startsWith('http') || href.startsWith('//')) return match;
      const absoluteHref = new URL(href, targetUrl.href).href;
      return `<link ${attrs} href="${absoluteHref}"`;
    });

    // Resolve relative script paths
    const scriptSrcRegex = /<script\b([^>]*)src=["']([^"']+)["']/gi;
    html = html.replace(scriptSrcRegex, (match, attrs, src) => {
      if (src.startsWith('data:') || src.startsWith('http') || src.startsWith('//')) return match;
      const absoluteSrc = new URL(src, targetUrl.href).href;
      return `<script ${attrs} src="${absoluteSrc}"`;
    });

    // Intercept links so clicking internal links continues original proxying
    const aRegex = /<a\b([^>]*)href=["']([^"']+)["']/gi;
    html = html.replace(aRegex, (match, attrs, href) => {
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
        return match;
      }
      const absoluteHref = href.startsWith('http') ? href : new URL(href, targetUrl.href).href;
      const proxyHref = `/api/original-proxy?url=${encodeURIComponent(absoluteHref)}`;
      return `<a ${attrs} href="${proxyHref}"`;
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('[Proxy Error]:', error.message);
    res.status(500).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0b0f19; color: #f3f4f6; min-height: 100vh;">
        <h1 style="color: #ef4444;">SpeedEngine AI - Proxy Execution Failed</h1>
        <p>Could not proxy target site: <code>${targetUrlStr}</code></p>
        <p style="color: #9ca3af; font-size: 14px;">Error Details: ${error.message}</p>
      </div>
    `);
  }
}
