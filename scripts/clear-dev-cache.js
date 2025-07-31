#!/usr/bin/env node

/**
 * Development utility to clear Next.js and PWA caches
 * Run this when experiencing webpack cache corruption or service worker conflicts
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const clearDirectory = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`✓ Cleared ${dirPath}`);
    return true;
  }
  return false;
};

const clearFiles = (pattern, directory = 'public') => {
  if (!fs.existsSync(directory)) return;
  
  const files = fs.readdirSync(directory).filter(file => file.match(pattern));
  files.forEach(file => {
    const filePath = path.join(directory, file);
    fs.unlinkSync(filePath);
    console.log(`✓ Removed ${filePath}`);
  });
};

console.log('🧹 Clearing development caches and webpack artifacts...\n');

// Clear Next.js build cache
clearDirectory('.next');

// Clear TypeScript build info
if (fs.existsSync('tsconfig.tsbuildinfo')) {
  fs.unlinkSync('tsconfig.tsbuildinfo');
  console.log('✓ Cleared tsconfig.tsbuildinfo');
}

// Clear node_modules cache (if needed)
clearDirectory('node_modules/.cache');

// Clear PWA generated files
try {
  clearFiles(/^sw.*\.js$/);
  clearFiles(/^workbox.*\.js$/);
  clearFiles(/^manifest.*\.json$/);
} catch (error) {
  console.log('ℹ️  No PWA files to clear');
}

// Clear system temp webpack cache (common locations)
const tempDirs = [
  path.join(os.tmpdir(), 'webpack-dev-server'),
  path.join(os.tmpdir(), 'next-webpack'),
];

tempDirs.forEach(dir => {
  clearDirectory(dir);
});

// Clear npm/pnpm cache if corrupted
console.log('\n🔧 Additional cleanup options:');
console.log('   Run "pnpm store prune" to clean package cache');
console.log('   Run "rm -rf node_modules && pnpm install" for full reset');

console.log('\n✅ Cache cleared! Restart your dev server.');
console.log('💡 If webpack issues persist:');
console.log('   1. Try a different port: pnpm dev -- -p 3001');
console.log('   2. Open in incognito mode');
console.log('   3. Check for conflicting processes on port 3000');