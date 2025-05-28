import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  getUserDAOs,
  getDAOParticipants,
  getUserDetails,
  getDelegates,
  GetUserDAOsInput,
  GetDAOParticipantsInput,
  GetUserDetailsInput,
  GetDelegatesInput,
  UserDAOParticipation,
  DAOParticipant,
  UserDetails,
  DelegateInfo,
  PaginatedDAOParticipants,
  PaginatedDelegates,
  validateGetUserDAOsInput,
  validateGetDAOParticipantsInput,
  validateGetUserDetailsInput,
  validateGetDelegatesInput,
} from '../src/user-tools';
import { TallyGraphQLClient } from '../src/graphql-client';
import { AuthManager } from '../src/auth';
import { ValidationError } from '../src/errors';

// Mock fetch for testing
const originalFetch = global.fetch;

describe('User and Delegation Query Tools', () => {
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
    describe('GetUserDAOsInput', () => {
      it('should validate valid Ethereum address', () => {
        const input = { address: '0x1234567890123456789012345678901234567890' };
        const result = validateGetUserDAOsInput(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should reject invalid address formats', () => {
        const invalidInputs = [
          { address: '0x123' }, // Too short
          { address: '1234567890123456789012345678901234567890' }, // Missing 0x
          { address: '0xGGGG567890123456789012345678901234567890' }, // Invalid hex
          { address: '0x12345678901234567890123456789012345678901' }, // Too long
          { address: '' }, // Empty
          { address: '   ' }, // Whitespace
        ];

        invalidInputs.forEach((input) => {
          const result = validateGetUserDAOsInput(input);
          expect(result.success).toBe(false);
        });
      });

      it('should reject missing address', () => {
        const input = {};
        const result = validateGetUserDAOsInput(input);
        expect(result.success).toBe(false);
      });
    });

    describe('GetDAOParticipantsInput', () => {
      it('should validate valid input with organization ID', () => {
        const input = {
          organizationId: '2206072050315953922',
          page: 1,
          pageSize: 20,
          sortBy: 'votingPower',
          sortOrder: 'desc' as const,
        };
        const result = validateGetDAOParticipantsInput(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should validate valid input with organization slug', () => {
        const input = {
          organizationSlug: 'uniswap',
          page: 2,
          pageSize: 50,
        };
        const result = validateGetDAOParticipantsInput(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should reject input with both organization ID and slug', () => {
        const input = {
          organizationId: '123',
          organizationSlug: 'test',
          page: 1,
        };
        const result = validateGetDAOParticipantsInput(input);
        expect(result.success).toBe(false);
      });

      it('should reject input without organization identifier', () => {
        const input = { page: 1, pageSize: 20 };
        const result = validateGetDAOParticipantsInput(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid pagination parameters', () => {
        const invalidInputs = [
          { organizationId: '123', page: 0 },
          { organizationId: '123', page: -1 },
          { organizationId: '123', pageSize: 0 },
          { organizationId: '123', pageSize: 101 }, // Max is 100
        ];

        invalidInputs.forEach((input) => {
          const result = validateGetDAOParticipantsInput(input);
          expect(result.success).toBe(false);
        });
      });

      it('should accept valid sort fields and orders', () => {
        const validSortFields = [
          'votingPower',
          'delegatedVotes',
          'proposalsCreated',
          'joinedAt',
        ];
        const validSortOrders = ['asc', 'desc'];

        validSortFields.forEach((sortBy) => {
          validSortOrders.forEach((sortOrder) => {
            const result = validateGetDAOParticipantsInput({
              organizationId: '123',
              sortBy,
              sortOrder,
            });
            expect(result.success).toBe(true);
          });
        });
      });
    });

    describe('GetUserDetailsInput', () => {
      it('should validate valid address', () => {
        const input = { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' };
        const result = validateGetUserDetailsInput(input);
        expect(result.success).toBe(true);
      });

      it('should reject invalid addresses', () => {
        const invalidInputs = [
          { address: '0x123' },
          { address: 'invalid' },
          { address: '' },
          {},
        ];

        invalidInputs.forEach((input) => {
          const result = validateGetUserDetailsInput(input);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('GetDelegatesInput', () => {
      it('should validate valid input with organization ID', () => {
        const input = {
          organizationId: '123',
          page: 1,
          pageSize: 20,
          minDelegatedVotes: '1000000',
        };
        const result = validateGetDelegatesInput(input);
        expect(result.success).toBe(true);
      });

      it('should validate valid input with organization slug', () => {
        const input = {
          organizationSlug: 'compound',
          sortBy: 'delegatedVotes',
          sortOrder: 'desc' as const,
        };
        const result = validateGetDelegatesInput(input);
        expect(result.success).toBe(true);
      });

      it('should reject input with both organization identifiers', () => {
        const input = {
          organizationId: '123',
          organizationSlug: 'test',
        };
        const result = validateGetDelegatesInput(input);
        expect(result.success).toBe(false);
      });

      it('should reject input without organization identifier', () => {
        const input = { page: 1 };
        const result = validateGetDelegatesInput(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('getUserDAOs Function', () => {
    beforeEach(async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);
    });

    it('should get user DAO participations', async () => {
      const mockResponse = {
        data: {
          account: {
            id: '0x1234567890123456789012345678901234567890',
            organizations: [
              {
                id: '2206072050315953922',
                name: 'Uniswap',
                slug: 'uniswap',
                votingPower: '1500000000000000000000',
                delegationStatus: 'SELF_DELEGATED',
                joinedAt: '2023-01-15T10:00:00Z',
                proposalsCreated: 2,
                votesCount: 15,
              },
              {
                id: '2206072050315953923',
                name: 'Compound',
                slug: 'compound',
                votingPower: '500000000000000000000',
                delegationStatus: 'DELEGATED_TO_OTHERS',
                joinedAt: '2023-02-20T14:30:00Z',
                proposalsCreated: 0,
                votesCount: 8,
              },
            ],
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { address: '0x1234567890123456789012345678901234567890' };
      const result = await getUserDAOs(client, input);

      expect(result).toEqual(mockResponse.data.account.organizations);
      expect(fetchCallCount).toBe(1);
    });

    it('should handle user with no DAO participations', async () => {
      const mockResponse = {
        data: {
          account: {
            id: '0x1234567890123456789012345678901234567890',
            organizations: [],
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { address: '0x1234567890123456789012345678901234567890' };
      const result = await getUserDAOs(client, input);

      expect(result).toEqual([]);
    });

    it('should handle non-existent user', async () => {
      const mockResponse = {
        data: {
          account: null,
        },
      };

      mockFetchResponse(mockResponse);

      const input = { address: '0x9999999999999999999999999999999999999999' };
      const result = await getUserDAOs(client, input);

      expect(result).toBeNull();
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidInput = { address: 'invalid-address' };

      await expect(getUserDAOs(client, invalidInput)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('getDAOParticipants Function', () => {
    beforeEach(async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);
    });

    it('should get DAO participants with default parameters', async () => {
      const mockResponse = {
        data: {
          organization: {
            participants: {
              nodes: [
                {
                  id: '0x1111111111111111111111111111111111111111',
                  address: '0x1111111111111111111111111111111111111111',
                  name: 'Alice Voter',
                  votingPower: '2000000000000000000000',
                  delegatedVotes: '500000000000000000000',
                  proposalsCreated: 3,
                  votesCount: 25,
                  joinedAt: '2023-01-10T08:00:00Z',
                  delegationStatus: 'RECEIVING_DELEGATIONS',
                },
                {
                  id: '0x2222222222222222222222222222222222222222',
                  address: '0x2222222222222222222222222222222222222222',
                  name: 'Bob Delegate',
                  votingPower: '1000000000000000000000',
                  delegatedVotes: '0',
                  proposalsCreated: 1,
                  votesCount: 12,
                  joinedAt: '2023-02-05T12:30:00Z',
                  delegationStatus: 'SELF_DELEGATED',
                },
              ],
              pageInfo: {
                hasNextPage: true,
                hasPreviousPage: false,
                totalCount: 150,
              },
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { organizationId: '2206072050315953922' };
      const result = await getDAOParticipants(client, input);

      expect(result.participants).toEqual(
        mockResponse.data.organization.participants.nodes
      );
      expect(result.pagination.totalCount).toBe(150);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(fetchCallCount).toBe(1);
    });

    it('should get DAO participants by organization slug', async () => {
      const mockResponse = {
        data: {
          organization: {
            participants: {
              nodes: [
                {
                  id: '0x3333333333333333333333333333333333333333',
                  address: '0x3333333333333333333333333333333333333333',
                  name: 'Charlie Governance',
                  votingPower: '3000000000000000000000',
                  delegatedVotes: '1000000000000000000000',
                  proposalsCreated: 5,
                  votesCount: 40,
                  joinedAt: '2022-12-01T16:45:00Z',
                  delegationStatus: 'RECEIVING_DELEGATIONS',
                },
              ],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                totalCount: 1,
              },
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { organizationSlug: 'uniswap' };
      const result = await getDAOParticipants(client, input);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].name).toBe('Charlie Governance');
    });

    it('should handle pagination and sorting', async () => {
      const mockResponse = {
        data: {
          organization: {
            participants: {
              nodes: [
                {
                  id: '0x4444444444444444444444444444444444444444',
                  address: '0x4444444444444444444444444444444444444444',
                  name: 'Top Voter',
                  votingPower: '5000000000000000000000',
                  delegatedVotes: '2000000000000000000000',
                  proposalsCreated: 8,
                  votesCount: 60,
                  joinedAt: '2022-11-15T09:20:00Z',
                  delegationStatus: 'RECEIVING_DELEGATIONS',
                },
              ],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: true,
                totalCount: 150,
              },
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = {
        organizationId: '123',
        page: 2,
        pageSize: 10,
        sortBy: 'votingPower',
        sortOrder: 'desc' as const,
      };
      const result = await getDAOParticipants(client, input);

      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidInput = { organizationId: '', page: -1 };

      await expect(getDAOParticipants(client, invalidInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle organization not found', async () => {
      const mockResponse = {
        data: {
          organization: null,
        },
      };

      mockFetchResponse(mockResponse);

      const input = { organizationId: 'nonexistent' };
      const result = await getDAOParticipants(client, input);

      expect(result).toBeNull();
    });
  });

  describe('getUserDetails Function', () => {
    beforeEach(async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);
    });

    it('should get comprehensive user details', async () => {
      const mockResponse = {
        data: {
          account: {
            id: '0x1234567890123456789012345678901234567890',
            address: '0x1234567890123456789012345678901234567890',
            name: 'Alice Governance Expert',
            bio: 'Passionate about decentralized governance',
            twitter: '@alice_gov',
            github: 'alice-governance',
            totalVotingPower: '5000000000000000000000',
            totalDelegatedVotes: '2000000000000000000000',
            totalProposalsCreated: 12,
            totalVotes: 85,
            organizationsCount: 5,
            createdAt: '2022-08-15T10:30:00Z',
            lastActiveAt: '2024-01-20T14:45:00Z',
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { address: '0x1234567890123456789012345678901234567890' };
      const result = await getUserDetails(client, input);

      expect(result).toEqual(mockResponse.data.account);
      expect(result?.name).toBe('Alice Governance Expert');
      expect(result?.totalProposalsCreated).toBe(12);
      expect(fetchCallCount).toBe(1);
    });

    it('should handle user not found', async () => {
      const mockResponse = {
        data: {
          account: null,
        },
      };

      mockFetchResponse(mockResponse);

      const input = { address: '0x9999999999999999999999999999999999999999' };
      const result = await getUserDetails(client, input);

      expect(result).toBeNull();
    });

    it('should throw ValidationError for invalid address', async () => {
      const invalidInput = { address: 'not-an-address' };

      await expect(getUserDetails(client, invalidInput)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('getDelegates Function', () => {
    beforeEach(async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);
    });

    it('should get delegates with default parameters', async () => {
      const mockResponse = {
        data: {
          organization: {
            delegates: {
              nodes: [
                {
                  id: '0x1111111111111111111111111111111111111111',
                  address: '0x1111111111111111111111111111111111111111',
                  name: 'Top Delegate',
                  delegatedVotes: '10000000000000000000000',
                  delegatorsCount: 25,
                  votingPower: '12000000000000000000000',
                  proposalsCreated: 8,
                  votesCount: 45,
                  delegationStatement: 'Committed to transparent governance',
                  joinedAt: '2022-10-01T12:00:00Z',
                },
                {
                  id: '0x2222222222222222222222222222222222222222',
                  address: '0x2222222222222222222222222222222222222222',
                  name: 'Active Delegate',
                  delegatedVotes: '5000000000000000000000',
                  delegatorsCount: 12,
                  votingPower: '6000000000000000000000',
                  proposalsCreated: 3,
                  votesCount: 28,
                  delegationStatement: 'Focus on protocol security',
                  joinedAt: '2023-01-15T09:30:00Z',
                },
              ],
              pageInfo: {
                hasNextPage: true,
                hasPreviousPage: false,
                totalCount: 50,
              },
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = { organizationId: '2206072050315953922' };
      const result = await getDelegates(client, input);

      expect(result.delegates).toEqual(
        mockResponse.data.organization.delegates.nodes
      );
      expect(result.pagination.totalCount).toBe(50);
      expect(result.delegates[0].delegatorsCount).toBe(25);
      expect(fetchCallCount).toBe(1);
    });

    it('should filter delegates by minimum delegated votes', async () => {
      const mockResponse = {
        data: {
          organization: {
            delegates: {
              nodes: [
                {
                  id: '0x3333333333333333333333333333333333333333',
                  address: '0x3333333333333333333333333333333333333333',
                  name: 'Major Delegate',
                  delegatedVotes: '20000000000000000000000',
                  delegatorsCount: 50,
                  votingPower: '22000000000000000000000',
                  proposalsCreated: 15,
                  votesCount: 80,
                  delegationStatement: 'Leading governance initiatives',
                  joinedAt: '2022-09-01T14:20:00Z',
                },
              ],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                totalCount: 1,
              },
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = {
        organizationSlug: 'compound',
        minDelegatedVotes: '15000000000000000000000',
      };
      const result = await getDelegates(client, input);

      expect(result.delegates).toHaveLength(1);
      expect(result.delegates[0].delegatedVotes).toBe(
        '20000000000000000000000'
      );
    });

    it('should handle sorting and pagination', async () => {
      const mockResponse = {
        data: {
          organization: {
            delegates: {
              nodes: [
                {
                  id: '0x4444444444444444444444444444444444444444',
                  address: '0x4444444444444444444444444444444444444444',
                  name: 'Newest Delegate',
                  delegatedVotes: '1000000000000000000000',
                  delegatorsCount: 3,
                  votingPower: '1200000000000000000000',
                  proposalsCreated: 1,
                  votesCount: 5,
                  delegationStatement: 'New to governance',
                  joinedAt: '2024-01-01T10:00:00Z',
                },
              ],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: true,
                totalCount: 50,
              },
            },
          },
        },
      };

      mockFetchResponse(mockResponse);

      const input = {
        organizationId: '123',
        page: 3,
        pageSize: 5,
        sortBy: 'joinedAt',
        sortOrder: 'desc' as const,
      };
      const result = await getDelegates(client, input);

      expect(result.pagination.currentPage).toBe(3);
      expect(result.pagination.pageSize).toBe(5);
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidInput = { organizationId: '', minDelegatedVotes: 'invalid' };

      await expect(getDelegates(client, invalidInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle organization not found', async () => {
      const mockResponse = {
        data: {
          organization: null,
        },
      };

      mockFetchResponse(mockResponse);

      const input = { organizationId: 'nonexistent' };
      const result = await getDelegates(client, input);

      expect(result).toBeNull();
    });
  });

  describe('Type Definitions', () => {
    it('should define UserDAOParticipation type correctly', () => {
      const participation: UserDAOParticipation = {
        id: '123',
        name: 'Test DAO',
        slug: 'test-dao',
        votingPower: '1000000000000000000000',
        delegationStatus: 'SELF_DELEGATED',
        joinedAt: '2023-01-01T00:00:00Z',
        proposalsCreated: 2,
        votesCount: 10,
      };

      expect(participation.id).toBe('123');
      expect(participation.delegationStatus).toBe('SELF_DELEGATED');
    });

    it('should define DAOParticipant type correctly', () => {
      const participant: DAOParticipant = {
        id: '0x1234567890123456789012345678901234567890',
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test User',
        votingPower: '1000000000000000000000',
        delegatedVotes: '500000000000000000000',
        proposalsCreated: 3,
        votesCount: 15,
        joinedAt: '2023-01-01T00:00:00Z',
        delegationStatus: 'RECEIVING_DELEGATIONS',
      };

      expect(participant.address).toBe(
        '0x1234567890123456789012345678901234567890'
      );
      expect(participant.delegationStatus).toBe('RECEIVING_DELEGATIONS');
    });

    it('should define UserDetails type correctly', () => {
      const details: UserDetails = {
        id: '0x1234567890123456789012345678901234567890',
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test User',
        bio: 'Test bio',
        twitter: '@test',
        github: 'test',
        totalVotingPower: '5000000000000000000000',
        totalDelegatedVotes: '2000000000000000000000',
        totalProposalsCreated: 10,
        totalVotes: 50,
        organizationsCount: 3,
        createdAt: '2022-01-01T00:00:00Z',
        lastActiveAt: '2024-01-01T00:00:00Z',
      };

      expect(details.totalProposalsCreated).toBe(10);
      expect(details.organizationsCount).toBe(3);
    });

    it('should define DelegateInfo type correctly', () => {
      const delegate: DelegateInfo = {
        id: '0x1234567890123456789012345678901234567890',
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Delegate',
        delegatedVotes: '10000000000000000000000',
        delegatorsCount: 25,
        votingPower: '12000000000000000000000',
        proposalsCreated: 8,
        votesCount: 45,
        delegationStatement: 'Test statement',
        joinedAt: '2022-01-01T00:00:00Z',
      };

      expect(delegate.delegatorsCount).toBe(25);
      expect(delegate.delegationStatement).toBe('Test statement');
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
        getUserDAOs(client, {
          address: '0x1234567890123456789012345678901234567890',
        })
      ).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = () => {
        fetchCallCount++;
        return Promise.reject(new Error('Network error'));
      };

      await expect(
        getUserDAOs(client, {
          address: '0x1234567890123456789012345678901234567890',
        })
      ).rejects.toThrow();
    });
  });
});
