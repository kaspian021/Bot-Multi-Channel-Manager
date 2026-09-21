// ==============================================================
// Telegram Channel Metadata Management API (Section 45)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { channelChatId, title, description } = await req.json();

    if (!channelChatId) {
      return NextResponse.json({ error: 'channelChatId is required' }, { status: 400 });
    }

    const bot = getTelegramBotService();
    const result = await bot.updateChannelMetadata(channelChatId, { title, description });

    return NextResponse.json({
      success: result.success,
      updated: { title, description },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Metadata update failed' }, { status: 500 });
  }
}
