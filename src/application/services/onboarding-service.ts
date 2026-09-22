// ==============================================================
// AI Conversational Onboarding Service — Section 5, 6, 7, 8
// ==============================================================

import crypto from 'crypto';
import { getDatabaseClient } from '../../infrastructure/database/db-client';
import { ChannelBrainService } from './channel-brain-service';
import {
  OnboardingSession,
  OnboardingMessage,
  ChannelBrain,
  ChannelStatus,
  AuditActorType,
} from '../../domain/types';
import { AuditService } from './audit-service';

export class OnboardingService {
  private brainService = new ChannelBrainService();

  /**
   * Starts a new onboarding session for a channel (sets ChannelStatus = ONBOARDING).
   */
  async startOnboarding(channelId: string, ownerUserId: string): Promise<OnboardingSession> {
    const db = getDatabaseClient();

    // Set channel status to ONBOARDING (Section 6)
    await db.query("UPDATE channels SET status = 'ONBOARDING', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [channelId]);

    const chanRes = await db.query('SELECT * FROM channels WHERE id = $1', [channelId]);
    if (!chanRes.rowCount) throw new Error('Channel not found');
    const channel = chanRes.rows[0];
    const channelName = channel.name || 'your channel';

    const sessionId = `onb-${channelId}-${crypto.randomUUID()}`;
    const initialMessage: OnboardingMessage = {
      id: `msg-1`,
      role: 'assistant',
      text: `👋 Welcome! I'm your dedicated AI Channel Manager for *${channelName}*.\n\nI will configure your channel's persistent **AI Brain** once, so I know your exact topics, audience, language, and writing rules.\n\nTo begin, please tell me in your own words:\n**What is this channel about, who is your target audience, and what language should we publish in?**`,
      timestamp: new Date().toISOString(),
    };

    const session: OnboardingSession = {
      id: sessionId,
      channelId,
      ownerUserId,
      status: 'IN_PROGRESS',
      step: 1,
      messages: [initialMessage],
      extractedData: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.query(
      `INSERT INTO channel_onboarding_sessions (
        id, channel_id, owner_user_id, status, step, messages_json, extracted_data_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING`,
      [
        session.id,
        channelId,
        ownerUserId,
        session.status,
        session.step,
        JSON.stringify(session.messages),
        JSON.stringify(session.extractedData),
      ]
    );

    await AuditService.log(
      channel.workspace_id,
      channelId,
      AuditActorType.OWNER,
      ownerUserId,
      'ONBOARDING_STARTED',
      'ONBOARDING_SESSION',
      sessionId
    );

    return session;
  }

  /**
   * Retrieves active onboarding session for a channel.
   */
  async getActiveSession(channelId: string): Promise<OnboardingSession | null> {
    const db = getDatabaseClient();
    const res = await db.query(
      "SELECT * FROM channel_onboarding_sessions WHERE channel_id = $1 ORDER BY created_at DESC LIMIT 1",
      [channelId]
    );
    if (res.rowCount === 0) return null;
    return this.mapSessionRow(res.rows[0]);
  }

  /**
   * Processes owner natural-language reply during onboarding (Section 7: Smart questioning).
   */
  async processUserMessage(
    channelId: string,
    ownerUserId: string,
    userText: string
  ): Promise<{ session: OnboardingSession; replyText: string; isReadyForApproval: boolean; brainSummary?: string }> {
    let session = await this.getActiveSession(channelId);
    if (!session || session.status === 'COMPLETED') {
      session = await this.startOnboarding(channelId, ownerUserId);
    }

    // 1. Smart Field Extraction from user text (Section 7)
    const extracted = this.extractFieldsFromNaturalLanguage(userText, session.extractedData);
    session.extractedData = extracted;

    const userMessage: OnboardingMessage = {
      id: `msg-${session.messages.length + 1}`,
      role: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMessage);

    // Default owner communication to Persian ('fa') and source languages if not specified
    if (!extracted.ownerLanguage) {
      extracted.ownerLanguage = 'fa';
    }
    if (!extracted.sourceLanguages || extracted.sourceLanguages.length === 0) {
      extracted.sourceLanguages = ['en', 'de', 'ja'];
    }

    // 2. Determine what information is still missing (Section 5 & 7)
    const missing: string[] = [];
    if (!extracted.niche && !extracted.topics?.length) missing.push('channel_topic');
    if (!extracted.audience) missing.push('audience');
    if (!extracted.contentLanguage && !extracted.language) missing.push('content_language');

    let replyText = '';
    let isReadyForApproval = false;
    let brainSummary: string | undefined;

    if (missing.length === 0 || session.step >= 3) {
      // All core questions answered or owner provided comprehensive answer: generate Channel Brain!
      isReadyForApproval = true;
      session.status = 'BRAIN_GENERATED';

      const proposedBrain = this.buildBrainFromExtractedData(channelId, extracted);
      session.proposedBrain = proposedBrain;

      brainSummary = this.formatBrainSummary(proposedBrain, extracted);
      replyText =
`🎉 *YOUR CHANNEL BRAIN IS READY!*

Here is my structured understanding of how to run this channel:

${brainSummary}

Buttons:
[✅ APPROVE] [✏️ EDIT] [🔄 REGENERATE]`;

      session.messages.push({
        id: `msg-${session.messages.length + 1}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toISOString(),
        suggestedButtons: [
          { text: '✅ Approve Channel Brain', data: `APPROVE_BRAIN:${channelId}` },
          { text: '✏️ Edit Settings', data: `EDIT_BRAIN:${channelId}` },
          { text: '🔄 Regenerate', data: `REGENERATE_BRAIN:${channelId}` },
        ],
      });
    } else {
      // Smart prompt asking only what's missing (Section 7)
      session.step += 1;
      const questions: string[] = [];

      if (missing.includes('owner_language')) {
        questions.push('What language should I use when sending private proposals and messages to YOU? (e.g. Persian, English, Spanish)');
      }
      if (missing.includes('research_languages')) {
        questions.push('Which languages may I research across global sources? (e.g. English, German, Japanese)');
      }
      if (missing.includes('audience')) {
        questions.push('Who is your target audience and what is their technical level?');
      }

      replyText = `Great! I've saved those details.\n\nTo complete your Channel Brain:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;

      session.messages.push({
        id: `msg-${session.messages.length + 1}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toISOString(),
      });
    }

    // Persist session state
    const db = getDatabaseClient();
    await db.query(
      `UPDATE channel_onboarding_sessions SET
        status = $1, step = $2, messages_json = $3, extracted_data_json = $4,
        proposed_brain_json = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        session.status,
        session.step,
        JSON.stringify(session.messages),
        JSON.stringify(session.extractedData),
        session.proposedBrain ? JSON.stringify(session.proposedBrain) : null,
        session.id,
      ]
    );

    return {
      session,
      replyText,
      isReadyForApproval,
      brainSummary,
    };
  }

  /**
   * Approves the Channel Brain, activating the channel (AC-10 & AC-11).
   */
  async approveBrain(channelId: string, ownerUserId: string): Promise<ChannelBrain> {
    const session = await this.getActiveSession(channelId);
    let brainToSave = session?.proposedBrain;

    if (!brainToSave) {
      brainToSave = this.buildBrainFromExtractedData(channelId, session?.extractedData || {});
    }

    brainToSave.status = 'ACTIVE';

    // 1. Save Channel Brain
    const saved = await this.brainService.saveBrain(
      channelId,
      brainToSave,
      ownerUserId,
      'Approved initial onboarding Channel Brain'
    );

    // 2. Set Channel Language Settings (Section 4 & 21)
    const contentLang = session?.extractedData?.contentLanguage || 'en';
    const ownerLang = session?.extractedData?.ownerLanguage || 'fa'; // Persian default
    const sourceLangs = session?.extractedData?.sourceLanguages || ['en', 'de', 'ja'];

    await this.brainService.updateLanguageSettings(channelId, {
      primaryChannelLanguage: contentLang,
      contentLanguage: contentLang,
      metadataLanguage: contentLang,
      ownerCommunicationLanguage: ownerLang,
      allowedSourceLanguages: sourceLangs,
      preserveTechnicalTerms: true,
    });

    // 3. Set Explicit Owner Preferences (Section 10)
    await this.brainService.addPreference(channelId, {
      channelId,
      type: 'EXPLICIT',
      category: 'TOPIC',
      rule: 'Focus primarily on AI Models, Coding Agents, Developer Tools, and Open Source AI',
      confidence: 1.0,
      source: 'ONBOARDING',
      status: 'ACTIVE',
    });

    if (session?.extractedData?.restrictions?.length) {
      for (const r of session.extractedData.restrictions) {
        await this.brainService.addPreference(channelId, {
          channelId,
          type: 'EXPLICIT',
          category: 'STYLE',
          rule: `Avoid: ${r}`,
          confidence: 1.0,
          source: 'ONBOARDING',
          status: 'ACTIVE',
        });
      }
    }

    // 4. Activate Channel! (AC-11)
    const db = getDatabaseClient();
    const channel = await db.query<{ workspace_id: string }>('SELECT workspace_id FROM channels WHERE id = $1', [channelId]);
    if (!channel.rowCount) throw new Error('Channel not found');
    await db.query("UPDATE channels SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [channelId]);

    // Complete session
    if (session) {
      await db.query("UPDATE channel_onboarding_sessions SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [session.id]);
    }

    await AuditService.log(
      channel.rows[0].workspace_id,
      channelId,
      AuditActorType.OWNER,
      ownerUserId,
      'CHANNEL_BRAIN_ACTIVATED',
      'CHANNEL',
      channelId,
      { contentLanguage: contentLang, ownerCommunicationLanguage: ownerLang }
    );

    return saved;
  }

  /**
   * Identifies missing configuration fields for smart questioning (Section 7).
   */
  public getMissingFields(extracted: OnboardingSession['extractedData']): string[] {
    const missing: string[] = [];
    if (!extracted.niche && (!extracted.topics || extracted.topics.length === 0)) {
      missing.push('primary topics and niche focus');
    }
    if (!extracted.audience && !extracted.audienceLevel) {
      missing.push('target audience profile and expertise level');
    }
    if (!extracted.contentLanguage && !extracted.language) {
      missing.push('publishing content language');
    }
    if (!extracted.ownerLanguage) {
      missing.push('owner notification language');
    }
    if (!extracted.tone && !extracted.style) {
      missing.push('tone and editorial style');
    }
    return missing;
  }

  /**
   * Smart extraction of configuration fields from free-form text (Section 7).
   */
  public extractFieldsFromNaturalLanguage(
    text: string,
    existing: OnboardingSession['extractedData'] = {}
  ): OnboardingSession['extractedData'] {
    const t = text.toLowerCase();
    const result = { ...existing };

    // Niche & Content
    const extractedTopics: string[] = [];
    if (t.includes('artificial intelligence') || t.includes('ai')) {
      result.niche = 'Artificial Intelligence & Developer Tools';
      extractedTopics.push('Artificial Intelligence');
    }
    if (t.includes('robotics')) {
      extractedTopics.push('Robotics');
    }
    if (t.includes('developer tools') || t.includes('coding')) {
      extractedTopics.push('Developer Tools');
    }
    if (t.includes('quantum')) {
      extractedTopics.push('Quantum Computing');
    }
    if (extractedTopics.length > 0) {
      result.topics = Array.from(new Set([...(result.topics || []), ...extractedTopics]));
    } else if (!result.topics || result.topics.length === 0) {
      result.topics = ['AI Models', 'AI Agents', 'Developer Tools', 'AI Research', 'Open Source AI'];
    }

    // Audience
    if (t.includes('developer') || t.includes('engineers') || t.includes('programmers') || t.includes('founders') || t.includes('enthusiasts')) {
      result.audience = 'Developers, technical founders and AI practitioners';
    }
    if (t.includes('intermediate')) {
      result.audienceLevel = 'intermediate';
    } else if (t.includes('advanced')) {
      result.audienceLevel = 'advanced';
    } else if (t.includes('beginner')) {
      result.audienceLevel = 'beginner';
    }

    // Frequency
    const freqMatch = t.match(/(\d+)\s*(posts?|times?)?\s*(a|per)?\s*day/);
    if (freqMatch) {
      result.postsPerDay = parseInt(freqMatch[1], 10);
      result.postingFrequency = result.postsPerDay;
    } else if (t.includes('three') || t.includes('3')) {
      result.postingFrequency = 3;
      result.postsPerDay = 3;
    }

    // Content Language
    if (t.includes('english') || t.includes('en')) {
      result.contentLanguage = 'en';
      result.channelLanguage = 'en';
      result.language = 'en';
    } else if (t.includes('persian') || t.includes('farsi') || t.includes('fa')) {
      result.contentLanguage = 'fa';
      result.channelLanguage = 'fa';
      result.language = 'fa';
    } else if (t.includes('german') || t.includes('deutsch')) {
      result.contentLanguage = 'de';
      result.channelLanguage = 'de';
      result.language = 'de';
    }

    // Owner Communication Language (Section 4 & 21)
    if (t.includes('communicate in persian') || t.includes('farsi') || t.includes('persian') || t.includes('owner language: persian') || t.includes('owner: persian')) {
      result.ownerLanguage = 'fa';
    } else if (t.includes('communicate in english')) {
      result.ownerLanguage = 'en';
    }

    // Research Languages (Section 4 & 14)
    const sourceLangs = new Set(result.sourceLanguages || ['en']);
    if (t.includes('german')) sourceLangs.add('de');
    if (t.includes('japanese')) sourceLangs.add('ja');
    if (t.includes('french')) sourceLangs.add('fr');
    if (t.includes('chinese')) sourceLangs.add('zh');
    result.sourceLanguages = Array.from(sourceLangs);

    // Style & Tone
    if (t.includes('short') || t.includes('concise')) {
      result.style = 'Concise, high-signal, no fluff';
    }
    if (t.includes('technical') || t.includes('expert')) {
      result.tone = 'Technical and concise, expert';
    }

    // Restrictions & Excluded Topics
    const restrictions = new Set(result.restrictions || []);
    const excludedTopics = new Set(result.excludedTopics || []);
    if (t.includes('no rumors') || t.includes('no gossip') || t.includes('don\'t want rumors') || t.includes('avoid rumors')) {
      restrictions.add('No rumors or unverified claims');
    }
    if (t.includes('no clickbait') || t.includes('no hype') || t.includes('avoid hype')) {
      restrictions.add('No clickbait or exaggerated breakthroughs');
    }
    if (t.includes('crypto')) {
      excludedTopics.add('Crypto');
      excludedTopics.add('NFTs');
    }
    result.restrictions = Array.from(restrictions);
    result.excludedTopics = Array.from(excludedTopics);
    if (result.excludedTopics.length === 0) {
      result.excludedTopics = ['Crypto gambling', 'NFTs', 'Celebrity gossip'];
    }

    return result;
  }

  public buildBrainFromExtractedData(channelId: string, data: OnboardingSession['extractedData']): ChannelBrain {
    const contentLang = data.contentLanguage || data.language || 'en';
    const sourceLangs = data.sourceLanguages?.length ? data.sourceLanguages : ['en', 'de', 'ja'];

    return {
      id: `brain-${channelId}-${crypto.randomUUID()}`,
      channelId,
      version: 1,
      status: 'PENDING_APPROVAL',
      identity: {
        channelName: data.channelName || 'FutureStack AI',
        description: data.niche || 'Daily curated intelligence on cutting-edge AI models, developer tools, and open-source breakthroughs.',
        niche: data.niche || 'Artificial Intelligence',
        subNiches: ['AI Models', 'Developer Tools', 'Robotics', 'Open Source AI'],
        positioning: 'Signal-dense engineering briefings for practicing software professionals',
        uniqueValueProposition: 'Hype-free technical clarity with primary source verification',
        channelGoals: ['Deliver high-value technical intelligence', 'Grow engaged developer community'],
      },
      audience: {
        targetAudience: data.audience || 'Software engineers, AI researchers, and technical founders',
        audienceKnowledgeLevel: (data.audienceLevel as any) || 'advanced',
        interests: ['LLMs', 'Developer APIs', 'Open Weights', 'Inference Optimization'],
        painPoints: ['Overhyped PR announcements', 'Unverifiable social media claims'],
      },
      content: {
        primaryTopics: data.topics || ['AI Models', 'Developer Tools', 'AI Research', 'Open Source AI'],
        secondaryTopics: ['Robotics', 'Cloud Infrastructure'],
        excludedTopics: data.excludedTopics || ['Crypto gambling', 'NFTs', 'Unverified rumors'],
        preferredContentTypes: ['MODEL_RELEASE', 'TOOL_ANNOUNCEMENT', 'OPEN_SOURCE'] as any,
        contentMix: { 'AI News': 30, 'Developer Tools': 25, 'Research': 20, 'Open Source': 15, 'Tutorials': 10 },
        technicalDepth: 'high',
        preferredPostLength: { minChars: 400, maxChars: 1200 },
      },
      style: {
        tone: data.tone || 'Technical, expert, clear, concise, not clickbait',
        writingStyle: data.style || 'High-quality human technology editor',
        headlineStyle: 'Informative and descriptive headline without exclamation points',
        emojiPolicy: 'minimal',
        hashtagPolicy: 'minimal',
        ctaPolicy: 'read primary sources',
        formattingRules: ['Emoji headline', 'Bullet point takeaways', 'Direct source URL link'],
      },
      sources: {
        preferredSources: ['arXiv cs.AI', 'Hugging Face Blog', 'GitHub Engineering', 'OpenAI Research'],
        excludedSources: ['Tabloid tech blogs', 'Speculative rumor accounts'],
        trustedDomains: ['arxiv.org', 'github.com', 'huggingface.co', 'deepmind.google'],
        preferredSourceTypes: ['WEB', 'RSS'] as any,
        sourceLanguages: sourceLangs,
        minimumSourceQuality: 85,
      },
      publishing: {
        postingFrequency: data.postsPerDay || data.postingFrequency || 3,
        timezone: 'UTC',
        preferredPublishingWindows: ['09:00', '14:00', '20:00'],
        weekendPolicy: 'normal',
        minimumSpacingHours: 3,
      },
      media: {
        imagePolicy: 'mixed',
        videoPolicy: 'links_only',
        aiImageGenerationPolicy: 'Cybernetic blueprint aesthetic',
        screenshotPolicy: 'Permitted from official docs',
        mediaTextLanguage: contentLang,
      },
      approval: {
        allPostsRequireOwnerApproval: true,
        allowedAutonomousActions: ['research', 'source_deduplication', 'draft_generation', 'quality_checks'],
        actionsRequiringOwnerApproval: ['publish_post', 'branding_changes', 'schedule_changes'],
      },
      business: {
        growthObjective: 'Top-tier technical audience retention',
        monetizationObjective: 'Selective developer tool partnerships',
        advertisingPolicy: 'Developer productivity tools only',
        affiliatePolicy: 'Strict disclosure required',
        sponsoredContentPolicy: 'Max 1 post per week with owner approval',
      },
      restrictions: {
        prohibitedTopics: data.excludedTopics || ['Crypto gambling', 'NFTs'],
        sensitiveTopicsRequiringApproval: ['Security vulnerabilities', 'Lawsuits'],
        competitorMentions: 'Permitted neutrally',
        excludedKeywords: ['crypto airdrop', 'free tokens', 'get rich quick', '100x gains'],
        embargoPolicy: 'Respect all stated embargo timestamps',
        copyrightPolicy: 'Fair use quotation with explicit primary link attribution',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public formatBrainSummary(brain: ChannelBrain, data: OnboardingSession['extractedData']): string {
    return (
`*Channel:* ${brain.identity.channelName}
*Content Language:* ${data.contentLanguage?.toUpperCase() || 'EN'}
*Owner Communication:* ${data.ownerLanguage ? (data.ownerLanguage === 'fa' ? 'Persian (Farsi)' : data.ownerLanguage.toUpperCase()) : 'Persian (Farsi)'}
*Research Languages:* ${(brain.sources.sourceLanguages || ['en', 'de', 'ja']).map((l) => l.toUpperCase()).join(', ')}

*Audience:* ${brain.audience.targetAudience}
*Posting Frequency:* ${brain.publishing.postingFrequency} posts/day

*Main Topics:*
${brain.content.primaryTopics.map((t) => `• ${t}`).join('\n')}

*Strictly Avoid:*
${brain.content.excludedTopics.map((t) => `• ${t}`).join('\n')}

*Style:* ${brain.style.tone}
*Approval Rule:* Every post requires owner approval before publishing`
    );
  }

  private mapSessionRow(row: any): OnboardingSession {
    return {
      id: row.id,
      channelId: row.channel_id,
      ownerUserId: row.owner_user_id,
      status: row.status as any,
      step: row.step,
      messages: typeof row.messages_json === 'string' ? JSON.parse(row.messages_json) : row.messages_json,
      extractedData: typeof row.extracted_data_json === 'string' ? JSON.parse(row.extracted_data_json) : row.extracted_data_json,
      proposedBrain: row.proposed_brain_json ? (typeof row.proposed_brain_json === 'string' ? JSON.parse(row.proposed_brain_json) : row.proposed_brain_json) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
