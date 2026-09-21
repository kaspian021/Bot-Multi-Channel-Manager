// ==============================================================
// Health Check Endpoint — Section 41 & 60 Specification
// ==============================================================

import { NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';
import { getAiProvider } from '@/infrastructure/ai/ai-provider-factory';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  let dbOk = false;
  let latencyMs = 0;

  try {
    const db = getDatabaseClient();
    await db.query('SELECT 1');
    dbOk = true;
    latencyMs = Date.now() - start;
  } catch (err) {
    dbOk = false;
  }

  const bot = getTelegramBotService();
  const ai = getAiProvider();
  const isDemo = process.env.DEMO_MODE === 'true';

  const isHealthy = dbOk;

  return NextResponse.json(
    {
      status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      demoMode: isDemo,
      pausePublishing: process.env.PAUSE_PUBLISHING === 'true',
      database: {
        connected: dbOk,
        latencyMs,
        provider: getDatabaseClient().getProviderName(),
      },
      telegram: {
        configured: bot.isConfigured(),
        mode: process.env.TELEGRAM_MODE || 'polling',
      },
      aiProvider: {
        active: ai.providerName,
        available: true,
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
