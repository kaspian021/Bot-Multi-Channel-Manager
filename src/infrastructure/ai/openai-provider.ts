// ==============================================================
// OpenAI Provider Implementation
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

export class OpenAiProvider
  implements IAiTextProvider, IAiResearchProvider, IAiImageProvider, IAiStructuredOutputProvider
{
  readonly providerName = 'OpenAI';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model || process.env.OPENAI_MODEL || 'gpt-4o';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured.');
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async searchAndGround(input: ResearchQueryInput): Promise<ResearchResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured.');
    }

    const systemPrompt = `You are a research intelligence engine. Research topics: ${input.topics.join(', ')}. Return candidate stories strictly as JSON array of objects with keys: title, url, sourceName, summary, claims (array of strings), relevanceScore (0-100), noveltyScore (0-100), technicalDepthScore (0-100). Do not invent false benchmarks.`;
    const userPrompt = `Search query: ${input.topics.join(' ')}. Channel name: ${input.channelName}. Return 3 high-quality candidates.`;

    const raw = await this.generateText(systemPrompt, userPrompt);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse structured research candidates from OpenAI');
    }

    const items: RawResearchCandidate[] = JSON.parse(jsonMatch[0]);
    return {
      query: input.topics.join(' '),
      provider: this.providerName,
      timestamp: new Date().toISOString(),
      confidence: 90,
      items,
    };
  }

  async generateImage(prompt: string): Promise<{ url: string; revisedPrompt?: string }> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured.');
    }

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI Image generation failed: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      url: data.data?.[0]?.url,
      revisedPrompt: data.data?.[0]?.revised_prompt,
    };
  }

  async generateStructuredDraft(
    topic: string,
    candidate: RawResearchCandidate,
    channelLanguage: string
  ): Promise<StructuredDraftOutput> {
    const systemPrompt = `You are an expert technology editor writing for a Telegram channel. Target language: ${channelLanguage}. Return JSON only with keys: headline, body, explanation, whyItMatters (array of 3 strings), technicalContext, whatToWatch, sources (array with title, url), confidence (number 0-100), contentScore (number 0-100), contentType. Avoid hype phrases.`;
    const userPrompt = `Topic: ${topic}\nCandidate title: ${candidate.title}\nSummary: ${candidate.summary}\nClaims: ${JSON.stringify(candidate.claims)}\nSource: ${candidate.url}`;

    const raw = await this.generateText(systemPrompt, userPrompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse structured draft JSON from OpenAI');
    }

    return JSON.parse(jsonMatch[0]);
  }

  async reviseDraft(
    existingDraft: StructuredDraftOutput,
    instruction: string
  ): Promise<StructuredDraftOutput> {
    const systemPrompt = `You are a precise technical editor. Revise the provided draft according to the user instruction. Return the complete updated draft strictly as JSON with all original keys preserved.`;
    const userPrompt = `Instruction: ${instruction}\nExisting Draft: ${JSON.stringify(existingDraft)}`;

    const raw = await this.generateText(systemPrompt, userPrompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse revised draft JSON from OpenAI');
    }

    return JSON.parse(jsonMatch[0]);
  }
}
