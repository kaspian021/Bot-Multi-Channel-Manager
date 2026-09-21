// ==============================================================
// RSS Feed Connector
// ==============================================================

import { IContentSourceConnector } from '../../application/interfaces/source-connectors';
import { ContentSource } from '../../domain/types';
import { RawResearchCandidate } from '../../application/interfaces/ai-providers';
import { safeFetchUrl } from '../security/ssrf-filter';

export class RssFeedConnector implements IContentSourceConnector {
  readonly sourceType = 'RSS';

  isAvailable(): boolean {
    return true;
  }

  async fetchCandidates(source: ContentSource, topics: string[]): Promise<RawResearchCandidate[]> {
    if (process.env.DEMO_MODE === 'true') {
      return [
        {
          title: `arXiv cs.AI: Scalable Multi-Agent Consensus via Hierarchical Latent Routing`,
          url: `${source.url}/abs/2609.04912`,
          sourceName: source.name,
          publishedAt: new Date().toISOString(),
          summary: `Presents a formal convergence proof for decentralized multi-agent LLM systems with quadratic latency reduction.`,
          claims: [
            'Proves sub-linear latency scaling in 100+ agent topologies',
            'Evaluated on distributed robotics simulation benchmarks',
          ],
          relevanceScore: 91,
          noveltyScore: 93,
          technicalDepthScore: 95,
        },
      ];
    }

    try {
      const xml = await safeFetchUrl(source.url, { timeoutMs: 7000 });
      const items: RawResearchCandidate[] = [];

      // Lightweight regex parser for XML items
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
        const itemContent = match[1];
        const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
        const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
        const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
        const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

        if (titleMatch && linkMatch) {
          const title = titleMatch[1].trim();
          const url = linkMatch[1].trim();
          const summary = (descMatch ? descMatch[1] : title).replace(/<[^>]*>?/gm, '').trim().slice(0, 300);

          items.push({
            title,
            url,
            sourceName: source.name,
            publishedAt: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
            summary,
            claims: [title, summary.slice(0, 100)],
            relevanceScore: 85,
            noveltyScore: 80,
            technicalDepthScore: 82,
          });
        }
      }

      return items;
    } catch (err) {
      console.warn(`RSS fetch failed for ${source.url}:`, err);
      return [];
    }
  }
}
