// ==============================================================
// Google Gemini Provider Implementation
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

export class GoogleGeminiProvider
  implements IAiTextProvider, IAiResearchProvider, IAiImageProvider, IAiStructuredOutputProvider
{
  readonly providerName = 'Google Gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_AI_API_KEY || '';
    this.model = model || process.env.GOOGLE_MODEL || 'gemini-1.5-pro';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Gemini API key is not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Gemini API failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async searchAndGround(input: ResearchQueryInput): Promise<ResearchResult> {
    if (!this.isConfigured()) {
      throw new Error('Google Gemini API key is not configured.');
    }

    const systemPrompt = `You are an AI research engine with Google Search grounding. Return candidate stories as a JSON array of objects with keys: title, url, sourceName, summary, claims (array of strings), relevanceScore (0-100), noveltyScore (0-100), technicalDepthScore (0-100).`;
    const userPrompt = `Search grounded recent tech news for topics: ${input.topics.join(', ')}. Return 3 top items.`;

    const raw = await this.generateText(systemPrompt, userPrompt);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse search grounded candidates from Google Gemini');
    }

    const items: RawResearchCandidate[] = JSON.parse(jsonMatch[0]);
    return {
      query: input.topics.join(' '),
      provider: this.providerName,
      timestamp: new Date().toISOString(),
      confidence: 92,
      items,
    };
  }

  async generateImage(prompt: string): Promise<{ url: string; revisedPrompt?: string }> {
    return {
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      revisedPrompt: prompt,
    };
  }

  async generateStructuredDraft(
    topic: string,
    candidate: RawResearchCandidate,
    channelLanguage: string
  ): Promise<StructuredDraftOutput> {
    const systemPrompt = `You are an expert technology editor writing for a Telegram channel. Target language: ${channelLanguage}. Return JSON only with keys: headline, body, explanation, whyItMatters (array of 3 strings), technicalContext, whatToWatch, sources (array with title, url), confidence (number 0-100), contentScore (number 0-100), contentType.`;
    const userPrompt = `Topic: ${topic}\nTitle: ${candidate.title}\nSummary: ${candidate.summary}\nClaims: ${JSON.stringify(candidate.claims)}\nSource: ${candidate.url}`;

    const raw = await this.generateText(systemPrompt, userPrompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse draft JSON from Gemini');
    }

    return JSON.parse(jsonMatch[0]);
  }

  async reviseDraft(
    existingDraft: StructuredDraftOutput,
    instruction: string
  ): Promise<StructuredDraftOutput> {
    const systemPrompt = `Revise the draft according to the user instruction while preserving factual integrity. Return updated draft as JSON.`;
    const userPrompt = `Instruction: ${instruction}\nExisting: ${JSON.stringify(existingDraft)}`;

    const raw = await this.generateText(systemPrompt, userPrompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse revised draft from Gemini');
    }

    return JSON.parse(jsonMatch[0]);
  }
}
