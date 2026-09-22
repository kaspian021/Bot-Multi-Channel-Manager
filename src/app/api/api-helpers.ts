import { NextRequest, NextResponse } from 'next/server';
import { TenantAccessError, TenantContext, resolveTenantContext } from '@/application/services/tenant-context-service';
import { seedDatabase } from '@/infrastructure/database/seed';

export async function tenantFor(request: NextRequest): Promise<TenantContext> {
  // Demo fixture preparation is explicit and harmlessly idempotent. Production
  // seedDatabase is a no-op, so API paths never invent a demo tenant.
  await seedDatabase(false);
  return resolveTenantContext(request);
}

export function apiError(error: unknown, fallback = 'Request failed'): NextResponse {
  if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message || fallback }, { status: 500 });
}
