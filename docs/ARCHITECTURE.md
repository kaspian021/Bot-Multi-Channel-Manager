# Architecture Specification — AI Multi-Channel Telegram Manager

## 1. Executive Summary

AI Channel Manager is an autonomous, multi-tenant, multi-channel editorial and Telegram publishing engine. The platform automates research discovery, claim extraction, duplicate filtering, factual scoring, AI draft generation, quality review, and scheduling, while maintaining human owner control via a Telegram-first approval interface and a web command center.

## 2. Core Architectural Principles

1. **AI-Assisted but Owner-Controlled**: The system operates with three strict permission tiers:
   - **GREEN (Autonomous)**: Research, source discovery, candidate scoring, deduplication, fact-checking, draft generation, quality gate checks, schedule optimization.
   - **YELLOW (Approval Required)**: Post publication, channel title/description updates, avatar generation, strategy modification.
   - **RED (Owner Only)**: Modifying owner identity, administrative access, credentials, permanent data deletion.
2. **Multi-Tenancy & Channel Isolation**: Every core entity (`Channel`, `ContentSource`, `ContentDraft`, `ScheduledPost`, `PublishedPost`) is explicitly scoped to a `WorkspaceId` and `ChannelId`. No data from Channel A may leak into Channel B.
3. **Pluggable & Resilient Provider Model**: AI providers (OpenAI, Google Gemini, Mock) and research connectors (Web, RSS, YouTube, Reddit) implement standardized interfaces with automated fallback to guarantee high availability.
4. **Idempotency & Safe Publishing**: The publishing engine relies on unique idempotency keys, state machine transition validation, and persisted Telegram message IDs to guarantee that retries never publish duplicate posts.

## 3. High-Level System Architecture Diagram

```
                +------------------------------------------------+
                |           Human Channel Owner                  |
                +-----------------------+------------------------+
                                        |
                 Telegram PM Approval   |   Web Command Center
                   & Quick Actions      |   (Next.js / Tailwind)
                                        |
                                        v
+------------------------------------------------------------------------+
|                              API LAYER                                 |
|  /api/health      /api/channels     /api/research      /api/drafts     |
|  /api/dashboard   /api/topics       /api/candidates    /api/publish    |
|  /api/sources     /api/prompts      /api/telegram      /api/audit      |
+-----------------------------------+------------------------------------+
                                    |
+-----------------------------------v------------------------------------+
|                         APPLICATION LAYER                              |
|  ResearchService       DraftService           PublishingService        |
|  CandidateService      ApprovalService        BrandService             |
|  FactCheckingService   QualityGateService     PromptTemplateManager    |
|  SchedulerService      AuditService           PermissionGuard          |
+-----------------------------------+------------------------------------+
                                    |
+-----------------------------------v------------------------------------+
|                       INFRASTRUCTURE LAYER                             |
|  +--------------------+  +-------------------+  +-------------------+  |
|  |   Database Client  |  |  AI Providers     |  | Source Connectors |  |
|  | - PostgreSQL (Ext) |  | - OpenAI (gpt-4o) |  | - Web Grounding   |  |
|  | - PGlite (Embedded)|  | - Gemini 1.5 Pro  |  | - arXiv RSS Feed  |  |
|  | - Migrations & Seed|  | - Resilient Mock  |  | - YouTube & Reddit|  |
|  +--------------------+  +-------------------+  +-------------------+  |
|  +------------------------------------------------------------------+  |
|  |   Telegram Bot Service (Webhook / Polling / Simulator Adapter)   |  |
|  |   Background Job Orchestrator & Worker Runner                    |  |
|  |   SSRF Safe Fetcher Guard (RFC 1918 & Cloud Metadata Filter)     |  |
+------------------------------------------------------------------------+
```

## 4. Domain State Machine

Content follows a validated deterministic state progression:

```
[DISCOVERED]
     │
     ▼
[QUALIFIED]
     │
     ▼
[FACT_CHECKED]
     │
     ▼
[DRAFTED]
     │
     ▼
[PENDING_APPROVAL] ───(Owner Rejects)───> [REJECTED]
     │
     ├───(Owner Edits with AI)───> [NEEDS_EDIT] ───> [DRAFTED]
     │
     ▼ (Owner Approves)
[APPROVED]
     │
     ├───(Publish Now)─────────┐
     │                         │
     ▼ (Keep / Set Time)       │
[SCHEDULED]                    │
     │                         │
     ▼ (Scheduler Dispatches)  │
[PUBLISHED] <──────────────────┘
     │
     ▼
[ARCHIVED]
```

