// ==============================================================
// Research Planner — Sections 7, 8, 9, 26, 27, 118 Specification
// Generates diverse multilingual queries across 5 source classes
// ==============================================================

import { ChannelBrain, ChannelLanguageSettings } from '../../domain/types';
import { getDatabaseClient } from '../../infrastructure/database/db-client';

export type QueryClass =
  | 'BREAKING_NEWS'
  | 'OFFICIAL_SOURCES'
  | 'RESEARCH'
  | 'OPEN_SOURCE'
  | 'COMMUNITY_SIGNALS';

export interface PlannedResearchQuery {
  query: string;
  queryClass: QueryClass;
  targetLanguage: string;
  topic: string;
  priority: number;
  expectedSourceTypes: string[];
}

export interface ResearchPlan {
  channelId: string;
  brainVersion: number;
  plannedQueries: PlannedResearchQuery[];
  targetContentMix: Record<string, number>;
  underrepresentedTopics: string[];
  activeDirectives: string[];
  createdAt: string;
}

export class ResearchPlanner {
  /**
   * Builds research plan directly by channelId with full topic, category, and multilingual mapping.
   */
  async buildResearchPlan(channelId: string): Promise<{
    channelId: string;
    languages: string[];
    topics: string[];
    excludedTopics: string[];
    contentMix: Record<string, number>;
    temporaryDirectives: string[];
    queries: { query: string; category: string; language: string; topic: string }[];
  }> {
    const db = getDatabaseClient();

    // Fetch brain
    const brainRes = await db.query('SELECT * FROM channel_brains WHERE channel_id = $1', [channelId]);
    const brainRow = brainRes.rows[0];
    const content = brainRow ? (typeof brainRow.content_json === 'string' ? JSON.parse(brainRow.content_json) : brainRow.content_json) : {};
    const sources = brainRow ? (typeof brainRow.sources_json === 'string' ? JSON.parse(brainRow.sources_json) : brainRow.sources_json) : {};

    // Fetch language settings
    const langRes = await db.query('SELECT * FROM channel_language_settings WHERE channel_id = $1', [channelId]);
    const langRow = langRes.rows[0];
    const allowedLangs = langRow ? (typeof langRow.allowed_source_languages === 'string' ? JSON.parse(langRow.allowed_source_languages) : langRow.allowed_source_languages) : ['en', 'de', 'ja'];

    // Directives
    const directivesRes = await db.query('SELECT directive_text FROM temporary_directives WHERE channel_id = $1', [channelId]);
    const temporaryDirectives = directivesRes.rows.map((r: any) => r.directive_text);

    const topics: string[] = content.primaryTopics || ['AI Models', 'Developer Tools', 'Open Source AI'];
    const excludedTopics: string[] = content.excludedTopics || ['Crypto gambling', 'NFTs'];
    const contentMix: Record<string, number> = content.contentMix || { 'AI News': 30, 'Developer Tools': 25, 'Research': 20, 'Open Source': 15, 'Tutorials': 10 };

    const categories = [
      'BREAKING_NEWS',
      'OFFICIAL_SOURCE',
      'RESEARCH_PAPERS',
      'OPEN_SOURCE_RELEASES',
      'COMMUNITY_SIGNALS',
    ];

    const queries: { query: string; category: string; language: string; topic: string }[] = [];

    for (const cat of categories) {
      queries.push({
        query: `${topics[0]} ${cat.toLowerCase().replace(/_/g, ' ')}`,
        category: cat,
        language: 'en',
        topic: topics[0],
      });
    }

    for (const lang of allowedLangs) {
      if (lang !== 'en') {
        queries.push({
          query: `${topics[0]} multilingual update`,
          category: 'RESEARCH_PAPERS',
          language: lang,
          topic: topics[0],
        });
      }
    }

    return {
      channelId,
      languages: allowedLangs,
      topics,
      excludedTopics,
      contentMix,
      temporaryDirectives,
      queries,
    };
  }

