import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  listProposals,
  getProposal,
  getActiveProposals,
  ListProposalsInput,
  GetProposalInput,
  GetActiveProposalsInput,
  ProposalSummary,
  ProposalDetails,
  PaginatedProposals,
  VotingStats,
  ExecutionDetails,
  validateListProposalsInput,
  validateGetProposalInput,
  validateGetActiveProposalsInput,
} from '../src/proposal-tools';
import { TallyGraphQLClient } from '../src/graphql-client';
import { AuthManager } from '../src/auth';
import { ValidationError } from '../src/errors';

// Mock fetch for testing
const originalFetch = global.fetch;

describe('Proposal Operations Tools', () => {
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
    describe('ListProposalsInput', () => {
      it('should validate valid input with all optional fields', () => {
        const input = {
          organizationId: '2206072050315953922',
          page: 1,
          pageSize: 20,
          status: 'ACTIVE',
          sortBy: 'createdAt',
          sortOrder: 'desc' as const,
        };

        const result = validateListProposalsInput(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should validate input with only required organizationId', () => {
        const input = { organizationId: '2206072050315953922' };

        const result = validateListProposalsInput(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should reject input without organizationId', () => {
        const input = { page: 1, pageSize: 20 };
        const result = validateListProposalsInput(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid page numbers', () => {
        const inputs = [
          { organizationId: '123', page: 0 },
          { organizationId: '123', page: -1 },
          { organizationId: '123', page: 1.5 },
        ];

        inputs.forEach((input) => {
          const result = validateListProposalsInput(input);
          expect(result.success).toBe(false);
        });
      });

      it('should reject invalid page sizes', () => {
        const inputs = [
          { organizationId: '123', pageSize: 0 },
          { organizationId: '123', pageSize: -1 },
          { organizationId: '123', pageSize: 101 }, // Max is 100
          { organizationId: '123', pageSize: 1.5 },
        ];

        inputs.forEach((input) => {
          const result = validateListProposalsInput(input);
          expect(result.success).toBe(false);
        });
      });

      it('should accept valid proposal statuses', () => {
        const validStatuses = [
          'ACTIVE',
          'PASSED',
          'FAILED',
          'CANCELLED',
          'QUEUED',
          'EXECUTED',
        ];

        validStatuses.forEach((status) => {
          const result = validateListProposalsInput({
            organizationId: '123',
            status,
          });
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid proposal statuses', () => {
        const input = { organizationId: '123', status: 'INVALID_STATUS' };
        const result = validateListProposalsInput(input);
        expect(result.success).toBe(false);
      });

      it('should accept valid sort fields', () => {
        const validSortFields = ['createdAt', 'endTime', 'startTime', 'title'];

        validSortFields.forEach((sortBy) => {
          const result = validateListProposalsInput({
            organizationId: '123',
            sortBy,
          });
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid sort orders', () => {
        const input = { organizationId: '123', sortOrder: 'invalid' };
        const result = validateListProposalsInput(input);
        expect(result.success).toBe(false);
      });
    });

    describe('GetProposalInput', () => {
      it('should validate input with organization ID and proposal ID', () => {
        const input = {
          organizationId: '2206072050315953922',
          proposalId: 'proposal-123',
        };
        const result = validateGetProposalInput(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should validate input with organization slug and proposal ID', () => {
        const input = {
          organizationSlug: 'uniswap',
          proposalId: 'proposal-123',
        };
        const result = validateGetProposalInput(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should reject input with both organization ID and slug', () => {
        const input = {
          organizationId: '2206072050315953922',
          organizationSlug: 'uniswap',
          proposalId: 'proposal-123',
        };
        const result = validateGetProposalInput(input);
        expect(result.success).toBe(false);
      });

      it('should reject input without organization identifier', () => {
        const input = { proposalId: 'proposal-123' };
        const result = validateGetProposalInput(input);
        expect(result.success).toBe(false);
      });

      it('should reject input without proposal ID', () => {
        const input = { organizationId: '2206072050315953922' };
        const result = validateGetProposalInput(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty strings', () => {
        const inputs = [
          { organizationId: '', proposalId: 'prop-123' },
          { organizationSlug: '', proposalId: 'prop-123' },
          { organizationId: '123', proposalId: '' },
          { organizationId: '   ', proposalId: 'prop-123' },
          { organizationSlug: '   ', proposalId: 'prop-123' },
          { organizationId: '123', proposalId: '   ' },
        ];

        inputs.forEach((input) => {
          const result = validateGetProposalInput(input);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('GetActiveProposalsInput', () => {
      it('should validate valid input with all fields', () => {
        const input = {
          page: 1,
          pageSize: 10,
          chainId: '1',
          organizationId: '2206072050315953922',
        };

        const result = validateGetActiveProposalsInput(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should validate input with only optional fields', () => {
        const input = {};
        const result = validateGetActiveProposalsInput(input);
        expect(result.success).toBe(true);
      });

      it('should reject invalid page numbers', () => {
        const inputs = [{ page: 0 }, { page: -1 }, { page: 1.5 }];

        inputs.forEach((input) => {
          const result = validateGetActiveProposalsInput(input);
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
          const result = validateGetActiveProposalsInput(input);
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe('listProposals Function', () => {
    beforeEach(async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);
    });

    it('should list proposals with default parameters', async () => {
      const mockResponse = {
        data: {
          proposals: {
            nodes: [
              {
                id: 'proposal-1',
                title: 'Increase Treasury Allocation',
                description:
                  'Proposal to increase treasury allocation for development',
                status: 'ACTIVE',
                createdAt: '2024-01-15T10:00:00Z',
                startTime: '2024-01-16T00:00:00Z',
                endTime: '2024-01-23T00:00:00Z',
                proposer: {
                  id: 'proposer-1',
                  name: 'Alice Developer',
                },
                votingStats: {
                  quorum: '1000000',
                  yesVotes: '750000',
                  noVotes: '150000',
                  abstainVotes: '50000',
                },
              },
              {
                id: 'proposal-2',
                title: 'Update Governance Parameters',
                description:
                  'Proposal to update voting period and quorum requirements',
                status: 'PASSED',
                createdAt: '2024-01-10T10:00:00Z',
                startTime: '2024-01-11T00:00:00Z',
                endTime: '2024-01-18T00:00:00Z',
                proposer: {
                  id: 'proposer-2',
                  name: 'Bob Governance',
                },
                votingStats: {
                  quorum: '1000000',
                  yesVotes: '1200000',
                  noVotes: '300000',
                  abstainVotes: '100000',
                },
              },
            ],
            pageInfo: {
              hasNextPage: true,
              hasPreviousPage: false,
              totalCount: 50,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { organizationId: '2206072050315953922' };
      const result = await listProposals(client, input);

      expect(result).toEqual({
        proposals: mockResponse.data.proposals.nodes,
        pagination: {
          hasNextPage: true,
          hasPreviousPage: false,
          totalCount: 50,
          currentPage: 1,
          pageSize: 20,
        },
      });
      expect(fetchCallCount).toBe(1);
    });

    it('should list proposals with custom pagination', async () => {
      const mockResponse = {
        data: {
          proposals: {
            nodes: [
              {
                id: 'proposal-3',
                title: 'Test Proposal',
                description: 'Test description',
                status: 'ACTIVE',
                createdAt: '2024-01-15T10:00:00Z',
                startTime: '2024-01-16T00:00:00Z',
                endTime: '2024-01-23T00:00:00Z',
                proposer: {
                  id: 'proposer-1',
                  name: 'Test Proposer',
                },
                votingStats: {
                  quorum: '1000000',
                  yesVotes: '500000',
                  noVotes: '200000',
                  abstainVotes: '100000',
                },
              },
            ],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: true,
              totalCount: 50,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = {
        organizationId: '2206072050315953922',
        page: 3,
        pageSize: 10,
      };
      const result = await listProposals(client, input);

      expect(result.pagination.currentPage).toBe(3);
      expect(result.pagination.pageSize).toBe(10);
      expect(fetchCallCount).toBe(1);
    });

    it('should list proposals with status filter', async () => {
      const mockResponse = {
        data: {
          proposals: {
            nodes: [
              {
                id: 'proposal-1',
                title: 'Active Proposal',
                description: 'Currently active proposal',
                status: 'ACTIVE',
                createdAt: '2024-01-15T10:00:00Z',
                startTime: '2024-01-16T00:00:00Z',
                endTime: '2024-01-23T00:00:00Z',
                proposer: {
                  id: 'proposer-1',
                  name: 'Active Proposer',
                },
                votingStats: {
                  quorum: '1000000',
                  yesVotes: '500000',
                  noVotes: '200000',
                  abstainVotes: '100000',
                },
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

      const input = {
        organizationId: '2206072050315953922',
        status: 'ACTIVE',
      };
      const result = await listProposals(client, input);

      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0].status).toBe('ACTIVE');
      expect(fetchCallCount).toBe(1);
    });

    it('should handle sorting parameters', async () => {
      const mockResponse = {
        data: {
          proposals: {
            nodes: [
              {
                id: 'proposal-2',
                title: 'Newer Proposal',
                description: 'More recent proposal',
                status: 'ACTIVE',
                createdAt: '2024-01-20T10:00:00Z',
                startTime: '2024-01-21T00:00:00Z',
                endTime: '2024-01-28T00:00:00Z',
                proposer: {
                  id: 'proposer-2',
                  name: 'Recent Proposer',
                },
                votingStats: {
                  quorum: '1000000',
                  yesVotes: '600000',
                  noVotes: '300000',
                  abstainVotes: '50000',
                },
              },
              {
                id: 'proposal-1',
                title: 'Older Proposal',
                description: 'Earlier proposal',
                status: 'PASSED',
                createdAt: '2024-01-15T10:00:00Z',
                startTime: '2024-01-16T00:00:00Z',
                endTime: '2024-01-23T00:00:00Z',
                proposer: {
                  id: 'proposer-1',
                  name: 'Earlier Proposer',
                },
                votingStats: {
                  quorum: '1000000',
                  yesVotes: '800000',
                  noVotes: '100000',
                  abstainVotes: '50000',
                },
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

      const input = {
        organizationId: '2206072050315953922',
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };
      const result = await listProposals(client, input);

      expect(result.proposals).toHaveLength(2);
      expect(fetchCallCount).toBe(1);
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidInput = { organizationId: '', page: -1 };

      await expect(listProposals(client, invalidInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: {
          proposals: {
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

      const input = { organizationId: '2206072050315953922' };
      const result = await listProposals(client, input);

      expect(result.proposals).toHaveLength(0);
      expect(result.pagination.totalCount).toBe(0);
    });
  });

  describe('getProposal Function', () => {
    beforeEach(async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);
    });

    it('should get proposal by organization ID and proposal ID', async () => {
      const mockResponse = {
        data: {
          proposal: {
            id: 'proposal-1',
            title: 'Increase Treasury Allocation',
            description:
              'Detailed proposal to increase treasury allocation for development initiatives',
            status: 'ACTIVE',
            createdAt: '2024-01-15T10:00:00Z',
            startTime: '2024-01-16T00:00:00Z',
            endTime: '2024-01-23T00:00:00Z',
            proposer: {
              id: 'proposer-1',
              name: 'Alice Developer',
              address: '0x1234567890123456789012345678901234567890',
            },
            votingStats: {
              quorum: '1000000',
              yesVotes: '750000',
              noVotes: '150000',
              abstainVotes: '50000',
              totalVotes: '950000',
            },
            executionDetails: {
              status: 'PENDING',
              executedAt: null,
              transactionHash: null,
            },
            actions: [
              {
                id: 'action-1',
                target: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
                value: '0',
                signature: 'transfer(address,uint256)',
                calldata: '0x...',
              },
            ],
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = {
        organizationId: '2206072050315953922',
        proposalId: 'proposal-1',
      };
      const result = await getProposal(client, input);

      expect(result).toEqual(mockResponse.data.proposal);
      expect(fetchCallCount).toBe(1);
    });

    it('should get proposal by organization slug and proposal ID', async () => {
      const mockResponse = {
        data: {
          proposal: {
            id: 'proposal-1',
            title: 'Increase Treasury Allocation',
            description:
              'Detailed proposal to increase treasury allocation for development initiatives',
            status: 'ACTIVE',
            createdAt: '2024-01-15T10:00:00Z',
            startTime: '2024-01-16T00:00:00Z',
            endTime: '2024-01-23T00:00:00Z',
            proposer: {
              id: 'proposer-1',
              name: 'Alice Developer',
              address: '0x1234567890123456789012345678901234567890',
            },
            votingStats: {
              quorum: '1000000',
              yesVotes: '750000',
              noVotes: '150000',
              abstainVotes: '50000',
              totalVotes: '950000',
            },
            executionDetails: {
              status: 'PENDING',
              executedAt: null,
              transactionHash: null,
            },
            actions: [
              {
                id: 'action-1',
                target: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
                value: '0',
                signature: 'transfer(address,uint256)',
                calldata: '0x...',
              },
            ],
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = {
        organizationSlug: 'uniswap',
        proposalId: 'proposal-1',
      };
      const result = await getProposal(client, input);

      expect(result).toEqual(mockResponse.data.proposal);
      expect(fetchCallCount).toBe(1);
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidInputs = [
        {},
        { organizationId: '' },
        { proposalId: '' },
        {
          organizationId: '123',
          organizationSlug: 'test',
          proposalId: 'prop-1',
        },
        { organizationId: '123' }, // missing proposalId
        { proposalId: 'prop-1' }, // missing organization identifier
      ];

      for (const input of invalidInputs) {
        await expect(getProposal(client, input)).rejects.toThrow(
          ValidationError
        );
      }
    });

    it('should handle proposal not found', async () => {
      const mockResponse = {
        data: {
          proposal: null,
        },
      };

      mockFetchResponse(mockResponse);

      const input = {
        organizationId: '2206072050315953922',
        proposalId: 'nonexistent',
      };
      const result = await getProposal(client, input);

      expect(result).toBeNull();
    });
  });

  describe('getActiveProposals Function', () => {
    beforeEach(async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);
    });

    it('should get active proposals with default parameters', async () => {
      const mockResponse = {
        data: {
          proposals: {
            nodes: [
              {
                id: 'proposal-1',
                title: 'Active Proposal 1',
                description: 'First active proposal',
                status: 'ACTIVE',
                createdAt: '2024-01-15T10:00:00Z',
                startTime: '2024-01-16T00:00:00Z',
                endTime: '2024-01-23T00:00:00Z',
                proposer: {
                  id: 'proposer-1',
                  name: 'Active Proposer 1',
                },
                votingStats: {
                  quorum: '1000000',
                  yesVotes: '500000',
                  noVotes: '200000',
                  abstainVotes: '100000',
                },
                organization: {
                  id: '2206072050315953922',
                  name: 'Uniswap',
                  slug: 'uniswap',
                },
              },
              {
                id: 'proposal-2',
                title: 'Active Proposal 2',
                description: 'Second active proposal',
                status: 'ACTIVE',
                createdAt: '2024-01-20T10:00:00Z',
                startTime: '2024-01-21T00:00:00Z',
                endTime: '2024-01-28T00:00:00Z',
                proposer: {
                  id: 'proposer-2',
                  name: 'Active Proposer 2',
                },
                votingStats: {
                  quorum: '2000000',
                  yesVotes: '800000',
                  noVotes: '300000',
                  abstainVotes: '150000',
                },
                organization: {
                  id: '2206072050315953923',
                  name: 'Compound',
                  slug: 'compound',
                },
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

      const result = await getActiveProposals(client, {});

      expect(result.proposals).toHaveLength(2);
      expect(result.proposals[0].status).toBe('ACTIVE');
      expect(result.proposals[1].status).toBe('ACTIVE');
      expect(result.pagination.totalCount).toBe(2);
      expect(fetchCallCount).toBe(1);
    });

    it('should filter active proposals by chain ID', async () => {
      const mockResponse = {
        data: {
          proposals: {
            nodes: [
              {
                id: 'proposal-1',
                title: 'Polygon Active Proposal',
                description: 'Active proposal on Polygon',
                status: 'ACTIVE',
                createdAt: '2024-01-15T10:00:00Z',
                startTime: '2024-01-16T00:00:00Z',
                endTime: '2024-01-23T00:00:00Z',
                proposer: {
                  id: 'proposer-1',
                  name: 'Polygon Proposer',
                },
                votingStats: {
                  quorum: '500000',
                  yesVotes: '300000',
                  noVotes: '100000',
                  abstainVotes: '50000',
                },
                organization: {
                  id: '2206072050315953924',
                  name: 'Polygon DAO',
                  slug: 'polygon',
                },
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
      const result = await getActiveProposals(client, input);

      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0].organization.name).toBe('Polygon DAO');
    });

    it('should filter active proposals by organization ID', async () => {
      const mockResponse = {
        data: {
          proposals: {
            nodes: [
              {
                id: 'proposal-1',
                title: 'Uniswap Active Proposal',
                description: 'Active proposal for Uniswap',
                status: 'ACTIVE',
                createdAt: '2024-01-15T10:00:00Z',
                startTime: '2024-01-16T00:00:00Z',
                endTime: '2024-01-23T00:00:00Z',
                proposer: {
                  id: 'proposer-1',
                  name: 'Uniswap Proposer',
                },
                votingStats: {
                  quorum: '1000000',
                  yesVotes: '600000',
                  noVotes: '200000',
                  abstainVotes: '100000',
                },
                organization: {
                  id: '2206072050315953922',
                  name: 'Uniswap',
                  slug: 'uniswap',
                },
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

      const input = { organizationId: '2206072050315953922' };
      const result = await getActiveProposals(client, input);

      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0].organization.id).toBe('2206072050315953922');
    });

    it('should handle pagination for active proposals', async () => {
      const mockResponse = {
        data: {
          proposals: {
            nodes: [
              {
                id: 'proposal-3',
                title: 'Page 2 Active Proposal',
                description: 'Active proposal on page 2',
                status: 'ACTIVE',
                createdAt: '2024-01-15T10:00:00Z',
                startTime: '2024-01-16T00:00:00Z',
                endTime: '2024-01-23T00:00:00Z',
                proposer: {
                  id: 'proposer-3',
                  name: 'Page 2 Proposer',
                },
                votingStats: {
                  quorum: '1000000',
                  yesVotes: '400000',
                  noVotes: '150000',
                  abstainVotes: '75000',
                },
                organization: {
                  id: '2206072050315953922',
                  name: 'Uniswap',
                  slug: 'uniswap',
                },
              },
            ],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: true,
              totalCount: 15,
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { page: 2, pageSize: 10 };
      const result = await getActiveProposals(client, input);

      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidInput = { page: -1 };

      await expect(getActiveProposals(client, invalidInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: {
          proposals: {
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

      const result = await getActiveProposals(client, {});

      expect(result.proposals).toHaveLength(0);
      expect(result.pagination.totalCount).toBe(0);
    });
  });

  describe('Type Definitions', () => {
    it('should define ProposalSummary type correctly', () => {
      const proposal: ProposalSummary = {
        id: 'proposal-1',
        title: 'Test Proposal',
        description: 'Test Description',
        status: 'ACTIVE',
        createdAt: '2024-01-15T10:00:00Z',
        startTime: '2024-01-16T00:00:00Z',
        endTime: '2024-01-23T00:00:00Z',
        proposer: {
          id: 'proposer-1',
          name: 'Test Proposer',
        },
        votingStats: {
          quorum: '1000000',
          yesVotes: '500000',
          noVotes: '200000',
          abstainVotes: '100000',
        },
      };

      expect(proposal.id).toBe('proposal-1');
      expect(proposal.title).toBe('Test Proposal');
      expect(proposal.status).toBe('ACTIVE');
    });

    it('should define ProposalDetails type correctly', () => {
      const proposal: ProposalDetails = {
        id: 'proposal-1',
        title: 'Test Proposal',
        description: 'Test Description',
        status: 'ACTIVE',
        createdAt: '2024-01-15T10:00:00Z',
        startTime: '2024-01-16T00:00:00Z',
        endTime: '2024-01-23T00:00:00Z',
        proposer: {
          id: 'proposer-1',
          name: 'Test Proposer',
          address: '0x1234567890123456789012345678901234567890',
        },
        votingStats: {
          quorum: '1000000',
          yesVotes: '500000',
          noVotes: '200000',
          abstainVotes: '100000',
          totalVotes: '800000',
        },
        executionDetails: {
          status: 'PENDING',
          executedAt: null,
          transactionHash: null,
        },
        actions: [
          {
            id: 'action-1',
            target: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            value: '0',
            signature: 'transfer(address,uint256)',
            calldata: '0x...',
          },
        ],
      };

      expect(proposal.proposer.address).toBe(
        '0x1234567890123456789012345678901234567890'
      );
      expect(proposal.executionDetails.status).toBe('PENDING');
      expect(proposal.actions).toHaveLength(1);
    });

    it('should define VotingStats type correctly', () => {
      const stats: VotingStats = {
        quorum: '1000000',
        yesVotes: '500000',
        noVotes: '200000',
        abstainVotes: '100000',
      };

      expect(stats.quorum).toBe('1000000');
      expect(stats.yesVotes).toBe('500000');
    });

    it('should define ExecutionDetails type correctly', () => {
      const details: ExecutionDetails = {
        status: 'EXECUTED',
        executedAt: '2024-01-25T10:00:00Z',
        transactionHash:
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      };

      expect(details.status).toBe('EXECUTED');
      expect(details.executedAt).toBe('2024-01-25T10:00:00Z');
    });

    it('should define PaginatedProposals type correctly', () => {
      const result: PaginatedProposals = {
        proposals: [],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          totalCount: 0,
          currentPage: 1,
          pageSize: 20,
        },
      };

      expect(result.pagination.currentPage).toBe(1);
      expect(result.proposals).toHaveLength(0);
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

      await expect(
        listProposals(client, { organizationId: '123' })
      ).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = () => {
        fetchCallCount++;
        return Promise.reject(new Error('Network error'));
      };

      await expect(
        listProposals(client, { organizationId: '123' })
      ).rejects.toThrow();
    });
  });
});
