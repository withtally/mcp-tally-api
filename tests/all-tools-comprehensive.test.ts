/**
 * Comprehensive All Tools Testing Suite
 *
 * This test suite ensures ALL 12 MCP tools are tested with:
 * - All required parameters
 * - All optional parameters in isolation and combination
 * - Parameter validation (invalid types, formats, etc.)
 * - Edge cases and boundary values
 * - Error scenarios
 */

import { spawn, ChildProcess } from 'child_process';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';

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
      setTimeout(resolve, 3000);
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

  async listTools(): Promise<any> {
    return this.request('tools/list');
  }
}

// Test data for comprehensive testing
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
  },
  chains: {
    ethereum: 'eip155:1',
    arbitrum: 'eip155:42161',
    optimism: 'eip155:10',
    zkSync: 'eip155:324',
    gnosis: 'eip155:100',
  },
  users: {
    vitalik: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    sample: '0x0000000000000000000000000000000000000001',
  },
  invalidData: {
    invalidEthAddress: '0xinvalid',
    invalidOrgId: 'invalid_org_id_12345',
    negativeNumbers: [-1, -10, -100],
    excessiveNumbers: [1000, 99999, 1000000],
    invalidChainIds: ['invalid-chain', 'eip155:999999'],
    invalidSortFields: ['invalid_sort', 'nonexistent'],
    invalidSortOrders: ['invalid', 'up', 'down'],
  },
} as const;

