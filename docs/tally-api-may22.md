Introduction
Welcome
Getting started
Graphql Playgound
Quickstart Example
Rate limits
Operations
Queries
accounts
chains
delegate
delegatee
delegatees
delegates
delegators
governor
governors
organization
organizations
proposal
proposals
token
votes
Types
Account
AccountID
AccountType
Address
Any
AssetID
Assignment
Block
BlockID
BlockOrTimestamp
BlocklessTimestamp
Boolean
Bytes
Chain
ChainID
CompetencyFieldDescriptor
Contracts
Contributor
DataDecoded
Date
DecodedCalldata
DecodedParameter
Delegate
DelegateInput
DelegateStatement
DelegatesFiltersInput
DelegatesInput
DelegatesSortBy
DelegatesSortInput
Delegation
DelegationInput
DelegationsFiltersInput
DelegationsInput
DelegationsSortBy
DelegationsSortInput
Eligibility
EligibilityStatus
EndorsementService
ExecutableCall
ExecutableCallType
Float
Governor
GovernorContract
GovernorInput
GovernorKind
GovernorMetadata
GovernorParameters
GovernorType
GovernorsFiltersInput
GovernorsInput
GovernorsSortBy
GovernorsSortInput
Hash
HashID
ID
Int
IntID
Issue
Member
NativeCurrency
Node
Organization
OrganizationInput
OrganizationMetadata
OrganizationsFiltersInput
OrganizationsInput
OrganizationsSortBy
OrganizationsSortInput
PageInfo
PageInput
PaginatedOutput
Parameter
Proposal
ProposalEvent
ProposalEventType
ProposalInput
ProposalMetadata
ProposalStats
ProposalStatus
ProposalsCreatedCountInput
ProposalsFiltersInput
ProposalsInput
ProposalsSortBy
ProposalsSortInput
Role
StakeEarning
StakeEvent
StakeEventType
String
Timestamp
Token
TokenContract
TokenInput
TokenType
Uint256
UserBio
ValueDecoded
Vote
VoteStats
VoteType
VotesFiltersInput
VotesInput
VotesSortBy
VotesSortInput
Tally API Reference
Welcome to Tally's public API docs. These API endpoints make it easy to pull data about Governor contracts, their proposals, and accounts that participate in on-chain DAOs.

Contact
API Support

support@tally.xyz

https://discord.com/invite/sCGnpWH3m4

License
An Apache 2.0 covers these API docs

https://www.apache.org/licenses/LICENSE-2.0.html

Terms of Service
https://static.tally.xyz/terms.html

API Endpoints
https://api.tally.xyz/query
Headers

# A Tally API token

Api-Key: YOUR_KEY_HERE
Getting started
To get started, you'll need an API key. Create by signing in to Tally and requesting on your user settings page. You'll need to include the API key as an HTTP header with every request.

Graphql Playgound
Once you have an API key, you can test out these endpoints with the Graphql API Playground. Add your API key under the "Request Headers" section, like this {"Api-Key":"YOUR_KEY_HERE"} Note that the playground also includes undocumented endpoints. Using them is not recommended for production apps, because they are subject to change without notice.

Quickstart Example
To see an example app that uses the API, clone this quickstart example. This React app uses the Tally API to list Governors and their Proposals.

Rate limits
Because the API is free, we have a fairly low rate limit to keep costs down. If you're interested in increasing your rate limit, reach out to us at support@tally.xyz.

Queries
accounts
Response
Returns [Account!]!

Arguments
Name Description
ids - [AccountID!]
addresses - [Address!]
Example
Query
query Accounts(
$ids: [AccountID!],
$addresses: [Address!]
) {
accounts(
ids: $ids,
addresses: $addresses
) {
id
address
ens
twitter
name
bio
picture
safes
type
votes
proposalsCreatedCount
}
}
Variables
{
"ids": [
"eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc"
],
"addresses": [
"0x1234567800000000000000000000000000000abc"
]
}
Response
{
"data": {
"accounts": [
{
"id": 4,
"address": "0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"ens": "tallyxyz.eth",
"twitter": "@tallyxyz",
"name": "Tally",
"bio": "Now accepting delegations!",
"picture": "https://static.tally.xyz/logo.png",
"safes": [
"eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc"
],
"type": "EOA",
"votes": 10987654321,
"proposalsCreatedCount": 123
}
]
}
}
Queries
chains
Response
Returns [Chain]!

Example
Query
query Chains {
chains {
id
layer1Id
name
mediumName
shortName
blockTime
isTestnet
nativeCurrency {
name
symbol
decimals
}
chain
useLayer1VotingPeriod
}
}
Response
{
"data": {
"chains": [
{
"id": "eip155:1",
"layer1Id": "eip155:1",
"name": "Ethereum Mainnet",
"mediumName": "Ethereum",
"shortName": "eth",
"blockTime": 12,
"isTestnet": false,
"nativeCurrency": "ETH",
"chain": "ETH",
"useLayer1VotingPeriod": true
}
]
}
}
Queries
delegate
Description
Returns delegate information by an address for an organization or governor.

Response
Returns a Delegate

Arguments
Name Description
input - DelegateInput!
Example
Query
query Delegate($input: DelegateInput!) {
delegate(input: $input) {
id
account {
id
address
ens
twitter
name
bio
picture
safes
type
votes
proposalsCreatedCount
}
chainId
delegatorsCount
governor {
id
chainId
contracts {
...ContractsFragment
}
isIndexing
isBehind
isPrimary
kind
name
organization {
...OrganizationFragment
}
proposalStats {
...ProposalStatsFragment
}
parameters {
...GovernorParametersFragment
}
quorum
slug
timelockId
tokenId
token {
...TokenFragment
}
type
delegatesCount
delegatesVotesCount
tokenOwnersCount
metadata {
...GovernorMetadataFragment
}
}
organization {
id
slug
name
chainIds
tokenIds
governorIds
metadata {
...OrganizationMetadataFragment
}
creator {
...AccountFragment
}
hasActiveProposals
proposalsCount
delegatesCount
delegatesVotesCount
tokenOwnersCount
endorsementService {
...EndorsementServiceFragment
}
}
statement {
id
address
organizationID
statement
statementSummary
isSeekingDelegation
issues {
...IssueFragment
}
}
token {
id
type
name
symbol
supply
decimals
eligibility {
...EligibilityFragment
}
isIndexing
isBehind
}
votesCount
isPrioritized
}
}
Variables
{"input": DelegateInput}
Response
{
"data": {
"delegate": {
"id": 2207450143689540900,
"account": Account,
"chainId": "eip155:1",
"delegatorsCount": 123,
"governor": Governor,
"organization": Organization,
"statement": DelegateStatement,
"token": Token,
"votesCount": 10987654321,
"isPrioritized": true
}
}
}
Queries
delegatee
Description
Returns a delegatee of a user, to whom this user has delegated, for a governor

