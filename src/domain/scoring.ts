// ==============================================================
// Candidate Scoring Calculation — Section 15 Specification
// ==============================================================

import { CandidateScoreBreakdown } from './types';

export interface ScoringWeights {
  relevance: number;
  novelty: number;
  sourceQuality: number;
  technicalDepth: number;
  audienceValue: number;
  timeliness: number;
  originality: number;
  confidence: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  relevance: 0.20,
  novelty: 0.15,
  sourceQuality: 0.15,
  technicalDepth: 0.10,
  audienceValue: 0.15,
  timeliness: 0.15,
  originality: 0.05,
  confidence: 0.05,
};

export function calculateOverallScore(
  input: Omit<CandidateScoreBreakdown, 'overallScore'>,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): CandidateScoreBreakdown {
  const overall =
    input.relevance * weights.relevance +
    input.novelty * weights.novelty +
    input.sourceQuality * weights.sourceQuality +
    input.technicalDepth * weights.technicalDepth +
    input.audienceValue * weights.audienceValue +
    input.timeliness * weights.timeliness +
    input.originality * weights.originality +
    input.confidence * weights.confidence;

  const roundedOverall = Math.round(overall * 10) / 10;

  return {
    ...input,
    overallScore: roundedOverall,
  };
}
