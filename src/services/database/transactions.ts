import { getLocalDb } from '@/lib/db/connection';
import { transactions, transactionItems, products, productVariants, users, type Transaction, type NewTransaction, type NewTransactionItem } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

// Types for transaction with items
export interface TransactionWithItems extends Transaction {
  items: Array<{
    id: string;
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      id: string;
      name: string;
      basePrice: number;
    };
    variant?: {
      id: string;
      name: string;
      price: number;
    };
  }>;
}

export interface DailySalesReport {
  date: Date;
  totalSales: number;
  totalTransactions: number;
  totalTax: number;
  totalDiscount: number;
}

export interface TopSellingProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export class TransactionService {
  private db = getLocalDb();

  // Allow overriding the database connection for testing
  public setDb(database: any) {
    this.db = database;
  }

  /**
   * Create a new transaction with items
   */
  async createTransaction(
    data: {
      userId: string;
      paymentMethod: string;
      paymentReference?: string;
      tax?: number;
      discount?: number;
      items: Array<{
        productId: string;
        variantId?: string;
        quantity: number;
        unitPrice: number;
      }>;
    }
  ): Promise<Transaction> {
    try {
      if (!data.items || data.items.length === 0) {
        throw new Error('Transaction must have at least one item');
      }

      const subtotal = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const tax = data.tax || 0;
      const discount = data.discount || 0;
      const total = subtotal + tax - discount;

      const transactionData: NewTransaction = {
        id: uuidv4(),
        userId: data.userId,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference || null,
        status: 'completed',
        syncStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Insert transaction
      await this.db.insert(transactions).values(transactionData);

      // Insert transaction items
      const transactionItemsData: NewTransactionItem[] = data.items.map(item => ({
        id: uuidv4(),
        transactionId: transactionData.id,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
        createdAt: new Date(),
      }));

      await this.db.insert(transactionItems).values(transactionItemsData);

      // Update stock quantities
      for (const item of data.items) {
        if (item.variantId) {
          await this.db
            .update(productVariants)
            .set({
              stockQuantity: sql`${productVariants.stockQuantity} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(productVariants.id, item.variantId));
        }
      }

      // Return the created transaction with items
      return await this.findTransactionWithItems(transactionData.id) as Transaction & { items: any[] };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    try {
      const result = await this.db
        .select()
        .from(transactions)
        .where(eq(transactions.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding transaction by ID:', error);
      throw error;
    }
  }

  /**
   * Find transaction with items and product details
   */
  async findTransactionWithItems(id: string): Promise<TransactionWithItems | null> {
    try {
      const transaction = await this.findById(id);
      if (!transaction) {
        return null;
      }

      const items = await this.db
        .select({
          id: transactionItems.id,
          productId: transactionItems.productId,
          variantId: transactionItems.variantId,
          quantity: transactionItems.quantity,
          unitPrice: transactionItems.unitPrice,
          totalPrice: transactionItems.totalPrice,
          productName: products.name,
          productBasePrice: products.basePrice,
          variantName: productVariants.name,
          variantPrice: productVariants.price,
        })
        .from(transactionItems)
        .leftJoin(products, eq(transactionItems.productId, products.id))
        .leftJoin(productVariants, eq(transactionItems.variantId, productVariants.id))
        .where(eq(transactionItems.transactionId, id));

      const transactionWithItems: TransactionWithItems = {
        ...transaction,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          product: {
            id: item.productId,
            name: item.productName || 'Unknown Product',
            basePrice: item.productBasePrice || 0,
          },
          variant: item.variantId ? {
            id: item.variantId,
            name: item.variantName || 'Unknown Variant',
            price: item.variantPrice || 0,
          } : undefined,
        })),
      };

      return transactionWithItems;
    } catch (error) {
      console.error('Error finding transaction with items:', error);
      throw error;
    }
  }

  /**
   * Find all transactions
   */
  async findAll(limit?: number): Promise<Transaction[]> {
    try {
      let query = this.db
        .select()
        .from(transactions)
        .orderBy(desc(transactions.createdAt));

      if (limit) {
        query = query.limit(limit);
      }

      return await query;
    } catch (error) {
      console.error('Error finding all transactions:', error);
      throw error;
    }
  }

  /**
   * Find transactions by user
   */
  async findByUser(userId: string): Promise<Transaction[]> {
    try {
      return await this.db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt));
    } catch (error) {
      console.error('Error finding transactions by user:', error);
      throw error;
    }
  }

  /**
   * Find transactions by status
   */
  async findByStatus(status: string): Promise<Transaction[]> {
    try {
      return await this.db
        .select()
        .from(transactions)
        .where(eq(transactions.status, status))
        .orderBy(desc(transactions.createdAt));
    } catch (error) {
      console.error('Error finding transactions by status:', error);
      throw error;
    }
  }

  /**
   * Find transactions by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    try {
      return await this.db
        .select()
        .from(transactions)
        .where(
          and(
            gte(transactions.createdAt, startDate),
            lte(transactions.createdAt, endDate)
          )
        )
        .orderBy(desc(transactions.createdAt));
    } catch (error) {
      console.error('Error finding transactions by date range:', error);
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(id: string, status: string): Promise<boolean> {
    try {
      const result = await this.db
        .update(transactions)
        .set({ status, updatedAt: new Date() })
        .where(eq(transactions.id, id));

      return result.changes > 0;
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: string, syncStatus: string): Promise<boolean> {
    try {
      const result = await this.db
        .update(transactions)
        .set({ syncStatus, updatedAt: new Date() })
        .where(eq(transactions.id, id));

      return result.changes > 0;
    } catch (error) {
      console.error('Error updating sync status:', error);
      throw error;
    }
  }

  /**
   * Get daily sales report
   */
  async getDailySales(date: Date): Promise<DailySalesReport> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await this.db
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

      return {
        date,
        totalSales: Number(result[0]?.totalSales || 0),
        totalTransactions: Number(result[0]?.totalTransactions || 0),
        totalTax: Number(result[0]?.totalTax || 0),
        totalDiscount: Number(result[0]?.totalDiscount || 0),
      };
    } catch (error) {
      console.error('Error getting daily sales:', error);
      throw error;
    }
  }

  /**
   * Get top selling products
   */
  async getTopSellingProducts(limit: number = 10): Promise<TopSellingProduct[]> {
    try {
      const result = await this.db
        .select({
          productId: transactionItems.productId,
          productName: products.name,
          totalQuantity: sql<number>`SUM(${transactionItems.quantity})`,
          totalRevenue: sql<number>`SUM(${transactionItems.totalPrice})`,
        })
        .from(transactionItems)
        .leftJoin(products, eq(transactionItems.productId, products.id))
        .leftJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .where(eq(transactions.status, 'completed'))
        .groupBy(transactionItems.productId, products.name)
        .orderBy(desc(sql`SUM(${transactionItems.quantity})`))
        .limit(limit);

      return result.map(row => ({
        productId: row.productId,
        productName: row.productName || 'Unknown Product',
        totalQuantity: Number(row.totalQuantity),
        totalRevenue: Number(row.totalRevenue),
      }));
    } catch (error) {
      console.error('Error getting top selling products:', error);
      throw error;
    }
  }
}

export const transactionService = new TransactionService();