Response
Returns a Delegation

Arguments
Name Description
input - DelegationInput!
Example
Query
query Delegatee($input: DelegationInput!) {
delegatee(input: $input) {
id
blockNumber
blockTimestamp
chainId
delegator {
id
address
ens
twitter
name
bio
picture
safes
type
votes
proposalsCreatedCount
}
delegate {
id
address
ens
twitter
name
bio
picture
safes
type
votes
proposalsCreatedCount
}
organization {
id
slug
name
chainIds
tokenIds
governorIds
metadata {
...OrganizationMetadataFragment
}
creator {
...AccountFragment
}
hasActiveProposals
proposalsCount
delegatesCount
delegatesVotesCount
tokenOwnersCount
endorsementService {
...EndorsementServiceFragment
}
}
token {
id
type
name
symbol
supply
decimals
eligibility {
...EligibilityFragment
}
isIndexing
isBehind
}
votes
}
}
Variables
{"input": DelegationInput}
Response
{
"data": {
"delegatee": {
"id": 2207450143689540900,
"blockNumber": 123,
"blockTimestamp": 1663224162,
"chainId": "eip155:1",
"delegator": Account,
"delegate": Account,
"organization": Organization,
"token": Token,
"votes": 10987654321
}
}
}
Queries
delegatees
Description
Returns a paginated list of delegatees of a user, to whom this user has delegated, that match the provided filters.

Response
Returns a PaginatedOutput!

Arguments
Name Description
input - DelegationsInput!
Example
Query
query Delegatees($input: DelegationsInput!) {
delegatees(input: $input) {
nodes {
... on Delegate {
...DelegateFragment
}
... on Organization {
...OrganizationFragment
}
... on Member {
...MemberFragment
}
... on Delegation {
...DelegationFragment
}
... on Governor {
...GovernorFragment
}
... on Proposal {
...ProposalFragment
}
... on Vote {
...VoteFragment
}
... on StakeEvent {
...StakeEventFragment
}
... on StakeEarning {
...StakeEarningFragment
}
... on Contributor {
...ContributorFragment
}
... on Assignment {
...AssignmentFragment
}
}
pageInfo {
firstCursor
lastCursor
count
}
}
}
Variables
{"input": DelegationsInput}
Response
{
"data": {
"delegatees": {
"nodes": [Delegate],
"pageInfo": PageInfo
}
}
}
Queries
delegates
Description
Returns a paginated list of delegates that match the provided filters.

Response
Returns a PaginatedOutput!

Arguments
Name Description
input - DelegatesInput!
Example
Query
query Delegates($input: DelegatesInput!) {
delegates(input: $input) {
nodes {
... on Delegate {
...DelegateFragment
}
... on Organization {
...OrganizationFragment
}
... on Member {
...MemberFragment
}
... on Delegation {
...DelegationFragment
}
... on Governor {
...GovernorFragment
}
... on Proposal {
...ProposalFragment
}
... on Vote {
...VoteFragment
}
... on StakeEvent {
...StakeEventFragment
}
... on StakeEarning {
...StakeEarningFragment
}
... on Contributor {
...ContributorFragment
}
... on Assignment {
...AssignmentFragment
}
}
pageInfo {
firstCursor
lastCursor
count
}
}
}
Variables
{"input": DelegatesInput}
Response
{
"data": {
"delegates": {
"nodes": [Delegate],
"pageInfo": PageInfo
}
}
}
Queries
delegators
Description
Returns a paginated list of delegators of a delegate that match the provided filters.

Response
Returns a PaginatedOutput!

Arguments
Name Description
input - DelegationsInput!
Example
Query
query Delegators($input: DelegationsInput!) {
delegators(input: $input) {
nodes {
... on Delegate {
...DelegateFragment
}
... on Organization {
...OrganizationFragment
}
... on Member {
...MemberFragment
}
... on Delegation {
...DelegationFragment
}
... on Governor {
...GovernorFragment
}
... on Proposal {
...ProposalFragment
}
... on Vote {
...VoteFragment
}
... on StakeEvent {
...StakeEventFragment
}
... on StakeEarning {
...StakeEarningFragment
}
... on Contributor {
...ContributorFragment
}
... on Assignment {
...AssignmentFragment
}
}
pageInfo {
firstCursor
lastCursor
count
}
}
}
Variables
{"input": DelegationsInput}
Response
{
"data": {
"delegators": {
"nodes": [Delegate],
"pageInfo": PageInfo
}
}
}
Queries
governor
Description
Returns governor by ID or slug.

Response
Returns a Governor!

Arguments
Name Description
input - GovernorInput!
Example
Query
query Governor($input: GovernorInput!) {
governor(input: $input) {
id
chainId
contracts {
governor {
...GovernorContractFragment
}
tokens {
...TokenContractFragment
}
}
isIndexing
isBehind
isPrimary
kind
name
organization {
id
slug
name
chainIds
tokenIds
governorIds
metadata {
...OrganizationMetadataFragment
}
creator {
...AccountFragment
}
hasActiveProposals
proposalsCount
delegatesCount
delegatesVotesCount
tokenOwnersCount
endorsementService {
...EndorsementServiceFragment
}
}
proposalStats {
total
active
failed
passed
}
parameters {
quorumVotes
proposalThreshold
votingDelay
votingPeriod
gracePeriod
quorumNumerator
quorumDenominator
clockMode
nomineeVettingDuration
fullWeightDuration
}
quorum
slug
timelockId
tokenId
token {
id
type
name
symbol
supply
decimals
eligibility {
...EligibilityFragment
}
isIndexing
isBehind
}
type
delegatesCount
delegatesVotesCount
tokenOwnersCount
metadata {
description
}
}
}
Variables
{"input": GovernorInput}
Response
{
"data": {
"governor": {
"id": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"chainId": "eip155:1",
"contracts": Contracts,
"isIndexing": true,
"isBehind": true,
"isPrimary": false,
"kind": "single",
"name": "Uniswap",
"organization": Organization,
"proposalStats": ProposalStats,
"parameters": GovernorParameters,
"quorum": 10987654321,
"slug": "uniswap",
"timelockId": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"tokenId": "eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f",
"token": Token,
"type": "governoralpha",
"delegatesCount": 123,
"delegatesVotesCount": 10987654321,
"tokenOwnersCount": 123,
"metadata": GovernorMetadata
}
}
}
Queries
governors
Description
Returns a paginated list of governors that match the provided filters. Note: Tally may deactivate governors from time to time. If you wish to include those set includeInactive to true.

