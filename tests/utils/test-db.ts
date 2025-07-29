import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { 
  users, 
  categories, 
  products, 
  productVariants,
  transactions,
  transactionItems,
  type User,
  type NewUser,
  type Category,
  type NewCategory,
  type Product,
  type NewProduct,
  type ProductVariant,
  type NewProductVariant,
  type Transaction,
  type NewTransaction,
  type TransactionItem,
  type NewTransactionItem
} from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Create in-memory test database
const testSqlite = new Database(':memory:');
export const testDb = drizzle(testSqlite);

// Initialize test database with schema
export async function initTestDb() {
  // Disable foreign key constraints for testing
  testSqlite.pragma('foreign_keys = OFF');
  
  // Also disable foreign keys for the Drizzle connection
  await testDb.run(sql`PRAGMA foreign_keys = OFF`);
  
  // Create tables manually without foreign key constraints for testing
  testSqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      last_login_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      parent_id TEXT,
      keywords TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      base_price REAL NOT NULL,
      category_id TEXT,
      keywords TEXT,
      metadata TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock_quantity INTEGER DEFAULT 0,
      attributes TEXT,
      keywords TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      subtotal REAL NOT NULL,
      tax REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_reference TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      sync_status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id TEXT PRIMARY KEY,
      transaction_id TEXT,
      product_id TEXT,
      variant_id TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);
}

// Clear all test data
export async function clearTestDb() {
  testSqlite.exec(`
    DELETE FROM transaction_items;
    DELETE FROM transactions;
    DELETE FROM product_variants;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM users;
  `);
}

// Seed test data
export async function seedTestData() {
  const now = new Date();
  
  // Create test users
  const testUsers: NewUser[] = [
    {
      id: uuidv4(),
      username: 'admin',
      pinHash: await bcrypt.hash('1234', 10),
      role: 'admin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    },
    {
      id: uuidv4(),
      username: 'cashier',
      pinHash: await bcrypt.hash('5678', 10),
      role: 'cashier',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    },
  ];

  await testDb.insert(users).values(testUsers);

  // Get inserted users to return proper User types
  const insertedUsers = await testDb.select().from(users);

  // Create test categories
  const testCategories: NewCategory[] = [
    {
      id: uuidv4(),
      name: 'Books',
      description: 'Spiritual books and literature',
      keywords: JSON.stringify(['books', 'literature', 'spiritual']),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      parentId: null,
    },
    {
      id: uuidv4(),
      name: 'Accessories',
      description: 'Religious accessories and items',
      keywords: JSON.stringify(['accessories', 'religious', 'items']),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      parentId: null,
    },
  ];

  await testDb.insert(categories).values(testCategories);

  // Get inserted categories to return proper Category types
  const insertedCategories = await testDb.select().from(categories);

  // Create test products
  const testProducts: NewProduct[] = [
    {
      id: uuidv4(),
      name: 'Bhagavad Gita',
      description: 'Sacred text of Hindu philosophy',
      basePrice: 250,
      categoryId: testCategories[0].id,
      keywords: JSON.stringify(['gita', 'bhagavad', 'book', 'spiritual']),
      metadata: JSON.stringify({
        author: 'A.C. Bhaktivedanta Swami Prabhupada',
        publisher: 'The Bhaktivedanta Book Trust',
        language: 'English',
        customAttributes: {}
      }),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      name: 'Tulsi Mala',
      description: 'Sacred prayer beads made from Tulsi wood',
      basePrice: 150,
      categoryId: testCategories[1].id,
      keywords: JSON.stringify(['tulsi', 'mala', 'beads', 'prayer']),
      metadata: JSON.stringify({
        material: 'Tulsi wood',
        customAttributes: {}
      }),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await testDb.insert(products).values(testProducts);

  // Get inserted products to return proper Product types
  const insertedProducts = await testDb.select().from(products);

  // Create test product variants
  const testVariants: NewProductVariant[] = [
    {
      id: uuidv4(),
      productId: testProducts[0].id,
      name: 'Hardcover',
      price: 350,
      stockQuantity: 50,
      attributes: JSON.stringify({ binding: 'hardcover', pages: 800 }),
      keywords: JSON.stringify(['hardcover', 'premium']),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      productId: testProducts[0].id,
      name: 'Paperback',
      price: 250,
      stockQuantity: 100,
      attributes: JSON.stringify({ binding: 'paperback', pages: 800 }),
      keywords: JSON.stringify(['paperback', 'standard']),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      productId: testProducts[1].id,
      name: 'Small (108 beads)',
      price: 150,
      stockQuantity: 25,
      attributes: JSON.stringify({ size: 'small', beads: 108 }),
      keywords: JSON.stringify(['small', '108']),
      createdAt: now,
      updatedAt: now,
    },
  ];

  await testDb.insert(productVariants).values(testVariants);

  // Get inserted variants to return proper ProductVariant types
  const insertedVariants = await testDb.select().from(productVariants);

  return {
    users: insertedUsers,
    categories: insertedCategories,
    products: insertedProducts,
    variants: insertedVariants,
  };
}

// Create test transaction
export async function createTestTransaction(
  userId: string,
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }>
): Promise<Transaction> {
  const transactionId = uuidv4();
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const total = subtotal;

  const transaction: Transaction = {
    id: transactionId,
    userId,
    subtotal,
    tax: 0,
    discount: 0,
    total,
    paymentMethod: 'cash',
    paymentReference: `CASH-${Date.now()}`,
    status: 'completed',
    syncStatus: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await testDb.insert(transactions).values([transaction]);

  // Create transaction items
  const transactionItemsData: NewTransactionItem[] = items.map(item => ({
    id: uuidv4(),
    transactionId,
    productId: item.productId,
    variantId: item.variantId || null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.unitPrice * item.quantity,
    createdAt: new Date(),
  }));

  await testDb.insert(transactionItems).values(transactionItemsData);

  return transaction;
}

// Helper to get test database connection
export function getTestDb() {
  return testDb;
}

// Cleanup function for tests
export async function cleanupTestDb() {
  testSqlite.close();
}