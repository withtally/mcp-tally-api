/**
 * Vitest setup file for MCP Tally API tests
 */

// Ensure required environment variables are present
if (!process.env.TALLY_API_KEY) {
  console.warn('⚠️  TALLY_API_KEY not set - live tests will fail');
  console.warn('   Set TALLY_API_KEY environment variable to run live tests');
}

// Global test configuration
console.log('🧪 Starting MCP Tally API Test Suite');
console.log(`   API Key configured: ${!!process.env.TALLY_API_KEY}`);
console.log(`   Node environment: ${process.env.NODE_ENV}`);

// Set longer timeouts for process spawning and API calls
process.env.VITEST_TIMEOUT = '60000';