Response
Returns a PaginatedOutput!

Arguments
Name Description
input - GovernorsInput!
Example
Query
query Governors($input: GovernorsInput!) {
governors(input: $input) {
nodes {
... on Delegate {
...DelegateFragment
}
... on Organization {
...OrganizationFragment
}
... on Member {
...MemberFragment
}
... on Delegation {
...DelegationFragment
}
... on Governor {
...GovernorFragment
}
... on Proposal {
...ProposalFragment
}
... on Vote {
...VoteFragment
}
... on StakeEvent {
...StakeEventFragment
}
... on StakeEarning {
...StakeEarningFragment
}
... on Contributor {
...ContributorFragment
}
... on Assignment {
...AssignmentFragment
}
}
pageInfo {
firstCursor
lastCursor
count
}
}
}
Variables
{"input": GovernorsInput}
Response
{
"data": {
"governors": {
"nodes": [Delegate],
"pageInfo": PageInfo
}
}
}
Queries
organization
Description
Returns organization by ID or slug.

Response
Returns an Organization!

Arguments
Name Description
input - OrganizationInput!
Example
Query
query Organization($input: OrganizationInput!) {
organization(input: $input) {
id
slug
name
chainIds
tokenIds
governorIds
metadata {
color
description
icon
}
creator {
id
address
ens
twitter
name
bio
picture
safes
type
votes
proposalsCreatedCount
}
hasActiveProposals
proposalsCount
delegatesCount
delegatesVotesCount
tokenOwnersCount
endorsementService {
id
competencyFields {
...CompetencyFieldDescriptorFragment
}
}
}
}
Variables
{"input": OrganizationInput}
Response
{
"data": {
"organization": {
"id": 2207450143689540900,
"slug": "xyz789",
"name": "xyz789",
"chainIds": ["eip155:1"],
"tokenIds": [
"eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f"
],
"governorIds": [
"eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc"
],
"metadata": OrganizationMetadata,
"creator": Account,
"hasActiveProposals": true,
"proposalsCount": 123,
"delegatesCount": 987,
"delegatesVotesCount": 10987654321,
"tokenOwnersCount": 123,
"endorsementService": EndorsementService
}
}
}
Queries
organizations
Description
Returns a paginated list of organizations that match the provided filters.

Response
Returns a PaginatedOutput!

Arguments
Name Description
input - OrganizationsInput
Example
Query
query Organizations($input: OrganizationsInput) {
organizations(input: $input) {
nodes {
... on Delegate {
...DelegateFragment
}
... on Organization {
...OrganizationFragment
}
... on Member {
...MemberFragment
}
... on Delegation {
...DelegationFragment
}
... on Governor {
...GovernorFragment
}
... on Proposal {
...ProposalFragment
}
... on Vote {
...VoteFragment
}
... on StakeEvent {
...StakeEventFragment
}
... on StakeEarning {
...StakeEarningFragment
}
... on Contributor {
...ContributorFragment
}
... on Assignment {
...AssignmentFragment
}
}
pageInfo {
firstCursor
lastCursor
count
}
}
}
Variables
{"input": OrganizationsInput}
Response
{
"data": {
"organizations": {
"nodes": [Delegate],
"pageInfo": PageInfo
}
}
}
Queries
proposal
Description
Returns a proposal by ID or onchainId + governorId. Also retruns latest draft version by ID.

Response
Returns a Proposal!

Arguments
Name Description
input - ProposalInput!
Example
Query
query Proposal($input: ProposalInput!) {
proposal(input: $input) {
id
onchainId
block {
id
number
timestamp
ts
}
chainId
creator {
id
address
ens
twitter
name
bio
picture
safes
type
votes
proposalsCreatedCount
}
end {
... on Block {
...BlockFragment
}
... on BlocklessTimestamp {
...BlocklessTimestampFragment
}
}
events {
block {
...BlockFragment
}
chainId
createdAt
type
txHash
}
executableCalls {
calldata
chainId
index
signature
target
type
value
decodedCalldata {
...DecodedCalldataFragment
}
}
governor {
id
chainId
contracts {
...ContractsFragment
}
isIndexing
isBehind
isPrimary
kind
name
organization {
...OrganizationFragment
}
proposalStats {
...ProposalStatsFragment
}
parameters {
...GovernorParametersFragment
}
quorum
slug
timelockId
tokenId
token {
...TokenFragment
}
type
delegatesCount
delegatesVotesCount
tokenOwnersCount
metadata {
...GovernorMetadataFragment
}
}
metadata {
title
description
eta
ipfsHash
previousEnd
timelockId
txHash
discourseURL
snapshotURL
}
organization {
id
slug
name
chainIds
tokenIds
governorIds
metadata {
...OrganizationMetadataFragment
}
creator {
...AccountFragment
}
hasActiveProposals
proposalsCount
delegatesCount
delegatesVotesCount
tokenOwnersCount
endorsementService {
...EndorsementServiceFragment
}
}
proposer {
id
address
ens
twitter
name
bio
picture
safes
type
votes
proposalsCreatedCount
}
quorum
status
start {
... on Block {
...BlockFragment
}
... on BlocklessTimestamp {
...BlocklessTimestampFragment
}
}
voteStats {
type
votesCount
votersCount
percent
}
}
}
Variables
{"input": ProposalInput}
Response
{
"data": {
"proposal": {
"id": 2207450143689540900,
"onchainId": "xyz789",
"block": Block,
"chainId": "eip155:1",
"creator": Account,
"end": Block,
"events": [ProposalEvent],
"executableCalls": [ExecutableCall],
"governor": Governor,
"metadata": ProposalMetadata,
"organization": Organization,
"proposer": Account,
"quorum": 10987654321,
"status": "active",
"start": Block,
"voteStats": [VoteStats]
}
}
}
Queries
proposals
Description
Returns a paginated list of proposals that match the provided filters.

Response
Returns a PaginatedOutput!

