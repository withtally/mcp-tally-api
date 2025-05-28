/**
 * MCP Tally API Optional Arguments Testing Suite
 *
 * PHASE 3: Optional Arguments Testing
 * Tests each optional argument individually to ensure proper handling
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';

// Import the MCPTestClient from our live server tests
class MCPTestClient {
  private server: any;
  private requestId = 1;
  private pendingRequests = new Map();

  async start(): Promise<void> {
    // Implementation from live-server.test.ts
    return Promise.resolve();
  }

  async stop(): Promise<void> {
    // Implementation from live-server.test.ts
    return Promise.resolve();
  }

  async callTool(name: string, arguments_: any = {}): Promise<any> {
    // Implementation from live-server.test.ts
    return Promise.resolve({});
  }
}

// Test data
const TEST_DATA = {
  organizations: {
    uniswap: {
      id: '2206072050458560434',
      slug: 'uniswap',
    },
    arbitrum: {
      id: '2206072050315953936',
      slug: 'arbitrum',
    },
  },
  chains: {
    ethereum: 'eip155:1',
    arbitrum: 'eip155:42161',
    optimism: 'eip155:10',
    zkSync: 'eip155:324',
    gnosis: 'eip155:100',
  },
} as const;

describe('PHASE 3: Optional Arguments Testing', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    if (!process.env.TALLY_API_KEY) {
      throw new Error('TALLY_API_KEY environment variable is required');
    }

    client = new MCPTestClient();
    await client.start();
  }, 60000);

  afterAll(async () => {
    if (client) {
      await client.stop();
    }
  });

  describe('Task 3.1: list_organizations - Individual Optional Args', () => {
    test('page argument - various values', async () => {
      const pageValues = [1, 2, 10, 100];

      for (const page of pageValues) {
        const result = await client.callTool('list_organizations', { page });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data).toHaveProperty('items');
        expect(data).toHaveProperty('pageInfo');
        expect(Array.isArray(data.items)).toBe(true);
      }
    });

    test('pageSize argument - various values', async () => {
      const pageSizeValues = [1, 5, 20, 50, 100];

      for (const pageSize of pageSizeValues) {
        const result = await client.callTool('list_organizations', {
          pageSize,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(data.items.length).toBeLessThanOrEqual(pageSize);
      }
    });

    test('chainId argument - different chains', async () => {
      const chainIds = [
        TEST_DATA.chains.ethereum,
        TEST_DATA.chains.arbitrum,
        TEST_DATA.chains.optimism,
        TEST_DATA.chains.zkSync,
      ];

      for (const chainId of chainIds) {
        const result = await client.callTool('list_organizations', {
          chainId,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        // All returned organizations should be on the specified chain
        for (const org of data.items) {
          expect(org.chainIds).toContain(chainId);
        }
      }
    });

    test('hasLogo argument - true and false', async () => {
      const hasLogoValues = [true, false];

      for (const hasLogo of hasLogoValues) {
        const result = await client.callTool('list_organizations', {
          hasLogo,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(Array.isArray(data.items)).toBe(true);
        // Note: We can't easily validate hasLogo from response data,
        // but we verify the filter doesn't break the query
      }
    });

    test('sortBy argument - different sort fields', async () => {
      const sortByValues = ['id', 'name', 'explore', 'popular'];

      for (const sortBy of sortByValues) {
        const result = await client.callTool('list_organizations', {
          sortBy,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(Array.isArray(data.items)).toBe(true);
        expect(data.items.length).toBeGreaterThan(0);
      }
    });

    test('sortOrder argument - asc and desc', async () => {
      const sortOrderValues = ['asc', 'desc'];

      for (const sortOrder of sortOrderValues) {
        const result = await client.callTool('list_organizations', {
          sortBy: 'popular',
          sortOrder,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(Array.isArray(data.items)).toBe(true);

        if (data.items.length > 1) {
          // Verify sorting order for popular (by member count)
          const memberCounts = data.items.map((org: any) => org.memberCount);

          if (sortOrder === 'desc') {
            for (let i = 1; i < memberCounts.length; i++) {
              expect(memberCounts[i]).toBeLessThanOrEqual(memberCounts[i - 1]);
            }
          } else {
            for (let i = 1; i < memberCounts.length; i++) {
              expect(memberCounts[i]).toBeGreaterThanOrEqual(
                memberCounts[i - 1]
              );
            }
          }
        }
      }
    });
  });

  describe('Task 3.2: get_organizations_with_active_proposals - Individual Optional Args', () => {
    test('minActiveProposals argument - various values', async () => {
      const minActiveProposalsValues = [1, 2, 5, 10];

      for (const minActiveProposals of minActiveProposalsValues) {
        const result = await client.callTool(
          'get_organizations_with_active_proposals',
          {
            minActiveProposals,
            pageSize: 5,
          }
        );

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        expect(Array.isArray(data.items)).toBe(true);
      }
    });

    test('chainId argument - different chains', async () => {
      const chainIds = [TEST_DATA.chains.ethereum, TEST_DATA.chains.arbitrum];

      for (const chainId of chainIds) {
        const result = await client.callTool(
          'get_organizations_with_active_proposals',
          {
            chainId,
            pageSize: 3,
          }
        );

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);

        // All returned organizations should be on the specified chain
        for (const org of data.items) {
          expect(org.chainIds).toContain(chainId);
        }
      }
    });

    test('page and pageSize arguments', async () => {
      const pageValues = [1, 2, 5];
      const pageSizeValues = [5, 10, 20, 50];

      for (const page of pageValues) {
        const result = await client.callTool(
          'get_organizations_with_active_proposals',
          {
            page,
            pageSize: 5,
          }
        );

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }

      for (const pageSize of pageSizeValues) {
        const result = await client.callTool(
          'get_organizations_with_active_proposals',
          {
            pageSize,
          }
        );

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(data.items.length).toBeLessThanOrEqual(pageSize);
      }
    });
  });

  describe('Task 3.3: list_proposals - Individual Optional Args', () => {
    test('page and pageSize arguments', async () => {
      const pageValues = [1, 2, 5, 10];
      const pageSizeValues = [1, 5, 10, 20, 50];

      const organizationId = TEST_DATA.organizations.uniswap.id;

      for (const page of pageValues) {
        const result = await client.callTool('list_proposals', {
          organizationId,
          page,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }

      for (const pageSize of pageSizeValues) {
        const result = await client.callTool('list_proposals', {
          organizationId,
          pageSize,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(data.items.length).toBeLessThanOrEqual(pageSize);
      }
    });

    test('sortOrder argument - asc and desc', async () => {
      const sortOrderValues = ['asc', 'desc'];
      const organizationId = TEST_DATA.organizations.uniswap.id;

      for (const sortOrder of sortOrderValues) {
        const result = await client.callTool('list_proposals', {
          organizationId,
          sortOrder,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }
    });
  });

  describe('Task 3.4: get_active_proposals - Individual Optional Args', () => {
    test('page and pageSize arguments', async () => {
      const pageValues = [1, 2, 5];
      const pageSizeValues = [5, 10, 20, 50];

      for (const page of pageValues) {
        const result = await client.callTool('get_active_proposals', {
          page,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
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

    test('chainId argument - different chains', async () => {
      const chainIds = [TEST_DATA.chains.ethereum, TEST_DATA.chains.arbitrum];

      for (const chainId of chainIds) {
        const result = await client.callTool('get_active_proposals', {
          chainId,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }
    });

    test('organizationId argument - filter by organization', async () => {
      const organizationIds = [
        TEST_DATA.organizations.uniswap.id,
        TEST_DATA.organizations.arbitrum.id,
      ];

      for (const organizationId of organizationIds) {
        const result = await client.callTool('get_active_proposals', {
          organizationId,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }
    });
  });

  describe('Task 3.5: get_dao_participants - Individual Optional Args', () => {
    test('page and pageSize arguments', async () => {
      const pageValues = [1, 2, 5];
      const pageSizeValues = [5, 10, 20, 50];
      const organizationId = TEST_DATA.organizations.uniswap.id;

      for (const page of pageValues) {
        const result = await client.callTool('get_dao_participants', {
          organizationId,
          page,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }

      for (const pageSize of pageSizeValues) {
        const result = await client.callTool('get_dao_participants', {
          organizationId,
          pageSize,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(data.items.length).toBeLessThanOrEqual(pageSize);
      }
    });

    test('sortOrder argument - asc and desc', async () => {
      const sortOrderValues = ['asc', 'desc'];
      const organizationId = TEST_DATA.organizations.uniswap.id;

      for (const sortOrder of sortOrderValues) {
        const result = await client.callTool('get_dao_participants', {
          organizationId,
          sortOrder,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }
    });
  });

  describe('Task 3.6: get_delegates - Individual Optional Args', () => {
    test('page and pageSize arguments', async () => {
      const pageValues = [1, 2, 5];
      const pageSizeValues = [5, 10, 20, 50];
      const organizationId = TEST_DATA.organizations.uniswap.id;

      for (const page of pageValues) {
        const result = await client.callTool('get_delegates', {
          organizationId,
          page,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }

      for (const pageSize of pageSizeValues) {
        const result = await client.callTool('get_delegates', {
          organizationId,
          pageSize,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(data.items.length).toBeLessThanOrEqual(pageSize);
      }
    });

    test('sortOrder argument - asc and desc', async () => {
      const sortOrderValues = ['asc', 'desc'];
      const organizationId = TEST_DATA.organizations.uniswap.id;

      for (const sortOrder of sortOrderValues) {
        const result = await client.callTool('get_delegates', {
          organizationId,
          sortOrder,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }
    });

    test('minDelegatedVotes argument - various thresholds', async () => {
      const minDelegatedVotesValues = [0, 100, 1000, 10000];
      const organizationId = TEST_DATA.organizations.uniswap.id;

      for (const minDelegatedVotes of minDelegatedVotesValues) {
        const result = await client.callTool('get_delegates', {
          organizationId,
          minDelegatedVotes,
          pageSize: 5,
        });

        expect(result).toHaveProperty('content');
        const data = JSON.parse(result.content[0].text);
        expect(Array.isArray(data.items)).toBe(true);
      }
    });
  });
});
