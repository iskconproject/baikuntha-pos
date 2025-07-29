import { 
  userService, 
  categoryService, 
  productService, 
  transactionService,
  searchService 
} from '@/services/database';

async function testDatabaseOperations() {
  try {
    console.log('🧪 Testing database operations...\n');
    
    // Test user operations
    console.log('👤 Testing user operations...');
    const users = await userService.findActiveUsers();
    console.log(`✅ Found ${users.length} active users`);
    
    const adminUser = await userService.findByUsername('admin');
    if (adminUser) {
      console.log(`✅ Admin user found: ${adminUser.username} (${adminUser.role})`);
    }
    
    // Test PIN verification
    const verifiedUser = await userService.verifyPin('admin', '1234');
    console.log(`✅ PIN verification: ${verifiedUser ? 'SUCCESS' : 'FAILED'}`);
    
    // Test category operations
    console.log('\n📂 Testing category operations...');
    const rootCategories = await categoryService.findRootCategories();
    console.log(`✅ Found ${rootCategories.length} root categories`);
    
    const hierarchy = await categoryService.getCategoryHierarchy();
    console.log(`✅ Category hierarchy built with ${hierarchy.length} root nodes`);
    
    // Test product operations
    console.log('\n📦 Testing product operations...');
    const products = await productService.findActiveProducts();
    console.log(`✅ Found ${products.length} active products`);
    
    const productsWithVariants = await productService.findProductsWithVariants();
    console.log(`✅ Found ${productsWithVariants.length} products with variants`);
    
    // Test search operations
    console.log('\n🔍 Testing search operations...');
    const searchResults = await productService.searchProducts({
      query: 'bhagavad',
      filters: {},
      sortBy: 'relevance',
      limit: 20,
      offset: 0
    });
    console.log(`✅ Search for 'bhagavad' returned ${searchResults.products.length} results`);
    
    // Record a search for analytics
    await searchService.recordSearch('bhagavad gita', searchResults.products.length, adminUser?.id);
    console.log('✅ Search analytics recorded');
    
    // Test full-text search
    const ftsResults = await productService.fullTextSearch('krishna');
    console.log(`✅ Full-text search for 'krishna' returned ${ftsResults.length} results`);
    
    // Test transaction creation
    console.log('\n💰 Testing transaction operations...');
    if (productsWithVariants.length > 0 && productsWithVariants[0].variants.length > 0) {
      const product = productsWithVariants[0];
      const variant = product.variants[0];
      
      const transaction = await transactionService.createTransaction({
        userId: adminUser!.id,
        paymentMethod: 'cash',
        tax: 0,
        discount: 0,
        items: [{
          productId: product.id,
          variantId: variant.id,
          quantity: 1,
          unitPrice: variant.price
        }]
      });
      
      console.log(`✅ Created transaction: ${transaction.id} (Total: ₹${transaction.total})`);
      
      // Test transaction retrieval
      const retrievedTransaction = await transactionService.findTransactionWithItems(transaction.id);
      console.log(`✅ Retrieved transaction with ${retrievedTransaction?.items.length} items`);
    }
    
    // Test analytics
    console.log('\n📊 Testing analytics...');
    const dailySales = await transactionService.getDailySales(new Date());
    console.log(`✅ Today's sales: ₹${dailySales.totalSales} (${dailySales.totalTransactions} transactions)`);
    
    const topProducts = await transactionService.getTopSellingProducts(5);
    console.log(`✅ Found ${topProducts.length} top-selling products`);
    
    const popularSearches = await searchService.getPopularSearches(5);
    console.log(`✅ Found ${popularSearches.length} popular searches`);
    
    console.log('\n🎉 All database operations completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDatabaseOperations()
    .then(() => {
      console.log('✅ Database test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database test failed:', error);
      process.exit(1);
    });
}

export { testDatabaseOperations };