Arguments
Name Description
input - ProposalsInput!
Example
Query
query Proposals($input: ProposalsInput!) {
proposals(input: $input) {
nodes {
... on Delegate {
...DelegateFragment
}
... on Organization {
...OrganizationFragment
}
... on Member {
...MemberFragment
}
... on Delegation {
...DelegationFragment
}
... on Governor {
...GovernorFragment
}
... on Proposal {
...ProposalFragment
}
... on Vote {
...VoteFragment
}
... on StakeEvent {
...StakeEventFragment
}
... on StakeEarning {
...StakeEarningFragment
}
... on Contributor {
...ContributorFragment
}
... on Assignment {
...AssignmentFragment
}
}
pageInfo {
firstCursor
lastCursor
count
}
}
}
Variables
{"input": ProposalsInput}
Response
{
"data": {
"proposals": {
"nodes": [Delegate],
"pageInfo": PageInfo
}
}
}
Queries
token
Response
Returns a Token!

Arguments
Name Description
input - TokenInput!
Example
Query
query Token($input: TokenInput!) {
token(input: $input) {
id
type
name
symbol
supply
decimals
eligibility {
status
proof
amount
tx
}
isIndexing
isBehind
}
}
Variables
{"input": TokenInput}
Response
{
"data": {
"token": {
"id": "eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f",
"type": "ERC20",
"name": "xyz789",
"symbol": "xyz789",
"supply": 10987654321,
"decimals": 123,
"eligibility": Eligibility,
"isIndexing": false,
"isBehind": false
}
}
}
Queries
votes
Description
Returns a paginated list of votes that match the provided filters.

Response
Returns a PaginatedOutput!

Arguments
Name Description
input - VotesInput!
Example
Query
query Votes($input: VotesInput!) {
votes(input: $input) {
nodes {
... on Delegate {
...DelegateFragment
}
... on Organization {
...OrganizationFragment
}
... on Member {
...MemberFragment
}
... on Delegation {
...DelegationFragment
}
... on Governor {
...GovernorFragment
}
... on Proposal {
...ProposalFragment
}
... on Vote {
...VoteFragment
}
... on StakeEvent {
...StakeEventFragment
}
... on StakeEarning {
...StakeEarningFragment
}
... on Contributor {
...ContributorFragment
}
... on Assignment {
...AssignmentFragment
}
}
pageInfo {
firstCursor
lastCursor
count
}
}
}
Variables
{"input": VotesInput}
Response
{
"data": {
"votes": {
"nodes": [Delegate],
"pageInfo": PageInfo
}
}
}
Types
Account
Fields
Field Name Description
id - ID!
address - Address!
ens - String
twitter - String
name - String!
bio - String!
picture - String
safes - [AccountID!]
type - AccountType!
votes - Uint256!
Arguments
governorId - AccountID!
proposalsCreatedCount - Int!
Arguments
input - ProposalsCreatedCountInput!
Example
{
"id": 4,
"address": "0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"ens": "tallyxyz.eth",
"twitter": "@tallyxyz",
"name": "Tally",
"bio": "Now accepting delegations!",
"picture": "https://static.tally.xyz/logo.png",
"safes": [
"eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc"
],
"type": "EOA",
"votes": 10987654321,
"proposalsCreatedCount": 123
}
Types
AccountID
Description
AccountID is a CAIP-10 compliant account id.

Example
"eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc"
Types
AccountType
Values
Enum Value Description
EOA

SAFE

Example
"EOA"
Types
Address
Description
Address is a 20 byte Ethereum address, represented as 0x-prefixed hexadecimal.

Example
"0x1234567800000000000000000000000000000abc"
Types
Any
Example
Any
Types
AssetID
Description
AssetID is a CAIP-19 compliant asset id.

Example
"eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f"
Types
Assignment
Fields
Field Name Description
account - Account!
amount - Uint256!
percent - Float!
Example
{
"account": Account,
"amount": 10987654321,
"percent": 123.45
}
Types
Block
Fields
Field Name Description
id - BlockID!
number - Int!
timestamp - Timestamp!
ts - Timestamp!
Example
{
"id": BlockID,
"number": 1553735115537351,
"timestamp": 1663224162,
"ts": 1663224162
}
Types
BlockID
Description
BlockID is a ChainID scoped identifier for identifying blocks across chains. Ex: eip155:1:15672.

Example
BlockID
Types
BlockOrTimestamp
Types
Union Types
Block

BlocklessTimestamp

Example
Block
Types
BlocklessTimestamp
Fields
Field Name Description
timestamp - Timestamp!
Example
{"timestamp": 1663224162}
Types
Boolean
Description
The Boolean scalar type represents true or false.

Types
Bytes
Description
Bytes is an arbitrary length binary string, represented as 0x-prefixed hexadecimal.

Example
"0x4321abcd"
Types
Chain
Description
Chain data in the models are only loaded on server startup. If changed please restart the api servers.

Fields
Field Name Description
id - ChainID! The id in eip155:chain_id
layer1Id - ChainID If chain is an L2, the L1 id in format eip155:chain_id
name - String! Chain name as found in eip lists. e.g.: Ethereum Testnet Rinkeby
mediumName - String! Chain name with removed redundancy and unnecessary words. e.g.: Ethereum Rinkeby
shortName - String! Chain short name as found in eip lists. The Acronym of it. e.g.: rin
blockTime - Float! Average block time in seconds.
isTestnet - Boolean! Boolean true if it is a testnet, false if it's not.
nativeCurrency - NativeCurrency! Data from chain native currency.
chain - String! Chain as parameter found in the eip.
useLayer1VotingPeriod - Boolean! Boolean true if L2 depends on L1 for voting period, false if it doesn't.
Example
{
"id": "eip155:1",
"layer1Id": "eip155:1",
"name": "Ethereum Mainnet",
"mediumName": "Ethereum",
"shortName": "eth",
"blockTime": 12,
"isTestnet": false,
"nativeCurrency": "ETH",
"chain": "ETH",
"useLayer1VotingPeriod": false
}
Types
ChainID
Description
ChainID is a CAIP-2 compliant chain id.

