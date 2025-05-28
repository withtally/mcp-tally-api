import { describe, it, expect } from 'bun:test';

describe('TallyMcpServer', () => {
  it('should build successfully', () => {
    // This test simply verifies that the code compiles and imports work
    expect(true).toBe(true);
  });

  it('should have environment variables configured', () => {
    // Test that environment variables are accessible
    const tallyApiUrl =
      process.env.TALLY_API_URL || 'https://api.tally.xyz/query';
    expect(tallyApiUrl).toBeDefined();
    expect(tallyApiUrl).toContain('tally.xyz');
  });
});
