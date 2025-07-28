import { eq, and, desc, count, sql } from "drizzle-orm";
import {
  searchAnalytics,
  type SearchAnalytics,
  type NewSearchAnalytics,
} from "@/lib/db/schema";
import { BaseService } from "./base";

export class SearchService extends BaseService<
  SearchAnalytics,
  NewSearchAnalytics
> {
  get table() {
    return searchAnalytics;
  }

  generateId(): string {
    return this.generateUUID();
  }

  // Search analytics methods
  async recordSearch(
    query: string,
    resultCount: number,
    userId?: string
  ): Promise<SearchAnalytics> {
    try {
      const searchData = {
        query: query.toLowerCase().trim(),
        resultCount,
        userId,
        timestamp: new Date(),
      } as Omit<NewSearchAnalytics, "id">;

      return await this.create(searchData);
    } catch (error) {
      console.error("Error recording search:", error);
      throw error;
    }
  }

  async recordProductClick(
    searchId: string,
    productId: string
  ): Promise<boolean> {
    try {
      const result = await this.localDb
        .update(searchAnalytics)
        .set({
          clickedProductId: productId,
          timestamp: new Date(),
        })
        .where(eq(searchAnalytics.id, searchId));

      await this.queueForSync("update", searchId);

      return result.changes > 0;
    } catch (error) {
      console.error("Error recording product click:", error);
      throw error;
    }
  }

  async getPopularSearches(
    limit: number = 10,
    days: number = 30
  ): Promise<PopularSearch[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      const results = await this.localDb
        .select({
          query: searchAnalytics.query,
          searchCount: count(searchAnalytics.id),
          avgResultCount: sql<number>`AVG(${searchAnalytics.resultCount})`,
          clickCount: sql<number>`SUM(CASE WHEN ${searchAnalytics.clickedProductId} IS NOT NULL THEN 1 ELSE 0 END)`,
        })
        .from(searchAnalytics)
        .where(sql`${searchAnalytics.timestamp} >= ${cutoffTimestamp}`)
        .groupBy(searchAnalytics.query)
        .orderBy(desc(count(searchAnalytics.id)))
        .limit(limit);

      return results.map((row) => ({
        query: row.query,
        searchCount: Number(row.searchCount),
        avgResultCount: Number(row.avgResultCount || 0),
        clickCount: Number(row.clickCount || 0),
        clickThroughRate:
          row.searchCount > 0
            ? (Number(row.clickCount || 0) / Number(row.searchCount)) * 100
            : 0,
      }));
    } catch (error) {
      console.error("Error getting popular searches:", error);
      throw error;
    }
  }

  async getSearchesWithNoResults(
    limit: number = 10,
    days: number = 30
  ): Promise<NoResultSearch[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      const results = await this.localDb
        .select({
          query: searchAnalytics.query,
          searchCount: count(searchAnalytics.id),
          lastSearched: sql<Date>`MAX(${searchAnalytics.timestamp})`,
        })
        .from(searchAnalytics)
        .where(
          and(
            sql`${searchAnalytics.timestamp} >= ${cutoffTimestamp}`,
            eq(searchAnalytics.resultCount, 0)
          )
        )
        .groupBy(searchAnalytics.query)
        .orderBy(desc(count(searchAnalytics.id)))
        .limit(limit);

      return results.map((row) => ({
        query: row.query,
        searchCount: Number(row.searchCount),
        lastSearched: row.lastSearched,
      }));
    } catch (error) {
      console.error("Error getting searches with no results:", error);
      throw error;
    }
  }

  async getUserSearchHistory(
    userId: string,
    limit: number = 20
  ): Promise<SearchAnalytics[]> {
    try {
      return await this.localDb
        .select()
        .from(searchAnalytics)
        .where(eq(searchAnalytics.userId, userId))
        .orderBy(desc(searchAnalytics.timestamp))
        .limit(limit);
    } catch (error) {
      console.error("Error getting user search history:", error);
      throw error;
    }
  }

  async getSearchTrends(days: number = 7): Promise<SearchTrend[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      const results = await this.localDb
        .select({
          date: sql<string>`DATE(${searchAnalytics.timestamp}, 'unixepoch')`,
          searchCount: count(searchAnalytics.id),
          uniqueQueries: sql<number>`COUNT(DISTINCT ${searchAnalytics.query})`,
          avgResultCount: sql<number>`AVG(${searchAnalytics.resultCount})`,
        })
        .from(searchAnalytics)
        .where(sql`${searchAnalytics.timestamp} >= ${cutoffTimestamp}`)
        .groupBy(sql`DATE(${searchAnalytics.timestamp}, 'unixepoch')`)
        .orderBy(sql`DATE(${searchAnalytics.timestamp}, 'unixepoch')`);

      return results.map((row) => ({
        date: row.date,
        searchCount: Number(row.searchCount),
        uniqueQueries: Number(row.uniqueQueries),
        avgResultCount: Number(row.avgResultCount || 0),
      }));
    } catch (error) {
      console.error("Error getting search trends:", error);
      throw error;
    }
  }

  async getClickThroughRates(
    limit: number = 10,
    days: number = 30
  ): Promise<ClickThroughRate[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      const results = await this.localDb
        .select({
          query: searchAnalytics.query,
          totalSearches: count(searchAnalytics.id),
          totalClicks: sql<number>`SUM(CASE WHEN ${searchAnalytics.clickedProductId} IS NOT NULL THEN 1 ELSE 0 END)`,
          avgResultCount: sql<number>`AVG(${searchAnalytics.resultCount})`,
        })
        .from(searchAnalytics)
        .where(sql`${searchAnalytics.timestamp} >= ${cutoffTimestamp}`)
        .groupBy(searchAnalytics.query)
        .having(sql`COUNT(${searchAnalytics.id}) >= 5`) // Only queries with at least 5 searches
        .orderBy(desc(count(searchAnalytics.id)))
        .limit(limit);

      return results.map((row) => ({
        query: row.query,
        totalSearches: Number(row.totalSearches),
        totalClicks: Number(row.totalClicks || 0),
        clickThroughRate:
          row.totalSearches > 0
            ? (Number(row.totalClicks || 0) / Number(row.totalSearches)) * 100
            : 0,
        avgResultCount: Number(row.avgResultCount || 0),
      }));
    } catch (error) {
      console.error("Error getting click-through rates:", error);
      throw error;
    }
  }

  async cleanupOldSearches(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      const result = await this.localDb
        .delete(searchAnalytics)
        .where(sql`${searchAnalytics.timestamp} < ${cutoffTimestamp}`);

      console.log(`Cleaned up ${result.changes} old search records`);
      return result.changes;
    } catch (error) {
      console.error("Error cleaning up old searches:", error);
      throw error;
    }
  }
}

// Types
export interface PopularSearch {
  query: string;
  searchCount: number;
  avgResultCount: number;
  clickCount: number;
  clickThroughRate: number;
}

export interface NoResultSearch {
  query: string;
  searchCount: number;
  lastSearched: Date;
}

export interface SearchTrend {
  date: string;
  searchCount: number;
  uniqueQueries: number;
  avgResultCount: number;
}

export interface ClickThroughRate {
  query: string;
  totalSearches: number;
  totalClicks: number;
  clickThroughRate: number;
  avgResultCount: number;
}

// Export singleton instance
export const searchService = new SearchService();
