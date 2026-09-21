// ==============================================================
// Onboarding Approve API (POST)
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
    const result = await onboardingService.approveBrain(params.id, ownerUserId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to approve brain' }, { status: 400 });
  }
}
