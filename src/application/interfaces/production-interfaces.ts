// ==============================================================
// Production Provider Interfaces — Phase 3 Specification
// ==============================================================

import {
  ContentCandidate,
  ContentDraft,
  EvidenceItem,
  Claim,
  ResearchResult,
  ContentType,
} from '../../domain/types';
import { RawResearchCandidate } from './ai-providers';

export interface IWebSearchProvider {
  readonly providerName: string;
  isAvailable(): boolean;
  search(
    query: string,
    options?: { language?: string; maxResults?: number }
  ): Promise<{ title: string; url: string; snippet: string; publishedDate?: string }[]>;
}

export interface IResearchProvider {
  readonly providerName: string;
  isAvailable(): boolean;
  executeResearch(
    query: string,
    options?: {
      language?: string;
      sourceLanguages?: string[];
      maxResults?: number;
      channelName?: string;
    }
  ): Promise<ResearchResult>;
}

export interface ISourceFetcher {
  fetch(
    url: string,
    options?: { timeoutMs?: number; maxBytes?: number }
  ): Promise<{
    url: string;
    canonicalUrl?: string;
    contentType: string;
    content: string;
    statusCode: number;
    headers: Record<string, string>;
  }>;
}

export interface ExtractedArticleContent {
  title?: string;
  subtitle?: string;
  author?: string;
  publicationDate?: string;
  mainContent: string;
  headings: string[];
  quotes: string[];
  canonicalUrl?: string;
}

export interface IContentExtractor {
  extract(html: string, url: string): Promise<ExtractedArticleContent>;
}

export interface ISocialSourceProvider {
  readonly platform: 'YOUTUBE' | 'REDDIT';
  isConfigured(): boolean;
  fetchSignals(query: string, options?: any): Promise<RawResearchCandidate[]>;
}

export interface ITelegramPublisher {
  publishPost(
    channelChatId: string,
    text: string,
    mediaUrl?: string,
    idempotencyKey?: string
  ): Promise<{ messageId: number; messageUrl?: string; success: boolean }>;

  verifyChannel(
    channelChatId: string
  ): Promise<{
    valid: boolean;
    title?: string;
    username?: string;
    isAdministrator: boolean;
    canPostMessages: boolean;
    error?: string;
  }>;

  updateChannelMetadata(
    channelChatId: string,
    metadata: { title?: string; description?: string; photoBuffer?: Buffer }
  ): Promise<{ success: boolean; error?: string }>;
}

export interface ITelegramOwnerMessenger {
  sendProposal(
    ownerUserId: number | string,
    draft: ContentDraft,
    ownerLanguage?: string
  ): Promise<{ messageId: number; success: boolean }>;

  sendEvidenceDrilldown(
    ownerUserId: number | string,
    draftId: string,
    claims: Claim[],
    evidence: EvidenceItem[],
    ownerLanguage?: string
  ): Promise<boolean>;

  sendSourcesDrilldown(
    ownerUserId: number | string,
    draftId: string,
    sources: { title: string; url: string; publisher?: string; trustTier?: number }[],
    ownerLanguage?: string
  ): Promise<boolean>;

  sendTestMessage(
    targetChatId: string
  ): Promise<{ messageId: number; success: boolean }>;
}
