// ==============================================================
// Channel Brand & Strategy Service — Section 27-30 Specification
// ==============================================================

import crypto from 'crypto';
import { getDatabaseClient } from '../../infrastructure/database/db-client';
import { getAiProvider } from '../../infrastructure/ai/ai-provider-factory';
import { AuditService } from './audit-service';
import { AuditActorType, ChannelBrandProposal } from '../../domain/types';

export class BrandService {
  /**
   * Generates a branding proposal for owner review (YELLOW permission level)
   */
  async createBrandingProposal(channelId: string): Promise<ChannelBrandProposal> {
    const db = getDatabaseClient();
    const ai = getAiProvider();

    const channelRes = await db.query('SELECT * FROM channels WHERE id = $1', [channelId]);
    if (channelRes.rowCount === 0) throw new Error('Channel not found');
    const channel = channelRes.rows[0];

    const promptText = `Propose an identity refresh for channel ${channel.name} focusing on AI & Engineering.`;
    const imageResult = await ai.generateImage('Minimalist modern cybernetic logo, dark obsidian and neon emerald, high resolution');

    const proposalId = `brand-${crypto.randomUUID()}`;
    const proposal: ChannelBrandProposal = {
      id: proposalId,
      channelId,
      proposedName: `${channel.name} Intelligence`,
      proposedDescription: 'Engineering-grade daily briefings on generative AI, autonomous agents, open models, and infrastructure.',
      positioning: 'Authoritative, signal-dense briefings for practicing engineers and technical architects.',
      profileImageUrl: imageResult.url,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    await db.query(
      `INSERT INTO channel_brand_proposals (id, channel_id, proposed_name, proposed_description, positioning, profile_image_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
      [proposal.id, proposal.channelId, proposal.proposedName, proposal.proposedDescription, proposal.positioning, proposal.profileImageUrl]
    );

    await AuditService.log(
      channel.workspace_id,
      channelId,
      AuditActorType.AI_WORKER,
      'brand-worker',
      'BRAND_PROPOSAL_CREATED',
      'BRAND_PROPOSAL',
      proposalId,
      { proposedName: proposal.proposedName }
    );

    return proposal;
  }

  /**
   * Applies proposal upon owner approval (YELLOW permission)
   */
  async applyBrandingProposal(proposalId: string, ownerUserId: string): Promise<void> {
    const db = getDatabaseClient();

    const propRes = await db.query('SELECT * FROM channel_brand_proposals WHERE id = $1', [proposalId]);
    if (propRes.rowCount === 0) throw new Error('Proposal not found');
    const p = propRes.rows[0];

    await db.query(
      `UPDATE channels SET
        name = $1, description = $2, profile_image_url = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [p.proposed_name, p.proposed_description, p.profile_image_url, p.channel_id]
    );

    await db.query("UPDATE channel_brand_proposals SET status = 'APPLIED' WHERE id = $1", [proposalId]);

    const chanRes = await db.query('SELECT workspace_id FROM channels WHERE id = $1', [p.channel_id]);
    if (!chanRes.rowCount) throw new Error('Channel no longer exists');
    await AuditService.log(
      chanRes.rows[0].workspace_id,
      p.channel_id,
      AuditActorType.OWNER,
      ownerUserId,
      'BRAND_PROPOSAL_APPLIED',
      'CHANNEL',
      p.channel_id,
      { proposalId }
    );
  }
}
