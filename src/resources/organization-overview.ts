/**
 * Organization Overview Resource Template
 * 
 * Provides human-readable markdown overviews of DAOs via tally://org/{organizationId}
 */

import { TallyGraphQLClient } from '../graphql-client.js';
import { getOrganization } from '../organization-tools.js';

export interface OrganizationOverview {
  uri: string;
  mimeType: string;
  text: string;
}

/**
 * Generate a markdown overview for an organization
 */
export async function getOrganizationOverview(
  graphqlClient: TallyGraphQLClient,
  organizationId: string
): Promise<OrganizationOverview> {
  try {
    // Use existing organization tool to get data
    const org = await getOrganization(graphqlClient, { organizationId });
    
    if (!org) {
      throw new Error(`Organization with ID ${organizationId} not found`);
    }

    // Generate markdown content
    const markdown = generateOrganizationMarkdown(org);
    
    return {
      uri: `tally://org/${organizationId}`,
      mimeType: 'text/markdown',
      text: markdown
    };
  } catch (error) {
    // Return error as markdown
    return {
      uri: `tally://org/${organizationId}`,
      mimeType: 'text/markdown',
      text: `# Error Loading Organization\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}\n\n*Organization ID: ${organizationId}*`
    };
  }
}

/**
 * Generate markdown content for an organization
 */
function generateOrganizationMarkdown(org: any): string {
  const sections: string[] = [];
  
  // Header
  sections.push(`# ${org.name}`);
  sections.push('');
  
  // Basic info
  if (org.description) {
    sections.push(`**Description:** ${org.description}`);
    sections.push('');
  }
  
  // Key metrics
  sections.push('## 📊 Key Metrics');
  sections.push('');
  sections.push(`- **Members:** ${org.memberCount?.toLocaleString() || 'N/A'}`);
  sections.push(`- **Total Proposals:** ${org.proposalStats?.total?.toLocaleString() || 'N/A'}`);
  sections.push(`- **Active Proposals:** ${org.proposalStats?.active?.toLocaleString() || 'N/A'}`);
  sections.push(`- **Chain:** ${org.chainId || 'N/A'}`);
  sections.push('');
  
  // Status
  sections.push('## 🏛️ Governance Status');
  sections.push('');
  const hasActive = org.proposalStats?.active > 0;
  sections.push(`**Current Activity:** ${hasActive ? '🟢 Active proposals ongoing' : '🔵 No active proposals'}`);
  sections.push('');
  
  // Links
  const links: string[] = [];
  if (org.website) links.push(`[Website](${org.website})`);
  if (org.twitter) links.push(`[Twitter](${org.twitter})`);
  if (org.github) links.push(`[GitHub](${org.github})`);
  
  if (links.length > 0) {
    sections.push('## 🔗 Links');
    sections.push('');
    sections.push(links.join(' • '));
    sections.push('');
  }
  
  // Footer
  sections.push('---');
  sections.push(`*Data from Tally API • Organization ID: ${org.id} • Slug: ${org.slug}*`);
  
  return sections.join('\n');
} 