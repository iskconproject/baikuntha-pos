import { eq, and, or, desc, asc, sql, like, inArray } from "drizzle-orm";
import {
  products,
  productVariants,
  categories,
  searchAnalytics,
  type Product,
  type ProductVariant,
  type Category,
} from "@/lib/db/schema";
import { getDb } from "@/lib/db/connection";
import { searchService } from "@/services/database/search";
import type {
  SearchQuery,
  SearchResult,
  ProductSearchResult,
  SearchSuggestion,
  AvailableFilters,
  FilterOption,
  PriceRange,
  SearchLanguage,
  RankingFactors,
  SearchConfig,
  FTSQuery,
  TransliterationResult,
  LanguageMapping,
} from "@/types/search";

export class SearchEngine {
  private db = getDb();
  private config: SearchConfig = {
    maxResults: 50,
    suggestionLimit: 10,
    fuzzyThreshold: 0.7,
    enableTransliteration: true,
    enableAnalytics: true,
    cacheTimeout: 300000, // 5 minutes
    rankingWeights: {
      exactMatch: 100,
      nameMatch: 50,
      keywordMatch: 25,
      descriptionMatch: 10,
      categoryMatch: 15,
      popularityBoost: 0.1,
      stockAvailability: 5,
      priceRelevance: 2,
    },
  };

  private cache = new Map<string, { result: SearchResult; timestamp: number }>();

  /**
   * Main search method that combines FTS5, keyword matching, and metadata filtering
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query);

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return { ...cached.result, searchTime: Date.now() - startTime };
    }

    try {
      // Parse and prepare the search query
      const ftsQuery = this.parseQuery(query.query, query.language || 'en');
      
      // Get base results from FTS5
      const ftsResults = await this.performFTSSearch(ftsQuery, query);
      
      // Apply additional filtering and ranking
      const filteredResults = await this.applyFiltersAndRanking(ftsResults, query);
      
      // Get available filters for the current search
      const availableFilters = await this.getAvailableFilters(query);
      
      // Get search suggestions
      const suggestions = await this.getSuggestions(query.query, query.language || 'en');
      
      const searchTime = Date.now() - startTime;
      
      const result: SearchResult = {
        products: filteredResults.slice(query.offset || 0, (query.offset || 0) + (query.limit || this.config.maxResults)),
        totalCount: filteredResults.length,
        suggestions,
        filters: availableFilters,
        searchTime,
        query: query.query,
      };

      // Cache the result
      this.cache.set(cacheKey, { result, timestamp: Date.now() });

      // Record analytics if enabled
      if (this.config.enableAnalytics) {
        await searchService.recordSearch(query.query, result.totalCount);
      }

      return result;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Search failed');
    }
  }

  /**
   * Parse search query into FTS5 compatible format
   */
  private parseQuery(query: string, language: SearchLanguage): FTSQuery {
    const cleanQuery = query.trim().toLowerCase();
    const terms: string[] = [];
    const phrases: string[] = [];
    const excludeTerms: string[] = [];

    // Handle quoted phrases
    const phraseMatches = cleanQuery.match(/"([^"]+)"/g);
    let workingQuery = cleanQuery;
    
    if (phraseMatches) {
      phraseMatches.forEach(match => {
        const phrase = match.replace(/"/g, '');
        phrases.push(phrase);
        workingQuery = workingQuery.replace(match, '');
      });
    }

    // Handle exclusions (terms starting with -)
    const exclusionMatches = workingQuery.match(/-\w+/g);
    if (exclusionMatches) {
      exclusionMatches.forEach(match => {
        excludeTerms.push(match.substring(1));
        workingQuery = workingQuery.replace(match, '');
      });
    }

    // Split remaining terms
    const remainingTerms = workingQuery
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => term.replace(/[^\w\u0900-\u097F\u0980-\u09FF]/g, '')); // Keep English, Hindi, Bengali chars

    terms.push(...remainingTerms);

