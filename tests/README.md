# MCP Tally API Test Suite

This directory contains comprehensive tests for the MCP Tally API server, including live integration tests that spawn the actual server and test against the real Tally API.

## Test Types

### 1. Live Server Tests (`live-server.test.ts`)

**Purpose**: End-to-end integration testing with real MCP server and Tally API
**Runtime**: 2-5 minutes (depending on API response times)
**Requirements**: Valid `TALLY_API_KEY` environment variable

The live server tests:

- ✅ Spawn actual MCP server as child process
- ✅ Test all 12 MCP tools with real API data
- ✅ Validate API-side filtering, sorting, pagination
- ✅ Test resource access and structure
- ✅ Verify error handling and edge cases
- ✅ Check performance benchmarks
- ✅ Validate data integrity across endpoints

### 2. Unit Tests (`server.test.ts`, `integration.test.ts`)

**Purpose**: Fast unit testing of individual components
**Runtime**: < 30 seconds
**Requirements**: None (uses mocks)

## Running Tests

### Prerequisites

1. **Install dependencies**:

   ```bash
   bun install
   ```

2. **Set API key** (for live tests):
   ```bash
   export TALLY_API_KEY="your_api_key_here"
   ```

### Running Live Tests

**Option 1: Using the test script (recommended)**

```bash
./scripts/run-live-tests.sh
```

**Option 2: Direct npm command**

```bash
bun run test:live
```

**Option 3: Manual vitest command**

```bash
TALLY_API_KEY="$TALLY_API_KEY" bun run vitest tests/live-server.test.ts
```

### Running All Tests

```bash
# Run all tests (requires API key for live tests)
bun run test

# Run tests in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage
```

### Running Specific Test Suites

```bash
# Just unit tests (no API key required)
bun run vitest tests/server.test.ts tests/integration.test.ts

# Just organization tools
bun run vitest tests/live-server.test.ts -t "Organization Tools"

# Just error handling
bun run vitest tests/live-server.test.ts -t "Error Handling"
```

## Test Structure

### Live Server Test Architecture

```typescript
class MCPTestClient {
  // Spawns MCP server as child process
  async start(): Promise<void>;

  // Sends JSON-RPC requests via stdio
  async request(method: string, params?: any): Promise<any>;

  // Convenience methods
  async callTool(name: string, arguments_: any = {}): Promise<any>;
  async listTools(): Promise<any>;
  async readResource(uri: string): Promise<any>;
}
```

### Test Data

Tests use known working data from major DAOs:

- **Uniswap** (`2206072050458560434`) - Ethereum mainnet, 81 proposals
- **Arbitrum** (`2206072050315953936`) - Arbitrum network, 74 proposals
- **0x Protocol Treasury** (`2206072050022352213`) - Ethereum mainnet, 1 proposal

### Validation Schemas

All responses are validated using Zod schemas:

```typescript
const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  chainIds: z.array(z.string()),
  memberCount: z.number(),
  proposalCount: z.number(),
  hasActiveProposals: z.boolean(),
});

const PaginatedResponseSchema = z.object({
  items: z.array(z.any()),
  totalCount: z.number(),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});
```

## Test Categories

### 1. Server Initialization (2 tests)

- Tool registration verification
- Resource availability verification

### 2. Utility Tools (2 tests)

- Connection testing
- Server info validation

### 3. Organization Tools (9 tests)

- Pagination and filtering
- Chain-specific filtering
- Sorting validation
- ID vs slug lookup
- Precision handling for large IDs
- Error cases

### 4. Proposal Tools (6 tests)

- Proposal listing with filters
- Individual proposal details
- Cross-organization active proposals
- Sort order validation

### 5. Resources (2 tests)

- Popular DAOs resource structure
- Server info resource validation

### 6. Error Handling (3 tests)

- Invalid organization IDs
- Invalid chain IDs
- Oversized requests

### 7. Performance (2 tests)

- Response time benchmarks
- Concurrent request handling

### 8. Data Integrity (2 tests)

- Consistency between list and detail views
- Proposal count accuracy

## Common Issues & Troubleshooting

### Server Startup Issues

**Problem**: Server fails to start in tests
**Solution**:

1. Check `TALLY_API_KEY` is set
2. Ensure port 3000 is not occupied
3. Verify build completed successfully (`bun run build`)

### API Rate Limiting

**Problem**: Tests fail with rate limit errors
**Solution**:

1. Reduce concurrent test execution
2. Add delays between test requests
3. Use different test data to avoid hitting same endpoints

### Test Timeouts

**Problem**: Tests timeout waiting for responses
**Solution**:

1. Check network connectivity
2. Verify API key has proper permissions
3. Increase timeout in `vitest.config.ts`:
   ```typescript
   test: {
     testTimeout: 120000, // 2 minutes
   }
   ```

### Assertion Failures

**Problem**: Response structure doesn't match expected schema
**Solution**:

1. Check if Tally API schema has changed
2. Update validation schemas in test file
3. Verify test data is still valid

### Environment Issues

**Problem**: Tests work locally but fail in CI
**Solution**:

1. Ensure `TALLY_API_KEY` is set in CI environment
2. Check Node.js version compatibility (>=18)
3. Verify network access to `api.tally.xyz`

## Performance Benchmarks

Expected performance for live tests:

- **Server startup**: < 3 seconds
- **Tool registration**: < 1 second
- **Simple queries** (get_organization): < 2 seconds
- **Complex queries** (list_organizations): < 5 seconds
- **Total test suite**: < 5 minutes

## Contributing

When adding new tests:

1. **Follow naming patterns**: Describe what the test validates
2. **Use proper test data**: Use known working organization IDs
3. **Validate responses**: Use Zod schemas for structure validation
4. **Handle errors gracefully**: Test both success and failure cases
5. **Document expectations**: Comment on why specific assertions exist

### Adding New Tool Tests

```typescript
describe('new_tool_name', () => {
  test('should handle basic functionality', async () => {
    const result = await client.callTool('new_tool_name', {
      requiredParam: 'test_value',
    });

    expect(result).toHaveProperty('content');
    const data = JSON.parse(result.content[0].text);

    // Validate structure with Zod schema
    const validated = NewToolResponseSchema.parse(data);
    expect(validated.items.length).toBeGreaterThan(0);
  });
});
```

This test suite ensures the MCP Tally API server maintains high quality and reliability standards with comprehensive coverage of all functionality.
