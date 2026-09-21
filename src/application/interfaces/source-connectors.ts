// ==============================================================
// Source Connector Interfaces — Section 12 & 13 Specification
// ==============================================================

import { ContentSource } from '../../domain/types';
import { RawResearchCandidate } from './ai-providers';

export interface IContentSourceConnector {
  readonly sourceType: string;
  isAvailable(): boolean;
  fetchCandidates(source: ContentSource, topics: string[]): Promise<RawResearchCandidate[]>;
}
