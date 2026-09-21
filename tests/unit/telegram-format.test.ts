import { describe, it, expect } from 'vitest';
import { formatTelegramPost, escapeMarkdown, buildApprovalNotificationText } from '../../src/domain/telegram-format';
import { ContentDraft, ContentType, DraftStatus } from '../../src/domain/types';

describe('Telegram Post Formatting (Section 19 & 21)', () => {
  const sampleDraft: ContentDraft = {
    id: 'draft-test-01',
    workspaceId: 'ws-1',
    channelId: 'ch-1',
    topic: 'Open Source AI',
    title: 'DeepSeek releases open weights for v3 reasoning architecture',
    headline: 'DeepSeek open-sources v3 reasoning weights',
    body: 'DeepSeek has released the full open weights.',
    explanation: 'DeepSeek has released the full open weights and technical report for its v3 architecture.',
    whyItMatters: [
      'Full weights licensed under open permissive terms',
      'Extreme training efficiency via FP8 mixed precision pipeline',
    ],
    technicalContext: 'Utilizes Multi-head Latent Attention (MLA) to compress KV cache.',
    whatToWatch: 'Community quantization kernels rolling out over 48 hours.',
    contentType: ContentType.OPEN_SOURCE,
    confidenceScore: 95,
    contentScore: 92,
    status: DraftStatus.PENDING_APPROVAL,
    suggestedPublishTime: 'Today, 20:30 UTC',
    sources: [
      { title: 'Technical Report', url: 'https://github.com/deepseek-ai/DeepSeek-V3' },
    ],
    factCheckItems: [],
    revisionCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('formats post with headline, explanation, why it matters, technical context, and source', () => {
    const formatted = formatTelegramPost(sampleDraft);
    expect(formatted).toContain('📦 *DeepSeek open-sources v3 reasoning weights*');
    expect(formatted).toContain('*Why it matters:*');
    expect(formatted).toContain('• Full weights licensed under open permissive terms');
    expect(formatted).toContain('*Technical context:*');
    expect(formatted).toContain('*What to watch:*');
    expect(formatted).toContain('*Source:*');
    expect(formatted).toContain('[Technical Report](https://github.com/deepseek-ai/DeepSeek-V3)');
  });

  it('builds Telegram approval message containing all preview details for owner', () => {
    const notification = buildApprovalNotificationText(sampleDraft);
    expect(notification).toContain('NEW CONTENT PROPOSAL');
    expect(notification).toContain('Topic:* Open Source AI');
    expect(notification).toContain('Content Score:* 92/100');
    expect(notification).toContain('Suggested publish time:* Today, 20:30 UTC');
  });
});
