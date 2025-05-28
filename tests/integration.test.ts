import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { McpTestClient } from '../src/utils/test-client';

describe('MCP Tally API Server Integration Tests', () => {
  let client: McpTestClient;

  beforeAll(async () => {
    client = new McpTestClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('MCP Protocol Compliance', () => {
    it('should initialize with correct protocol version', async () => {
      const result = await client.request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      });

      expect(result.protocolVersion).toBe('2024-11-05');
      expect(result.capabilities).toBeDefined();
      expect(result.serverInfo).toEqual({
        name: 'mcp-tally-api',
        version: '1.0.0',
      });
    });

    it('should list available tools', async () => {
      const result = await client.request('tools/list');

      expect(result.tools).toBeArray();
      expect(result.tools.length).toBeGreaterThan(0);

      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('test_connection');
      expect(toolNames).toContain('get_server_info');
    });

    it('should list available resources', async () => {
      const result = await client.request('resources/list');

      expect(result.resources).toBeArray();
      expect(result.resources.length).toBeGreaterThan(0);

      const resourceUris = result.resources.map((r: any) => r.uri);
      expect(resourceUris).toContain('tally://server/info');
    });

    it('should list available prompts', async () => {
      const result = await client.request('prompts/list');

      expect(result.prompts).toBeArray();
      expect(result.prompts.length).toBeGreaterThan(0);

      const promptNames = result.prompts.map((p: any) => p.name);
      expect(promptNames).toContain('dao_analysis');
    });
  });

  describe('Tool Functionality', () => {
    it('should execute test_connection tool', async () => {
      const result = await client.request('tools/call', {
        name: 'test_connection',
        arguments: {},
      });

      expect(result.content).toBeArray();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain(
        'MCP Tally API Server is running!'
      );
    });

    it('should execute get_server_info tool', async () => {
      const result = await client.request('tools/call', {
        name: 'get_server_info',
        arguments: {},
      });

      expect(result.content).toBeArray();
      expect(result.content[0].type).toBe('text');

      const serverInfo = JSON.parse(result.content[0].text);
      expect(serverInfo.name).toBe('mcp-tally-api');
      expect(serverInfo.version).toBe('1.0.0');
      expect(serverInfo.transport).toBe('stdio');
    });
  });

  describe('Resource Functionality', () => {
    it('should read server info resource', async () => {
      const result = await client.request('resources/read', {
        uri: 'tally://server/info',
      });

      expect(result.contents).toBeArray();
      expect(result.contents[0].uri).toBe('tally://server/info');
      expect(result.contents[0].mimeType).toBe('application/json');

      const info = JSON.parse(result.contents[0].text);
      expect(info.name).toBe('mcp-tally-api');
      expect(info.status).toBe('operational');
    });
  });

  describe('Prompt Functionality', () => {
    it('should get DAO analysis prompt', async () => {
      const result = await client.request('prompts/get', {
        name: 'dao_analysis',
        arguments: {},
      });

      expect(result.messages).toBeArray();
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.type).toBe('text');
      expect(result.messages[0].content.text).toContain('governance activity');
    });
  });
});
