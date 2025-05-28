import { describe, it, expect, beforeEach } from 'bun:test';
import {
  McpError,
  ValidationError,
  TransportError,
  ProtocolError,
  ToolNotFoundError,
  ResourceNotFoundError,
  PromptNotFoundError,
  InvalidRequestError,
  AuthenticationError,
  RateLimitError,
  formatMcpError,
  isKnownError,
} from '../src/errors';

describe('MCP Error Handling', () => {
  describe('Error Classes', () => {
    it('should create McpError with correct properties', () => {
      const error = new McpError('Test error', -32000);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(McpError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(-32000);
      expect(error.name).toBe('McpError');
      expect(error.data).toBeUndefined();
    });

    it('should create McpError with additional data', () => {
      const data = { details: 'Additional information' };
      const error = new McpError('Test error', -32000, data);

      expect(error.data).toEqual(data);
    });

    it('should create ValidationError with proper code', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(-32602); // Invalid params
      expect(error.name).toBe('ValidationError');
    });

    it('should create TransportError with proper code', () => {
      const error = new TransportError('Connection failed');

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(-32001); // Custom transport error code
      expect(error.name).toBe('TransportError');
    });

    it('should create ProtocolError with proper code', () => {
      const error = new ProtocolError('Invalid protocol version');

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(-32002); // Custom protocol error code
      expect(error.name).toBe('ProtocolError');
    });

    it('should create ToolNotFoundError with proper code', () => {
      const error = new ToolNotFoundError('unknown_tool');

      expect(error).toBeInstanceOf(McpError);
      expect(error.message).toBe('Tool not found: unknown_tool');
      expect(error.code).toBe(-32601); // Method not found
      expect(error.data).toEqual({ tool: 'unknown_tool' });
    });

    it('should create ResourceNotFoundError with proper code', () => {
      const error = new ResourceNotFoundError('tally://unknown/resource');

      expect(error).toBeInstanceOf(McpError);
      expect(error.message).toBe(
        'Resource not found: tally://unknown/resource'
      );
      expect(error.code).toBe(-32603); // Custom resource not found code
      expect(error.data).toEqual({ uri: 'tally://unknown/resource' });
    });

    it('should create PromptNotFoundError with proper code', () => {
      const error = new PromptNotFoundError('unknown_prompt');

      expect(error).toBeInstanceOf(McpError);
      expect(error.message).toBe('Prompt not found: unknown_prompt');
      expect(error.code).toBe(-32604); // Custom prompt not found code
      expect(error.data).toEqual({ prompt: 'unknown_prompt' });
    });

    it('should create InvalidRequestError with proper code', () => {
      const error = new InvalidRequestError('Missing required field');

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(-32600); // Invalid request
      expect(error.name).toBe('InvalidRequestError');
    });

    it('should create AuthenticationError with proper code', () => {
      const error = new AuthenticationError('Invalid API key');

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(-32003); // Custom auth error code
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create RateLimitError with proper code and data', () => {
      const error = new RateLimitError(60, 100);

      expect(error).toBeInstanceOf(McpError);
      expect(error.message).toBe('Rate limit exceeded. Retry after 60 seconds');
      expect(error.code).toBe(-32004); // Custom rate limit error code
      expect(error.data).toEqual({
        retryAfter: 60,
        limit: 100,
      });
    });
  });

  describe('Error Formatting', () => {
    it('should format McpError for JSON-RPC response', () => {
      const error = new ValidationError('Invalid input');
      const formatted = formatMcpError(error);

      expect(formatted).toEqual({
        code: -32602,
        message: 'Invalid input',
        data: undefined,
      });
    });

    it('should format McpError with data', () => {
      const error = new ToolNotFoundError('test_tool');
      const formatted = formatMcpError(error);

      expect(formatted).toEqual({
        code: -32601,
        message: 'Tool not found: test_tool',
        data: { tool: 'test_tool' },
      });
    });

    it('should format generic Error as internal error', () => {
      const error = new Error('Something went wrong');
      const formatted = formatMcpError(error);

      expect(formatted).toEqual({
        code: -32603,
        message: 'Internal error',
        data: {
          originalMessage: 'Something went wrong',
        },
      });
    });

    it('should format unknown error types', () => {
      const error = { weird: 'object' };
      const formatted = formatMcpError(error as any);

      expect(formatted).toEqual({
        code: -32603,
        message: 'Internal error',
        data: {
          error: { weird: 'object' },
        },
      });
    });

    it('should handle null/undefined errors', () => {
      expect(formatMcpError(null as any)).toEqual({
        code: -32603,
        message: 'Internal error',
        data: undefined,
      });

      expect(formatMcpError(undefined as any)).toEqual({
        code: -32603,
        message: 'Internal error',
        data: undefined,
      });
    });
  });

  describe('Error Type Guards', () => {
    it('should identify known MCP errors', () => {
      expect(isKnownError(new McpError('test', -32000))).toBe(true);
      expect(isKnownError(new ValidationError('test'))).toBe(true);
      expect(isKnownError(new TransportError('test'))).toBe(true);
      expect(isKnownError(new ProtocolError('test'))).toBe(true);
      expect(isKnownError(new ToolNotFoundError('test'))).toBe(true);
      expect(isKnownError(new ResourceNotFoundError('test'))).toBe(true);
      expect(isKnownError(new PromptNotFoundError('test'))).toBe(true);
      expect(isKnownError(new InvalidRequestError('test'))).toBe(true);
      expect(isKnownError(new AuthenticationError('test'))).toBe(true);
      expect(isKnownError(new RateLimitError(60, 100))).toBe(true);
    });

    it('should not identify generic errors as known MCP errors', () => {
      expect(isKnownError(new Error('test'))).toBe(false);
      expect(isKnownError(new TypeError('test'))).toBe(false);
      expect(isKnownError('string error')).toBe(false);
      expect(isKnownError(null)).toBe(false);
      expect(isKnownError(undefined)).toBe(false);
    });
  });

  describe('Error Serialization', () => {
    it('should serialize error to JSON properly', () => {
      const error = new ValidationError('Test error');
      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('message', 'Test error');
      expect(parsed).toHaveProperty('code', -32602);
      expect(parsed).toHaveProperty('name', 'ValidationError');
    });

    it('should maintain stack trace', () => {
      const error = new McpError('Test error', -32000);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('McpError: Test error');
    });
  });
});
