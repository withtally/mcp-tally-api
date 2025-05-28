# MCP Tally API

A Model Context Protocol (MCP) server that provides LLMs with access to Tally's blockchain governance API for querying DAOs, proposals, and voting data across multiple networks.

## Features

### 🚀 **Features**

- **🔧 Tools**: 12 comprehensive tools for querying organizations, proposals, users, and delegates
- **📚 Resources**: 6 browsable resources including Popular DAOs mapping and governance overviews  
- **🎯 Prompts**: 6 governance-focused prompt templates for structured DAO analysis
- **⚡ Real-time**: Live data from Tally's GraphQL API with proper error handling
- **🔍 Filtering**: Advanced filtering, sorting, and pagination across all endpoints
- **🌐 Multi-chain**: Support for 15+ blockchain networks including Ethereum, Polygon, Arbitrum
- **📊 Rich Data**: Comprehensive governance metrics, voting patterns, and delegate information

### 🏛️ **Organization Management**

- **list_organizations**: Browse DAOs with pagination, filtering by chain/logo, and sorting by popularity
- **get_organization**: Get detailed DAO information including member counts and proposal statistics
- **get_organizations_with_active_proposals**: Find DAOs with ongoing governance activity

### 📊 **Proposal Operations**

- **list_proposals**: View proposals for specific DAOs with filtering and sorting options
- **get_proposal**: Get detailed proposal information including voting statistics and execution details
- **get_active_proposals**: Find active proposals across all DAOs or filtered by criteria

### 👥 **User & Delegation**

- **get_user_daos**: Discover which DAOs a user participates in
- **get_dao_participants**: List members of a specific DAO with sorting options
- **get_user_details**: Get comprehensive user information and governance activity
- **get_delegates**: Find delegates in a DAO with delegation statistics

### 📚 **Resources**

- **Popular DAOs**: Stable mapping of 20 major DAOs to their organization IDs across 5 networks
- **Server Info**: Runtime information and health status
- **Organization Overview**: Human-readable markdown overviews of DAOs via `tally://org/{organizationId}`
- **Proposal Overview**: Detailed proposal information via `tally://org/{organizationId}/proposal/{proposalId}`
- **User Profile Overview**: Governance profiles via `tally://user/{address}`
- **Trending Proposals**: Active governance activity via `tally://trending/proposals`

### 🔗 **Resource Templates**

Resource templates provide browsable, AI-friendly access to governance data:

#### **Organization Overview** (`tally://org/{organizationId}`)

Get human-readable markdown overviews of any DAO:

```
URI: tally://org/2206072050458560434
Content-Type: text/markdown

# Uniswap

**Description:** Uniswap is a decentralized protocol for automated liquidity provision on Ethereum.

## 📊 Key Metrics

- **Members:** 47,543
- **Total Proposals:** 81
- **Active Proposals:** 0
- **Chain:** eip155:1

## 🏛️ Governance Status

**Current Activity:** 🔵 No active proposals

## 🔗 Links

[Website](https://uniswap.org) • [Twitter](https://twitter.com/Uniswap) • [GitHub](https://github.com/Uniswap)

---
*Data from Tally API • Organization ID: 2206072050458560434 • Slug: uniswap*
```

#### **Proposal Overview** (`tally://org/{organizationId}/proposal/{proposalId}`)

Get detailed markdown overviews of specific proposals:

```
URI: tally://org/2206072050458560434/proposal/2589356045239322076
Content-Type: text/markdown

# ❌ Scaling V4 and Supporting Unichain

**Organization:** Uniswap

## 📋 Proposal Details

- **Status:** Defeated
- **Proposal ID:** 2589356045239322076
- **Proposer:** `0x9B68c14e936104e9a7a24c712BEecdc220002984`
- **Start Time:** May 12, 2025 at 09:18 PM
- **End Time:** May 18, 2025 at 01:20 PM

## 📄 Description

# Scaling V4 and Supporting Unichain
PGOV is submitting the proposal on GFX Labs' behalf...

## 🗳️ Voting Results

- **For:** 24.7M votes
- **Against:** 3.0K votes
- **Abstain:** 5.3M votes

## ⚙️ Execution

⏳ **Status:** Not executed

---
*Data from Tally API • Organization ID: 2206072050458560434 • Proposal ID: 2589356045239322076*
```

#### **User Profile Overview** (`tally://user/{address}`)

Get governance profiles for any Ethereum address:

```
URI: tally://user/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
Content-Type: text/markdown

# 👤 Anonymous User

## 📋 Profile Details

- **Address:** `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`

## 🏛️ DAO Participation

*No DAO participation found for this address.*

---
*Data from Tally API • Address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045*
```

#### **Trending Proposals** (`tally://trending/proposals`)

Get an overview of active governance across all DAOs:

