// Explicit DEMO_MODE-only research fixture. Callers must invoke it only in demo mode.
import { RawResearchCandidate } from '../../application/interfaces/ai-providers';

export function getDemoSyntheticMultilingualCandidates(sourceLanguages: string[]): RawResearchCandidate[] {
  const demoSyntheticCandidates: RawResearchCandidate[] = [];
  if (sourceLanguages.includes('de')) {
    demoSyntheticCandidates.push({
      title: 'Max-Planck-Institut: Quanten-Algorithmus beschleunigt Transformer-Inferenz (Demo fixture)',
      url: 'https://example.invalid/demo/max-planck-de',
      sourceName: 'Demo German Research Fixture',
      publishedAt: new Date().toISOString(),
      summary: 'Demo-only German multilingual candidate used to exercise translation and editorial flows.',
      claims: ['Demo multilingual fixture: quantum-inspired tensor compression'],
      relevanceScore: 94, noveltyScore: 92, technicalDepthScore: 96, sourceLanguage: 'de',
    } as RawResearchCandidate);
  }
  if (sourceLanguages.includes('ja')) {
    demoSyntheticCandidates.push({
      title: '東京大学：次世代ヒューマノイドロボット向けCUDA自律制御モデル（デモ）',
      url: 'https://example.invalid/demo/tokyo-ja',
      sourceName: 'Demo Japanese Research Fixture',
      publishedAt: new Date().toISOString(),
      summary: 'Demo-only Japanese multilingual candidate used to exercise translation and editorial flows.',
      claims: ['Demo multilingual fixture: CUDA robotics control'],
      relevanceScore: 92, noveltyScore: 90, technicalDepthScore: 94, sourceLanguage: 'ja',
    } as RawResearchCandidate);
  }
  return demoSyntheticCandidates;
}
