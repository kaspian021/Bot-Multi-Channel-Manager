import { NextRequest, NextResponse } from 'next/server';
import { AccountLinkingService } from '@/application/services/account-linking-service';
import { getDatabaseClient } from '@/infrastructure/database/db-client';
import { authenticateTrustedIntegrationRequest, IntegrationAuthenticationError } from '@/infrastructure/security/trusted-integration-auth';
export const dynamic = 'force-dynamic';
/** A machine-authenticated account provider creates the opaque Telegram deep-link challenge. */
export async function POST(req: NextRequest) {
  try {
    await authenticateTrustedIntegrationRequest(req);
    const body = await req.json();
    const provider = body.externalProvider || 'digistore';
    if (!body.externalUserId) return NextResponse.json({ error: 'externalUserId is required' }, { status: 400 });
    const service = new AccountLinkingService();
    const accountId = await service.createAccount({ externalProvider: provider, externalUserId: body.externalUserId, displayName: body.displayName });
    let workspaceId = body.workspaceId as string | undefined;
    if (!workspaceId && body.workspace) workspaceId = await service.createWorkspace(accountId, body.workspace);
    if (workspaceId) {
      const membership = await getDatabaseClient().query('SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND account_id = $2 AND status = $3', [workspaceId, accountId, 'ACTIVE']);
      if (!membership.rowCount) return NextResponse.json({ error: 'Workspace does not belong to account' }, { status: 403 });
    }
    const challenge = await service.createLinkChallenge(accountId, workspaceId, body.ttlSeconds);
    const botUsername = body.botUsername || process.env.TELEGRAM_BOT_USERNAME;
    // The token is intentionally only exposed to a test/demo provider; real
    // providers receive a deep-link and deliver it to their authenticated user.
    return NextResponse.json({ accountId, workspaceId, expiresAt: challenge.expiresAt, deepLink: botUsername ? `https://t.me/${botUsername.replace('@', '')}?start=link_${challenge.token}` : undefined, token: process.env.DEMO_MODE === 'true' ? challenge.token : undefined }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Link challenge failed' }, { status: error instanceof IntegrationAuthenticationError ? error.statusCode : 400 }); }
}
