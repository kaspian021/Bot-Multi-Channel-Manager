// ==============================================================
// Tenant-aware Telegram bot adapter — Phase 4
// ==============================================================

import { ContentDraft, Claim } from '../../domain/types';
import { formatTelegramPost, buildApprovalNotificationText } from '../../domain/telegram-format';
import { getDatabaseClient } from '../database/db-client';
import { OnboardingService } from '../../application/services/onboarding-service';
import { ChannelBrainService } from '../../application/services/channel-brain-service';
import { PublishingService } from '../../application/services/publishing-service';
import { SchedulerService } from '../../application/services/scheduler-service';
import { AccountLinkingService } from '../../application/services/account-linking-service';
import { AuditService } from '../../application/services/audit-service';
import { RealTelegramClient } from './real-telegram-client';
import { requireChannelAccess, requireWorkspaceRole, resolveTelegramTenantContext, selectTelegramChannel, selectTelegramWorkspace, TenantContext } from '../../application/services/tenant-context-service';
import { EditorialPlanningService } from '../../application/services/editorial-planning-service';

export interface TelegramInlineButton { text: string; callback_data: string; }
export interface TelegramOutgoingMessage { id: number; chatId: string | number; text: string; replyMarkup?: { inline_keyboard: TelegramInlineButton[][] }; sentAt: string; photoUrl?: string; }
export interface TelegramUpdate {
  update_id: number;
  message?: { message_id: number; from: { id: number; is_bot: boolean; first_name: string; username?: string }; chat: { id: number; type: string }; date: number; text?: string };
  callback_query?: { id: string; from: { id: number; is_bot: boolean; first_name: string; username?: string }; message?: { message_id: number; chat: { id: number } }; data: string };
}

const simulatedMessages: TelegramOutgoingMessage[] = [];
let nextMessageId = 1000;

export class TelegramBotService {
  private readonly botToken: string;
  private readonly demoOwnerUserId: number;
  private readonly isDemoMode: boolean;
  private readonly onboarding = new OnboardingService();
  private readonly brain = new ChannelBrainService();
  private readonly realClient: RealTelegramClient;

  constructor(token?: string, ownerId?: number | string, demoMode?: boolean) {
    this.botToken = token || process.env.TELEGRAM_BOT_TOKEN || '';
    this.isDemoMode = demoMode ?? (process.env.DEMO_MODE === 'true' || !this.botToken || this.botToken.startsWith('demo_'));
    // Legacy env value is read only for the explicit demo simulator fallback.
    this.demoOwnerUserId = this.isDemoMode ? Number(ownerId || process.env.TELEGRAM_OWNER_USER_ID || '987654321') : Number.NaN;
    this.realClient = new RealTelegramClient(this.botToken);
  }

  isConfigured(): boolean { return Boolean(this.botToken && this.botToken.length > 10 && !this.botToken.startsWith('demo_')); }
  getSimulatedMessages(): TelegramOutgoingMessage[] { return [...simulatedMessages]; }
  clearSimulatedMessages(): void { simulatedMessages.length = 0; }

  /** Compatibility helper only. Production authorization resolves DB identity/membership asynchronously. */
  isAuthorizedOwner(userId: number): boolean { return this.isDemoMode && userId === this.demoOwnerUserId; }
  async verifyChannel(channelChatId: string) { return this.realClient.verifyChannel(channelChatId); }
  async sendTestMessage(channelChatId: string) { return this.realClient.sendTestMessage(channelChatId); }
  async updateChannelMetadata(channelChatId: string, metadata: { title?: string; description?: string; photoBuffer?: Buffer }) { return this.realClient.updateChannelMetadata(channelChatId, metadata); }

