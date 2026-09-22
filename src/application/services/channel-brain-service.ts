// ==============================================================
// Channel Brain Service — Section 3, 9, 10, 18 Specification
// ==============================================================

import { getDatabaseClient } from '../../infrastructure/database/db-client';
import {
  ChannelBrain,
  ChannelBrainVersion,
  ChannelLanguageSettings,
  OwnerPreference,
  StrategyRecommendation,
  AuditActorType,
  ChannelStatus,
} from '../../domain/types';
import { AuditService } from './audit-service';

export class ChannelBrainService {
  /**
   * Retrieves the current Channel Brain for a channel.
   */
  async getBrain(channelId: string): Promise<ChannelBrain | null> {
    const db = getDatabaseClient();
    const res = await db.query('SELECT * FROM channel_brains WHERE channel_id = $1', [channelId]);
    if (res.rowCount === 0) return null;
    return this.mapBrainRow(res.rows[0]);
  }

  /**
   * Persists or updates the Channel Brain, recording a new version.
   */
  async saveBrain(
    channelId: string,
    brainData: Partial<ChannelBrain>,
    changedBy: string,
    reason?: string
  ): Promise<ChannelBrain> {
    const db = getDatabaseClient();
    const existing = await this.getBrain(channelId);

    const version = existing ? existing.version + 1 : 1;
    const brainId = existing ? existing.id : `brain-${channelId}-${Date.now()}`;
    const status = brainData.status || (existing ? existing.status : 'ACTIVE');

    const identity = brainData.identity || existing?.identity || {
      channelName: 'FutureStack AI',
      description: 'Cutting-edge AI and developer tools',
      niche: 'Artificial Intelligence',
      subNiches: ['AI Models', 'Developer Tools', 'Robotics'],
      positioning: 'Engineering-grade briefings for practicing technologists',
      uniqueValueProposition: 'Signal-dense, hype-free coverage',
      channelGoals: ['Audience education', 'Developer workflow insights'],
    };

    const audience = brainData.audience || existing?.audience || {
      targetAudience: 'Software engineers, AI researchers, founders',
      audienceKnowledgeLevel: 'advanced',
      interests: ['LLMs', 'Compilers', 'Open Weights', 'Robotics'],
      painPoints: ['Excessive clickbait hype', 'Slow inference runtimes'],
    };

    const content = brainData.content || existing?.content || {
      primaryTopics: ['AI Models', 'Developer Tools', 'Open Source AI'],
      secondaryTopics: ['Robotics', 'Cloud Infrastructure'],
      excludedTopics: ['Crypto gambling', 'NFTs', 'Unverified rumors'],
      preferredContentTypes: ['MODEL_RELEASE', 'TOOL_ANNOUNCEMENT', 'OPEN_SOURCE'] as any,
      contentMix: { 'AI News': 30, 'Developer Tools': 25, 'Research': 20, 'Open Source': 15, 'Tutorials': 10 },
      technicalDepth: 'high',
      preferredPostLength: { minChars: 400, maxChars: 1200 },
    };

    const style = brainData.style || existing?.style || {
      tone: 'expert, concise, modern, credible',
      writingStyle: 'high-quality technology editor',
      headlineStyle: 'descriptive and accurate without clickbait',
      emojiPolicy: 'minimal',
      hashtagPolicy: 'minimal',
      ctaPolicy: 'read primary sources',
      formattingRules: ['Emoji headline', 'Why it matters bullet points', 'Source attribution'],
    };

    const sources = brainData.sources || existing?.sources || {
      preferredSources: ['arXiv cs.AI', 'Hugging Face Blog', 'GitHub Engineering'],
      excludedSources: ['Tabloids', 'Rumor blogs'],
      trustedDomains: ['arxiv.org', 'github.com', 'huggingface.co', 'openai.com'],
      preferredSourceTypes: ['WEB', 'RSS'] as any,
      sourceLanguages: ['en', 'de', 'ja'],
      minimumSourceQuality: 80,
    };

    const publishing = brainData.publishing || existing?.publishing || {
      postingFrequency: 3,
      timezone: 'UTC',
      preferredPublishingWindows: ['09:00', '14:00', '20:00'],
      weekendPolicy: 'normal',
      minimumSpacingHours: 3,
    };

    const media = brainData.media || existing?.media || {
      imagePolicy: 'mixed',
      videoPolicy: 'links_only',
      aiImageGenerationPolicy: 'minimalist cybernetic architecture visuals',
      screenshotPolicy: 'source citations allowed',
      mediaTextLanguage: 'en',
    };

    const approval = brainData.approval || existing?.approval || {
      allPostsRequireOwnerApproval: true,
      allowedAutonomousActions: ['research', 'deduplication', 'scoring', 'drafting'],
      actionsRequiringOwnerApproval: ['publish', 'change_branding', 'edit_schedule'],
    };

    const business = brainData.business || existing?.business || {
      growthObjective: 'High-retention technical audience',
      monetizationObjective: 'Selective developer tool sponsorships',
      advertisingPolicy: 'Relevant developer tools only',
      affiliatePolicy: 'Strict disclosure required',
      sponsoredContentPolicy: 'Max 1 sponsored post per week with owner approval',
    };

    const restrictions = brainData.restrictions || existing?.restrictions || {
      prohibitedTopics: ['Crypto gambling', 'NFTs', 'Celebrity gossip', 'Unverified rumors'],
      sensitiveTopicsRequiringApproval: ['Critical cybersecurity zero-days', 'Vendor lawsuits'],
      competitorMentions: 'Permitted neutrally with technical benchmarks only',
      excludedKeywords: ['crypto airdrop', 'free tokens', 'get rich quick', '100x gains'],
      embargoPolicy: 'Respect all stated embargo timestamps',
      copyrightPolicy: 'Fair use quotation with explicit link attribution',
    };

    const newBrain: ChannelBrain = {
      id: brainId,
      channelId,
      version,
      status,
      identity,
      audience,
      content,
      style,
      sources,
      publishing,
      media,
      approval,
      business,
      restrictions,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Calculate changed fields
    const changedFields: string[] = [];
    if (existing) {
      if (JSON.stringify(existing.identity) !== JSON.stringify(identity)) changedFields.push('identity');
      if (JSON.stringify(existing.audience) !== JSON.stringify(audience)) changedFields.push('audience');
      if (JSON.stringify(existing.content) !== JSON.stringify(content)) changedFields.push('content');
      if (JSON.stringify(existing.style) !== JSON.stringify(style)) changedFields.push('style');
      if (JSON.stringify(existing.sources) !== JSON.stringify(sources)) changedFields.push('sources');
      if (JSON.stringify(existing.publishing) !== JSON.stringify(publishing)) changedFields.push('publishing');
      if (JSON.stringify(existing.restrictions) !== JSON.stringify(restrictions)) changedFields.push('restrictions');
    } else {
      changedFields.push('initial_creation');
    }

    // Persist to channel_brains
    await db.query(
      `INSERT INTO channel_brains (
        id, channel_id, version, status, identity_json, audience_json,
        content_json, style_json, sources_json, publishing_json, media_json,
        approval_json, business_json, restrictions_json, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
      ON CONFLICT (channel_id) DO UPDATE SET
        version = EXCLUDED.version,
        status = EXCLUDED.status,
        identity_json = EXCLUDED.identity_json,
        audience_json = EXCLUDED.audience_json,
        content_json = EXCLUDED.content_json,
        style_json = EXCLUDED.style_json,
        sources_json = EXCLUDED.sources_json,
        publishing_json = EXCLUDED.publishing_json,
        media_json = EXCLUDED.media_json,
        approval_json = EXCLUDED.approval_json,
        business_json = EXCLUDED.business_json,
        restrictions_json = EXCLUDED.restrictions_json,
        updated_at = CURRENT_TIMESTAMP`,
      [
        newBrain.id,
        channelId,
        newBrain.version,
        newBrain.status,
        JSON.stringify(newBrain.identity),
        JSON.stringify(newBrain.audience),
        JSON.stringify(newBrain.content),
        JSON.stringify(newBrain.style),
        JSON.stringify(newBrain.sources),
        JSON.stringify(newBrain.publishing),
        JSON.stringify(newBrain.media),
        JSON.stringify(newBrain.approval),
        JSON.stringify(newBrain.business),
        JSON.stringify(newBrain.restrictions),
      ]
    );

    // Persist version snapshot
    const versionId = `cbv-${channelId}-v${version}-${Date.now()}`;
    await db.query(
      `INSERT INTO channel_brain_versions (
        id, channel_id, brain_id, version, snapshot_json, changed_fields, changed_by, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        versionId,
        channelId,
        newBrain.id,
        version,
        JSON.stringify(newBrain),
        JSON.stringify(changedFields),
        changedBy,
        reason || 'Updated Channel Brain settings',
      ]
    );

    // Keep channel posting frequency and description in sync
    await db.query(
      `UPDATE channels SET
        posting_frequency = $1,
        description = $2,
        timezone = $3,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newBrain.publishing.postingFrequency, newBrain.identity.description, newBrain.publishing.timezone, channelId]
    );

    // Also keep channel_strategies table in sync
    await db.query(
      `INSERT INTO channel_strategies (
        channel_id, language, target_audience, tone, style, posting_frequency,
        preferred_posting_windows, preferred_topics, excluded_topics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (channel_id) DO UPDATE SET
        target_audience = EXCLUDED.target_audience,
        tone = EXCLUDED.tone,
        style = EXCLUDED.style,
        posting_frequency = EXCLUDED.posting_frequency,
        preferred_posting_windows = EXCLUDED.preferred_posting_windows,
        preferred_topics = EXCLUDED.preferred_topics,
        excluded_topics = EXCLUDED.excluded_topics`,
      [
        channelId,
        'en',
        newBrain.audience.targetAudience,
        newBrain.style.tone,
        newBrain.style.writingStyle,
        newBrain.publishing.postingFrequency,
        JSON.stringify(newBrain.publishing.preferredPublishingWindows),
        JSON.stringify(newBrain.content.primaryTopics),
        JSON.stringify(newBrain.content.excludedTopics),
      ]
    );

    const auditChannel = await db.query<{ workspace_id: string }>('SELECT workspace_id FROM channels WHERE id = $1', [channelId]);
    if (!auditChannel.rowCount) throw new Error('Channel not found for Channel Brain audit');
    await AuditService.log(
      auditChannel.rows[0].workspace_id,
      channelId,
      changedBy === 'owner' ? AuditActorType.OWNER : AuditActorType.AI_WORKER,
      changedBy,
      'CHANNEL_BRAIN_UPDATED',
      'CHANNEL_BRAIN',
      newBrain.id,
      { version, changedFields, reason }
    );

    return newBrain;
  }