Example
"eip155:1"
Types
CompetencyFieldDescriptor
Fields
Field Name Description
id - IntID!
name - String!
description - String!
Example
{
"id": 2207450143689540900,
"name": "abc123",
"description": "abc123"
}
Types
Contracts
Fields
Field Name Description
governor - GovernorContract!
tokens - [TokenContract!]!
Example
{
"governor": GovernorContract,
"tokens": [TokenContract]
}
Types
Contributor
Fields
Field Name Description
id - IntID!
account - Account!
isCurator - Boolean!
isApplyingForCouncil - Boolean!
competencyFieldDescriptors - [CompetencyFieldDescriptor!]!
bio - UserBio!
Example
{
"id": 2207450143689540900,
"account": Account,
"isCurator": true,
"isApplyingForCouncil": false,
"competencyFieldDescriptors": [
CompetencyFieldDescriptor
],
"bio": UserBio
}
Types
DataDecoded
Fields
Field Name Description
method - String!
parameters - [Parameter!]!
Example
{
"method": "xyz789",
"parameters": [Parameter]
}
Types
Date
Description
Date is a date in the format ISO 8601 format, e.g. YYYY-MM-DD.

Example
"2022-09-22"
Types
DecodedCalldata
Fields
Field Name Description
signature - String! The function signature/name
parameters - [DecodedParameter!]! The decoded parameters
Example
{
"signature": "xyz789",
"parameters": [DecodedParameter]
}
Types
DecodedParameter
Fields
Field Name Description
name - String! Parameter name
type - String! Parameter type (e.g., 'address', 'uint256')
value - String! Parameter value as a string
Example
{
"name": "xyz789",
"type": "abc123",
"value": "abc123"
}
Types
Delegate
Fields
Field Name Description
id - IntID!
account - Account!
chainId - ChainID
delegatorsCount - Int!
governor - Governor
organization - Organization
statement - DelegateStatement
token - Token
votesCount - Uint256!
Arguments
blockNumber - Int
isPrioritized - Boolean
Example
{
"id": 2207450143689540900,
"account": Account,
"chainId": "eip155:1",
"delegatorsCount": 123,
"governor": Governor,
"organization": Organization,
"statement": DelegateStatement,
"token": Token,
"votesCount": 10987654321,
"isPrioritized": false
}
Types
DelegateInput
Fields
Input Field Description
address - Address!
governorId - AccountID
organizationId - IntID
Example
{
"address": "0x1234567800000000000000000000000000000abc",
"governorId": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"organizationId": 2207450143689540900
}
Types
DelegateStatement
Fields
Field Name Description
id - IntID!
address - Address!
organizationID - IntID!
statement - String!
statementSummary - String
isSeekingDelegation - Boolean
issues - [Issue!]
Example
{
"id": 2207450143689540900,
"address": "0x1234567800000000000000000000000000000abc",
"organizationID": 2207450143689540900,
"statement": "abc123",
"statementSummary": "abc123",
"isSeekingDelegation": false,
"issues": [Issue]
}
Types
DelegatesFiltersInput
Fields
Input Field Description
address - Address address filter in combination with organizationId allows fetching delegate info of this address from each chain
governorId - AccountID
hasVotes - Boolean
hasDelegators - Boolean
issueIds - [IntID!]
isSeekingDelegation - Boolean
organizationId - IntID
Example
{
"address": "0x1234567800000000000000000000000000000abc",
"governorId": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"hasVotes": false,
"hasDelegators": false,
"issueIds": [2207450143689540900],
"isSeekingDelegation": false,
"organizationId": 2207450143689540900
}
Types
DelegatesInput
Fields
Input Field Description
filters - DelegatesFiltersInput!
page - PageInput
sort - DelegatesSortInput
Example
{
"filters": DelegatesFiltersInput,
"page": PageInput,
"sort": DelegatesSortInput
}
Types
DelegatesSortBy
Values
Enum Value Description
id

The default sorting method. It sorts by date.
votes

Sorts by voting power.
delegators

Sorts by total delegators.
isPrioritized

Sorts by DAO prioritization.
Example
"id"
Types
DelegatesSortInput
Fields
Input Field Description
isDescending - Boolean!
sortBy - DelegatesSortBy!
Example
{"isDescending": true, "sortBy": "id"}
Types
Delegation
Fields
Field Name Description
id - IntID!
blockNumber - Int!
blockTimestamp - Timestamp!
chainId - ChainID!
delegator - Account!
delegate - Account!
organization - Organization!
token - Token!
votes - Uint256!
Example
{
"id": 2207450143689540900,
"blockNumber": 987,
"blockTimestamp": 1663224162,
"chainId": "eip155:1",
"delegator": Account,
"delegate": Account,
"organization": Organization,
"token": Token,
"votes": 10987654321
}
Types
DelegationInput
Fields
Input Field Description
address - Address!
tokenId - AssetID!
Example
{
"address": "0x1234567800000000000000000000000000000abc",
"tokenId": "eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f"
}
Types
DelegationsFiltersInput
Fields
Input Field Description
address - Address!
governorId - AccountID
organizationId - IntID
Example
{
"address": "0x1234567800000000000000000000000000000abc",
"governorId": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"organizationId": 2207450143689540900
}
Types
DelegationsInput
Fields
Input Field Description
filters - DelegationsFiltersInput!
page - PageInput
sort - DelegationsSortInput
Example
{
"filters": DelegationsFiltersInput,
"page": PageInput,
"sort": DelegationsSortInput
}
Types
DelegationsSortBy
Values
Enum Value Description
id

The default sorting method. It sorts by date.
votes

Sorts by voting power.
Example
"id"
Types
DelegationsSortInput
Fields
Input Field Description
isDescending - Boolean!
sortBy - DelegationsSortBy!
Example
{"isDescending": true, "sortBy": "id"}
Types
Eligibility
Fields
Field Name Description
status - EligibilityStatus! Whether the account is eligible to claim
proof - [String!]
amount - Uint256 Amount the account can claim from this token
tx - HashID
Example
{
"status": "NOTELIGIBLE",
"proof": ["xyz789"],
"amount": 10987654321,
"tx": "eip155:1:0xcd31cf5dbd3281442d80ceaa529eba678d55be86b7a342f5ed9cc8e49dadc855"
}
Types
EligibilityStatus
Values
Enum Value Description
NOTELIGIBLE

ELIGIBLE

CLAIMED

Example
"NOTELIGIBLE"
Types
EndorsementService
Fields
Field Name Description
id - IntID!
competencyFields - [CompetencyFieldDescriptor!]!
Example
{
"id": 2207450143689540900,
"competencyFields": [CompetencyFieldDescriptor]
}
Types
ExecutableCall
Fields
Field Name Description
calldata - Bytes!
chainId - ChainID!
index - Int!
signature - String Target contract's function signature.
target - Address!
type - ExecutableCallType
value - Uint256!
decodedCalldata - DecodedCalldata Decoded representation of the calldata
Example
{
"calldata": "0x4321abcd",
"chainId": "eip155:1",
"index": 987,
"signature": "abc123",
"target": "0x1234567800000000000000000000000000000abc",
"type": "custom",
"value": 10987654321,
"decodedCalldata": DecodedCalldata
}
Types
ExecutableCallType
Values
Enum Value Description
custom

