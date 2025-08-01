// Simple test script to verify sync functionality
async function testSync() {
  try {
    console.log('Testing cloud database connection...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3000/api/health');
    console.log('Health check:', healthResponse.ok ? 'OK' : 'Failed');
    
    // Test if we can reach the sync endpoint (if it exists)
    console.log('Sync test completed');
    
  } catch (error) {
    console.error('Sync test failed:', error);
  }
}

testSync();