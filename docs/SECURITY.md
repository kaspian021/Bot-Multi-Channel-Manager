# Security Architecture & Safeguards — AI Channel Manager

## 1. Permission Tier Enforcement (Section 3)

The system implements a rigid permission boundary model:

```
[GREEN: Autonomous]
├── Web / RSS / Social source polling
├── Duplicate detection & token hashing
├── Candidate classification & scoring
├── Structured draft generation
└── Automated quality gate review

[YELLOW: Owner Approval Required]
├── Disagree / reject candidate
├── Publishing any post to Telegram channel
├── Modifying channel title, bio, or description
├── Changing channel avatar / branding
└── Adjusting posting schedule

[RED: Owner Only]
├── Updating owner Telegram user ID
├── Adding or removing channel administrators
├── Rotating AI provider API keys or Bot tokens
├── Permanent data deletion
└── Modifying payment or subscription configurations
```

The `PermissionGuard` actively intercepts operations and throws a `PermissionViolationError` if an autonomous worker or unverified actor attempts a YELLOW or RED action.

## 2. Telegram Identity Verification (Phase 4)

- **Numeric User ID vs. Usernames**: Telegram usernames are snapshots only. A verified `telegram_identities.telegram_user_id` is bound to an external account through a one-time, short-lived opaque deep-link challenge. `TELEGRAM_OWNER_USER_ID` survives only as a `DEMO_MODE` simulator fallback; it is not production authorization.
- **Tenant callback integrity**: Callback resource IDs are not authorization. Every callback loads the draft/channel, resolves the sender's linked account and active workspace membership, verifies the required role, then checks the legal state transition.
- **Link challenge safety**: Tokens are random, SHA-256 hashed at rest, atomic single-use, TTL-limited, audited, and cannot silently reassign an existing Telegram identity.

## 2.1 Integration webhook verification

Subscription lifecycle webhooks verify raw-body HMAC-SHA256 signatures using a configured shared secret, a timestamp replay window, constant-time comparison, and a durable event-id uniqueness record. Missing verification fails closed and never trusts a client-provided subscription status.

## 3. SSRF Protection (Section 47)

External feeds and candidate URLs fetched by the research engine are guarded by `validateUrlSafety()`:
- **Protocol Allowlist**: Restricts requests to `http:` and `https:`. File schemes (`file://`), FTP, gopher, and unix sockets are rejected.
- **Loopback & Localhost Filter**: Blocks `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, `*.local`.
- **Cloud Metadata Guard**: Explicitly blocks `169.254.169.254` (AWS, GCP, Azure metadata services) and `169.254.0.0/16`.
- **Private Subnet Filter**: Blocks RFC 1918 IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- **Resource Constraints**: Maximum response size capped at 2MB with 8-second request timeouts to prevent memory exhaustion and slow-loris attacks.

## 4. Idempotency & Publishing Safety (Section 35 & 36)

- Posts published to Telegram use a deterministic `idempotency_key` (`idemp-{draftId}`).
- If a network partition occurs, the publishing service inspects `published_posts` for existing records before sending any new Telegram message.
- If `PAUSE_PUBLISHING=true` is set, outgoing broadcasts are rejected with an audit log record while research discovery continues safely.

## 5. Audit Trail & Logging (Section 7 & 34)

- Every mutation creates an un-editable `audit_logs` record containing `actor_type`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata`, and timestamp.
- Secrets, API keys, and Telegram bot tokens are never logged to console or persisted in database tables.