erc20transfer

erc20transferarbitrum

empty

nativetransfer

orcamanagepod

other

reward

swap

Example
"custom"
Types
Float
Description
The Float scalar type represents signed double-precision fractional values as specified by IEEE 754.

Example
987.65
Types
Governor
Fields
Field Name Description
id - AccountID!
chainId - ChainID!
contracts - Contracts!
isIndexing - Boolean!
isBehind - Boolean!
isPrimary - Boolean!
kind - GovernorKind!
name - String! Tally name of the governor contract
organization - Organization!
proposalStats - ProposalStats!
parameters - GovernorParameters!
quorum - Uint256! The minumum amount of votes (total or for depending on type) that are currently required to pass a proposal.
slug - String! Tally slug used for this goverance: tally.xyz/gov/[slug]
timelockId - AccountID Chain scoped address of the timelock contract for this governor if it exists.
tokenId - AssetID!
token - Token!
type - GovernorType!
delegatesCount - Int!
delegatesVotesCount - Uint256!
tokenOwnersCount - Int!
metadata - GovernorMetadata
Example
{
"id": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"chainId": "eip155:1",
"contracts": Contracts,
"isIndexing": false,
"isBehind": false,
"isPrimary": true,
"kind": "single",
"name": "Uniswap",
"organization": Organization,
"proposalStats": ProposalStats,
"parameters": GovernorParameters,
"quorum": 10987654321,
"slug": "uniswap",
"timelockId": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"tokenId": "eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f",
"token": Token,
"type": "governoralpha",
"delegatesCount": 123,
"delegatesVotesCount": 10987654321,
"tokenOwnersCount": 123,
"metadata": GovernorMetadata
}
Types
GovernorContract
Fields
Field Name Description
address - Address!
type - GovernorType!
Example
{
"address": "0x1234567800000000000000000000000000000abc",
"type": "governoralpha"
}
Types
GovernorInput
Fields
Input Field Description
id - AccountID
slug - String
Example
{
"id": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"slug": "xyz789"
}
Types
GovernorKind
Values
Enum Value Description
single

multiprimary

multisecondary

multiother

hub

spoke

Example
"single"
Types
GovernorMetadata
Fields
Field Name Description
description - String
Example
{"description": "xyz789"}
Types
GovernorParameters
Fields
Field Name Description
quorumVotes - Uint256
proposalThreshold - Uint256
votingDelay - Uint256
votingPeriod - Uint256
gracePeriod - Uint256
quorumNumerator - Uint256
quorumDenominator - Uint256
clockMode - String
nomineeVettingDuration - Uint256
fullWeightDuration - Uint256
Example
{
"quorumVotes": 10987654321,
"proposalThreshold": 10987654321,
"votingDelay": 10987654321,
"votingPeriod": 10987654321,
"gracePeriod": 10987654321,
"quorumNumerator": 10987654321,
"quorumDenominator": 10987654321,
"clockMode": "abc123",
"nomineeVettingDuration": 10987654321,
"fullWeightDuration": 10987654321
}
Types
GovernorType
Values
Enum Value Description
governoralpha

governorbravo

openzeppelingovernor

aave

nounsfork

nomineeelection

memberelection

hub

spoke

Example
"governoralpha"
Types
GovernorsFiltersInput
Fields
Input Field Description
organizationId - IntID!
includeInactive - Boolean
excludeSecondary - Boolean
Example
{
"organizationId": 2207450143689540900,
"includeInactive": true,
"excludeSecondary": false
}
Types
GovernorsInput
Fields
Input Field Description
filters - GovernorsFiltersInput!
page - PageInput
sort - GovernorsSortInput
Example
{
"filters": GovernorsFiltersInput,
"page": PageInput,
"sort": GovernorsSortInput
}
Types
GovernorsSortBy
Values
Enum Value Description
id

The default sorting method. It sorts by date.
Example
"id"
Types
GovernorsSortInput
Fields
Input Field Description
isDescending - Boolean!
sortBy - GovernorsSortBy!
Example
{"isDescending": false, "sortBy": "id"}
Types
Hash
Description
Hash is for identifying transactions on a chain. Ex: 0xDEAD.

Example
"0xcd31cf5dbd3281442d80ceaa529eba678d55be86b7a342f5ed9cc8e49dadc855"
Types
HashID
Description
HashID is a ChainID scoped identifier for identifying transactions across chains. Ex: eip155:1:0xDEAD.

Example
"eip155:1:0xcd31cf5dbd3281442d80ceaa529eba678d55be86b7a342f5ed9cc8e49dadc855"
Types
ID
Description
The ID scalar type represents a unique identifier, often used to refetch an object or as key for a cache. The ID type appears in a JSON response as a String; however, it is not intended to be human-readable. When expected as an input type, any string (such as "4") or integer (such as 4) input value will be accepted as an ID.

Example
"4"
Types
Int
Description
The Int scalar type represents non-fractional signed whole numeric values. Int can represent values between -(2^31) and 2^31 - 1.

Example
123
Types
IntID
Description
IntID is a 64bit integer as a string - this is larger than Javascript's number.

Example
2207450143689540900
Types
Issue
Fields
Field Name Description
id - IntID!
organizationId - IntID
name - String
description - String
Example
{
"id": 2207450143689540900,
"organizationId": 2207450143689540900,
"name": "xyz789",
"description": "abc123"
}
Types
Member
Fields
Field Name Description
id - ID!
account - Account!
organization - Organization!
Example
{
"id": "4",
"account": Account,
"organization": Organization
}
Types
NativeCurrency
Fields
Field Name Description
name - String! Name of the Currency. e.g.: Ether
symbol - String! Symbol of the Currency. e.g.: ETH
decimals - Int! Decimals of the Currency. e.g.: 18
Example
{
"name": "xyz789",
"symbol": "xyz789",
"decimals": 987
}
Types
Node
Description
Union of all node types that are paginated.

Types
Union Types
Delegate

Organization

Member

Delegation

Governor

Proposal

Vote

StakeEvent

StakeEarning

Contributor

Assignment

