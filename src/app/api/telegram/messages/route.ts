import { NextResponse } from 'next/server';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const bot = getTelegramBotService();
  return NextResponse.json({
    messages: bot.getSimulatedMessages(),
    isConfigured: bot.isConfigured(),
    ownerUserId: process.env.TELEGRAM_OWNER_USER_ID || '987654321',
  });
}

export async function DELETE() {
  const bot = getTelegramBotService();
  bot.clearSimulatedMessages();
  return NextResponse.json({ success: true, message: 'Message history cleared' });
}
