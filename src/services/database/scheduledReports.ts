import { eq, desc } from "drizzle-orm";
import {
  scheduledReports,
  type ScheduledReport,
  type NewScheduledReport,
} from "@/lib/db/schema";
import { BaseService } from "./base";
import { syncService } from "./sync";

export class ScheduledReportsService extends BaseService<ScheduledReport, NewScheduledReport> {
  get table() {
    return scheduledReports;
  }

  generateId(): string {
    return this.generateUUID();
  }

  async create(data: NewScheduledReport): Promise<ScheduledReport> {
    const result = await super.create(data);
    
    // Queue for sync if offline
    if (typeof window !== 'undefined' && !navigator.onLine) {
      syncService.queueOperation('create', 'scheduledReports', result);
    }
    
    return result;
  }

  async update(id: string, data: Partial<NewScheduledReport>): Promise<ScheduledReport> {
    const result = await super.update(id, data);
    
    // Queue for sync if offline
    if (typeof window !== 'undefined' && !navigator.onLine) {
      syncService.queueOperation('update', 'scheduledReports', result);
    }
    
    return result;
  }

  async delete(id: string): Promise<void> {
    await super.delete(id);
    
    // Queue for sync if offline
    if (typeof window !== 'undefined' && !navigator.onLine) {
      syncService.queueOperation('delete', 'scheduledReports', { id });
    }
  }

  async getActiveReports(): Promise<ScheduledReport[]> {
    try {
      return await this.db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.isActive, true))
        .orderBy(desc(scheduledReports.nextRun));
    } catch (error) {
      console.error("Error getting active scheduled reports:", error);
      throw error;
    }
  }

  async getReportsByUser(userId: string): Promise<ScheduledReport[]> {
    try {
      return await this.db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.createdBy, userId))
        .orderBy(desc(scheduledReports.createdAt));
    } catch (error) {
      console.error("Error getting user scheduled reports:", error);
      throw error;
    }
  }

  async updateNextRun(id: string, nextRun: Date): Promise<void> {
    try {
      await this.db
        .update(scheduledReports)
        .set({
          nextRun,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(eq(scheduledReports.id, id));

      // Queue for sync if offline
      if (typeof window !== 'undefined' && !navigator.onLine) {
        syncService.queueOperation('update', 'scheduledReports', { id, nextRun });
      }
    } catch (error) {
      console.error("Error updating next run time:", error);
      throw error;
    }
  }

  async updateLastRun(id: string, lastRun: Date): Promise<void> {
    try {
      await this.db
        .update(scheduledReports)
        .set({
          lastRun,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(eq(scheduledReports.id, id));

      // Queue for sync if offline
      if (typeof window !== 'undefined' && !navigator.onLine) {
        syncService.queueOperation('update', 'scheduledReports', { id, lastRun });
      }
    } catch (error) {
      console.error("Error updating last run time:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const scheduledReportsService = new ScheduledReportsService();