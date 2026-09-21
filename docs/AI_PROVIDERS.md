# AI Provider Architecture & Integration Guide

## 1. Provider Abstractions

AI interactions are decoupled from vendors via domain interfaces in `src/application/interfaces/ai-providers.ts`:

- `IAiTextProvider`: General text and analysis completion.
- `IAiResearchProvider`: Search and grounded candidate discovery.
- `IAiImageProvider`: Visual asset and banner concept generation.
- `IAiStructuredOutputProvider`: Schema-enforced draft generation and natural-language revisions.

## 2. Supported AI Providers

### A. OpenAI
- **Text & Structured Models**: `gpt-4o`, `gpt-4o-mini`, `o1`.
- **Image Generation**: `dall-e-3`.
- **Environment Keys**:
  ```bash
  AI_PROVIDER=openai
  OPENAI_API_KEY=sk-proj-...
  OPENAI_MODEL=gpt-4o
  ```

### B. Google Gemini
- **Text & Grounding Models**: `gemini-1.5-pro`, `gemini-1.5-flash`.
- **Grounding**: Native Google Search grounding support.
- **Environment Keys**:
  ```bash
  RESEARCH_PROVIDER=gemini
  GOOGLE_AI_API_KEY=AIzaSy...
  GOOGLE_MODEL=gemini-1.5-pro
  ```

### C. Resilient Mock Provider (DEMO_MODE)
- Active whenever `DEMO_MODE=true` or when external API keys are omitted.
- Generates realistic, high-signal, non-hallucinatory English technology posts adhering to formatting rules.
- Guarantees 100% test pass rates and zero external network dependencies during development.

## 3. Provider Failover Mechanism (Section 62)

The `ResilientAiProvider` encapsulates automatic failover:
1. Calls Primary Provider (`AI_PROVIDER`, default `openai`).
2. On failure or rate-limit (HTTP 429), automatically reroutes to Fallback Provider (`gemini`).
3. If both external providers fail, falls back to the local Mock Provider to prevent service interruption, tagging the draft with a review notice.
