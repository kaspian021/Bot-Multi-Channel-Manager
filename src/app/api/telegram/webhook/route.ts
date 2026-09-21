// ==============================================================
// Telegram Webhook API — Section 37 Specification
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBotService, TelegramUpdate } from '@/infrastructure/telegram/telegram-bot-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();
    const bot = getTelegramBotService();
    const result = await bot.handleUpdate(update);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Webhook processing failed' }, { status: 500 });
  }
}
