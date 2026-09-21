import { NextRequest, NextResponse } from 'next/server';
import { SchedulerService } from '@/application/services/scheduler-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const scheduledFor = body.scheduledFor || new Date(Date.now() + 2 * 3600 * 1000).toISOString();

    const scheduler = new SchedulerService();
    const schedId = await scheduler.scheduleDraft(params.id, scheduledFor, 'admin-ui');

    return NextResponse.json({ success: true, status: 'SCHEDULED', scheduledPostId: schedId, scheduledFor });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Scheduling failed' }, { status: 400 });
  }
}
