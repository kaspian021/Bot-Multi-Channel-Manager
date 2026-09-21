// ==============================================================
// Onboarding Message API (POST)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { OnboardingService } from '@/application/services/onboarding-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const onboardingService = new OnboardingService();
    const body = await req.json();
    const userText = body.message || '';
    const ownerUserId = body.ownerUserId || '987654321';

    const response = await onboardingService.processUserMessage(params.id, ownerUserId, userText);
    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to process message' }, { status: 500 });
  }
}
