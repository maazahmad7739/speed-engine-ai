import { optimizeHtml } from './optimizer.js';

// Sample raw HTML mimicking a typical unoptimized site
const sampleHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Unoptimized Site</title>
  <link rel="stylesheet" href="/assets/main.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css">
  <script src="/assets/analytics.js"></script>
  <script>
    console.log("Inline analytics initialised");
    window.dataLayer = window.dataLayer || [];
  </script>
</head>
<body>
  <div class="hero-banner">
    <h1>Welcome to our Store</h1>
    <img src="/images/hero-banner.jpg" alt="Hero banner">
  </div>
  
  <p>Standard page body content.</p>
  
  <script src="https://connect.facebook.net/en_US/fbevents.js" async></script>
  <!-- Bypass script -->
  <script data-se-bypass="true">
    console.log("This critical script must run immediately!");
  </script>
</body>
</html>
`;

console.log("==================================================");
console.log("Running local verification on deterministic engine...");
console.log("==================================================");

try {
  const result = optimizeHtml(sampleHtml, "https://example.com");
  
  console.log("\n1. Critical CSS injection check:");
  if (result.includes("SpeedEngine AI Layout Reserve") && result.includes("min-height: 400px;")) {
    console.log("   [PASS] Critical reserve stylesheet injected successfully.");
  } else {
    console.error("   [FAIL] Critical reserve styles missing.");
  }

  console.log("\n2. Inline script loader check:");
  if (result.includes("SpeedEngine AI Optimization Bootstrapper") && result.includes("userEvents =")) {
    console.log("   [PASS] Bootstrapper loader script injected successfully.");
  } else {
    console.error("   [FAIL] Bootstrapper loader script missing.");
  }

  console.log("\n3. CSS link preloading check:");
  if (result.includes('rel="preload"') && result.includes('onload="this.onload=null;this.rel=\'stylesheet\'"')) {
    console.log("   [PASS] CSS link converted to preload async loading successfully.");
  } else {
    console.error("   [FAIL] Link tags still blocking.");
  }

  console.log("\n4. External script delaying check:");
  if (result.includes('data-src="/assets/analytics.js"') && result.includes('type="text/delayed-js"')) {
    console.log("   [PASS] External script delayed successfully.");
  } else {
    console.error("   [FAIL] External script was not delayed.");
  }

  console.log("\n5. Inline script delaying check:");
  if (result.includes('<script type="text/delayed-js">') && result.includes('Inline analytics initialised')) {
    console.log("   [PASS] Inline script delayed successfully.");
  } else {
    console.error("   [FAIL] Inline script was not delayed.");
  }

  console.log("\n6. Script bypass check:");
  if (result.includes('<script data-se-bypass="true">') && result.includes('must run immediately')) {
    console.log("   [PASS] Bypass tag respected successfully.");
  } else {
    console.error("   [FAIL] Bypass script was modified.");
  }

  console.log("\n==================================================");
  console.log("Deterministic transformation verification finished.");
  console.log("==================================================");
} catch (error) {
  console.error("Test encountered an execution error:", error);
}
