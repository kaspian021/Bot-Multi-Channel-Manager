// ==============================================================
// AI Provider Factory & Resilient Failover — Section 62 Specification
// ==============================================================

import {
  IAiTextProvider,
  IAiResearchProvider,
  IAiImageProvider,
  IAiStructuredOutputProvider,
} from '../../application/interfaces/ai-providers';
import { MockAiProvider } from './mock-ai-provider';
import { OpenAiProvider } from './openai-provider';
import { GoogleGeminiProvider } from './gemini-provider';

export interface AiProviderBundle
  extends IAiTextProvider,
    IAiResearchProvider,
    IAiImageProvider,
    IAiStructuredOutputProvider {}

export class ResilientAiProvider implements AiProviderBundle {
  readonly providerName: string;
  private primary: AiProviderBundle;
  private fallback: AiProviderBundle;
  private mock: MockAiProvider;
  private isDemoMode: boolean;

  constructor(
    primaryProviderName?: string,
    fallbackProviderName?: string,
    demoMode?: boolean
  ) {
    this.isDemoMode = demoMode ?? (process.env.DEMO_MODE === 'true');
    this.mock = new MockAiProvider();

    const resolveProvider = (name?: string): AiProviderBundle => {
      const n = (name || '').toLowerCase();
      if (n === 'gemini' || n === 'google') {
        const gem = new GoogleGeminiProvider();
        return gem.isConfigured() ? gem : this.mock;
      }
      if (n === 'openai') {
        const oai = new OpenAiProvider();
        return oai.isConfigured() ? oai : this.mock;
      }
      return this.mock;
    };

    const primaryName = primaryProviderName || process.env.AI_PROVIDER || 'openai';
    const fallbackName = fallbackProviderName || 'gemini';

    this.primary = this.isDemoMode ? this.mock : resolveProvider(primaryName);
    this.fallback = this.isDemoMode ? this.mock : resolveProvider(fallbackName);
    this.providerName = `ResilientAiProvider [Primary: ${this.primary.providerName}, Fallback: ${this.fallback.providerName}]`;
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.isDemoMode) return this.mock.generateText(systemPrompt, userPrompt);
    try {
      return await this.primary.generateText(systemPrompt, userPrompt);
    } catch (err) {
      console.warn(`Primary AI text provider failed, failing over to fallback:`, err);
      try {
        return await this.fallback.generateText(systemPrompt, userPrompt);
      } catch (fErr) {
        console.warn(`Fallback AI text provider failed, falling back to mock provider:`, fErr);
        return this.mock.generateText(systemPrompt, userPrompt);
      }
    }
  }

  async searchAndGround(input: any): Promise<any> {
    if (this.isDemoMode) return this.mock.searchAndGround(input);
    try {
      return await this.primary.searchAndGround(input);
    } catch (err) {
      console.warn(`Primary AI research provider failed, failing over to fallback:`, err);
      try {
        return await this.fallback.searchAndGround(input);
      } catch (fErr) {
        console.warn(`Fallback AI research provider failed, falling back to mock:`, fErr);
        return this.mock.searchAndGround(input);
      }
    }
  }

  async generateImage(prompt: string): Promise<{ url: string; revisedPrompt?: string }> {
    if (this.isDemoMode) return this.mock.generateImage(prompt);
    try {
      return await this.primary.generateImage(prompt);
    } catch (err) {
      return this.mock.generateImage(prompt);
    }
  }

  async generateStructuredDraft(topic: string, candidate: any, channelLanguage: string): Promise<any> {
    if (this.isDemoMode) return this.mock.generateStructuredDraft(topic, candidate, channelLanguage);
    try {
      return await this.primary.generateStructuredDraft(topic, candidate, channelLanguage);
    } catch (err) {
      console.warn(`Primary structured draft provider failed, trying fallback:`, err);
      try {
        return await this.fallback.generateStructuredDraft(topic, candidate, channelLanguage);
      } catch (fErr) {
        return this.mock.generateStructuredDraft(topic, candidate, channelLanguage);
      }
    }
  }

  async reviseDraft(existingDraft: any, instruction: string): Promise<any> {
    if (this.isDemoMode) return this.mock.reviseDraft(existingDraft, instruction);
    try {
      return await this.primary.reviseDraft(existingDraft, instruction);
    } catch (err) {
      return this.mock.reviseDraft(existingDraft, instruction);
    }
  }
}

let defaultProviderInstance: ResilientAiProvider | null = null;

export function getAiProvider(): ResilientAiProvider {
  if (!defaultProviderInstance) {
    defaultProviderInstance = new ResilientAiProvider();
  }
  return defaultProviderInstance;
}
