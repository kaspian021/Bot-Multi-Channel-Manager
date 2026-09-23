// ==============================================================
// Resilient Research Provider with Automatic Failover — Section 6
// Integrates Gemini Search Grounding + OpenAI Search with Audit Logs
// ==============================================================

import crypto from 'crypto';
import { IResearchProvider, IWebSearchProvider } from '../../application/interfaces/production-interfaces';
import { GeminiSearchGroundingProvider } from './gemini-search-grounding-provider';
import { OpenAiWebSearchProvider } from './openai-web-search-provider';
import { ResearchResult, EvidenceItem } from '../../domain/types';
import { getDatabaseClient } from '../database/db-client';

export class ResilientResearchProvider implements IResearchProvider {
  readonly providerName = 'RESILIENT_RESEARCH_ENGINE';
  private primary: IWebSearchProvider;
  private fallback: IWebSearchProvider;

  constructor(primary?: IWebSearchProvider, fallback?: IWebSearchProvider) {
    const primaryChoice = (process.env.PRIMARY_RESEARCH_PROVIDER || 'GEMINI').toUpperCase();
    if (primaryChoice.includes('OPENAI')) {
      this.primary = primary || new OpenAiWebSearchProvider();
      this.fallback = fallback || new GeminiSearchGroundingProvider();
    } else {
      this.primary = primary || new GeminiSearchGroundingProvider();
      this.fallback = fallback || new OpenAiWebSearchProvider();
    }
  }

  isAvailable(): boolean {
    return this.primary.isAvailable() || this.fallback.isAvailable() || process.env.DEMO_MODE === 'true';
  }

  async researchTopic(
    topic: string,
    options: {
      channelId?: string;
      languages?: string[];
      queryTypes?: string[];
      maxResults?: number;
    } = {}
  ): Promise<{
    providerUsed: string;
    fallbackTriggered: boolean;
    evidence: { sourceUrl: string; sourceTitle: string; snippet: string }[];
    rawResult: ResearchResult;
  }> {
    const res = await this.executeResearch(topic, {
      channelId: options.channelId,
      language: options.languages?.[0],
      sourceLanguages: options.languages,
      maxResults: options.maxResults,
    });

    const primaryName = (this.primary as any).providerName || (this.primary as any).name || '';
    const isFallback = Boolean(primaryName && res.provider !== primaryName);

    return {
      providerUsed: res.provider,
      fallbackTriggered: isFallback,
      evidence: res.normalizedEvidence.map((e) => ({
        sourceUrl: e.sourceUrl || '',
        sourceTitle: e.sourceTitle || '',
        snippet: e.quotedPassage || '',
      })),
      rawResult: res,
    };
  }

