// ==============================================================
// Gemini Search Grounding Provider — Section 5 & 6 Specification
// Real Google Gemini API with Google Search Grounding & Demo fallback
// ==============================================================

import { IWebSearchProvider } from '../../application/interfaces/production-interfaces';
import { EvidenceItem } from '../../domain/types';

export class GeminiSearchGroundingProvider implements IWebSearchProvider {
  readonly providerName = 'GEMINI_SEARCH_GROUNDING';
  private readonly apiKey?: string;
  private readonly modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_AI_API_KEY;
    this.modelName = modelName || process.env.GEMINI_RESEARCH_MODEL || 'gemini-1.5-pro';
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5 && !this.apiKey.includes('placeholder'));
  }

  async search(
    query: string,
    options: { language?: string; maxResults?: number } = {}
  ): Promise<{ title: string; url: string; snippet: string; publishedDate?: string }[]> {
    const maxResults = options.maxResults || 5;

    // Real API Call when API Key is configured
    if (this.isAvailable()) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
        const body = {
          contents: [
            {
              role: 'user',
              parts: [{ text: `Search and retrieve the latest factual news and technical breakthroughs on: "${query}". Return primary sources with factual claims.` }]
            }
          ],
          tools: [{ googleSearch: {} }],
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const groundingMetadata = candidate?.groundingMetadata;
          const searchChunks = groundingMetadata?.groundingChunks || [];

          const results: { title: string; url: string; snippet: string; publishedDate?: string }[] = [];

          for (const chunk of searchChunks) {
            if (chunk.web?.uri) {
              results.push({
                title: chunk.web.title || `Source for ${query}`,
                url: chunk.web.uri,
                snippet: chunk.web.snippet || chunk.web.title || '',
                publishedDate: new Date().toISOString(),
              });
            }
          }

          if (results.length > 0) {
            return results.slice(0, maxResults);
          }
        }
      } catch (err) {
        console.warn('Gemini Search Grounding request failed:', err);
        throw err;
      }
    }

    if (process.env.DEMO_MODE !== 'true') return [];
    // Explicit demo-only grounding fixture.
    return [
      {
        title: `Official Engineering Announcement: ${query}`,
        url: `https://deepmind.google/research/breakthroughs/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}`,
        snippet: `Google DeepMind researchers announce open-source architecture for ${query} achieving state-of-the-art inference efficiency.`,
        publishedDate: new Date().toISOString(),
      },
      {
        title: `arXiv Technical Paper: Quantitative Benchmark of ${query}`,
        url: 'https://arxiv.org/abs/2609.12845',
        snippet: `Peer-reviewed analysis detailing performance gains, memory efficiency, and mathematical proofs for ${query}.`,
        publishedDate: new Date().toISOString(),
      },
    ];
  }
}
