import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { EntitlementService } from '@/application/services/entitlement-service';
import { authenticateTrustedIntegrationRequest, IntegrationAuthenticationError } from '@/infrastructure/security/trusted-integration-auth';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest, { params }: { params: { externalUserId: string } }) {
  try {
    await authenticateTrustedIntegrationRequest(req);
    const provider = req.nextUrl.searchParams.get('provider') || 'digistore';
    const account = await getDatabaseClient().query<{ id: string }>('SELECT id FROM accounts WHERE external_provider = $1 AND external_user_id = $2', [provider, params.externalUserId]);
    if (!account.rowCount) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    const entitlement = await new EntitlementService().resolve(account.rows[0].id);
    return entitlement ? NextResponse.json(entitlement) : NextResponse.json({ error: 'Entitlement not found' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Integration request rejected' }, { status: error instanceof IntegrationAuthenticationError ? error.statusCode : 503 }); }
}
