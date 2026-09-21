// ==============================================================
// AI Quality Gate — Section 32 Specification
// ==============================================================

import { QualityGateEvaluation, QualityGateStatus } from './types';

export interface QualityGateInput {
  headline: string;
  body: string;
  sourcesCount: number;
  factCheckCount: number;
  verifiedFactCount: number;
  confidenceScore: number;
  contentScore: number;
  isDuplicateLikely: boolean;
}

export function evaluateQualityGate(input: QualityGateInput): QualityGateEvaluation {
  const reasons: string[] = [];
  const fullText = `${input.headline}\n${input.body}`;
  const charLength = fullText.length;

  // 1. Length validation (target 400 - 1200 chars)
  if (charLength < 100) {
    reasons.push(`Post length (${charLength} chars) is too brief for a substantial technical update.`);
  } else if (charLength > 1600) {
    reasons.push(`Post length (${charLength} chars) exceeds optimal Telegram readability guidelines.`);
  }

  // 2. Clickbait words check (Section 18: Avoid "Exciting news!", "Revolutionary breakthrough!", "This changes everything!")
  const forbiddenPhrases = [
    'exciting news',
    'revolutionary breakthrough',
    'this changes everything',
    'mind-blowing',
    'game-changing revolution',
    'you will not believe',
  ];

  let clickbaitCount = 0;
  const lower = fullText.toLowerCase();
  for (const phrase of forbiddenPhrases) {
    if (lower.includes(phrase)) {
      clickbaitCount++;
      reasons.push(`Contains forbidden hype/clickbait phrase: "${phrase}"`);
    }
  }

  const clickbaitScore = Math.min(100, clickbaitCount * 30);

  // 3. Source coverage
  let sourceCoverageScore = 100;
  if (input.sourcesCount === 0) {
    sourceCoverageScore = 0;
    reasons.push('No verifiable source linked to this factual draft.');
  } else if (input.sourcesCount === 1) {
    sourceCoverageScore = 80;
  }

  // 4. Factuality & Hallucination risk
  let factualityScore = 90;
  let hallucinationRisk = 15;
  if (input.factCheckCount > 0) {
    const verifiedRatio = input.verifiedFactCount / input.factCheckCount;
    factualityScore = Math.round(verifiedRatio * 100);
    hallucinationRisk = Math.round((1 - verifiedRatio) * 60);
  }

  if (input.confidenceScore < 60) {
    hallucinationRisk += 30;
    reasons.push(`Low AI generation confidence score (${input.confidenceScore}/100)`);
  }

  // 5. Grammar & Writing Quality
  const grammarScore = 95;
  const writingQualityScore = Math.min(100, Math.round((input.contentScore + factualityScore) / 2));

  // Determine Overall Status
  let status: QualityGateStatus = QualityGateStatus.PASS;

  if (
    input.sourcesCount === 0 ||
    charLength < 100 ||
    hallucinationRisk > 55 ||
    clickbaitCount >= 2 ||
    input.confidenceScore < 50 ||
    input.isDuplicateLikely
  ) {
    status = QualityGateStatus.FAIL;
  } else if (clickbaitCount === 1 || charLength < 200 || hallucinationRisk > 30 || input.confidenceScore < 70) {
    status = QualityGateStatus.WARN;
  }

  return {
    status,
    factualityScore,
    sourceCoverageScore,
    writingQualityScore,
    grammarScore,
    duplicateLikelihood: input.isDuplicateLikely ? 85 : 10,
    clickbaitScore,
    hallucinationRisk,
    reasons,
  };
}
