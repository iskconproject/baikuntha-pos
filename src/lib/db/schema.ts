import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  pinHash: text('pin_hash').notNull(),
  role: text('role').notNull(), // 'admin' | 'manager' | 'cashier'
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
}, (table) => ({
  usernameIdx: index('username_idx').on(table.username),
  roleIdx: index('role_idx').on(table.role),
}));

// Categories table with search keywords
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  parentId: text('parent_id'),
  keywords: text('keywords'), // JSON array of category search terms
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  nameIdx: index('category_name_idx').on(table.name),
  parentIdx: index('category_parent_idx').on(table.parentId),
}));

// Products table with search support
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  basePrice: real('base_price').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  keywords: text('keywords'), // JSON array of search keywords
  metadata: text('metadata'), // JSON object for custom attributes
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  nameIdx: index('product_name_idx').on(table.name),
  categoryIdx: index('product_category_idx').on(table.categoryId),
  priceIdx: index('product_price_idx').on(table.basePrice),
}));

// Product variants with search support
export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  price: real('price').notNull(),
  stockQuantity: integer('stock_quantity').default(0),
  attributes: text('attributes'), // JSON object
  keywords: text('keywords'), // JSON array for variant-specific keywords
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  productIdx: index('variant_product_idx').on(table.productId),
  priceIdx: index('variant_price_idx').on(table.price),
  stockIdx: index('variant_stock_idx').on(table.stockQuantity),
}));

// Transactions table
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  subtotal: real('subtotal').notNull(),
  tax: real('tax').default(0),
  discount: real('discount').default(0),
  total: real('total').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'cash' | 'upi'
  paymentReference: text('payment_reference'),
  status: text('status').notNull().default('completed'), // 'completed' | 'pending' | 'cancelled'
  syncStatus: text('sync_status').notNull().default('pending'), // 'synced' | 'pending' | 'failed'
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('transaction_user_idx').on(table.userId),
  statusIdx: index('transaction_status_idx').on(table.status),
  syncIdx: index('transaction_sync_idx').on(table.syncStatus),
  dateIdx: index('transaction_date_idx').on(table.createdAt),
  paymentIdx: index('transaction_payment_idx').on(table.paymentMethod),
}));

// Transaction items table
export const transactionItems = sqliteTable('transaction_items', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id),
  variantId: text('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
  // Custom variant support
  isCustomVariant: integer('is_custom_variant', { mode: 'boolean' }).default(false),
  customVariantData: text('custom_variant_data'), // JSON object for custom variant details
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  transactionIdx: index('item_transaction_idx').on(table.transactionId),
  productIdx: index('item_product_idx').on(table.productId),
  variantIdx: index('item_variant_idx').on(table.variantId),
  customIdx: index('item_custom_idx').on(table.isCustomVariant),
}));

// Search analytics table
export const searchAnalytics = sqliteTable('search_analytics', {
  id: text('id').primaryKey(),
  query: text('query').notNull(),
  resultCount: integer('result_count').notNull(),
  clickedProductId: text('clicked_product_id').references(() => products.id),
  userId: text('user_id').references(() => users.id),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  queryIdx: index('search_query_idx').on(table.query),
  userIdx: index('search_user_idx').on(table.userId),
  timestampIdx: index('search_timestamp_idx').on(table.timestamp),
}));

// Full-text search virtual table for SQLite FTS5
// This will be created via raw SQL in migrations since Drizzle doesn't fully support FTS5 syntax
export const productSearchFts = sqliteTable('product_search_fts', {
  rowid: integer('rowid').primaryKey(),
  productId: text('product_id'),
  content: text('content'), // Combined searchable text
});

// User activity log table for audit trail
export const userActivity = sqliteTable('user_activity', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(), // 'login', 'logout', 'create_user', 'update_user', 'deactivate_user', etc.
  targetUserId: text('target_user_id').references(() => users.id), // For user management actions
  details: text('details'), // JSON object with additional details
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('activity_user_idx').on(table.userId),
  actionIdx: index('activity_action_idx').on(table.action),
  timestampIdx: index('activity_timestamp_idx').on(table.timestamp),
  targetUserIdx: index('activity_target_user_idx').on(table.targetUserId),
}));

// Sync metadata table for tracking synchronization state
export const syncMetadata = sqliteTable('sync_metadata', {
  id: text('id').primaryKey(),
  tableName: text('table_name').notNull(),
  lastSyncAt: integer('last_sync_at', { mode: 'timestamp' }),
  syncVersion: integer('sync_version').default(0),
  conflictCount: integer('conflict_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tableIdx: index('sync_table_idx').on(table.tableName),
  versionIdx: index('sync_version_idx').on(table.syncVersion),
}));

// Scheduled reports table
export const scheduledReports = sqliteTable('scheduled_reports', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  reportType: text('report_type').notNull(), // 'daily-sales', 'transactions', 'products', 'analytics'
  frequency: text('frequency').notNull(), // 'daily', 'weekly', 'monthly'
  format: text('format').notNull(), // 'csv', 'pdf'
  recipients: text('recipients'), // JSON array of email addresses
  filters: text('filters'), // JSON object with report filters
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  nextRun: integer('next_run', { mode: 'timestamp' }).notNull(),
  lastRun: integer('last_run', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  createdBy: text('created_by').references(() => users.id),
}, (table) => ({
  typeIdx: index('scheduled_report_type_idx').on(table.reportType),
  frequencyIdx: index('scheduled_report_frequency_idx').on(table.frequency),
  activeIdx: index('scheduled_report_active_idx').on(table.isActive),
  nextRunIdx: index('scheduled_report_next_run_idx').on(table.nextRun),
  createdByIdx: index('scheduled_report_created_by_idx').on(table.createdBy),
}));

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type TransactionItem = typeof transactionItems.$inferSelect;
export type NewTransactionItem = typeof transactionItems.$inferInsert;

export type SearchAnalytics = typeof searchAnalytics.$inferSelect;
export type NewSearchAnalytics = typeof searchAnalytics.$inferInsert;

export type UserActivity = typeof userActivity.$inferSelect;
export type NewUserActivity = typeof userActivity.$inferInsert;

export type SyncMetadata = typeof syncMetadata.$inferSelect;
export type NewSyncMetadata = typeof syncMetadata.$inferInsert;

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type NewScheduledReport = typeof scheduledReports.$inferInsert;