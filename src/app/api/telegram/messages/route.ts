import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBotService } from '@/infrastructure/telegram/telegram-bot-service';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { apiError, tenantFor } from '@/app/api/api-helpers';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){try{const context=await tenantFor(req);const identity=await getDatabaseClient().query<{telegram_user_id:string}>('SELECT telegram_user_id FROM telegram_identities WHERE account_id=$1 AND status=$2 ORDER BY verified_at LIMIT 1',[context.accountId,'ACTIVE']);const bot=getTelegramBotService();return NextResponse.json({messages:bot.getSimulatedMessages(),isConfigured:bot.isConfigured(),linkedTelegramUserId:identity.rows[0]?.telegram_user_id || null,authorization:'workspace-linked Telegram identities'});}catch(e){return apiError(e);}}
export async function DELETE(req:NextRequest){try{await tenantFor(req);getTelegramBotService().clearSimulatedMessages();return NextResponse.json({success:true,message:'Message history cleared'});}catch(e){return apiError(e);}}
