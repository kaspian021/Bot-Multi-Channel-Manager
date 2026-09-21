import { NextRequest, NextResponse } from 'next/server';
import { PublishingService } from '@/application/services/publishing-service';
import { AuditActorType } from '@/domain/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pubService = new PublishingService();
    const result = await pubService.publishDraft(params.id, {
      actorType: AuditActorType.OWNER,
      actorId: 'admin-ui',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Publish failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, status: 'PUBLISHED', telegramMessageId: result.telegramMessageId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Publishing failed' }, { status: 400 });
  }
}