  /**
   * Constructs an autonomous, diverse research plan.
   */
  async createResearchPlan(
    brain: ChannelBrain,
    langSettings: ChannelLanguageSettings,
    maxQueries = 8
  ): Promise<ResearchPlan> {
    const db = getDatabaseClient();
    const channelId = brain.channelId;

    // 1. Fetch recent published posts to ensure topic diversity (Section 26)
    const recentPostsRes = await db.query(
      'SELECT topic, published_at FROM published_posts WHERE channel_id = $1 ORDER BY published_at DESC LIMIT 10',
      [channelId]
    );
    const recentTopics = recentPostsRes.rows.map((r: any) => r.topic);

    // 2. Fetch active temporary owner directives (Section 118)
    const directivesRes = await db.query(
      'SELECT directive_text FROM temporary_directives WHERE channel_id = $1 AND expires_at > CURRENT_TIMESTAMP',
      [channelId]
    );
    const activeDirectives = directivesRes.rows.map((r: any) => r.directive_text);

    // 3. Balance topics based on Channel Brain Content Mix (Section 27)
    const contentMix = brain.content.contentMix || {
      'AI News': 30,
      'Developer Tools': 25,
      'Research': 20,
      'Open Source': 15,
      'Tutorials': 10,
    };

    // Calculate underrepresented topics in recent channel history
    const primaryTopics = brain.content.primaryTopics || ['AI Models', 'Developer Tools', 'Open Source AI'];
    const underrepresentedTopics = primaryTopics.filter((t) => {
      const occurrences = recentTopics.filter((rt: string) => rt && rt.toLowerCase().includes(t.toLowerCase())).length;
      return occurrences === 0;
    });

    const candidateTopics = activeDirectives.length > 0
      ? activeDirectives
      : underrepresentedTopics.length > 0
      ? [...underrepresentedTopics, ...primaryTopics]
      : primaryTopics;

    const plannedQueries: PlannedResearchQuery[] = [];
    const sourceLanguages = langSettings.allowedSourceLanguages || ['en'];

    // 4. Generate diverse query classes (Section 9)
    for (const topic of candidateTopics.slice(0, 3)) {
      // A. BREAKING NEWS query
      plannedQueries.push({
        query: `${topic} latest breaking release update ${new Date().getFullYear()}`,
        queryClass: 'BREAKING_NEWS',
        targetLanguage: 'en',
        topic,
        priority: 9,
        expectedSourceTypes: ['WEB', 'RSS'],
      });

      // B. OFFICIAL SOURCES query
      plannedQueries.push({
        query: `${topic} official announcement documentation benchmarks`,
        queryClass: 'OFFICIAL_SOURCES',
        targetLanguage: 'en',
        topic,
        priority: 8,
        expectedSourceTypes: ['WEB'],
      });

      // C. RESEARCH query
      plannedQueries.push({
        query: `${topic} arXiv technical report architecture optimization`,
        queryClass: 'RESEARCH',
        targetLanguage: 'en',
        topic,
        priority: 7,
        expectedSourceTypes: ['RSS', 'WEB'],
      });

      // D. OPEN SOURCE query
      plannedQueries.push({
        query: `${topic} GitHub open source repository weights`,
        queryClass: 'OPEN_SOURCE',
        targetLanguage: 'en',
        topic,
        priority: 8,
        expectedSourceTypes: ['WEB'],
      });

      // E. COMMUNITY SIGNALS query
      plannedQueries.push({
        query: `${topic} Reddit LocalLLaMA discussion`,
        queryClass: 'COMMUNITY_SIGNALS',
        targetLanguage: 'en',
        topic,
        priority: 5,
        expectedSourceTypes: ['REDDIT', 'YOUTUBE'],
      });

      // 5. Multilingual Query Generation (Section 8)
      if (sourceLanguages.includes('de')) {
        plannedQueries.push({
          query: `${topic} Forschung Neuentwicklung Benchmark`,
          queryClass: 'RESEARCH',
          targetLanguage: 'de',
          topic,
          priority: 6,
          expectedSourceTypes: ['WEB', 'RSS'],
        });
      }

      if (sourceLanguages.includes('ja')) {
        plannedQueries.push({
          query: `${topic} 最新研究 発表 モデル`,
          queryClass: 'RESEARCH',
          targetLanguage: 'ja',
          topic,
          priority: 6,
          expectedSourceTypes: ['WEB'],
        });
      }
    }

    return {
      channelId,
      brainVersion: brain.version,
      plannedQueries: plannedQueries.slice(0, maxQueries),
      targetContentMix: contentMix,
      underrepresentedTopics,
      activeDirectives,
      createdAt: new Date().toISOString(),
    };
  }
}
