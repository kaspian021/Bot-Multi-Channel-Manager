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

  /** Configured, non-demo providers available to production operations. */
  private productionProviders(): AiProviderBundle[] {
    return [...new Set([this.primary, this.fallback].filter((provider) => provider !== this.mock))];
  }

  private async withProductionProvider<T>(operation: string, invoke: (provider: AiProviderBundle) => Promise<T>): Promise<T> {
    const providers = this.productionProviders();
    if (!providers.length) throw new Error(`No configured production AI provider is available for ${operation}`);
    let lastError: unknown;
    for (const provider of providers) {
      try { return await invoke(provider); }
      catch (error) { lastError = error; console.warn(`${operation} provider ${provider.providerName} failed; trying configured fallback`, error); }
    }
    throw lastError instanceof Error ? lastError : new Error(`All configured production providers failed for ${operation}`);
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.isDemoMode) return this.mock.generateText(systemPrompt, userPrompt);
    return this.withProductionProvider('text generation', (provider) => provider.generateText(systemPrompt, userPrompt));
  }

  async searchAndGround(input: any): Promise<any> {
    if (this.isDemoMode) return this.mock.searchAndGround(input);
    // Research is evidence-bearing input. Production must never turn an
    // unavailable configured provider into a manufactured mock candidate.
    return this.withProductionProvider('research grounding', (provider) => provider.searchAndGround(input));
  }

  async generateImage(prompt: string): Promise<{ url: string; revisedPrompt?: string }> {
    if (this.isDemoMode) return this.mock.generateImage(prompt);
    return this.withProductionProvider('image generation', (provider) => provider.generateImage(prompt));
  }

  async generateStructuredDraft(topic: string, candidate: any, channelLanguage: string): Promise<any> {
    if (this.isDemoMode) return this.mock.generateStructuredDraft(topic, candidate, channelLanguage);
    return this.withProductionProvider('structured draft generation', (provider) => provider.generateStructuredDraft(topic, candidate, channelLanguage));
  }

  async reviseDraft(existingDraft: any, instruction: string): Promise<any> {
    if (this.isDemoMode) return this.mock.reviseDraft(existingDraft, instruction);
    return this.withProductionProvider('draft revision', (provider) => provider.reviseDraft(existingDraft, instruction));
  }
}

let defaultProviderInstance: ResilientAiProvider | null = null;

export function getAiProvider(): ResilientAiProvider {
  if (!defaultProviderInstance) {
    defaultProviderInstance = new ResilientAiProvider();
  }
  return defaultProviderInstance;
}