## Phase 4: Multi-Tenant Account & Commercial Integration Seam

Phase 4 introduces `Account`, `TelegramIdentity`, `WorkspaceMember`, persistent Telegram context, generic product/plan/subscription/entitlement snapshots, idempotent usage/outbox records, and a plan-aware editorial worker. The external website is the authentication and commercial authority; this application resolves its external identity to membership before any customer-owned query. `EntitlementGuard` is an application-layer boundary, so APIs, Telegram, and workers share the same quota and expiry decisions.

The detailed model, webhook protocol, scheduling behavior, and demo contract are in [PHASE4.md](./PHASE4.md).

## 5. Security & Isolation

- **Telegram Numeric User ID Verification**: Numeric Telegram IDs are linked to accounts and workspace roles through one-time deep-link challenges. `TELEGRAM_OWNER_USER_ID` is demo-only compatibility fallback, never production authority.
- **SSRF Protection**: All URLs retrieved by connectors must pass protocol validation (HTTP/HTTPS only) and are blocked if pointing to `localhost`, loopbacks, RFC 1918 private subnets, or cloud metadata endpoints (`169.254.169.254`).
- **Emergency Pause Mode**: Setting `PAUSE_PUBLISHING=true` instantly freezes all outgoing broadcasts without interrupting autonomous background research.

## 6. Phase 2: Channel Brain & Multilingual Intelligence Architecture

### 6.1 Persistent Channel Brain (Channel DNA)
Each channel maintains an isolated, versioned Channel Brain with 10 structured sections:
1. **Identity**: Channel name, niche, sub-niches, positioning, UVP, goals.
2. **Audience Profile**: Target audience, expertise level, interests, pain points.
3. **Content Strategy**: Primary/secondary topics, exclusions, content mix percentages, technical depth, length boundaries.
4. **Voice & Style**: Tone, writing style, headline style, emoji/hashtag rules, CTAs, formatting guidelines.
5. **Source Preferences**: Preferred/excluded sources, trusted domains, source types, minimum quality threshold.
6. **Publishing Schedule**: Daily frequency, timezone, preferred publishing windows, weekend policy.
7. **Media Guidelines**: AI image prompts, aspect ratios, screenshot policy, caption language.
8. **Approval & Automation**: Permission boundaries (GREEN vs. YELLOW vs. RED).
9. **Business & Growth**: Growth objectives, monetization, sponsorships, disclosures.
10. **Restrictions**: Prohibited keywords, sensitive topics, competitor guidelines, copyright, embargo rules.

### 6.2 Conversational AI Onboarding Engine
- **Lifecycle**: New channels start in `ONBOARDING` state.
- **Natural Language Extraction**: The AI conducts an interactive interview, extracting niche, audience, tone, cadence, and language from free-form text.
- **Smart Questioning**: Only asks for missing parameters, skipping already answered fields.
- **Approval Gate**: Constructs a Channel Brain draft with a review summary. Human approval transitions the channel to `ACTIVE`.

### 6.3 Multilingual Channel Intelligence
- **Language Independence**: Channel post content language operates independently from owner communication language (e.g. Persian approval UI in Telegram while publishing posts in English).
- **Multilingual Source Ingestion**: Research engine ingests foreign sources (e.g., German, Japanese) and synthesizes them into the target channel content language.
- **Technical Term Preservation**: Concepts such as `CUDA`, `Transformer`, `PyTorch`, and `LLM` are protected from literal mistranslation.

### 6.4 Versioning & Preference Hierarchy
- **Version Snapshots**: Every Brain update saves an immutable snapshot in `channel_brain_versions` with change diffs, actor attribution, and rollback capability.
- **Preference Hierarchy**: Explicit owner rules (`EXPLICIT`) strictly override AI-inferred learning signals (`INFERRED`), preventing silent policy drifts.
- **Strategy Recommendations**: Autonomous AI suggestions (e.g. content mix shifts) require explicit owner approval (YELLOW tier) before applying.