Example
Delegate
Types
Organization
Fields
Field Name Description
id - IntID!
slug - String!
name - String!
chainIds - [ChainID!]!
tokenIds - [AssetID!]!
governorIds - [AccountID!]!
metadata - OrganizationMetadata
creator - Account
hasActiveProposals - Boolean!
proposalsCount - Int!
delegatesCount - Int!
delegatesVotesCount - Uint256!
tokenOwnersCount - Int!
endorsementService - EndorsementService
Example
{
"id": 2207450143689540900,
"slug": "xyz789",
"name": "abc123",
"chainIds": ["eip155:1"],
"tokenIds": [
"eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f"
],
"governorIds": [
"eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc"
],
"metadata": OrganizationMetadata,
"creator": Account,
"hasActiveProposals": false,
"proposalsCount": 123,
"delegatesCount": 987,
"delegatesVotesCount": 10987654321,
"tokenOwnersCount": 123,
"endorsementService": EndorsementService
}
Types
OrganizationInput
Fields
Input Field Description
id - IntID
slug - String
Example
{
"id": 2207450143689540900,
"slug": "abc123"
}
Types
OrganizationMetadata
Fields
Field Name Description
color - String
description - String
icon - String
Example
{
"color": "xyz789",
"description": "xyz789",
"icon": "xyz789"
}
Types
OrganizationsFiltersInput
Fields
Input Field Description
address - Address
chainId - ChainID
hasLogo - Boolean
isMember - Boolean Indicates whether the user holds any of the governance tokens associated with the organization.
Example
{
"address": "0x1234567800000000000000000000000000000abc",
"chainId": "eip155:1",
"hasLogo": true,
"isMember": true
}
Types
OrganizationsInput
Fields
Input Field Description
filters - OrganizationsFiltersInput
page - PageInput
sort - OrganizationsSortInput
Example
{
"filters": OrganizationsFiltersInput,
"page": PageInput,
"sort": OrganizationsSortInput
}
Types
OrganizationsSortBy
Values
Enum Value Description
id

The default sorting method. It sorts by date.
name

explore

Sorts by live proposals and voters as on the Tally explore page.
popular

Same as explore but does not prioritize live proposals.
Example
"id"
Types
OrganizationsSortInput
Fields
Input Field Description
isDescending - Boolean!
sortBy - OrganizationsSortBy!
Example
{"isDescending": true, "sortBy": "id"}
Types
PageInfo
Description
Page metadata including pagination cursors and total count

Fields
Field Name Description
firstCursor - String Cursor of the first item in the page
lastCursor - String Cursor of the last item in the page
count - Int Total number of items across all pages. FYI, this is not yet implemented so the value will always be 0
Example
{
"firstCursor": "xyz789",
"lastCursor": "abc123",
"count": 987
}
Types
PageInput
Description
Input to specify cursor based pagination parameters. Depending on which page is being fetched, between afterCursor & beforeCursor, only one's value needs to be provided

Fields
Input Field Description
afterCursor - String Cursor to start pagination after to fetch the next page
beforeCursor - String Cursor to start pagination before to fetch the previous page
limit - Int Maximum number of items per page 20 is the hard limit set on the backend
Example
{
"afterCursor": "xyz789",
"beforeCursor": "xyz789",
"limit": 987
}
Types
PaginatedOutput
Description
Wraps a list of nodes and the pagination info

Fields
Field Name Description
nodes - [Node!]! List of nodes for the page
pageInfo - PageInfo! Pagination information
Example
{
"nodes": [Delegate],
"pageInfo": PageInfo
}
Types
Parameter
Fields
Field Name Description
name - String!
type - String!
value - Any!
valueDecoded - [ValueDecoded!]
Example
{
"name": "xyz789",
"type": "abc123",
"value": Any,
"valueDecoded": [ValueDecoded]
}
Types
Proposal
Fields
Field Name Description
id - IntID! Tally ID
onchainId - String ID onchain
block - Block
chainId - ChainID!
creator - Account Account that submitted this proposal onchain
end - BlockOrTimestamp! Last block or timestamp when you can cast a vote
events - [ProposalEvent!]! List of state transitions for this proposal. The last ProposalEvent is the current state.
executableCalls - [ExecutableCall!]
governor - Governor!
metadata - ProposalMetadata!
organization - Organization!
proposer - Account Account that created this proposal offchain
quorum - Uint256
status - ProposalStatus!
start - BlockOrTimestamp! First block when you can cast a vote, also the time when quorum is established
voteStats - [VoteStats!]
Example
{
"id": 2207450143689540900,
"onchainId": "abc123",
"block": Block,
"chainId": "eip155:1",
"creator": Account,
"end": Block,
"events": [ProposalEvent],
"executableCalls": [ExecutableCall],
"governor": Governor,
"metadata": ProposalMetadata,
"organization": Organization,
"proposer": Account,
"quorum": 10987654321,
"status": "active",
"start": Block,
"voteStats": [VoteStats]
}
Types
ProposalEvent
Fields
Field Name Description
block - Block
chainId - ChainID!
createdAt - Timestamp!
type - ProposalEventType!
txHash - Hash
Example
{
"block": Block,
"chainId": "eip155:1",
"createdAt": 1663224162,
"type": "activated",
"txHash": "0xcd31cf5dbd3281442d80ceaa529eba678d55be86b7a342f5ed9cc8e49dadc855"
}
Types
ProposalEventType
Values
Enum Value Description
activated

canceled

created

defeated

drafted

executed

expired

extended

pendingexecution

queued

succeeded

callexecuted

crosschainexecuted

Example
"activated"
Types
ProposalInput
Fields
Input Field Description
id - IntID
onchainId - String this is not unique across governors; so must be used in combination with governorId
governorId - AccountID
includeArchived - Boolean
isLatest - Boolean
Example
{
"id": 2207450143689540900,
"onchainId": "xyz789",
"governorId": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"includeArchived": true,
"isLatest": true
}
Types
ProposalMetadata
Fields
Field Name Description
title - String! Proposal title: usually first line of description
description - String! Proposal description onchain
eta - Int Time at which a proposal can be executed
ipfsHash - String
previousEnd - Int
timelockId - AccountID
txHash - Hash
discourseURL - String
snapshotURL - String
Example
{
"title": "Fund the Grants Program",
"description": "Here's why it's a good idea to fund the Grants Program",
"eta": 1675437793,
"ipfsHash": "xyz789",
"previousEnd": 123,
"timelockId": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"txHash": "0xcd31cf5dbd3281442d80ceaa529eba678d55be86b7a342f5ed9cc8e49dadc855",
"discourseURL": "abc123",
"snapshotURL": "abc123"
}
Types
ProposalStats
Fields
Field Name Description
total - Int! Total count of proposals
active - Int! Total count of active proposals
failed - Int! Total count of failed proposals including quorum not reached
passed - Int! Total count of passed proposals
Example
{"total": 123, "active": 987, "failed": 123, "passed": 123}
Types
ProposalStatus
Values
Enum Value Description
active