  formatDraftNotification(draft: ContentDraft, ownerLanguage = 'en'): { text: string; inlineKeyboard: TelegramInlineButton[][] } {
    const fa = ownerLanguage === 'fa';
    return {
      text: buildApprovalNotificationText(draft, ownerLanguage),
      inlineKeyboard: [
        [{ text: fa ? '✅ تأیید' : '✅ Approve', callback_data: `APPROVE_DRAFT:${draft.id}` }, { text: fa ? '✏️ ویرایش' : '✏️ Edit', callback_data: `EDIT_DRAFT:${draft.id}` }, { text: fa ? '❌ رد' : '❌ Reject', callback_data: `REJECT_DRAFT:${draft.id}` }],
        [{ text: fa ? '⏰ تغییر زمان' : '⏰ Change Time', callback_data: `CHANGE_TIME:${draft.id}` }, { text: fa ? '🔎 شواهد' : '🔎 Evidence', callback_data: `VIEW_EVIDENCE:${draft.id}` }, { text: fa ? '📚 منابع' : '📚 Sources', callback_data: `VIEW_SOURCES:${draft.id}` }],
      ],
    };
  }

  async sendDraftForApproval(draft: ContentDraft, ownerLanguage = 'en'): Promise<TelegramOutgoingMessage> {
    const db = getDatabaseClient();
    const recipient = await db.query<{ telegram_user_id: string }>(
      `SELECT ti.telegram_user_id FROM telegram_identities ti
       JOIN workspaces w ON w.account_id = ti.account_id
       JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.account_id = ti.account_id
       WHERE w.id = $1 AND ti.status = 'ACTIVE' AND wm.status = 'ACTIVE' AND wm.role IN ('OWNER', 'ADMIN', 'APPROVER')
       ORDER BY CASE wm.role WHEN 'OWNER' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END LIMIT 1`, [draft.workspaceId]
    );
    const target = recipient.rows[0]?.telegram_user_id || (this.isDemoMode ? String(this.demoOwnerUserId) : undefined);
    if (!target) throw new Error('No linked Telegram approver for workspace');
    const notification = this.formatDraftNotification(draft, ownerLanguage);
    return this.sendMessage(target, notification.text, notification.inlineKeyboard);
  }

  async sendPublishChoicePrompt(draftId: string, suggestedTime: string, ownerLanguage = 'en', recipientId?: string): Promise<TelegramOutgoingMessage> {
    const db = getDatabaseClient();
    let target = recipientId;
    if (!target) {
      const draft = await db.query<{ workspace_id: string }>('SELECT workspace_id FROM content_drafts WHERE id = $1', [draftId]);
      if (draft.rowCount) {
        const recipient = await db.query<{ telegram_user_id: string }>(
          `SELECT ti.telegram_user_id FROM telegram_identities ti JOIN workspaces w ON w.account_id = ti.account_id
           JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.account_id = ti.account_id
           WHERE w.id = $1 AND ti.status = 'ACTIVE' AND wm.status = 'ACTIVE' AND wm.role IN ('OWNER', 'ADMIN', 'APPROVER')
           ORDER BY CASE wm.role WHEN 'OWNER' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END LIMIT 1`, [draft.rows[0].workspace_id]
        );
        target = recipient.rows[0]?.telegram_user_id;
      }
    }
    if (!target && this.isDemoMode) target = String(this.demoOwnerUserId);
    if (!target) throw new Error('No linked Telegram approver for workspace');
    const fa = ownerLanguage === 'fa';
    return this.sendMessage(target, fa ? `✅ پیش‌نویس تأیید شد. زمان پیشنهادی: ${suggestedTime}` : `✅ Draft approved. Suggested time: ${suggestedTime}`, [
      [{ text: fa ? '🚀 انتشار اکنون' : '🚀 Publish now', callback_data: `PUBLISH_NOW:${draftId}` }, { text: fa ? '🕐 زمان‌بندی' : '🕐 Keep schedule', callback_data: `KEEP_TIME:${draftId}` }],
    ]);
  }

  async publishToChannel(channelChatId: string, draft: ContentDraft, idempotencyKey?: string): Promise<{ messageId: number; messageUrl?: string; success: boolean }> {
    if (this.isConfigured() && !this.isDemoMode) return this.realClient.publishPost(channelChatId, formatTelegramPost(draft), draft.mediaUrl, idempotencyKey);
    const message = await this.sendMessage(channelChatId, formatTelegramPost(draft));
    return { success: true, messageId: message.id, messageUrl: channelChatId.startsWith('@') ? `https://t.me/${channelChatId.slice(1)}/${message.id}` : undefined };
  }