```
URI: tally://trending/proposals
Content-Type: text/markdown

# 🔥 Trending Governance Activity

**0 Active Proposal(s) Across All DAOs**

*No active proposals found at this time.*

Check back later for ongoing governance activity!

---
*Data from Tally API • Updated: 5/28/2025, 12:24:27 AM*
```

**Benefits:**
- **Browsable**: AI can explore governance data like reading documents
- **Cacheable**: Popular resources can be cached for performance  
- **Linkable**: Easy to reference specific governance data in conversations
- **Readable**: Returns human-friendly markdown format
- **Error-Safe**: Graceful error handling for invalid parameters
- **Real-time**: Always shows current data from the live Tally API

### 🎯 **Prompt Templates**

Governance-focused prompt templates that guide LLMs through comprehensive DAO analysis:

#### **DAO Analysis** (`analyze-dao-governance`)

Complete governance health assessment for any DAO:

```
Parameters:
- organizationId: The DAO to analyze
- includeComparison: Whether to compare with similar DAOs (optional)

Guides LLM through:
- Organization overview and metrics
- Active governance activity analysis  
- Delegate distribution and voting power
- Recent proposal patterns and success rates
- Optional peer comparison and benchmarking
```

#### **DAO Comparison** (`compare-dao-governance`)

Side-by-side governance comparison between two DAOs:

```
Parameters:
- dao1: First DAO organization ID or slug
- dao2: Second DAO organization ID or slug  
- aspect: Focus area (overall, delegates, proposals, activity)

Provides structured comparison framework for:
- Quantitative metrics and participation rates
- Governance quality and community health
- Structural differences and best practices
- Actionable recommendations for improvement
```

#### **Delegate Research** (`analyze-delegate-profile`)

Comprehensive delegate profiling and analysis:

```
Parameters:
- address: Ethereum address of the delegate
- organizationId: Specific DAO to focus on (optional)

Research framework covering:
- Cross-DAO governance experience and history
- Current voting power and delegation status
- Participation quality and voting consistency
- Community standing and delegate statements
- Specialization areas and expertise
```

#### **Trend Discovery** (`discover-governance-trends`)

Ecosystem-wide governance trend analysis:

```
Parameters:
- timeframe: Analysis focus (current, recent, emerging)
- category: DAO category filter (all, defi, infrastructure, social)

Trend analysis covering:
- Governance innovation and new mechanisms
- Hot topics and common proposal themes
- Participation patterns and delegate activity
- Cross-DAO movements and coordination
```

#### **DAO Recommendations** (`find-dao-to-join`)

Personalized DAO discovery and recommendations:

```
Parameters:
- interests: Focus areas (comma-separated, e.g., "DeFi,gaming")
- participationLevel: Desired engagement (observer, voter, delegate, contributor)
- experience: Governance experience (beginner, intermediate, expert)

Matching framework considering:
- Interest alignment with DAO focus areas
- Participation opportunities and entry barriers
- Experience-appropriate complexity levels
- Community health and governance quality
```

#### **Proposal Analysis** (`analyze-proposal`)

In-depth proposal analysis and voting guidance:

```
Parameters:
- organizationId: DAO where the proposal exists
- proposalId: Specific proposal to analyze

Analysis framework covering:
- Proposal details and strategic implications
- Current voting dynamics and participation
- Key delegate positions and influence
- Risk assessment and implementation challenges
- Voting recommendations and considerations
```

