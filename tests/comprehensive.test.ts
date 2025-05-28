/**
 * Comprehensive MCP Tally API Testing Suite
 *
 * This test suite implements systematic testing of all 12 MCP tools
 * with every argument combination, edge cases, and error scenarios.
 *
 * PHASE 1: Basic Tool Validation
 * PHASE 2: Required Arguments Testing
 */

import { spawn, ChildProcess } from 'child_process';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class MCPTestClient {
  private server: ChildProcess | null = null;
  private requestId = 1;
  private pendingRequests = new Map<
    number,
    { resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  >();

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Spawn the MCP server
      this.server = spawn('bun', ['run', 'src/index.ts'], {
        env: {
          ...process.env,
          TALLY_API_KEY: process.env.TALLY_API_KEY,
          TRANSPORT_MODE: 'stdio',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.server.stdout || !this.server.stdin) {
        reject(new Error('Failed to create server process'));
        return;
      }

      // Handle server output
      let buffer = '';
      this.server.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response: MCPResponse = JSON.parse(line);
              this.handleResponse(response);
            } catch (error) {
              console.error('Failed to parse response:', line);
            }
          }
        }
      });

      this.server.stderr?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('MCP Tally API Server running on stdio')) {
          resolve();
        }
      });

      this.server.on('error', reject);
      this.server.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      // Give server time to start
      setTimeout(resolve, 2000);
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }

    // Reject all pending requests
    for (const [id, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
      reject(new Error('Server stopped'));
    }
    this.pendingRequests.clear();
  }

  private handleResponse(response: MCPResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);

      if (response.error) {
        pending.reject(new Error(`MCP Error: ${response.error.message}`));
      } else {
        pending.resolve(response.result);
      }
    }
  }

  async request(method: string, params?: any): Promise<any> {
    if (!this.server?.stdin) {
      throw new Error('Server not running');
    }

    const id = this.requestId++;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      // Set timeout for request
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000); // 30 second timeout

      this.pendingRequests.set(id, { resolve, reject, timeout });

      // Send request
      this.server!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  // Convenience methods for common operations
  async callTool(name: string, arguments_: any = {}): Promise<any> {
    return this.request('tools/call', { name, arguments: arguments_ });
  }

  async listTools(): Promise<any> {
    return this.request('tools/list');
  }

  async readResource(uri: string): Promise<any> {
    return this.request('resources/read', { uri });
  }

  async listResources(): Promise<any> {
    return this.request('resources/list');
  }
}

// Test data - known working values for comprehensive testing
const TEST_DATA = {
  organizations: {
    uniswap: {
      id: '2206072050458560434',
      slug: 'uniswap',
      name: 'Uniswap',
      chainId: 'eip155:1',
    },
    arbitrum: {
      id: '2206072050315953936',
      slug: 'arbitrum',
      name: 'Arbitrum',
      chainId: 'eip155:42161',
    },
    zeroXProtocol: {
      id: '2206072050022352213',
      slug: '0x-protocol-treasury',
      name: '0x Protocol Treasury',
      chainId: 'eip155:1',
    },
  },
  chains: {
    ethereum: 'eip155:1',
    arbitrum: 'eip155:42161',
    optimism: 'eip155:10',
    zkSync: 'eip155:324',
    gnosis: 'eip155:100',
  },
  users: {
    // Known addresses for testing (from popular DAOs)
    vitalik: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    uniswapMultisig: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
    sample: '0x0000000000000000000000000000000000000001', // Test address
  },
} as const;

