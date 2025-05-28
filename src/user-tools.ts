/**
 * User and Delegation Query Tools
 *
 * This module provides tools for querying user data and delegation
 * information from the Tally API, including user DAO participations,
 * DAO participants, user details, and delegate information.
 */

import { z } from 'zod';
import { TallyGraphQLClient } from './graphql-client';
import { ValidationError } from './errors';

// Input validation schemas
export const GetUserDAOsInputSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  pageSize: z.number().int().positive().max(100).optional().default(20),
});

export const GetDAOParticipantsInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
  page: z.number().int().positive().optional().default(1),
});

export const GetUserDetailsInputSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
});

export const GetDelegatesInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
  sortBy: z
    .enum(['id', 'votes', 'delegators', 'isPrioritized'])
    .optional()
    .default('votes'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// New input validation schemas for combined tools
export const GetUserProfileInputSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  pageSize: z.number().int().positive().max(100).optional().default(20),
});

export const GetDelegateStatementInputSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  organizationId: z.string().trim().min(1),
});

// Type definitions
export type GetUserDAOsInput = z.infer<typeof GetUserDAOsInputSchema>;
export type GetDAOParticipantsInput = z.infer<typeof GetDAOParticipantsInputSchema>;
export type GetUserDetailsInput = z.infer<typeof GetUserDetailsInputSchema>;
export type GetDelegatesInput = z.infer<typeof GetDelegatesInputSchema>;
export type GetUserProfileInput = z.infer<typeof GetUserProfileInputSchema>;
export type GetDelegateStatementInput = z.infer<typeof GetDelegateStatementInputSchema>;

export interface UserDAOParticipation {
  id: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  token: {
    symbol: string;
  };
  votes: string;
}

export interface DAOParticipant {
  id: string;
  delegatorsCount: number;
  account: {
    address: string;
    name: string;
  };
}

export interface DelegateStatement {
  statement: string;
  statementSummary?: string;
  isSeekingDelegation: boolean;
}

export interface UserDelegateParticipation {
  id: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  statement?: DelegateStatement;
  votesCount: string;
  delegatorsCount: number;
}

export interface UserDetails {
  id: string;
  address: string;
  name: string;
  bio: string;
  twitter: string;
  ens?: string;
  picture?: string;
  delegateParticipations: UserDelegateParticipation[];
}

