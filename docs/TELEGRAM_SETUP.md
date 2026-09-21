# Telegram Integration & Bot Operations Guide

## 1. Prerequisites

To connect a live Telegram Bot and Channel, you need:
1. A Telegram Bot Token from [@BotFather](https://t.me/BotFather).
2. Your personal Telegram Numeric User ID from [@userinfobot](https://t.me/userinfobot).
3. A public or private Telegram Channel where your bot is added as an **Administrator** with *Post Messages* permission.

## 2. Environment Configuration

Add the credentials to `.env`:

```bash
# Disable Demo Mode for production
DEMO_MODE=false

# Telegram Credentials
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_OWNER_USER_ID=987654321
TELEGRAM_MODE=webhook # or polling
APP_PUBLIC_URL=https://your-domain.com
WEBHOOK_SECRET=your-random-secret
```

## 3. Webhook Setup

When `TELEGRAM_MODE=webhook`, register your endpoint with Telegram:

```bash
curl -F "url=https://your-domain.com/api/telegram/webhook" \
     -F "secret_token=your-random-secret" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

## 4. Bot Commands Reference

| Command | Purpose |
|---|---|
| `/start` | Displays command center welcome and operational summary |
| `/status` | Returns channel counts, pending drafts, scheduled queue, and pause status |
| `/drafts` | Sends up to 5 pending content proposals to the owner with interactive buttons |
| `/today` | Intelligence briefing with today's published count and quotas |
| `/schedule` | Displays upcoming scheduled post broadcasts |
| `/sources` | Lists monitored sources and their current health status |
| `/channels` | Displays connected channels and their publishing permissions |
| `/brain` | Summary of Channel Brain identity, topics, and cadence |
| `/onboard` | Initiates interactive conversational onboarding |
| `/research` | Dispatches an immediate autonomous research discovery cycle |
| `/pause` | Halts automatic post publishing (sets `PAUSE_PUBLISHING=true`) |
| `/resume` | Resumes automatic post publishing (sets `PAUSE_PUBLISHING=false`) |

## 5. Proposal Action Buttons

When a draft is sent to the owner, the bot provides interactive inline buttons:

- `[✅ Approve]`: Transitions draft to `APPROVED` and prompts for scheduling choice (`Publish Now` or `Keep Time`).
- `[✏️ Edit]`: Prompts owner for natural-language instructions (e.g. *"Make it shorter"*).
- `[❌ Reject]`: Marks draft `REJECTED`, preventing publication.
- `[⏰ Change Time]`: Adjusts the scheduled publishing timestamp.
- `[🔎 Evidence]`: Inspects atomic factual claims, confidence scores, and cross-source verification status.
- `[📚 Sources]`: Displays full titles, source URLs, and trust tiers for provenance verification.

## 6. Telegram Channel Setup Wizard

Use the web wizard at `/telegram-setup` or API route `/api/telegram/verify`:
1. Enter your channel handle (e.g. `@futurestack_ai` or `-1001234567890`).
2. The wizard validates:
   - Bot administrator status via `getChatAdministrators`
   - `can_post_messages` and `can_edit_messages` permissions
   - Numeric Telegram user ID authorization (`TELEGRAM_OWNER_USER_ID`)
3. Send a safe test message to confirm live formatting and link generation.

## 7. Testing via Embedded Simulator & Production Mode

- **Demo Mode (`DEMO_MODE=true`)**: Works out of the box with zero external API credentials.
- **Production Mode (`DEMO_MODE=false`)**: Requires valid `TELEGRAM_BOT_TOKEN` and `TELEGRAM_OWNER_USER_ID`. Uses database-backed publishing locks (`publishing_locks`) with idempotency keys to guarantee at-most-once broadcast delivery.
- Navigate to `/telegram-bot` in the web panel to test conversational flows and inline approvals.

