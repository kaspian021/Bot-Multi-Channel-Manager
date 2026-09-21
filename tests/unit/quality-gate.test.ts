import { describe, it, expect } from 'vitest';
import { evaluateQualityGate } from '../../src/domain/quality-gate';
import { QualityGateStatus } from '../../src/domain/types';

describe('Quality Gate Evaluation (Section 32)', () => {
  it('passes a high-quality, factual post with sources and clean language', () => {
    const res = evaluateQualityGate({
      headline: 'DeepSeek releases open weights for v3 reasoning architecture',
      body: 'DeepSeek has open-sourced the full weights and technical report for its v3 architecture, featuring 671B total parameters with 37B active per token. The architecture utilizes Multi-head Latent Attention to compress key-value cache footprint by 65%.',
      sourcesCount: 2,
      factCheckCount: 2,
      verifiedFactCount: 2,
      confidenceScore: 92,
      contentScore: 90,
      isDuplicateLikely: false,
    });

    expect(res.status).toBe(QualityGateStatus.PASS);
    expect(res.factualityScore).toBe(100);
    expect(res.clickbaitScore).toBe(0);
  });

  it('fails posts with zero sources', () => {
    const res = evaluateQualityGate({
      headline: 'Some AI tool announced',
      body: 'Here is some text with reasonable length describing an AI tool announcement in technical detail without hype.',
      sourcesCount: 0,
      factCheckCount: 1,
      verifiedFactCount: 1,
      confidenceScore: 90,
      contentScore: 85,
      isDuplicateLikely: false,
    });

    expect(res.status).toBe(QualityGateStatus.FAIL);
    expect(res.reasons).toContain('No verifiable source linked to this factual draft.');
  });

  it('detects and flags clickbait phrases', () => {
    const res = evaluateQualityGate({
      headline: 'Exciting news! Revolutionary breakthrough changes everything!',
      body: 'Mind-blowing new AI tool released today with unbelievable results.',
      sourcesCount: 1,
      factCheckCount: 1,
      verifiedFactCount: 1,
      confidenceScore: 80,
      contentScore: 70,
      isDuplicateLikely: false,
    });

    expect(res.status).toBe(QualityGateStatus.FAIL);
    expect(res.clickbaitScore).toBeGreaterThanOrEqual(60);
  });
});
