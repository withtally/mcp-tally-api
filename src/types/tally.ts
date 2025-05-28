// Core Tally API Types
// Based on the Tally GraphQL API documentation

export interface Account {
  id: string;
  address: string;
  ens?: string;
  twitter?: string;
  name: string;
  bio: string;
  picture?: string;
  safes?: string[];
  type: AccountType;
  votes: string; // Uint256 as string
  proposalsCreatedCount: number;
}

export enum AccountType {
  EOA = 'EOA',
  SAFE = 'SAFE',
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  chainIds: string[];
  tokenIds: string[];
  governorIds: string[];
  metadata?: OrganizationMetadata;
  creator?: Account;
  hasActiveProposals: boolean;
  proposalsCount: number;
  delegatesCount: number;
  delegatesVotesCount: string; // Uint256 as string
  tokenOwnersCount: number;
}

export interface OrganizationMetadata {
  color?: string;
  description?: string;
  icon?: string;
}

export interface Proposal {
  id: string;
  onchainId?: string;
  block?: Block;
  chainId: string;
  creator?: Account;
  end: BlockOrTimestamp;
  events: ProposalEvent[];
  executableCalls?: ExecutableCall[];
  governor: Governor;
  metadata: ProposalMetadata;
  organization: Organization;
  proposer?: Account;
  quorum?: string; // Uint256 as string
  status: ProposalStatus;
  start: BlockOrTimestamp;
  voteStats?: VoteStats[];
}

export interface ProposalMetadata {
  title: string;
  description: string;
  eta?: number;
  ipfsHash?: string;
  previousEnd?: number;
  timelockId?: string;
  txHash?: string;
  discourseURL?: string;
  snapshotURL?: string;
}

export enum ProposalStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  CANCELED = 'canceled',
  CALL_EXECUTED = 'callexecuted',
  DEFEATED = 'defeated',
  DRAFT = 'draft',
  EXECUTED = 'executed',
  EXPIRED = 'expired',
  EXTENDED = 'extended',
  PENDING = 'pending',
  QUEUED = 'queued',
  PENDING_EXECUTION = 'pendingexecution',
  SUBMITTED = 'submitted',
  SUCCEEDED = 'succeeded',
  CROSSCHAIN_EXECUTED = 'crosschainexecuted',
}

export interface Governor {
  id: string;
  chainId: string;
  contracts: Contracts;
  isIndexing: boolean;
  isBehind: boolean;
  isPrimary: boolean;
  kind: GovernorKind;
  name: string;
  organization: Organization;
  proposalStats: ProposalStats;
  parameters: GovernorParameters;
  quorum: string; // Uint256 as string
  slug: string;
  timelockId?: string;
  tokenId: string;
  token: Token;
  type: GovernorType;
  delegatesCount: number;
  delegatesVotesCount: string; // Uint256 as string
  tokenOwnersCount: number;
  metadata?: GovernorMetadata;
}

export interface Block {
  id: string;
  number: number;
  timestamp: number;
  ts: number;
}

export interface BlocklessTimestamp {
  timestamp: number;
}

export type BlockOrTimestamp = Block | BlocklessTimestamp;

export interface ProposalEvent {
  block?: Block;
  chainId: string;
  createdAt: number;
  type: ProposalEventType;
  txHash?: string;
}

export enum ProposalEventType {
  ACTIVATED = 'activated',
  CANCELED = 'canceled',
  CREATED = 'created',
  DEFEATED = 'defeated',
  DRAFTED = 'drafted',
  EXECUTED = 'executed',
  EXPIRED = 'expired',
  EXTENDED = 'extended',
  PENDING_EXECUTION = 'pendingexecution',
  QUEUED = 'queued',
  SUCCEEDED = 'succeeded',
  CALL_EXECUTED = 'callexecuted',
  CROSSCHAIN_EXECUTED = 'crosschainexecuted',
}

export interface ExecutableCall {
  calldata: string;
  chainId: string;
  index: number;
  signature?: string;
  target: string;
  type?: ExecutableCallType;
  value: string; // Uint256 as string
  decodedCalldata?: DecodedCalldata;
}

export enum ExecutableCallType {
  CUSTOM = 'custom',
  ERC20_TRANSFER = 'erc20transfer',
  ERC20_TRANSFER_ARBITRUM = 'erc20transferarbitrum',
  EMPTY = 'empty',
  NATIVE_TRANSFER = 'nativetransfer',
  ORCA_MANAGE_POD = 'orcamanagepod',
  OTHER = 'other',
  REWARD = 'reward',
  SWAP = 'swap',
}

export interface DecodedCalldata {
  signature: string;
  parameters: DecodedParameter[];
}

