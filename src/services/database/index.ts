// Export all database services
export { BaseService } from './base';
export { userService, UserService } from './users';
export { categoryService, CategoryService, type CategoryHierarchy } from './categories';
export { productService, ProductService, type ProductWithVariants, type ProductSearchResult } from './products';
export { 
  transactionService, 
  TransactionService, 
  type CreateTransactionData,
  type TransactionWithItems,
  type TransactionItemWithDetails,
  type DailySalesReport,
  type TopSellingProduct
} from './transactions';
export { 
  searchService, 
  SearchService,
  type PopularSearch,
  type NoResultSearch,
  type SearchTrend,
  type ClickThroughRate
} from './search';
export { 
  syncService, 
  SyncService,
  type SyncResult,
  type TableSyncStats
} from './sync';

// Re-export database connection utilities
export { getLocalDb, getCloudDb, checkLocalConnection, checkCloudConnection } from '@/lib/db/connection';

// Re-export migration utilities
export { runMigrations, rebuildFTSIndex } from '@/lib/db/migrate';

// Re-export schema types
export type * from '@/lib/db/schema';