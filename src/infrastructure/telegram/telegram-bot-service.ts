// ==============================================================
// Telegram Bot Service & Adapter — Extended with Phase 2
// ==============================================================

import { ContentDraft, DraftStatus } from '../../domain/types';
import { formatTelegramPost, buildApprovalNotificationText } from '../../domain/telegram-format';
import { getDatabaseClient } from '../database/db-client';
import { OnboardingService } from '../../application/services/onboarding-service';
import { ChannelBrainService } from '../../application/services/channel-brain-service';

export interface TelegramInlineButton {
  text: string;
  callback_data: string;
}

export interface TelegramOutgoingMessage {
  id: number;
  chatId: string | number;
  text: string;
  replyMarkup?: {
    inline_keyboard: TelegramInlineButton[][];
  };
  sentAt: string;
  photoUrl?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; is_bot: boolean; first_name: string; username?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; is_bot: boolean; first_name: string; username?: string };
    message?: { message_id: number; chat: { id: number } };
    data: string;
  };
}

// In-memory message store for simulation & review
const simulatedMessages: TelegramOutgoingMessage[] = [];
let nextMessageId = 1000;

export class TelegramBotService {
  private botToken: string;
  private ownerUserId: number;
  private isDemoMode: boolean;
  private onboardingService = new OnboardingService();
  private brainService = new ChannelBrainService();

  constructor(token?: string, ownerId?: number | string, demoMode?: boolean) {
    this.botToken = token || process.env.TELEGRAM_BOT_TOKEN || '';
    this.ownerUserId = parseInt(String(ownerId || process.env.TELEGRAM_OWNER_USER_ID || '987654321'), 10);
    this.isDemoMode = demoMode ?? (process.env.DEMO_MODE === 'true' || !this.botToken || this.botToken.startsWith('demo_'));
  }

  isConfigured(): boolean {
    return Boolean(this.botToken && !this.botToken.startsWith('demo_'));
  }

  getSimulatedMessages(): TelegramOutgoingMessage[] {
    return [...simulatedMessages].reverse();
  }

  clearSimulatedMessages(): void {
    simulatedMessages.length = 0;
  }

  /**
   * Verifies that the sender is the configured owner (Section 9)
   */
  isAuthorizedOwner(userId: number): boolean {
    return userId === this.ownerUserId;
  }

  /**
   * Formats draft notification and buttons according to owner communication language (Section 4 & 21)
   */
  formatDraftNotification(draft: ContentDraft, ownerLanguage = 'en'): { text: string; inlineKeyboard: TelegramInlineButton[][] } {
    const text = buildApprovalNotificationText(draft, ownerLanguage);

    const isFa = ownerLanguage === 'fa';
    const inlineKeyboard: TelegramInlineButton[][] = [
      [
        { text: isFa ? '✅ تأیید (Approve)' : '✅ Approve', callback_data: `APPROVE_DRAFT:${draft.id}` },
        { text: isFa ? '✏️ ویرایش (Edit)' : '✏️ Edit', callback_data: `EDIT_DRAFT:${draft.id}` },
        { text: isFa ? '❌ رد (Reject)' : '❌ Reject', callback_data: `REJECT_DRAFT:${draft.id}` },
      ],
      [
        { text: isFa ? '⏰ تغییر زمان' : '⏰ Change Time', callback_data: `CHANGE_TIME:${draft.id}` },
        { text: isFa ? '🔎 منابع (Sources)' : '🔎 Sources', callback_data: `VIEW_SOURCES:${draft.id}` },
        { text: isFa ? '🧠 هوش کانال' : '🧠 Channel Brain', callback_data: `VIEW_BRAIN:${draft.channelId}` },
      ],
    ];

    return { text, inlineKeyboard };
  }

  /**
   * Sends draft proposal to owner with interactive action buttons (Section 4, 21, 24)
   */
  async sendDraftForApproval(draft: ContentDraft, ownerLanguage = 'en'): Promise<TelegramOutgoingMessage> {
    const { text, inlineKeyboard } = this.formatDraftNotification(draft, ownerLanguage);
    return this.sendMessage(this.ownerUserId, text, inlineKeyboard);
  }

