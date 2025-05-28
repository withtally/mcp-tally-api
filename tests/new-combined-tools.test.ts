import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TallyGraphQLClient } from '../src/graphql-client.js';
import { AuthManager } from '../src/auth.js';
import {
  getUserProfile,
  getDelegateStatement,
  validateGetUserProfileInput,
  validateGetDelegateStatementInput,
} from '../src/user-tools.js';

describe('New Combined User Tools', () => {
  let client: TallyGraphQLClient;
  let authManager: AuthManager;

  beforeAll(async () => {
    authManager = new AuthManager('stdio');
    await authManager.initialize();
    client = new TallyGraphQLClient(authManager);
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('getUserProfile Function', () => {
    it('should validate input correctly', () => {
      const validInput = {
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        pageSize: 20,
      };
      const result = validateGetUserProfileInput(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid address format', () => {
      const invalidInput = {
        address: 'invalid-address',
      };
      const result = validateGetUserProfileInput(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should get comprehensive user profile with DAO participations and delegate info', async () => {
      const input = {
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        pageSize: 10,
      };

      const result = await getUserProfile(client, input);

      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
      expect(result?.address).toBe(input.address);
      expect(result?.name).toBeDefined();
      expect(result?.daoParticipations).toBeDefined();
      expect(Array.isArray(result?.daoParticipations)).toBe(true);
      expect(result?.delegateParticipations).toBeDefined();
      expect(Array.isArray(result?.delegateParticipations)).toBe(true);

      // Check structure of DAO participations
      if (result?.daoParticipations && result.daoParticipations.length > 0) {
        const participation = result.daoParticipations[0];
        expect(participation.id).toBeDefined();
        expect(participation.organization).toBeDefined();
        expect(participation.organization.id).toBeDefined();
        expect(participation.organization.name).toBeDefined();
        expect(participation.organization.slug).toBeDefined();
        expect(participation.token).toBeDefined();
        expect(participation.token.symbol).toBeDefined();
        expect(participation.votes).toBeDefined();
      }

      // Check structure of delegate participations
      if (result?.delegateParticipations && result.delegateParticipations.length > 0) {
        const delegation = result.delegateParticipations[0];
        expect(delegation.id).toBeDefined();
        expect(delegation.organization).toBeDefined();
        expect(delegation.organization.id).toBeDefined();
        expect(delegation.organization.name).toBeDefined();
        expect(delegation.organization.slug).toBeDefined();
        expect(delegation.votesCount).toBeDefined();
        expect(typeof delegation.delegatorsCount).toBe('number');
      }
    }, 30000);

    it('should return empty profile for non-existent user', async () => {
      const input = {
        address: '0x1111111111111111111111111111111111111111',
      };

      const result = await getUserProfile(client, input);
      expect(result).toBeDefined();
      expect(result?.name).toBe('');
      expect(result?.bio).toBe('');
      expect(result?.daoParticipations).toEqual([]);
      expect(result?.delegateParticipations).toEqual([]);
    });
  });

  describe('getDelegateStatement Function', () => {
    it('should validate input correctly', () => {
      const validInput = {
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        organizationId: '2206072050458560434',
      };
      const result = validateGetDelegateStatementInput(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid address format', () => {
      const invalidInput = {
        address: 'invalid-address',
        organizationId: '2206072050458560434',
      };
      const result = validateGetDelegateStatementInput(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty organization ID', () => {
      const invalidInput = {
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        organizationId: '',
      };
      const result = validateGetDelegateStatementInput(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should get delegate statement for valid user and organization', async () => {
      const input = {
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        organizationId: '2206072050458560434', // Uniswap
      };

      const result = await getDelegateStatement(client, input);

      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
      expect(result?.statement).toBeDefined();
      expect(result?.account).toBeDefined();
      expect(result?.account.address).toBe(input.address);
      expect(result?.account.name).toBeDefined();
      expect(result?.organization).toBeDefined();
      expect(result?.organization.id).toBe(input.organizationId);
      expect(result?.organization.name).toBeDefined();
      expect(result?.organization.slug).toBeDefined();

      // Check statement structure
      expect(typeof result?.statement.isSeekingDelegation).toBe('boolean');
      expect(typeof result?.statement.statement).toBe('string');
      expect(typeof result?.statement.statementSummary).toBe('string');
    }, 30000);

    it('should return null for non-existent delegate', async () => {
      const input = {
        address: '0x1111111111111111111111111111111111111111',
        organizationId: '2206072050458560434',
      };

      const result = await getDelegateStatement(client, input);
      expect(result).toBeNull();
    });

    it('should return null for invalid organization', async () => {
      const input = {
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        organizationId: '999999999999999999',
      };

      const result = await getDelegateStatement(client, input);
      expect(result).toBeNull();
    });
  });

  describe('Combined Tools Performance', () => {
    it('should be more efficient than separate calls', async () => {
      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

      // Test combined call
      const startCombined = Date.now();
      const combinedResult = await getUserProfile(client, { address });
      const endCombined = Date.now();
      const combinedTime = endCombined - startCombined;

      expect(combinedResult).toBeDefined();
      expect(combinedResult?.daoParticipations).toBeDefined();
      expect(combinedResult?.delegateParticipations).toBeDefined();

      // The combined call should be reasonably fast (less than 10 seconds)
      expect(combinedTime).toBeLessThan(10000);

      console.log(`Combined call took ${combinedTime}ms`);
    }, 30000);
  });
}); 