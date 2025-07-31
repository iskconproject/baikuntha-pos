#!/usr/bin/env node

/**
 * Webpack cache corruption fix utility
 * This script helps diagnose and fix webpack cache issues
 */

const fs = require('fs');
const path = require('path');

function checkWebpackCache() {
  const cacheDir = '.next/cache/webpack';
  
  if (!fs.existsSync(cacheDir)) {
    console.log('✓ No webpack cache found - this is normal for first run');
    return true;
  }
  
  try {
    const files = fs.readdirSync(cacheDir, { recursive: true });
    const packFiles = files.filter(f => f.endsWith('.pack.gz'));
    
    console.log(`📦 Found ${packFiles.length} webpack cache pack files`);
    
    // Check for corrupted pack files
    let corruptedFiles = 0;
    packFiles.forEach(file => {
      const filePath = path.join(cacheDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          console.log(`⚠️  Empty cache file: ${file}`);
          corruptedFiles++;
        }
      } catch (error) {
        console.log(`❌ Corrupted cache file: ${file}`);
        corruptedFiles++;
      }
    });
    
    if (corruptedFiles > 0) {
      console.log(`\n🔧 Found ${corruptedFiles} corrupted cache files`);
      console.log('Recommendation: Run "pnpm clear:cache" to fix');
      return false;
    }
    
    console.log('✅ Webpack cache appears healthy');
    return true;
    
  } catch (error) {
    console.log('❌ Error reading webpack cache:', error.message);
    return false;
  }
}

function fixWebpackConfig() {
  const configPath = 'next.config.js';
  
  if (!fs.existsSync(configPath)) {
    console.log('❌ next.config.js not found');
    return false;
  }
  
  const config = fs.readFileSync(configPath, 'utf8');
  
  // Check if cache is already disabled in dev
  if (config.includes('config.cache = false')) {
    console.log('✓ Webpack cache already disabled in development');
    return true;
  }
  
  console.log('ℹ️  Consider disabling webpack cache in development');
  console.log('   Add "config.cache = false;" in webpack config when dev=true');
  
  return true;
}

console.log('🔍 Webpack Cache Diagnostic Tool\n');

const cacheHealthy = checkWebpackCache();
const configOk = fixWebpackConfig();

if (!cacheHealthy || !configOk) {
  console.log('\n🚨 Issues detected. Recommended actions:');
  console.log('1. Run: pnpm clear:cache');
  console.log('2. Run: pnpm dev:clean');
  console.log('3. If issues persist, run: pnpm reset:hard');
} else {
  console.log('\n✅ No webpack cache issues detected');
}