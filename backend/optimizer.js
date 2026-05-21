import sharp from 'sharp';


// Client-side loader script that intercepts user events and executes delayed scripts sequentially
const LOADER_SCRIPT = `
<!-- SpeedEngine AI Optimization Bootstrapper -->
<script data-se-bypass="true">
(function() {
  const userEvents = ['keydown', 'mousedown', 'mousemove', 'touchmove', 'touchstart', 'scroll'];
  let triggered = false;
  
  function triggerDelayedScripts() {
    if (triggered) return;
    triggered = true;
    console.log('[SpeedEngine AI] Interaction detected. Loading deferred scripts...');
    
    // Remove listeners
    userEvents.forEach(event => {
      window.removeEventListener(event, triggerDelayedScripts, { passive: true });
    });
    
    const delayed = Array.from(document.querySelectorAll('script[type="text/delayed-js"]'));
    let currentIndex = 0;
    
    function loadNext() {
      if (currentIndex >= delayed.length) {
        // Dispatch event to notify page that deferred loading is completed
        window.dispatchEvent(new Event('speedengine-scripts-loaded'));
        return;
      }
      
      const oldScript = delayed[currentIndex];
      const newScript = document.createElement('script');
      
      // Copy all attributes except the type
      Array.from(oldScript.attributes).forEach(attr => {
        if (attr.name !== 'type') {
          newScript.setAttribute(attr.name, attr.value);
        }
      });
      
      if (oldScript.hasAttribute('data-src')) {
        newScript.src = oldScript.getAttribute('data-src');
        newScript.onload = () => {
          currentIndex++;
          loadNext();
        };
        newScript.onerror = () => {
          console.error('[SpeedEngine AI] Failed to load external script:', newScript.src);
          currentIndex++;
          loadNext();
        };
        oldScript.parentNode.replaceChild(newScript, oldScript);
      } else {
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
        currentIndex++;
        loadNext();
      }
    }
    
    loadNext();
  }
  
  // Attach listeners to all interactions
  userEvents.forEach(event => {
    window.addEventListener(event, triggerDelayedScripts, { passive: true });
  });
  
  console.log('[SpeedEngine AI] Running in Shadow mode. JS delayed until user interaction.');
})();
</script>
`;

/**
 * Optimizes an HTML page: delays non-bypass scripts and defers styles.
 */
export function optimizeHtml(html, targetUrl) {
  let optimized = html;
  
  // 1. Process script tags
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  optimized = optimized.replace(scriptRegex, (match, attrs, content) => {
    // If it has bypass attribute, don't modify it
    if (attrs.includes('data-se-bypass') || attrs.includes('bypass') || content.includes('data-se-bypass')) {
      return match;
    }
    
    // Check if it's already type modules or other styles
    if (attrs.includes('type="module"')) {
      // Keep modules but change type to text/delayed-js-module if desired, 
      // or change it to text/delayed-js with data-type="module"
      let newAttrs = attrs.replace(/type="module"/g, 'type="text/delayed-js" data-type="module"');
      if (attrs.includes('src=')) {
        newAttrs = newAttrs.replace(/src=/g, 'data-src=');
      }
      return `<script ${newAttrs}>${content}</script>`;
    }
    
    if (attrs.includes('type=') && !attrs.includes('type="text/javascript"') && !attrs.includes("type='text/javascript'")) {
      // It's some other script type (like application/ld+json or template), don't touch
      return match;
    }
    
    // Replace src with data-src for external scripts
    let newAttrs = attrs;
    if (attrs.includes('src=')) {
      // Parse out src
      newAttrs = newAttrs.replace(/src=/g, 'data-src=');
    }
    
    // Add type="text/delayed-js"
    if (attrs.includes('type=')) {
      newAttrs = newAttrs.replace(/type=["'][^"']*["']/g, 'type="text/delayed-js"');
    } else {
      newAttrs = `${newAttrs.trim()} type="text/delayed-js"`;
    }
    
    return `<script ${newAttrs.trim()}>${content}</script>`;
  });
  
  // 2. Defer stylesheets
  const linkStyleRegex = /<link\b([^>]*rel=["']stylesheet["'][^>]*)>/gi;
  optimized = optimized.replace(linkStyleRegex, (match, attrs) => {
    if (attrs.includes('data-se-bypass') || attrs.includes('bypass')) {
      return match;
    }
    
    // Convert to asynchronous preload loader
    // Find href
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return match;
    const href = hrefMatch[1];
    
    // Extract other attributes
    const cleanAttrs = attrs.replace(/rel=["']stylesheet["']/gi, '').replace(/href=["']([^"']+)["']/gi, '');
    
    return `<link rel="preload" href="${href}" as="style" ${cleanAttrs} onload="this.onload=null;this.rel='stylesheet'">
            <noscript><link rel="stylesheet" href="${href}" ${cleanAttrs}></noscript>`;
  });

  // 3. Inject critical above-the-fold inline style (simulate visual rendering reservation)
  const criticalStyles = `
    /* SpeedEngine AI Layout Reserve */
    img { content-visibility: auto; contain-intrinsic-size: 1px 1px; }
    .hero-banner, [class*="hero"], [id*="hero"] { min-height: 400px; background-color: #f3f4f6; }
  `;
  
  // 4. Inject bootstrap loader script in head or body
  const headTag = '</head>';
  if (optimized.includes(headTag)) {
    optimized = optimized.replace(headTag, `<style>${criticalStyles}</style>${LOADER_SCRIPT}${headTag}`);
  } else {
    optimized = LOADER_SCRIPT + optimized;
  }
  
  return optimized;
}

/**
 * Downloads and optimizes an image, converting it to WebP using sharp
 */
export async function optimizeImage(imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SpeedEngineAI/1.0'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Convert to WebP using Sharp
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 80 })
      .toBuffer();
      
    return {
      success: true,
      buffer: webpBuffer,
      contentType: 'image/webp'
    };
  } catch (error) {
    console.error(`Image optimization failed for ${imageUrl}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