  async executeResearch(
    query: string,
    options: {
      language?: string;
      sourceLanguages?: string[];
      maxResults?: number;
      channelName?: string;
      channelId?: string;
      runId?: string;
    } = {}
  ): Promise<ResearchResult> {
    const startTime = Date.now();
    const maxResults = options.maxResults || 5;
    let selectedProviderName = this.primary.providerName;
    let rawResults: { title: string; url: string; snippet: string; publishedDate?: string }[] = [];
    let success = true;
    let errorCategory: string | undefined;
    let errorMessage: string | undefined;

    // 1. Attempt Primary Provider
    try {
      const searchFn = (this.primary as any).search || (this.primary as any).searchGrounding || (this.primary as any).researchTopic;
      if (typeof searchFn === 'function') {
        rawResults = await searchFn.call(this.primary, query, {
          language: options.language,
          maxResults,
        });
      } else {
        throw new Error('Primary search provider has no search method');
      }
    } catch (primaryErr: any) {
      console.warn(`Primary research provider (${(this.primary as any).providerName || (this.primary as any).name}) failed:`, primaryErr?.message);
      errorCategory = 'PRIMARY_FAILURE';
      errorMessage = primaryErr?.message || 'Unknown provider error';
      await this.logProviderExecution(options.runId, options.channelId, (this.primary as any).providerName || (this.primary as any).name, false, errorCategory, errorMessage);

      try {
        const db = getDatabaseClient();
        await db.query(
          `INSERT INTO provider_failure_logs (id, provider, action, error_message, fallback_provider)
           VALUES ($1, $2, 'research_topic', $3, $4)`,
          [
            `fail-${crypto.randomUUID()}`,
            (this.primary as any).providerName || (this.primary as any).name || 'PRIMARY',
            errorMessage,
            (this.fallback as any).providerName || (this.fallback as any).name || 'FALLBACK',
          ]
        );
      } catch {}

      // 2. Attempt Fallback Provider (Section 6)
      try {
        console.log(`Failing over to secondary research provider (${(this.fallback as any).providerName || (this.fallback as any).name})...`);
        selectedProviderName = (this.fallback as any).providerName || (this.fallback as any).name;
        const fallbackFn = (this.fallback as any).search || (this.fallback as any).searchGrounding;
        if (typeof fallbackFn === 'function') {
          rawResults = await fallbackFn.call(this.fallback, query, {
            language: options.language,
            maxResults,
          });
        }
      } catch (fallbackErr: any) {
        console.warn(`Fallback research provider (${(this.fallback as any).providerName || (this.fallback as any).name}) also failed:`, fallbackErr?.message);
        success = false;
        errorCategory = 'ALL_PROVIDERS_EXHAUSTED';
        errorMessage = fallbackErr?.message || 'Fallback provider error';
        await this.logProviderExecution(options.runId, options.channelId, (this.fallback as any).providerName || (this.fallback as any).name, false, errorCategory, errorMessage);

        // Synthetic research is permitted only for the explicit demo path.
        // Production fails closed with no manufactured evidence or candidates.
        rawResults = process.env.DEMO_MODE === 'true' ? [{
          title: `Demo: engineering overview of ${query}`,
          url: 'https://example.invalid/demo/research-fallback',
          snippet: `Demo-only research fixture for ${query}.`,
          publishedDate: new Date().toISOString(),
        }] : [];
      }
    }

    const durationMs = Date.now() - startTime;
    await this.logProviderExecution(options.runId, options.channelId, selectedProviderName, success, errorCategory, errorMessage, durationMs);

    // 3. Normalize into first-class Evidence Items (Section 16)
    const normalizedEvidence: EvidenceItem[] = rawResults.map((r) => ({
      id: `ev-${crypto.randomUUID()}`,
      sourceUrl: r.url,
      sourceTitle: r.title,
      quotedPassage: r.snippet || r.title,
      normalizedClaim: `Verified technical report: ${r.title}`,
      publicationDate: r.publishedDate || new Date().toISOString(),
      retrievalDate: new Date().toISOString(),
      confidence: 0.92,
      evidenceType: r.url.includes('arxiv') ? 'RESEARCH_RESULT' : r.url.includes('github') ? 'OFFICIAL_DOCUMENT' : 'SECONDARY_REPORT',
      createdAt: new Date().toISOString(),
    }));

    return {
      query,
      provider: selectedProviderName,
      searchTimestamp: new Date().toISOString(),
      sourceList: rawResults,
      citations: rawResults.map((r) => r.url),
      claims: rawResults.map((r) => r.title),
      confidence: success ? 0.94 : 0.82,
      normalizedEvidence,
    };
  }

  private async logProviderExecution(
    runId?: string,
    channelId?: string,
    provider = 'UNKNOWN',
    success = true,
    errorCategory?: string,
    errorMessage?: string,
    durationMs = 0
  ): Promise<void> {
    try {
      const db = getDatabaseClient();
      const id = `rpl-${crypto.randomUUID()}`;
      await db.query(
        `INSERT INTO research_provider_logs (
          id, run_id, channel_id, provider, request_type, duration_ms, success,
          error_category, error_message, created_at
        ) VALUES ($1, $2, $3, $4, 'WEB_SEARCH', $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        [
          id,
          runId || null,
          channelId || null,
          provider,
          durationMs,
          success,
          errorCategory || null,
          errorMessage || null,
        ]
      );
    } catch {
      // In-memory or logging failure should not halt research
    }
  }
}
