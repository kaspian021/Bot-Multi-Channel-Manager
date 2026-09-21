// ==============================================================
// Dashboard Stats Endpoint — Section 38 & 41 Specification
// ==============================================================

import { NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await seedDatabase(false);
    const db = getDatabaseClient();

    const [
      channelCount,
      pendingDrafts,
      scheduledCount,
      publishedCount,
      researchCount,
      recentDrafts,
      recentAudit,
      recentScheduled,
    ] = await Promise.all([
      db.query("SELECT count(*) as count FROM channels WHERE status = 'ACTIVE'"),
      db.query("SELECT count(*) as count FROM content_drafts WHERE status = 'PENDING_APPROVAL'"),
      db.query("SELECT count(*) as count FROM scheduled_posts WHERE status = 'PENDING'"),
      db.query('SELECT count(*) as count FROM published_posts'),
      db.query('SELECT count(*) as count FROM research_runs'),
      db.query('SELECT * FROM content_drafts ORDER BY created_at DESC LIMIT 5'),
      db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 6'),
      db.query(`
        SELECT sp.*, cd.headline, cd.topic 
        FROM scheduled_posts sp
        LEFT JOIN content_drafts cd ON sp.draft_id = cd.id
        WHERE sp.status = 'PENDING'
        ORDER BY sp.scheduled_for ASC LIMIT 5
      `),
    ]);

    return NextResponse.json({
      metrics: {
        activeChannels: parseInt(channelCount.rows[0]?.count || '0', 10),
        pendingApprovals: parseInt(pendingDrafts.rows[0]?.count || '0', 10),
        scheduledPosts: parseInt(scheduledCount.rows[0]?.count || '0', 10),
        publishedPosts: parseInt(publishedCount.rows[0]?.count || '0', 10),
        totalResearchRuns: parseInt(researchCount.rows[0]?.count || '0', 10),
      },
      recentDrafts: recentDrafts.rows,
      recentScheduled: recentScheduled.rows,
      recentAuditLogs: recentAudit.rows,
      demoMode: process.env.DEMO_MODE === 'true',
      pausePublishing: process.env.PAUSE_PUBLISHING === 'true',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
