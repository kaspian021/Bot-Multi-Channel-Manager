// ==============================================================
// Telegram Safe Test Message API (Section 76)
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
    const result = await bot.sendTestMessage(channelChatId);

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      messageUrl: result.messageUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to send test message' }, { status: 500 });
  }
}
