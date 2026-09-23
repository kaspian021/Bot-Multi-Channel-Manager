// ==============================================================
// Production Status & Intelligence Health API (Phase 3)
// ==============================================================

import { NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDatabaseClient();
    const bot = getTelegramBotService();
    const isDemoMode = process.env.DEMO_MODE === 'true';

    // 1. Provider statuses
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const youtubeKey = process.env.YOUTUBE_API_KEY;
    const redditKey = process.env.REDDIT_CLIENT_ID;

    const providers = {
      research: {
        primary: {
          name: 'Google Gemini Search Grounding',
          configured: Boolean(geminiKey && !geminiKey.startsWith('demo_')),
          status: isDemoMode ? 'DEMO_MOCK' : geminiKey ? 'OPERATIONAL' : 'MISSING_KEY',
        },
        fallback: {
          name: 'OpenAI Web Search (Responses API)',
          configured: Boolean(openaiKey && !openaiKey.startsWith('demo_')),
          status: isDemoMode ? 'DEMO_MOCK' : openaiKey ? 'OPERATIONAL' : 'MISSING_KEY',
        },
      },
      connectors: {
        youtube: {
          name: 'YouTube Data API v3',
          configured: Boolean(youtubeKey && !youtubeKey.startsWith('demo_')),
          status: isDemoMode ? 'DEMO_MOCK' : youtubeKey ? 'OPERATIONAL' : 'DISABLED',
        },
        reddit: {
          name: 'Reddit OAuth API',
          configured: Boolean(redditKey && !redditKey.startsWith('demo_')),
          status: isDemoMode ? 'DEMO_MOCK' : redditKey ? 'OPERATIONAL' : 'DISABLED',
        },
        rss: {
          name: 'Production RSS & HTML Fetcher (SSRF Safe)',
          configured: true,
          status: 'OPERATIONAL',
        },
      },
      telegram: {
        name: 'Telegram Bot API Publisher',
        configured: bot.isConfigured(),
        status: isDemoMode ? 'DEMO_MODE' : bot.isConfigured() ? 'OPERATIONAL' : 'UNCONFIGURED',
        authorization: 'workspace-linked Telegram identities',
      },
    };

    // 2. Sources Health breakdown
    const sourcesRes = await db.query(`
      SELECT 
        trust_tier, 
        health_status, 
        count(*) as count 
      FROM content_sources 
      GROUP BY trust_tier, health_status
    `);

    // 3. Provider Failover / Failure logs
    const failoverLogs = await db.query(`
      SELECT * FROM provider_failure_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    // 4. Publishing Lock and Status summary
    const channels = await db.query('SELECT id, name, status, telegram_chat_id FROM channels');

    return NextResponse.json({
      success: true,
      mode: isDemoMode ? 'DEMO' : 'PRODUCTION',
      pausePublishing: process.env.PAUSE_PUBLISHING === 'true',
      providers,
      sourceBreakdown: sourcesRes.rows,
      recentFailovers: failoverLogs.rows,
      channels: channels.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch production status' }, { status: 500 });
  }
}
