import { getDb } from '@/lib/db/connection';
import { searchAnalytics } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { sql, desc, eq, and, gte } from 'drizzle-orm';

export class SearchService {
  private db = getDb();

  /**
   * Record a search query for analytics
   */
  async recordSearch(
    query: string,
    resultCount: number,
    clickedProductId?: string,
    userId?: string
  ): Promise<void> {
    try {
      await this.db.insert(searchAnalytics).values({
        id: uuidv4(),
        query,
        resultCount,
        clickedProductId: clickedProductId || null,
        userId: userId || null,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to record search analytics:', error);
      // Don't throw error to avoid breaking search functionality
    }
  }

  /**
   * Get popular search queries
   */
  async getPopularSearches(limit: number = 10, days: number = 30): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const results = await this.db
        .select({
          query: searchAnalytics.query,
          count: sql<number>`COUNT(*)`,
          avgResults: sql<number>`AVG(${searchAnalytics.resultCount})`,
        })
        .from(searchAnalytics)
        .where(gte(searchAnalytics.timestamp, cutoffDate))
        .groupBy(searchAnalytics.query)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(limit);

      return results.map(r => ({
        query: r.query,
        count: Number(r.count),
        avgResults: Number(r.avgResults),
      }));
    } catch (error) {
      console.error('Failed to get popular searches:', error);
      return [];
    }
  }

  /**
   * Get searches that returned no results
   */
  async getNoResultSearches(limit: number = 10, days: number = 30): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const results = await this.db
        .select({
          query: searchAnalytics.query,
          count: sql<number>`COUNT(*)`,
        })
        .from(searchAnalytics)
        .where(
          and(
            eq(searchAnalytics.resultCount, 0),
            gte(searchAnalytics.timestamp, cutoffDate)
          )
        )
        .groupBy(searchAnalytics.query)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(limit);

      return results.map(r => ({
        query: r.query,
        count: Number(r.count),
      }));
    } catch (error) {
      console.error('Failed to get no-result searches:', error);
      return [];
    }
  }

  /**
   * Get search trends over time
   */
  async getSearchTrends(days: number = 7): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const results = await this.db
        .select({
          date: sql<string>`DATE(${searchAnalytics.timestamp})`,
          count: sql<number>`COUNT(*)`,
          uniqueQueries: sql<number>`COUNT(DISTINCT ${searchAnalytics.query})`,
        })
        .from(searchAnalytics)
        .where(gte(searchAnalytics.timestamp, cutoffDate))
        .groupBy(sql`DATE(${searchAnalytics.timestamp})`)
        .orderBy(sql`DATE(${searchAnalytics.timestamp})`);

      return results.map(r => ({
        date: r.date,
        count: Number(r.count),
        uniqueQueries: Number(r.uniqueQueries),
      }));
    } catch (error) {
      console.error('Failed to get search trends:', error);
      return [];
    }
  }

  /**
   * Get click-through rates for searches
   */
  async getClickThroughRates(limit: number = 10, days: number = 30): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const results = await this.db
        .select({
          query: searchAnalytics.query,
          totalSearches: sql<number>`COUNT(*)`,
          clickedSearches: sql<number>`COUNT(CASE WHEN ${searchAnalytics.clickedProductId} IS NOT NULL THEN 1 END)`,
        })
        .from(searchAnalytics)
        .where(gte(searchAnalytics.timestamp, cutoffDate))
        .groupBy(searchAnalytics.query)
        .having(sql`COUNT(*) >= 5`) // Only include queries with at least 5 searches
        .orderBy(desc(sql`COUNT(*)`))
        .limit(limit);

      return results.map(r => {
        const totalSearches = Number(r.totalSearches);
        const clickedSearches = Number(r.clickedSearches);
        const clickThroughRate = totalSearches > 0 ? (clickedSearches / totalSearches) * 100 : 0;

        return {
          query: r.query,
          totalSearches,
          clickedSearches,
          clickThroughRate: Math.round(clickThroughRate * 100) / 100,
        };
      });
    } catch (error) {
      console.error('Failed to get click-through rates:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();