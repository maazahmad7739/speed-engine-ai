const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

console.log('--- SpeedEngine Native Render Build ---');

// 1. Install frontend dependencies and build
console.log('Installing frontend dependencies...');
execSync('npm install --no-audit --no-fund', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });

console.log('Building frontend (Static Export)...');
execSync('npm run build', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });

// 2. Install backend dependencies
console.log('Installing backend dependencies...');
execSync('npm install --no-audit --no-fund', { cwd: path.join(rootDir, 'backend'), stdio: 'inherit' });


// 3. Copy frontend out directory to backend public directory
console.log('Copying frontend build output to backend/public...');
const srcDir = path.join(rootDir, 'frontend', 'out');
const destDir = path.join(rootDir, 'backend', 'public');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
copyDir(srcDir, destDir);
console.log('Copied frontend build output successfully.');

// 4. Install Chromium for Puppeteer
console.log('Installing Chromium browser for Puppeteer...');
try {
  execSync('npx puppeteer browsers install chrome', { cwd: path.join(rootDir, 'backend'), stdio: 'inherit' });
} catch (err) {
  console.warn('Warning: npx puppeteer browsers install chrome failed. Trying fallback...');
}

console.log('--- Build Completed Successfully! ---');