    return { terms, phrases, excludeTerms, language };
  }

  /**
   * Perform FTS5 full-text search
   */
  private async performFTSSearch(ftsQuery: FTSQuery, searchQuery: SearchQuery): Promise<ProductSearchResult[]> {
    const { terms, phrases, excludeTerms } = ftsQuery;
    
    if (terms.length === 0 && phrases.length === 0) {
      return this.getAllProducts(searchQuery);
    }

    // For now, fallback to regular search since FTS5 virtual table setup is complex
    // TODO: Implement proper FTS5 virtual table in schema and migrations
    return this.performFallbackSearch(ftsQuery, searchQuery);
  }

  /**
   * Fallback search using LIKE queries when FTS5 fails
   */
  private async performFallbackSearch(ftsQuery: FTSQuery, searchQuery: SearchQuery): Promise<ProductSearchResult[]> {
    const { terms } = ftsQuery;
    
    if (terms.length === 0) {
      return this.getAllProducts(searchQuery);
    }

    const searchTerm = `%${terms.join('%')}%`;
    
    const results = await this.db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.isActive, true),
          or(
            like(products.name, searchTerm),
            like(products.description, searchTerm),
            like(products.keywords, searchTerm)
          )
        )
      )
      .limit(this.config.maxResults);

    return this.convertToSearchResults(results, ftsQuery);
  }

  /**
   * Get all products when no search terms provided
   */
  private async getAllProducts(searchQuery: SearchQuery): Promise<ProductSearchResult[]> {
    const results = await this.db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.isActive, true))
      .orderBy(desc(products.createdAt))
      .limit(this.config.maxResults);

    return this.convertToSearchResults(results, { terms: [], phrases: [], excludeTerms: [], language: 'en' });
  }

  /**
   * Get detailed product information for search results
   */
  private async getProductsWithDetails(
    productIds: string[], 
    ftsQuery: FTSQuery, 
    searchQuery: SearchQuery
  ): Promise<ProductSearchResult[]> {
    const results = await this.db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          inArray(products.id, productIds),
          eq(products.isActive, true)
        )
      );

    return this.convertToSearchResults(results, ftsQuery);
  }

  /**
   * Convert database results to search result format
   */
  private async convertToSearchResults(
    results: Array<{ product: Product; category: Category | null }>,
    ftsQuery: FTSQuery
  ): Promise<ProductSearchResult[]> {
    const searchResults: ProductSearchResult[] = [];

    for (const { product, category } of results) {
      // Get variants for this product
      const variants = await this.db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id));

      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(product, category, variants, ftsQuery);

      // Calculate total stock quantity
      const stockQuantity = variants.reduce((total, variant) => total + (variant.stockQuantity || 0), 0);

      const searchResult: ProductSearchResult = {
        id: product.id,
        name: product.name,
        description: product.description || undefined,
        basePrice: product.basePrice,
        categoryId: product.categoryId || '',
        categoryName: category?.name || '',
        keywords: this.parseKeywords(product.keywords),
        metadata: this.parseMetadata(product.metadata),
        variants: variants.map(variant => ({
          id: variant.id,
          name: variant.name,
          price: variant.price,
          stockQuantity: variant.stockQuantity || 0,
          attributes: this.parseAttributes(variant.attributes),
          keywords: this.parseKeywords(variant.keywords),
        })),
        relevanceScore,
        isActive: product.isActive || false,
        stockQuantity,
      };

      searchResults.push(searchResult);
    }

    return searchResults;
  }

  /**
   * Calculate relevance score for ranking
   */
  private calculateRelevanceScore(
    product: Product,
    category: Category | null,
    variants: ProductVariant[],
    ftsQuery: FTSQuery
  ): number {
    const { terms, phrases } = ftsQuery;
    const weights = this.config.rankingWeights;
    let score = 0;

    const allTerms = [...terms, ...phrases];
    const productName = product.name.toLowerCase();
    const productDesc = (product.description || '').toLowerCase();
    const productKeywords = this.parseKeywords(product.keywords);
    const categoryName = (category?.name || '').toLowerCase();

    for (const term of allTerms) {
      const lowerTerm = term.toLowerCase();

      // Exact name match
      if (productName === lowerTerm) {
        score += weights.exactMatch;
      }
      // Name contains term
      else if (productName.includes(lowerTerm)) {
        score += weights.nameMatch;
      }

      // Keyword matches
      const keywordMatches = productKeywords.filter(keyword => 
        keyword.toLowerCase().includes(lowerTerm)
      ).length;
      score += keywordMatches * weights.keywordMatch;

      // Description match
      if (productDesc.includes(lowerTerm)) {
        score += weights.descriptionMatch;
      }

      // Category match
      if (categoryName.includes(lowerTerm)) {
        score += weights.categoryMatch;
      }
    }

    // Stock availability boost
    const totalStock = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
    if (totalStock > 0) {
      score += weights.stockAvailability;
    }

    // Price relevance (lower prices get slight boost)
    const priceBoost = Math.max(0, (1000 - product.basePrice) / 1000) * weights.priceRelevance;
    score += priceBoost;

    return Math.round(score * 100) / 100;
  }

  /**
   * Apply filters and ranking to search results
   */
  private async applyFiltersAndRanking(
    results: ProductSearchResult[],
    query: SearchQuery
  ): Promise<ProductSearchResult[]> {
    let filteredResults = [...results];

    // Apply category filter
    if (query.categoryId) {
      filteredResults = filteredResults.filter(product => product.categoryId === query.categoryId);
    }

    // Apply price range filter
    if (query.filters.priceMin !== undefined || query.filters.priceMax !== undefined) {
      filteredResults = filteredResults.filter(product => {
        const price = product.basePrice;
        const minPrice = query.filters.priceMin || 0;
        const maxPrice = query.filters.priceMax || Infinity;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Apply stock filter
    if (query.filters.inStock) {
      filteredResults = filteredResults.filter(product => product.stockQuantity > 0);
    }

    // Apply metadata attribute filters
    if (query.filters.attributes) {
      for (const [attributeName, attributeValues] of Object.entries(query.filters.attributes)) {
        filteredResults = filteredResults.filter(product => {
          const metadataValue = product.metadata.customAttributes[attributeName] || 
                               (product.metadata as any)[attributeName];
          return metadataValue && attributeValues.includes(metadataValue);
        });
      }
    }

    // Apply sorting
    switch (query.sortBy) {
      case 'price_asc':
        filteredResults.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price_desc':
        filteredResults.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'name':
        filteredResults.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        // Would need createdAt field in results
        break;
      case 'oldest':
        // Would need createdAt field in results
        break;
      case 'popularity':
        // Would need sales data for popularity sorting
        break;
      case 'relevance':
      default:
        filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
    }

    return filteredResults;
  }

  /**
   * Get available filters based on current search results
   */
  private async getAvailableFilters(query: SearchQuery): Promise<AvailableFilters> {
    // Get all categories
    const categoriesResult = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        count: sql<number>`COUNT(${products.id})`,
      })
      .from(categories)
      .leftJoin(products, and(
        eq(products.categoryId, categories.id),
        eq(products.isActive, true)
      ))
      .where(eq(categories.isActive, true))
      .groupBy(categories.id, categories.name)
      .having(sql`COUNT(${products.id}) > 0`);

    const categoryFilters: FilterOption[] = categoriesResult.map(cat => ({
      value: cat.id,
      label: cat.name,
      count: Number(cat.count),
    }));

    // Get price ranges
    const priceStats = await this.db
      .select({
        minPrice: sql<number>`MIN(${products.basePrice})`,
        maxPrice: sql<number>`MAX(${products.basePrice})`,
        avgPrice: sql<number>`AVG(${products.basePrice})`,
      })
      .from(products)
      .where(eq(products.isActive, true));

    const priceRanges: PriceRange[] = this.generatePriceRanges(
      priceStats[0]?.minPrice || 0,
      priceStats[0]?.maxPrice || 1000
    );

    // Get attribute filters from metadata
    const attributeFilters = await this.getAttributeFilters();

    return {
      categories: categoryFilters,
      priceRanges,
      attributes: attributeFilters,
      languages: [
        { value: 'en', label: 'English', count: 0 },
        { value: 'hi', label: 'हिंदी', count: 0 },
        { value: 'bn', label: 'বাংলা', count: 0 },
      ],
    };
  }

  /**
   * Generate price range filters
   */
  private generatePriceRanges(minPrice: number, maxPrice: number): PriceRange[] {
    const ranges: PriceRange[] = [];
    const step = Math.ceil((maxPrice - minPrice) / 5);

    for (let i = 0; i < 5; i++) {
      const min = minPrice + (i * step);
      const max = i === 4 ? maxPrice : minPrice + ((i + 1) * step) - 1;
      
      ranges.push({
        min,
        max,
        label: `₹${min} - ₹${max}`,
        count: 0, // Would need to calculate actual counts
      });
    }

    return ranges;
  }

  /**
   * Get attribute filters from product metadata
   */
  private async getAttributeFilters(): Promise<Record<string, FilterOption[]>> {
    const attributeFilters: Record<string, FilterOption[]> = {};

    // This would need to be implemented based on actual metadata structure
    // For now, return common attributes
    attributeFilters.author = [];
    attributeFilters.publisher = [];
    attributeFilters.language = [];
    attributeFilters.material = [];

    return attributeFilters;
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(query: string, language: SearchLanguage = 'en'): Promise<string[]> {
    if (query.length < 2) return [];

    const suggestions: string[] = [];
    const searchTerm = `%${query.toLowerCase()}%`;

    try {
      // Get suggestions from product names
      const productSuggestions = await this.db
        .select({ name: products.name })
        .from(products)
        .where(
          and(
            like(products.name, searchTerm),
            eq(products.isActive, true)
          )
        )
        .limit(this.config.suggestionLimit);

      suggestions.push(...productSuggestions.map(p => p.name));

      // Remove duplicates and return using Array.from instead of spread operator
      const uniqueSuggestions = Array.from(new Set(suggestions));
      return uniqueSuggestions.slice(0, this.config.suggestionLimit);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Update search suggestions based on user queries
   */
  async updateSuggestions(query: string, language: SearchLanguage = 'en'): Promise<void> {
    if (query.length < 2) return;

    // TODO: Implement search suggestions table and update logic
    // For now, this is a placeholder that doesn't perform any database operations
    console.log(`Would update suggestion: ${query} (${language})`);
  }

  /**
   * Multi-language search support
   */
  async translateQuery(query: string, targetLanguage: SearchLanguage): Promise<string> {
    if (!this.config.enableTransliteration) return query;

    // TODO: Implement language mappings table and translation logic
    // For now, return the original query
    return query;
  }

  /**
   * Utility methods
   */
  private parseKeywords(keywordsJson: string | null): string[] {
    if (!keywordsJson) return [];
    try {
      return JSON.parse(keywordsJson);
    } catch {
      return [];
    }
  }

  private parseMetadata(metadataJson: string | null): any {
    if (!metadataJson) return { customAttributes: {} };
    try {
      const parsed = JSON.parse(metadataJson);
      return { ...parsed, customAttributes: parsed.customAttributes || {} };
    } catch {
      return { customAttributes: {} };
    }
  }

  private parseAttributes(attributesJson: string | null): Record<string, string> {
    if (!attributesJson) return {};
    try {
      return JSON.parse(attributesJson);
    } catch {
      return {};
    }
  }

  private generateCacheKey(query: SearchQuery): string {
    return JSON.stringify({
      query: query.query,
      categoryId: query.categoryId,
      filters: query.filters,
      sortBy: query.sortBy,
      language: query.language,
    });
  }

  private isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.config.cacheTimeout;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update search configuration
   */
  updateConfig(newConfig: Partial<SearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const searchEngine = new SearchEngine();