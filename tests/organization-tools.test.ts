import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  listOrganizations,
  getOrganization,
  getOrganizationsWithActiveProposals,
  ListOrganizationsInput,
  GetOrganizationInput,
  GetOrganizationsWithActiveProposalsInput,
  OrganizationSummary,
  OrganizationDetails,
  OrganizationWithActiveProposals,
  PaginatedOrganizations,
  validateListOrganizationsInput,
  validateGetOrganizationInput,
  validateGetOrganizationsWithActiveProposalsInput,
} from '../src/organization-tools';
import { TallyGraphQLClient } from '../src/graphql-client';
import { AuthManager } from '../src/auth';
import { ValidationError } from '../src/errors';

// Mock fetch for testing
const originalFetch = global.fetch;

describe('Organization Management Tools', () => {
  let authManager: AuthManager;
  let client: TallyGraphQLClient;
  let fetchCallCount: number;

  beforeEach(() => {
    // Set up auth manager with test API key
    process.env.TALLY_API_KEY = 'test-api-key-123';
    authManager = new AuthManager('stdio');
    fetchCallCount = 0;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    delete process.env.TALLY_API_KEY;
    fetchCallCount = 0;
  });

  const mockFetchResponse = (response: any) => {
    global.fetch = () => {
      fetchCallCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
      });
    };
  };

  describe('Input Validation Schemas', () => {
    describe('ListOrganizationsInput', () => {
      it('should validate valid input with all optional fields', () => {
        const input = {
          page: 1,
          pageSize: 20,
          filter: 'uniswap',
          sortBy: 'name',
          sortOrder: 'asc' as const,
        };

        const result = validateListOrganizationsInput(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should validate input with only required fields (none)', () => {
        const input = {};

        const result = validateListOrganizationsInput(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({});
        }
      });

      it('should apply default values correctly', () => {
        const input = {};
        const validated = validateListOrganizationsInput(input);

        expect(validated.success).toBe(true);
        // Defaults should be applied in the function, not schema
      });

      it('should reject invalid page numbers', () => {
        const inputs = [
          { page: 0 },
          { page: -1 },
          { page: 1.5 },
          { page: 'invalid' },
        ];

        inputs.forEach((input) => {
          const result = validateListOrganizationsInput(input);
          expect(result.success).toBe(false);
        });
      });

      it('should reject invalid page sizes', () => {
        const inputs = [
          { pageSize: 0 },
          { pageSize: -1 },
          { pageSize: 101 }, // Max is 100
          { pageSize: 1.5 },
        ];

        inputs.forEach((input) => {
          const result = validateListOrganizationsInput(input);
          expect(result.success).toBe(false);
        });
      });

      it('should reject invalid sort orders', () => {
        const input = { sortOrder: 'invalid' };
        const result = validateListOrganizationsInput(input);
        expect(result.success).toBe(false);
      });

      it('should accept valid sort fields', () => {
        const validSortFields = [
          'name',
          'createdAt',
          'proposalCount',
          'memberCount',
        ];

        validSortFields.forEach((sortBy) => {
          const result = validateListOrganizationsInput({ sortBy });
          expect(result.success).toBe(true);
        });
      });
    });

    describe('GetOrganizationInput', () => {
      it('should validate input with organization ID', () => {
        const input = { organizationId: '2206072050315953922' };
        const result = validateGetOrganizationInput(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should validate input with organization slug', () => {
        const input = { organizationSlug: 'uniswap' };
        const result = validateGetOrganizationInput(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should reject input with both ID and slug', () => {
        const input = {
          organizationId: '2206072050315953922',
          organizationSlug: 'uniswap',
        };
        const result = validateGetOrganizationInput(input);
        expect(result.success).toBe(false);
      });

      it('should reject input with neither ID nor slug', () => {
        const input = {};
        const result = validateGetOrganizationInput(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty strings', () => {
        const inputs = [
          { organizationId: '' },
          { organizationSlug: '' },
          { organizationId: '   ' },
          { organizationSlug: '   ' },
        ];

        inputs.forEach((input) => {
          const result = validateGetOrganizationInput(input);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('GetOrganizationsWithActiveProposalsInput', () => {
      it('should validate valid input with all fields', () => {
        const input = {
          page: 1,
          pageSize: 10,
          minActiveProposals: 1,
          chainId: '1',
        };

        const result = validateGetOrganizationsWithActiveProposalsInput(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should validate input with only optional fields', () => {
        const input = {};
        const result = validateGetOrganizationsWithActiveProposalsInput(input);
        expect(result.success).toBe(true);
      });

      it('should reject invalid minActiveProposals', () => {
        const inputs = [
          { minActiveProposals: -1 },
          { minActiveProposals: 0 },
          { minActiveProposals: 1.5 },
        ];

        inputs.forEach((input) => {
          const result =
            validateGetOrganizationsWithActiveProposalsInput(input);
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe('listOrganizations Function', () => {
    beforeEach(async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);
    });

    it('should list organizations with default parameters', async () => {
      const mockResponse = {
        data: {
          organizations: {
            nodes: [
              {
                id: '2206072050315953922',
                name: 'Uniswap',
                slug: 'uniswap',
                chainId: '1',
                description: 'Uniswap Governance',
                proposalStats: {
                  total: 42,
                  active: 2,
                },
                memberCount: 1500,
              },
              {
                id: '2206072050315953923',
                name: 'Compound',
                slug: 'compound',
                chainId: '1',
                description: 'Compound Governance',
                proposalStats: {
                  total: 156,
                  active: 1,
                },
                memberCount: 2300,
              },
            ],
            pageInfo: {
              hasNextPage: true,
              hasPreviousPage: false,
              totalCount: 250,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const result = await listOrganizations(client, {});

      expect(result).toEqual({
        organizations: mockResponse.data.organizations.nodes,
        pagination: {
          hasNextPage: true,
          hasPreviousPage: false,
          totalCount: 250,
          currentPage: 1,
          pageSize: 20,
        },
      });
      expect(fetchCallCount).toBe(1);
    });

    it('should list organizations with custom pagination', async () => {
      const mockResponse = {
        data: {
          organizations: {
            nodes: [
              {
                id: '2206072050315953922',
                name: 'Uniswap',
                slug: 'uniswap',
                chainId: '1',
                description: 'Uniswap Governance',
                proposalStats: {
                  total: 42,
                  active: 2,
                },
                memberCount: 1500,
              },
            ],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: true,
              totalCount: 250,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { page: 3, pageSize: 10 };
      const result = await listOrganizations(client, input);

      expect(result.pagination.currentPage).toBe(3);
      expect(result.pagination.pageSize).toBe(10);
      expect(fetchCallCount).toBe(1);
    });

    it('should list organizations with filter', async () => {
      const mockResponse = {
        data: {
          organizations: {
            nodes: [
              {
                id: '2206072050315953922',
                name: 'Uniswap',
                slug: 'uniswap',
                chainId: '1',
                description: 'Uniswap Governance',
                proposalStats: {
                  total: 42,
                  active: 2,
                },
                memberCount: 1500,
              },
            ],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              totalCount: 1,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { filter: 'uniswap' };
      const result = await listOrganizations(client, input);

      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0].name).toBe('Uniswap');
      expect(fetchCallCount).toBe(1);
    });

    it('should handle sorting parameters', async () => {
      const mockResponse = {
        data: {
          organizations: {
            nodes: [
              {
                id: '2206072050315953923',
                name: 'Compound',
                slug: 'compound',
                chainId: '1',
                description: 'Compound Governance',
                proposalStats: {
                  total: 156,
                  active: 1,
                },
                memberCount: 2300,
              },
              {
                id: '2206072050315953922',
                name: 'Uniswap',
                slug: 'uniswap',
                chainId: '1',
                description: 'Uniswap Governance',
                proposalStats: {
                  total: 42,
                  active: 2,
                },
                memberCount: 1500,
              },
            ],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              totalCount: 2,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { sortBy: 'name', sortOrder: 'asc' as const };
      const result = await listOrganizations(client, input);

      expect(result.organizations).toHaveLength(2);
      expect(fetchCallCount).toBe(1);
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidInput = { page: -1 };

      await expect(listOrganizations(client, invalidInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: {
          organizations: {
            nodes: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              totalCount: 0,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const result = await listOrganizations(client, {});

      expect(result.organizations).toHaveLength(0);
      expect(result.pagination.totalCount).toBe(0);
    });
  });

  describe('getOrganization Function', () => {
    beforeEach(async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);
    });

    it('should get organization by ID', async () => {
      const mockResponse = {
        data: {
          organization: {
            id: '2206072050315953922',
            name: 'Uniswap',
            slug: 'uniswap',
            chainId: '1',
            description: 'Uniswap Governance',
            website: 'https://uniswap.org',
            twitter: 'uniswap',
            github: 'Uniswap',
            proposalStats: {
              total: 42,
              active: 2,
              passed: 35,
              failed: 5,
            },
            memberCount: 1500,
            treasuryValue: '1000000000',
            createdAt: '2021-05-05T00:00:00Z',
            tokens: [
              {
                id: 'uni',
                name: 'Uniswap',
                symbol: 'UNI',
                decimals: 18,
              },
            ],
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { organizationId: '2206072050315953922' };
      const result = await getOrganization(client, input);

      expect(result).toEqual(mockResponse.data.organization);
      expect(fetchCallCount).toBe(1);
    });

    it('should get organization by slug', async () => {
      const mockResponse = {
        data: {
          organization: {
            id: '2206072050315953922',
            name: 'Uniswap',
            slug: 'uniswap',
            chainId: '1',
            description: 'Uniswap Governance',
            website: 'https://uniswap.org',
            twitter: 'uniswap',
            github: 'Uniswap',
            proposalStats: {
              total: 42,
              active: 2,
              passed: 35,
              failed: 5,
            },
            memberCount: 1500,
            treasuryValue: '1000000000',
            createdAt: '2021-05-05T00:00:00Z',
            tokens: [
              {
                id: 'uni',
                name: 'Uniswap',
                symbol: 'UNI',
                decimals: 18,
              },
            ],
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { organizationSlug: 'uniswap' };
      const result = await getOrganization(client, input);

      expect(result).toEqual(mockResponse.data.organization);
      expect(fetchCallCount).toBe(1);
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidInputs = [
        {},
        { organizationId: '' },
        { organizationSlug: '' },
        { organizationId: '123', organizationSlug: 'test' },
      ];

      for (const input of invalidInputs) {
        await expect(getOrganization(client, input)).rejects.toThrow(
          ValidationError
        );
      }
    });

    it('should handle organization not found', async () => {
      const mockResponse = {
        data: {
          organization: null,
        },
      };

      mockFetchResponse(mockResponse);

      const input = { organizationId: 'nonexistent' };
      const result = await getOrganization(client, input);

      expect(result).toBeNull();
    });
  });

  describe('getOrganizationsWithActiveProposals Function', () => {
    beforeEach(async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);
    });

    it('should get organizations with active proposals using defaults', async () => {
      const mockResponse = {
        data: {
          organizations: {
            nodes: [
              {
                id: '2206072050315953922',
                name: 'Uniswap',
                slug: 'uniswap',
                chainId: '1',
                description: 'Uniswap Governance',
                proposalStats: {
                  total: 42,
                  active: 2,
                },
                memberCount: 1500,
                activeProposals: [
                  {
                    id: 'prop1',
                    title: 'Proposal 1',
                    status: 'ACTIVE',
                    endTime: '2024-12-31T23:59:59Z',
                  },
                  {
                    id: 'prop2',
                    title: 'Proposal 2',
                    status: 'ACTIVE',
                    endTime: '2024-12-30T23:59:59Z',
                  },
                ],
              },
            ],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              totalCount: 1,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const result = await getOrganizationsWithActiveProposals(client, {});

      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0].activeProposals).toHaveLength(2);
      expect(fetchCallCount).toBe(1);
    });

    it('should filter by minimum active proposals', async () => {
      const mockResponse = {
        data: {
          organizations: {
            nodes: [
              {
                id: '2206072050315953922',
                name: 'Uniswap',
                slug: 'uniswap',
                chainId: '1',
                description: 'Uniswap Governance',
                proposalStats: {
                  total: 42,
                  active: 3,
                },
                memberCount: 1500,
                activeProposals: [
                  {
                    id: 'prop1',
                    title: 'Proposal 1',
                    status: 'ACTIVE',
                    endTime: '2024-12-31T23:59:59Z',
                  },
                  {
                    id: 'prop2',
                    title: 'Proposal 2',
                    status: 'ACTIVE',
                    endTime: '2024-12-30T23:59:59Z',
                  },
                  {
                    id: 'prop3',
                    title: 'Proposal 3',
                    status: 'ACTIVE',
                    endTime: '2024-12-29T23:59:59Z',
                  },
                ],
              },
            ],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              totalCount: 1,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { minActiveProposals: 3 };
      const result = await getOrganizationsWithActiveProposals(client, input);

      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0].activeProposals).toHaveLength(3);
    });

    it('should filter by chain ID', async () => {
      const mockResponse = {
        data: {
          organizations: {
            nodes: [
              {
                id: '2206072050315953922',
                name: 'Polygon DAO',
                slug: 'polygon',
                chainId: '137',
                description: 'Polygon Governance',
                proposalStats: {
                  total: 15,
                  active: 1,
                },
                memberCount: 800,
                activeProposals: [
                  {
                    id: 'prop1',
                    title: 'Polygon Proposal 1',
                    status: 'ACTIVE',
                    endTime: '2024-12-31T23:59:59Z',
                  },
                ],
              },
            ],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              totalCount: 1,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { chainId: '137' };
      const result = await getOrganizationsWithActiveProposals(client, input);

      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0].chainId).toBe('137');
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidInput = { minActiveProposals: -1 };

      await expect(
        getOrganizationsWithActiveProposals(client, invalidInput)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: {
          organizations: {
            nodes: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              totalCount: 0,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const result = await getOrganizationsWithActiveProposals(client, {});

      expect(result.organizations).toHaveLength(0);
      expect(result.pagination.totalCount).toBe(0);
    });
  });

  describe('Type Definitions', () => {
    it('should define OrganizationSummary type correctly', () => {
      const org: OrganizationSummary = {
        id: '123',
        name: 'Test DAO',
        slug: 'test-dao',
        chainId: '1',
        description: 'Test Description',
        proposalStats: {
          total: 10,
          active: 2,
        },
        memberCount: 100,
      };

      expect(org.id).toBe('123');
      expect(org.name).toBe('Test DAO');
    });

    it('should define OrganizationDetails type correctly', () => {
      const org: OrganizationDetails = {
        id: '123',
        name: 'Test DAO',
        slug: 'test-dao',
        chainId: '1',
        description: 'Test Description',
        website: 'https://test.com',
        twitter: 'testdao',
        github: 'testdao',
        proposalStats: {
          total: 10,
          active: 2,
          passed: 7,
          failed: 1,
        },
        memberCount: 100,
        treasuryValue: '1000000',
        createdAt: '2021-01-01T00:00:00Z',
        tokens: [
          {
            id: 'test',
            name: 'Test Token',
            symbol: 'TEST',
            decimals: 18,
          },
        ],
      };

      expect(org.tokens).toHaveLength(1);
      expect(org.proposalStats.passed).toBe(7);
    });

    it('should define PaginatedOrganizations type correctly', () => {
      const result: PaginatedOrganizations = {
        organizations: [],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          totalCount: 0,
          currentPage: 1,
          pageSize: 20,
        },
      };

      expect(result.pagination.currentPage).toBe(1);
      expect(result.organizations).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);
    });

    it('should handle GraphQL errors gracefully', async () => {
      global.fetch = () => {
        fetchCallCount++;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              errors: [{ message: 'GraphQL error occurred' }],
            }),
        });
      };

      await expect(listOrganizations(client, {})).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = () => {
        fetchCallCount++;
        return Promise.reject(new Error('Network error'));
      };

      await expect(listOrganizations(client, {})).rejects.toThrow();
    });
  });
});
