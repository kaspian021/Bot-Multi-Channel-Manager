// ==============================================================
// Telegram Channel Verification API (Section 35 & 81)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { channelChatId } = await req.json();

    if (!channelChatId || typeof channelChatId !== 'string') {
      return NextResponse.json({ error: 'channelChatId is required' }, { status: 400 });
    }

    const bot = getTelegramBotService();
    const verification = await bot.verifyChannel(channelChatId);

    return NextResponse.json({
      success: verification.isValid,
      verification,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Verification failed' }, { status: 500 });
  }
}