export interface DelegateInfo {
  id: string;
  delegatorsCount: number;
  votesCount: string;
  isPrioritized: boolean;
  chainId?: string;
  account: {
    id: string;
    address: string;
    name: string;
    ens?: string;
    twitter?: string;
    bio?: string;
    picture?: string;
    type: string;
  };
  statement?: {
    statement: string;
    statementSummary?: string;
    isSeekingDelegation: boolean;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  token: {
    id: string;
    symbol: string;
    name: string;
  };
}

export interface PaginationInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface PaginatedDAOParticipants {
  items: DAOParticipant[];
  totalCount: number;
  pageInfo: PaginationInfo;
}

export interface PaginatedDelegates {
  items: DelegateInfo[];
  totalCount: number;
  pageInfo: PaginationInfo;
}

export interface UserProfile {
  id: string;
  address: string;
  name: string;
  bio: string;
  twitter: string;
  ens?: string;
  picture?: string;
  daoParticipations: UserDAOParticipation[];
  delegateParticipations: UserDelegateParticipation[];
}

export interface DelegateStatementResult {
  id: string;
  statement: DelegateStatement;
  account: {
    address: string;
    name: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

// Validation helper functions
export function validateGetUserDAOsInput(
  input: any
): z.SafeParseReturnType<any, GetUserDAOsInput> {
  return GetUserDAOsInputSchema.safeParse(input);
}

export function validateGetDAOParticipantsInput(
  input: any
): z.SafeParseReturnType<any, GetDAOParticipantsInput> {
  return GetDAOParticipantsInputSchema.safeParse(input);
}

export function validateGetUserDetailsInput(
  input: any
): z.SafeParseReturnType<any, GetUserDetailsInput> {
  return GetUserDetailsInputSchema.safeParse(input);
}

export function validateGetDelegatesInput(
  input: any
): z.SafeParseReturnType<any, GetDelegatesInput> {
  return GetDelegatesInputSchema.safeParse(input);
}

export function validateGetUserProfileInput(
  input: any
): z.SafeParseReturnType<any, GetUserProfileInput> {
  return GetUserProfileInputSchema.safeParse(input);
}

export function validateGetDelegateStatementInput(
  input: any
): z.SafeParseReturnType<any, GetDelegateStatementInput> {
  return GetDelegateStatementInputSchema.safeParse(input);
}

/**
 * Get user's DAO participations through delegations
 * Uses the delegatees query to find DAOs where the user has delegated tokens
 */
export async function getUserDAOs(
  client: TallyGraphQLClient,
  input: GetUserDAOsInput
): Promise<UserDAOParticipation[] | null> {
  // Validate input
  const validation = validateGetUserDAOsInput(input);
  if (!validation.success) {
    throw new ValidationError(
      'Invalid input for getUserDAOs',
      validation.error.errors
    );
  }

  const { address, pageSize } = validation.data;

  // Build GraphQL query using delegatees
  const query = `
    query GetUserDAOs($address: Address!, $pageSize: Int!) {
      delegatees(input: { 
        filters: { address: $address }, 
        page: { limit: $pageSize } 
      }) {
        nodes {
          ... on Delegation {
            id
            organization {
              id
              name
              slug
            }
            token {
              symbol
            }
            votes
          }
        }
        pageInfo {
          firstCursor
          lastCursor
          count
        }
      }
    }
  `;

  const variables = { address, pageSize };

  try {
    const result = await client.query(query, variables);

    if (!result.delegatees?.nodes) {
      return [];
    }

    return result.delegatees.nodes;
  } catch (error: any) {
    if (error.response?.status === 422) {
      throw new ValidationError(`Invalid query structure: ${error.response.errors?.[0]?.message || 'Unknown GraphQL error'}`);
    }
    throw error;
  }
}

/**
 * Get participants of a specific DAO using delegates query
 * Delegates are the actual participants in a DAO who can vote on proposals
 */
export async function getDAOParticipants(
  client: TallyGraphQLClient,
  input: GetDAOParticipantsInput
): Promise<PaginatedDAOParticipants | null> {
  // Validate input
  const validation = validateGetDAOParticipantsInput(input);
  if (!validation.success) {
    throw new ValidationError(
      'Invalid input for getDAOParticipants',
      validation.error.errors
    );
  }

  const { organizationId, pageSize } = validation.data;

  // Build GraphQL query using delegates (DAO participants are delegates)
  const query = `
    query GetDAOParticipants($organizationId: IntID!, $pageSize: Int!) {
      delegates(input: { 
        filters: { organizationId: $organizationId }, 
        page: { limit: $pageSize }
      }) {
        nodes {
          ... on Delegate {
            id
            delegatorsCount
            votesCount
            account {
              address
              name
            }
          }
        }
        pageInfo {
          firstCursor
          lastCursor
          count
        }
      }
    }
  `;

  const variables = { organizationId, pageSize };

  try {
    const result = await client.query(query, variables);

    if (!result.delegates) {
      return null;
    }

    // Transform to expected structure
    return {
      items: result.delegates.nodes || [],
      totalCount: result.delegates.pageInfo?.count || 0,
      pageInfo: {
        hasNextPage: false, // Would need additional logic to determine this
        hasPreviousPage: false,
        startCursor: result.delegates.pageInfo?.firstCursor,
        endCursor: result.delegates.pageInfo?.lastCursor,
      },
    };
  } catch (error: any) {
    if (error.response?.status === 422) {
      throw new ValidationError(`Invalid query structure: ${error.response.errors?.[0]?.message || 'Unknown GraphQL error'}`);
    }
    throw error;
  }
}

/**
 * Get detailed user information using accountV2 and include delegate statements across all DAOs
 */
export async function getUserDetails(
  client: TallyGraphQLClient,
  input: GetUserDetailsInput
): Promise<UserDetails | null> {
  // Validate input
  const validation = validateGetUserDetailsInput(input);
  if (!validation.success) {
    throw new ValidationError(
      'Invalid input for getUserDetails',
      validation.error.errors
    );
  }

  const { address } = validation.data;

  // Build GraphQL query using accountV2 and delegates with address filter
  const query = `
    query GetUserDetails($address: Address!) {
      accountV2(id: $address) {
        id
        address
        name
        bio
        twitter
        ens
        picture
      }
      delegates(input: { 
        filters: { address: $address } 
      }) {
        nodes {
          ... on Delegate {
            id
            organization {
              id
              name
              slug
            }
            statement {
              statement
              statementSummary
              isSeekingDelegation
            }
            votesCount
            delegatorsCount
          }
        }
      }
    }
  `;

  const variables = { address };

  try {
    const result = await client.query(query, variables);
    
    if (!result.accountV2) {
      return null;
    }

    // Transform delegate participations
    const delegateParticipations: UserDelegateParticipation[] = (result.delegates?.nodes || []).map((delegate: any) => ({
      id: delegate.id,
      organization: delegate.organization,
      statement: delegate.statement && (delegate.statement.statement || delegate.statement.statementSummary || delegate.statement.isSeekingDelegation !== undefined)
        ? delegate.statement
        : undefined,
      votesCount: delegate.votesCount,
      delegatorsCount: delegate.delegatorsCount,
    }));

    return {
      ...result.accountV2,
      delegateParticipations,
    };
  } catch (error: any) {
    if (error.response?.status === 422) {
      throw new ValidationError(`Invalid query structure: ${error.response.errors?.[0]?.message || 'Unknown GraphQL error'}`);
    }
    throw error;
  }
}

/**
 * Get delegates for a specific organization
 */
export async function getDelegates(
  client: TallyGraphQLClient,
  input: GetDelegatesInput
): Promise<PaginatedDelegates | null> {
  // Validate input
  const validation = validateGetDelegatesInput(input);
  if (!validation.success) {
    throw new ValidationError(
      'Invalid input for getDelegates',
      validation.error.errors
    );
  }

  const { organizationId, pageSize, sortBy, sortOrder } = validation.data;

  // Build GraphQL query using delegates with enhanced fields
  const query = `
    query GetDelegatesEnhanced($organizationId: IntID!, $pageSize: Int!, $sortBy: DelegatesSortBy!, $isDescending: Boolean!) {
      delegates(input: { 
        filters: { organizationId: $organizationId }, 
        page: { limit: $pageSize },
        sort: { sortBy: $sortBy, isDescending: $isDescending }
      }) {
        nodes {
          ... on Delegate {
            id
            delegatorsCount
            votesCount
            isPrioritized
            chainId
            account {
              id
              address
              name
              ens
              twitter
              bio
              picture
              type
            }
            statement {
              statement
              statementSummary
              isSeekingDelegation
            }
            organization {
              id
              name
              slug
            }
            token {
              id
              symbol
              name
            }
          }
        }
        pageInfo {
          firstCursor
          lastCursor
          count
        }
      }
    }
  `;

  const variables = { 
    organizationId, 
    pageSize,
    sortBy,
    isDescending: sortOrder === 'desc'
  };

  try {
    const result = await client.query(query, variables);

    if (!result.delegates) {
      return null;
    }

    // Transform to expected structure
    return {
      items: result.delegates.nodes || [],
      totalCount: result.delegates.pageInfo?.count || 0,
      pageInfo: {
        hasNextPage: false, // Would need additional logic to determine this
        hasPreviousPage: false,
        startCursor: result.delegates.pageInfo?.firstCursor,
        endCursor: result.delegates.pageInfo?.lastCursor,
      },
    };
  } catch (error: any) {
    if (error.response?.status === 422) {
      throw new ValidationError(`Invalid query structure: ${error.response.errors?.[0]?.message || 'Unknown GraphQL error'}`);
    }
    throw error;
  }
}

/**
 * Get combined user profile including both user details and DAO participations
 * This combines the functionality of getUserDetails and getUserDAOs to reduce API calls
 */
export async function getUserProfile(
  client: TallyGraphQLClient,
  input: GetUserProfileInput
): Promise<UserProfile | null> {
  // Validate input
  const validation = validateGetUserProfileInput(input);
  if (!validation.success) {
    throw new ValidationError(
      'Invalid input for getUserProfile',
      validation.error.errors
    );
  }

  const { address, pageSize } = validation.data;

  // Build combined GraphQL query
  const query = `
    query GetUserProfile($address: Address!, $pageSize: Int!) {
      accountV2(id: $address) {
        id
        address
        name
        bio
        twitter
        ens
        picture
      }
      delegatees(input: { 
        filters: { address: $address }, 
        page: { limit: $pageSize } 
      }) {
        nodes {
          ... on Delegation {
            id
            organization {
              id
              name
              slug
            }
            token {
              symbol
            }
            votes
          }
        }
      }
      delegates(input: { 
        filters: { address: $address } 
      }) {
        nodes {
          ... on Delegate {
            id
            organization {
              id
              name
              slug
            }
            statement {
              statement
              statementSummary
              isSeekingDelegation
            }
            votesCount
            delegatorsCount
          }
        }
      }
    }
  `;

  const variables = { address, pageSize };

  try {
    const result = await client.query(query, variables);
    
    if (!result.accountV2) {
      return null;
    }

    // Transform DAO participations
    const daoParticipations: UserDAOParticipation[] = (result.delegatees?.nodes || []).map((delegation: any) => ({
      id: delegation.id,
      organization: delegation.organization,
      token: delegation.token,
      votes: delegation.votes,
    }));

    // Transform delegate participations
    const delegateParticipations: UserDelegateParticipation[] = (result.delegates?.nodes || []).map((delegate: any) => ({
      id: delegate.id,
      organization: delegate.organization,
      statement: delegate.statement && (delegate.statement.statement || delegate.statement.statementSummary || delegate.statement.isSeekingDelegation !== undefined)
        ? delegate.statement
        : undefined,
      votesCount: delegate.votesCount,
      delegatorsCount: delegate.delegatorsCount,
    }));

    return {
      ...result.accountV2,
      daoParticipations,
      delegateParticipations,
    };
  } catch (error: any) {
    if (error.response?.status === 422) {
      throw new ValidationError(`Invalid query structure: ${error.response.errors?.[0]?.message || 'Unknown GraphQL error'}`);
    }
    throw error;
  }
}

/**
 * Get delegate statement for a specific user and organization
 */
export async function getDelegateStatement(
  client: TallyGraphQLClient,
  input: GetDelegateStatementInput
): Promise<DelegateStatementResult | null> {
  // Validate input
  const validation = validateGetDelegateStatementInput(input);
  if (!validation.success) {
    throw new ValidationError(
      'Invalid input for getDelegateStatement',
      validation.error.errors
    );
  }

  const { address, organizationId } = validation.data;

  // Build GraphQL query
  const query = `
    query GetDelegateStatement($address: Address!, $organizationId: IntID!) {
      delegate(input: { address: $address, organizationId: $organizationId }) {
        id
        statement {
          statement
          statementSummary
          isSeekingDelegation
        }
        account {
          address
          name
        }
        organization {
          id
          name
          slug
        }
      }
    }
  `;

  const variables = { address, organizationId };

  try {
    const result = await client.query(query, variables);
    
    if (!result.delegate) {
      return null;
    }

    return result.delegate;
  } catch (error: any) {
    if (error.response?.status === 422) {
      throw new ValidationError(`Invalid query structure: ${error.response.errors?.[0]?.message || 'Unknown GraphQL error'}`);
    }
    throw error;
  }
}
