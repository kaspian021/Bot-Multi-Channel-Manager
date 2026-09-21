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

## 2. Telegram Identity Verification (Section 45)

- **Numeric User ID vs. Usernames**: Telegram usernames can be changed or impersonated. All owner authorization checks validate the numeric `from.id` against the configured `TELEGRAM_OWNER_USER_ID`.
- **Callback Data Integrity**: Action callbacks (`APPROVE_DRAFT`, `PUBLISH_NOW`, `REJECT_DRAFT`) re-verify the sender's identity, the draft's existence, and the legal state transitions before executing any change.

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
