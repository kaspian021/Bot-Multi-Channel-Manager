// ==============================================================
// Onboarding Start API (POST)
// ==============================================================

import { NextRequest, NextResponse } from 'next/server';
import { OnboardingService } from '@/application/services/onboarding-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const onboardingService = new OnboardingService();
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const ownerUserId = body.ownerUserId || '987654321';
    const session = await onboardingService.startOnboarding(params.id, ownerUserId);
    return NextResponse.json(session);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to start onboarding' }, { status: 500 });
  }
}