  /**
   * Sends prompt asking owner for publishing choice after APPROVE (Section 4)
   */
  async sendPublishChoicePrompt(draftId: string, suggestedTime: string, ownerLanguage = 'en'): Promise<TelegramOutgoingMessage> {
    const isFa = ownerLanguage === 'fa';
    const text = isFa
      ? `✅ *پیش‌نویس تأیید شد.*\n\n*زمان پیشنهادی انتشار:* ${suggestedTime}\n\nآیا مایلید هم‌اکنون منتشر شود یا در زمان پیشنهادی زمان‌بندی گردد؟`
      : `✅ *Draft Approved.*\n\n*Suggested time:* ${suggestedTime}\n\nWould you like to publish now or keep the scheduled time?`;

    const inlineKeyboard: TelegramInlineButton[][] = [
      [
        { text: isFa ? '🚀 انتشار هم‌اکنون' : '🚀 Publish now', callback_data: `PUBLISH_NOW:${draftId}` },
        { text: isFa ? `🕐 زمان‌بندی (${suggestedTime})` : `🕐 Keep ${suggestedTime}`, callback_data: `KEEP_TIME:${draftId}` },
      ],
      [
        { text: isFa ? '⏰ انتخاب زمان دیگر' : '⏰ Choose another time', callback_data: `CHANGE_TIME:${draftId}` },
      ],
    ];

    return this.sendMessage(this.ownerUserId, text, inlineKeyboard);
  }

  /**
   * Publishes post directly to Telegram channel (Section 19)
   */
  async publishToChannel(channelChatId: string, draft: ContentDraft): Promise<{ messageId: number; success: boolean }> {
    const postText = formatTelegramPost(draft);
    const msg = await this.sendMessage(channelChatId, postText);
    return {
      messageId: msg.id,
      success: true,
    };
  }

