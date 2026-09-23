# Phase 4 — Multi-Tenant Autonomous Editorial & Entitlement Architecture

## Boundary

AI Channel Manager owns workspace operations, channel brains, research, drafts, approval, publishing, learning, and durable operational history. A future DigiStore-compatible account service owns login, commercial subscription truth, lifecycle notifications, and payment processing. This repository deliberately implements **no checkout, invoices, card storage, Stripe, ZarinPal, crypto payment, or DigiStore website**.

## Identity and authorization

`accounts` holds an external provider/user reference. `workspace_members` is authoritative for `OWNER`, `ADMIN`, `EDITOR`, `APPROVER`, and `VIEWER` authorization; `workspaces.owner_user_id` remains only as legacy compatibility data.

A request is resolved once to `TenantContext` and channel/draft guards verify that resource IDs belong to the selected workspace. Production does not infer a tenant from an ID or from a global Telegram owner. Unsigned external identity/account headers are rejected: a trusted product-to-product caller must authenticate the assertion with the signed integration contract; missing production identity fails closed.

Telegram linking creates a cryptographically random opaque token, persists only a SHA-256 hash, uses a short TTL, atomically consumes it, and refuses reassignment of an already-linked numeric Telegram ID. `/account`, `/workspaces`, `/workspace <id>`, `/channels`, and `/use <channel-id>` maintain a persistent Telegram user context.

## Entitlement and subscription semantics

The generic product contract is `Product → Plan → Subscription → Entitlement snapshot`. `MockEntitlementProvider` reads local versioned snapshots; `RemoteEntitlementProvider` is optional. The cache has a short TTL and drops positive cache entries on provider failure. Premium work fails closed when entitlement cannot be safely resolved.

| Status | Operational behavior |
|---|---|
| `TRIALING`, `ACTIVE`, `GRACE` | Allowed according to snapshot feature flags and limits |
| `PAST_DUE` | Denied unless an explicit future policy issues a grace entitlement |
| `SUSPENDED`, `EXPIRED` | Premium generation, scheduling, and publication denied |
| `CANCELLED` | Allowed only until `validUntil` / current period end |

Upgrades apply as a new active entitlement immediately. Downgrades with a future `effectiveAt` are retained and applied by the worker at the period boundary. Subscription events and outbox events are idempotent and audited.

## Quotas, usage, and publish safety

`EntitlementGuard` protects channel creation, research, generation, AI edits, scheduling, strategy planning, and publish. Immutable usage events are deduplicated with idempotency keys; daily counters use atomic upserts. `CONTENT_GENERATION` and `AI_REQUEST` are independent metrics.

AI quota is **charged on a reserved attempt**, not only on a successful provider response. Reservation events carry `RESERVED`, `SUCCESSFUL`, `FAILED`, or `REJECTED` state in metadata. Retrying the same operation idempotency key reuses its original reservation and cannot double-charge or create unlimited new reservations; a new operation key is a new attempt.

Generation has a non-bypassable platform floor and database-atomic slot reservation before any AI call:

```text
effective interval = max(entitlement.generationIntervalSeconds,
                         PLATFORM_MIN_GENERATION_INTERVAL_SECONDS)
```

`tryAcquireGenerationSlot` conditionally updates the channel runtime row. Only one concurrent worker, API request, or Telegram command can claim a channel slot; the loser receives `GENERATION_INTERVAL_BLOCKED` before usage quota is reserved. A failed provider call keeps its attempt-charged reservation and slot, preventing retry storms.

Research cadence (`researchIntervalSeconds`) is separate. At due publish time `PublishingService` resolves entitlement again. Failed entitlement marks the scheduled post `BLOCKED_ENTITLEMENT` and produces `SCHEDULE_BLOCKED_ENTITLEMENT`; it stays blocked after reactivation to avoid a catch-up burst.

## Editorial intelligence

`EditorialPlanningService` creates one plan per active channel/date from stored Channel Brain content mix, recent drafts/posts, explicit and inferred owner preferences, stored candidates, directives, source data, and explainable trend signals. It records owner learning on approval, edit, and rejection. Explicit `owner_preferences` remain higher precedence than inferred signals. Strategy recommendations are persisted as `PENDING` and require existing owner approval flows; recommendations never alter a brain themselves.

No performance metric is invented: `channel_performance_daily.available=false` denotes unavailable analytics until Telegram/imported/demo data exists.

## Integrations v1

The versioned contract is documented in the README and exposed at:

- `GET /api/integrations/v1/entitlements/{externalUserId}`
- `POST /api/integrations/v1/usage`
- `POST /api/integrations/v1/link/verify`
- `POST /api/integrations/v1/webhooks/subscription`

Every `/api/integrations/v1` route is service-to-service only. It requires `X-Integration-Key`, `X-Integration-Timestamp`, `X-Integration-Signature`, and `X-Integration-Request-Id`, with HMAC-SHA256 over `${timestamp}.${method}.${path}.${rawBody}`. The application uses constant-time comparison, a five-minute timestamp window, and durable request-ID replay protection; subscription events add durable event-ID idempotency. Set `INTEGRATION_AUTH_KEY` and `INTEGRATION_REQUEST_SECRET`. An integration key never authenticates a human browser, and an `externalUserId` is only a lookup key after the machine caller is authenticated.

## Worker and demo

The worker iterates all active channels fairly in a rotating bounded order, refreshes research only when research is due, builds plans, and uses a database runtime lock before generating a single selected candidate. It never relies on `LIMIT 1` channel selection.

`DEMO_MODE=true` creates isolated fixtures: one demo account, linked Telegram identity, workspace, two channels, active subscription/entitlement, and usage. Demo-only fixture IDs never participate in production routing. Mock AI output and synthetic research fixtures are available only in this explicit mode; production uses configured providers/source fetches or fails closed rather than manufacturing evidence or drafts.

Run `npm run verify:phase4-demo` locally after seeding to execute a deterministic stored research candidate → generated draft → Telegram approval → scheduled publish flow. It then expires the entitlement before a second due post, verifies `BLOCKED_ENTITLEMENT`, restores the entitlement, and confirms the blocked item is not published as catch-up. The JSON result includes usage and audit evidence.

## PostgreSQL concurrency verification

The normal test suite verifies PGlite behavior. To run the same transaction rollback, atomic outbox claim, concurrent channel quota, and atomic generation-slot suite against an external PostgreSQL instance, set `DATABASE_CONNECTION_STRING=postgresql://…` and run:

```bash
npm run test:postgres:phase4
```

This command rejects a missing/non-PostgreSQL connection string rather than claiming external verification. **PGlite verification: passed. External PostgreSQL verification: not run in this repository sandbox.**
