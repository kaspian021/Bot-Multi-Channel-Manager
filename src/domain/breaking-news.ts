// ==============================================================
// Breaking News & Freshness Detector — Section 21 & 96
// Classifies into BREAKING, RECENT, CURRENT, EVERGREEN
// ==============================================================

import { BreakingNewsCategory, SourceTrustTier } from './types';

export interface BreakingNewsInput {
  publishedAt?: string;
  sourceTrustScore?: number;
  sourceCount?: number;
  isOfficialSource?: boolean;
  topicImportance?: number;
  importanceScore?: number;
  sourceTier?: SourceTrustTier | number;
  hasPrimarySource?: boolean;
  title?: string;
}

export function detectBreakingNewsCategory(input: BreakingNewsInput): BreakingNewsCategory {
  const now = Date.now();
  const pubTime = input.publishedAt ? new Date(input.publishedAt).getTime() : now;
  const ageHours = Math.max(0, (now - pubTime) / (1000 * 60 * 60));

  // Evergreen analysis: content published > 14 days ago or conceptual tutorials
  if (ageHours > 336) { // > 14 days
    return 'EVERGREEN';
  }

  // Breaking analysis: age <= 2 hours with Tier 1 / official / high importance
  if (ageHours <= 2) {
    const isTier1 = input.sourceTier === SourceTrustTier.TIER_1 || input.sourceTier === 1;
    const isOfficial = input.isOfficialSource || input.hasPrimarySource;
    const isHighImpact = (input.importanceScore || input.topicImportance || 0) >= 80;

    if (isTier1 || isOfficial || isHighImpact || (input.sourceTrustScore && input.sourceTrustScore >= 85)) {
      return 'BREAKING';
    }
  }

  // Recent: published within last 24 hours
  if (ageHours <= 24) {
    return 'RECENT';
  }

  return 'CURRENT';
}
