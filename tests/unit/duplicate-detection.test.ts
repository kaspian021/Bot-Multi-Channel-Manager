import { describe, it, expect } from 'vitest';
import { normalizeUrl, calculateTextSimilarity, checkDuplicate } from '../../src/domain/duplicate-detection';
import { ContentCandidate, ContentType } from '../../src/domain/types';

describe('Duplicate Detection (Section 16)', () => {
  it('normalizes URLs by stripping tracking queries and protocols', () => {
    const url1 = 'https://TechCrunch.com/2026/09/ai-release/?utm_source=twitter&utm_medium=social';
    const url2 = 'http://techcrunch.com/2026/09/ai-release';
    expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
  });

  it('detects duplicate via exact normalized URL match', () => {
    const existing: ContentCandidate[] = [
      {
        id: 'cand-001',
        workspaceId: 'ws-1',
        channelId: 'ch-1',
        title: 'Anthropic releases Model Context Protocol',
        canonicalUrl: 'https://anthropic.com/news/model-context-protocol',
        normalizedUrl: 'anthropic.com/news/model-context-protocol',
        contentType: ContentType.TOOL_ANNOUNCEMENT,
        summary: 'MCP announcement',
        extractedClaims: ['JSON-RPC 2.0 protocol'],
        score: {} as any,
        isDuplicate: false,
        createdAt: new Date().toISOString(),
      },
    ];

    const result = checkDuplicate(
      {
        normalizedUrl: 'anthropic.com/news/model-context-protocol?utm_source=rss',
        canonicalUrl: 'https://anthropic.com/news/model-context-protocol?utm_source=rss',
        title: 'Anthropic MCP announcement',
      },
      existing
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateOfCandidateId).toBe('cand-001');
  });

  it('detects duplicate via high title similarity', () => {
    const existing: ContentCandidate[] = [
      {
        id: 'cand-002',
        workspaceId: 'ws-1',
        channelId: 'ch-1',
        title: 'DeepSeek open-sources v3 reasoning weights with multi-token prediction',
        canonicalUrl: 'https://source1.com/deepseek',
        normalizedUrl: 'source1.com/deepseek',
        contentType: ContentType.OPEN_SOURCE,
        summary: 'DeepSeek release',
        extractedClaims: [],
        score: {} as any,
        isDuplicate: false,
        createdAt: new Date().toISOString(),
      },
    ];

    const result = checkDuplicate(
      {
        normalizedUrl: 'diff-source.org/deepseek-v3',
        canonicalUrl: 'https://diff-source.org/deepseek-v3',
        title: 'DeepSeek open sources v3 reasoning weights with multi token prediction',
      },
      existing
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateOfCandidateId).toBe('cand-002');
  });
});
