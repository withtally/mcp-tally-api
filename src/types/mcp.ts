// MCP Server Types for Tally API

export interface McpServerConfig {
  name: string;
  version: string;
  tally: {
    apiUrl: string;
    apiKey?: string; // For stdio mode
  };
  transport: {
    type: 'stdio' | 'sse';
    port?: number; // For SSE mode
  };
}

export interface AuthConfig {
  mode: 'stdio' | 'sse';
  apiKey?: string;
}

export interface TallyApiError {
  code: string;
  message: string;
  extensions?: Record<string, unknown>;
}

export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

// Tool parameter types
export interface OrganizationFilters {
  hasActiveProposals?: boolean;
  chainId?: string;
  hasLogo?: boolean;
}

export interface ProposalFilters {
  organizationId?: string;
  governorId?: string;
  status?: string;
}

export interface UserFilters {
  address: string;
  organizationId?: string;
  governorId?: string;
}

export interface VoteFilters {
  proposalId?: string;
  proposalIds?: string[];
  voter?: string;
  includePendingVotes?: boolean;
  type?: string;
}

export interface DelegateFilters {
  organizationId?: string;
  governorId?: string;
  hasVotes?: boolean;
  hasDelegators?: boolean;
  isSeekingDelegation?: boolean;
}

// Tool result types
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    totalCount?: number;
    hasNextPage?: boolean;
    cursor?: string;
  };
}

// Resource types
export interface ResourceMetadata {
  lastUpdated: string;
  version: string;
  count?: number;
}

export interface OrganizationDirectory {
  organizations: Array<{
    id: string;
    slug: string;
    name: string;
    chainIds: string[];
    hasActiveProposals: boolean;
  }>;
  metadata: ResourceMetadata;
}

export interface ChainDirectory {
  chains: Array<{
    id: string;
    name: string;
    shortName: string;
    isTestnet: boolean;
  }>;
  metadata: ResourceMetadata;
}

// Query template types
export interface QueryTemplate {
  name: string;
  description: string;
  query: string;
  variables?: Record<string, unknown>;
  example?: {
    description: string;
    parameters: Record<string, unknown>;
  };
}
