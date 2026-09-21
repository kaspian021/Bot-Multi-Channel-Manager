// ==============================================================
// Duplicate Detection Algorithm — Section 16 Specification
// ==============================================================

import { ContentCandidate } from './types';

export const normalizeCanonicalUrl = normalizeUrl;
export const calculateTitleSimilarity = calculateTextSimilarity;

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateOfCandidateId?: string;
  reason?: string;
  similarityScore: number;
}

/**
 * Normalizes a URL by stripping tracking parameters, trailing slashes, and protocols.
 */
export function normalizeUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';

  let normalized = url.trim().toLowerCase();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  try {
    const parsed = new URL(normalized);
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'fbclid', 'gclid', 'mc_cid', 'mc_eid'
    ];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));
    let clean = parsed.hostname + parsed.pathname.replace(/\/+$/, '');
    if (parsed.searchParams.toString()) {
      clean += '?' + parsed.searchParams.toString();
    }
    return clean;
  } catch {
    return normalized
      .replace(/^https?:\/\//, '')
      .replace(/[?&](utm_[^&]+|ref=[^&]+)/g, '')
      .replace(/\/+$/, '');
  }
}

/**
 * Computes token-based Jaccard similarity between two text strings.
 */
export function calculateTextSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;

  const tokenize = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionSize = new Set([...setA, ...setB]).size;
  return unionSize === 0 ? 0 : intersectionCount / unionSize;
}

/**
 * Evaluates candidate against existing candidates for duplicates.
 */
export function checkDuplicate(
  candidate: { normalizedUrl: string; canonicalUrl: string; title: string; extractedClaims?: string[] },
  existingCandidates: ContentCandidate[],
  threshold = 0.70
): DuplicateCheckResult {
  const normCandidateUrl = normalizeUrl(candidate.normalizedUrl || candidate.canonicalUrl);

  for (const existing of existingCandidates) {
    const exAny = existing as any;
    const normExistingUrl = normalizeUrl(exAny.normalized_url || existing.normalizedUrl || exAny.canonical_url || existing.canonicalUrl);

    // Exact URL match
    if (normCandidateUrl && normExistingUrl && normCandidateUrl === normExistingUrl) {
      return {
        isDuplicate: true,
        duplicateOfCandidateId: existing.id,
        reason: `Exact URL match with candidate ${existing.id}`,
        similarityScore: 1.0,
      };
    }

    // Title similarity
    const titleSim = calculateTextSimilarity(candidate.title, existing.title);
    if (titleSim >= threshold) {
      return {
        isDuplicate: true,
        duplicateOfCandidateId: existing.id,
        reason: `Title similarity ${(titleSim * 100).toFixed(1)}% exceeds threshold ${(threshold * 100)}% with candidate '${existing.title}'`,
        similarityScore: titleSim,
      };
    }

    // Extracted claims overlap
    if (candidate.extractedClaims && candidate.extractedClaims.length > 0 && existing.extractedClaims) {
      const claimsA = candidate.extractedClaims.join(' ');
      const claimsB = Array.isArray(existing.extractedClaims)
        ? existing.extractedClaims.join(' ')
        : String((existing as any).extracted_claims || existing.extractedClaims);
      const claimsSim = calculateTextSimilarity(claimsA, claimsB);
      if (claimsSim >= 0.75) {
        return {
          isDuplicate: true,
          duplicateOfCandidateId: existing.id,
          reason: `High factual claim similarity (${(claimsSim * 100).toFixed(1)}%) with candidate ${existing.id}`,
          similarityScore: claimsSim,
        };
      }
    }
  }

  return {
    isDuplicate: false,
    similarityScore: 0,
  };
}
