import { eq, and, or, desc, asc, gte, lte, sql, count, sum } from 'drizzle-orm';
import { 
  transactions, 
  transactionItems, 
  products, 
  productVariants, 
  users,
  type Transaction, 
  type NewTransaction,
  type TransactionItem,
  type NewTransactionItem 
} from '@/lib/db/schema';
import { BaseService } from './base';

export class TransactionService extends BaseService<Transaction, NewTransaction> {
  get table() {
    return transactions;
  }
  
  generateId(): string {
    return this.generateUUID();
  }
  
  // Transaction-specific methods
  async findByUser(userId: string, limit?: number): Promise<Transaction[]> {
    try {
      let query = this.localDb
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt));
      
      if (limit) {
        return await query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error finding transactions by user:', error);
      throw error;
    }
  }
  
  async findByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    try {
      return await this.localDb
        .select()
        .from(transactions)
        .where(and(
          gte(transactions.createdAt, startDate),
          lte(transactions.createdAt, endDate)
        ))
        .orderBy(desc(transactions.createdAt));
    } catch (error) {
      console.error('Error finding transactions by date range:', error);
      throw error;
    }
  }
  
  async findByStatus(status: string): Promise<Transaction[]> {
    try {
      return await this.localDb
        .select()
        .from(transactions)
        .where(eq(transactions.status, status))
        .orderBy(desc(transactions.createdAt));
    } catch (error) {
      console.error('Error finding transactions by status:', error);
      throw error;
    }
  }
  
  async findPendingSync(): Promise<Transaction[]> {
    try {
      return await this.localDb
        .select()
        .from(transactions)
        .where(eq(transactions.syncStatus, 'pending'))
        .orderBy(desc(transactions.createdAt));
    } catch (error) {
      console.error('Error finding pending sync transactions:', error);
      throw error;
    }
  }
  
  async findTransactionWithItems(transactionId: string): Promise<TransactionWithItems | null> {
    try {
      const transactionResult = await this.localDb
        .select({
          transaction: transactions,
          user: users
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .where(eq(transactions.id, transactionId))
        .limit(1);
      
      if (!transactionResult.length) {
        return null;
      }
      
      const itemsResult = await this.localDb
        .select({
          item: transactionItems,
          product: products,
          variant: productVariants
        })
        .from(transactionItems)
        .leftJoin(products, eq(transactionItems.productId, products.id))
        .leftJoin(productVariants, eq(transactionItems.variantId, productVariants.id))
        .where(eq(transactionItems.transactionId, transactionId))
        .orderBy(transactionItems.createdAt);
      
      return {
        ...transactionResult[0].transaction,
        user: transactionResult[0].user,
        items: itemsResult.map(row => ({
          ...row.item,
          product: row.product,
          variant: row.variant
        }))
      };
    } catch (error) {
      console.error('Error finding transaction with items:', error);
      throw error;
    }
  }
  
  async createTransaction(transactionData: CreateTransactionData): Promise<TransactionWithItems> {
    try {
      const { items, ...transactionInfo } = transactionData;
      
      // Validate items
      if (!items || items.length === 0) {
        throw new Error('Transaction must have at least one item');
      }
      
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const tax = transactionInfo.tax || 0;
      const discount = transactionInfo.discount || 0;
      const total = subtotal + tax - discount;
      
      // Create transaction
      const transaction = await this.create({
        ...transactionInfo,
        subtotal,
        tax,
        discount,
        total,
        status: 'completed',
        syncStatus: 'pending'
      });
      
      // Create transaction items
      const createdItems: TransactionItemWithDetails[] = [];
      
      for (const itemData of items) {
        const item = await this.createTransactionItem({
          ...itemData,
          transactionId: transaction.id,
          totalPrice: itemData.unitPrice * itemData.quantity
        });
        
        // Update stock if variant is specified
        if (item.variantId) {
          await this.updateVariantStock(item.variantId, -itemData.quantity);
        }
        
        createdItems.push(item);
      }
      
      return {
        ...transaction,
        items: createdItems
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }
  
  async updateTransactionStatus(id: string, status: string): Promise<boolean> {
    try {
      const result = await this.localDb
        .update(transactions)
        .set({ 
          status,
          updatedAt: new Date()
        })
        .where(eq(transactions.id, id));
      
      await this.queueForSync('update', id);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }
  
  async updateSyncStatus(id: string, syncStatus: string): Promise<boolean> {
    try {
      const result = await this.localDb
        .update(transactions)
        .set({ 
          syncStatus,
          updatedAt: new Date()
        })
        .where(eq(transactions.id, id));
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating sync status:', error);
      throw error;
    }
  }
  
  // Transaction item methods
  async createTransactionItem(itemData: Omit<NewTransactionItem, 'id'>): Promise<TransactionItemWithDetails> {
    try {
      const id = this.generateUUID();
      const insertData = { ...itemData, id };
      
      await this.localDb.insert(transactionItems).values(insertData);
      
      // Fetch the created item with product/variant details
      const result = await this.localDb
        .select({
          item: transactionItems,
          product: products,
          variant: productVariants
        })
        .from(transactionItems)
        .leftJoin(products, eq(transactionItems.productId, products.id))
        .leftJoin(productVariants, eq(transactionItems.variantId, productVariants.id))
        .where(eq(transactionItems.id, id))
        .limit(1);
      
      return {
        ...result[0].item,
        product: result[0].product,
        variant: result[0].variant
      };
    } catch (error) {
      console.error('Error creating transaction item:', error);
      throw error;
    }
  }
  
  async findTransactionItems(transactionId: string): Promise<TransactionItemWithDetails[]> {
    try {
      const result = await this.localDb
        .select({
          item: transactionItems,
          product: products,
          variant: productVariants
        })
        .from(transactionItems)
        .leftJoin(products, eq(transactionItems.productId, products.id))
        .leftJoin(productVariants, eq(transactionItems.variantId, productVariants.id))
        .where(eq(transactionItems.transactionId, transactionId))
        .orderBy(transactionItems.createdAt);
      
      return result.map(row => ({
        ...row.item,
        product: row.product,
        variant: row.variant
      }));
    } catch (error) {
      console.error('Error finding transaction items:', error);
      throw error;
    }
  }
  
  // Analytics methods
  async getDailySales(date: Date): Promise<DailySalesReport> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const result = await this.localDb
        .select({
          totalSales: sum(transactions.total),
          totalTransactions: count(transactions.id),
          totalTax: sum(transactions.tax),
          totalDiscount: sum(transactions.discount)
        })
        .from(transactions)
        .where(and(
          gte(transactions.createdAt, startOfDay),
          lte(transactions.createdAt, endOfDay),
          eq(transactions.status, 'completed')
        ));
      
      return {
        date,
        totalSales: Number(result[0]?.totalSales || 0),
        totalTransactions: Number(result[0]?.totalTransactions || 0),
        totalTax: Number(result[0]?.totalTax || 0),
        totalDiscount: Number(result[0]?.totalDiscount || 0)
      };
    } catch (error) {
      console.error('Error getting daily sales:', error);
      throw error;
    }
  }
  
  async getTopSellingProducts(limit: number = 10, startDate?: Date, endDate?: Date): Promise<TopSellingProduct[]> {
    try {
      let query = this.localDb
        .select({
          productId: transactionItems.productId,
          productName: products.name,
          totalQuantity: sum(transactionItems.quantity),
          totalRevenue: sum(transactionItems.totalPrice)
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .innerJoin(products, eq(transactionItems.productId, products.id))
        .where(eq(transactions.status, 'completed'))
        .groupBy(transactionItems.productId, products.name)
        .orderBy(desc(sum(transactionItems.quantity)))
        .limit(limit);
      
      if (startDate && endDate) {
        return await this.localDb
          .select({
            productId: transactionItems.productId,
            productName: products.name,
            totalQuantity: sum(transactionItems.quantity),
            totalRevenue: sum(transactionItems.totalPrice)
          })
          .from(transactionItems)
          .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
          .innerJoin(products, eq(transactionItems.productId, products.id))
          .where(and(
            eq(transactions.status, 'completed'),
            gte(transactions.createdAt, startDate),
            lte(transactions.createdAt, endDate)
          ))
          .groupBy(transactionItems.productId, products.name)
          .orderBy(desc(sum(transactionItems.quantity)))
          .limit(limit)
          .then(results => results.map(row => ({
            productId: row.productId!,
            productName: row.productName,
            totalQuantity: Number(row.totalQuantity || 0),
            totalRevenue: Number(row.totalRevenue || 0)
          })));
      }
      
      const results = await query;
      
      return results.map(row => ({
        productId: row.productId!,
        productName: row.productName,
        totalQuantity: Number(row.totalQuantity || 0),
        totalRevenue: Number(row.totalRevenue || 0)
      }));
    } catch (error) {
      console.error('Error getting top selling products:', error);
      throw error;
    }
  }
  
  // Helper methods
  private async updateVariantStock(variantId: string, quantityChange: number): Promise<void> {
    try {
      await this.localDb.run(sql`
        UPDATE product_variants 
        SET stock_quantity = stock_quantity + ${quantityChange},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${variantId}
      `);
    } catch (error) {
      console.error('Error updating variant stock:', error);
      throw error;
    }
  }
}

// Types
export interface CreateTransactionData extends Omit<NewTransaction, 'id' | 'subtotal' | 'total'> {
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface TransactionWithItems extends Transaction {
  user?: any;
  items: TransactionItemWithDetails[];
}

export interface TransactionItemWithDetails extends TransactionItem {
  product?: any;
  variant?: any;
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

// Export singleton instance
export const transactionService = new TransactionService();