describe('COMPREHENSIVE MCP Tally API Testing Suite', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    if (!process.env.TALLY_API_KEY) {
      throw new Error(
        'TALLY_API_KEY environment variable is required for comprehensive tests'
      );
    }

    client = new MCPTestClient();
    await client.start();
    console.log('🚀 Comprehensive test suite started');
  }, 60000);

  afterAll(async () => {
    if (client) {
      await client.stop();
      console.log('⏹️  Comprehensive test suite completed');
    }
  });

  // ==============================================
  // PHASE 1: BASIC TOOL VALIDATION
  // ==============================================
  describe('PHASE 1: Basic Tool Validation', () => {
    describe('Task 1.1: Verify Tool Registration', () => {
      test('should list all 12 expected tools', async () => {
        const result = await client.listTools();

        expect(result).toHaveProperty('tools');
        expect(Array.isArray(result.tools)).toBe(true);

        const toolNames = result.tools.map((tool: any) => tool.name);
        const expectedTools = [
          'test_connection',
          'get_server_info',
          'list_organizations',
          'get_organization',
          'get_organizations_with_active_proposals',
          'list_proposals',
          'get_proposal',
          'get_active_proposals',
          'get_user_daos',
          'get_dao_participants',
          'get_user_details',
          'get_delegates',
        ];

        // Verify all expected tools exist
        for (const expectedTool of expectedTools) {
          expect(toolNames).toContain(expectedTool);
        }

        // Verify we have exactly the expected number
        expect(toolNames).toHaveLength(expectedTools.length);
      });

      test('should have proper schema definitions for each tool', async () => {
        const result = await client.listTools();

        for (const tool of result.tools) {
          // Each tool should have basic structure
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
          expect(typeof tool.name).toBe('string');
          expect(typeof tool.description).toBe('string');

          // Description should be meaningful (not empty)
          expect(tool.description.length).toBeGreaterThan(10);
        }
      });
    });

    describe('Task 1.2: Basic Tool Execution', () => {
      test('test_connection - should execute without arguments', async () => {
        const result = await client.callTool('test_connection', {});

        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty('text');
        expect(result.content[0].text).toContain(
          'MCP Tally API Server is running'
        );
      });

      test('get_server_info - should execute without arguments', async () => {
        const result = await client.callTool('get_server_info', {});

        expect(result).toHaveProperty('content');
        const info = JSON.parse(result.content[0].text);

        expect(info).toHaveProperty('name');
        expect(info).toHaveProperty('version');
        expect(info).toHaveProperty('api_key_configured');
      });

      test('list_organizations - should execute with default arguments', async () => {
        const result = await client.callTool('list_organizations', {});

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data).toHaveProperty('items');
        expect(data).toHaveProperty('totalCount');
        expect(data).toHaveProperty('pageInfo');
        expect(Array.isArray(data.items)).toBe(true);
      });

      test('get_organizations_with_active_proposals - should execute with defaults', async () => {
        const result = await client.callTool(
          'get_organizations_with_active_proposals',
          {}
        );

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data).toHaveProperty('items');
        expect(data).toHaveProperty('totalCount');
        expect(Array.isArray(data.items)).toBe(true);
      });

      test('get_active_proposals - should execute with defaults', async () => {
        const result = await client.callTool('get_active_proposals', {});

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data).toHaveProperty('items');
        expect(data).toHaveProperty('totalCount');
        expect(Array.isArray(data.items)).toBe(true);
      });
    });
  });

  // ==============================================
  // PHASE 2: REQUIRED ARGUMENTS TESTING
  // ==============================================
  describe('PHASE 2: Required Arguments Testing', () => {
    describe('Task 2.4: get_organization - Required Arguments', () => {
      test('should work with valid organizationId', async () => {
        const result = await client.callTool('get_organization', {
          organizationId: TEST_DATA.organizations.uniswap.id,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data.id).toBe(TEST_DATA.organizations.uniswap.id);
        expect(data.name).toBe(TEST_DATA.organizations.uniswap.name);
        expect(data.slug).toBe(TEST_DATA.organizations.uniswap.slug);
      });

      test('should work with valid organizationSlug', async () => {
        const result = await client.callTool('get_organization', {
          organizationSlug: TEST_DATA.organizations.uniswap.slug,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data.slug).toBe(TEST_DATA.organizations.uniswap.slug);
        expect(data.name).toBe(TEST_DATA.organizations.uniswap.name);
      });

      test('should error when neither organizationId nor organizationSlug provided', async () => {
        await expect(client.callTool('get_organization', {})).rejects.toThrow();
      });

      test('should use organizationId when both provided', async () => {
        const result = await client.callTool('get_organization', {
          organizationId: TEST_DATA.organizations.uniswap.id,
          organizationSlug: TEST_DATA.organizations.arbitrum.slug, // Different slug
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        // Should return Uniswap (by ID), not Arbitrum (by slug)
        expect(data.id).toBe(TEST_DATA.organizations.uniswap.id);
        expect(data.name).toBe(TEST_DATA.organizations.uniswap.name);
      });
    });

    describe('Task 2.6: list_proposals - Required Arguments', () => {
      test('should work with valid organizationId', async () => {
        const result = await client.callTool('list_proposals', {
          organizationId: TEST_DATA.organizations.uniswap.id,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data).toHaveProperty('items');
        expect(data).toHaveProperty('totalCount');
        expect(Array.isArray(data.items)).toBe(true);
      });

      test('should error without organizationId', async () => {
        await expect(client.callTool('list_proposals', {})).rejects.toThrow();
      });

      test('should error with invalid organizationId', async () => {
        await expect(
          client.callTool('list_proposals', {
            organizationId: 'definitely_invalid_id_12345',
          })
        ).rejects.toThrow();
      });
    });

    describe('Task 2.7: get_proposal - Required Arguments', () => {
      test('should work with proposalId + organizationId', async () => {
        // First get a valid proposal ID
        const listResult = await client.callTool('list_proposals', {
          organizationId: TEST_DATA.organizations.uniswap.id,
          pageSize: 1,
        });

        const listData = JSON.parse(listResult.content[0].text);

        if (listData.items.length > 0) {
          const proposalId = listData.items[0].id;

          const result = await client.callTool('get_proposal', {
            organizationId: TEST_DATA.organizations.uniswap.id,
            proposalId,
          });

          expect(result).toHaveProperty('content');
          const data = JSON.parse(result.content[0].text);

          expect(data.id).toBe(proposalId);
        }
      });

      test('should work with proposalId + organizationSlug', async () => {
        // First get a valid proposal ID
        const listResult = await client.callTool('list_proposals', {
          organizationId: TEST_DATA.organizations.uniswap.id,
          pageSize: 1,
        });

        const listData = JSON.parse(listResult.content[0].text);

        if (listData.items.length > 0) {
          const proposalId = listData.items[0].id;

          const result = await client.callTool('get_proposal', {
            organizationSlug: TEST_DATA.organizations.uniswap.slug,
            proposalId,
          });

          expect(result).toHaveProperty('content');
          const data = JSON.parse(result.content[0].text);

          expect(data.id).toBe(proposalId);
        }
      });

      test('should error without proposalId', async () => {
        await expect(
          client.callTool('get_proposal', {
            organizationId: TEST_DATA.organizations.uniswap.id,
          })
        ).rejects.toThrow();
      });

      test('should error without organization identifier', async () => {
        await expect(
          client.callTool('get_proposal', {
            proposalId: 'some_proposal_id',
          })
        ).rejects.toThrow();
      });
    });

    describe('Task 2.9: get_user_daos - Required Arguments', () => {
      test('should work with valid Ethereum address', async () => {
        const result = await client.callTool('get_user_daos', {
          address: TEST_DATA.users.vitalik,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        // Should return array of DAOs (may be empty)
        expect(Array.isArray(data) || data === null).toBe(true);
      });

      test('should error without address', async () => {
        await expect(client.callTool('get_user_daos', {})).rejects.toThrow();
      });

      test('should handle invalid address format', async () => {
        await expect(
          client.callTool('get_user_daos', {
            address: 'invalid_address_format',
          })
        ).rejects.toThrow();
      });
    });

    describe('Task 2.10: get_dao_participants - Required Arguments', () => {
      test('should work with valid organizationId', async () => {
        const result = await client.callTool('get_dao_participants', {
          organizationId: TEST_DATA.organizations.uniswap.id,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data).toHaveProperty('items');
        expect(Array.isArray(data.items)).toBe(true);
      });

      test('should work with valid organizationSlug', async () => {
        const result = await client.callTool('get_dao_participants', {
          organizationSlug: TEST_DATA.organizations.uniswap.slug,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data).toHaveProperty('items');
        expect(Array.isArray(data.items)).toBe(true);
      });

      test('should error when neither organizationId nor organizationSlug provided', async () => {
        await expect(
          client.callTool('get_dao_participants', {})
        ).rejects.toThrow();
      });
    });

    describe('Task 2.11: get_user_details - Required Arguments', () => {
      test('should work with valid Ethereum address', async () => {
        const result = await client.callTool('get_user_details', {
          address: TEST_DATA.users.vitalik,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        // Should return user details or null
        expect(data === null || typeof data === 'object').toBe(true);
      });

      test('should error without address', async () => {
        await expect(client.callTool('get_user_details', {})).rejects.toThrow();
      });

      test('should handle invalid address format', async () => {
        await expect(
          client.callTool('get_user_details', {
            address: 'invalid_address_format',
          })
        ).rejects.toThrow();
      });
    });

    describe('Task 2.12: get_delegates - Required Arguments', () => {
      test('should work with valid organizationId', async () => {
        const result = await client.callTool('get_delegates', {
          organizationId: TEST_DATA.organizations.uniswap.id,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data).toHaveProperty('items');
        expect(Array.isArray(data.items)).toBe(true);
      });

      test('should work with valid organizationSlug', async () => {
        const result = await client.callTool('get_delegates', {
          organizationSlug: TEST_DATA.organizations.uniswap.slug,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data).toHaveProperty('items');
        expect(Array.isArray(data.items)).toBe(true);
      });

      test('should error when neither organizationId nor organizationSlug provided', async () => {
        await expect(client.callTool('get_delegates', {})).rejects.toThrow();
      });
    });
  });
});