**Benefits:**
- **Structured Guidance**: Step-by-step instructions for thorough analysis
- **Tool Integration**: Optimized use of all Tally API tools and resources
- **Flexible Focus**: Customizable analysis depth and comparison scope
- **Actionable Insights**: Designed to produce practical recommendations

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime
- Tally API key from [Tally.xyz](https://tally.xyz)

### Installation

#### **Option 1: Install from npm (Recommended)**

```bash
# Install globally
npm install -g mcp-tally-api

# Or install locally in your project
npm install mcp-tally-api

# Set up environment
echo "TALLY_API_KEY=your_api_key_here" > .env
```

#### **Option 2: Build from source**

```bash
# Clone and install
git clone https://github.com/withtally/mcp-tally-api.git
cd mcp-tally-api
bun install

# Set up environment
echo "TALLY_API_KEY=your_api_key_here" > .env

# Build and test
bun run build
bun run test
```

### Running the Server

The MCP Tally API server supports two transport modes:

#### **STDIO Mode (Default)**

For direct integration with MCP clients like Cursor:

**If installed via npm:**
```bash
# Production mode  
TALLY_API_KEY=your_api_key_here mcp-tally-api

# Using environment file
mcp-tally-api  # Uses .env file
```

**If built from source:**
```bash
# Development mode with auto-reload
TALLY_API_KEY=your_api_key_here bun run dev

# Production mode
TALLY_API_KEY=your_api_key_here bun run start

# Or using environment file
bun run start  # Uses .env file
```

#### **HTTP Mode**

For web-based integrations and remote access:

**If installed via npm:**
```bash
# Production mode
TALLY_API_KEY=your_api_key_here TRANSPORT_MODE=http mcp-tally-api

# Configure port
TALLY_API_KEY=your_api_key_here PORT=8080 TRANSPORT_MODE=http mcp-tally-api
```

**If built from source:**
```bash
# Development mode with auto-reload
TALLY_API_KEY=your_api_key_here bun run dev:http

# Production mode
TALLY_API_KEY=your_api_key_here bun run start:http

# Server runs on http://localhost:3000 by default
# Configure port: PORT=8080 bun run start:http
```

**HTTP API Usage:**

```bash
# Initialize connection
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}}'

# List available tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}'

# Call a tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_server_info", "arguments": {}}}'
```

**Note:** HTTP mode requires both `application/json` and `text/event-stream` in the Accept header for proper MCP protocol support.

### Usage with Cursor

#### **STDIO Mode (Recommended)**

**If installed via npm globally:**

Add to your `.cursor/mcp.json`:

```json
{
  "servers": {
    "tally": {
      "command": "mcp-tally-api",
      "env": {
        "TALLY_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**If built from source:**

Add to your `.cursor/mcp.json`:

```json
{
  "servers": {
    "tally": {
      "command": "bun",
      "args": ["run", "start"],
      "cwd": "/path/to/mcp-tally-api",
      "env": {
        "TALLY_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### **HTTP Mode**

For remote server deployments, first start the HTTP server:

```bash
# On your server
TALLY_API_KEY=your_api_key_here bun run start:http
```

Then configure Cursor to connect to the HTTP endpoint:

```json
{
  "servers": {
    "tally-http": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "http://your-server:3000/mcp",
        "-H", "Content-Type: application/json",
        "-H", "Accept: application/json, text/event-stream",
        "-d", "@-"
      ]
    }
  }
}
```

**Transport Mode Comparison:**

| Feature | STDIO Mode | HTTP Mode |
|---------|------------|-----------|
| **Performance** | ⚡ Fastest (direct process communication) | 🌐 Network latency |
| **Deployment** | 📱 Local only | 🌍 Remote deployments |
| **Scaling** | 👤 Single user | 👥 Multiple users |
| **Security** | 🔒 Process isolation | 🛡️ Network security required |
| **Use Case** | Cursor, local development | Web apps, shared services |

## Testing Architecture

We've implemented a comprehensive, multi-layered testing strategy that validates both the MCP server implementation and the live API integration:

### 🧪 **Testing Methodology**

#### **1. Live Integration Testing (`tests/live-server.test.ts`)**

Our primary testing approach spawns the **actual MCP server** and tests against the **real Tally API**:

```typescript
// Spawns real MCP server as child process
const server = spawn('bun', ['run', 'dist/index.js'], {
  env: { TALLY_API_KEY: process.env.TALLY_API_KEY, TRANSPORT_MODE: 'stdio' },
});

// Tests real JSON-RPC communication
const result = await client.callTool('list_organizations', { pageSize: 5 });
```

**Coverage**: 30 comprehensive tests across 8 categories:

- ✅ **Server Initialization** (2 tests): Tool registration, resource availability
- ✅ **Organization Tools** (11 tests): Pagination, filtering, sorting, error handling
- ✅ **Proposal Tools** (6 tests): Proposal listing, details, active proposals
- ✅ **Resources** (2 tests): Popular DAOs mapping, server info
- ✅ **Error Handling** (3 tests): Invalid inputs, graceful degradation
- ✅ **Performance** (2 tests): Response times, concurrent requests
- ✅ **Data Integrity** (2 tests): Consistency between endpoints
- ✅ **Rate Limiting** (2 tests): API throttling, retry behavior

#### **2. Dynamic Popular DAOs Testing (`tests/popular-daos-dynamic.test.ts`)**

Focused testing for the dynamic Popular DAOs resource that loads live data at server startup:

```typescript
// Tests the dynamic resource loading functionality
const result = await client.readResource('tally://popular-daos');
const data = JSON.parse(result.contents[0].text);

// Validates multi-network coverage and delegate ranking
expect(data.networks_included).toHaveLength(8); // 8 production networks
expect(data.daos[0].delegateCount).toBeGreaterThanOrEqual(data.daos[1].delegateCount);
```

**Validation Points**:
- ✅ **Multiple Networks**: Verifies 8 production blockchain networks are included
- ✅ **Multiple DAOs**: Confirms 10-30 DAOs are loaded successfully  
- ✅ **Delegate Ranking**: Validates DAOs are sorted by delegate count (descending)
- ✅ **Network Distribution**: Ensures DAOs span multiple chains (6+ networks)
- ✅ **No Testnets**: Confirms no testnet chains are included
- ✅ **Major DAOs**: Verifies inclusion of expected top-tier DAOs (Arbitrum, Optimism, etc.)
- ✅ **Data Structure**: Validates complete DAO metadata (delegateCount, memberCount, etc.)

#### **3. Rate Limiting & Performance**

Tests include intelligent rate limiting to avoid API throttling:

```typescript
afterEach(async () => {
  await delay(1000); // 1 second between tests
});
```

Performance benchmarks ensure sub-5-second response times for all operations.

#### **4. Data Validation**

Comprehensive schema validation using Zod ensures response structure integrity:

```typescript
const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  memberCount: z.number(),
  // ... complete validation
});
```

#### **5. Multi-Network Testing**

Tests validate functionality across 5 production networks:

- Ethereum (eip155:1)
- Arbitrum (eip155:42161)
- Optimism (eip155:10)
- zkSync (eip155:324)
- Gnosis (eip155:100)

### 🚀 **Running Tests**

#### **Quick Test Run**

```bash
# Run all live tests (requires API key)
export TALLY_API_KEY=your_key_here
bun run test:live

# Run specific test category
bun run vitest tests/live-server.test.ts -t "Organization Tools"

# Run dynamic Popular DAOs test
bun test tests/popular-daos-dynamic.test.ts

# Run with verbose output
bun run test:live --reporter=verbose
```

#### **Complete Test Suite**

```bash
# Run comprehensive testing script
./scripts/run-live-tests.sh

# This script:
# ✅ Validates API key presence
# ✅ Builds the project
# ✅ Runs all 30 live integration tests
# ✅ Provides detailed pass/fail reporting
# ✅ Includes performance benchmarks
```

#### **Manual Testing**

For debugging or exploration:

**STDIO Mode:**
```bash
# Test specific tool via JSON-RPC
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "list_organizations", "arguments": {"pageSize": 5}}}' | TALLY_API_KEY=$TALLY_API_KEY TRANSPORT_MODE=stdio bun run start

# Test resource access
echo '{"jsonrpc": "2.0", "id": 1, "method": "resources/read", "params": {"uri": "tally://popular-daos"}}' | TALLY_API_KEY=$TALLY_API_KEY TRANSPORT_MODE=stdio bun run start
```

**HTTP Mode:**
```bash
# Start HTTP server in background
TALLY_API_KEY=$TALLY_API_KEY bun run start:http &

# Test specific tool via cURL
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "list_organizations", "arguments": {"pageSize": 5}}}'

# Test resource access
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "resources/read", "params": {"uri": "tally://popular-daos"}}'
```

### 📊 **Test Results & CI**

Our tests achieve **100% pass rate** with the live Tally API:

- **30/30 tests passing** ✅
- **Average response time**: <2 seconds
- **Rate limit compliance**: Zero 429 errors
- **Multi-chain validation**: All 5 networks supported
- **Error handling**: Graceful degradation for invalid inputs

### 🎯 **Test-Driven Development**

We follow TDD principles:

1. **Write failing tests** that define expected behavior
2. **Implement minimal code** to make tests pass
3. **Refactor and optimize** while maintaining test coverage
4. **Validate with live API** to ensure real-world functionality

## API Alignment

This MCP server strictly follows **API-side processing** principles:

- ❌ **No client-side filtering, sorting, or pagination**
- ✅ **All operations use Tally API's native capabilities**
- ✅ **Real-time data without stale caches**
- ✅ **Consistent response structures across tools**

The Popular DAOs resource is intentionally minimal, containing only stable identifiers (ID, name, slug, chainId) to prevent stale metadata. For current statistics, users must call the live API tools.

## Development

### Project Structure

```
src/
├── index.ts              # MCP server implementation
├── auth.ts              # API key management
├── graphql-client.ts    # Tally API client with rate limiting
├── organization-tools.ts # DAO querying tools
├── proposal-tools.ts    # Proposal querying tools
├── user-tools.ts       # User and delegation tools
└── resources/          # Static resources
    └── popular-daos.ts # DAO ID mappings

tests/
├── live-server.test.ts       # Comprehensive integration tests  
├── popular-daos-dynamic.test.ts # Dynamic Popular DAOs resource tests
├── setup.ts                 # Test configuration
└── README.md               # Testing documentation
```

### Key Technical Features

- **Rate Limiting**: Intelligent request throttling to respect API limits
- **Error Handling**: Graceful degradation with structured error responses
- **Type Safety**: Full TypeScript implementation with Zod validation
- **Performance**: Optimized queries with minimal data transfer
- **Reliability**: Comprehensive test coverage with real API validation

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Write tests for your changes
4. Implement your feature
5. Ensure all tests pass: `bun run test:live`
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
