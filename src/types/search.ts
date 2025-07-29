// Search-related type definitions

export interface SearchQuery {
  query: string;
  categoryId?: string;
  filters: SearchFilters;
  sortBy?: SearchSortOption;
  limit?: number;
  offset?: number;
  language?: SearchLanguage;
}

export interface SearchFilters {
  priceMin?: number;
  priceMax?: number;
  attributes?: Record<string, string[]>;
  inStock?: boolean;
  categories?: string[];
}

export type SearchSortOption = 
  | 'relevance' 
  | 'price_asc' 
  | 'price_desc' 
  | 'name' 
  | 'popularity' 
  | 'newest' 
  | 'oldest';

export type SearchLanguage = 'en' | 'hi' | 'bn';

export interface SearchResult {
  products: ProductSearchResult[];
  totalCount: number;
  suggestions: string[];
  filters: AvailableFilters;
  searchTime: number;
  query: string;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  categoryId: string;
  categoryName: string;
  keywords: string[];
  metadata: ProductMetadata;
  variants: ProductVariantResult[];
  relevanceScore: number;
  isActive: boolean;
  stockQuantity: number;
  imageUrl?: string;
}

export interface ProductVariantResult {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  attributes: Record<string, string>;
  keywords: string[];
}

export interface ProductMetadata {
  author?: string;
  publisher?: string;
  language?: string;
  isbn?: string;
  material?: string;
  dimensions?: string;
  weight?: string;
  color?: string;
  customAttributes: Record<string, string>;
}

export interface AvailableFilters {
  categories: FilterOption[];
  priceRanges: PriceRange[];
  attributes: Record<string, FilterOption[]>;
  languages: FilterOption[];
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface PriceRange {
  min: number;
  max: number;
  label: string;
  count: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'product' | 'category' | 'keyword' | 'recent';
  count?: number;
  category?: string;
}

export interface SearchAnalyticsData {
  query: string;
  resultCount: number;
  clickedProductId?: string;
  userId?: string;
  searchTime: number;
  filters?: SearchFilters;
  language?: SearchLanguage;
}

// Multi-language search support
export interface LanguageMapping {
  en: string;
  hi?: string;
  bn?: string;
}

export interface TransliterationResult {
  original: string;
  transliterated: string[];
  language: SearchLanguage;
}

// Search ranking factors
export interface RankingFactors {
  exactMatch: number;
  nameMatch: number;
  keywordMatch: number;
  descriptionMatch: number;
  categoryMatch: number;
  popularityBoost: number;
  stockAvailability: number;
  priceRelevance: number;
}

// Search configuration
export interface SearchConfig {
  maxResults: number;
  suggestionLimit: number;
  fuzzyThreshold: number;
  enableTransliteration: boolean;
  enableAnalytics: boolean;
  cacheTimeout: number;
  rankingWeights: RankingFactors;
}

// FTS5 specific types
export interface FTSDocument {
  productId: string;
  content: string;
  language: SearchLanguage;
  boost: number;
}

export interface FTSQuery {
  terms: string[];
  phrases: string[];
  excludeTerms: string[];
  language: SearchLanguage;
}