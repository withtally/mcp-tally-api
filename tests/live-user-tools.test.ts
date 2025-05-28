/**
 * Live User Tools Integration Tests
 *
 * This test suite provides comprehensive live integration testing for user-related
 * MCP tools that were missing from the main live-server.test.ts file:
 * - get_user_daos
 * - get_dao_participants  
 * - get_user_details
 * - get_delegates
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
    console.log('[MCPTestClient] Attempting to start server...');
    return new Promise((resolve, reject) => {
      this.server = spawn('bun', ['run', 'src/index.ts'], {
        env: {
          ...process.env,
          TALLY_API_KEY: process.env.TALLY_API_KEY,
          TRANSPORT_MODE: 'stdio',
          LOG_LEVEL: 'debug',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.server.stdout || !this.server.stdin || !this.server.stderr) {
        console.error('[MCPTestClient] Failed to get server stdio streams.');
        reject(new Error('Failed to create server process or attach to stdio'));
        return;
      }
      console.log('[MCPTestClient] Server process spawned.');

      let serverReady = false;
      let rejected = false;

      const startupTimeout = setTimeout(() => {
        if (!serverReady && !rejected) {
          rejected = true;
          console.error('[MCPTestClient] Server startup timed out after 15 seconds.');
          this.server?.kill();
          reject(new Error('Server startup timed out'));
        }
      }, 15000);

      this.server.stdout.on('data', (data) => {
        let buffer = '';
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response: MCPResponse = JSON.parse(line);
              this.handleResponse(response);
            } catch (error) {
              console.error('[MCPTestClient] Failed to parse response:', line, error);
            }
          }
        }
      });

      this.server.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`[Server STDERR] ${output.trim()}`);
        if (output.includes('MCP Tally API Server running on stdio')) {
          if (!serverReady && !rejected) {
            serverReady = true;
            clearTimeout(startupTimeout);
            console.log('[MCPTestClient] Server ready message received.');
            resolve();
          }
        } else if (output.toLowerCase().includes('error') || output.toLowerCase().includes('failed')) {
          if (!serverReady && !rejected) {
            rejected = true;
            console.error(`[MCPTestClient] Server emitted error on STDERR: ${output.trim()}`);
            clearTimeout(startupTimeout);
            this.server?.kill();
            reject(new Error(`Server failed to start (stderr): ${output.trim()}`));
          }
        }
      });

      this.server.on('error', (err) => {
        if (!serverReady && !rejected) {
          rejected = true;
          clearTimeout(startupTimeout);
          console.error('[MCPTestClient] Server process error event:', err);
          this.server?.kill();
          reject(err);
        }
      });

      this.server.on('exit', (code, signal) => {
        console.log(`[MCPTestClient] Server process exited with code ${code}, signal ${signal}.`);
        if (!serverReady && !rejected && code !== 0 && code !== null) {
          rejected = true;
          clearTimeout(startupTimeout);
          reject(new Error(`Server process exited prematurely with code ${code}, signal ${signal}`));
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }

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
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.server!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  async callTool(name: string, arguments_: any = {}): Promise<any> {
    return this.request('tools/call', { name, arguments: arguments_ });
  }
}

// Test data for user tools
const TEST_DATA = {
  organizations: {
    uniswap: {
      id: '2206072050458560434',
      slug: 'uniswap',
      name: 'Uniswap',
    },
    arbitrum: {
      id: '2206072050315953936', 
      slug: 'arbitrum',
      name: 'Arbitrum',
    },
    compound: {
      id: '2206072050315953925',
      slug: 'compound',
      name: 'Compound',
    },
  },
  users: {
    // Known addresses from popular DAOs
    vitalik: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    uniswapMultisig: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
    sample: '0x0000000000000000000000000000000000000001',
    // Some other known DeFi addresses
    aaveMultisig: '0xEE56e2B3D491590B5b31738cC34d5232F378a8D5',
    compoundTimelock: '0x6d903f6003cca6255D85CcA4D3B5E5146dC33925',
  },
} as const;

// Validation schemas
const UserDAOSchema = z.object({
  id: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  token: z.object({
    symbol: z.string(),
  }),
  votes: z.string(),
});

const DAOParticipantSchema = z.object({
  id: z.string(),
  delegatorsCount: z.number(),
  account: z.object({
    address: z.string(),
    name: z.string(),
  }),
});

const UserDetailsSchema = z.object({
  id: z.string(),
  address: z.string(),
  name: z.string(),
  bio: z.string().nullable(),
  twitter: z.string().nullable(),
  ens: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
});

const DelegateSchema = z.object({
  id: z.string(),
  delegatorsCount: z.number(),
  votesCount: z.string(),
  account: z.object({
    address: z.string(), 
    name: z.string(),
  }),
});

const PaginatedResponseSchema = z.object({
  items: z.array(z.any()),
  totalCount: z.number(),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    startCursor: z.string().optional(),
    endCursor: z.string().optional(),
  }),
});

describe('Live User Tools Integration Tests', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    if (!process.env.TALLY_API_KEY) {
      throw new Error('TALLY_API_KEY environment variable is required for live tests');
    }

    console.log('🧪 Starting User Tools Live Test Suite');
    console.log('   API Key configured:', !!process.env.TALLY_API_KEY);

    client = new MCPTestClient();
    await client.start();
    console.log('✅ MCP server started successfully for tests.');
  }, 90000);

  afterAll(async () => {
    if (client) {
      await client.stop();
      console.log('⏹️ User Tools test suite completed');
    }
  });

  describe('get_user_daos', () => {
    test('should return DAOs for known active user', async () => {
      const result = await client.callTool('get_user_daos', {
        address: TEST_DATA.users.vitalik,
      });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);

      // Should return array or null
      expect(Array.isArray(data) || data === null).toBe(true);

      if (Array.isArray(data) && data.length > 0) {
        // Validate structure of first DAO participation
        expect(() => UserDAOSchema.parse(data[0])).not.toThrow();
        
        // Check that organization data is present
        expect(data[0].organization).toHaveProperty('name');
        expect(data[0].organization).toHaveProperty('slug');
        
        // Check that voting data is present
        expect(data[0]).toHaveProperty('votes');
        expect(data[0].token).toHaveProperty('symbol');
      }
    });

    test('should handle user with no DAO participations', async () => {
      const result = await client.callTool('get_user_daos', {
        address: TEST_DATA.users.sample,
      });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);

      // Should return empty array or null for unknown user
      expect(Array.isArray(data) || data === null).toBe(true);
      if (Array.isArray(data)) {
        expect(data).toHaveLength(0);
      }
    });

    test('should validate Ethereum address format', async () => {
      const invalidAddresses = [
        'invalid',
        '0x123', // Too short
        '0xinvalid', // Invalid hex
        'not_an_address',
      ];

      for (const address of invalidAddresses) {
        await expect(
          client.callTool('get_user_daos', { address })
        ).rejects.toThrow();
      }
    });

    test('should handle pageSize parameter', async () => {
      const result = await client.callTool('get_user_daos', {
        address: TEST_DATA.users.vitalik,
        pageSize: 5,
      });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);

      if (Array.isArray(data)) {
        expect(data.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('get_dao_participants', () => {
    test('should return participants for Uniswap', async () => {
      const result = await client.callTool('get_dao_participants', {
        organizationId: TEST_DATA.organizations.uniswap.id,
      });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);

      // Validate response structure
      expect(() => PaginatedResponseSchema.parse(data)).not.toThrow();
      expect(Array.isArray(data.items)).toBe(true);
      expect(typeof data.totalCount).toBe('number');

      if (data.items.length > 0) {
        // Validate first participant structure
        expect(() => DAOParticipantSchema.parse(data.items[0])).not.toThrow();
        
        expect(data.items[0]).toHaveProperty('id');
        expect(data.items[0]).toHaveProperty('delegatorsCount');
        expect(data.items[0].account).toHaveProperty('address');
        expect(data.items[0].account).toHaveProperty('name');
      }
    });

    test('should handle pagination', async () => {
      const pageSize = 5;
      const result = await client.callTool('get_dao_participants', {
        organizationId: TEST_DATA.organizations.uniswap.id,
        pageSize,
      });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);

      expect(data.items.length).toBeLessThanOrEqual(pageSize);
      expect(data).toHaveProperty('pageInfo');
    });

    test('should validate organization ID is required', async () => {
      await expect(
        client.callTool('get_dao_participants', {})
      ).rejects.toThrow();
    });

    test('should handle invalid organization ID', async () => {
      await expect(
        client.callTool('get_dao_participants', {
          organizationId: 'invalid_org_id',
        })
      ).rejects.toThrow();
    });

    test('should validate pageSize boundaries', async () => {
      // Test invalid page sizes
      const invalidPageSizes = [0, -1, 101, 1000];
      
      for (const pageSize of invalidPageSizes) {
        await expect(
          client.callTool('get_dao_participants', {
            organizationId: TEST_DATA.organizations.uniswap.id,
            pageSize,
          })
        ).rejects.toThrow();
      }

      // Test valid boundary values
      const validPageSizes = [1, 50, 100];
      
      for (const pageSize of validPageSizes) {
        const result = await client.callTool('get_dao_participants', {
          organizationId: TEST_DATA.organizations.uniswap.id,
          pageSize,
        });
        
        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(data.items.length).toBeLessThanOrEqual(pageSize);
      }
    });
  });

  describe('get_user_details', () => {
    test('should return details for known user', async () => {
      const result = await client.callTool('get_user_details', {
        address: TEST_DATA.users.vitalik,
      });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);

      // Should return user object or null
      expect(data === null || typeof data === 'object').toBe(true);

      if (data !== null) {
        // Validate structure if user exists
        expect(() => UserDetailsSchema.parse(data)).not.toThrow();
        
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('address');
        expect(data).toHaveProperty('name');
        
        // Address should match the requested address
        expect(data.address.toLowerCase()).toBe(TEST_DATA.users.vitalik.toLowerCase());
      }
    });

    test('should handle non-existent user', async () => {
      const result = await client.callTool('get_user_details', {
        address: TEST_DATA.users.sample,
      });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);

      // Should return null for non-existent user
      expect(data).toBeNull();
    });

    test('should validate address is required', async () => {
      await expect(
        client.callTool('get_user_details', {})
      ).rejects.toThrow();
    });

    test('should validate Ethereum address format', async () => {
      const invalidAddresses = [
        'invalid',
        '0x123',
        '0xinvalid',
        'not_an_address',
        '',
        null,
        123,
        true,
      ];

      for (const address of invalidAddresses) {
        await expect(
          client.callTool('get_user_details', { address })
        ).rejects.toThrow();
      }
    });
  });

  describe('get_delegates', () => {
    test('should return delegates for Uniswap', async () => {
      const result = await client.callTool('get_delegates', {
        organizationId: TEST_DATA.organizations.uniswap.id,
      });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);

      // Validate response structure
      expect(() => PaginatedResponseSchema.parse(data)).not.toThrow();
      expect(Array.isArray(data.items)).toBe(true);
      expect(typeof data.totalCount).toBe('number');

      if (data.items.length > 0) {
        // Validate first delegate structure
        expect(() => DelegateSchema.parse(data.items[0])).not.toThrow();
        
        expect(data.items[0]).toHaveProperty('id');
        expect(data.items[0]).toHaveProperty('delegatorsCount');
        expect(data.items[0]).toHaveProperty('votesCount');
        expect(data.items[0].account).toHaveProperty('address');
        expect(data.items[0].account).toHaveProperty('name');
      }
    });

    test('should handle pagination', async () => {
      const pageSize = 10;
      const result = await client.callTool('get_delegates', {
        organizationId: TEST_DATA.organizations.uniswap.id,
        pageSize,
      });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);

      expect(data.items.length).toBeLessThanOrEqual(pageSize);
      expect(data).toHaveProperty('pageInfo');
    });

    test('should handle sorting parameters', async () => {
      const sortOptions = [
        { sortBy: 'id', sortOrder: 'asc' },
        { sortBy: 'votes', sortOrder: 'desc' },
        { sortBy: 'delegators', sortOrder: 'asc' },
        { sortBy: 'isPrioritized', sortOrder: 'desc' },
      ];

      for (const { sortBy, sortOrder } of sortOptions) {
        const result = await client.callTool('get_delegates', {
          organizationId: TEST_DATA.organizations.uniswap.id,
          pageSize: 5,
          sortBy,
          sortOrder,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }
    });

    test('should validate organization ID is required', async () => {
      await expect(
        client.callTool('get_delegates', {})
      ).rejects.toThrow();
    });

    test('should handle invalid organization ID', async () => {
      await expect(
        client.callTool('get_delegates', {
          organizationId: 'invalid_org_id',
        })
      ).rejects.toThrow();
    });

    test('should validate sort parameters', async () => {
      // Test invalid sortBy values
      await expect(
        client.callTool('get_delegates', {
          organizationId: TEST_DATA.organizations.uniswap.id,
          sortBy: 'invalid_field',
        })
      ).rejects.toThrow();

      // Test invalid sortOrder values
      await expect(
        client.callTool('get_delegates', {
          organizationId: TEST_DATA.organizations.uniswap.id,
          sortOrder: 'invalid_order',
        })
      ).rejects.toThrow();
    });

    test('should validate pageSize boundaries', async () => {
      // Test invalid page sizes
      const invalidPageSizes = [0, -1, 101, 1000];
      
      for (const pageSize of invalidPageSizes) {
        await expect(
          client.callTool('get_delegates', {
            organizationId: TEST_DATA.organizations.uniswap.id,
            pageSize,
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('Cross-tool Integration', () => {
    test('should maintain data consistency between get_dao_participants and get_delegates', async () => {
      // Get participants
      const participantsResult = await client.callTool('get_dao_participants', {
        organizationId: TEST_DATA.organizations.uniswap.id,
        pageSize: 5,
      });

      // Get delegates
      const delegatesResult = await client.callTool('get_delegates', {
        organizationId: TEST_DATA.organizations.uniswap.id,
        pageSize: 5,
      });

      expect(participantsResult).toHaveProperty('content');
      expect(delegatesResult).toHaveProperty('content');

      const participants = JSON.parse(participantsResult.content[0].text);
      const delegates = JSON.parse(delegatesResult.content[0].text);

      // Both should return valid structures
      expect(Array.isArray(participants.items)).toBe(true);
      expect(Array.isArray(delegates.items)).toBe(true);

      // Data types should be consistent
      if (participants.items.length > 0 && delegates.items.length > 0) {
        expect(typeof participants.items[0].account.address).toBe('string');
        expect(typeof delegates.items[0].account.address).toBe('string');
      }
    });

    test('should get user details for DAO participants', async () => {
      // First get some DAO participants
      const participantsResult = await client.callTool('get_dao_participants', {
        organizationId: TEST_DATA.organizations.uniswap.id,
        pageSize: 3,
      });

      const participants = JSON.parse(participantsResult.content[0].text);

      if (participants.items.length > 0) {
        const firstParticipant = participants.items[0];
        
        // Get details for this participant
        const detailsResult = await client.callTool('get_user_details', {
          address: firstParticipant.account.address,
        });

        expect(detailsResult).toHaveProperty('content');
        const details = JSON.parse(detailsResult.content[0].text);

        // If details exist, address should match
        if (details !== null) {
          expect(details.address.toLowerCase()).toBe(
            firstParticipant.account.address.toLowerCase()
          );
        }
      }
    });

    test('should validate cross-tool parameter consistency', async () => {
      // Test that the same organization ID works across tools
      const orgId = TEST_DATA.organizations.uniswap.id;

      const [participantsResult, delegatesResult] = await Promise.all([
        client.callTool('get_dao_participants', { organizationId: orgId }),
        client.callTool('get_delegates', { organizationId: orgId }),
      ]);

      const participants = JSON.parse(participantsResult.content[0].text);
      const delegates = JSON.parse(delegatesResult.content[0].text);

      // Both should succeed with the same organization ID
      expect(Array.isArray(participants.items)).toBe(true);
      expect(Array.isArray(delegates.items)).toBe(true);
    });
  });

  describe('Performance & Reliability', () => {
    test('should handle concurrent user tool requests', async () => {
      const promises = [
        client.callTool('get_user_daos', { address: TEST_DATA.users.vitalik }),
        client.callTool('get_dao_participants', { organizationId: TEST_DATA.organizations.uniswap.id, pageSize: 5 }),
        client.callTool('get_user_details', { address: TEST_DATA.users.vitalik }),
        client.callTool('get_delegates', { organizationId: TEST_DATA.organizations.uniswap.id, pageSize: 5 }),
      ];

      const results = await Promise.allSettled(promises);

      // All requests should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toHaveProperty('content');
        }
      });
    });

    test('should respond within reasonable time limits', async () => {
      const startTime = Date.now();

      await client.callTool('get_dao_participants', {
        organizationId: TEST_DATA.organizations.uniswap.id,
        pageSize: 20,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 10 seconds for reasonable page size
      expect(responseTime).toBeLessThan(10000);
    });
  });
}); 