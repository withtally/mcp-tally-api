/**
 * Configuration Management System
 *
 * This module provides a flexible configuration system that supports loading
 * from multiple sources with proper priority handling and validation.
 */

import { readFile } from 'fs/promises';
import { existsSync, watchFile, unwatchFile } from 'fs';
import { extname } from 'path';
import { load as yamlLoad } from 'js-yaml';
import { z } from 'zod';
import { ValidationError } from './errors';

/**
 * Configuration source types
 */
export enum ConfigSource {
  CLI = 'cli',
  ENV = 'env',
  FILE = 'file',
  DEFAULT = 'default',
}

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Transport mode type
 */
export type TransportMode = 'stdio' | 'sse';

/**
 * Configuration validation error
 */
export class ConfigValidationError extends ValidationError {
  constructor(message: string, data?: any) {
    super(`Configuration validation error: ${message}`, data);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Configuration schema using Zod
 */
export const ConfigSchema = {
  port: z.number().int().min(1).max(65535),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']),
  transportMode: z.enum(['stdio', 'sse']),
  tallyApiKey: z.string().optional(),
  tallyApiUrl: z.string().url(),
  maxRetries: z.number().int().min(0).optional(),
  enableFileWatching: z.boolean().optional(),
};

/**
 * Configuration interface
 */
export interface ConfigData {
  port?: number;
  logLevel?: LogLevel;
  transportMode?: TransportMode;
  tallyApiKey?: string;
  tallyApiUrl?: string;
  maxRetries?: number;
  enableFileWatching?: boolean;
  [key: string]: any;
}

/**
 * Configuration options for initialization
 */
export interface ConfigOptions {
  configFile?: string;
  cliArgs?: ConfigData;
  enableFileWatching?: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<ConfigData, 'tallyApiKey'>> & {
  tallyApiKey?: string;
} = {
  port: 3000,
  logLevel: 'info',
  transportMode: 'stdio',
  tallyApiUrl: 'https://api.tally.xyz/query',
  maxRetries: 3,
  enableFileWatching: false,
  tallyApiKey: undefined,
};

/**
 * Environment variable mappings
 */
const ENV_MAPPINGS: Record<string, string> = {
  PORT: 'port',
  LOG_LEVEL: 'logLevel',
  TRANSPORT_MODE: 'transportMode',
  TALLY_API_KEY: 'tallyApiKey',
  TALLY_API_URL: 'tallyApiUrl',
  MAX_RETRIES: 'maxRetries',
  MCP_CONFIG_FILE: 'configFile',
};

/**
 * Configuration management class
 */
export class Config {
  private config: ConfigData = {};
  private sources: Map<string, ConfigSource> = new Map();
  private options: ConfigOptions;
  private isWatching = false;

  constructor(options: ConfigOptions = {}) {
    this.options = options;
    this.initializeDefaults();
  }

  /**
   * Initialize with default values
   */
  private initializeDefaults(): void {
    Object.entries(DEFAULT_CONFIG).forEach(([key, value]) => {
      if (value !== undefined) {
        this.config[key] = value;
        this.sources.set(key, ConfigSource.DEFAULT);
      }
    });
  }

  /**
   * Load configuration from all sources
   */
  async load(): Promise<void> {
    try {
      // Load in priority order: defaults (already loaded) -> file -> env -> cli
      await this.loadFromFile();
      this.loadFromEnvironment();
      this.loadFromCliArgs();

      // Validate the final configuration
      this.validate();

      // Set up file watching if enabled
      if (this.options.enableFileWatching && this.options.configFile) {
        this.setupFileWatching();
      }
    } catch (error) {
      // Re-throw validation errors, but handle other errors gracefully
      if (error instanceof ConfigValidationError) {
        throw error;
      }
      throw new ConfigValidationError(
        `Failed to load configuration: ${error.message}`
      );
    }
  }

  /**
   * Load configuration from file
   */
  private async loadFromFile(): Promise<void> {
    const configFile = this.options.configFile;
    if (!configFile || !existsSync(configFile)) {
      return;
    }

    try {
      const content = await readFile(configFile, 'utf-8');
      const ext = extname(configFile).toLowerCase();

      let fileConfig: any;
      if (ext === '.json') {
        fileConfig = JSON.parse(content);
      } else if (ext === '.yaml' || ext === '.yml') {
        fileConfig = yamlLoad(content);
      } else {
        throw new Error(`Unsupported config file format: ${ext}`);
      }

      // Merge file config with priority
      Object.entries(fileConfig).forEach(([key, value]) => {
        if (
          !this.sources.has(key) ||
          this.sources.get(key) === ConfigSource.DEFAULT
        ) {
          this.config[key] = value;
          this.sources.set(key, ConfigSource.FILE);
        }
      });
    } catch (error) {
      throw new ConfigValidationError(
        `Failed to load config file: ${error.message}`
      );
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): void {
    Object.entries(ENV_MAPPINGS).forEach(([envKey, configKey]) => {
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        let parsedValue: any = envValue;

        // Type conversion for known keys
        if (configKey === 'port' || configKey === 'maxRetries') {
          parsedValue = parseInt(envValue, 10);
        } else if (configKey === 'enableFileWatching') {
          parsedValue = envValue.toLowerCase() === 'true';
        }

        // Override if not from CLI or if default
        const currentSource = this.sources.get(configKey);
        if (
          !currentSource ||
          currentSource === ConfigSource.DEFAULT ||
          currentSource === ConfigSource.FILE
        ) {
          this.config[configKey] = parsedValue;
          this.sources.set(configKey, ConfigSource.ENV);
        }
      }
    });
  }

  /**
   * Load configuration from CLI arguments
   */
  private loadFromCliArgs(): void {
    if (!this.options.cliArgs) {
      return;
    }

    Object.entries(this.options.cliArgs).forEach(([key, value]) => {
      if (value !== undefined) {
        this.config[key] = value;
        this.sources.set(key, ConfigSource.CLI);
      }
    });
  }

  /**
   * Validate configuration against schema
   */
  private validate(): void {
    try {
      // Validate each known field
      Object.entries(this.config).forEach(([key, value]) => {
        if (key in ConfigSchema && value !== undefined) {
          ConfigSchema[key as keyof typeof ConfigSchema].parse(value);
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`
        );
        throw new ConfigValidationError(
          `Validation failed: ${issues.join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Set up file watching for configuration changes
   */
  private setupFileWatching(): void {
    if (!this.options.configFile || this.isWatching) {
      return;
    }

    try {
      this.isWatching = true;
      watchFile(this.options.configFile, { interval: 50 }, async () => {
        try {
          // Clear file-based config and reload
          const fileKeys = Array.from(this.sources.entries())
            .filter(([, source]) => source === ConfigSource.FILE)
            .map(([key]) => key);

          fileKeys.forEach((key) => {
            this.sources.delete(key);
            // Reset to default if available
            if (
              key in DEFAULT_CONFIG &&
              DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG] !== undefined
            ) {
              this.config[key] =
                DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
              this.sources.set(key, ConfigSource.DEFAULT);
            } else {
              delete this.config[key];
            }
          });

          await this.loadFromFile();
          this.validate();
        } catch (error) {
          // Silently ignore reload errors in production
        }
      });
    } catch (error) {
      // Silently ignore file watching setup errors in production
    }
  }

  /**
   * Get configuration value
   */
  get<T = any>(key: string, defaultValue?: T): T {
    const value = this.config[key];
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set configuration value with validation
   */
  set(key: string, value: any): void {
    // Validate if it's a known schema field
    if (key in ConfigSchema) {
      try {
        ConfigSchema[key as keyof typeof ConfigSchema].parse(value);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ConfigValidationError(
            `Invalid value for ${key}: ${error.issues[0].message}`
          );
        }
        throw error;
      }
    }

    this.config[key] = value;
    this.sources.set(key, ConfigSource.CLI); // Manual sets are treated as CLI priority
  }

  /**
   * Get all configuration as object
   */
  getAll(): ConfigData {
    return { ...this.config };
  }

  /**
   * Typed helper methods
   */
  getPort(): number {
    return this.get('port', DEFAULT_CONFIG.port);
  }

  getLogLevel(): LogLevel {
    return this.get('logLevel', DEFAULT_CONFIG.logLevel);
  }

  getTransportMode(): TransportMode {
    return this.get('transportMode', DEFAULT_CONFIG.transportMode);
  }

  getTallyApiKey(): string | undefined {
    return this.get('tallyApiKey');
  }

  getTallyApiUrl(): string {
    return this.get('tallyApiUrl', DEFAULT_CONFIG.tallyApiUrl);
  }

  getMaxRetries(): number {
    return this.get('maxRetries', DEFAULT_CONFIG.maxRetries);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.options.configFile && this.isWatching) {
      try {
        unwatchFile(this.options.configFile);
        this.isWatching = false;
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}
