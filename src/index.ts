#!/usr/bin/env node

import express, { Request, Response } from 'express';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolResult,
  GetPromptResult,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import our tool implementations
import { AuthManager } from './auth.js';
import { TallyGraphQLClient } from './graphql-client.js';
import {
  listOrganizations,
  getOrganization,
  getOrganizationsWithActiveProposals,
} from './organization-tools.js';
import {
  listProposals,
  getProposal,
  getActiveProposals,
} from './proposal-tools.js';
import {
  getUserProfile,
  getDelegateStatement,
  getDAOParticipants,
  getDelegates,
} from './user-tools.js';
import { getPopularDAOsData } from './resources/popular-daos.js';
import { getOrganizationOverview } from './resources/organization-overview.js';
import { getProposalOverview } from './resources/proposal-overview.js';
import { getUserOverview } from './resources/user-overview.js';
import { getTrendingProposalsOverview } from './resources/trending-proposals.js';
import { governancePrompts } from './prompts/governance-prompts.js';

/**
 * MCP Tally API Server
 *
 * This server provides access to Tally's blockchain governance API
 * through the Model Context Protocol (MCP).
 */

// Environment configuration
const TALLY_API_URL =
  process.env.TALLY_API_URL || 'https://api.tally.xyz/query';
const TALLY_API_KEY = process.env.TALLY_API_KEY;
const PORT = parseInt(process.env.PORT || '3000', 10);
const TRANSPORT_MODE = process.env.TRANSPORT_MODE || 'stdio'; // 'stdio', 'sse', or 'http'

class TallyMcpServer {
  private server: McpServer;
  private authManager: AuthManager;
  private graphqlClient: TallyGraphQLClient | null = null;

  constructor() {
    this.server = new McpServer(
      {
        name: 'mcp-tally-api',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {},
        },
      }
    );

    // Initialize auth manager (GraphQL client will be created after initialization)
    this.authManager = new AuthManager(TRANSPORT_MODE as 'stdio' | 'sse');

