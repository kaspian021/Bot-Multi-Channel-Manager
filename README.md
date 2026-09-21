# AI Multi-Channel Telegram Manager

[![Tests](https://img.shields.io/badge/Tests-101%20Passed-emerald.svg)]()
[![Acceptance](https://img.shields.io/badge/Acceptance%20Tests-75%2F75%20Passed-blue.svg)]()
[![Phase 3](https://img.shields.io/badge/Phase%203-Research%20Intelligence%20%2B%20Production%20Telegram-teal.svg)]()
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20%2F%20Multi--Tenant-purple.svg)]()
[![Demo Mode](https://img.shields.io/badge/Demo%20Mode-Ready-green.svg)]()

> **Production-Ready AI Multi-Channel Telegram Manager — Phases 1, 2 & 3**
> An autonomous, channel-aware, multilingual research intelligence and Telegram publishing engine equipped with Google Gemini search grounding, OpenAI fallback, SSRF-safe ingestion, Claim ↔ Evidence graph verification, story clustering, Channel Brain DNA, and production Telegram Bot integration.

---

## 1. Project Overview

**AI Channel Manager** operates like an expert human channel manager:
* **Research Intelligence Engine**: Real-time web search grounding via Google Gemini with automated circuit failover to OpenAI Responses API and failure audit logging.
* **Autonomous Research Planner**: Synthesizes Channel Brain topics, multilingual queries (`en`, `de`, `ja`, `ru`), 5 distinct query diversity categories, content mix ratios, and Temporary Directives.
* **Safe Ingestion & SSRF Defense**: URL fetcher enforcing private IP blocking (RFC 1918, link-local, AWS metadata), 5MB size caps, 15-second timeouts, and redirect controls.
* **Article & Content Extraction**: Cheerio-powered readability parser that strips boilerplate, navigation, ads, headers, and computes reading times.
* **Source Trust & Health State Machine**: 4-tier source model (Tier 1 Official Labs to Tier 4 Aggregators) with consecutive failure tracking (`HEALTHY` -> `DEGRADED` -> `FAILING` -> `DISABLED`).
* **Novelty Detection & Story Clustering**: Distinguishes `EXACT_DUPLICATE` from `SAME_STORY_NEW_INFORMATION` with entity-aware clustering and breaking news classification (`BREAKING`, `RECENT`, `CURRENT`, `EVERGREEN`).
* **First-Class Evidence & Claim Graph**: Deconstructs candidate drafts into atomic factual assertions, cross-verifying them against primary evidence items and flagging contradictions.
* **Production Telegram Bot Engine**: Live Bot API adapter validating administrator privileges (`can_post_messages`), numeric owner authorization, database-backed idempotency publishing locks, safe test connection messaging, and inline action buttons (`[✅ APPROVE]`, `[✏️ EDIT]`, `[❌ REJECT]`, `[⏰ CHANGE TIME]`, `[🔎 EVIDENCE]`, `[📚 SOURCES]`).
* **Channel Brain (Channel DNA)**: Persistent 10-section channel profile (identity, audience, content strategy, style, sources, publishing, media, approval, business, restrictions).
* **Conversational AI Onboarding**: Interactive Telegram/web interview with smart questioning that extracts channel attributes and requires human approval before channel activation.
* **Multilingual Intelligence**: Discovers sources across multiple languages (German, Japanese, English) and synthesizes them into target channel language with technical term protection (CUDA, Transformer, PyTorch).
* **Language Independence**: Separates owner communication language (e.g., Persian `fa` approval cards & buttons) from published channel language (e.g., English `en`).
* **Preferences & Edit Learning**: Strictly enforces explicit owner rules over AI-inferred learning signals; learns editorial conciseness and anti-hype policies from manual revisions.
* **Channel Brain Versioning & Rollback**: Immutable version snapshots on every change with diff tracking, actor attribution, and 1-click restore.
* **Strategy Recommendations**: Autonomous AI suggestions (e.g. content mix shifts) requiring owner approval (YELLOW permission tier).
* **Interactive Web Dashboard**: Complete web management panel with `/production` (Provider status & health), `/telegram-setup` (Connection wizard & permission test), `/evidence` (Evidence graph inspector), and `/telegram-bot` (Telegram Bot simulator).

---

## 2. Architecture Diagram

```
                 +-----------------------------------------------+
                 |              Human Channel Owner              |
                 +-----------------------+-----------------------+
                                         |
                Private Telegram Bot PM  |  Admin Web Dashboard
                   & Inline Actions      |  (Next.js / Tailwind)
                                         |
                                         v
+------------------------------------------------------------------------+
|                               API LAYER                                |
|  /api/health       /api/channels      /api/research      /api/drafts   |
|  /api/dashboard    /api/topics        /api/candidates    /api/publish  |
|  /api/sources      /api/prompts       /api/telegram      /api/audit    |
+------------------------------------+-----------------------------------+
                                     |
+------------------------------------v-----------------------------------+
|                            APPLICATION LAYER                           |
|  ResearchService       DraftService           PublishingService        |
|  CandidateService      ApprovalService        BrandService             |
|  FactCheckingService   QualityGateService     PromptTemplateManager    |
|  SchedulerService      AuditService           PermissionGuard          |
+------------------------------------+-----------------------------------+
                                     |
+------------------------------------v-----------------------------------+
|                         INFRASTRUCTURE LAYER                           |
|  Database Client:  PostgreSQL (external) / PGlite (embedded WASM)      |
|  AI Providers:     OpenAI (gpt-4o) / Google Gemini / Resilient Mock    |
|  Connectors:       Web Grounding / arXiv RSS / YouTube / Reddit        |
|  Telegram Adapter: Webhook / Polling / Interactive Simulator           |
|  Background Engine: Periodic Publishing Scheduler & Worker Runner      |
|  Security Guard:   SSRF URL Filter (RFC 1918 / Cloud Metadata Filter)  |
+------------------------------------------------------------------------+
```

---

## 3. Core Principles & Permission Boundaries (Section 3)

The system enforces three permission levels:

* **GREEN (Fully Autonomous)**:
  Source discovery, claim normalization, deduplication, candidate scoring, draft generation, quality reviews, schedule optimization, and job retries.
* **YELLOW (Owner Approval Required)**:
  Publishing posts, modifying channel name/description/avatar, changing posting frequency, approving sponsored posts.
* **RED (Owner Only)**:
  Modifying owner credentials, adding/removing admins, rotating bot tokens, deleting database records.

---

## 4. Quick Start (Demo Mode)

The MVP is runnable **out-of-the-box without requiring paid API keys** (`DEMO_MODE=true`).

### Prerequisites
* Node.js v20+ (tested on Node.js v22)
* npm v10+

### Step 1: Clone and Install
```bash
git clone https://github.com/kaspian021/Bot-Multi-Channel-Manager.git
cd Bot-Multi-Channel-Manager
npm install
```

### Step 2: Initialize Database & Seed Demo Data
```bash
npx tsx src/infrastructure/database/seed-runner.ts
```

### Step 3: Run Acceptance Tests (AT-01 to AT-20)
```bash
npm test
```
*Executes all 46 unit, integration, and end-to-end acceptance tests.*

### Step 4: Start Web Command Center & API Server
```bash
npm run dev
# Or production build:
npm run build && npm run start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 5. Docker Compose Deployment

Run the complete multi-container stack (Web, Worker, PostgreSQL, Redis) via Docker Compose:

```bash
# Start containers in background
docker compose up -d

# View container logs
docker compose logs -f

# Verify service health
docker compose ps
```

---

## 6. Real Telegram Bot & Channel Setup

To transition from DEMO_MODE to a live Telegram Bot and Channel:

1. **Obtain Bot Token**: Message [@BotFather](https://t.me/BotFather) on Telegram, create a bot, and copy the token.
2. **Find Your Numeric User ID**: Message [@userinfobot](https://t.me/userinfobot) to get your numeric ID (e.g. `987654321`).
3. **Configure Channel**:
   - Create your channel (e.g. `@futurestack_ai`).
   - Add your bot to the channel as an **Administrator** with *Post Messages* permission.
4. **Update `.env`**:
   ```bash
   DEMO_MODE=false
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
   TELEGRAM_OWNER_USER_ID=987654321
   TELEGRAM_MODE=webhook # or polling
   APP_PUBLIC_URL=https://your-public-domain.com
   WEBHOOK_SECRET=your_random_secret
   ```
5. **Register Webhook** (if using webhook mode):
   ```bash
   curl -F "url=https://your-public-domain.com/api/telegram/webhook" \
        -F "secret_token=your_random_secret" \
        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```

---

## 7. AI Provider Configuration

The application features a resilient provider bundle with automated failover:

```bash
# Primary AI Provider: openai | gemini | mock
AI_PROVIDER=openai
RESEARCH_PROVIDER=google
IMAGE_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-proj-your-openai-api-key
OPENAI_MODEL=gpt-4o

# Google Gemini (Supports Google Search Grounding)
GOOGLE_AI_API_KEY=AIzaSy-your-google-ai-key
GOOGLE_MODEL=gemini-1.5-pro
```

If the primary provider hits a rate limit or network timeout, the application automatically fails over to the secondary provider without failing the editorial job.

---

## 8. Environment Variables Reference

| Variable | Default | Purpose |
|---|---|---|
| `DEMO_MODE` | `true` | When true, exercises entire workflow using mock providers without external keys |
| `NODE_ENV` | `development` | Runtime mode (`development`, `production`, `test`) |
| `PORT` | `3000` | HTTP listen port |
| `APP_PUBLIC_URL` | `http://localhost:3000` | Base public URL for webhooks and asset previews |
| `DATABASE_CONNECTION_STRING` | *(empty)* | External PostgreSQL connection string. When empty, embedded PGlite is used |
| `REDIS_CONNECTION_STRING` | *(empty)* | Optional Redis URI for distributed lock caching |
| `TELEGRAM_BOT_TOKEN` | *(demo token)* | Telegram Bot API token |
| `TELEGRAM_OWNER_USER_ID` | `987654321` | Numeric ID of authorized channel owner |
| `TELEGRAM_MODE` | `polling` | `polling` or `webhook` |
| `PAUSE_PUBLISHING` | `false` | Emergency kill-switch: halts Telegram publishing while research continues |
| `RESEARCH_INTERVAL_HOURS` | `3` | Background research frequency |
| `DAILY_POST_TARGET` | `3` | Daily posts quota per channel |

---

## 9. Telegram Operations & Commands

The channel owner can control operations directly from Telegram:

| Command | Action |
|---|---|
| `/start` | Displays welcome overview and operational command center |
| `/status` | Returns channel health, pending drafts count, queue status, and pause mode |
| `/drafts` | Fetches pending proposals and sends interactive cards to the owner |
| `/research`| Triggers an on-demand AI research discovery run |
| `/pause` | Pauses scheduled broadcasts (emergency halt) |
| `/resume` | Resumes normal publication queue |

### Inline Buttons Workflow
1. When a post is ready, the owner receives a private message with buttons:
   `[✅ Approve]` `[✏️ Edit]` `[❌ Reject]` `[⏰ Change Time]` `[🔎 Sources]`
2. Clicking **Approve** presents:
   `[🚀 Publish now]` `[🕐 Keep 20:30]` `[⏰ Choose another time]`
3. Clicking **Edit** allows typing instructions (`"Make it shorter"`, `"Focus on the benchmarks"`). The AI revises the draft while maintaining factual integrity and resubmits for approval.

---

## 10. Automated Tests & Acceptance Verification

Run the test suite:
```bash
# Run all 46 tests
npm test

# Run acceptance tests specifically (AT-01 to AT-20)
npm run test:acceptance
```

All 20 formal Acceptance Tests are verified:
- **AT-01 to AT-04**: Environment, migrations, demo seeding, health check.
- **AT-05 to AT-08**: Multi-source research, deduplication, structured drafting, source attachment.
- **AT-09 to AT-13**: Approval flow, scheduling, publishing simulation, message ID recording.
- **AT-14 to AT-17**: Publishing idempotency, rejection handling, unauthorized caller rejection, emergency pause mode.
- **AT-18 to AT-20**: Dashboard state reflection, audit logging, and 100% test passing.

---

## 11. Documentation Links

- [System Architecture](docs/ARCHITECTURE.md)
- [MVP Verification & Scope](docs/MVP.md)
- [Product Roadmap (Phases 1-5)](docs/ROADMAP.md)
- [Security & SSRF Safeguards](docs/SECURITY.md)
- [AI Providers & Failover](docs/AI_PROVIDERS.md)
- [Telegram Setup Guide](docs/TELEGRAM_SETUP.md)
- [Research Discovery Engine](docs/RESEARCH_ENGINE.md)

---

## 12. License & Author

Developed by the AI Channel Manager Team. Licensed under the MIT License.