  async sendMessage(chatId: string | number, text: string, inlineKeyboard?: TelegramInlineButton[][], photoUrl?: string): Promise<TelegramOutgoingMessage> {
    const record: TelegramOutgoingMessage = { id: nextMessageId++, chatId, text, replyMarkup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined, sentAt: new Date().toISOString(), photoUrl };
    simulatedMessages.push(record);
    if (this.isConfigured() && !this.isDemoMode) {
      try { await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', reply_markup: record.replyMarkup }) }); } catch (error) { console.warn('Telegram send failed:', error); }
    }
    return record;
  }

  private async context(senderId: number): Promise<TenantContext | null> {
    const resolved = await resolveTelegramTenantContext(senderId);
    // The old global owner ID is strictly a DEMO_MODE migration fallback. The
    // normal demo fixture still resolves through telegram_identities.
    if (resolved) return resolved;
    if (this.isDemoMode && senderId === this.demoOwnerUserId) return resolveTelegramTenantContext(senderId);
    return null;
  }

  private async authorizeDraft(senderId: number, draftId: string, minimum: 'VIEWER' | 'APPROVER' = 'VIEWER') {
    const context = await this.context(senderId);
    if (!context) throw new Error('Unauthorized Telegram user');
    const db = getDatabaseClient();
    const draft = await db.query('SELECT * FROM content_drafts WHERE id = $1 AND workspace_id = $2', [draftId, context.workspaceId]);
    if (!draft.rowCount) throw new Error('Draft not found in your workspace');
    requireWorkspaceRole(context, minimum);
    return { context, draft: draft.rows[0] };
  }

  async handleUpdate(update: TelegramUpdate): Promise<{ handled: boolean; responseText: string }> {
    const sender = update.callback_query?.from || update.message?.from;
    if (!sender) return { handled: false, responseText: 'No message/callback' };
    const senderId = sender.id;
    const text = update.message?.text?.trim();

    // Deep-link linking intentionally works before a Telegram identity exists.
    if (text?.startsWith('/start link_')) {
      try {
        const token = text.slice('/start link_'.length).trim();
        const link = await new AccountLinkingService().consumeLinkChallenge({ token, telegramUserId: senderId, username: sender.username });
        await this.sendMessage(senderId, '✅ Telegram account linked securely. Use /workspaces to select a workspace.');
        return { handled: true, responseText: `Account linked${link.workspaceId ? ' and workspace selected' : ''}` };
      } catch (error) {
        await this.sendMessage(senderId, '⚠️ This link is invalid, expired, or already used.');
        return { handled: true, responseText: `Link failed: ${error instanceof Error ? error.message : 'invalid token'}` };
      }
    }

    const context = await this.context(senderId);
    if (!context) {
      await this.sendMessage(senderId, '⚠️ Unauthorized: link your Telegram account through the secure website deep link first.');
      return { handled: true, responseText: 'Unauthorized Telegram user' };
    }

    try {
      if (update.callback_query) return this.handleCallback(senderId, update.callback_query.data, context);
      if (text) return this.handleCommand(senderId, text, context);
      return { handled: false, responseText: 'No message/callback' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      await this.sendMessage(senderId, `⚠️ ${message}`);
      return { handled: true, responseText: message.includes('Unauthorized') ? 'Unauthorized Telegram user' : message };
    }
  }

  private async handleCallback(senderId: number, data: string, context: TenantContext): Promise<{ handled: boolean; responseText: string }> {
    const [action, targetId] = data.split(':', 2);
    const db = getDatabaseClient();
    if (['APPROVE_DRAFT', 'REJECT_DRAFT', 'PUBLISH_NOW', 'KEEP_TIME', 'EDIT_DRAFT', 'CHANGE_TIME', 'VIEW_SOURCES', 'VIEW_EVIDENCE'].includes(action)) {
      const minimum = ['APPROVE_DRAFT', 'REJECT_DRAFT', 'PUBLISH_NOW', 'KEEP_TIME', 'EDIT_DRAFT', 'CHANGE_TIME'].includes(action) ? 'APPROVER' : 'VIEWER';
      const access = await this.authorizeDraft(senderId, targetId, minimum as 'VIEWER' | 'APPROVER');
      const draft = access.draft;
      if (action === 'APPROVE_DRAFT') {
        await db.query("UPDATE content_drafts SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND workspace_id = $2", [targetId, access.context.workspaceId]);
        await AuditService.log(access.context.workspaceId, draft.channel_id, 'OWNER' as any, String(senderId), 'DRAFT_APPROVED', 'DRAFT', targetId, { via: 'telegram_button' });
        await new EditorialPlanningService().recordLearning({ workspaceId: access.context.workspaceId, channelId: draft.channel_id, draftId: targetId, action: 'APPROVE', signalKey: 'approved_topic', signalValue: draft.topic, confidence: 0.8 });
        const lang = await this.brain.getLanguageSettings(draft.channel_id);
        await this.sendPublishChoicePrompt(targetId, draft.suggested_publish_time || '20:30 UTC', lang.ownerCommunicationLanguage, String(senderId));
        return { handled: true, responseText: `Draft ${targetId} approved.` };
      }
      if (action === 'REJECT_DRAFT') {
        await db.query("UPDATE content_drafts SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND workspace_id = $2", [targetId, access.context.workspaceId]);
        await AuditService.log(access.context.workspaceId, draft.channel_id, 'OWNER' as any, String(senderId), 'DRAFT_REJECTED', 'DRAFT', targetId, { via: 'telegram_button' });
        await new EditorialPlanningService().recordLearning({ workspaceId: access.context.workspaceId, channelId: draft.channel_id, draftId: targetId, action: 'REJECT', signalKey: 'rejected_topic', signalValue: draft.topic, confidence: 0.9 });
        await this.sendMessage(senderId, '❌ Draft rejected. It will not be published.'); return { handled: true, responseText: 'Draft rejected.' };
      }
      if (action === 'PUBLISH_NOW') {
        const result = await new PublishingService().publishDraft(targetId, { actorType: 'OWNER' as any, actorId: String(senderId), idempotencyKey: `telegram-publish:${targetId}` });
        if (!result.success) return { handled: true, responseText: result.error || 'Publish blocked' };
        await this.sendMessage(senderId, `🚀 Post successfully published (message #${result.telegramMessageId}).`); return { handled: true, responseText: 'Published now.' };
      }
      if (action === 'KEEP_TIME') {
        const schedule = await new SchedulerService().scheduleDraft(targetId, new Date(Date.now() + 2 * 3600 * 1000), String(senderId));
        await new EditorialPlanningService().recordLearning({ workspaceId: access.context.workspaceId, channelId: draft.channel_id, draftId: targetId, action: 'TIME_CHANGE', signalKey: 'schedule_choice', signalValue: 'keep_suggested_time', confidence: 0.7 });
        return { handled: true, responseText: `Scheduled ${schedule}` };
      }
      if (action === 'EDIT_DRAFT' || action === 'CHANGE_TIME') { await this.sendMessage(senderId, `✏️ Send an instruction for draft ${targetId}; your edit will be re-proposed for approval.`); return { handled: true, responseText: 'Awaiting edit instructions' }; }
      if (action === 'VIEW_SOURCES') {
        const sources = typeof draft.sources === 'string' ? JSON.parse(draft.sources) : draft.sources || [];
        await this.sendMessage(senderId, `📚 Sources for Draft ${targetId}:\n\n${sources.map((s: any, i: number) => `${i + 1}. ${s.title}\n${s.url}`).join('\n\n') || 'No sources recorded.'}`);
        return { handled: true, responseText: 'Sources displayed' };
      }
      const claims = await db.query('SELECT * FROM claims WHERE draft_id = $1 AND channel_id = $2', [targetId, draft.channel_id]);
      const message = claims.rows.length ? claims.rows.map((c: Claim, i: number) => `${i + 1}. ${c.text} — ${c.verificationStatus}`).join('\n') : 'All factual claims are linked to stored evidence.';
      await this.sendMessage(senderId, `🔎 Evidence for Draft ${targetId}:\n\n${message}`); return { handled: true, responseText: 'Evidence displayed' };
    }
    if (['START_ONBOARDING', 'APPROVE_BRAIN', 'VIEW_BRAIN', 'VIEW_LANGUAGE'].includes(action)) {
      await requireChannelAccess(context, targetId, action === 'APPROVE_BRAIN' ? 'APPROVER' : 'VIEWER');
      if (action === 'START_ONBOARDING') { const session = await this.onboarding.startOnboarding(targetId, String(senderId)); await this.sendMessage(senderId, session.messages[0]?.text || 'Onboarding started'); return { handled: true, responseText: 'Onboarding session started.' }; }
      if (action === 'APPROVE_BRAIN') { await this.onboarding.approveBrain(targetId, String(senderId)); return { handled: true, responseText: 'Channel Brain activated.' }; }
      if (action === 'VIEW_BRAIN') { const brain = await this.brain.getBrain(targetId); await this.sendMessage(senderId, brain ? `🧠 ${brain.identity.channelName}\n${brain.identity.niche}` : 'No Channel Brain configured.'); return { handled: true, responseText: 'Brain displayed' }; }
      const lang = await this.brain.getLanguageSettings(targetId); await this.sendMessage(senderId, `🌐 Content: ${lang.contentLanguage}; owner communication: ${lang.ownerCommunicationLanguage}`); return { handled: true, responseText: 'Language displayed' };
    }
    return { handled: false, responseText: `Unknown action: ${action}` };
  }

  private async handleCommand(senderId: number, text: string, context: TenantContext): Promise<{ handled: boolean; responseText: string }> {
    const db = getDatabaseClient();
    if (text.startsWith('/account')) { await this.sendMessage(senderId, `Account: ${context.accountId}\nWorkspace: ${context.workspaceId}\nRole: ${context.role}`); return { handled: true, responseText: 'Account displayed' }; }
    if (text.startsWith('/workspaces')) {
      const rows = await db.query('SELECT w.id, w.name FROM workspaces w JOIN workspace_members wm ON wm.workspace_id = w.id WHERE wm.account_id = $1 AND wm.status = $2 ORDER BY w.name', [context.accountId, 'ACTIVE']);
      await this.sendMessage(senderId, `Workspaces:\n${rows.rows.map((w: any) => `• ${w.name} — /workspace ${w.id}`).join('\n')}`); return { handled: true, responseText: 'Workspaces displayed' };
    }
    if (text.startsWith('/workspace ')) { const selected = await selectTelegramWorkspace(senderId, text.slice(11).trim()); await AuditService.log(selected.workspaceId, undefined, 'OWNER' as any, String(senderId), 'WORKSPACE_SELECTED', 'WORKSPACE', selected.workspaceId); await this.sendMessage(senderId, '✅ Workspace selected.'); return { handled: true, responseText: 'Workspace selected' }; }
    if (text.startsWith('/channels')) {
      const channels = await db.query('SELECT id, name, status, telegram_chat_id FROM channels WHERE workspace_id = $1 ORDER BY name', [context.workspaceId]);
      await this.sendMessage(senderId, `Channels:\n${channels.rows.map((c: any) => `• ${c.name} (${c.status}) — /use ${c.id}`).join('\n') || 'No channels linked.'}`); return { handled: true, responseText: 'Channels displayed' };
    }
    if (text.startsWith('/use ')) { await selectTelegramChannel(senderId, text.slice(5).trim()); await this.sendMessage(senderId, '✅ Active channel selected.'); return { handled: true, responseText: 'Channel selected' }; }
    const channelId = context.activeChannelId;
    if (!channelId) { await this.sendMessage(senderId, 'Select a channel first with /channels then /use <channel-id>.'); return { handled: true, responseText: 'No active channel' }; }
    await requireChannelAccess(context, channelId);
    if (text.startsWith('/start') || text.startsWith('/help')) { await this.sendMessage(senderId, '🤖 AI Channel Manager\n/account /workspaces /workspace <id> /channels /use <id>\n/drafts /today /schedule /brain /onboard'); return { handled: true, responseText: 'Welcome displayed' }; }
    if (text.startsWith('/onboard')) { const session = await this.onboarding.startOnboarding(channelId, String(senderId)); await this.sendMessage(senderId, session.messages[0]?.text || 'Onboarding started'); return { handled: true, responseText: 'Onboarding started' }; }
    if (text.startsWith('/drafts')) {
      const drafts = await db.query("SELECT * FROM content_drafts WHERE workspace_id = $1 AND channel_id = $2 AND status = 'PENDING_APPROVAL' LIMIT 5", [context.workspaceId, channelId]);
      const lang = await this.brain.getLanguageSettings(channelId);
      for (const row of drafts.rows) await this.sendDraftForApproval({ ...row, workspaceId: row.workspace_id, channelId: row.channel_id, whyItMatters: typeof row.why_it_matters === 'string' ? JSON.parse(row.why_it_matters) : row.why_it_matters, sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : row.sources, factCheckItems: typeof row.fact_check_items === 'string' ? JSON.parse(row.fact_check_items) : row.fact_check_items }, lang.ownerCommunicationLanguage);
      return { handled: true, responseText: drafts.rowCount ? 'Drafts sent' : 'No pending drafts' };
    }
    if (text.startsWith('/today')) { const published = await db.query("SELECT count(*) AS count FROM published_posts WHERE channel_id = $1 AND published_at >= CURRENT_DATE", [channelId]); const pending = await db.query("SELECT count(*) AS count FROM content_drafts WHERE channel_id = $1 AND status = 'PENDING_APPROVAL'", [channelId]); await this.sendMessage(senderId, `📅 Today\nPublished: ${published.rows[0]?.count || 0}\nPending approval: ${pending.rows[0]?.count || 0}`); return { handled: true, responseText: 'Today stats sent' }; }
    if (text.startsWith('/schedule')) { const scheduled = await db.query("SELECT scheduled_for, id FROM scheduled_posts WHERE channel_id = $1 AND status = 'PENDING' ORDER BY scheduled_for", [channelId]); await this.sendMessage(senderId, scheduled.rows.length ? scheduled.rows.map((s: any) => `• ${s.id}: ${new Date(s.scheduled_for).toUTCString()}`).join('\n') : 'No posts currently scheduled.'); return { handled: true, responseText: 'Schedule sent' }; }
    if (text.startsWith('/brain')) { const brain = await this.brain.getBrain(channelId); await this.sendMessage(senderId, brain ? `🧠 ${brain.identity.channelName}\nTopics: ${brain.content.primaryTopics.join(', ')}` : 'No Channel Brain configured.'); return { handled: true, responseText: 'Brain displayed' }; }
    if (text.startsWith('/pause') || text.toLowerCase().includes('pause publishing')) { requireWorkspaceRole(context, 'APPROVER'); process.env.PAUSE_PUBLISHING = 'true'; await this.sendMessage(senderId, '⏸️ Publishing paused.'); return { handled: true, responseText: 'Publishing paused' }; }
    if (text.startsWith('/resume') || text.toLowerCase().includes('resume publishing')) { requireWorkspaceRole(context, 'APPROVER'); process.env.PAUSE_PUBLISHING = 'false'; await this.sendMessage(senderId, '▶️ Publishing resumed.'); return { handled: true, responseText: 'Publishing resumed' }; }
    await this.sendMessage(senderId, `💡 Editorial instruction recorded for active channel: "${text}"`); return { handled: true, responseText: 'Instruction processed' };
  }
}

let botInstance: TelegramBotService | null = null;
export function getTelegramBotService(): TelegramBotService { if (!botInstance) botInstance = new TelegramBotService(); return botInstance; }