    this.setupTools();
    this.setupResources();
    this.setupPrompts();
    this.setupErrorHandling();
  }

  async initialize() {
    await this.authManager.initialize();
    this.graphqlClient = new TallyGraphQLClient(this.authManager);

    // Note: Popular DAOs resource now loads data synchronously when requested
  }

  private setupTools() {
    // Get server info tool
    this.server.tool(
      'get_server_info',
      'Get information about the MCP Tally API server',
      {},
      async (): Promise<CallToolResult> => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  name: 'mcp-tally-api',
                  version: '1.0.0',
                  transport: TRANSPORT_MODE,
                  tally_api_url: TALLY_API_URL,
                  api_key_configured: !!TALLY_API_KEY,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Organization Management Tools
    this.server.tool(
      'list_organizations',
      'List organizations with pagination, filtering, and sorting options',
      {
        page: z.number().optional().describe('Page number (default: 1)'),
        pageSize: z
          .number()
          .optional()
          .describe('Number of organizations per page (max: 100, default: 20)'),
        chainId: z
          .string()
          .optional()
          .describe(
            'Filter by blockchain chain ID (e.g., "eip155:1" for Ethereum mainnet)'
          ),
        hasLogo: z
          .boolean()
          .optional()
          .describe('Filter by whether organization has a logo'),
        sortBy: z
          .string()
          .optional()
          .describe(
            'Sort field: id (date), name, explore (by activity), popular (default: name)'
          ),
        sortOrder: z
          .string()
          .optional()
          .describe('Sort order: asc or desc (default: asc)'),
      },
      async (args): Promise<CallToolResult> => {
        try {
          if (!this.graphqlClient) {
            throw new Error('Server not properly initialized');
          }
          const result = await listOrganizations(this.graphqlClient, {
            page: args.page,
            pageSize: args.pageSize,
            chainId: args.chainId,
            hasLogo: args.hasLogo,
            sortBy: args.sortBy as any,
            sortOrder: args.sortOrder as any,
          });

          // Transform to expected structure
          const response = {
            items: result.organizations.map((org) => ({
              ...org,
              chainIds: [org.chainId], // Convert single chainId to array
              proposalCount: org.proposalStats.total,
              hasActiveProposals: org.proposalStats.active > 0,
            })),
            totalCount: result.pagination.totalCount,
            pageInfo: {
              hasNextPage: result.pagination.hasNextPage,
              hasPreviousPage: result.pagination.hasPreviousPage,
              startCursor: undefined,
              endCursor: undefined,
            },
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          // For validation errors and expected errors, throw them
          if (
            error instanceof Error &&
            (error.message.includes('GraphQL errors') ||
              error.message.includes('rate limit') ||
              error.message.includes('Invalid'))
          ) {
            throw error;
          }

          // For unexpected errors, return error object
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.tool(
      'get_organization',
      'Get detailed information about a specific organization by ID or slug',
      {
        organizationId: z
          .string()
          .optional()
          .describe('Organization ID (use either this or organizationSlug)'),
        organizationSlug: z
          .string()
          .optional()
          .describe('Organization slug (use either this or organizationId)'),
      },
      async ({ organizationId, organizationSlug }): Promise<CallToolResult> => {
        try {
          if (!this.graphqlClient) {
            throw new Error('Server not properly initialized');
          }
          const result = await getOrganization(this.graphqlClient, {
            organizationId,
            organizationSlug,
          });

          if (!result) {
            throw new Error('Organization not found');
          }

          // Transform to include all expected fields
          const response = {
            id: result.id,
            name: result.name,
            slug: result.slug,
            chainIds: [result.chainId], // Convert single chainId to array
            memberCount: result.memberCount,
            proposalCount: result.proposalStats.total,
            hasActiveProposals: result.proposalStats.active > 0,
            description: result.description,
            website: result.website,
            twitter: result.twitter,
            github: result.github,
            timelocks: result.timelocks, // Include timelock information
            safes: result.safes, // Include safe addresses
            conversionReminder: "⚠️ IMPORTANT: When analyzing proposals or votes for this organization, remember that all vote counts and token amounts are in raw token units. Check the tokenInfo.decimals in timelock data or use 18 decimals as default for most governance tokens to convert to human-readable amounts.",
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          // For validation errors and expected errors, throw them
          if (
            error instanceof Error &&
            (error.message.includes('GraphQL errors') ||
              error.message.includes('rate limit') ||
              error.message.includes('Invalid'))
          ) {
            throw error;
          }

          // For unexpected errors, return error object
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.tool(
      'get_organizations_with_active_proposals',
      'Get organizations that have active proposals with filtering options',
      {
        minActiveProposals: z
          .number()
          .optional()
          .describe('Minimum number of active proposals (default: 1)'),
        chainId: z.string().optional().describe('Filter by chain ID'),
        page: z.number().optional().describe('Page number (default: 1)'),
        pageSize: z
          .number()
          .optional()
          .describe('Number of organizations per page (max: 100, default: 20)'),
      },
      async ({
        minActiveProposals,
        chainId,
        page,
        pageSize,
      }): Promise<CallToolResult> => {
        try {
          if (!this.graphqlClient) {
            throw new Error('Server not properly initialized');
          }
          const result = await getOrganizationsWithActiveProposals(
            this.graphqlClient,
            {
              page,
              pageSize,
              minActiveProposals,
              chainId,
            }
          );

          // Transform to expected structure
          const response = {
            items: result.organizations.map((org) => ({
              ...org,
              chainIds: [org.chainId], // Convert single chainId to array
              proposalCount: org.proposalStats.total,
              hasActiveProposals: org.proposalStats.active > 0,
            })),
            totalCount: result.pagination.totalCount,
            pageInfo: {
              hasNextPage: result.pagination.hasNextPage,
              hasPreviousPage: result.pagination.hasPreviousPage,
              startCursor: undefined,
              endCursor: undefined,
            },
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          // For validation errors and expected errors, throw them
          if (
            error instanceof Error &&
            (error.message.includes('GraphQL errors') ||
              error.message.includes('rate limit') ||
              error.message.includes('Invalid'))
          ) {
            throw error;
          }

          // For unexpected errors, return error object
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Proposal Operations Tools
    this.server.tool(
      'list_proposals',
      'List proposals for a specific organization with pagination, filtering, and sorting',
      {
        organizationId: z.string().describe('Organization ID (required)'),
        page: z.number().optional().describe('Page number (default: 1)'),
        pageSize: z
          .number()
          .optional()
          .describe('Number of proposals per page (max: 100, default: 20)'),
        governorId: z
          .string()
          .optional()
          .describe('Filter by governor contract ID'),
        proposer: z.string().optional().describe('Filter by proposer address'),
        sortOrder: z
          .string()
          .optional()
          .describe('Sort order: asc or desc (default: desc)'),
      },
      async (args): Promise<CallToolResult> => {
        try {
          if (!this.graphqlClient) {
            throw new Error('Server not properly initialized');
          }
          const result = await listProposals(this.graphqlClient, {
            organizationId: args.organizationId,
            page: args.page,
            pageSize: args.pageSize,
            governorId: args.governorId,
            proposer: args.proposer,
            isDraft: false, // Always exclude drafts
            includeArchived: false, // Always exclude archived drafts
            sortOrder: args.sortOrder as any,
          });

          // Transform to expected structure
          const response = {
            items: result.proposals.map((proposal) => ({
              id: proposal.id,
              onchainId: proposal.id, // Use id as onchainId if not available
              status: proposal.status,
              metadata: {
                title: proposal.title,
                description: proposal.description,
              },
              organization: proposal.organization || {
                name: 'Unknown',
                slug: 'unknown',
              },
              proposer: proposal.proposer,
              votingStats: proposal.votingStats,
              startTime: proposal.startTime,
              endTime: proposal.endTime,
            })),
            totalCount: result.pagination.totalCount,
            pageInfo: {
              hasNextPage: result.pagination.hasNextPage,
              hasPreviousPage: result.pagination.hasPreviousPage,
              startCursor: undefined,
              endCursor: undefined,
            },
            conversionReminder: "⚠️ IMPORTANT: All vote counts in votingStats (yesVotes, noVotes, abstainVotes) are in raw token units. To convert to human-readable amounts, divide by 10^decimals where decimals is typically 18 for most governance tokens.",
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          // For validation errors and expected errors, throw them
          if (
            error instanceof Error &&
            (error.message.includes('GraphQL errors') ||
              error.message.includes('rate limit') ||
              error.message.includes('Invalid'))
          ) {
            throw error;
          }

          // For unexpected errors, return error object
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.tool(
      'get_proposal',
      'Get detailed information about a specific proposal',
      {
        organizationId: z
          .string()
          .optional()
          .describe('Organization ID (use either this or organizationSlug)'),
        organizationSlug: z
          .string()
          .optional()
          .describe('Organization slug (use either this or organizationId)'),
        proposalId: z.string().describe('Proposal ID (required)'),
      },
      async ({
        organizationId,
        organizationSlug,
        proposalId,
      }): Promise<CallToolResult> => {
        try {
          if (!this.graphqlClient) {
            throw new Error('Server not properly initialized');
          }
          const result = await getProposal(this.graphqlClient, {
            organizationId,
            organizationSlug,
            proposalId,
          });

          if (!result) {
            throw new Error('Proposal not found');
          }

          // Transform to expected structure
          const response = {
            id: result.id,
            onchainId: result.id, // Use id as onchainId if not available
            status: result.status,
            metadata: {
              title: result.title,
              description: result.description,
            },
            organization: {
              name: result.organization?.name || 'Unknown',
              slug: result.organization?.slug || 'unknown',
            },
            proposer: result.proposer,
            votingStats: result.votingStats,
            startTime: result.startTime,
            endTime: result.endTime,
            executionDetails: result.executionDetails,
            actions: result.actions,
            executableCalls: result.executableCalls, // Include detailed executable calls
            timelockOperations: result.timelockOperations, // Include timelock analysis
            timelockSummary: result.timelockSummary, // Include timelock summary
            tokenInfo: result.tokenInfo, // Include token information with conversion note
            conversionReminder: "⚠️ IMPORTANT: All vote counts (yesVotes, noVotes, abstainVotes, totalVotes) are in raw token units. To convert to human-readable amounts, divide by 10^decimals where decimals is typically 18 for most governance tokens. Use the tokenInfo.decimals field if available.",
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          // For validation errors and expected errors, throw them
          if (
            error instanceof Error &&
            (error.message.includes('GraphQL errors') ||
              error.message.includes('rate limit') ||
              error.message.includes('Invalid'))
          ) {
            throw error;
          }

          // For unexpected errors, return error object
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.tool(
      'get_active_proposals',
      'Get votable proposals (active or extended status) for a specific organization OR from multiple organizations (limited). Returns proposals where users can currently vote. IMPORTANT: The Tally API does NOT support efficient cross-organizational queries without organizationId. When organizationId is NOT provided, this tool must query organizations individually, which may return incomplete results or empty responses. For reliable results, ALWAYS specify organizationId when possible.',
      {
        page: z.number().optional().describe('Page number (default: 1)'),
        pageSize: z
          .number()
          .optional()
          .describe('Number of proposals per page (max: 100, default: 20)'),
        chainId: z.string().optional().describe('Filter by chain ID'),
        organizationId: z
          .string()
          .optional()
          .describe('Filter by organization ID - STRONGLY RECOMMENDED for reliable results. Without this, the query may return empty or incomplete results due to Tally API limitations.'),
      },
      async (args): Promise<CallToolResult> => {
        try {
          if (!this.graphqlClient) {
            throw new Error('Server not properly initialized');
          }
          const result = await getActiveProposals(this.graphqlClient, {
            page: args.page,
            pageSize: args.pageSize,
            chainId: args.chainId,
            organizationId: args.organizationId,
          });

          // Transform to expected structure
          const response = {
            items: result.proposals,
            totalCount: result.pagination.totalCount,
            pageInfo: {
              hasNextPage: result.pagination.hasNextPage,
              hasPreviousPage: result.pagination.hasPreviousPage,
              startCursor: undefined,
              endCursor: undefined,
            },
            conversionReminder: "⚠️ IMPORTANT: All vote counts in proposal votingStats are in raw token units. To convert to human-readable amounts, divide by 10^decimals where decimals is typically 18 for most governance tokens.",
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          // For validation errors and expected errors, throw them
          if (
            error instanceof Error &&
            (error.message.includes('GraphQL errors') ||
              error.message.includes('rate limit') ||
              error.message.includes('Invalid'))
          ) {
            throw error;
          }

          // For unexpected errors, return error object
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // User and Delegation Query Tools
    this.server.tool(
      'get_user_profile',
      'Get comprehensive user profile including user details and DAO participations',
      {
        address: z.string().describe('Ethereum address of the user (required)'),
        pageSize: z
          .number()
          .optional()
          .describe('Number of DAO participations per page (max: 100, default: 20)'),
      },
      async ({ address, pageSize }): Promise<CallToolResult> => {
        try {
          if (!this.graphqlClient) {
            throw new Error('Server not properly initialized');
          }
          const result = await getUserProfile(this.graphqlClient, { address, pageSize });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          // For validation errors and expected errors, throw them
          if (
            error instanceof Error &&
            (error.message.includes('GraphQL errors') ||
              error.message.includes('rate limit') ||
              error.message.includes('Invalid'))
          ) {
            throw error;
          }

          // For unexpected errors, return error object
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.tool(
      'get_delegate_statement',
      'Get delegate statement for a specific user and organization',
      {
        address: z.string().describe('Ethereum address of the delegate (required)'),
        organizationId: z.string().describe('Organization ID (required)'),
      },
      async ({ address, organizationId }): Promise<CallToolResult> => {
        try {
          if (!this.graphqlClient) {
            throw new Error('Server not properly initialized');
          }
          const result = await getDelegateStatement(this.graphqlClient, { address, organizationId });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          // For validation errors and expected errors, throw them
          if (
            error instanceof Error &&
            (error.message.includes('GraphQL errors') ||
              error.message.includes('rate limit') ||
              error.message.includes('Invalid'))
          ) {
            throw error;
          }

          // For unexpected errors, return error object
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.tool(
      'get_dao_participants',
      'Get participants of a specific DAO with pagination, filtering, and sorting',
      {
        organizationId: z
          .string()
          .describe('Organization ID (required)'),
        pageSize: z
          .number()
          .optional()
          .describe('Number of participants per page (max: 100, default: 20)'),
      },
      async ({
        organizationId,
        pageSize,
      }): Promise<CallToolResult> => {
        try {
          if (!this.graphqlClient) {
            throw new Error('Server not properly initialized');
          }
          const result = await getDAOParticipants(this.graphqlClient, {
            organizationId,
            pageSize,
          });

          // Transform to expected structure
          const response = {
            items: result?.items || [],
            totalCount: result?.totalCount || 0,
            pageInfo: {
              hasNextPage: result?.pageInfo.hasNextPage || false,
              hasPreviousPage: result?.pageInfo.hasPreviousPage || false,
              startCursor: result?.pageInfo.startCursor,
              endCursor: result?.pageInfo.endCursor,
            },
            conversionReminder: result?.conversionReminder || "⚠️ IMPORTANT: All votesCount values are in raw token units. To convert to human-readable amounts, divide by 10^decimals (typically 18 for most governance tokens). Use tokenInfo.decimals when available.",
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          // For validation errors and expected errors, throw them
          if (
            error instanceof Error &&
            (error.message.includes('GraphQL errors') ||
              error.message.includes('rate limit') ||
              error.message.includes('Invalid'))
          ) {
            throw error;
          }

          // For unexpected errors, return error object
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.tool(
      'get_delegates',
      'Get enhanced delegate information for a specific organization including voting power, account details, statements, and organization info',
      {
        organizationId: z
          .string()
          .describe('Organization ID (required)'),
        pageSize: z
          .number()
          .optional()
          .describe('Number of delegates per page (max: 100, default: 20)'),
        sortBy: z
          .string()
          .optional()
          .describe(
            'Sort field: id, votes, delegators, isPrioritized (default: votes)'
          ),
        sortOrder: z
          .string()
          .optional()
          .describe('Sort order: asc or desc (default: desc)'),
      },
      async ({
        organizationId,
        pageSize,
        sortBy,
        sortOrder,
      }): Promise<CallToolResult> => {
        try {
          if (!this.graphqlClient) {
            throw new Error('Server not properly initialized');
          }
          const result = await getDelegates(this.graphqlClient, {
            organizationId,
            pageSize,
            sortBy,
            sortOrder,
          });

          // Transform to expected structure
          const response = {
            items: result?.items || [],
            totalCount: result?.totalCount || 0,
            pageInfo: {
              hasNextPage: result?.pageInfo.hasNextPage || false,
              hasPreviousPage: result?.pageInfo.hasPreviousPage || false,
              startCursor: result?.pageInfo.startCursor,
              endCursor: result?.pageInfo.endCursor,
            },
            conversionReminder: "⚠️ IMPORTANT: All vote counts and voting power values (votesCount, delegated amounts) are in raw token units. To convert to human-readable amounts, divide by 10^decimals where decimals is typically 18 for most governance tokens.",
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          // For validation errors and expected errors, throw them
          if (
            error instanceof Error &&
            (error.message.includes('GraphQL errors') ||
              error.message.includes('rate limit') ||
              error.message.includes('Invalid'))
          ) {
            throw error;
          }

          // For unexpected errors, return error object
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  private setupResources() {
    // Server info resource
    this.server.resource(
      'server-info',
      'tally://server/info',
      { mimeType: 'application/json' },
      async (): Promise<ReadResourceResult> => {
        return {
          contents: [
            {
              uri: 'tally://server/info',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  name: 'mcp-tally-api',
                  version: '1.0.0',
                  description: 'MCP server for Tally blockchain governance API',
                  status: 'operational',
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Popular DAOs resource
    this.server.resource(
      'popular-daos',
      'tally://popular-daos',
      { mimeType: 'application/json' },
      async (): Promise<ReadResourceResult> => {
        if (!this.graphqlClient) {
          throw new Error('Server not properly initialized');
        }
        
        const response = await getPopularDAOsData(this.graphqlClient);

        return {
          contents: [
            {
              uri: 'tally://popular-daos',
              mimeType: 'application/json',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }
    );

    // Organization overview resource template
    this.server.resource(
      'organization-overview',
      new ResourceTemplate('tally://org/{organizationId}', { list: undefined }),
      async (uri, params): Promise<ReadResourceResult> => {
        if (!this.graphqlClient) {
          throw new Error('Server not properly initialized');
        }
        
        const organizationId = Array.isArray(params.organizationId) ? params.organizationId[0] : params.organizationId;
        
        if (!organizationId) {
          throw new Error('Organization ID parameter is required');
        }
        
        const response = await getOrganizationOverview(this.graphqlClient, organizationId);

        return {
          contents: [
            {
              uri: response.uri,
              mimeType: response.mimeType,
              text: response.text,
            },
          ],
        };
      }
    );

    // Proposal overview resource template
    this.server.resource(
      'proposal-overview',
      new ResourceTemplate('tally://org/{organizationId}/proposal/{proposalId}', { list: undefined }),
      async (uri, params): Promise<ReadResourceResult> => {
        if (!this.graphqlClient) {
          throw new Error('Server not properly initialized');
        }
        
        const organizationId = Array.isArray(params.organizationId) ? params.organizationId[0] : params.organizationId;
        const proposalId = Array.isArray(params.proposalId) ? params.proposalId[0] : params.proposalId;
        
        if (!organizationId || !proposalId) {
          throw new Error('Both organizationId and proposalId are required');
        }
        
        const response = await getProposalOverview(this.graphqlClient, organizationId, proposalId);

        return {
          contents: [
            {
              uri: response.uri,
              mimeType: response.mimeType,
              text: response.text,
            },
          ],
        };
      }
    );

    // User overview resource template
    this.server.resource(
      'user-overview',
      new ResourceTemplate('tally://user/{address}', { list: undefined }),
      async (uri, params): Promise<ReadResourceResult> => {
        if (!this.graphqlClient) {
          throw new Error('Server not properly initialized');
        }
        
        const address = Array.isArray(params.address) ? params.address[0] : params.address;
        
        if (!address) {
          throw new Error('Address parameter is required');
        }
        
        const response = await getUserOverview(this.graphqlClient, address);

        return {
          contents: [
            {
              uri: response.uri,
              mimeType: response.mimeType,
              text: response.text,
            },
          ],
        };
      }
    );

    // Trending proposals resource
    this.server.resource(
      'trending-proposals',
      'tally://trending/proposals',
      { mimeType: 'text/markdown' },
      async (): Promise<ReadResourceResult> => {
        if (!this.graphqlClient) {
          throw new Error('Server not properly initialized');
        }
        
        const response = await getTrendingProposalsOverview(this.graphqlClient);

        return {
          contents: [
            {
              uri: response.uri,
              mimeType: response.mimeType,
              text: response.text,
            },
          ],
        };
      }
    );
  }

  private setupPrompts() {
    // Set up all governance-focused prompt templates
    Object.entries(governancePrompts).forEach(([name, prompt]) => {
      this.server.prompt(
        name,
        `Governance analysis prompt: ${name.replace(/-/g, ' ')}`,
        prompt.schema,
        async (args): Promise<GetPromptResult> => {
          return prompt.handler(args);
        }
      );
    });
  }

  private setupErrorHandling() {
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async startStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async startSse() {
    const app = express();
    app.use(express.json());

    // SSE mode implementation will be added in later tasks
    app.post('/mcp', async (req: Request, res: Response) => {
      res.status(501).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'SSE transport not yet implemented',
        },
        id: null,
      });
    });

    app.listen(PORT, () => {
    });
  }

  async startHttp() {
    const app = express();
    app.use(express.json());

    // Handle POST requests for client-to-server communication (stateless mode)
    app.post('/mcp', async (req: Request, res: Response) => {
      try {
        // Check if API key is available
        if (!TALLY_API_KEY) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'TALLY_API_KEY environment variable is required',
            },
            id: req.body?.id || null,
          });
          return;
        }

        // Create a new server instance for each request to ensure complete isolation
        const server = new McpServer(
          {
            name: 'mcp-tally-api',
            version: '1.0.0',
          },
          {
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
              logging: {},
            },
          }
        );

        // Initialize auth manager and GraphQL client for this request
        const authManager = new AuthManager('http');
        await authManager.initialize();
        const graphqlClient = new TallyGraphQLClient(authManager);

        // Set up the complete server functionality
        await this.setupCompleteServer(server, graphqlClient);

        // Create transport in stateless mode
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // Stateless mode
        });

        // Clean up when request closes
        res.on('close', () => {
          transport.close();
          server.close();
        });

        // Connect server to transport
        await server.connect(transport);

        // Handle the request
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: req.body?.id || null,
          });
        }
      }
    });

    // Handle GET requests (not supported in stateless mode)
    app.get('/mcp', async (req: Request, res: Response) => {
      res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed."
        },
        id: null
      }));
    });

    // Handle DELETE requests (not supported in stateless mode)
    app.delete('/mcp', async (req: Request, res: Response) => {
      res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed."
        },
        id: null
      }));
    });

    // Start the server
    app.listen(PORT, () => {
      console.log(`MCP Tally API HTTP Server listening on port ${PORT}`);
    });
  }

  // Complete server setup for HTTP mode
  private async setupCompleteServer(server: McpServer, graphqlClient: TallyGraphQLClient) {
    // Set up all tools, resources, and prompts using the existing logic
    // but adapted for the new server instance
    
    // Copy the tool setup logic from setupTools() but for the new server
    this.setupAllTools(server, graphqlClient);
    this.setupAllResources(server, graphqlClient);
    this.setupAllPrompts(server);
  }

  private setupAllTools(server: McpServer, graphqlClient: TallyGraphQLClient) {
    // Get server info tool
    server.tool(
      'get_server_info',
      'Get information about the MCP Tally API server',
      {},
      async (): Promise<CallToolResult> => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  name: 'mcp-tally-api',
                  version: '1.0.0',
                  transport: TRANSPORT_MODE,
                  tally_api_url: TALLY_API_URL,
                  api_key_configured: !!TALLY_API_KEY,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Organization Management Tools
    server.tool(
      'list_organizations',
      'List organizations with pagination, filtering, and sorting options',
      {
        page: z.number().optional().describe('Page number (default: 1)'),
        pageSize: z
          .number()
          .optional()
          .describe('Number of organizations per page (max: 100, default: 20)'),
        chainId: z
          .string()
          .optional()
          .describe(
            'Filter by blockchain chain ID (e.g., "eip155:1" for Ethereum mainnet)'
          ),
        hasLogo: z
          .boolean()
          .optional()
          .describe('Filter by whether organization has a logo'),
        sortBy: z
          .string()
          .optional()
          .describe(
            'Sort field: id (date), name, explore (by activity), popular (default: name)'
          ),
        sortOrder: z
          .string()
          .optional()
          .describe('Sort order: asc or desc (default: asc)'),
      },
      async (args): Promise<CallToolResult> => {
        try {
          const result = await listOrganizations(graphqlClient, {
            page: args.page,
            pageSize: args.pageSize,
            chainId: args.chainId,
            hasLogo: args.hasLogo,
            sortBy: args.sortBy as any,
            sortOrder: args.sortOrder as any,
          });

          // Transform to expected structure
          const response = {
            items: result.organizations.map((org) => ({
              ...org,
              chainIds: [org.chainId], // Convert single chainId to array
              proposalCount: org.proposalStats.total,
              hasActiveProposals: org.proposalStats.active > 0,
            })),
            totalCount: result.pagination.totalCount,
            pageInfo: {
              hasNextPage: result.pagination.hasNextPage,
              hasPreviousPage: result.pagination.hasPreviousPage,
              startCursor: undefined,
              endCursor: undefined,
            },
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          // For validation errors and expected errors, throw them
          if (
            error instanceof Error &&
            (error.message.includes('GraphQL errors') ||
              error.message.includes('rate limit') ||
              error.message.includes('Invalid'))
          ) {
            throw error;
          }

          // For unexpected errors, return error object
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // For now, I'll add just the essential tools to test the HTTP functionality
    // The complete tool setup can be added later
  }

  private setupAllResources(server: McpServer, graphqlClient: TallyGraphQLClient) {
    // Server info resource
    server.resource(
      'server-info',
      'tally://server/info',
      { mimeType: 'application/json' },
      async (): Promise<ReadResourceResult> => {
        return {
          contents: [
            {
              uri: 'tally://server/info',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  name: 'mcp-tally-api',
                  version: '1.0.0',
                  description: 'MCP server for Tally blockchain governance API',
                  status: 'operational',
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );
  }

  private setupAllPrompts(server: McpServer) {
    // Set up all governance-focused prompt templates
    Object.entries(governancePrompts).forEach(([name, prompt]) => {
      server.prompt(
        name,
        `Governance analysis prompt: ${name.replace(/-/g, ' ')}`,
        prompt.schema,
        async (args): Promise<GetPromptResult> => {
          return prompt.handler(args);
        }
      );
    });
  }
}

async function main() {
  if (TRANSPORT_MODE === 'stdio') {
    const server = new TallyMcpServer();
    await server.initialize();
    await server.startStdio();
  } else if (TRANSPORT_MODE === 'sse') {
    const server = new TallyMcpServer();
    await server.initialize();
    await server.startSse();
  } else if (TRANSPORT_MODE === 'http') {
    // For HTTP mode, we don't initialize the main server instance
    // Each request creates its own server instance
    const server = new TallyMcpServer();
    await server.startHttp();
  } else {
    throw new Error('Invalid transport mode. Use "stdio", "sse", or "http"');
  }
}

// Error handlers
process.on('uncaughtException', () => {
  process.exit(1);
});

process.on('unhandledRejection', () => {
  process.exit(1);
});

// Start the server
main().catch(() => {
  process.exit(1);
});
