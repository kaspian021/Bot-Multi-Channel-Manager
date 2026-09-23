// ==============================================================
// YouTube Connector — Section 49 & 50 Specification
// Official YouTube Data API v3 integration with Demo fallback
// ==============================================================

import { ISocialSourceProvider } from '../../application/interfaces/production-interfaces';
import { RawResearchCandidate } from '../../application/interfaces/ai-providers';

export class YouTubeConnector implements ISocialSourceProvider {
  readonly platform = 'YOUTUBE' as const;
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5 && !this.apiKey.includes('placeholder'));
  }

  async fetchCandidates(target: string) {
    const signals = await this.fetchSignals(target);
    return signals.map((s) => ({
      title: s.title,
      url: s.url,
      sourceType: 'YOUTUBE',
      summary: s.summary,
      score: s.relevanceScore,
    }));
  }

  async fetchSignals(query: string, options: { maxResults?: number } = {}): Promise<RawResearchCandidate[]> {
    const maxResults = options.maxResults || 5;

    // Production Real API Flow
    if (this.isConfigured()) {
      try {
        const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${this.apiKey}`;
        const res = await fetch(endpoint, {
          headers: { 'Accept': 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          const items: RawResearchCandidate[] = [];

          for (const item of data.items || []) {
            const videoId = item.id?.videoId;
            const snippet = item.snippet;
            if (!videoId || !snippet) continue;

            items.push({
              title: snippet.title,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              sourceName: `YouTube: ${snippet.channelTitle}`,
              publishedAt: snippet.publishedAt,
              summary: snippet.description || snippet.title,
              claims: [`Video presentation on ${query} by ${snippet.channelTitle}`],
              relevanceScore: 78,
              noveltyScore: 80,
              technicalDepthScore: 75,
            });
          }

          if (items.length > 0) return items;
        }
      } catch (err) {
        console.warn('YouTube Data API fetch failed, falling back to cached signal:', err);
      }
    }

    if (process.env.DEMO_MODE !== 'true') return [];
    // Explicit demo/simulation fixture only.
    return [{
      title: `Demo: architectural review of ${query}`,
      url: 'https://www.youtube.com/watch?v=demo-fixture',
      sourceName: 'Demo YouTube Fixture',
      publishedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      summary: `Demo-only walkthrough of ${query}.`,
      claims: [`Demo fixture for ${query}`], relevanceScore: 85, noveltyScore: 82, technicalDepthScore: 90,
    }];
  }
}
