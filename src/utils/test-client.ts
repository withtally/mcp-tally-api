import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const serverPath = join(projectRoot, 'src', 'index.ts');

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class McpTestClient {
  private server: ChildProcess | null = null;
  private buffer: string = '';
  private responseHandlers: Map<
    string | number,
    (response: JsonRpcResponse) => void
  > = new Map();
  private messageId: number = 0;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = spawn('bun', ['run', serverPath], {
        env: {
          ...process.env,
          TRANSPORT_MODE: 'stdio',
          TALLY_API_KEY: 'test-key',
        },
        cwd: projectRoot,
      });

      if (!this.server.stdout || !this.server.stderr) {
        reject(new Error('Failed to create stdio streams'));
        return;
      }

      // Handle stdout (MCP responses)
      this.server.stdout.on('data', (data) => {
        this.buffer += data.toString();

        // Process complete JSON messages
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line) as JsonRpcResponse;
              const handler = this.responseHandlers.get(response.id!);
              if (handler) {
                handler(response);
                this.responseHandlers.delete(response.id!);
              }
            } catch (error) {
              // Silently ignore parse errors in production
            }
          }
        }
      });

      // Handle stderr (server logs)
      this.server.stderr.on('data', (data) => {
        const message = data.toString();
        if (message.includes('MCP Tally API Server running on stdio')) {
          // Server is ready
          setTimeout(() => resolve(), 100); // Give it a moment to fully initialize
        }
      });

      this.server.on('error', reject);
      this.server.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });
  }

  async request(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.server || !this.server.stdin) {
        reject(new Error('MCP server not connected'));
        return;
      }

      const id = `test-${++this.messageId}`;
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      // Set up response handler
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(id);
        reject(new Error(`Request timeout for method: ${method}`));
      }, 5000);

      this.responseHandlers.set(id, (response) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(
            new Error(`${response.error.message} (${response.error.code})`)
          );
        } else {
          resolve(response.result);
        }
      });

      // Send request
      this.server.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.on('exit', () => resolve());
        this.server.kill('SIGTERM');
        setTimeout(() => {
          if (this.server && !this.server.killed) {
            this.server.kill('SIGKILL');
          }
          resolve();
        }, 1000);
      } else {
        resolve();
      }
    });
  }
}
