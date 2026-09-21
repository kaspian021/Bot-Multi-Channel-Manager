# Research Discovery Engine & Editorial Pipeline

## 1. Overview

The Research Engine autonomously monitors technology sources, extracts high-signal factual claims, evaluates candidate relevance, prevents duplicate stories, and prepares draft proposals for owner approval.

## 2. Pipeline Stages

```
1. Topic Taxonomy Query Generation
   └── Reads active channel topics (AI Models, Open Source AI, Robotics, etc.)
2. Multi-Source Discovery
   ├── Web Search & Grounding (Gemini / OpenAI)
   ├── Technical RSS Feeds (arXiv cs.AI)
   ├── YouTube Engineering Channels
   └── Reddit Tech Communities (r/LocalLLaMA)
3. Normalization & Provenance Tracking
   └── Cleans tracking parameters (utm_*, ref, fbclid) and saves canonical URLs
4. Duplicate Detection (Section 16)
   ├── Exact Normalized URL Matching
   ├── Jaccard Token Title Similarity (Threshold: 0.70)
   └── Atomic Claim Overlap Analysis
5. Candidate Scoring Engine (Section 15)
   └── Weighted formula: Relevance(0.20) + Novelty(0.15) + SourceQuality(0.15) +
       TechnicalDepth(0.10) + AudienceValue(0.15) + Timeliness(0.15) +
       Originality(0.05) + Confidence(0.05)
6. Fact-Checking & Claims Verification (Section 17)
   └── Atomic claim extraction and cross-referencing against primary sources
7. AI Draft Generation (Section 18-20)
   └── Generates structured post adhering to Telegram formatting guidelines
8. Automated Quality Gate (Section 32)
   └── Checks character length (400-1200 chars), factuality, grammar, and bans hype words
9. Owner Proposal Dispatch (Section 4 & 24)
   └── Dispatches notification with inline buttons to Telegram owner
```

## 3. Style & Tone Standards

- **Target Persona**: High-quality human technology editor.
- **Tone**: Expert, clear, concise, technically credible, non-corporate.
- **Forbidden Clickbait Phrases**: "mind-blowing", "revolutionary breakthrough", "this changes everything", "game-changing revolution".
- **Telegram Formatting (Section 19)**:
  ```
  ⚡ HEADLINE

  Concise explanation.

  Why it matters:
  • point 1
  • point 2
  • point 3

  Technical context:
  Technical explanation without unnecessary jargon.

  What to watch:
  Forward-looking developments.

  Source:
  https://example.com/source
  ```

---

## 4. Phase 3: Research Intelligence & Evidence Verification

### 4.1 Resilient Provider Architecture
- **Primary Search Grounding**: Google Gemini with Google Search Grounding for real-time web retrieval.
- **Secondary Search Grounding**: OpenAI Web Search via Responses API tooling.
- **Failover Logic**: Automatic failover upon rate limits (HTTP 429), timeouts, or provider downtime, with transparent logging to `provider_failure_logs`.

### 4.2 Research Planner & 5 Query Classes
The autonomous Research Planner synthesizes channel topics, content mix quotas, and temporary owner directives into 5 query classes:
1. `BREAKING_NEWS`: High-urgency developments, zero-day vulnerabilities, major keynote announcements.
2. `OFFICIAL_SOURCE`: Whitepapers, technical documentation, benchmark releases from primary lab domains.
3. `RESEARCH_PAPERS`: arXiv preprint releases, algorithmic optimizations, architecture ablation studies.
4. `OPEN_SOURCE_RELEASES`: GitHub releases, Hugging Face weights, local inference implementations.
5. `COMMUNITY_SIGNALS`: Subreddit discussions (e.g. `r/LocalLLaMA`), technical video walkthroughs.

### 4.3 Safe Web Ingestion & HTML Extraction
- **SSRF Protection**: Strict host and IP validation blocking private CIDR ranges, AWS metadata endpoints, and non-HTTP schemes.
- **Limits**: 5 MB payload limit, 15-second timeout, maximum 3-5 redirect hops.
- **DOM Parsing**: Cheerio-powered readability engine strips navigation, ads, cookie banners, headers, and footer noise, isolating readable text paragraphs and computing reading times.

### 4.4 Source Trust Model & Health Monitoring
- **Tier 1 (Official / Labs)**: Primary researchers, model weights publishers, peer-reviewed arXiv preprints.
- **Tier 2 (Reputable Tech Media)**: Established technical journalism and industry publications.
- **Tier 3 (Community / Social Signals)**: Reddit discussions, YouTube talks, community benchmarks.
- **Tier 4 (Unverified Aggregators)**: Secondary blogs and social commentary.
- **Health Transitions**: Track consecutive failure counts: `HEALTHY` (0-2 failures) → `DEGRADED` (3-4 failures) → `FAILING` (5+ failures) → `DISABLED`.

### 4.5 Story Clustering & Novelty Detection
- `EXACT_DUPLICATE`: Same canonical URL or >= 70% semantic title similarity without novel data.
- `SAME_STORY_NEW_INFORMATION`: Shared core story entities (e.g. "DeepSeek-V3") with new benchmark scores, weight releases, or post-launch evaluations.
- `DISTINCT_STORY`: Independent developments, clustered by entity slugs into unified candidates.

### 4.6 Claim ↔ Evidence Verification Graph
- Extracts atomic factual propositions from candidate drafts.
- Validates assertions against multiple primary evidence items.
- Identifies conflicting statements or negated claims (`CONTRADICTED`), flagging fidelity violations before publication.
