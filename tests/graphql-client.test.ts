import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  TallyGraphQLClient,
  GraphQLClientError,
  GraphQLNetworkError,
  GraphQLValidationError,
  QueryCache,
  CacheEntry,
  createTallyClient,
} from '../src/graphql-client';
import { AuthManager } from '../src/auth';
import { AuthenticationError } from '../src/errors';

// Mock fetch for testing
const originalFetch = global.fetch;

describe('Tally GraphQL Client', () => {
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
      return Promise.resolve(response);
    };
  };

  const mockFetchError = (error: any) => {
    global.fetch = () => {
      fetchCallCount++;
      return Promise.reject(error);
    };
  };

  describe('TallyGraphQLClient Class', () => {
    describe('Client Initialization', () => {
      it('should create client with AuthManager', async () => {
        await authManager.initialize();
        client = new TallyGraphQLClient(authManager);

        expect(client).toBeInstanceOf(TallyGraphQLClient);
        expect(client.getEndpoint()).toBe('https://api.tally.xyz/query');
      });

      it('should create client with custom endpoint', async () => {
        await authManager.initialize();
        client = new TallyGraphQLClient(authManager, {
          endpoint: 'https://custom.api.endpoint/graphql',
        });

        expect(client.getEndpoint()).toBe(
          'https://custom.api.endpoint/graphql'
        );
      });

      it('should create client with caching enabled by default', async () => {
        await authManager.initialize();
        client = new TallyGraphQLClient(authManager);

        expect(client.isCachingEnabled()).toBe(true);
      });

      it('should create client with caching disabled when specified', async () => {
        await authManager.initialize();
        client = new TallyGraphQLClient(authManager, {
          enableCache: false,
        });

        expect(client.isCachingEnabled()).toBe(false);
      });

      it('should throw error when AuthManager is not initialized', () => {
        const uninitializedAuthManager = new AuthManager('stdio');

        expect(() => new TallyGraphQLClient(uninitializedAuthManager)).toThrow(
          AuthenticationError
        );
      });

      it('should set correct headers with API key', async () => {
        await authManager.initialize();
        client = new TallyGraphQLClient(authManager);

        const headers = client.getHeaders();
        expect(headers['Api-Key']).toBe('test-api-key-123');
        expect(headers['Content-Type']).toBe('application/json');
      });
    });

    describe('Query Execution', () => {
      beforeEach(async () => {
        await authManager.initialize();
        client = new TallyGraphQLClient(authManager);
      });

      it('should execute simple GraphQL query successfully', async () => {
        const mockResponse = {
          data: { organizations: [{ id: '1', name: 'Test DAO' }] },
        };

        mockFetchResponse({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const query = `
          query {
            organizations {
              id
              name
            }
          }
        `;

        const result = await client.query(query);

        expect(result).toEqual(mockResponse.data);
        expect(fetchCallCount).toBe(1);
      });

      it('should execute GraphQL query with variables', async () => {
        const mockResponse = {
          data: { organization: { id: '1', name: 'Test DAO' } },
        };

        mockFetchResponse({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const query = `
          query GetOrganization($id: ID!) {
            organization(id: $id) {
              id
              name
            }
          }
        `;
        const variables = { id: '1' };

        const result = await client.query(query, variables);

        expect(result).toEqual(mockResponse.data);
        expect(fetchCallCount).toBe(1);
      });

      it('should handle GraphQL errors in response', async () => {
        const mockResponse = {
          errors: [
            { message: 'Field "invalid" doesn\'t exist on type "Query"' },
          ],
        };

        mockFetchResponse({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const query = `query { invalid }`;

        await expect(client.query(query)).rejects.toThrow(GraphQLClientError);
      });

      it('should handle network errors', async () => {
        mockFetchError(new Error('Network error'));

        const query = `query { organizations { id } }`;

        await expect(client.query(query)).rejects.toThrow(GraphQLNetworkError);
      });

      it('should handle HTTP error responses', async () => {
        mockFetchResponse({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: () => Promise.resolve('Invalid API key'),
        });

        const query = `query { organizations { id } }`;

        await expect(client.query(query)).rejects.toThrow(GraphQLNetworkError);
      });
    });

    describe('Query Validation', () => {
      beforeEach(async () => {
        await authManager.initialize();
        client = new TallyGraphQLClient(authManager);
      });

      it('should validate GraphQL query syntax', () => {
        const validQuery = `query { organizations { id name } }`;
        const invalidQuery = `query { organizations { id name `;

        expect(client.validateQuery(validQuery)).toBe(true);
        expect(client.validateQuery(invalidQuery)).toBe(false);
      });

      it('should throw error for invalid query when validation is enabled', async () => {
        client = new TallyGraphQLClient(authManager, {
          validateQueries: true,
        });

        const invalidQuery = `query { organizations { id name `;

        await expect(client.query(invalidQuery)).rejects.toThrow(
          GraphQLValidationError
        );
      });

      it('should allow invalid queries when validation is disabled', async () => {
        client = new TallyGraphQLClient(authManager, {
          validateQueries: false,
        });

        mockFetchResponse({
          ok: true,
          json: () =>
            Promise.resolve({
              errors: [{ message: 'Syntax Error' }],
            }),
        });

        const invalidQuery = `query { organizations { id name `;

        // Should not throw validation error, but will throw GraphQL error from server
        await expect(client.query(invalidQuery)).rejects.toThrow(
          GraphQLClientError
        );
      });

      it('should validate query variables', () => {
        const query = `query GetOrg($id: ID!) { organization(id: $id) { id } }`;
        const validVariables = { id: '123' };
        const invalidVariables = { name: 'test' }; // missing required $id

        expect(client.validateVariables(query, validVariables)).toBe(true);
        expect(client.validateVariables(query, invalidVariables)).toBe(false);
      });
    });

    describe('Caching System', () => {
      beforeEach(async () => {
        await authManager.initialize();
        client = new TallyGraphQLClient(authManager, {
          enableCache: true,
          cacheMaxAge: 300000, // 5 minutes
        });
      });

      it('should cache query results', async () => {
        const mockResponse = {
          data: { organizations: [{ id: '1', name: 'Test DAO' }] },
        };

        mockFetchResponse({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const query = `query { organizations { id name } }`;

        // First call - should hit API
        const result1 = await client.query(query);
        expect(result1).toEqual(mockResponse.data);
        expect(fetchCallCount).toBe(1);

        // Second call - should use cache
        const result2 = await client.query(query);
        expect(result2).toEqual(mockResponse.data);
        expect(fetchCallCount).toBe(1); // Still only 1 call
      });

      it('should expire cached entries after maxAge', async () => {
        client = new TallyGraphQLClient(authManager, {
          enableCache: true,
          cacheMaxAge: 100, // 100ms for testing
        });

        const mockResponse = {
          data: { organizations: [{ id: '1', name: 'Test DAO' }] },
        };

        mockFetchResponse({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const query = `query { organizations { id name } }`;

        // First call
        await client.query(query);
        expect(fetchCallCount).toBe(1);

        // Wait for cache to expire
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Second call after expiry - should hit API again
        await client.query(query);
        expect(fetchCallCount).toBe(2);
      });

      it('should clear cache when requested', async () => {
        const mockResponse = {
          data: { organizations: [{ id: '1', name: 'Test DAO' }] },
        };

        mockFetchResponse({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const query = `query { organizations { id name } }`;

        // First call - populate cache
        await client.query(query);
        expect(fetchCallCount).toBe(1);

        // Clear cache
        client.clearCache();

        // Second call - should hit API again
        await client.query(query);
        expect(fetchCallCount).toBe(2);
      });

      it('should get cache statistics', async () => {
        const mockResponse = {
          data: { organizations: [{ id: '1', name: 'Test DAO' }] },
        };

        mockFetchResponse({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const query = `query { organizations { id name } }`;

        const initialStats = client.getCacheStats();
        expect(initialStats.size).toBe(0);
        expect(initialStats.hits).toBe(0);
        expect(initialStats.misses).toBe(0);

        // First call - cache miss
        await client.query(query);

        let stats = client.getCacheStats();
        expect(stats.size).toBe(1);
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(1);

        // Second call - cache hit
        await client.query(query);

        stats = client.getCacheStats();
        expect(stats.size).toBe(1);
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
      });
    });

    describe('Error Handling', () => {
      beforeEach(async () => {
        await authManager.initialize();
        client = new TallyGraphQLClient(authManager);
      });

      it('should handle malformed JSON responses', async () => {
        mockFetchResponse({
          ok: true,
          json: () => Promise.reject(new Error('Invalid JSON')),
        });

        const query = `query { organizations { id } }`;

        await expect(client.query(query)).rejects.toThrow(GraphQLNetworkError);
      });

      it('should handle timeout errors', async () => {
        client = new TallyGraphQLClient(authManager, {
          timeout: 100, // 100ms timeout
        });

        global.fetch = () => {
          fetchCallCount++;
          return new Promise((resolve) => setTimeout(resolve, 200));
        };

        const query = `query { organizations { id } }`;

        await expect(client.query(query)).rejects.toThrow(GraphQLNetworkError);
      });

      it('should retry failed requests when configured', async () => {
        client = new TallyGraphQLClient(authManager, {
          retryAttempts: 2,
          retryDelay: 50,
        });

        let callCount = 0;
        global.fetch = () => {
          callCount++;
          fetchCallCount++;
          if (callCount <= 2) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { test: 'success' } }),
          });
        };

        const query = `query { test }`;

        const result = await client.query(query);
        expect(result).toEqual({ test: 'success' });
        expect(fetchCallCount).toBe(3);
      });

      it('should fail after max retry attempts', async () => {
        client = new TallyGraphQLClient(authManager, {
          retryAttempts: 2,
          retryDelay: 50,
        });

        mockFetchError(new Error('Persistent network error'));

        const query = `query { test }`;

        await expect(client.query(query)).rejects.toThrow(GraphQLNetworkError);
      });
    });
  });

  describe('QueryCache Class', () => {
    let cache: QueryCache;

    beforeEach(() => {
      cache = new QueryCache(300000); // 5 minutes
    });

    it('should store and retrieve cache entries', () => {
      const key = 'test-query';
      const data = { test: 'data' };

      cache.set(key, data);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(data);
    });

    it('should return null for expired entries', async () => {
      cache = new QueryCache(100); // 100ms
      const key = 'test-query';
      const data = { test: 'data' };

      cache.set(key, data);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 150));

      const retrieved = cache.get(key);
      expect(retrieved).toBeNull();
    });

    it('should clear all entries', () => {
      cache.set('key1', { data: 1 });
      cache.set('key2', { data: 2 });

      expect(cache.size()).toBe(2);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('should track cache statistics', () => {
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);

      // Cache miss
      cache.get('nonexistent');
      expect(cache.getStats().misses).toBe(1);

      // Cache set and hit
      cache.set('key', { data: 'test' });
      cache.get('key');
      expect(cache.getStats().hits).toBe(1);
    });
  });

  describe('Utility Functions', () => {
    it('should create TallyGraphQLClient with factory function', async () => {
      await authManager.initialize();

      const client = createTallyClient(authManager, {
        enableCache: false,
        validateQueries: true,
      });

      expect(client).toBeInstanceOf(TallyGraphQLClient);
      expect(client.isCachingEnabled()).toBe(false);
    });

    it('should create client with default options', async () => {
      await authManager.initialize();

      const client = createTallyClient(authManager);

      expect(client).toBeInstanceOf(TallyGraphQLClient);
      expect(client.isCachingEnabled()).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with real query structure', async () => {
      await authManager.initialize();
      client = new TallyGraphQLClient(authManager);

      const mockResponse = {
        data: {
          organizations: [
            {
              id: '2206072050315953922',
              name: 'Uniswap',
              slug: 'uniswap',
              chainId: '1',
              proposalStats: {
                total: 42,
                active: 2,
                passed: 35,
                failed: 5,
              },
            },
          ],
        },
      };

      mockFetchResponse({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const query = `
        query GetOrganizations {
          organizations {
            id
            name
            slug
            chainId
            proposalStats {
              total
              active
              passed
              failed
            }
          }
        }
      `;

      const result = await client.query(query);

      expect(result).toEqual(mockResponse.data);
      expect(result.organizations[0].name).toBe('Uniswap');
      expect(result.organizations[0].proposalStats.total).toBe(42);
    });
  });
});
