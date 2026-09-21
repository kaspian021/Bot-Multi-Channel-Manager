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

## Phase 4: Advanced Editorial AI & Multi-Agent Consensus
- Multi-agent debate: AI Critic vs. AI Writer before owner submission.
- Real-time fact-checking against Wikidata and arXiv semantic search.
- Adaptive posting schedule learning based on follower engagement curves.
- Automated A/B headline performance testing.

## Phase 5: Multi-Tenant SaaS Commercialization (Section 56)
- Workspace billing tiers: Starter, Pro, Agency.
- Organization SSO (SAML / OAuth2).
- Usage metering for AI tokens and source polling frequency.
- White-label custom Telegram bot tokens per tenant.