  /**
   * Retrieves version history for a channel brain.
   */
  async getVersions(channelId: string): Promise<ChannelBrainVersion[]> {
    const db = getDatabaseClient();
    const res = await db.query(
      'SELECT * FROM channel_brain_versions WHERE channel_id = $1 ORDER BY version DESC',
      [channelId]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      channelId: r.channel_id,
      brainId: r.brain_id,
      version: r.version,
      snapshot: typeof r.snapshot_json === 'string' ? JSON.parse(r.snapshot_json) : r.snapshot_json,
      changedFields: typeof r.changed_fields === 'string' ? JSON.parse(r.changed_fields) : r.changed_fields,
      changedBy: r.changed_by,
      reason: r.reason,
      createdAt: r.created_at,
    }));
  }

  /**
   * Restores an older version of the Channel Brain.
   */
  async restoreVersion(channelId: string, versionNumber: number, restoredBy: string): Promise<ChannelBrain> {
    const db = getDatabaseClient();
    const res = await db.query(
      'SELECT * FROM channel_brain_versions WHERE channel_id = $1 AND version = $2',
      [channelId, versionNumber]
    );
    if (res.rowCount === 0) {
      throw new Error(`Channel Brain version ${versionNumber} not found for channel ${channelId}`);
    }

    const row = res.rows[0];
    const snapshot: ChannelBrain = typeof row.snapshot_json === 'string' ? JSON.parse(row.snapshot_json) : row.snapshot_json;

    return this.saveBrain(
      channelId,
      snapshot,
      restoredBy,
      `Restored from Version ${versionNumber}`
    );
  }

  /**
   * Retrieves language settings for a channel.
   */
  async getLanguageSettings(channelId: string): Promise<ChannelLanguageSettings> {
    const db = getDatabaseClient();
    const res = await db.query('SELECT * FROM channel_language_settings WHERE channel_id = $1', [channelId]);
    if (res.rowCount === 0) {
      // Default multilingual configuration (Section 4 & 28)
      const defaultSettings: ChannelLanguageSettings = {
        channelId,
        primaryChannelLanguage: 'en',
        contentLanguage: 'en',
        metadataLanguage: 'en',
        headlineLanguage: 'en',
        hashtagLanguage: 'en',
        ctaLanguage: 'en',
        mediaTextLanguage: 'en',
        ownerCommunicationLanguage: 'fa', // Persian default per Section 4 & 28
        allowedSourceLanguages: ['en', 'de', 'ja'],
        fallbackLanguage: 'en',
        translationPolicy: 'SYNTHESIZE_TO_CONTENT_LANGUAGE',
        preserveTechnicalTerms: true,
        updatedAt: new Date().toISOString(),
      };

      await db.query(
        `INSERT INTO channel_language_settings (
          channel_id, primary_channel_language, content_language, metadata_language,
          headline_language, hashtag_language, cta_language, media_text_language,
          owner_communication_language, allowed_source_languages, fallback_language,
          translation_policy, preserve_technical_terms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (channel_id) DO NOTHING`,
        [
          channelId,
          defaultSettings.primaryChannelLanguage,
          defaultSettings.contentLanguage,
          defaultSettings.metadataLanguage,
          defaultSettings.headlineLanguage,
          defaultSettings.hashtagLanguage,
          defaultSettings.ctaLanguage,
          defaultSettings.mediaTextLanguage,
          defaultSettings.ownerCommunicationLanguage,
          JSON.stringify(defaultSettings.allowedSourceLanguages),
          defaultSettings.fallbackLanguage,
          defaultSettings.translationPolicy,
          defaultSettings.preserveTechnicalTerms,
        ]
      );

      return defaultSettings;
    }

    const r = res.rows[0];
    return {
      channelId: r.channel_id,
      primaryChannelLanguage: r.primary_channel_language,
      contentLanguage: r.content_language,
      metadataLanguage: r.metadata_language,
      headlineLanguage: r.headline_language,
      hashtagLanguage: r.hashtag_language,
      ctaLanguage: r.cta_language,
      mediaTextLanguage: r.media_text_language,
      ownerCommunicationLanguage: r.owner_communication_language,
      allowedSourceLanguages: typeof r.allowed_source_languages === 'string' ? JSON.parse(r.allowed_source_languages) : r.allowed_source_languages,
      fallbackLanguage: r.fallback_language,
      translationPolicy: r.translation_policy,
      preserveTechnicalTerms: Boolean(r.preserve_technical_terms),
      updatedAt: r.updated_at,
    };
  }

  /**
   * Updates language settings for a channel.
   */
  async updateLanguageSettings(
    channelId: string,
    updates: Partial<ChannelLanguageSettings>
  ): Promise<ChannelLanguageSettings> {
    const current = await this.getLanguageSettings(channelId);
    const db = getDatabaseClient();

    const merged: ChannelLanguageSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.query(
      `INSERT INTO channel_language_settings (
        channel_id, primary_channel_language, content_language, metadata_language,
        headline_language, hashtag_language, cta_language, media_text_language,
        owner_communication_language, allowed_source_languages, fallback_language,
        translation_policy, preserve_technical_terms, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
      ON CONFLICT (channel_id) DO UPDATE SET
        primary_channel_language = EXCLUDED.primary_channel_language,
        content_language = EXCLUDED.content_language,
        metadata_language = EXCLUDED.metadata_language,
        headline_language = EXCLUDED.headline_language,
        hashtag_language = EXCLUDED.hashtag_language,
        cta_language = EXCLUDED.cta_language,
        media_text_language = EXCLUDED.media_text_language,
        owner_communication_language = EXCLUDED.owner_communication_language,
        allowed_source_languages = EXCLUDED.allowed_source_languages,
        fallback_language = EXCLUDED.fallback_language,
        translation_policy = EXCLUDED.translation_policy,
        preserve_technical_terms = EXCLUDED.preserve_technical_terms,
        updated_at = CURRENT_TIMESTAMP`,
      [
        channelId,
        merged.primaryChannelLanguage,
        merged.contentLanguage,
        merged.metadataLanguage,
        merged.headlineLanguage,
        merged.hashtagLanguage,
        merged.ctaLanguage,
        merged.mediaTextLanguage,
        merged.ownerCommunicationLanguage,
        JSON.stringify(merged.allowedSourceLanguages),
        merged.fallbackLanguage,
        merged.translationPolicy,
        merged.preserveTechnicalTerms,
      ]
    );

    return merged;
  }

  /**
   * Retrieves owner preferences with EXPLICIT vs INFERRED hierarchy (Section 10).
   */
  async getPreferences(channelId: string): Promise<OwnerPreference[]> {
    const db = getDatabaseClient();
    const res = await db.query(
      'SELECT * FROM owner_preferences WHERE channel_id = $1 ORDER BY type ASC, confidence DESC',
      [channelId]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      channelId: r.channel_id,
      type: r.type,
      category: r.category,
      rule: r.rule,
      confidence: r.confidence,
      source: r.source,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Retrieves effective preferences partitioned by precedence (EXPLICIT > INFERRED).
   */
  async getEffectivePreferences(channelId: string): Promise<{
    explicit: OwnerPreference[];
    inferred: OwnerPreference[];
    all: OwnerPreference[];
  }> {
    const all = await this.getPreferences(channelId);
    const explicit = all.filter((p) => p.type === 'EXPLICIT');
    const inferred = all.filter((p) => p.type === 'INFERRED');
    return { explicit, inferred, all };
  }

  /**
   * Adds an owner preference. EXPLICIT preferences take strict precedence.
   */
  async addPreference(
    channelId: string,
    pref: Omit<OwnerPreference, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<OwnerPreference> {
    const db = getDatabaseClient();
    const id = `pref-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await db.query(
      `INSERT INTO owner_preferences (
        id, channel_id, type, category, rule, confidence, source, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, channelId, pref.type, pref.category, pref.rule, pref.confidence, pref.source, pref.status || 'ACTIVE']
    );

    return {
      id,
      channelId,
      type: pref.type,
      category: pref.category,
      rule: pref.rule,
      confidence: pref.confidence,
      source: pref.source,
      status: pref.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Learns and infers preference rules from an owner manual edit (Section 11).
   */
  async inferPreferencesFromEdit(
    channelId: string,
    originalText: string,
    editedText: string
  ): Promise<OwnerPreference | null> {
    const origLower = originalText.toLowerCase();
    const editLower = editedText.toLowerCase();

    // Check if exaggerated/hype terms were removed
    const hypePhrases = ['revolutionary', 'breakthrough', 'changes everything', 'mind-blowing'];
    let removedHype = false;
    for (const h of hypePhrases) {
      if (origLower.includes(h) && !editLower.includes(h)) {
        removedHype = true;
        break;
      }
    }

    if (removedHype) {
      return this.addPreference(channelId, {
        channelId,
        type: 'INFERRED',
        category: 'STYLE',
        rule: 'Avoid exaggerated and sensationalist headline phrases',
        confidence: 0.85,
        source: 'EDIT_LEARNING',
        status: 'ACTIVE',
      });
    }

    // Check if post was significantly shortened
    if (editedText.length < originalText.length * 0.75) {
      return this.addPreference(channelId, {
        channelId,
        type: 'INFERRED',
        category: 'LENGTH',
        rule: 'Owner prefers high conciseness; trim secondary elaboration',
        confidence: 0.8,
        source: 'EDIT_LEARNING',
        status: 'ACTIVE',
      });
    }

    return null;
  }

  /**
   * Retrieves AI Strategy Recommendations (Section 18).
   */
  async getStrategyRecommendations(channelId: string): Promise<StrategyRecommendation[]> {
    const db = getDatabaseClient();
    const res = await db.query(
      'SELECT * FROM strategy_recommendations WHERE channel_id = $1 ORDER BY created_at DESC',
      [channelId]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      channelId: r.channel_id,
      title: r.title,
      category: r.category,
      currentValue: r.current_value,
      recommendedValue: r.recommended_value,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  /**
   * Applies an approved strategy recommendation (requires owner approval).
   */
  async applyStrategyRecommendation(recId: string, channelId: string): Promise<void> {
    const db = getDatabaseClient();
    const res = await db.query('SELECT * FROM strategy_recommendations WHERE id = $1', [recId]);
    if (res.rowCount === 0) throw new Error('Recommendation not found');
    const rec = res.rows[0];

    const brain = await this.getBrain(channelId);
    if (brain) {
      if (rec.category === 'CONTENT_MIX') {
        const mix = { ...brain.content.contentMix, 'Developer Tools': 30, 'AI News': 25 };
        brain.content.contentMix = mix;
        await this.saveBrain(channelId, brain, 'owner', `Applied Strategy Recommendation: ${rec.title}`);
      }
    }

    await db.query("UPDATE strategy_recommendations SET status = 'APPLIED' WHERE id = $1", [recId]);
  }

  private mapBrainRow(row: any): ChannelBrain {
    return {
      id: row.id,
      channelId: row.channel_id,
      version: row.version,
      status: row.status as any,
      identity: typeof row.identity_json === 'string' ? JSON.parse(row.identity_json) : row.identity_json,
      audience: typeof row.audience_json === 'string' ? JSON.parse(row.audience_json) : row.audience_json,
      content: typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json,
      style: typeof row.style_json === 'string' ? JSON.parse(row.style_json) : row.style_json,
      sources: typeof row.sources_json === 'string' ? JSON.parse(row.sources_json) : row.sources_json,
      publishing: typeof row.publishing_json === 'string' ? JSON.parse(row.publishing_json) : row.publishing_json,
      media: typeof row.media_json === 'string' ? JSON.parse(row.media_json) : row.media_json,
      approval: typeof row.approval_json === 'string' ? JSON.parse(row.approval_json) : row.approval_json,
      business: typeof row.business_json === 'string' ? JSON.parse(row.business_json) : row.business_json,
      restrictions: row.restrictions_json ? (typeof row.restrictions_json === 'string' ? JSON.parse(row.restrictions_json) : row.restrictions_json) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
