import { getDb } from '@/lib/db/connection';
import { 
  transactions, 
  transactionItems, 
  products, 
  productVariants, 
  categories, 
  users,
  type Transaction 
} from '@/lib/db/schema';
import { eq, desc, and, gte, lte, sql, count, sum } from 'drizzle-orm';
import { formatDateOnly } from '@/lib/utils';

// Report types
export interface DailySalesReport {
  date: Date;
  totalSales: number;
  totalTransactions: number;
  totalTax: number;
  totalDiscount: number;
  paymentMethodBreakdown: {
    cash: { count: number; amount: number };
    upi: { count: number; amount: number };
  };
  topProducts: TopSellingProduct[];
}

export interface TransactionHistoryItem {
  id: string;
  userId: string;
  userName: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentReference?: string;
  status: string;
  createdAt: Date;
  itemCount: number;
  items: Array<{
    productName: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface TopSellingProduct {
  productId: string;
  productName: string;
  categoryName?: string;
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
}

export interface ProductPerformanceReport {
  productId: string;
  productName: string;
  categoryName?: string;
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
  averageOrderValue: number;
  lastSoldAt?: Date;
  currentStock: number;
}

export interface SalesAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topPaymentMethod: string;
  salesTrend: Array<{
    date: Date;
    sales: number;
    transactions: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    revenue: number;
    percentage: number;
  }>;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  paymentMethod?: string;
  status?: string;
  categoryId?: string;
  productId?: string;
}

export class ReportService {
  private db = getDb();

  // Allow overriding the database connection for testing
  public setDb(database: any) {
    this.db = database;
  }

