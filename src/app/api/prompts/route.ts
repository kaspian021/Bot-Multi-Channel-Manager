// ==============================================================
// Prompts Management API — Section 31 Specification
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { seedDatabase } from '@/infrastructure/database/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  await seedDatabase(false);
  const db = getDatabaseClient();
  const res = await db.query('SELECT * FROM prompt_templates ORDER BY name ASC');
  const formatted = res.rows.map((r: any) => ({
    ...r,
    variables: typeof r.variables === 'string' ? JSON.parse(r.variables) : r.variables,
  }));
  return NextResponse.json(formatted);
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDatabaseClient();
    const body = await req.json();
    const { key, systemPrompt, userPromptTemplate } = body;

    await db.query(
      `UPDATE prompt_templates SET
        system_prompt = $1,
        user_prompt_template = $2,
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE key = $3`,
      [systemPrompt, userPromptTemplate, key]
    );

    return NextResponse.json({ success: true, message: `Prompt ${key} updated` });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update prompt' }, { status: 500 });
  }
}
