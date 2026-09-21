// ==============================================================
// Telegram Post Formatter — Extended with Multilingual Owner PMs
// ==============================================================

import { ContentDraft, ContentType } from './types';

export function getEmojiForContentType(type: ContentType): string {
  switch (type) {
    case ContentType.MODEL_RELEASE:
      return '🧠';
    case ContentType.TOOL_ANNOUNCEMENT:
      return '🛠️';
    case ContentType.RESEARCH_PAPER:
      return '📄';
    case ContentType.TUTORIAL:
      return '💡';
    case ContentType.PRODUCT_LAUNCH:
      return '🚀';
    case ContentType.OPEN_SOURCE:
      return '📦';
    case ContentType.NEWS:
    default:
      return '⚡';
  }
}

/**
 * Formats a ContentDraft into a Telegram post compliant with Section 19.
 */
export function formatTelegramPost(draft: ContentDraft): string {
  const emoji = getEmojiForContentType(draft.contentType);
  const headline = `${emoji} *${escapeMarkdown(draft.headline || draft.title)}*`;

  const parts: string[] = [headline];

  if (draft.explanation) {
    parts.push(escapeMarkdown(draft.explanation));
  } else if (draft.body) {
    parts.push(escapeMarkdown(draft.body));
  }

  if (draft.whyItMatters && draft.whyItMatters.length > 0) {
    const points = draft.whyItMatters
      .map((p) => `• ${escapeMarkdown(p)}`)
      .join('\n');
    parts.push(`*Why it matters:*\n${points}`);
  }

  if (draft.technicalContext) {
    parts.push(`*Technical context:*\n${escapeMarkdown(draft.technicalContext)}`);
  }

  if (draft.whatToWatch) {
    parts.push(`*What to watch:*\n${escapeMarkdown(draft.whatToWatch)}`);
  }

  if (draft.sources && draft.sources.length > 0) {
    if (draft.sources.length === 1) {
      const src = draft.sources[0];
      parts.push(`*Source:*\n[${escapeMarkdown(src.title || 'Link')}](${src.url})`);
    } else {
      const srcList = draft.sources
        .map((s) => `• [${escapeMarkdown(s.title || 'Source')}](${s.url})`)
        .join('\n');
      parts.push(`*Sources:*\n${srcList}`);
    }
  }

  const result = parts.join('\n\n');

  // Telegram message character limit safety check
  if (result.length > 4000) {
    return result.slice(0, 3950) + '\n\n... [Read full sources above]';
  }

  return result;
}

/**
 * Escapes characters for Telegram legacy Markdown safety.
 */
export function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/[_`\\]/g, '\\$&');
}

/**
 * Builds the Telegram approval notification message sent to owner (Section 4, 21, 24).
 * If ownerLanguage is 'fa' (Persian), provides Persian context header while preserving English draft.
 */
export function buildApprovalNotificationText(draft: ContentDraft, ownerLanguage = 'en'): string {
  const sourcesText =
    draft.sources && draft.sources.length > 0
      ? draft.sources.map((s, idx) => `${idx + 1}. ${s.title} (${s.url})`).join('\n')
      : 'None';

  const preview = formatTelegramPost(draft);

  if (ownerLanguage === 'fa') {
    return (
`📢 *پیشنهاد محتوای جدید (NEW CONTENT PROPOSAL)*

*موضوع (Topic):* ${draft.topic}
*نوع محتوا:* ${draft.contentType}
*امتیاز کیفیت:* ${draft.contentScore}/100
*اطمینان هوش مصنوعی:* ${draft.confidenceScore >= 80 ? 'بالا (High)' : 'نیازمند بررسی'} (${draft.confidenceScore}%)
*زمان پیشنهادی انتشار:* ${draft.suggestedPublishTime}

*منابع تأیید شده (Sources):*
${sourcesText}

*پیش‌نویس نهایی پست (Draft):*
------------------------------------
${preview}
------------------------------------`
    );
  }

  return (
`📢 *NEW CONTENT PROPOSAL*

*Topic:* ${draft.topic}
*Content Type:* ${draft.contentType}
*Content Score:* ${draft.contentScore}/100
*Confidence:* ${draft.confidenceScore >= 80 ? 'High' : draft.confidenceScore >= 60 ? 'Medium' : 'Needs Review'} (${draft.confidenceScore}%)
*Suggested publish time:* ${draft.suggestedPublishTime}

*Sources:*
${sourcesText}

*Proposed Post:*
------------------------------------
${preview}
------------------------------------`
  );
}
