import { 
  userService, 
  categoryService, 
  productService, 
  transactionService,
  checkLocalConnection,
  checkCloudConnection 
} from '@/services/database';

async function checkDatabaseStatus() {
  try {
    console.log('🔍 Checking database status...\n');
    
    // Check connections
    console.log('🔌 Connection Status:');
    const localConnected = await checkLocalConnection();
    console.log(`  Local SQLite: ${localConnected ? '✅ Connected' : '❌ Failed'}`);
    
    try {
      const cloudConnected = await checkCloudConnection();
      console.log(`  Turso Cloud: ${cloudConnected ? '✅ Connected' : '❌ Failed'}`);
    } catch (error) {
      console.log(`  Turso Cloud: ⚠️  Not configured`);
    }
    
    // Check data counts
    console.log('\n📊 Data Summary:');
    const userCount = await userService.count();
    const categoryCount = await categoryService.count();
    const productCount = await productService.count();
    const transactionCount = await transactionService.count();
    
    console.log(`  Users: ${userCount}`);
    console.log(`  Categories: ${categoryCount}`);
    console.log(`  Products: ${productCount}`);
    console.log(`  Transactions: ${transactionCount}`);
    
    // Check recent activity
    console.log('\n📈 Recent Activity:');
    const recentTransactions = await transactionService.findByDateRange(
      new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      new Date()
    );
    console.log(`  Transactions (24h): ${recentTransactions.length}`);
    
    const dailySales = await transactionService.getDailySales(new Date());
    console.log(`  Today's Sales: ₹${dailySales.totalSales}`);
    
    console.log('\n✅ Database status check completed');
    
  } catch (error) {
    console.error('❌ Database status check failed:', error);
    throw error;
  }
}

// Run status check if this file is executed directly
if (require.main === module) {
  checkDatabaseStatus()
    .then(() => {
      console.log('✅ Status check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Status check failed:', error);
      process.exit(1);
    });
}

export { checkDatabaseStatus };