// ==============================================================
// Reddit Connector — Section 51 & 52 Specification
// Reddit API / OAuth community signal discovery with Demo fallback
// ==============================================================

import { ISocialSourceProvider } from '../../application/interfaces/production-interfaces';
import { RawResearchCandidate } from '../../application/interfaces/ai-providers';

export class RedditConnector implements ISocialSourceProvider {
  readonly platform = 'REDDIT' as const;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly userAgent: string;

  constructor(clientId?: string, clientSecret?: string, userAgent?: string) {
    this.clientId = clientId || process.env.REDDIT_CLIENT_ID;
    this.clientSecret = clientSecret || process.env.REDDIT_CLIENT_SECRET;
    this.userAgent = userAgent || process.env.REDDIT_USER_AGENT || 'FutureStackAI-Research/2.0';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && !this.clientId.includes('placeholder'));
  }

  async fetchCandidates(target: string) {
    const signals = await this.fetchSignals(target);
    return signals.map((s) => ({
      title: s.title,
      url: s.url,
      sourceType: 'REDDIT',
      summary: s.summary,
      score: s.relevanceScore,
    }));
  }

  async fetchSignals(query: string, options: { subreddit?: string; limit?: number } = {}): Promise<RawResearchCandidate[]> {
    const sub = options.subreddit || 'LocalLLaMA';
    const limit = options.limit || 5;

    // Production Flow via Reddit JSON API
    if (this.isConfigured() || process.env.DEMO_MODE !== 'true') {
      try {
        const endpoint = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${limit}&restrict_sr=1`;
        const res = await fetch(endpoint, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          const posts = data.data?.children || [];
          const items: RawResearchCandidate[] = [];

          for (const post of posts) {
            const p = post.data;
            if (!p || p.over_18) continue;

            items.push({
              title: p.title,
              url: `https://reddit.com${p.permalink}`,
              sourceName: `Reddit r/${sub} (${p.author})`,
              publishedAt: new Date(p.created_utc * 1000).toISOString(),
              summary: (p.selftext || p.title).substring(0, 500),
              claims: [`Community discovery reported on r/${sub}: ${p.title}`],
              relevanceScore: 82,
              noveltyScore: 88,
              technicalDepthScore: 78,
            });
          }

          if (items.length > 0) return items;
        }
      } catch (err) {
        console.warn(`Reddit API fetch error for query ${query}:`, err);
      }
    }

    if (process.env.DEMO_MODE !== 'true') return [];
    // Explicit demo/simulation fixture only.
    return [{
      title: `Demo: community analysis of ${query}`,
      url: 'https://example.invalid/demo/reddit-signal',
      sourceName: 'Demo Reddit Fixture',
      publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      summary: `Demo-only community discussion of ${query}.`,
      claims: [`Demo fixture for ${query}`], relevanceScore: 80, noveltyScore: 78, technicalDepthScore: 82,
    }];
  }
}
