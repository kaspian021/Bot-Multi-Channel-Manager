// ==============================================================
// Background Job Orchestrator — Section 48 & 49 Specification
// ==============================================================

import { getDatabaseClient } from '../database/db-client';
import { ResearchService } from '../../application/services/research-service';
import { DraftService } from '../../application/services/draft-service';
import { SchedulerService } from '../../application/services/scheduler-service';
import { AuditService } from '../../application/services/audit-service';
import { AuditActorType } from '../../domain/types';

export class BackgroundJobOrchestrator {
  private researchService = new ResearchService();
  private draftService = new DraftService();
  private schedulerService = new SchedulerService();
  private isRunning = false;
  private intervalTimer: NodeJS.Timeout | null = null;

  async runScheduledPublishJob(): Promise<{ executed: number; failed: number }> {
    return this.schedulerService.executeDueScheduledPosts();
  }

  async runResearchAndDraftJob(channelId?: string): Promise<{ candidatesFound: number; draftCreated?: boolean }> {
    const db = getDatabaseClient();

    // Find channel
    const targetChannelId = channelId || (await db.query("SELECT id FROM channels WHERE status = 'ACTIVE' LIMIT 1")).rows[0]?.id;
    if (!targetChannelId) return { candidatesFound: 0 };

    // 1. Run Research
    const researchResult = await this.researchService.executeResearchRun(targetChannelId);

    // 2. Select top non-duplicate candidate to draft
    const topCand = researchResult.candidates.find((c) => !c.isDuplicate);
    if (topCand) {
      await this.draftService.generateDraftFromCandidate(topCand.id);
      return { candidatesFound: researchResult.candidatesFound, draftCreated: true };
    }

    return { candidatesFound: researchResult.candidatesFound, draftCreated: false };
  }

  startPeriodicWorker(intervalMs = 30000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Worker] Background job orchestrator started (tick every ${intervalMs / 1000}s)`);

    this.intervalTimer = setInterval(async () => {
      try {
        await this.runScheduledPublishJob();
      } catch (err) {
        console.error('[Worker] Error executing scheduled publish cycle:', err);
      }
    }, intervalMs);
  }

  stopWorker(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
    console.log('[Worker] Background job orchestrator stopped');
  }
}

let orchestratorInstance: BackgroundJobOrchestrator | null = null;

export function getBackgroundJobOrchestrator(): BackgroundJobOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new BackgroundJobOrchestrator();
  }
  return orchestratorInstance;
}
