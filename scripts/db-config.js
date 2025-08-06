#!/usr/bin/env node

/**
 * Database Configuration Helper
 * Helps switch between staging and production databases
 */

const fs = require('fs');
const path = require('path');

// Load environment variables to get tokens
require('dotenv').config({ path: '.env.local' });

const STAGING_CONFIG = {
  url: 'libsql://baikuntha-gift-house-staging-iskconproject.aws-ap-south-1.turso.io',
  token: process.env.TURSO_STAGING_AUTH_TOKEN
};

const PRODUCTION_CONFIG = {
  url: 'libsql://baikuntha-gift-house-iskconproject.aws-ap-south-1.turso.io',
  token: process.env.TURSO_PRODUCTION_AUTH_TOKEN
};

const ENV_FILE = path.join(process.cwd(), '.env.local');

function updateEnvFile(config, environment) {
  if (!config.token) {
    console.error(`❌ Missing ${environment.toUpperCase()} database token in environment variables`);
    console.error('💡 Please ensure your .env.local file contains the required tokens');
    console.error('   See .env.example for the required format');
    process.exit(1);
  }

  const envContent = `# Turso Database Configuration - ${environment.toUpperCase()}
TURSO_DATABASE_URL=${config.url}
TURSO_AUTH_TOKEN=${config.token}

# Database Tokens for Scripts
TURSO_STAGING_DATABASE_URL=libsql://baikuntha-gift-house-staging-iskconproject.aws-ap-south-1.turso.io
TURSO_STAGING_AUTH_TOKEN=${process.env.TURSO_STAGING_AUTH_TOKEN || 'your-staging-token-here'}
TURSO_PRODUCTION_DATABASE_URL=libsql://baikuntha-gift-house-iskconproject.aws-ap-south-1.turso.io
TURSO_PRODUCTION_AUTH_TOKEN=${process.env.TURSO_PRODUCTION_AUTH_TOKEN || 'your-production-token-here'}

# Next.js Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
`;

  fs.writeFileSync(ENV_FILE, envContent);
  console.log(`✅ Switched to ${environment} database`);
  console.log(`📍 Database: ${config.url.split('//')[1].split('-iskconproject')[0]}`);
}

function getCurrentConfig() {
  if (!fs.existsSync(ENV_FILE)) {
    console.log('❌ .env.local file not found');
    return;
  }

  const content = fs.readFileSync(ENV_FILE, 'utf8');
  const urlMatch = content.match(/TURSO_DATABASE_URL=(.+)/);
  
  if (urlMatch) {
    const url = urlMatch[1];
    if (url.includes('staging')) {
      console.log('📍 Currently using: STAGING database');
    } else {
      console.log('📍 Currently using: PRODUCTION database');
    }
    console.log(`🔗 URL: ${url}`);
  }
}

const command = process.argv[2];

switch (command) {
  case 'staging':
  case 'dev':
    updateEnvFile(STAGING_CONFIG, 'staging');
    break;
  
  case 'production':
  case 'prod':
    updateEnvFile(PRODUCTION_CONFIG, 'production');
    break;
  
  case 'status':
  case 'current':
    getCurrentConfig();
    break;
  
  default:
    console.log(`
🗄️  Database Configuration Helper

Usage:
  node scripts/db-config.js <command>

Commands:
  staging, dev     Switch to staging database (for development)
  production, prod Switch to production database (for deployment)
  status, current  Show current database configuration

Examples:
  node scripts/db-config.js staging
  node scripts/db-config.js production
  node scripts/db-config.js status
`);
}