  /**
   * Generate daily sales report
   */
  async getDailySalesReport(date: Date): Promise<DailySalesReport> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get basic sales metrics
      const salesMetrics = await this.db
        .select({
          totalSales: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
          totalTransactions: sql<number>`COUNT(*)`,
          totalTax: sql<number>`COALESCE(SUM(${transactions.tax}), 0)`,
          totalDiscount: sql<number>`COALESCE(SUM(${transactions.discount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            gte(transactions.createdAt, startOfDay),
            lte(transactions.createdAt, endOfDay),
            eq(transactions.status, 'completed')
          )
        );

      // Get payment method breakdown
      const paymentBreakdown = await this.db
        .select({
          paymentMethod: transactions.paymentMethod,
          count: sql<number>`COUNT(*)`,
          amount: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            gte(transactions.createdAt, startOfDay),
            lte(transactions.createdAt, endOfDay),
            eq(transactions.status, 'completed')
          )
        )
        .groupBy(transactions.paymentMethod);

      // Get top products for the day
      const topProducts = await this.getTopSellingProducts({
        startDate: startOfDay,
        endDate: endOfDay,
      }, 5);

      // Format payment method breakdown
      const paymentMethodBreakdown = {
        cash: { count: 0, amount: 0 },
        upi: { count: 0, amount: 0 },
      };

      paymentBreakdown.forEach(item => {
        if (item.paymentMethod === 'cash') {
          paymentMethodBreakdown.cash = {
            count: Number(item.count),
            amount: Number(item.amount),
          };
        } else if (item.paymentMethod === 'upi') {
          paymentMethodBreakdown.upi = {
            count: Number(item.count),
            amount: Number(item.amount),
          };
        }
      });

      return {
        date,
        totalSales: Number(salesMetrics[0]?.totalSales || 0),
        totalTransactions: Number(salesMetrics[0]?.totalTransactions || 0),
        totalTax: Number(salesMetrics[0]?.totalTax || 0),
        totalDiscount: Number(salesMetrics[0]?.totalDiscount || 0),
        paymentMethodBreakdown,
        topProducts,
      };
    } catch (error) {
      console.error('Error generating daily sales report:', error);
      throw error;
    }
  }

  /**
   * Get transaction history with filtering
   */
  async getTransactionHistory(
    filters: ReportFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ transactions: TransactionHistoryItem[]; totalCount: number }> {
    try {
      const conditions = [eq(transactions.status, 'completed')];

      // Apply filters
      if (filters.startDate) {
        conditions.push(gte(transactions.createdAt, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(transactions.createdAt, filters.endDate));
      }
      if (filters.userId) {
        conditions.push(eq(transactions.userId, filters.userId));
      }
      if (filters.paymentMethod) {
        conditions.push(eq(transactions.paymentMethod, filters.paymentMethod));
      }

      // Get total count
      const totalCountResult = await this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(transactions)
        .where(and(...conditions));

      const totalCount = Number(totalCountResult[0]?.count || 0);

      // Get transactions with user info
      const transactionResults = await this.db
        .select({
          transaction: transactions,
          userName: users.username,
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset);

      // Get items for each transaction
      const transactionHistory: TransactionHistoryItem[] = await Promise.all(
        transactionResults.map(async (row) => {
          const items = await this.db
            .select({
              productName: products.name,
              variantName: productVariants.name,
              quantity: transactionItems.quantity,
              unitPrice: transactionItems.unitPrice,
              totalPrice: transactionItems.totalPrice,
            })
            .from(transactionItems)
            .leftJoin(products, eq(transactionItems.productId, products.id))
            .leftJoin(productVariants, eq(transactionItems.variantId, productVariants.id))
            .where(eq(transactionItems.transactionId, row.transaction.id));

          return {
            id: row.transaction.id,
            userId: row.transaction.userId || '',
            userName: row.userName || 'Unknown User',
            subtotal: row.transaction.subtotal,
            tax: row.transaction.tax || 0,
            discount: row.transaction.discount || 0,
            total: row.transaction.total,
            paymentMethod: row.transaction.paymentMethod,
            paymentReference: row.transaction.paymentReference || undefined,
            status: row.transaction.status,
            createdAt: row.transaction.createdAt || new Date(),
            itemCount: items.length,
            items: items.map(item => ({
              productName: item.productName || 'Unknown Product',
              variantName: item.variantName || undefined,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          };
        })
      );

      return {
        transactions: transactionHistory,
        totalCount,
      };
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * Get top selling products
   */
  async getTopSellingProducts(
    filters: ReportFilters = {},
    limit: number = 10
  ): Promise<TopSellingProduct[]> {
    try {
      const conditions = [eq(transactions.status, 'completed')];

      // Apply date filters
      if (filters.startDate) {
        conditions.push(gte(transactions.createdAt, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(transactions.createdAt, filters.endDate));
      }
      if (filters.categoryId) {
        conditions.push(eq(products.categoryId, filters.categoryId));
      }

      const results = await this.db
        .select({
          productId: transactionItems.productId,
          productName: products.name,
          categoryName: categories.name,
          totalQuantity: sql<number>`SUM(${transactionItems.quantity})`,
          totalRevenue: sql<number>`SUM(${transactionItems.totalPrice})`,
          transactionCount: sql<number>`COUNT(DISTINCT ${transactions.id})`,
        })
        .from(transactionItems)
        .leftJoin(products, eq(transactionItems.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .where(and(...conditions))
        .groupBy(transactionItems.productId, products.name, categories.name)
        .orderBy(desc(sql`SUM(${transactionItems.quantity})`))
        .limit(limit);

      return results.map(row => ({
        productId: row.productId || '',
        productName: row.productName || 'Unknown Product',
        categoryName: row.categoryName || undefined,
        totalQuantity: Number(row.totalQuantity),
        totalRevenue: Number(row.totalRevenue),
        transactionCount: Number(row.transactionCount),
      }));
    } catch (error) {
      console.error('Error getting top selling products:', error);
      throw error;
    }
  }

  /**
   * Get product performance analytics
   */
  async getProductPerformanceReport(
    filters: ReportFilters = {}
  ): Promise<ProductPerformanceReport[]> {
    try {
      const conditions = [eq(transactions.status, 'completed')];

      // Apply filters
      if (filters.startDate) {
        conditions.push(gte(transactions.createdAt, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(transactions.createdAt, filters.endDate));
      }
      if (filters.categoryId) {
        conditions.push(eq(products.categoryId, filters.categoryId));
      }
      if (filters.productId) {
        conditions.push(eq(products.id, filters.productId));
      }

      const results = await this.db
        .select({
          productId: products.id,
          productName: products.name,
          categoryName: categories.name,
          totalQuantity: sql<number>`COALESCE(SUM(${transactionItems.quantity}), 0)`,
          totalRevenue: sql<number>`COALESCE(SUM(${transactionItems.totalPrice}), 0)`,
          transactionCount: sql<number>`COUNT(DISTINCT ${transactions.id})`,
          lastSoldAt: sql<Date>`MAX(${transactions.createdAt})`,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(transactionItems, eq(products.id, transactionItems.productId))
        .leftJoin(transactions, and(
          eq(transactionItems.transactionId, transactions.id),
          ...conditions
        ))
        .where(eq(products.isActive, true))
        .groupBy(products.id, products.name, categories.name)
        .orderBy(desc(sql`COALESCE(SUM(${transactionItems.totalPrice}), 0)`));

      // Get current stock for each product
      const productsWithStock = await Promise.all(
        results.map(async (row) => {
          const stockResult = await this.db
            .select({
              totalStock: sql<number>`COALESCE(SUM(${productVariants.stockQuantity}), 0)`,
            })
            .from(productVariants)
            .where(eq(productVariants.productId, row.productId));

          const totalQuantity = Number(row.totalQuantity);
          const totalRevenue = Number(row.totalRevenue);
          const transactionCount = Number(row.transactionCount);

          return {
            productId: row.productId,
            productName: row.productName,
            categoryName: row.categoryName || undefined,
            totalQuantity,
            totalRevenue,
            transactionCount,
            averageOrderValue: transactionCount > 0 ? totalRevenue / transactionCount : 0,
            lastSoldAt: row.lastSoldAt || undefined,
            currentStock: Number(stockResult[0]?.totalStock || 0),
          };
        })
      );

      return productsWithStock;
    } catch (error) {
      console.error('Error getting product performance report:', error);
      throw error;
    }
  }

  /**
   * Get sales analytics overview
   */
  async getSalesAnalytics(filters: ReportFilters = {}): Promise<SalesAnalytics> {
    try {
      const conditions = [eq(transactions.status, 'completed')];

      // Apply date filters
      if (filters.startDate) {
        conditions.push(gte(transactions.createdAt, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(transactions.createdAt, filters.endDate));
      }

      // Get overall metrics
      const overallMetrics = await this.db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
          totalTransactions: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(and(...conditions));

      const totalRevenue = Number(overallMetrics[0]?.totalRevenue || 0);
      const totalTransactions = Number(overallMetrics[0]?.totalTransactions || 0);
      const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Get top payment method
      const paymentMethods = await this.db
        .select({
          paymentMethod: transactions.paymentMethod,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(and(...conditions))
        .groupBy(transactions.paymentMethod)
        .orderBy(desc(sql`COUNT(*)`));

      const topPaymentMethod = paymentMethods[0]?.paymentMethod || 'cash';

      // Get sales trend (daily for the period)
      const salesTrend = await this.db
        .select({
          date: sql<string>`DATE(${transactions.createdAt})`,
          sales: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
          transactions: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(and(...conditions))
        .groupBy(sql`DATE(${transactions.createdAt})`)
        .orderBy(sql`DATE(${transactions.createdAt})`);

      // Get category breakdown
      const categoryBreakdown = await this.db
        .select({
          categoryId: categories.id,
          categoryName: categories.name,
          revenue: sql<number>`COALESCE(SUM(${transactionItems.totalPrice}), 0)`,
        })
        .from(transactionItems)
        .leftJoin(products, eq(transactionItems.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .where(and(...conditions))
        .groupBy(categories.id, categories.name)
        .orderBy(desc(sql`COALESCE(SUM(${transactionItems.totalPrice}), 0)`));

      const categoryBreakdownWithPercentage = categoryBreakdown.map(item => ({
        categoryId: item.categoryId || 'uncategorized',
        categoryName: item.categoryName || 'Uncategorized',
        revenue: Number(item.revenue),
        percentage: totalRevenue > 0 ? (Number(item.revenue) / totalRevenue) * 100 : 0,
      }));

      return {
        totalRevenue,
        totalTransactions,
        averageOrderValue,
        topPaymentMethod,
        salesTrend: salesTrend.map(item => ({
          date: new Date(item.date),
          sales: Number(item.sales),
          transactions: Number(item.transactions),
        })),
        categoryBreakdown: categoryBreakdownWithPercentage,
      };
    } catch (error) {
      console.error('Error getting sales analytics:', error);
      throw error;
    }
  }

  /**
   * Get report data for export
   */
  async getExportData(
    reportType: 'transactions' | 'products' | 'daily-sales',
    filters: ReportFilters = {}
  ): Promise<any[]> {
    try {
      switch (reportType) {
        case 'transactions':
          const { transactions: transactionData } = await this.getTransactionHistory(filters, 1000, 0);
          return transactionData.map(t => ({
            'Transaction ID': t.id,
            'Date': formatDateOnly(t.createdAt),
            'Time': t.createdAt instanceof Date ? t.createdAt.toTimeString().split(' ')[0] : new Date(t.createdAt).toTimeString().split(' ')[0],
            'User': t.userName,
            'Subtotal': t.subtotal,
            'Tax': t.tax,
            'Discount': t.discount,
            'Total': t.total,
            'Payment Method': t.paymentMethod,
            'Payment Reference': t.paymentReference || '',
            'Items': t.items.map(item => 
              `${item.productName}${item.variantName ? ` (${item.variantName})` : ''} x${item.quantity}`
            ).join('; '),
          }));

        case 'products':
          const productData = await this.getProductPerformanceReport(filters);
          return productData.map(p => ({
            'Product ID': p.productId,
            'Product Name': p.productName,
            'Category': p.categoryName || 'Uncategorized',
            'Total Quantity Sold': p.totalQuantity,
            'Total Revenue': p.totalRevenue,
            'Transaction Count': p.transactionCount,
            'Average Order Value': p.averageOrderValue.toFixed(2),
            'Current Stock': p.currentStock,
            'Last Sold': p.lastSoldAt ? formatDateOnly(p.lastSoldAt) : 'Never',
          }));

        case 'daily-sales':
          const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const endDate = filters.endDate || new Date();
          const dailyReports = [];
          
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const report = await this.getDailySalesReport(new Date(d));
            dailyReports.push({
              'Date': formatDateOnly(report.date),
              'Total Sales': report.totalSales,
              'Total Transactions': report.totalTransactions,
              'Total Tax': report.totalTax,
              'Total Discount': report.totalDiscount,
              'Cash Sales': report.paymentMethodBreakdown.cash.amount,
              'Cash Transactions': report.paymentMethodBreakdown.cash.count,
              'UPI Sales': report.paymentMethodBreakdown.upi.amount,
              'UPI Transactions': report.paymentMethodBreakdown.upi.count,
            });
          }
          return dailyReports;

        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }
    } catch (error) {
      console.error('Error getting export data:', error);
      throw error;
    }
  }
}

export const reportService = new ReportService();