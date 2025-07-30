#!/usr/bin/env node

/**
 * Development utility to clear Next.js and PWA caches
 * Run this when experiencing service worker conflicts in development
 */

const fs = require('fs');
const path = require('path');

const clearDirectory = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`✓ Cleared ${dirPath}`);
  }
};

const clearFiles = (pattern) => {
  const files = fs.readdirSync('public').filter(file => file.match(pattern));
  files.forEach(file => {
    const filePath = path.join('public', file);
    fs.unlinkSync(filePath);
    console.log(`✓ Removed ${filePath}`);
  });
};

console.log('🧹 Clearing development caches...\n');

// Clear Next.js build cache
clearDirectory('.next');

// Clear PWA generated files
try {
  clearFiles(/^sw.*\.js$/);
  clearFiles(/^workbox.*\.js$/);
} catch (error) {
  console.log('ℹ️  No PWA files to clear');
}

console.log('\n✅ Cache cleared! Restart your dev server.');
console.log('💡 If issues persist, try opening in incognito mode or different port.');