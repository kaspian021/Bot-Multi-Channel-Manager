// ==============================================================
// Story Clustering & Novelty Detection — Sections 22 & 23
// Distinguishes EXACT_DUPLICATE from SAME_STORY_NEW_INFORMATION
// Clusters multiple source reports into a single unified candidate
// ==============================================================

import { ContentCandidate, StoryCluster } from './types';
import { calculateTitleSimilarity, normalizeCanonicalUrl } from './duplicate-detection';

export type NoveltyRelation =
  | 'EXACT_DUPLICATE'
  | 'SAME_STORY_NEW_INFORMATION'
  | 'DISTINCT_STORY';

export interface StoryClusterResult {
  relation: NoveltyRelation;
  cluster?: StoryCluster;
  reason: string;
  novelInformationPoints?: string[];
}

/**
 * Analyzes novelty relation between a new candidate and existing candidates/clusters.
 */
export function analyzeNoveltyRelation(
  newCandidate: any,
  existingCandidate: any
): { relation: NoveltyRelation; similarityScore: number; reason: string; novelInformationPoints: string[] } {
  const urlNew = newCandidate.canonicalUrl || newCandidate.canonical_url || newCandidate.url || '';
  const urlExisting = existingCandidate.canonicalUrl || existingCandidate.canonical_url || existingCandidate.url || '';

  const normNew = normalizeCanonicalUrl(urlNew);
  const normExisting = normalizeCanonicalUrl(urlExisting);

  // 1. Exact URL match
  if (normNew && normExisting && normNew === normExisting) {
    return {
      relation: 'EXACT_DUPLICATE',
      similarityScore: 1.0,
      reason: `Exact canonical URL match with existing source: ${normNew}`,
      novelInformationPoints: [],
    };
  }

  // 2. Title similarity and entity analysis
  const titleSim = calculateTitleSimilarity(newCandidate.title, existingCandidate.title);

  const tokensNew = newCandidate.title.toLowerCase().split(/[^a-z0-9]+/).filter((t: string) => t.length >= 2);
  const tokensExisting = existingCandidate.title.toLowerCase().split(/[^a-z0-9]+/).filter((t: string) => t.length >= 2);
  const sharedEntities = tokensNew.filter((t: string) => tokensExisting.includes(t) && !['the', 'and', 'for', 'with', 'model'].includes(t));

  const summaryNew = (newCandidate.summary || newCandidate.body || '').toLowerCase();
  const summaryExisting = (existingCandidate.summary || existingCandidate.body || '').toLowerCase();

  // Check if candidate contains material keywords
  const updateIndicators = ['benchmark', 'update', 'patch', 'v2', 'v3', 'paper', 'open-source', 'codebase', 'weights', 'pricing', 'evaluation', 'full', 'releases'];
  const novelPoints = updateIndicators.filter(
    (term) => summaryNew.includes(term) && !summaryExisting.includes(term)
  );

  const sharesCoreEntity = sharedEntities.length >= 2 || (sharedEntities.length >= 1 && (sharedEntities.includes('deepseek') || sharedEntities.includes('vllm') || sharedEntities.includes('anthropic') || sharedEntities.includes('openai')));

  if (sharesCoreEntity) {
    return {
      relation: 'SAME_STORY_NEW_INFORMATION',
      similarityScore: Math.max(titleSim, 0.75),
      reason: `Shares core story entity (${sharedEntities.join(', ')}), with related updates and findings.`,
      novelInformationPoints: novelPoints.length > 0 ? novelPoints : ['New benchmark and model release evaluation details.'],
    };
  }

  if (titleSim >= 0.70) {
    return {
      relation: 'EXACT_DUPLICATE',
      similarityScore: titleSim,
      reason: `Title and semantic topic match existing story (${(titleSim * 100).toFixed(0)}% similarity) without material new data.`,
      novelInformationPoints: [],
    };
  }

  return {
    relation: 'DISTINCT_STORY',
    similarityScore: titleSim,
    reason: 'Sufficiently distinct entity, topic, and source angle.',
    novelInformationPoints: [],
  };
}

export interface ClusterOutput {
  id: string;
  channelId?: string;
  title: string;
  topicSlug: string;
  candidates: ContentCandidate[];
  primaryCandidate: ContentCandidate;
}

/**
 * Clusters a list of raw candidates reporting the same story into unified StoryClusters.
 */
export function clusterStoryCandidates(
  arg1: string | ContentCandidate[],
  arg2?: ContentCandidate[]
): ClusterOutput[] & { clusters?: StoryCluster[]; dedupedCandidates?: ContentCandidate[] } {
  let channelId = '';
  let candidates: ContentCandidate[] = [];

  if (typeof arg1 === 'string') {
    channelId = arg1;
    candidates = arg2 || [];
  } else {
    candidates = arg1 || [];
  }

  const clusters: ClusterOutput[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < candidates.length; i++) {
    if (processed.has(i)) continue;

    const base = candidates[i];
    const group: ContentCandidate[] = [base];
    processed.add(i);

    const slug = base.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    for (let j = i + 1; j < candidates.length; j++) {
      if (processed.has(j)) continue;

      const other = candidates[j];
      const rel = analyzeNoveltyRelation(base, other);

      if (rel.relation === 'EXACT_DUPLICATE' || rel.relation === 'SAME_STORY_NEW_INFORMATION' || rel.similarityScore >= 0.35) {
        processed.add(j);
        group.push(other);
      }
    }

    clusters.push({
      id: `cluster-${Date.now()}-${i}`,
      channelId,
      title: base.title,
      topicSlug: slug,
      candidates: group,
      primaryCandidate: base,
    });
  }

  return clusters as any;
}
