// ==============================================================
// Web & Social Connectors (Web, YouTube, Reddit)
// ==============================================================

import { IContentSourceConnector } from '../../application/interfaces/source-connectors';
import { ContentSource } from '../../domain/types';
import { RawResearchCandidate } from '../../application/interfaces/ai-providers';
import { getAiProvider } from '../ai/ai-provider-factory';

export class WebResearchConnector implements IContentSourceConnector {
  readonly sourceType = 'WEB';

  isAvailable(): boolean {
    return true;
  }

  async fetchCandidates(source: ContentSource, topics: string[]): Promise<RawResearchCandidate[]> {
    const ai = getAiProvider();
    const result = await ai.searchAndGround({
      topics: topics.length > 0 ? topics : ['AI Models', 'Developer Tools'],
      channelName: 'FutureStack AI',
      channelLanguage: source.language || 'en',
    });
    return result.items || [];
  }
}

export class YouTubeConnector implements IContentSourceConnector {
  readonly sourceType = 'YOUTUBE';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY || '';
  }

  isAvailable(): boolean {
    return process.env.DEMO_MODE === 'true' || Boolean(this.apiKey);
  }

  async fetchCandidates(source: ContentSource, topics: string[]): Promise<RawResearchCandidate[]> {
    if (process.env.DEMO_MODE === 'true') {
      return [{ title: 'Demo: Agentic Workflows with Model Context Protocol', url: 'https://example.invalid/demo/youtube-mcp', sourceName: 'Demo YouTube Fixture', publishedAt: new Date().toISOString(), summary: 'Demo-only connector fixture.', claims: ['Demo fixture: JSON-RPC local tool execution'], relevanceScore: 88, noveltyScore: 84, technicalDepthScore: 92 }];
    }
    // Never substitute an invented result for a missing production connector.
    if (!this.apiKey) return [];

    // Official YouTube Data API v3 implementation
    try {
      const q = encodeURIComponent(topics[0] || 'AI Engineering');
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${q}&key=${this.apiKey}&type=video`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();

      return (data.items || []).map((item: any) => ({
        title: item.snippet?.title || 'YouTube Video',
        url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
        sourceName: item.snippet?.channelTitle || 'YouTube',
        publishedAt: item.snippet?.publishedAt,
        summary: item.snippet?.description || '',
        claims: [item.snippet?.title || ''],
        relevanceScore: 82,
        noveltyScore: 80,
        technicalDepthScore: 80,
      }));
    } catch {
      return [];
    }
  }
}

export class RedditConnector implements IContentSourceConnector {
  readonly sourceType = 'REDDIT';

  isAvailable(): boolean {
    return true;
  }

  async fetchCandidates(source: ContentSource, topics: string[]): Promise<RawResearchCandidate[]> {
    if (process.env.DEMO_MODE === 'true') {
      return [{ title: 'Demo: FP4 quantization benchmark', url: 'https://example.invalid/demo/reddit-quantization', sourceName: 'Demo Reddit Fixture', publishedAt: new Date().toISOString(), summary: 'Demo-only community connector fixture.', claims: ['Demo fixture: quantization benchmark'], relevanceScore: 89, noveltyScore: 87, technicalDepthScore: 91 }];
    }
    // A production Reddit adapter must use configured OAuth/fetched data. Until
    // that adapter is configured, fail closed with no manufactured candidate.
    void source; void topics;
    return [];
  }
}