archived

canceled

callexecuted

defeated

draft

executed

expired

extended

pending

queued

pendingexecution

submitted

succeeded

crosschainexecuted

Example
"active"
Types
ProposalsCreatedCountInput
Fields
Input Field Description
governorId - AccountID
organizationId - IntID
Example
{
"governorId": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"organizationId": 2207450143689540900
}
Types
ProposalsFiltersInput
Fields
Input Field Description
governorId - AccountID
includeArchived - Boolean Only drafts can be archived; so, this works ONLY with isDraft: true
isDraft - Boolean
organizationId - IntID
proposer - Address Address that created the proposal offchain; in other words, created the draft
Example
{
"governorId": "eip155:1:0x7e90e03654732abedf89Faf87f05BcD03ACEeFdc",
"includeArchived": true,
"isDraft": true,
"organizationId": 2207450143689540900,
"proposer": "0x1234567800000000000000000000000000000abc"
}
Types
ProposalsInput
Fields
Input Field Description
filters - ProposalsFiltersInput!
page - PageInput
sort - ProposalsSortInput
Example
{
"filters": ProposalsFiltersInput,
"page": PageInput,
"sort": ProposalsSortInput
}
Types
ProposalsSortBy
Values
Enum Value Description
id

The default sorting method. It sorts by date.
Example
"id"
Types
ProposalsSortInput
Fields
Input Field Description
isDescending - Boolean!
sortBy - ProposalsSortBy!
Example
{"isDescending": false, "sortBy": "id"}
Types
Role
Values
Enum Value Description
ADMIN

USER

Example
"ADMIN"
Types
StakeEarning
Fields
Field Name Description
amount - Uint256!
date - Date!
Example
{
"amount": 10987654321,
"date": "2022-09-22"
}
Types
StakeEvent
Fields
Field Name Description
amount - Uint256!
block - Block!
type - StakeEventType!
Example
{"amount": 10987654321, "block": Block, "type": "deposit"}
Types
StakeEventType
Values
Enum Value Description
deposit

withdraw

Example
"deposit"
Types
String
Description
The String scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.

Example
"xyz789"
Types
Timestamp
Description
Timestamp is a RFC3339 string.

Example
1663224162
Types
Token
Description
Core type that describes an onchain Token contract

Fields
Field Name Description
id - AssetID!
type - TokenType! Token contract type
name - String! Onchain name
symbol - String! Onchain symbol
supply - Uint256! supply derived from Transfer events
decimals - Int! Number of decimal places included in Uint256 values
eligibility - Eligibility! Eligibility of an account to claim this token
Arguments
id - AccountID!
isIndexing - Boolean!
isBehind - Boolean!
Example
{
"id": "eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f",
"type": "ERC20",
"name": "xyz789",
"symbol": "xyz789",
"supply": 10987654321,
"decimals": 987,
"eligibility": Eligibility,
"isIndexing": true,
"isBehind": true
}
Types
TokenContract
Fields
Field Name Description
address - Address!
type - TokenType!
Example
{
"address": "0x1234567800000000000000000000000000000abc",
"type": "ERC20"
}
Types
TokenInput
Fields
Input Field Description
id - AssetID!
Example
{
"id": "eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f"
}
Types
TokenType
Values
Enum Value Description
ERC20

ERC721

ERC20AAVE

SOLANASPOKETOKEN

Example
"ERC20"
Types
Uint256
Description
Uint256 is a large unsigned integer represented as a string.

Example
10987654321
Types
UserBio
Fields
Field Name Description
value - String!
summary - String!
Example
{
"value": "xyz789",
"summary": "abc123"
}
Types
ValueDecoded
Fields
Field Name Description
operation - Int!
to - String!
value - String!
data - String!
dataDecoded - DataDecoded
Example
{
"operation": 123,
"to": "xyz789",
"value": "xyz789",
"data": "xyz789",
"dataDecoded": DataDecoded
}
Types
Vote
Fields
Field Name Description
id - IntID!
amount - Uint256!
block - Block!
chainId - ChainID!
isBridged - Boolean
proposal - Proposal!
reason - String
type - VoteType!
txHash - Hash!
voter - Account!
Example
{
"id": 2207450143689540900,
"amount": 10987654321,
"block": Block,
"chainId": "eip155:1",
"isBridged": false,
"proposal": Proposal,
"reason": "abc123",
"type": "abstain",
"txHash": "0xcd31cf5dbd3281442d80ceaa529eba678d55be86b7a342f5ed9cc8e49dadc855",
"voter": Account
}
Types
VoteStats
Description
Voting Summary per Choice

Fields
Field Name Description
type - VoteType!
votesCount - Uint256! Total votes casted for this Choice/VoteType
votersCount - Int! Total number of distinct voters for this Choice/VoteType
percent - Float! Percent of votes casted for this Choice/`Votetype'
Example
{
"type": "abstain",
"votesCount": 10987654321,
"votersCount": 123,
"percent": 123.45
}
Types
VoteType
Values
Enum Value Description
abstain

against

for

pendingabstain

pendingagainst

pendingfor

Example
"abstain"
Types
VotesFiltersInput
Fields
Input Field Description
proposalId - IntID
proposalIds - [IntID!]
voter - Address
includePendingVotes - Boolean
type - VoteType
Example
{
"proposalId": 2207450143689540900,
"proposalIds": [2207450143689540900],
"voter": "0x1234567800000000000000000000000000000abc",
"includePendingVotes": false,
"type": "abstain"
}
Types
VotesInput
Fields
Input Field Description
filters - VotesFiltersInput!
page - PageInput
sort - VotesSortInput
Example
{
"filters": VotesFiltersInput,
"page": PageInput,
"sort": VotesSortInput
}
Types
VotesSortBy
Values
Enum Value Description
id

The default sorting method. It sorts by date.
amount

Example
"id"
Types
VotesSortInput
Fields
Input Field Description
isDescending - Boolean!
sortBy - VotesSortBy!
Example
{"isDescending": true, "sortBy": "id"}
Documentation by Anvil SpectaQL
