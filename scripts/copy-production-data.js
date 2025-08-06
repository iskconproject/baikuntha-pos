#!/usr/bin/env node

/**
 * Copy Production Data to Staging
 * This script copies all data from production database to staging database
 */

const { createClient } = require('@libsql/client');

// Load environment variables from .env files
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production' });

// Validate required environment variables
function validateEnvironment() {
  const required = [
    'TURSO_PRODUCTION_DATABASE_URL',
    'TURSO_PRODUCTION_AUTH_TOKEN',
    'TURSO_STAGING_DATABASE_URL',
    'TURSO_STAGING_AUTH_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Please ensure your .env.local file contains all required database tokens.');
    console.error('   See .env.example for the required format.');
    process.exit(1);
  }
}

// Validate environment before proceeding
validateEnvironment();

const PRODUCTION_CONFIG = {
  url: process.env.TURSO_PRODUCTION_DATABASE_URL,
  authToken: process.env.TURSO_PRODUCTION_AUTH_TOKEN
};

const STAGING_CONFIG = {
  url: process.env.TURSO_STAGING_DATABASE_URL,
  authToken: process.env.TURSO_STAGING_AUTH_TOKEN
};

async function copyData() {
  const prodClient = createClient(PRODUCTION_CONFIG);
  const stagingClient = createClient(STAGING_CONFIG);

  try {
    console.log('🔄 Starting data copy from production to staging...');

    // Clear existing staging data
    console.log('🧹 Clearing existing staging data...');
    await stagingClient.execute('DELETE FROM product_variants');
    await stagingClient.execute('DELETE FROM products');
    await stagingClient.execute('DELETE FROM users');
    await stagingClient.execute('DELETE FROM categories');
    console.log('✅ Staging data cleared');

    // Copy users
    console.log('👥 Copying users...');
    const users = await prodClient.execute('SELECT * FROM users ORDER BY created_at');
    for (const user of users.rows) {
      await stagingClient.execute({
        sql: 'INSERT INTO users (id, username, pin_hash, role, is_active, created_at, updated_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [user.id, user.username, user.pin_hash, user.role, user.is_active, user.created_at, user.updated_at, user.last_login_at]
      });
    }
    console.log(`✅ Copied ${users.rows.length} users`);

    // Copy categories
    console.log('📂 Copying categories...');
    const categories = await prodClient.execute('SELECT * FROM categories ORDER BY created_at');
    for (const category of categories.rows) {
      await stagingClient.execute({
        sql: 'INSERT INTO categories (id, name, description, parent_id, keywords, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [category.id, category.name, category.description, category.parent_id, category.keywords, category.is_active, category.created_at, category.updated_at]
      });
    }
    console.log(`✅ Copied ${categories.rows.length} categories`);

    // Copy products
    console.log('📦 Copying products...');
    const products = await prodClient.execute('SELECT * FROM products ORDER BY created_at');
    for (const product of products.rows) {
      await stagingClient.execute({
        sql: 'INSERT INTO products (id, name, description, base_price, category_id, keywords, metadata, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [product.id, product.name, product.description, product.base_price, product.category_id, product.keywords, product.metadata, product.is_active, product.created_at, product.updated_at]
      });
    }
    console.log(`✅ Copied ${products.rows.length} products`);

    // Copy product variants
    console.log('🔧 Copying product variants...');
    const variants = await prodClient.execute('SELECT * FROM product_variants ORDER BY created_at');
    for (const variant of variants.rows) {
      await stagingClient.execute({
        sql: 'INSERT INTO product_variants (id, product_id, name, price, stock_quantity, attributes, keywords, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [variant.id, variant.product_id, variant.name, variant.price, variant.stock_quantity, variant.attributes, variant.keywords, variant.created_at, variant.updated_at]
      });
    }
    console.log(`✅ Copied ${variants.rows.length} product variants`);

    console.log('🎉 Data copy completed successfully!');
    console.log(`
📊 Summary:
- Users: ${users.rows.length}
- Categories: ${categories.rows.length}
- Products: ${products.rows.length}
- Product Variants: ${variants.rows.length}
    `);

  } catch (error) {
    console.error('❌ Error copying data:', error);
    process.exit(1);
  }
}

copyData();