import { describe, it, expect } from 'vitest';
import { calculateOverallScore, DEFAULT_SCORING_WEIGHTS } from '../../src/domain/scoring';

describe('Candidate Scoring (Section 15)', () => {
  it('correctly calculates weighted overall score with default weights', () => {
    const input = {
      relevance: 100,      // 0.20 -> 20
      novelty: 100,        // 0.15 -> 15
      sourceQuality: 100,  // 0.15 -> 15
      technicalDepth: 100, // 0.10 -> 10
      audienceValue: 100,  // 0.15 -> 15
      timeliness: 100,     // 0.15 -> 15
      originality: 100,    // 0.05 -> 5
      confidence: 100,     // 0.05 -> 5
    };

    const res = calculateOverallScore(input, DEFAULT_SCORING_WEIGHTS);
    expect(res.overallScore).toBe(100);
  });

  it('accurately weights lower values', () => {
    const input = {
      relevance: 80,
      novelty: 70,
      sourceQuality: 90,
      technicalDepth: 85,
      audienceValue: 75,
      timeliness: 95,
      originality: 60,
      confidence: 80,
    };

    const res = calculateOverallScore(input);
    expect(res.overallScore).toBeGreaterThanOrEqual(75);
    expect(res.overallScore).toBeLessThanOrEqual(85);
  });
});
