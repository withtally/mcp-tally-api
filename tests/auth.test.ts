import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  AuthManager,
  AuthMode,
  AuthMiddleware,
  createAuthMiddleware,
} from '../src/auth';
import { AuthenticationError } from '../src/errors';

describe('Authentication System', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('AuthManager Class', () => {
    describe('Stdio Mode', () => {
      it('should create AuthManager in stdio mode', () => {
        const authManager = new AuthManager('stdio');
        expect(authManager.getMode()).toBe('stdio');
      });

      it('should initialize with API key from environment variables', async () => {
        process.env.TALLY_API_KEY = 'test-api-key-123';

        const authManager = new AuthManager('stdio');
        await authManager.initialize();

        expect(authManager.getApiKey()).toBe('test-api-key-123');
      });

      it('should throw error when API key is missing in stdio mode', async () => {
        delete process.env.TALLY_API_KEY;

        const authManager = new AuthManager('stdio');

        await expect(authManager.initialize()).rejects.toThrow(
          AuthenticationError
        );
        await expect(authManager.initialize()).rejects.toThrow(
          'Tally API key not found in environment variables'
        );
      });

      it('should throw error when trying to get API key before initialization', () => {
        const authManager = new AuthManager('stdio');

        expect(() => authManager.getApiKey()).toThrow(AuthenticationError);
        expect(() => authManager.getApiKey()).toThrow(
          'API key not initialized'
        );
      });

      it('should validate API key is available after initialization', async () => {
        process.env.TALLY_API_KEY = 'valid-key';

        const authManager = new AuthManager('stdio');
        await authManager.initialize();

        expect(authManager.hasApiKey()).toBe(true);
      });
    });

    describe('SSE Mode', () => {
      it('should create AuthManager in SSE mode', () => {
        const authManager = new AuthManager('sse');
        expect(authManager.getMode()).toBe('sse');
      });

      it('should initialize without requiring environment variables in SSE mode', async () => {
        delete process.env.TALLY_API_KEY;

        const authManager = new AuthManager('sse');

        // Should not throw
        await authManager.initialize();
        expect(authManager.hasApiKey()).toBe(false);
      });

      it('should allow setting API key dynamically in SSE mode', async () => {
        const authManager = new AuthManager('sse');
        await authManager.initialize();

        authManager.setApiKey('dynamic-api-key');

        expect(authManager.getApiKey()).toBe('dynamic-api-key');
        expect(authManager.hasApiKey()).toBe(true);
      });

      it('should throw error when getting API key without setting it first in SSE mode', async () => {
        const authManager = new AuthManager('sse');
        await authManager.initialize();

        expect(() => authManager.getApiKey()).toThrow(AuthenticationError);
        expect(() => authManager.getApiKey()).toThrow('API key not set');
      });

      it('should allow updating API key multiple times in SSE mode', async () => {
        const authManager = new AuthManager('sse');
        await authManager.initialize();

        authManager.setApiKey('first-key');
        expect(authManager.getApiKey()).toBe('first-key');

        authManager.setApiKey('second-key');
        expect(authManager.getApiKey()).toBe('second-key');
      });
    });

    describe('API Key Validation', () => {
      it('should validate API key format', async () => {
        const authManager = new AuthManager('sse');
        await authManager.initialize();

        // Valid API key format (assuming Tally uses specific format)
        expect(authManager.isValidApiKeyFormat('valid-api-key-123')).toBe(true);

        // Invalid formats
        expect(authManager.isValidApiKeyFormat('')).toBe(false);
        expect(authManager.isValidApiKeyFormat('   ')).toBe(false);
        expect(authManager.isValidApiKeyFormat('short')).toBe(false);
      });

      it('should validate API key against Tally API', async () => {
        const authManager = new AuthManager('sse');
        await authManager.initialize();

        // Mock successful validation
        const isValid = await authManager.validateApiKey('valid-key');
        expect(typeof isValid).toBe('boolean');
      });

      it('should handle API validation errors gracefully', async () => {
        const authManager = new AuthManager('sse');
        await authManager.initialize();

        // Should not throw, but return false for invalid keys
        const isValid = await authManager.validateApiKey('invalid-key');
        expect(isValid).toBe(false);
      });

      it('should validate current API key when no key provided', async () => {
        process.env.TALLY_API_KEY = 'current-key';

        const authManager = new AuthManager('stdio');
        await authManager.initialize();

        const isValid = await authManager.validateApiKey();
        expect(typeof isValid).toBe('boolean');
      });
    });

    describe('Security Features', () => {
      it('should not expose API key in toString or JSON serialization', async () => {
        process.env.TALLY_API_KEY = 'secret-key';

        const authManager = new AuthManager('stdio');
        await authManager.initialize();

        const stringified = JSON.stringify(authManager);
        expect(stringified).not.toContain('secret-key');

        const toString = authManager.toString();
        expect(toString).not.toContain('secret-key');
      });

      it('should redact API key in error messages', async () => {
        const authManager = new AuthManager('sse');
        await authManager.initialize();

        authManager.setApiKey('secret-key-123');

        try {
          // Trigger an error that might include the API key
          await authManager.validateApiKey('invalid-key');
        } catch (error) {
          expect(error.message).not.toContain('secret-key-123');
        }
      });

      it('should clear API key when requested', async () => {
        const authManager = new AuthManager('sse');
        await authManager.initialize();

        authManager.setApiKey('temp-key');
        expect(authManager.hasApiKey()).toBe(true);

        authManager.clearApiKey();
        expect(authManager.hasApiKey()).toBe(false);
      });
    });
  });

  describe('Authentication Middleware', () => {
    describe('Stdio Mode Middleware', () => {
      it('should create stdio authentication middleware', () => {
        const middleware = createAuthMiddleware('stdio');
        expect(typeof middleware).toBe('function');
      });

      it('should authenticate requests in stdio mode', async () => {
        process.env.TALLY_API_KEY = 'stdio-key';

        const middleware = createAuthMiddleware('stdio');
        const mockRequest = { method: 'tools/call', params: { name: 'test' } };
        const mockResponse = {};

        let nextCalled = false;
        const next = () => {
          nextCalled = true;
        };

        await middleware(mockRequest, mockResponse, next);
        expect(nextCalled).toBe(true);
      });

      it('should reject requests without API key in stdio mode', async () => {
        delete process.env.TALLY_API_KEY;

        const middleware = createAuthMiddleware('stdio');
        const mockRequest = { method: 'tools/call', params: { name: 'test' } };
        const mockResponse = {};
        const next = () => {};

        await expect(
          middleware(mockRequest, mockResponse, next)
        ).rejects.toThrow(AuthenticationError);
      });
    });

    describe('SSE Mode Middleware', () => {
      it('should create SSE authentication middleware', () => {
        const middleware = createAuthMiddleware('sse');
        expect(typeof middleware).toBe('function');
      });

      it('should authenticate requests with API key in params for SSE mode', async () => {
        const middleware = createAuthMiddleware('sse');
        const mockRequest = {
          method: 'tools/call',
          params: {
            name: 'test',
            apiKey: 'sse-api-key',
          },
        };
        const mockResponse = {};

        let nextCalled = false;
        const next = () => {
          nextCalled = true;
        };

        await middleware(mockRequest, mockResponse, next);
        expect(nextCalled).toBe(true);
      });

      it('should reject requests without API key in SSE mode', async () => {
        const middleware = createAuthMiddleware('sse');
        const mockRequest = {
          method: 'tools/call',
          params: { name: 'test' },
        };
        const mockResponse = {};
        const next = () => {};

        await expect(
          middleware(mockRequest, mockResponse, next)
        ).rejects.toThrow(AuthenticationError);
      });

      it('should extract and validate API key from request headers in SSE mode', async () => {
        const middleware = createAuthMiddleware('sse');
        const mockRequest = {
          method: 'tools/call',
          params: { name: 'test' },
          headers: { 'x-api-key': 'header-api-key' },
        };
        const mockResponse = {};

        let nextCalled = false;
        const next = () => {
          nextCalled = true;
        };

        await middleware(mockRequest, mockResponse, next);
        expect(nextCalled).toBe(true);
      });
    });

    describe('Middleware Error Handling', () => {
      it('should handle authentication errors gracefully', async () => {
        const middleware = createAuthMiddleware('stdio');
        const mockRequest = { method: 'tools/call', params: { name: 'test' } };
        const mockResponse = {};
        const next = () => {};

        delete process.env.TALLY_API_KEY;

        let errorThrown = false;
        try {
          await middleware(mockRequest, mockResponse, next);
        } catch (error) {
          errorThrown = true;
          expect(error).toBeInstanceOf(AuthenticationError);
        }

        expect(errorThrown).toBe(true);
      });

      it('should not log API keys in error scenarios', async () => {
        // Create a simple spy for console.error
        const originalConsoleError = console.error;
        const errorLogs: any[] = [];
        console.error = (...args: any[]) => {
          errorLogs.push(args);
        };

        try {
          const middleware = createAuthMiddleware('sse');
          const mockRequest = {
            method: 'tools/call',
            params: { name: 'test', apiKey: 'secret-key-456' },
          };
          const mockResponse = {};
          const next = () => {
            throw new Error('Test error');
          };

          try {
            await middleware(mockRequest, mockResponse, next);
          } catch (error) {
            // Error expected
          }

          // Check that console.error was not called with the API key
          errorLogs.forEach((logArgs) => {
            logArgs.forEach((arg) => {
              if (typeof arg === 'string') {
                expect(arg).not.toContain('secret-key-456');
              }
            });
          });
        } finally {
          console.error = originalConsoleError;
        }
      });
    });
  });

  describe('AuthMode Type', () => {
    it('should define valid auth modes', () => {
      const stdioMode: AuthMode = 'stdio';
      const sseMode: AuthMode = 'sse';

      expect(stdioMode).toBe('stdio');
      expect(sseMode).toBe('sse');
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end in stdio mode', async () => {
      process.env.TALLY_API_KEY = 'integration-test-key';

      const authManager = new AuthManager('stdio');
      await authManager.initialize();

      const middleware = createAuthMiddleware('stdio');
      const mockRequest = { method: 'tools/call', params: { name: 'test' } };
      const mockResponse = {};

      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await middleware(mockRequest, mockResponse, next);

      expect(authManager.hasApiKey()).toBe(true);
      expect(nextCalled).toBe(true);
    });

    it('should work end-to-end in SSE mode', async () => {
      const authManager = new AuthManager('sse');
      await authManager.initialize();

      const middleware = createAuthMiddleware('sse');
      const mockRequest = {
        method: 'tools/call',
        params: { name: 'test', apiKey: 'sse-integration-key' },
      };
      const mockResponse = {};

      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await middleware(mockRequest, mockResponse, next);
      expect(nextCalled).toBe(true);
    });
  });
});
