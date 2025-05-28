import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, writeFile, unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  Config,
  ConfigSchema,
  ConfigValidationError,
  ConfigSource,
  LogLevel,
  TransportMode,
} from '../src/config';

describe('Configuration Management System', () => {
  let tempDir: string;
  let config: Config;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create temporary directory for test config files
    tempDir = await mkdtemp(join(tmpdir(), 'mcp-config-test-'));

    // Save original environment
    originalEnv = { ...process.env };

    // Clear relevant environment variables
    delete process.env.TALLY_API_KEY;
    delete process.env.TRANSPORT_MODE;
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    delete process.env.MCP_CONFIG_FILE;

    // Create fresh config instance
    config = new Config();
  });

  afterEach(async () => {
    // Clean up config resources
    config.destroy();

    // Restore original environment
    process.env = originalEnv;

    // Clean up temporary directory
    try {
      await rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Config Class Initialization', () => {
    it('should create Config instance with default values', () => {
      expect(config).toBeInstanceOf(Config);
      expect(config.get('port')).toBe(3000);
      expect(config.get('logLevel')).toBe('info');
      expect(config.get('transportMode')).toBe('stdio');
    });

    it('should load configuration from multiple sources', async () => {
      // Set environment variable
      process.env.PORT = '8080';

      // Create config file
      const configFile = join(tempDir, 'config.json');
      await writeFile(
        configFile,
        JSON.stringify({
          logLevel: 'debug',
          tallyApiUrl: 'https://custom.api.url',
        })
      );

      const newConfig = new Config({
        configFile,
        cliArgs: { transportMode: 'sse' },
      });

      await newConfig.load();

      // CLI args should have highest priority
      expect(newConfig.get('transportMode')).toBe('sse');
      // Env vars should override config file
      expect(newConfig.get('port')).toBe(8080);
      // Config file should override defaults
      expect(newConfig.get('logLevel')).toBe('debug');
      expect(newConfig.get('tallyApiUrl')).toBe('https://custom.api.url');

      newConfig.destroy();
    });
  });

  describe('Configuration Sources', () => {
    it('should load from environment variables', async () => {
      process.env.TALLY_API_KEY = 'test-api-key';
      process.env.PORT = '9000';
      process.env.LOG_LEVEL = 'warn';

      await config.load();

      expect(config.get('tallyApiKey')).toBe('test-api-key');
      expect(config.get('port')).toBe(9000);
      expect(config.get('logLevel')).toBe('warn');
    });

    it('should load from JSON config file', async () => {
      const configFile = join(tempDir, 'config.json');
      const configData = {
        port: 4000,
        logLevel: 'error',
        tallyApiUrl: 'https://test.api.url',
        maxRetries: 5,
      };

      await writeFile(configFile, JSON.stringify(configData, null, 2));

      const fileConfig = new Config({ configFile });
      await fileConfig.load();

      expect(fileConfig.get('port')).toBe(4000);
      expect(fileConfig.get('logLevel')).toBe('error');
      expect(fileConfig.get('tallyApiUrl')).toBe('https://test.api.url');
      expect(fileConfig.get('maxRetries')).toBe(5);

      fileConfig.destroy();
    });

    it('should load from YAML config file', async () => {
      const configFile = join(tempDir, 'config.yaml');
      const yamlContent = `
port: 5000
logLevel: debug
transportMode: sse
tallyApiUrl: https://yaml.api.url
`;

      await writeFile(configFile, yamlContent);

      const yamlConfig = new Config({ configFile });
      await yamlConfig.load();

      expect(yamlConfig.get('port')).toBe(5000);
      expect(yamlConfig.get('logLevel')).toBe('debug');
      expect(yamlConfig.get('transportMode')).toBe('sse');
      expect(yamlConfig.get('tallyApiUrl')).toBe('https://yaml.api.url');

      yamlConfig.destroy();
    });

    it('should handle missing config file gracefully', async () => {
      const missingFile = join(tempDir, 'nonexistent.json');
      const fileConfig = new Config({ configFile: missingFile });

      // Should not throw
      await fileConfig.load();
      expect(fileConfig.get('port')).toBe(3000); // Should use defaults

      fileConfig.destroy();
    });
  });

  describe('Configuration Priority', () => {
    it('should respect priority order: CLI > env > file > defaults', async () => {
      // Set up all sources for the same key
      const configFile = join(tempDir, 'config.json');
      await writeFile(configFile, JSON.stringify({ port: 1000 }));

      process.env.PORT = '2000';

      const priorityConfig = new Config({
        configFile,
        cliArgs: { port: 3000 },
      });

      await priorityConfig.load();

      // CLI args should win
      expect(priorityConfig.get('port')).toBe(3000);

      priorityConfig.destroy();
    });

    it('should fall back through priority chain', async () => {
      const configFile = join(tempDir, 'config.json');
      await writeFile(
        configFile,
        JSON.stringify({
          logLevel: 'debug',
          customSetting: 'from-file',
        })
      );

      process.env.LOG_LEVEL = 'warn';

      const fallbackConfig = new Config({ configFile });
      await fallbackConfig.load();

      // Env should override file
      expect(fallbackConfig.get('logLevel')).toBe('warn');
      // File should provide value not in env
      expect(fallbackConfig.get('customSetting')).toBe('from-file');
      // Default should be used when not in any source
      expect(fallbackConfig.get('port')).toBe(3000);

      fallbackConfig.destroy();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration against schema', async () => {
      const invalidConfig = new Config({
        cliArgs: {
          port: 'invalid-port', // Should be number
          logLevel: 'invalid-level', // Should be valid log level
          transportMode: 'invalid-mode', // Should be 'stdio' or 'sse'
        },
      });

      let error: any;
      try {
        await invalidConfig.load();
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(ConfigValidationError);
      invalidConfig.destroy();
    });

    it('should accept valid configuration', async () => {
      const validConfig = new Config({
        cliArgs: {
          port: 8080,
          logLevel: 'debug',
          transportMode: 'sse',
          tallyApiKey: 'valid-key',
        },
      });

      // Should not throw
      await validConfig.load();
      expect(validConfig.get('port')).toBe(8080);

      validConfig.destroy();
    });

    it('should validate individual configuration updates', () => {
      expect(() => config.set('port', 'invalid')).toThrow(
        ConfigValidationError
      );
      expect(() => config.set('logLevel', 'invalid')).toThrow(
        ConfigValidationError
      );
      expect(() => config.set('transportMode', 'invalid')).toThrow(
        ConfigValidationError
      );
    });
  });

  describe('Configuration Getters and Setters', () => {
    it('should get and set configuration values', () => {
      config.set('port', 9999);
      expect(config.get('port')).toBe(9999);

      config.set('logLevel', 'error');
      expect(config.get('logLevel')).toBe('error');
    });

    it('should return undefined for unknown keys', () => {
      expect(config.get('unknownKey')).toBeUndefined();
    });

    it('should support default values in get method', () => {
      expect(config.get('unknownKey', 'default-value')).toBe('default-value');
    });

    it('should return all configuration as object', () => {
      config.set('port', 8080);
      config.set('logLevel', 'debug');

      const allConfig = config.getAll();
      expect(allConfig).toHaveProperty('port', 8080);
      expect(allConfig).toHaveProperty('logLevel', 'debug');
      expect(allConfig).toHaveProperty('transportMode', 'stdio'); // default
    });
  });

  describe('Helper Methods', () => {
    it('should provide typed helper methods', () => {
      config.set('port', 8080);
      config.set('logLevel', 'debug');
      config.set('transportMode', 'sse');

      expect(config.getPort()).toBe(8080);
      expect(config.getLogLevel()).toBe('debug');
      expect(config.getTransportMode()).toBe('sse');
      expect(config.getTallyApiUrl()).toBe('https://api.tally.xyz/query'); // default
    });

    it('should validate helper method return types', () => {
      const port = config.getPort();
      const logLevel = config.getLogLevel();
      const transportMode = config.getTransportMode();

      expect(typeof port).toBe('number');
      expect(['debug', 'info', 'warn', 'error']).toContain(logLevel);
      expect(['stdio', 'sse']).toContain(transportMode);
    });
  });

  describe('Configuration Schema', () => {
    it('should define valid configuration schema', () => {
      expect(ConfigSchema).toBeDefined();
      expect(ConfigSchema.port).toBeDefined();
      expect(ConfigSchema.logLevel).toBeDefined();
      expect(ConfigSchema.transportMode).toBeDefined();
      expect(ConfigSchema.tallyApiKey).toBeDefined();
      expect(ConfigSchema.tallyApiUrl).toBeDefined();
    });

    it('should validate schema types', () => {
      const schema = ConfigSchema;

      // Test port validation
      expect(() => schema.port.parse(3000)).not.toThrow();
      expect(() => schema.port.parse('invalid')).toThrow();

      // Test logLevel validation
      expect(() => schema.logLevel.parse('info')).not.toThrow();
      expect(() => schema.logLevel.parse('invalid')).toThrow();

      // Test transportMode validation
      expect(() => schema.transportMode.parse('stdio')).not.toThrow();
      expect(() => schema.transportMode.parse('sse')).not.toThrow();
      expect(() => schema.transportMode.parse('invalid')).toThrow();
    });
  });

  describe('File Watching', () => {
    it('should detect config file changes', async () => {
      const configFile = join(tempDir, 'watch-config.json');
      await writeFile(configFile, JSON.stringify({ port: 3000 }));

      const watchConfig = new Config({
        configFile,
        enableFileWatching: true,
      });
      await watchConfig.load();

      expect(watchConfig.get('port')).toBe(3000);

      // Simulate file change
      await writeFile(configFile, JSON.stringify({ port: 4000 }));

      // Wait for file watcher to trigger
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(watchConfig.get('port')).toBe(4000);

      watchConfig.destroy();
    });

    it('should handle file watch errors gracefully', async () => {
      const configFile = join(tempDir, 'watch-config.json');
      await writeFile(configFile, JSON.stringify({ port: 3000 }));

      const watchConfig = new Config({
        configFile,
        enableFileWatching: true,
      });
      await watchConfig.load();

      // Delete the file being watched
      await unlink(configFile);

      // Should not throw error
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(watchConfig.get('port')).toBe(3000); // Should retain last valid config

      watchConfig.destroy();
    });
  });

  describe('Configuration Sources Enum', () => {
    it('should define configuration source types', () => {
      expect(ConfigSource.CLI).toBe('cli');
      expect(ConfigSource.ENV).toBe('env');
      expect(ConfigSource.FILE).toBe('file');
      expect(ConfigSource.DEFAULT).toBe('default');
    });
  });

  describe('Type Definitions', () => {
    it('should export proper TypeScript types', () => {
      // These tests verify the types exist and can be used
      const logLevel: LogLevel = 'info';
      const transportMode: TransportMode = 'stdio';

      expect(['debug', 'info', 'warn', 'error']).toContain(logLevel);
      expect(['stdio', 'sse']).toContain(transportMode);
    });
  });
});
