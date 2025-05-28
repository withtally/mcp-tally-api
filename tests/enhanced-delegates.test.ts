import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TallyGraphQLClient } from '../src/graphql-client.js';
import { AuthManager } from '../src/auth.js';
import {
  getDelegates,
  validateGetDelegatesInput,
} from '../src/user-tools.js';

describe('Enhanced Delegates Functionality', () => {
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

  describe('getDelegates Enhanced Function', () => {
    it('should validate input correctly', () => {
      const validInput = {
        organizationId: '2206072050458560434',
        pageSize: 5,
        sortBy: 'votes',
        sortOrder: 'desc',
      };
      const result = validateGetDelegatesInput(validInput);
      expect(result.success).toBe(true);
    });

    it('should get enhanced delegate information with voting power and account details', async () => {
      const input = {
        organizationId: '2206072050458560434', // Uniswap
        pageSize: 3,
        sortBy: 'votes' as any,
        sortOrder: 'desc' as any,
      };

      const result = await getDelegates(client, input);

      expect(result).toBeDefined();
      expect(result?.items).toBeDefined();
      expect(Array.isArray(result?.items)).toBe(true);
      expect(result?.totalCount).toBeDefined();
      expect(typeof result?.totalCount).toBe('number');

      // Check enhanced delegate structure
      if (result?.items && result.items.length > 0) {
        const delegate = result.items[0];
        
        // Basic delegate info
        expect(delegate.id).toBeDefined();
        expect(typeof delegate.delegatorsCount).toBe('number');
        expect(delegate.votesCount).toBeDefined();
        expect(typeof delegate.isPrioritized).toBe('boolean');

        // Account details
        expect(delegate.account).toBeDefined();
        expect(delegate.account.id).toBeDefined();
        expect(delegate.account.address).toBeDefined();
        expect(delegate.account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(delegate.account.name).toBeDefined();
        expect(delegate.account.type).toBeDefined();
        
        // Statement (may be empty but should exist)
        expect(delegate.statement).toBeDefined();
        expect(typeof delegate.statement?.isSeekingDelegation).toBe('boolean');
        expect(typeof delegate.statement?.statement).toBe('string');
        expect(typeof delegate.statement?.statementSummary).toBe('string');

        // Organization info
        expect(delegate.organization).toBeDefined();
        expect(delegate.organization.id).toBe(input.organizationId);
        expect(delegate.organization.name).toBe('Uniswap');
        expect(delegate.organization.slug).toBe('uniswap');

        // Token info
        expect(delegate.token).toBeDefined();
        expect(delegate.token.id).toBeDefined();
        expect(delegate.token.symbol).toBe('UNI');
        expect(delegate.token.name).toBe('Uniswap');
      }
    }, 30000);

    it('should sort delegates by voting power correctly', async () => {
      const input = {
        organizationId: '2206072050458560434', // Uniswap
        pageSize: 5,
        sortBy: 'votes' as any,
        sortOrder: 'desc' as any,
      };

      const result = await getDelegates(client, input);

      expect(result).toBeDefined();
      expect(result?.items).toBeDefined();
      
      if (result?.items && result.items.length > 1) {
        // Check that delegates are sorted by voting power (descending)
        for (let i = 0; i < result.items.length - 1; i++) {
          const currentVotes = BigInt(result.items[i].votesCount);
          const nextVotes = BigInt(result.items[i + 1].votesCount);
          expect(currentVotes >= nextVotes).toBe(true);
        }
      }
    }, 30000);

    it('should include delegate with rich profile information', async () => {
      const input = {
        organizationId: '2206072050458560434', // Uniswap
        pageSize: 10,
        sortBy: 'votes' as any,
        sortOrder: 'desc' as any,
      };

      const result = await getDelegates(client, input);

      expect(result).toBeDefined();
      expect(result?.items).toBeDefined();
      
      // Look for a delegate with rich profile information
      const delegateWithProfile = result?.items?.find(delegate => 
        delegate.account.name || 
        delegate.account.ens || 
        delegate.account.picture ||
        delegate.statement?.statement
      );

      if (delegateWithProfile) {
        console.log('Found delegate with rich profile:', {
          name: delegateWithProfile.account.name,
          ens: delegateWithProfile.account.ens,
          hasStatement: !!delegateWithProfile.statement?.statement,
          hasPicture: !!delegateWithProfile.account.picture,
          votesCount: delegateWithProfile.votesCount,
          delegatorsCount: delegateWithProfile.delegatorsCount,
        });

        // Verify the structure is complete
        expect(delegateWithProfile.account).toBeDefined();
        expect(delegateWithProfile.statement).toBeDefined();
        expect(delegateWithProfile.organization).toBeDefined();
        expect(delegateWithProfile.token).toBeDefined();
      }
    }, 30000);

    it('should handle different sort options', async () => {
      const inputByDelegators = {
        organizationId: '2206072050458560434',
        pageSize: 3,
        sortBy: 'delegators' as any,
        sortOrder: 'desc' as any,
      };

      const result = await getDelegates(client, inputByDelegators);

      expect(result).toBeDefined();
      expect(result?.items).toBeDefined();
      
      if (result?.items && result.items.length > 1) {
        // Check that delegates are sorted by delegator count (descending)
        for (let i = 0; i < result.items.length - 1; i++) {
          const currentDelegators = result.items[i].delegatorsCount;
          const nextDelegators = result.items[i + 1].delegatorsCount;
          expect(currentDelegators >= nextDelegators).toBe(true);
        }
      }
    }, 30000);
  });
}); 