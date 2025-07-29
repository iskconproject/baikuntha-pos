export type SearchLanguage = 'en' | 'hi' | 'bn';export type SearchSortOption = 'relevance' | 'name' | 'price_asc' | 'price_desc' | 'popularity' | 'newest';


export type SortBy = 'relevance' | 'price_asc' | 'price_desc' | 'name' | 'newest' | 'oldest' | 'popularity';

export interface SearchQuery {
  query: string;
  categoryId?: string;
  language?: SearchLanguage;
  sortBy?: SortBy;
  limit?: number;
  offset?: number;
  filters: SearchFilters;
}

export interface SearchFilters {
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  attributes?: Record<string, string[]>;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  categoryId: string;
  categoryName: string;
  keywords: string[];
  metadata: {
    customAttributes: Record<string, any>;
    [key: string]: any;
  };
  variants: Array<{
    id: string;
    name: string;
    price: number;
    stockQuantity: number;
    attributes: Record<string, string>;
    keywords: string[];
  }>;
  relevanceScore: number;
  isActive: boolean;
  stockQuantity: number;
}

export interface SearchResult {
  products: ProductSearchResult[];
  totalCount: number;
  suggestions: string[];
  filters: AvailableFilters;
  searchTime: number;
  query: string;
}

export interface SearchSuggestion {
  text: string;
  type: 'product' | 'category' | 'keyword';
  frequency: number;
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

export interface SearchConfig {
  maxResults: number;
  suggestionLimit: number;
  fuzzyThreshold: number;
  enableTransliteration: boolean;
  enableAnalytics: boolean;
  cacheTimeout: number;
  rankingWeights: RankingFactors;
}

export interface FTSQuery {
  terms: string[];
  phrases: string[];
  excludeTerms: string[];
  language: SearchLanguage;
}

export interface TransliterationResult {
  original: string;
  transliterated: string[];
  confidence: number;
}

export interface LanguageMapping {
  id: string;
  englishTerm: string;
  hindiTerm?: string;
  bengaliTerm?: string;
  type: 'product' | 'category' | 'attribute' | 'keyword';
}
