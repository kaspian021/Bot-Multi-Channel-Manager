import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBotService, TelegramUpdate } from '@/infrastructure/telegram/telegram-bot-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bot = getTelegramBotService();
    const demoOwnerId = process.env.DEMO_MODE === 'true' ? parseInt(process.env.TELEGRAM_OWNER_USER_ID || '987654321', 10) : NaN;
    const senderId = body.userId ? parseInt(body.userId, 10) : demoOwnerId;
    if (!Number.isFinite(senderId)) return NextResponse.json({ error: 'userId is required outside DEMO_MODE' }, { status: 400 });

    let update: TelegramUpdate;

    if (body.callbackData) {
      // Simulate button click
      update = {
        update_id: Math.floor(Math.random() * 100000),
        callback_query: {
          id: `cq-${Date.now()}`,
          from: { id: senderId, is_bot: false, first_name: 'Owner', username: 'owner_user' },
          data: body.callbackData,
        },
      };
    } else {
      // Simulate text command
      update = {
        update_id: Math.floor(Math.random() * 100000),
        message: {
          message_id: Math.floor(Math.random() * 10000),
          from: { id: senderId, is_bot: false, first_name: 'Owner', username: 'owner_user' },
          chat: { id: senderId, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: body.text || '/start',
        },
      };
    }

    const result = await bot.handleUpdate(update);
    return NextResponse.json({
      success: true,
      result,
      messages: bot.getSimulatedMessages(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Simulation failed' }, { status: 500 });
  }
}
