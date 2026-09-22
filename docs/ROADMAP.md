# Product Roadmap — AI Channel Manager

This roadmap details the progressive evolution from the current MVP to an enterprise multi-channel publishing ecosystem.

## Phase 0: MVP Delivery (Completed)
- Clean Architecture (Domain, Application, Infrastructure, Web/API).
- PostgreSQL database with automatic migrations and seed data.
- Pluggable AI provider abstraction (OpenAI, Gemini, Resilient Mock).
- Pluggable source connectors (Web, RSS, YouTube, Reddit).
- SSRF security protection and three permission levels (GREEN, YELLOW, RED).
- Telegram-first approval workflow with interactive button callbacks.
- Natural-language edit revision engine.
- Idempotent scheduling and publishing engine with emergency pause.
- Admin Web Panel with embedded Telegram Simulator.
- Complete automated acceptance test suite (AT-01 to AT-20).

## Phase 1: Production Telegram Hardening & Webhook TLS
- Telegram Webhook mutual TLS verification.
- Telegram Bot inline querying support.
- Channel subscriber growth snapshots and view counter scraping.
- Multi-admin support per channel with granular roles (Viewer, Editor, Approver).

## Phase 2: Multi-Platform Publishing Expansion
- Discord Server Webhook and Bot integration.
- X (Twitter) thread publishing connector.
- LinkedIn organization page updates.
- Ghost / WordPress blog cross-posting adapter.
- Substack / Beehiiv newsletter digest generation.

## Phase 3: Advertising & Sponsorship Marketplace (Section 55)
- Advertiser self-service Telegram bot interface.
- Automated rate-card calculation based on channel view metrics.
- Stripe / crypto payment processing hooks.
- Sponsored content policy checker with owner approval gate.
- Sponsor post expiration and performance reporting.

## Phase 4: Multi-Tenant Autonomous Editorial & Entitlement Operations (Completed)
- External account identity, workspace memberships, secure Telegram deep-link account binding, and workspace/channel selection.
- Generic product, plan, subscription, entitlement, usage-event, outbox, and signed integration webhook contracts.
- Central entitlement enforcement, atomic daily metering, generation safety floor, and publish-time expiry checks.
- Daily editorial plans, explainable stored-data trend signals, persisted owner-learning signals, and owner-approved strategy recommendations.
- Fair multi-channel orchestration with per-channel runtime locking and separate research/generation cadence.

## Future: Commercial source-of-truth connection
- Connect a DigiStore-compatible account/billing website through the existing `/api/integrations/v1` contract.
- Payment methods, invoices, tax, checkout, and recurring payment processing remain intentionally outside this repository.
- Future SSO/SAML and enterprise billing UI remain future work.