describe('COMPREHENSIVE ALL TOOLS TESTING SUITE', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    if (!process.env.TALLY_API_KEY) {
      throw new Error('TALLY_API_KEY environment variable is required');
    }

    client = new MCPTestClient();
    await client.start();
    console.log('🚀 Comprehensive all tools test suite started');
  }, 60000);

  afterAll(async () => {
    if (client) {
      await client.stop();
      console.log('⏹️ Comprehensive all tools test suite completed');
    }
  });

  // Tool 1: test_connection
  describe('Tool 1: test_connection', () => {
    test('should work with no arguments', async () => {
      const result = await client.callTool('test_connection');
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('MCP Tally API Server is running');
    });

    test('should ignore extra arguments', async () => {
      const result = await client.callTool('test_connection', {
        extra: 'ignored',
        another: 123,
      });
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('MCP Tally API Server is running');
    });
  });

  // Tool 2: get_server_info
  describe('Tool 2: get_server_info', () => {
    test('should work with no arguments', async () => {
      const result = await client.callTool('get_server_info');
      expect(result).toHaveProperty('content');
      
      const info = JSON.parse(result.content[0].text);
      expect(info).toHaveProperty('name', 'mcp-tally-api');
      expect(info).toHaveProperty('version', '1.0.0');
      expect(info).toHaveProperty('api_key_configured');
    });

    test('should ignore extra arguments', async () => {
      const result = await client.callTool('get_server_info', {
        extra: 'ignored',
      });
      expect(result).toHaveProperty('content');
      const info = JSON.parse(result.content[0].text);
      expect(info).toHaveProperty('name');
    });
  });

  // Tool 3: list_organizations
  describe('Tool 3: list_organizations', () => {
    test('should work with no arguments (all defaults)', async () => {
      const result = await client.callTool('list_organizations');
      expect(result).toHaveProperty('content');
      
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('totalCount');
      expect(data).toHaveProperty('pageInfo');
      expect(Array.isArray(data.items)).toBe(true);
    });

    describe('page parameter', () => {
      test('should work with valid page numbers', async () => {
        const validPages = [1, 2, 5, 10, 50];
        
        for (const page of validPages) {
          const result = await client.callTool('list_organizations', { page });
          expect(result).toHaveProperty('content');
          
          const data = JSON.parse(result.content[0].text);
          expect(data).toHaveProperty('items');
          expect(Array.isArray(data.items)).toBe(true);
        }
      });

      test('should handle invalid page numbers', async () => {
        const invalidPages = [0, -1, 1.5, 'invalid', null];
        
        for (const page of invalidPages) {
          await expect(
            client.callTool('list_organizations', { page })
          ).rejects.toThrow();
        }
      });
    });

    describe('pageSize parameter', () => {
      test('should work with valid page sizes', async () => {
        const validPageSizes = [1, 5, 10, 20, 50, 100];
        
        for (const pageSize of validPageSizes) {
          const result = await client.callTool('list_organizations', { pageSize });
          expect(result).toHaveProperty('content');
          
          const data = JSON.parse(result.content[0].text);
          expect(data.items.length).toBeLessThanOrEqual(pageSize);
        }
      });

      test('should reject invalid page sizes', async () => {
        const invalidPageSizes = [0, -1, 101, 1000, 'invalid', null];
        
        for (const pageSize of invalidPageSizes) {
          await expect(
            client.callTool('list_organizations', { pageSize })
          ).rejects.toThrow();
        }
      });
    });

    describe('chainId parameter', () => {
      test('should work with valid chain IDs', async () => {
        const validChainIds = Object.values(TEST_DATA.chains);
        
        for (const chainId of validChainIds) {
          const result = await client.callTool('list_organizations', { 
            chainId, 
            pageSize: 5 
          });
          expect(result).toHaveProperty('content');
          
          const data = JSON.parse(result.content[0].text);
          expect(Array.isArray(data.items)).toBe(true);
          
          // Verify all items have the specified chain
          for (const org of data.items) {
            expect(org.chainIds).toContain(chainId);
          }
        }
      });

      test('should handle invalid chain IDs gracefully', async () => {
        const invalidChainIds = TEST_DATA.invalidData.invalidChainIds;
        
        for (const chainId of invalidChainIds) {
          const result = await client.callTool('list_organizations', { 
            chainId,
            pageSize: 5
          });
          expect(result).toHaveProperty('content');
          
          const data = JSON.parse(result.content[0].text);
          expect(Array.isArray(data.items)).toBe(true);
          // Should return empty or filtered results, not error
        }
      });
    });

    describe('hasLogo parameter', () => {
      test('should work with boolean values', async () => {
        const booleanValues = [true, false];
        
        for (const hasLogo of booleanValues) {
          const result = await client.callTool('list_organizations', { 
            hasLogo,
            pageSize: 5
          });
          expect(result).toHaveProperty('content');
          
          const data = JSON.parse(result.content[0].text);
          expect(Array.isArray(data.items)).toBe(true);
        }
      });

      test('should reject non-boolean values', async () => {
        const invalidValues = ['true', 'false', 1, 0, 'yes', 'no', null];
        
        for (const hasLogo of invalidValues) {
          await expect(
            client.callTool('list_organizations', { hasLogo })
          ).rejects.toThrow();
        }
      });
    });

    describe('sortBy parameter', () => {
      test('should work with valid sort fields', async () => {
        const validSortFields = ['id', 'name', 'explore', 'popular'];
        
        for (const sortBy of validSortFields) {
          const result = await client.callTool('list_organizations', { 
            sortBy,
            pageSize: 5
          });
          expect(result).toHaveProperty('content');
          
          const data = JSON.parse(result.content[0].text);
          expect(Array.isArray(data.items)).toBe(true);
          expect(data.items.length).toBeGreaterThan(0);
        }
      });

      test('should handle invalid sort fields', async () => {
        const invalidSortFields = TEST_DATA.invalidData.invalidSortFields;
        
        for (const sortBy of invalidSortFields) {
          await expect(
            client.callTool('list_organizations', { sortBy })
          ).rejects.toThrow();
        }
      });
    });

    describe('sortOrder parameter', () => {
      test('should work with valid sort orders', async () => {
        const validSortOrders = ['asc', 'desc'];
        
        for (const sortOrder of validSortOrders) {
          const result = await client.callTool('list_organizations', { 
            sortBy: 'name',
            sortOrder,
            pageSize: 10
          });
          expect(result).toHaveProperty('content');
          
          const data = JSON.parse(result.content[0].text);
          expect(Array.isArray(data.items)).toBe(true);
          
          if (data.items.length > 1) {
            const names = data.items.map((org: any) => org.name);
            const sortedNames = [...names].sort();
            
            if (sortOrder === 'asc') {
              expect(names).toEqual(sortedNames);
            } else {
              expect(names).toEqual(sortedNames.reverse());
            }
          }
        }
      });

      test('should reject invalid sort orders', async () => {
        const invalidSortOrders = TEST_DATA.invalidData.invalidSortOrders;
        
        for (const sortOrder of invalidSortOrders) {
          await expect(
            client.callTool('list_organizations', { sortOrder })
          ).rejects.toThrow();
        }
      });
    });

    test('should work with all parameters combined', async () => {
      const result = await client.callTool('list_organizations', {
        page: 1,
        pageSize: 5,
        chainId: TEST_DATA.chains.ethereum,
        hasLogo: true,
        sortBy: 'popular',
        sortOrder: 'desc',
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeLessThanOrEqual(5);
    });
  });

  // Tool 4: get_organization
  describe('Tool 4: get_organization', () => {
    test('should work with organizationId', async () => {
      const result = await client.callTool('get_organization', {
        organizationId: TEST_DATA.organizations.uniswap.id,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe(TEST_DATA.organizations.uniswap.id);
      expect(data.name).toBe(TEST_DATA.organizations.uniswap.name);
    });

    test('should work with organizationSlug', async () => {
      const result = await client.callTool('get_organization', {
        organizationSlug: TEST_DATA.organizations.uniswap.slug,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(data.slug).toBe(TEST_DATA.organizations.uniswap.slug);
    });

    test('should prioritize organizationId when both provided', async () => {
      const result = await client.callTool('get_organization', {
        organizationId: TEST_DATA.organizations.uniswap.id,
        organizationSlug: TEST_DATA.organizations.arbitrum.slug,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe(TEST_DATA.organizations.uniswap.id);
    });

    test('should error when neither organizationId nor organizationSlug provided', async () => {
      await expect(
        client.callTool('get_organization', {})
      ).rejects.toThrow();
    });

    test('should error with invalid organizationId', async () => {
      await expect(
        client.callTool('get_organization', {
          organizationId: TEST_DATA.invalidData.invalidOrgId,
        })
      ).rejects.toThrow();
    });

    test('should error with invalid organizationSlug', async () => {
      await expect(
        client.callTool('get_organization', {
          organizationSlug: 'definitely-not-a-real-slug-12345',
        })
      ).rejects.toThrow();
    });

    test('should reject invalid parameter types', async () => {
      const invalidValues = [123, true, null, [], {}];
      
      for (const invalid of invalidValues) {
        await expect(
          client.callTool('get_organization', { organizationId: invalid })
        ).rejects.toThrow();
        
        await expect(
          client.callTool('get_organization', { organizationSlug: invalid })
        ).rejects.toThrow();
      }
    });
  });

  // Tool 5: get_organizations_with_active_proposals
  describe('Tool 5: get_organizations_with_active_proposals', () => {
    test('should work with no arguments (all defaults)', async () => {
      const result = await client.callTool('get_organizations_with_active_proposals');
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('totalCount');
      expect(Array.isArray(data.items)).toBe(true);
    });

    describe('minActiveProposals parameter', () => {
      test('should work with valid values', async () => {
        const validValues = [1, 2, 5, 10, 50];
        
        for (const minActiveProposals of validValues) {
          const result = await client.callTool('get_organizations_with_active_proposals', {
            minActiveProposals,
            pageSize: 5,
          });
          
          expect(result).toHaveProperty('content');
          const data = JSON.parse(result.content[0].text);
          expect(Array.isArray(data.items)).toBe(true);
        }
      });

      test('should reject invalid values', async () => {
        const invalidValues = [-1, 0, 1.5, 'invalid', null];
        
        for (const minActiveProposals of invalidValues) {
          await expect(
            client.callTool('get_organizations_with_active_proposals', { minActiveProposals })
          ).rejects.toThrow();
        }
      });
    });

    describe('chainId parameter', () => {
      test('should work with valid chain IDs', async () => {
        const validChainIds = [TEST_DATA.chains.ethereum, TEST_DATA.chains.arbitrum];
        
        for (const chainId of validChainIds) {
          const result = await client.callTool('get_organizations_with_active_proposals', {
            chainId,
            pageSize: 3,
          });
          
          expect(result).toHaveProperty('content');
          const data = JSON.parse(result.content[0].text);
          expect(Array.isArray(data.items)).toBe(true);
        }
      });
    });

    describe('page and pageSize parameters', () => {
      test('should work with valid pagination values', async () => {
        const pageValues = [1, 2, 5];
        const pageSizeValues = [5, 10, 20, 50, 100];
        
        for (const page of pageValues) {
          const result = await client.callTool('get_organizations_with_active_proposals', {
            page,
            pageSize: 5,
          });
          expect(result).toHaveProperty('content');
        }
        
        for (const pageSize of pageSizeValues) {
          const result = await client.callTool('get_organizations_with_active_proposals', {
            pageSize,
          });
          
          expect(result).toHaveProperty('content');
          const data = JSON.parse(result.content[0].text);
          expect(data.items.length).toBeLessThanOrEqual(pageSize);
        }
      });

      test('should reject invalid pagination values', async () => {
        const invalidValues = [0, -1, 101, 1000, 'invalid'];
        
        for (const invalid of invalidValues) {
          await expect(
            client.callTool('get_organizations_with_active_proposals', { page: invalid })
          ).rejects.toThrow();
          
          await expect(
            client.callTool('get_organizations_with_active_proposals', { pageSize: invalid })
          ).rejects.toThrow();
        });
      });
    });

    test('should work with all parameters combined', async () => {
      const result = await client.callTool('get_organizations_with_active_proposals', {
        minActiveProposals: 1,
        chainId: TEST_DATA.chains.ethereum,
        page: 1,
        pageSize: 10,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  // Tool 6: list_proposals
  describe('Tool 6: list_proposals', () => {
    test('should work with required organizationId', async () => {
      const result = await client.callTool('list_proposals', {
        organizationId: TEST_DATA.organizations.uniswap.id,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    });

    test('should error without organizationId', async () => {
      await expect(
        client.callTool('list_proposals', {})
      ).rejects.toThrow();
    });

    describe('optional parameters', () => {
      const baseArgs = { organizationId: TEST_DATA.organizations.uniswap.id };

      test('page and pageSize parameters', async () => {
        const pageValues = [1, 2, 5];
        const pageSizeValues = [1, 5, 10, 20, 50, 100];
        
        for (const page of pageValues) {
          const result = await client.callTool('list_proposals', {
            ...baseArgs,
            page,
            pageSize: 5,
          });
          expect(result).toHaveProperty('content');
        }
        
        for (const pageSize of pageSizeValues) {
          const result = await client.callTool('list_proposals', {
            ...baseArgs,
            pageSize,
          });
          
          expect(result).toHaveProperty('content');
          const data = JSON.parse(result.content[0].text);
          expect(data.items.length).toBeLessThanOrEqual(pageSize);
        }
      });

      test('governorId parameter', async () => {
        const result = await client.callTool('list_proposals', {
          ...baseArgs,
          governorId: 'some_governor_id',
          pageSize: 5,
        });
        expect(result).toHaveProperty('content');
      });

      test('proposer parameter', async () => {
        const result = await client.callTool('list_proposals', {
          ...baseArgs,
          proposer: TEST_DATA.users.vitalik,
          pageSize: 5,
        });
        expect(result).toHaveProperty('content');
      });

      test('sortOrder parameter', async () => {
        const sortOrders = ['asc', 'desc'];
        
        for (const sortOrder of sortOrders) {
          const result = await client.callTool('list_proposals', {
            ...baseArgs,
            sortOrder,
            pageSize: 5,
          });
          expect(result).toHaveProperty('content');
        }
      });
    });

    test('should reject invalid parameter types', async () => {
      const baseArgs = { organizationId: TEST_DATA.organizations.uniswap.id };
      
      // Invalid page/pageSize
      await expect(
        client.callTool('list_proposals', { ...baseArgs, page: -1 })
      ).rejects.toThrow();
      
      await expect(
        client.callTool('list_proposals', { ...baseArgs, pageSize: 0 })
      ).rejects.toThrow();
      
      // Invalid sort order
      await expect(
        client.callTool('list_proposals', { ...baseArgs, sortOrder: 'invalid' })
      ).rejects.toThrow();
    });

    test('should work with all parameters combined', async () => {
      const result = await client.callTool('list_proposals', {
        organizationId: TEST_DATA.organizations.uniswap.id,
        page: 1,
        pageSize: 10,
        sortOrder: 'desc',
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  // Tool 7: get_proposal
  describe('Tool 7: get_proposal', () => {
    let validProposalId: string;

    beforeAll(async () => {
      // Get a valid proposal ID for testing
      const listResult = await client.callTool('list_proposals', {
        organizationId: TEST_DATA.organizations.uniswap.id,
        pageSize: 1,
      });
      
      const listData = JSON.parse(listResult.content[0].text);
      if (listData.items.length > 0) {
        validProposalId = listData.items[0].id;
      }
    });

    test('should work with proposalId + organizationId', async () => {
      if (validProposalId) {
        const result = await client.callTool('get_proposal', {
          organizationId: TEST_DATA.organizations.uniswap.id,
          proposalId: validProposalId,
        });
        
        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(data.id).toBe(validProposalId);
      }
    });

    test('should work with proposalId + organizationSlug', async () => {
      if (validProposalId) {
        const result = await client.callTool('get_proposal', {
          organizationSlug: TEST_DATA.organizations.uniswap.slug,
          proposalId: validProposalId,
        });
        
        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(data.id).toBe(validProposalId);
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

    test('should error with invalid proposalId', async () => {
      await expect(
        client.callTool('get_proposal', {
          organizationId: TEST_DATA.organizations.uniswap.id,
          proposalId: 'definitely_invalid_proposal_id_12345',
        })
      ).rejects.toThrow();
    });

    test('should reject invalid parameter types', async () => {
      const invalidValues = [123, true, null, [], {}];
      
      for (const invalid of invalidValues) {
        await expect(
          client.callTool('get_proposal', {
            proposalId: invalid,
            organizationId: TEST_DATA.organizations.uniswap.id,
          })
        ).rejects.toThrow();
      }
    });
  });

  // Tool 8: get_active_proposals
  describe('Tool 8: get_active_proposals', () => {
    test('should work with no arguments (all defaults)', async () => {
      const result = await client.callTool('get_active_proposals');
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    });

    describe('optional parameters', () => {
      test('page and pageSize parameters', async () => {
        const pageValues = [1, 2, 5];
        const pageSizeValues = [5, 10, 20, 50, 100];
        
        for (const page of pageValues) {
          const result = await client.callTool('get_active_proposals', {
            page,
            pageSize: 5,
          });
          expect(result).toHaveProperty('content');
        }
        
        for (const pageSize of pageSizeValues) {
          const result = await client.callTool('get_active_proposals', {
            pageSize,
          });
          
          expect(result).toHaveProperty('content');
          const data = JSON.parse(result.content[0].text);
          expect(data.items.length).toBeLessThanOrEqual(pageSize);
        }
      });

      test('chainId parameter', async () => {
        const validChainIds = [TEST_DATA.chains.ethereum, TEST_DATA.chains.arbitrum];
        
        for (const chainId of validChainIds) {
          const result = await client.callTool('get_active_proposals', {
            chainId,
            pageSize: 5,
          });
          expect(result).toHaveProperty('content');
        }
      });

      test('organizationId parameter', async () => {
        const result = await client.callTool('get_active_proposals', {
          organizationId: TEST_DATA.organizations.uniswap.id,
          pageSize: 5,
        });
        expect(result).toHaveProperty('content');
      });
    });

    test('should work with all parameters combined', async () => {
      const result = await client.callTool('get_active_proposals', {
        page: 1,
        pageSize: 10,
        chainId: TEST_DATA.chains.ethereum,
        organizationId: TEST_DATA.organizations.uniswap.id,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  // Tool 9: get_user_daos
  describe('Tool 9: get_user_daos', () => {
    test('should work with valid Ethereum address', async () => {
      const result = await client.callTool('get_user_daos', {
        address: TEST_DATA.users.vitalik,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data) || data === null).toBe(true);
    });

    test('should error without address', async () => {
      await expect(
        client.callTool('get_user_daos', {})
      ).rejects.toThrow();
    });

    test('should reject invalid Ethereum addresses', async () => {
      const invalidAddresses = [
        'invalid',
        '0xinvalid',
        '0x123',
        'not_an_address',
        123,
        true,
        null,
        [],
        {},
      ];
      
      for (const address of invalidAddresses) {
        await expect(
          client.callTool('get_user_daos', { address })
        ).rejects.toThrow();
      }
    });

    test('should handle valid but non-existent addresses', async () => {
      const result = await client.callTool('get_user_daos', {
        address: TEST_DATA.users.sample,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data) || data === null).toBe(true);
    });
  });

  // Tool 10: get_dao_participants
  describe('Tool 10: get_dao_participants', () => {
    test('should work with required organizationId', async () => {
      const result = await client.callTool('get_dao_participants', {
        organizationId: TEST_DATA.organizations.uniswap.id,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    });

    test('should error without organizationId', async () => {
      await expect(
        client.callTool('get_dao_participants', {})
      ).rejects.toThrow();
    });

    describe('pageSize parameter', () => {
      test('should work with valid page sizes', async () => {
        const validPageSizes = [5, 10, 20, 50, 100];
        
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

      test('should reject invalid page sizes', async () => {
        const invalidPageSizes = [0, -1, 101, 1000, 'invalid'];
        
        for (const pageSize of invalidPageSizes) {
          await expect(
            client.callTool('get_dao_participants', {
              organizationId: TEST_DATA.organizations.uniswap.id,
              pageSize,
            })
          ).rejects.toThrow();
        }
      });
    });

    test('should reject invalid organizationId types', async () => {
      const invalidValues = [123, true, null, [], {}];
      
      for (const organizationId of invalidValues) {
        await expect(
          client.callTool('get_dao_participants', { organizationId })
        ).rejects.toThrow();
      }
    });
  });

  // Tool 11: get_user_details
  describe('Tool 11: get_user_details', () => {
    test('should work with valid Ethereum address', async () => {
      const result = await client.callTool('get_user_details', {
        address: TEST_DATA.users.vitalik,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      // May return null if user doesn't exist or has no details
      expect(data === null || typeof data === 'object').toBe(true);
    });

    test('should error without address', async () => {
      await expect(
        client.callTool('get_user_details', {})
      ).rejects.toThrow();
    });

    test('should reject invalid Ethereum addresses', async () => {
      const invalidAddresses = [
        'invalid',
        '0xinvalid',
        '0x123',
        'not_an_address',
        123,
        true,
        null,
        [],
        {},
      ];
      
      for (const address of invalidAddresses) {
        await expect(
          client.callTool('get_user_details', { address })
        ).rejects.toThrow();
      }
    });
  });

  // Tool 12: get_delegates
  describe('Tool 12: get_delegates', () => {
    test('should work with required organizationId', async () => {
      const result = await client.callTool('get_delegates', {
        organizationId: TEST_DATA.organizations.uniswap.id,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    });

    test('should error without organizationId', async () => {
      await expect(
        client.callTool('get_delegates', {})
      ).rejects.toThrow();
    });

    describe('optional parameters', () => {
      const baseArgs = { organizationId: TEST_DATA.organizations.uniswap.id };

      test('pageSize parameter', async () => {
        const validPageSizes = [5, 10, 20, 50, 100];
        
        for (const pageSize of validPageSizes) {
          const result = await client.callTool('get_delegates', {
            ...baseArgs,
            pageSize,
          });
          
          expect(result).toHaveProperty('content');
          const data = JSON.parse(result.content[0].text);
          expect(data.items.length).toBeLessThanOrEqual(pageSize);
        }
      });

      test('sortBy parameter', async () => {
        const validSortFields = ['id', 'votes', 'delegators', 'isPrioritized'];
        
        for (const sortBy of validSortFields) {
          const result = await client.callTool('get_delegates', {
            ...baseArgs,
            sortBy,
            pageSize: 5,
          });
          expect(result).toHaveProperty('content');
        }
      });

      test('sortOrder parameter', async () => {
        const validSortOrders = ['asc', 'desc'];
        
        for (const sortOrder of validSortOrders) {
          const result = await client.callTool('get_delegates', {
            ...baseArgs,
            sortOrder,
            pageSize: 5,
          });
          expect(result).toHaveProperty('content');
        }
      });
    });

    test('should reject invalid parameter values', async () => {
      const baseArgs = { organizationId: TEST_DATA.organizations.uniswap.id };
      
      // Invalid pageSize
      await expect(
        client.callTool('get_delegates', { ...baseArgs, pageSize: 0 })
      ).rejects.toThrow();
      
      // Invalid sortBy
      await expect(
        client.callTool('get_delegates', { ...baseArgs, sortBy: 'invalid' })
      ).rejects.toThrow();
      
      // Invalid sortOrder
      await expect(
        client.callTool('get_delegates', { ...baseArgs, sortOrder: 'invalid' })
      ).rejects.toThrow();
    });

    test('should work with all parameters combined', async () => {
      const result = await client.callTool('get_delegates', {
        organizationId: TEST_DATA.organizations.uniswap.id,
        pageSize: 10,
        sortBy: 'votes',
        sortOrder: 'desc',
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  // Edge cases and integration tests
  describe('Edge Cases and Integration Tests', () => {
    test('should handle very large page numbers gracefully', async () => {
      const result = await client.callTool('list_organizations', {
        page: 999999,
        pageSize: 1,
      });
      
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data.items)).toBe(true);
      // Should return empty array for pages beyond available data
    });

    test('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        client.callTool('list_organizations', { page: i + 1, pageSize: 5 })
      );
      
      const results = await Promise.all(promises);
      
      for (const result of results) {
        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }
    });

    test('should maintain data consistency across calls', async () => {
      // Get organizations list
      const listResult = await client.callTool('list_organizations', {
        pageSize: 3,
      });
      
      const listData = JSON.parse(listResult.content[0].text);
      
      if (listData.items.length > 0) {
        const org = listData.items[0];
        
        // Get specific organization details
        const detailResult = await client.callTool('get_organization', {
          organizationId: org.id,
        });
        
        const detailData = JSON.parse(detailResult.content[0].text);
        
        // Data should be consistent
        expect(detailData.id).toBe(org.id);
        expect(detailData.name).toBe(org.name);
        expect(detailData.slug).toBe(org.slug);
      }
    });
  });
}); 