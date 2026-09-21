// ==============================================================
// AI Provider Abstractions — Section 6 & 11 Specification
// ==============================================================

export interface ResearchQueryInput {
  topics: string[];
  channelName: string;
  channelLanguage: string;
  depth?: 'standard' | 'deep';
  excludeKeywords?: string[];
}

export interface ResearchClaimItem {
  claim: string;
  sourceUrl: string;
  confidence: number;
}

export interface RawResearchCandidate {
  title: string;
  url: string;
  sourceName: string;
  publishedAt?: string;
  summary: string;
  claims: string[];
  relevanceScore: number;
  noveltyScore: number;
  technicalDepthScore: number;
}

export interface ResearchResult {
  query: string;
  provider: string;
  timestamp: string;
  confidence: number;
  items: RawResearchCandidate[];
}

export interface StructuredDraftOutput {
  headline: string;
  body: string;
  explanation: string;
  whyItMatters: string[];
  technicalContext: string;
  whatToWatch: string;
  sources: { title: string; url: string; publisher?: string }[];
  confidence: number; // 0-100
  contentScore: number;
  contentType: string;
  topics: string[];
  extractedClaims: string[];
  mediaPrompt?: string;
  suggestedPublishTime?: string;
}

export interface IAiTextProvider {
  readonly providerName: string;
  generateText(systemPrompt: string, userPrompt: string): Promise<string>;
}

export interface IAiResearchProvider {
  readonly providerName: string;
  searchAndGround(input: ResearchQueryInput): Promise<ResearchResult>;
}

export interface IAiImageProvider {
  readonly providerName: string;
  generateImage(prompt: string): Promise<{ url: string; revisedPrompt?: string }>;
}

export interface IAiStructuredOutputProvider {
  readonly providerName: string;
  generateStructuredDraft(
    topic: string,
    candidate: RawResearchCandidate,
    channelLanguage: string
  ): Promise<StructuredDraftOutput>;
  reviseDraft(
    existingDraft: StructuredDraftOutput,
    instruction: string
  ): Promise<StructuredDraftOutput>;
}
