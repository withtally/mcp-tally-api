# Comprehensive MCP Tally API Server Test Plan
Generated: 2025-08-27

## Overview
This document outlines the comprehensive testing strategy for the MCP Tally API server, which provides blockchain governance data through the Model Context Protocol.

## Test Environment
- **Server Location**: `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-tally-api`
- **Server Version**: 1.1.0
- **Transport Modes**: STDIO, HTTP (SSE not fully implemented)
- **Tally API Endpoint**: https://api.tally.xyz/query
- **API Key**: Configured and validated ✓

## Test Phases

### Phase 1: Prerequisites Validation
1. ✅ MCP Protocol Specification Research
2. ✅ Tally API Documentation Research  
3. ✅ API Key Configuration and Authentication Test

### Phase 2: Server Capability Discovery
1. **STDIO Transport Testing**
   - Server initialization and handshake
   - Capability negotiation (tools, resources, prompts)
   - Tool discovery and schema validation

2. **HTTP Transport Testing** 
   - Server startup and endpoint availability
   - JSON-RPC message handling
   - Request/response validation

### Phase 3: Tool Testing
Based on source code analysis, the server provides these tools:
1. `get_server_info` - Basic server information
2. `list_organizations` - DAO/organization listing with pagination
3. `get_organization` - Detailed organization data
4. `get_organizations_with_active_proposals` - Active proposal filtering
5. `list_proposals` - Proposal listing for organizations
6. `get_proposal` - Detailed proposal information
7. `get_active_proposals` - Currently votable proposals
8. `get_user_profile` - User governance profile
9. `get_delegate_statement` - Delegate information
10. `get_dao_participants` - DAO member listing
11. `get_delegates` - Enhanced delegate data
12. `execute_graphql_query` - Direct GraphQL execution

### Phase 4: Resource Testing
Based on source code analysis, resources include:
1. `server-info` - Server status information
2. `popular-daos` - Popular DAO listing
3. `organization-overview` - Organization template (tally://org/{organizationId})
4. `proposal-overview` - Proposal template (tally://org/{organizationId}/proposal/{proposalId})
5. `user-overview` - User template (tally://user/{address})
6. `trending-proposals` - Trending proposals overview
7. `tally-api-schema` - GraphQL schema introspection

### Phase 5: Prompt Testing
Based on source code, governance prompts are loaded from `./src/prompts/governance-prompts.ts`:
- Governance analysis prompts for DAO operations

### Phase 6: API Validation
Direct testing of Tally API endpoints to validate MCP responses:
1. Organizations query validation
2. Proposals query validation  
3. User/delegate data validation
4. Error response validation

### Phase 7: Error Handling & Edge Cases
1. Invalid parameters
2. Missing API keys
3. Rate limiting behavior
4. Network timeouts
5. Invalid queries

## Expected Server Capabilities
Based on code analysis, the server should support:
- **Tools**: 12 total tools for governance operations
- **Resources**: 7 resources including templates
- **Prompts**: Governance analysis prompt templates
- **Transports**: STDIO (fully implemented), HTTP (basic implementation)

## Testing Methodology
1. **Manual JSON-RPC Testing**: Direct message exchange via STDIO/HTTP
2. **Parallel API Validation**: Direct Tally API calls for comparison
3. **Error Condition Testing**: Invalid inputs and edge cases
4. **Performance Evaluation**: Response times and throughput

## Success Criteria
- All tools respond correctly with valid parameters
- All resources are accessible and return expected data
- All prompts are available and functional
- Error handling is robust and informative
- MCP responses match direct API responses
- Both transport modes function correctly