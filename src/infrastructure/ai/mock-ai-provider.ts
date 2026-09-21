// ==============================================================
// Mock AI Provider — Section 8 DEMO_MODE Implementation
// ==============================================================

import {
  IAiTextProvider,
  IAiResearchProvider,
  IAiImageProvider,
  IAiStructuredOutputProvider,
  ResearchQueryInput,
  ResearchResult,
  RawResearchCandidate,
  StructuredDraftOutput,
} from '../../application/interfaces/ai-providers';

export class MockAiProvider
  implements IAiTextProvider, IAiResearchProvider, IAiImageProvider, IAiStructuredOutputProvider
{
  readonly providerName = 'MockAiProvider (Demo Mode)';

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    return (
      'FutureStack AI Editorial Analysis: Research evaluated successfully. ' +
      'System adhering to expert, non-clickbait, technically verified standards.'
    );
  }

  async searchAndGround(input: ResearchQueryInput): Promise<ResearchResult> {
    const topic = input.topics[0] || 'AI Models';
    const timestamp = new Date().toISOString();

    const sampleItems: RawResearchCandidate[] = [
      {
        title: `Meta FAIR introduces open weights for multimodal reasoning framework (${topic})`,
        url: 'https://ai.meta.com/research/publications/multimodal-reasoning-2026',
        sourceName: 'Meta AI Research',
        publishedAt: timestamp,
        summary: `Researchers at Meta FAIR published an open-weights architecture capable of interleaved reasoning across visual, textual, and symbolic data streams without dedicated auxiliary encoders.`,
        claims: [
          'Unified decoder processes native visual tokens alongside text',
          'Eliminates separate CLIP-style projection bottlenecks',
          'Weights released under permissive academic and commercial license',
        ],
        relevanceScore: 92,
        noveltyScore: 89,
        technicalDepthScore: 94,
      },
      {
        title: `NVIDIA TensorRT-LLM 0.12 adds dynamic speculative decoding for low-latency serving`,
        url: 'https://developer.nvidia.com/blog/tensorrt-llm-speculative-decoding-update',
        sourceName: 'NVIDIA Developer Blog',
        publishedAt: timestamp,
        summary: `NVIDIA announced an optimized kernel suite for TensorRT-LLM that dynamically switches between draft-model speculation and medusa-style multi-head prediction depending on GPU batch occupancy.`,
        claims: [
          'Delivers up to 3.1x lower latency on Blackwell and Hopper architectures',
          'Dynamic draft switching avoids wasted FLOPs at high concurrency',
          'Supported natively in vLLM and Triton Inference Server',
        ],
        relevanceScore: 95,
        noveltyScore: 91,
        technicalDepthScore: 96,
      },
      {
        title: `Open-source Rust compiler for WebAssembly AI kernels achieves near-native SIMD speed`,
        url: 'https://github.com/rust-lang/rust-wasm-ai-simd',
        sourceName: 'GitHub Engineering',
        publishedAt: timestamp,
        summary: `A collaborative community project released an experimental WebAssembly backend enabling 128-bit SIMD matrix multiplication in browser and edge workers with negligible overhead compared to native C++.`,
        claims: [
          'Achieves 94% of native FP16 matrix multiplication speeds in Chromium V8',
          'Zero external C/C++ dependencies; pure Rust implementation',
          'Enables zero-install local LLM inference in client browsers',
        ],
        relevanceScore: 87,
        noveltyScore: 88,
        technicalDepthScore: 90,
      },
    ];

    return {
      query: input.topics.join(' OR '),
      provider: this.providerName,
      timestamp,
      confidence: 94,
      items: sampleItems,
    };
  }

  async generateImage(prompt: string): Promise<{ url: string; revisedPrompt?: string }> {
    return {
      url: `https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80`,
      revisedPrompt: `Minimalist technology illustration: ${prompt}`,
    };
  }

  async generateStructuredDraft(
    topic: string,
    candidate: RawResearchCandidate,
    channelLanguage: string
  ): Promise<StructuredDraftOutput> {
    return {
      headline: candidate.title,
      body: candidate.summary,
      explanation: candidate.summary,
      whyItMatters: [
        'Directly addresses high-throughput serving costs for production workloads',
        'Demonstrates practical open-source advances in distributed inference',
        'Enables developer self-hosting without enterprise vendor lock-in',
      ],
      technicalContext: `The implementation eliminates memory translation bottlenecks by operating directly within the unified memory space, achieving significant latency gains.`,
      whatToWatch: `Watch for upstream PRs landing in mainstream inference runtimes over the coming weeks.`,
      sources: [
        {
          title: candidate.sourceName,
          url: candidate.url,
          publisher: candidate.sourceName,
        },
      ],
      confidence: 92,
      contentScore: 90,
      contentType: 'MODEL_RELEASE',
      topics: [topic],
      extractedClaims: candidate.claims,
      mediaPrompt: `Architectural blueprint of distributed inference GPU pipeline, cybernetic blue and obsidian theme`,
      suggestedPublishTime: 'Today, 20:30 UTC',
    };
  }

  async reviseDraft(
    existingDraft: StructuredDraftOutput,
    instruction: string
  ): Promise<StructuredDraftOutput> {
    const isShorter = instruction.toLowerCase().includes('short');
    const isMoreTechnical = instruction.toLowerCase().includes('technical');

    let revisedExplanation = existingDraft.explanation;
    if (isShorter) {
      revisedExplanation = existingDraft.explanation.split('. ')[0] + '.';
    } else if (isMoreTechnical) {
      revisedExplanation = `${existingDraft.explanation} Specifically benchmarks kernel execution across warp schedulers with minimal register pressure.`;
    } else {
      revisedExplanation = `[Revised per instruction: "${instruction}"] ${existingDraft.explanation}`;
    }

    return {
      ...existingDraft,
      explanation: revisedExplanation,
      body: revisedExplanation,
      whyItMatters: isShorter ? existingDraft.whyItMatters.slice(0, 2) : existingDraft.whyItMatters,
      confidence: Math.max(80, existingDraft.confidence),
      contentScore: Math.min(98, existingDraft.contentScore + 2),
    };
  }
}
