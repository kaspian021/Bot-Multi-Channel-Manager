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
