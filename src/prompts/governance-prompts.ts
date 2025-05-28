/**
 * Governance-focused prompt templates for Tally API MCP server
 * 
 * These prompts help LLMs effectively analyze DAO governance using our tools and resources
 */

import { z } from 'zod';

export const governancePrompts = {
  /**
   * Analyze the overall governance health of a DAO
   */
  'analyze-dao-governance': {
    schema: {
      organizationId: z.string().describe('The organization ID to analyze'),
      includeComparison: z.string().optional().describe('Whether to compare with other similar DAOs (true/false)')
    },
    handler: ({ organizationId, includeComparison }: { organizationId: string; includeComparison?: string }) => {
      const shouldCompare = includeComparison === 'true';
      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Analyze the governance health of organization ${organizationId}. Please:

1. **Get Organization Overview**: Use get_organization to understand the DAO's basic info
2. **Check Active Governance**: Use get_active_proposals with organizationId to see current voting activity
3. **Analyze Delegate Distribution**: Use get_delegates to examine voting power distribution
4. **Review Recent Proposals**: Use list_proposals to understand proposal patterns and success rates

Focus on:
- Governance participation rates and trends
- Voting power concentration vs. decentralization
- Proposal quality and community engagement
- Delegate activity and representation
${shouldCompare ? '\n5. **Compare with Peers**: Use list_organizations to find similar DAOs for comparison' : ''}

Provide actionable insights about the DAO's governance strengths and areas for improvement.`
          }
        }]
      };
    }
  },

  /**
   * Compare governance metrics between multiple DAOs
   */
  'compare-dao-governance': {
    schema: {
      dao1: z.string().describe('First DAO organization ID or slug'),
      dao2: z.string().describe('Second DAO organization ID or slug'),
      aspect: z.string().describe('Specific aspect to focus the comparison on (overall, delegates, proposals, activity)')
    },
    handler: ({ dao1, dao2, aspect }: { dao1: string; dao2: string; aspect: string }) => {
      const aspectInstructions = {
        overall: 'Compare all governance aspects including participation, delegate distribution, proposal activity, and community engagement',
        delegates: 'Focus on delegate ecosystems: voting power distribution, delegate activity, and representation quality',
        proposals: 'Compare proposal patterns: success rates, types, community engagement, and voting participation',
        activity: 'Focus on governance activity levels: proposal frequency, voting participation, and community engagement trends'
      };

      const instruction = aspectInstructions[aspect as keyof typeof aspectInstructions] || aspectInstructions.overall;

      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Compare the governance of ${dao1} and ${dao2}, focusing on ${aspect}.

**Step-by-step analysis:**

1. **Gather Data for Both DAOs**:
   - Use get_organization for each DAO to get basic metrics
   - Use get_delegates to analyze voting power distribution
   - Use list_proposals to review recent governance activity
   - Use get_active_proposals with organizationId to check current activity levels

2. **Analysis Focus**: ${instruction}

3. **Comparison Framework**:
   - Quantitative metrics (member counts, proposal counts, voting participation)
   - Qualitative assessment (governance quality, community health)
   - Structural differences (governance models, voting mechanisms)

4. **Insights & Recommendations**:
   - Which DAO has stronger governance practices and why
   - What each DAO could learn from the other
   - Specific actionable recommendations for improvement

Present your findings in a clear, structured format with supporting data.`
          }
        }]
      };
    }
  },

  /**
   * Research and profile a specific delegate
   */
  'analyze-delegate-profile': {
    schema: {
      address: z.string().describe('Ethereum address of the delegate'),
      organizationId: z.string().optional().describe('Specific organization to focus on (optional)')
    },
    handler: ({ address, organizationId }: { address: string; organizationId?: string }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Analyze the governance profile and activity of delegate ${address}${organizationId ? ` in organization ${organizationId}` : ' across all DAOs'}.

**Research Steps:**

1. **Get Delegate Overview**: Use get_user_profile to understand their overall DAO participation
${organizationId ? `2. **Specific DAO Analysis**: Use get_delegate_statement to get their statement and positions in ${organizationId}` : '2. **Cross-DAO Analysis**: Review their participation across multiple DAOs'}
3. **Voting Power Analysis**: Check their current voting power and delegation status
4. **Activity Assessment**: Evaluate their governance participation and engagement

**Analysis Framework:**
- **Governance Experience**: How long have they been active? Which DAOs?
- **Voting Power**: Current delegation and influence level
- **Participation Quality**: Voting consistency, proposal engagement
- **Community Standing**: Delegate statements, community recognition
- **Specialization**: Any particular focus areas or expertise

**Output**: Provide a comprehensive delegate profile that would help token holders make informed delegation decisions.`
        }
      }]
    })
  },

  /**
   * Discover trending governance activity across the ecosystem
   */
  'discover-governance-trends': {
    schema: {
      timeframe: z.string().describe('Time focus for trend analysis (current, recent, emerging)'),
      category: z.string().optional().describe('Category of DAOs to focus on (all, defi, infrastructure, social)')
    },
    handler: ({ timeframe, category }: { timeframe: string; category?: string }) => {
      const timeframeInstructions = {
        current: 'Focus on active proposals and immediate governance activity happening right now',
        recent: 'Analyze recent governance patterns and completed proposals from the past few weeks',
        emerging: 'Identify new DAOs, emerging governance patterns, and innovative approaches'
      };

      const instruction = timeframeInstructions[timeframe as keyof typeof timeframeInstructions] || timeframeInstructions.current;

      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Discover and analyze ${timeframe} governance trends across the DAO ecosystem${category && category !== 'all' ? ` in the ${category} category` : ''}.

**Discovery Process:**

1. **Active Governance Scan**: Use get_organizations_with_active_proposals to find DAOs with active governance, then use get_active_proposals with specific organizationId to see current activity
2. **Organization Landscape**: Use list_organizations with explore sorting to find most active DAOs
3. **Delegate Ecosystem**: Use get_delegates across top DAOs to understand leadership trends
4. **Proposal Patterns**: Use list_proposals to analyze recent governance themes

**Analysis Focus**: ${instruction}

**Trend Categories to Explore:**
- **Governance Innovation**: New voting mechanisms, delegation models, or participation incentives
- **Hot Topics**: Common themes across multiple DAO proposals
- **Participation Patterns**: Changes in voter engagement and delegate activity
- **Cross-DAO Movements**: Shared initiatives or coordinated governance actions
${category ? `- **${category.charAt(0).toUpperCase() + category.slice(1)} Specific**: Trends unique to ${category} DAOs` : ''}

**Deliverable**: A trend report highlighting the most significant governance developments, with specific examples and data to support your findings.`
          }
        }]
      };
    }
  },

  /**
   * Help users find the right DAO to participate in
   */
  'find-dao-to-join': {
    schema: {
      interests: z.string().describe('User interests or focus areas (comma-separated, e.g., "DeFi,gaming,social impact")'),
      participationLevel: z.string().describe('Desired level of participation (observer, voter, delegate, contributor)'),
      experience: z.string().describe('Governance experience level (beginner, intermediate, expert)')
    },
    handler: ({ interests, participationLevel, experience }: { interests: string; participationLevel: string; experience: string }) => {
      const interestArray = interests.split(',').map(i => i.trim());
      
      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Help find the best DAO(s) for someone interested in: ${interestArray.join(', ')}, wanting to participate as a ${participationLevel}, with ${experience} governance experience.

**Discovery Process:**

1. **DAO Landscape Survey**: Use list_organizations to explore available DAOs
2. **Activity Assessment**: Use get_organizations_with_active_proposals to find DAOs with healthy governance activity
3. **Community Analysis**: Use get_delegates to understand the delegate ecosystem and entry barriers
4. **Governance Culture**: Use list_proposals to assess proposal quality and community engagement

**Matching Criteria:**
- **Interest Alignment**: DAOs working in relevant areas (${interestArray.join(', ')})
- **Participation Opportunities**: Suitable for ${participationLevel} level engagement
- **Experience Fit**: Appropriate complexity for ${experience} governance participants
- **Community Health**: Active, welcoming, and well-functioning governance

**For ${participationLevel}s specifically:**
${participationLevel === 'observer' ? '- Focus on DAOs with transparent governance and educational resources' : ''}
${participationLevel === 'voter' ? '- Look for DAOs with regular proposals and clear voting processes' : ''}
${participationLevel === 'delegate' ? '- Identify DAOs needing quality delegates with growth opportunities' : ''}
${participationLevel === 'contributor' ? '- Find DAOs with active working groups and contribution opportunities' : ''}

**Recommendations**: Provide 3-5 specific DAO recommendations with rationale for each, including how to get started and what to expect.`
          }
        }]
      };
    }
  },

  /**
   * Analyze a specific proposal in detail
   */
  'analyze-proposal': {
    schema: {
      organizationId: z.string().describe('Organization ID where the proposal exists'),
      proposalId: z.string().describe('Specific proposal ID to analyze')
    },
    handler: ({ organizationId, proposalId }: { organizationId: string; proposalId: string }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Provide a comprehensive analysis of proposal ${proposalId} in organization ${organizationId}.

**Analysis Steps:**

1. **Proposal Details**: Use get_proposal to get full proposal information
2. **Organization Context**: Use get_organization to understand the DAO's background
3. **Voting Analysis**: Examine current voting patterns and participation
4. **Delegate Positions**: Use get_delegates to see how key delegates might vote
5. **Historical Context**: Use list_proposals to compare with similar past proposals

**Analysis Framework:**

**Proposal Overview:**
- What is being proposed and why?
- What are the potential impacts and implications?
- How does this fit into the DAO's broader strategy?

**Voting Dynamics:**
- Current voting trends and participation levels
- Key delegate positions and influence
- Likelihood of passage based on current data

**Risk Assessment:**
- Potential benefits and drawbacks
- Implementation challenges
- Community sentiment and concerns

**Recommendation:**
- Should token holders support this proposal?
- What questions should voters consider?
- How does this align with the DAO's long-term interests?

Provide a balanced, data-driven analysis that helps inform voting decisions.`
        }
      }]
    })
  }
}; 