export interface DecodedParameter {
  name: string;
  type: string;
  value: string;
}

export interface Contracts {
  governor: GovernorContract;
  tokens: TokenContract[];
}

export interface GovernorContract {
  address: string;
  type: GovernorType;
}

export interface TokenContract {
  address: string;
  type: TokenType;
}

export enum GovernorKind {
  SINGLE = 'single',
  MULTI_PRIMARY = 'multiprimary',
  MULTI_SECONDARY = 'multisecondary',
  MULTI_OTHER = 'multiother',
  HUB = 'hub',
  SPOKE = 'spoke',
}

export enum GovernorType {
  GOVERNOR_ALPHA = 'governoralpha',
  GOVERNOR_BRAVO = 'governorbravo',
  OPENZEPPELIN_GOVERNOR = 'openzeppelingovernor',
  AAVE = 'aave',
  NOUNS_FORK = 'nounsfork',
  NOMINEE_ELECTION = 'nomineeelection',
  MEMBER_ELECTION = 'memberelection',
  HUB = 'hub',
  SPOKE = 'spoke',
}

export interface GovernorMetadata {
  description?: string;
}

export interface ProposalStats {
  total: number;
  active: number;
  failed: number;
  passed: number;
}

export interface GovernorParameters {
  quorumVotes?: string; // Uint256 as string
  proposalThreshold?: string; // Uint256 as string
  votingDelay?: string; // Uint256 as string
  votingPeriod?: string; // Uint256 as string
  gracePeriod?: string; // Uint256 as string
  quorumNumerator?: string; // Uint256 as string
  quorumDenominator?: string; // Uint256 as string
  clockMode?: string;
  nomineeVettingDuration?: string; // Uint256 as string
  fullWeightDuration?: string; // Uint256 as string
}

export interface Token {
  id: string;
  type: TokenType;
  name: string;
  symbol: string;
  supply: string; // Uint256 as string
  decimals: number;
  eligibility?: Eligibility;
  isIndexing: boolean;
  isBehind: boolean;
}

export enum TokenType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC20_AAVE = 'ERC20AAVE',
  SOLANA_SPOKE_TOKEN = 'SOLANASPOKETOKEN',
}

export interface Eligibility {
  status: EligibilityStatus;
  proof?: string[];
  amount?: string; // Uint256 as string
  tx?: string;
}

export enum EligibilityStatus {
  NOT_ELIGIBLE = 'NOTELIGIBLE',
  ELIGIBLE = 'ELIGIBLE',
  CLAIMED = 'CLAIMED',
}

export interface VoteStats {
  type: VoteType;
  votesCount: string; // Uint256 as string
  votersCount: number;
  percent: number;
}

export enum VoteType {
  ABSTAIN = 'abstain',
  AGAINST = 'against',
  FOR = 'for',
  PENDING_ABSTAIN = 'pendingabstain',
  PENDING_AGAINST = 'pendingagainst',
  PENDING_FOR = 'pendingfor',
}

export interface Vote {
  id: string;
  amount: string; // Uint256 as string
  block: Block;
  chainId: string;
  isBridged?: boolean;
  proposal: Proposal;
  reason?: string;
  type: VoteType;
  txHash: string;
  voter: Account;
}

export interface Delegate {
  id: string;
  account: Account;
  chainId?: string;
  delegatorsCount: number;
  governor?: Governor;
  organization?: Organization;
  statement?: DelegateStatement;
  token?: Token;
  votesCount: string; // Uint256 as string
  isPrioritized?: boolean;
}

export interface DelegateStatement {
  id: string;
  address: string;
  organizationID: string;
  statement: string;
  statementSummary?: string;
  isSeekingDelegation?: boolean;
  issues?: Issue[];
}

export interface Issue {
  id: string;
  organizationId?: string;
  name?: string;
  description?: string;
}

export interface Delegation {
  id: string;
  blockNumber: number;
  blockTimestamp: number;
  chainId: string;
  delegator: Account;
  delegate: Account;
  organization: Organization;
  token: Token;
  votes: string; // Uint256 as string
}

export interface Chain {
  id: string;
  layer1Id?: string;
  name: string;
  mediumName: string;
  shortName: string;
  blockTime: number;
  isTestnet: boolean;
  nativeCurrency: NativeCurrency;
  chain: string;
  useLayer1VotingPeriod: boolean;
}

export interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

// Pagination types
export interface PageInfo {
  firstCursor?: string;
  lastCursor?: string;
  count?: number;
}

export interface PaginatedOutput<T> {
  nodes: T[];
  pageInfo: PageInfo;
}

// Input types for GraphQL queries
export interface PageInput {
  afterCursor?: string;
  beforeCursor?: string;
  limit?: number;
}
