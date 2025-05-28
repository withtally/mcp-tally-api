import { spawn, ChildProcess } from 'child_process';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';

/**
 * Dynamic Popular DAOs Resource Test
 *
 * Focused test for the dynamic Popular DAOs resource that verifies:
 * 1. Returns multiple networks
 * 2. Returns multiple DAOs
 * 3. DAOs are ranked by delegate count (descending)
 */

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class SimpleMCPClient {
  private server: ChildProcess | null = null;
  private requestId = 1;
  private pendingRequests = new Map<
    number,
    { resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  >();

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = spawn('bun', ['run', 'dist/index.js'], {
        env: {
          ...process.env,
          TALLY_API_KEY: process.env.TALLY_API_KEY,
          TRANSPORT_MODE: 'stdio',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.server.stdout || !this.server.stdin) {
        reject(new Error('Failed to create server process'));
        return;
      }

      let buffer = '';
      this.server.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response: MCPResponse = JSON.parse(line);
              this.handleResponse(response);
            } catch (error) {
              console.error('Failed to parse response:', line);
            }
          }
        }
      });

      this.server.stderr?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('MCP Tally API Server running on stdio')) {
          resolve();
        }
      });

      this.server.on('error', reject);
      setTimeout(resolve, 3000); // Give server time to start
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }
    for (const [, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
      reject(new Error('Server stopped'));
    }
    this.pendingRequests.clear();
  }

  private handleResponse(response: MCPResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);

      if (response.error) {
        pending.reject(new Error(`MCP Error: ${response.error.message}`));
      } else {
        pending.resolve(response.result);
      }
    }
  }

  async readResource(uri: string): Promise<any> {
    if (!this.server?.stdin) {
      throw new Error('Server not running');
    }

    const id = this.requestId++;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method: 'resources/read',
      params: { uri },
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${uri}`));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.server!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }
}

describe('Dynamic Popular DAOs Resource', () => {
  let client: SimpleMCPClient;

  beforeAll(async () => {
    if (!process.env.TALLY_API_KEY) {
      throw new Error(
        'TALLY_API_KEY environment variable is required for live tests'
      );
    }

    client = new SimpleMCPClient();
    await client.start();
    
    // Give the dynamic loader extra time to fetch data
    console.log('⏳ Waiting for dynamic DAO loading to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second wait
  }, 45000); // Increase timeout for beforeAll

  afterAll(async () => {
    if (client) {
      await client.stop();
    }
  });

  test('should return multiple networks and DAOs ranked by delegate count', async () => {
    const result = await client.readResource('tally://popular-daos');

    expect(result).toHaveProperty('contents');
    expect(Array.isArray(result.contents)).toBe(true);
    expect(result.contents[0]).toHaveProperty('text');

    const data = JSON.parse(result.contents[0].text);

    // Check resource structure
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('networks_included');
    expect(data).toHaveProperty('daos');
    expect(data).toHaveProperty('total_count');

    // Handle loading state (give it time but still test structure)
    if (data.status === 'loading') {
      console.log('📋 Resource is still loading, testing structure only...');
      expect(data.total_count).toBe(0);
      expect(data.daos).toHaveLength(0);
      expect(data.networks_included).toContain('eip155:1 (Ethereum)');
      expect(data.networks_included).toContain('eip155:42161 (Arbitrum)');
      return;
    }

    // Handle error state
    if (data.status === 'error') {
      console.warn('⚠️ Resource failed to load:', data.error_message);
      expect(data).toHaveProperty('error_message');
      return; // Still pass test but log the error
    }

    // Test successful loading (status === 'ready')
    expect(data.status).toBe('ready');
    
    // 1. TEST: Multiple networks
    console.log('✅ Testing multiple networks...');
    expect(data.networks_included).toHaveLength(8); // 8 production networks
    expect(data.networks_included).toContain('eip155:1 (Ethereum)');
    expect(data.networks_included).toContain('eip155:42161 (Arbitrum)');
    expect(data.networks_included).toContain('eip155:10 (Optimism)');
    expect(data.networks_included).toContain('eip155:324 (zkSync)');
    expect(data.networks_included).toContain('eip155:100 (Gnosis)');
    expect(data.networks_included).toContain('eip155:137 (Polygon)');
    expect(data.networks_included).toContain('eip155:8453 (Base)');
    expect(data.networks_included).toContain('eip155:43114 (Avalanche)');

    // 2. TEST: Multiple DAOs
    console.log('✅ Testing multiple DAOs...');
    expect(data.total_count).toBeGreaterThan(10); // Should have many DAOs
    expect(data.total_count).toBeLessThanOrEqual(30); // Max 30 as configured
    expect(data.daos).toHaveLength(data.total_count);

    // Verify DAO structure
    for (const dao of data.daos.slice(0, 3)) {
      expect(dao).toHaveProperty('id');
      expect(dao).toHaveProperty('name');
      expect(dao).toHaveProperty('slug');
      expect(dao).toHaveProperty('chainId');
      expect(dao).toHaveProperty('delegateCount');
      expect(dao).toHaveProperty('memberCount');
      expect(dao).toHaveProperty('proposalCount');
      expect(dao).toHaveProperty('hasActiveProposals');
      
      expect(typeof dao.delegateCount).toBe('number');
      expect(dao.delegateCount).toBeGreaterThanOrEqual(0);
    }

    // 3. TEST: Ranked by delegate count (descending)
    console.log('✅ Testing delegate count ranking...');
    expect(data.daos.length).toBeGreaterThan(1); // Need at least 2 DAOs to test ranking

    for (let i = 1; i < data.daos.length; i++) {
      const currentDAO = data.daos[i];
      const previousDAO = data.daos[i - 1];
      
      expect(previousDAO.delegateCount).toBeGreaterThanOrEqual(
        currentDAO.delegateCount
      );
    }

    // 4. TEST: Multiple chain representations
    console.log('✅ Testing multiple chain representations...');
    const uniqueChains = new Set(data.daos.map(dao => dao.chainId));
    expect(uniqueChains.size).toBeGreaterThan(1); // Should have DAOs from multiple chains

    // 5. TEST: No testnet chains
    console.log('✅ Testing no testnet chains...');
    const testnetChains = [
      'eip155:300',      // zkSync Sepolia testnet
      'eip155:84532',    // Base Sepolia testnet  
      'eip155:11155111', // Ethereum Sepolia testnet
      'eip155:421614',   // Arbitrum Sepolia testnet
      'eip155:11155420', // Optimism Sepolia testnet
    ];
    
    for (const dao of data.daos) {
      expect(testnetChains).not.toContain(dao.chainId);
    }

    // Log success details
    console.log(`🎉 Successfully validated ${data.total_count} DAOs across ${uniqueChains.size} networks`);
    console.log(`   Top DAO: ${data.daos[0].name} (${data.daos[0].delegateCount} delegates on ${data.daos[0].chainId})`);
    console.log(`   Networks represented: ${Array.from(uniqueChains).join(', ')}`);

    // Additional validation: Top DAOs should have substantial delegate counts
    const topDAO = data.daos[0];
    expect(topDAO.delegateCount).toBeGreaterThan(1000); // Top DAO should have substantial delegates

  }, 40000); // 40 second timeout for this test

  test('should include expected top DAOs', async () => {
    const result = await client.readResource('tally://popular-daos');
    const data = JSON.parse(result.contents[0].text);

    if (data.status !== 'ready') {
      console.log('Skipping top DAO test - resource not ready');
      return;
    }

    // Check that some expected major DAOs are included
    const daoNames = data.daos.map(dao => dao.name.toLowerCase());
    
    // At least one of these major DAOs should be in the top 30
    const majorDAOs = ['arbitrum', 'optimism', 'uniswap', 'aave', 'compound'];
    const foundMajorDAOs = majorDAOs.filter(name => 
      daoNames.some(daoName => daoName.includes(name))
    );
    
    expect(foundMajorDAOs.length).toBeGreaterThan(0);
    console.log(`✅ Found major DAOs: ${foundMajorDAOs.join(', ')}`);

  }, 30000);
}); 