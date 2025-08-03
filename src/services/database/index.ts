// Export all database services
export { BaseService } from './base';
export { userService, UserService } from './users';
export { categoryService, CategoryService, type CategoryHierarchy } from './categories';
export { productService, ProductService, type ProductWithVariants, type ProductSearchResult } from './products';
export { 
  transactionService, 
  TransactionService, 
  type TransactionWithItems,
  type DailySalesReport,
  type TopSellingProduct
} from './transactions';
export { 
  searchService, 
  SearchService
} from './search';
export { 
  syncService, 
  SyncService
} from './sync';

// Re-export database connection utilities
export { getDb } from '@/lib/db/connection';

// Re-export migration utilities
export { runMigrations } from '@/lib/db/migrate';

// Re-export schema types
export type * from '@/lib/db/schema';