  /**
   * Sends generic Telegram message (via real Telegram Bot API or mock simulation)
   */
  async sendMessage(
    chatId: string | number,
    text: string,
    inlineKeyboard?: TelegramInlineButton[][],
    photoUrl?: string
  ): Promise<TelegramOutgoingMessage> {
    const messageRecord: TelegramOutgoingMessage = {
      id: nextMessageId++,
      chatId,
      text,
      replyMarkup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
      sentAt: new Date().toISOString(),
      photoUrl,
    };

    simulatedMessages.push(messageRecord);

    if (this.isConfigured() && !this.isDemoMode) {
      try {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
          }),
        });
      } catch (err) {
        console.warn('Real Telegram sendMessage call failed, falling back to recorded message:', err);
      }
    }

    return messageRecord;
  }

  /**
   * Handles incoming Telegram webhook update or simulated owner action (Section 9, 22, 26)
   */
  async handleUpdate(update: TelegramUpdate): Promise<{ handled: boolean; responseText: string }> {
    const db = getDatabaseClient();

    // 1. Handle Callback Queries (Button clicks)
    if (update.callback_query) {
      const cb = update.callback_query;
      const senderId = cb.from.id;

      if (!this.isAuthorizedOwner(senderId)) {
        await this.sendMessage(senderId, '⚠️ Unauthorized: Only the verified channel owner can perform this action.');
        return { handled: true, responseText: 'Unauthorized Telegram user' };
      }

      const [action, targetId] = cb.data.split(':');

      switch (action) {
        case 'START_ONBOARDING': {
          const channelId = targetId || 'ch-futurestack-001';
          const session = await this.onboardingService.startOnboarding(channelId, String(senderId));
          const firstMsg = session.messages[0]?.text || 'Welcome to onboarding!';
          await this.sendMessage(senderId, firstMsg);
          return { handled: true, responseText: 'Onboarding session started.' };
        }

        case 'APPROVE_BRAIN': {
          const channelId = targetId || 'ch-futurestack-001';
          const brain = await this.onboardingService.approveBrain(channelId, String(senderId));
          const msg =
`✅ *CHANNEL BRAIN ACTIVATED!*

Channel **${brain.identity.channelName}** is now ACTIVE!
• Brain Version: v${brain.version}
• Publishing: ${brain.publishing.postingFrequency} posts/day
• Target Language: ${brain.media.mediaTextLanguage.toUpperCase()}
• Owner Language: Persian

The autonomous research and publishing engine has started!`;

          await this.sendMessage(senderId, msg);
          return { handled: true, responseText: `Channel Brain for ${channelId} activated.` };
        }

        case 'VIEW_BRAIN': {
          const channelId = targetId || 'ch-futurestack-001';
          const brain = await this.brainService.getBrain(channelId);
          if (!brain) {
            await this.sendMessage(senderId, '🧠 Channel Brain not configured yet. Start onboarding via /onboard.');
            return { handled: true, responseText: 'Brain not found' };
          }
          const text =
`🧠 *CHANNEL BRAIN SUMMARY (v${brain.version})*

*Niche:* ${brain.identity.niche}
*Audience:* ${brain.audience.targetAudience}
*Frequency:* ${brain.publishing.postingFrequency} posts/day
*Primary Topics:* ${brain.content.primaryTopics.join(', ')}
*Tone:* ${brain.style.tone}
*Status:* ${brain.status}`;
          await this.sendMessage(senderId, text);
          return { handled: true, responseText: 'Brain displayed' };
        }

        case 'VIEW_LANGUAGE': {
          const channelId = targetId || 'ch-futurestack-001';
          const lang = await this.brainService.getLanguageSettings(channelId);
          const text =
`🌐 *CHANNEL LANGUAGE CONFIGURATION*
• Content Language: ${lang.contentLanguage.toUpperCase()}
• Owner Communication: ${lang.ownerCommunicationLanguage.toUpperCase()} (Persian)
• Research Languages: ${lang.allowedSourceLanguages.map((l) => l.toUpperCase()).join(', ')}
• Preserve Technical Terms: ${lang.preserveTechnicalTerms ? 'Yes' : 'No'}`;
          await this.sendMessage(senderId, text);
          return { handled: true, responseText: 'Language displayed' };
        }

        case 'APPROVE_DRAFT': {
          const draftRes = await db.query('SELECT * FROM content_drafts WHERE id = $1', [targetId]);
          if (draftRes.rowCount === 0) {
            return { handled: true, responseText: 'Draft not found.' };
          }
          const draft = draftRes.rows[0];
          await db.query(
            "UPDATE content_drafts SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [targetId]
          );

          await db.query(
            `INSERT INTO audit_logs (id, workspace_id, channel_id, actor_type, actor_id, action, entity_type, entity_id, metadata)
             VALUES ($1, $2, $3, 'OWNER', $4, 'DRAFT_APPROVED', 'DRAFT', $5, $6)`,
            [`audit-${Date.now()}`, draft.workspace_id, draft.channel_id, String(senderId), targetId, JSON.stringify({ via: 'telegram_button' })]
          );

          const langSettings = await this.brainService.getLanguageSettings(draft.channel_id);
          await this.sendPublishChoicePrompt(targetId, draft.suggested_publish_time || '20:30 UTC', langSettings.ownerCommunicationLanguage);
          return { handled: true, responseText: `Draft ${targetId} approved.` };
        }

        case 'PUBLISH_NOW': {
          const draftRes = await db.query('SELECT * FROM content_drafts WHERE id = $1', [targetId]);
          if (draftRes.rowCount === 0) return { handled: true, responseText: 'Draft not found' };
          const draft = draftRes.rows[0];

          if (process.env.PAUSE_PUBLISHING === 'true') {
            await this.sendMessage(this.ownerUserId, '⏸️ Cannot publish: Channel publishing is currently paused (PAUSE_PUBLISHING=true).');
            return { handled: true, responseText: 'Publishing paused' };
          }

          const channelRes = await db.query('SELECT * FROM channels WHERE id = $1', [draft.channel_id]);
          const channel = channelRes.rows[0];

          const formattedDraft: ContentDraft = {
            ...draft,
            sources: typeof draft.sources === 'string' ? JSON.parse(draft.sources) : draft.sources,
            whyItMatters: typeof draft.why_it_matters === 'string' ? JSON.parse(draft.why_it_matters) : draft.why_it_matters,
            factCheckItems: typeof draft.fact_check_items === 'string' ? JSON.parse(draft.fact_check_items) : draft.fact_check_items,
          };

          const pub = await this.publishToChannel(channel.telegram_chat_id || '@futurestack_ai', formattedDraft);

          await db.query("UPDATE content_drafts SET status = 'PUBLISHED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [targetId]);
          await db.query(
            `INSERT INTO published_posts (id, workspace_id, channel_id, draft_id, telegram_message_id, telegram_chat_id, published_text)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [`pub-${Date.now()}`, draft.workspace_id, draft.channel_id, targetId, pub.messageId, channel.telegram_chat_id || '@futurestack_ai', formatTelegramPost(formattedDraft)]
          );

          await db.query(
            `INSERT INTO audit_logs (id, workspace_id, channel_id, actor_type, actor_id, action, entity_type, entity_id, metadata)
             VALUES ($1, $2, $3, 'OWNER', $4, 'POST_PUBLISHED', 'DRAFT', $5, $6)`,
            [`audit-${Date.now()}`, draft.workspace_id, draft.channel_id, String(senderId), targetId, JSON.stringify({ telegramMessageId: pub.messageId })]
          );

          await this.sendMessage(this.ownerUserId, `🚀 *Post successfully published to ${channel.name}!* (Message ID: #${pub.messageId})`);
          return { handled: true, responseText: 'Published now.' };
        }

        case 'KEEP_TIME': {
          const draftRes = await db.query('SELECT * FROM content_drafts WHERE id = $1', [targetId]);
          if (draftRes.rowCount === 0) return { handled: true, responseText: 'Draft not found' };
          const draft = draftRes.rows[0];

          const scheduledFor = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
          await db.query("UPDATE content_drafts SET status = 'SCHEDULED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [targetId]);
          await db.query(
            `INSERT INTO scheduled_posts (id, workspace_id, channel_id, draft_id, scheduled_for, status, idempotency_key)
             VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
             ON CONFLICT (idempotency_key) DO NOTHING`,
            [`sched-${Date.now()}`, draft.workspace_id, draft.channel_id, targetId, scheduledFor, `idemp-${targetId}`]
          );

          await db.query(
            `INSERT INTO audit_logs (id, workspace_id, channel_id, actor_type, actor_id, action, entity_type, entity_id, metadata)
             VALUES ($1, $2, $3, 'OWNER', $4, 'POST_SCHEDULED', 'DRAFT', $5, $6)`,
            [`audit-${Date.now()}`, draft.workspace_id, draft.channel_id, String(senderId), targetId, JSON.stringify({ scheduledFor })]
          );

          await this.sendMessage(this.ownerUserId, `⏰ *Post scheduled for ${draft.suggested_publish_time || '20:30 UTC'}*`);
          return { handled: true, responseText: 'Scheduled at suggested time.' };
        }

        case 'REJECT_DRAFT': {
          await db.query("UPDATE content_drafts SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [targetId]);
          await db.query(
            `INSERT INTO audit_logs (id, workspace_id, channel_id, actor_type, actor_id, action, entity_type, entity_id, metadata)
             VALUES ($1, $2, $3, 'OWNER', $4, 'DRAFT_REJECTED', 'DRAFT', $5, $6)`,
            [`audit-${Date.now()}`, 'ws-demo-001', 'ch-futurestack-001', String(senderId), targetId, JSON.stringify({ via: 'telegram_button' })]
          );

          await this.sendMessage(this.ownerUserId, `❌ *Draft rejected.* It will not be published.`);
          return { handled: true, responseText: 'Draft rejected.' };
        }

        case 'VIEW_SOURCES': {
          const draftRes = await db.query('SELECT sources FROM content_drafts WHERE id = $1', [targetId]);
          const sources = typeof draftRes.rows[0]?.sources === 'string' ? JSON.parse(draftRes.rows[0].sources) : draftRes.rows[0]?.sources || [];
          const text = sources.map((s: any, idx: number) => `${idx + 1}. *${s.title}*\n${s.url}`).join('\n\n') || 'No sources recorded.';
          await this.sendMessage(this.ownerUserId, `🔎 *Sources for Draft ${targetId}:*\n\n${text}`);
          return { handled: true, responseText: 'Sources displayed' };
        }

        case 'EDIT_DRAFT': {
          await this.sendMessage(this.ownerUserId, `✏️ *What would you like to change in Draft ${targetId}?*\n\nReply with your instruction, e.g.:\n- "Make it shorter"\n- "Make it more technical"\n- "Change headline to: ..."`);
          return { handled: true, responseText: 'Awaiting edit instructions' };
        }

        default:
          return { handled: false, responseText: `Unknown action: ${action}` };
      }
    }

    // 2. Handle Text Messages / Commands
    if (update.message && update.message.text) {
      const msg = update.message;
      const text = (msg.text || '').trim();
      const senderId = msg.from.id;

      if (!this.isAuthorizedOwner(senderId)) {
        await this.sendMessage(senderId, '⚠️ Unauthorized: Access restricted to authorized channel owner.');
        return { handled: true, responseText: 'Unauthorized' };
      }

      // Check if active onboarding session exists for current channel
      const targetChannelId = 'ch-futurestack-001';
      const activeSession = await this.onboardingService.getActiveSession(targetChannelId);

      // Onboarding explicit trigger
      if (text.startsWith('/onboard')) {
        const session = await this.onboardingService.startOnboarding(targetChannelId, String(senderId));
        await this.sendMessage(senderId, session.messages[0].text);
        return { handled: true, responseText: 'Onboarding started' };
      }

      // If active onboarding session is awaiting input and user didn't type a slash command:
      if (activeSession && activeSession.status === 'IN_PROGRESS' && !text.startsWith('/')) {
        const result = await this.onboardingService.processUserMessage(targetChannelId, String(senderId), text);
        const buttons = result.isReadyForApproval
          ? [
              [
                { text: '✅ Approve Channel Brain', callback_data: `APPROVE_BRAIN:${targetChannelId}` },
                { text: '✏️ Edit', callback_data: `EDIT_BRAIN:${targetChannelId}` },
              ],
            ]
          : undefined;

        await this.sendMessage(senderId, result.replyText, buttons);
        return { handled: true, responseText: 'Onboarding response processed' };
      }

      // Standard Command Router
      if (text.startsWith('/start') || text.startsWith('/help')) {
        const welcome =
`🤖 *AI Channel Manager — Command Center*

Available commands:
/status - Channel and system health status
/drafts - View pending drafts awaiting approval
/onboard - Begin conversational AI Channel Brain onboarding
/brain - View current Channel Brain configuration
/channels - Manage channel configuration
/settings - View current posting & scoring policies
/research - Trigger on-demand AI research run
/pause - Pause all scheduled publishing
/resume - Resume scheduled publishing

Or type natural commands like: "Find me today's best AI news"`;

        const buttons: TelegramInlineButton[][] = [
          [
            { text: '🚀 Start Onboarding', callback_data: `START_ONBOARDING:${targetChannelId}` },
            { text: '🧠 View Channel Brain', callback_data: `VIEW_BRAIN:${targetChannelId}` },
          ],
        ];

        await this.sendMessage(senderId, welcome, buttons);
        return { handled: true, responseText: 'Welcome displayed' };
      }

      if (text.startsWith('/brain')) {
        const brain = await this.brainService.getBrain(targetChannelId);
        if (!brain) {
          await this.sendMessage(senderId, '🧠 No Channel Brain configured yet. Run /onboard to start setup.');
          return { handled: true, responseText: 'Brain not configured' };
        }
        const bText =
`🧠 *CHANNEL BRAIN OVERVIEW (v${brain.version})*
• Status: ${brain.status}
• Niche: ${brain.identity.niche}
• Target Audience: ${brain.audience.targetAudience}
• Frequency: ${brain.publishing.postingFrequency} posts/day
• Style: ${brain.style.tone}`;
        await this.sendMessage(senderId, bText);
        return { handled: true, responseText: 'Brain info sent' };
      }

      if (text.startsWith('/status')) {
        const channels = await db.query('SELECT count(*) as cnt FROM channels WHERE status = \'ACTIVE\'');
        const pending = await db.query("SELECT count(*) as cnt FROM content_drafts WHERE status = 'PENDING_APPROVAL'");
        const scheduled = await db.query("SELECT count(*) as cnt FROM scheduled_posts WHERE status = 'PENDING'");
        const statusText =
`📊 *Channel Status Overview*
• Active Channels: ${channels.rows[0]?.cnt || 1}
• Pending Approvals: ${pending.rows[0]?.cnt || 0}
• Scheduled Posts: ${scheduled.rows[0]?.cnt || 0}
• Publishing: ${process.env.PAUSE_PUBLISHING === 'true' ? '⏸️ PAUSED' : '▶️ ACTIVE'}
• Mode: ${process.env.DEMO_MODE === 'true' ? '🧪 DEMO MODE' : '🚀 PRODUCTION'}`;
        await this.sendMessage(senderId, statusText);
        return { handled: true, responseText: 'Status sent' };
      }

      if (text.startsWith('/drafts')) {
        const drafts = await db.query("SELECT * FROM content_drafts WHERE status = 'PENDING_APPROVAL' LIMIT 5");
        if (drafts.rowCount === 0) {
          await this.sendMessage(senderId, '✨ No drafts currently pending approval.');
          return { handled: true, responseText: 'No pending drafts' };
        }

        const lang = await this.brainService.getLanguageSettings(targetChannelId);
        for (const row of drafts.rows) {
          const formatted: ContentDraft = {
            ...row,
            sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : row.sources,
            whyItMatters: typeof row.why_it_matters === 'string' ? JSON.parse(row.why_it_matters) : row.why_it_matters,
            factCheckItems: typeof row.fact_check_items === 'string' ? JSON.parse(row.fact_check_items) : row.fact_check_items,
          };
          await this.sendDraftForApproval(formatted, lang.ownerCommunicationLanguage);
        }
        return { handled: true, responseText: 'Drafts sent' };
      }

      if (text.startsWith('/pause')) {
        process.env.PAUSE_PUBLISHING = 'true';
        await this.sendMessage(senderId, '⏸️ *Publishing paused.* Autonomous research will continue, but no post will be published.');
        return { handled: true, responseText: 'Publishing paused' };
      }

      if (text.startsWith('/resume')) {
        process.env.PAUSE_PUBLISHING = 'false';
        await this.sendMessage(senderId, '▶️ *Publishing resumed.* Scheduled posts will proceed.');
        return { handled: true, responseText: 'Publishing resumed' };
      }

      // Natural language edit or query fallback (Section 67)
      await this.sendMessage(
        senderId,
        `💡 Received instruction: "${text}". Interpreted as editorial feedback. Reviewing active drafts.`
      );
      return { handled: true, responseText: 'Instruction processed' };
    }

    return { handled: false, responseText: 'No message/callback' };
  }
}

let botInstance: TelegramBotService | null = null;

export function getTelegramBotService(): TelegramBotService {
  if (!botInstance) {
    botInstance = new TelegramBotService();
  }
  return botInstance;
}
