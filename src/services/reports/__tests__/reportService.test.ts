import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportService } from '../reportService';

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getLocalDb: vi.fn(),
}));

describe('ReportService', () => {
  let reportService: ReportService;
  let testDb: any;

  beforeEach(async () => {
    const { getTestDb } = await import('@/lib/db/test-db');
    testDb = getTestDb();
    reportService = new ReportService();
    reportService.setDb(testDb);

    // Clear all tables
    await testDb.delete(testDb.table('transactions'));
    await testDb.delete(testDb.table('transaction_items'));
    await testDb.delete(testDb.table('products'));
    await testDb.delete(testDb.table('categories'));
    await testDb.delete(testDb.table('users'));
  });

  describe('getDailySalesReport', () => {
    it('should generate daily sales report with correct metrics', async () => {
      // Setup test data
      const testDate = new Date('2024-01-15');
      
      // Insert test user
      await testDb.insert(testDb.table('users')).values({
        id: 'user1',
        username: 'testuser',
        pin_hash: 'hash',
        role: 'cashier',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Insert test category
      await testDb.insert(testDb.table('categories')).values({
        id: 'cat1',
        name: 'Books',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Insert test product
      await testDb.insert(testDb.table('products')).values({
        id: 'prod1',
        name: 'Test Book',
        base_price: 100,
        category_id: 'cat1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Insert test transactions
      const transaction1 = {
        id: 'trans1',
        user_id: 'user1',
        subtotal: 100,
        tax: 10,
        discount: 5,
        total: 105,
        payment_method: 'cash',
        status: 'completed',
        sync_status: 'pending',
        created_at: testDate,
        updated_at: testDate,
      };

      const transaction2 = {
        id: 'trans2',
        user_id: 'user1',
        subtotal: 200,
        tax: 20,
        discount: 0,
        total: 220,
        payment_method: 'upi',
        status: 'completed',
        sync_status: 'pending',
        created_at: testDate,
        updated_at: testDate,
      };

      await testDb.insert(testDb.table('transactions')).values([transaction1, transaction2]);

      // Insert transaction items
      await testDb.insert(testDb.table('transaction_items')).values([
        {
          id: 'item1',
          transaction_id: 'trans1',
          product_id: 'prod1',
          quantity: 1,
          unit_price: 100,
          total_price: 100,
          created_at: testDate,
        },
        {
          id: 'item2',
          transaction_id: 'trans2',
          product_id: 'prod1',
          quantity: 2,
          unit_price: 100,
          total_price: 200,
          created_at: testDate,
        },
      ]);

      // Generate report
      const report = await reportService.getDailySalesReport(testDate);

      // Assertions
      expect(report.date).toEqual(testDate);
      expect(report.totalSales).toBe(325); // 105 + 220
      expect(report.totalTransactions).toBe(2);
      expect(report.totalTax).toBe(30); // 10 + 20
      expect(report.totalDiscount).toBe(5); // 5 + 0
      expect(report.paymentMethodBreakdown.cash.count).toBe(1);
      expect(report.paymentMethodBreakdown.cash.amount).toBe(105);
      expect(report.paymentMethodBreakdown.upi.count).toBe(1);
      expect(report.paymentMethodBreakdown.upi.amount).toBe(220);
      expect(report.topProducts).toHaveLength(1);
      expect(report.topProducts[0].productName).toBe('Test Book');
      expect(report.topProducts[0].totalQuantity).toBe(3);
    });

    it('should return zero metrics for date with no transactions', async () => {
      const testDate = new Date('2024-01-15');
      const report = await reportService.getDailySalesReport(testDate);

      expect(report.date).toEqual(testDate);
      expect(report.totalSales).toBe(0);
      expect(report.totalTransactions).toBe(0);
      expect(report.totalTax).toBe(0);
      expect(report.totalDiscount).toBe(0);
      expect(report.paymentMethodBreakdown.cash.count).toBe(0);
      expect(report.paymentMethodBreakdown.upi.count).toBe(0);
      expect(report.topProducts).toHaveLength(0);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return paginated transaction history with items', async () => {
      // Setup test data similar to above
      await testDb.insert(testDb.table('users')).values({
        id: 'user1',
        username: 'testuser',
        pin_hash: 'hash',
        role: 'cashier',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await testDb.insert(testDb.table('products')).values({
        id: 'prod1',
        name: 'Test Product',
        base_price: 100,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const transaction = {
        id: 'trans1',
        user_id: 'user1',
        subtotal: 100,
        tax: 10,
        discount: 5,
        total: 105,
        payment_method: 'cash',
        status: 'completed',
        sync_status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      };

      await testDb.insert(testDb.table('transactions')).values(transaction);

      await testDb.insert(testDb.table('transaction_items')).values({
        id: 'item1',
        transaction_id: 'trans1',
        product_id: 'prod1',
        quantity: 1,
        unit_price: 100,
        total_price: 100,
        created_at: new Date(),
      });

      const result = await reportService.getTransactionHistory({}, 10, 0);

      expect(result.totalCount).toBe(1);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].id).toBe('trans1');
      expect(result.transactions[0].userName).toBe('testuser');
      expect(result.transactions[0].total).toBe(105);
      expect(result.transactions[0].items).toHaveLength(1);
      expect(result.transactions[0].items[0].productName).toBe('Test Product');
    });

    it('should filter transactions by date range', async () => {
      // Setup test data with different dates
      await testDb.insert(testDb.table('users')).values({
        id: 'user1',
        username: 'testuser',
        pin_hash: 'hash',
        role: 'cashier',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-01-15');

      await testDb.insert(testDb.table('transactions')).values([
        {
          id: 'trans1',
          user_id: 'user1',
          subtotal: 100,
          tax: 0,
          discount: 0,
          total: 100,
          payment_method: 'cash',
          status: 'completed',
          sync_status: 'pending',
          created_at: oldDate,
          updated_at: oldDate,
        },
        {
          id: 'trans2',
          user_id: 'user1',
          subtotal: 200,
          tax: 0,
          discount: 0,
          total: 200,
          payment_method: 'cash',
          status: 'completed',
          sync_status: 'pending',
          created_at: newDate,
          updated_at: newDate,
        },
      ]);

      const result = await reportService.getTransactionHistory({
        startDate: new Date('2024-01-10'),
        endDate: new Date('2024-01-20'),
      }, 10, 0);

      expect(result.totalCount).toBe(1);
      expect(result.transactions[0].id).toBe('trans2');
    });
  });

  describe('getTopSellingProducts', () => {
    it('should return products sorted by quantity sold', async () => {
      // Setup test data
      await testDb.insert(testDb.table('categories')).values({
        id: 'cat1',
        name: 'Books',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await testDb.insert(testDb.table('products')).values([
        {
          id: 'prod1',
          name: 'Product A',
          base_price: 100,
          category_id: 'cat1',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'prod2',
          name: 'Product B',
          base_price: 200,
          category_id: 'cat1',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      await testDb.insert(testDb.table('users')).values({
        id: 'user1',
        username: 'testuser',
        pin_hash: 'hash',
        role: 'cashier',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await testDb.insert(testDb.table('transactions')).values({
        id: 'trans1',
        user_id: 'user1',
        subtotal: 500,
        tax: 0,
        discount: 0,
        total: 500,
        payment_method: 'cash',
        status: 'completed',
        sync_status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await testDb.insert(testDb.table('transaction_items')).values([
        {
          id: 'item1',
          transaction_id: 'trans1',
          product_id: 'prod1',
          quantity: 1,
          unit_price: 100,
          total_price: 100,
          created_at: new Date(),
        },
        {
          id: 'item2',
          transaction_id: 'trans1',
          product_id: 'prod2',
          quantity: 2,
          unit_price: 200,
          total_price: 400,
          created_at: new Date(),
        },
      ]);

      const topProducts = await reportService.getTopSellingProducts({}, 10);

      expect(topProducts).toHaveLength(2);
      expect(topProducts[0].productName).toBe('Product B');
      expect(topProducts[0].totalQuantity).toBe(2);
      expect(topProducts[0].totalRevenue).toBe(400);
      expect(topProducts[1].productName).toBe('Product A');
      expect(topProducts[1].totalQuantity).toBe(1);
      expect(topProducts[1].totalRevenue).toBe(100);
    });
  });

  describe('getProductPerformanceReport', () => {
    it('should return comprehensive product performance data', async () => {
      // Setup test data
      await testDb.insert(testDb.table('categories')).values({
        id: 'cat1',
        name: 'Books',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await testDb.insert(testDb.table('products')).values({
        id: 'prod1',
        name: 'Test Product',
        base_price: 100,
        category_id: 'cat1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await testDb.insert(testDb.table('product_variants')).values({
        id: 'var1',
        product_id: 'prod1',
        name: 'Default',
        price: 100,
        stock_quantity: 50,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await testDb.insert(testDb.table('users')).values({
        id: 'user1',
        username: 'testuser',
        pin_hash: 'hash',
        role: 'cashier',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const transactionDate = new Date();
      await testDb.insert(testDb.table('transactions')).values({
        id: 'trans1',
        user_id: 'user1',
        subtotal: 300,
        tax: 0,
        discount: 0,
        total: 300,
        payment_method: 'cash',
        status: 'completed',
        sync_status: 'pending',
        created_at: transactionDate,
        updated_at: transactionDate,
      });

      await testDb.insert(testDb.table('transaction_items')).values({
        id: 'item1',
        transaction_id: 'trans1',
        product_id: 'prod1',
        quantity: 3,
        unit_price: 100,
        total_price: 300,
        created_at: transactionDate,
      });

      const performance = await reportService.getProductPerformanceReport({});

      expect(performance).toHaveLength(1);
      expect(performance[0].productName).toBe('Test Product');
      expect(performance[0].categoryName).toBe('Books');
      expect(performance[0].totalQuantity).toBe(3);
      expect(performance[0].totalRevenue).toBe(300);
      expect(performance[0].transactionCount).toBe(1);
      expect(performance[0].averageOrderValue).toBe(300);
      expect(performance[0].currentStock).toBe(50);
    });
  });

  describe('getSalesAnalytics', () => {
    it('should return comprehensive sales analytics', async () => {
      // Setup test data
      await testDb.insert(testDb.table('categories')).values({
        id: 'cat1',
        name: 'Books',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await testDb.insert(testDb.table('products')).values({
        id: 'prod1',
        name: 'Test Product',
        base_price: 100,
        category_id: 'cat1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await testDb.insert(testDb.table('users')).values({
        id: 'user1',
        username: 'testuser',
        pin_hash: 'hash',
        role: 'cashier',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const today = new Date();
      await testDb.insert(testDb.table('transactions')).values([
        {
          id: 'trans1',
          user_id: 'user1',
          subtotal: 100,
          tax: 0,
          discount: 0,
          total: 100,
          payment_method: 'cash',
          status: 'completed',
          sync_status: 'pending',
          created_at: today,
          updated_at: today,
        },
        {
          id: 'trans2',
          user_id: 'user1',
          subtotal: 200,
          tax: 0,
          discount: 0,
          total: 200,
          payment_method: 'upi',
          status: 'completed',
          sync_status: 'pending',
          created_at: today,
          updated_at: today,
        },
      ]);

      await testDb.insert(testDb.table('transaction_items')).values([
        {
          id: 'item1',
          transaction_id: 'trans1',
          product_id: 'prod1',
          quantity: 1,
          unit_price: 100,
          total_price: 100,
          created_at: today,
        },
        {
          id: 'item2',
          transaction_id: 'trans2',
          product_id: 'prod1',
          quantity: 2,
          unit_price: 100,
          total_price: 200,
          created_at: today,
        },
      ]);

      const analytics = await reportService.getSalesAnalytics({});

      expect(analytics.totalRevenue).toBe(300);
      expect(analytics.totalTransactions).toBe(2);
      expect(analytics.averageOrderValue).toBe(150);
      expect(analytics.topPaymentMethod).toBe('upi'); // UPI has higher count
      expect(analytics.salesTrend).toHaveLength(1);
      expect(analytics.categoryBreakdown).toHaveLength(1);
      expect(analytics.categoryBreakdown[0].categoryName).toBe('Books');
      expect(analytics.categoryBreakdown[0].revenue).toBe(300);
      expect(analytics.categoryBreakdown[0].percentage).toBe(100);
    });
  });

  describe('getExportData', () => {
    it('should format transaction data for export', async () => {
      // Setup minimal test data
      await testDb.insert(testDb.table('users')).values({
        id: 'user1',
        username: 'testuser',
        pin_hash: 'hash',
        role: 'cashier',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await testDb.insert(testDb.table('products')).values({
        id: 'prod1',
        name: 'Test Product',
        base_price: 100,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const transactionDate = new Date('2024-01-15T10:30:00Z');
      await testDb.insert(testDb.table('transactions')).values({
        id: 'trans1',
        user_id: 'user1',
        subtotal: 100,
        tax: 10,
        discount: 5,
        total: 105,
        payment_method: 'cash',
        payment_reference: 'REF123',
        status: 'completed',
        sync_status: 'pending',
        created_at: transactionDate,
        updated_at: transactionDate,
      });

      await testDb.insert(testDb.table('transaction_items')).values({
        id: 'item1',
        transaction_id: 'trans1',
        product_id: 'prod1',
        quantity: 1,
        unit_price: 100,
        total_price: 100,
        created_at: transactionDate,
      });

      const exportData = await reportService.getExportData('transactions', {});

      expect(exportData).toHaveLength(1);
      expect(exportData[0]).toHaveProperty('Transaction ID', 'trans1');
      expect(exportData[0]).toHaveProperty('User', 'testuser');
      expect(exportData[0]).toHaveProperty('Total', 105);
      expect(exportData[0]).toHaveProperty('Payment Method', 'cash');
      expect(exportData[0]).toHaveProperty('Payment Reference', 'REF123');
      expect(exportData[0]['Items']).toContain('Test Product x1');
    });
  });
});