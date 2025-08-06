// Core entity types for BaikunthaPOS

export interface User {
  id: string
  username: string
  pinHash: string
  role: 'admin' | 'manager' | 'cashier'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

export interface Product {
  id: string
  name: string
  description?: string
  basePrice: number
  categoryId: string
  keywords: string[]
  metadata: ProductMetadata
  isActive: boolean
  searchScore?: number
  createdAt: Date
  updatedAt: Date
  variants: ProductVariant[]
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  price: number
  stockQuantity: number
  attributes: Record<string, string>
  keywords: string[]
}

export interface ProductMetadata {
  author?: string
  publisher?: string
  language?: string
  isbn?: string
  material?: string
  dimensions?: string
  weight?: string
  color?: string
  customAttributes: Record<string, string>
}

export interface Category {
  id: string
  name: string
  description?: string
  parentId?: string
  keywords: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  userId: string
  items: TransactionItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'upi'
  paymentReference?: string
  status: 'completed' | 'pending' | 'cancelled'
  createdAt: Date
  syncStatus: 'synced' | 'pending' | 'failed'
}

export interface TransactionItem {
  id: string
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  // Optional fields for enhanced transaction items with product details
  productName?: string
  variantName?: string
}

export interface SearchQuery {
  query: string
  categoryId?: string
  filters: {
    priceMin?: number
    priceMax?: number
    attributes?: Record<string, string[]>
    inStock?: boolean
  }
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'name' | 'popularity'
  limit?: number
  offset?: number
}

export interface SearchResult {
  products: Product[]
  totalCount: number
  suggestions: string[]
  filters: SearchFilters
}

export interface SearchFilters {
  categories: { id: string; name: string; count: number }[]
  priceRanges: { min: number; max: number; count: number }[]
  attributes: Record<string, { value: string; count: number }[]>
}

export interface SearchAnalytics {
  query: string
  resultCount: number
  clickedProductId?: string
  timestamp: Date
  userId: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Auth types
export interface AuthSession {
  user: {
    id: string
    username: string
    role: 'admin' | 'manager' | 'cashier'
    isActive: boolean
    lastLoginAt?: Date
  }
  token: string
  expiresAt: Date
}

// Cart types
export interface CartItem {
  productId: string
  variantId?: string
  quantity: number
  product: Product
  variant?: ProductVariant
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
}

// Dashboard types
export interface DashboardMetrics {
  todaySales: {
    total: number
    transactionCount: number
    averageTransaction: number
    trend: {
      value: number
      direction: 'up' | 'down' | 'neutral'
    }
  }
  inventory: {
    totalProducts: number
    lowStockCount: number
    outOfStockCount: number
    totalCategories: number
  }
  users?: {
    totalUsers: number
    activeUsers: number
    recentLogins: number
  }
  recentTransactions: {
    id: string
    total: number
    itemCount: number
    paymentMethod: string
    createdAt: Date
    userName: string
  }[]
  topProducts: {
    id: string
    name: string
    salesCount: number
    revenue: number
  }[]
}

export interface QuickStats {
  label: string
  value: string | number
  subValue?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label: string
  }
}