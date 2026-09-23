// ==============================================================
// Domain Types & Enums — AI Multi-Channel Telegram Manager
// Extended with Phase 2: Channel Brain & Multilingual Intelligence
// ==============================================================

export enum PermissionLevel {
  GREEN = 'GREEN',   // Autonomous: research, scoring, drafting, retries
  YELLOW = 'YELLOW', // Owner approval required: publishing, channel title/description, profile pic, brain approval
  RED = 'RED',       // Owner only: owner identity, admins, credentials, destructive ops
}

export enum ChannelStatus {
  ONBOARDING = 'ONBOARDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
  ERROR = 'ERROR',
}

export enum SourceType {
  WEB = 'WEB',
  RSS = 'RSS',
  YOUTUBE = 'YOUTUBE',
  REDDIT = 'REDDIT',
}

export enum ContentType {
  NEWS = 'NEWS',
  MODEL_RELEASE = 'MODEL_RELEASE',
  TOOL_ANNOUNCEMENT = 'TOOL_ANNOUNCEMENT',
  RESEARCH_PAPER = 'RESEARCH_PAPER',
  TUTORIAL = 'TUTORIAL',
  PRODUCT_LAUNCH = 'PRODUCT_LAUNCH',
  OPEN_SOURCE = 'OPEN_SOURCE',
}

export enum DraftStatus {
  DISCOVERED = 'DISCOVERED',
  QUALIFIED = 'QUALIFIED',
  FACT_CHECKED = 'FACT_CHECKED',
  DRAFTED = 'DRAFTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  NEEDS_EDIT = 'NEEDS_EDIT',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum QualityGateStatus {
  PASS = 'PASS',
  WARN = 'WARN',
  FAIL = 'FAIL',
}

export enum AuditActorType {
  AI_WORKER = 'AI_WORKER',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  telegramChatId?: string;
  telegramChannelUsername?: string;
  language: string;
  status: ChannelStatus;
  description?: string;
  bio?: string;
  profileImageUrl?: string;
  postingFrequency: number; // posts per day
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelStrategy {
  channelId: string;
  language: string;
  targetAudience: string;
  tone: string;
  style: string;
  postingFrequency: number;
  preferredPostingWindows: string[]; // e.g. ["09:00", "14:00", "20:00"]
  minimumScore: number;
  minimumConfidence: number;
  hashtagPolicy: string;
  emojiPolicy: string;
  mediaPolicy: string;
  preferredTopics: string[];
  excludedTopics: string[];
}

// ==============================================================
// PHASE 2: CHANNEL BRAIN TYPES & STRUCTURES
// ==============================================================

export type ChannelBrainStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'ARCHIVED';

export interface ChannelBrainIdentity {
  channelName: string;
  description: string;
  niche: string;
  subNiches: string[];
  positioning: string;
  uniqueValueProposition: string;
  channelGoals: string[];
}

export interface ChannelBrainAudience {
  targetAudience: string;
  audienceKnowledgeLevel: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  interests: string[];
  painPoints: string[];
  geographicFocus?: string;
}

export interface ChannelBrainContent {
  primaryTopics: string[];
  secondaryTopics: string[];
  excludedTopics: string[];
  preferredContentTypes: ContentType[];
  contentMix: Record<string, number>; // e.g. { "AI News": 30, "Developer Tools": 25, "Research": 20, "Open Source": 15, "Tutorials": 10 }
  technicalDepth: 'high' | 'medium' | 'accessible';
  preferredPostLength: { minChars: number; maxChars: number };
}

export interface ChannelBrainStyle {
  tone: string;
  writingStyle: string;
  headlineStyle: string;
  emojiPolicy: 'minimal' | 'moderate' | 'expressive' | 'none';
  hashtagPolicy: 'minimal' | 'moderate' | 'strategic' | 'none';
  ctaPolicy: string;
  formattingRules: string[];
}

export interface ChannelBrainSources {
  preferredSources: string[];
  excludedSources: string[];
  trustedDomains: string[];
  preferredSourceTypes: SourceType[];
  sourceLanguages: string[];
  minimumSourceQuality: number;
}

export interface ChannelBrainPublishing {
  postingFrequency: number;
  timezone: string;
  preferredPublishingWindows: string[];
  weekendPolicy: 'normal' | 'reduced' | 'pause';
  minimumSpacingHours: number;
}

export interface ChannelBrainMedia {
  imagePolicy: 'ai_generated' | 'source_preview' | 'text_only' | 'mixed';
  videoPolicy: 'links_only' | 'none';
  aiImageGenerationPolicy: string;
  screenshotPolicy: string;
  mediaTextLanguage: string;
}

export interface ChannelBrainApproval {
  allPostsRequireOwnerApproval: boolean;
  allowedAutonomousActions: string[];
  actionsRequiringOwnerApproval: string[];
}

export interface ChannelBrainBusiness {
  growthObjective: string;
  monetizationObjective: string;
  advertisingPolicy: string;
  affiliatePolicy: string;
  sponsoredContentPolicy: string;
}

export interface ChannelBrainRestrictions {
  prohibitedTopics: string[];
  sensitiveTopicsRequiringApproval: string[];
  competitorMentions: string;
  excludedKeywords: string[];
  embargoPolicy: string;
  copyrightPolicy: string;
}

export interface ChannelBrain {
  id: string;
  channelId: string;
  version: number;
  status: ChannelBrainStatus;
  identity: ChannelBrainIdentity;
  audience: ChannelBrainAudience;
  content: ChannelBrainContent;
  style: ChannelBrainStyle;
  sources: ChannelBrainSources;
  publishing: ChannelBrainPublishing;
  media: ChannelBrainMedia;
  approval: ChannelBrainApproval;
  business: ChannelBrainBusiness;
  restrictions?: ChannelBrainRestrictions;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelBrainVersion {
  id: string;
  channelId: string;
  brainId: string;
  version: number;
  snapshot: ChannelBrain;
  changedFields: string[];
  changedBy: string;
  reason?: string;
  createdAt: string;
}

export interface ChannelLanguageSettings {
  channelId: string;
  primaryChannelLanguage: string;
  contentLanguage: string;
  metadataLanguage: string;
  headlineLanguage: string;
  hashtagLanguage: string;
  ctaLanguage: string;
  mediaTextLanguage: string;
  ownerCommunicationLanguage: string;
  allowedSourceLanguages: string[];
  fallbackLanguage: string;
  translationPolicy: 'SYNTHESIZE_TO_CONTENT_LANGUAGE' | 'PRESERVE_ORIGINAL_WITH_TRANSLATION' | 'DIRECT_TRANSLATION';
  preserveTechnicalTerms: boolean;
  updatedAt: string;
}

export type PreferenceType = 'EXPLICIT' | 'INFERRED';
export type PreferenceCategory = 'STYLE' | 'TOPIC' | 'SOURCE' | 'HEADLINE' | 'LENGTH' | 'APPROVAL';

export interface OwnerPreference {
  id: string;
  channelId: string;
  type: PreferenceType;
  category: PreferenceCategory;
  rule: string;
  confidence: number;
  source: 'ONBOARDING' | 'MANUAL' | 'EDIT_LEARNING';
  status: 'ACTIVE' | 'PROPOSED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface StrategyRecommendation {
  id: string;
  channelId: string;
  title: string;
  category: string;
  currentValue: string;
  recommendedValue: string;
  reason: string;
  status: 'PENDING' | 'APPLIED' | 'REJECTED';
  createdAt: string;
}

export interface OnboardingMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
  suggestedButtons?: { text: string; data: string }[];
}

export interface OnboardingSession {
  id: string;
  channelId: string;
  ownerUserId: string;
  status: 'IN_PROGRESS' | 'BRAIN_GENERATED' | 'COMPLETED' | 'CANCELLED';
  step: number;
  messages: OnboardingMessage[];
  extractedData: Partial<{
    channelName: string;
    niche: string;
    subNiches: string[];
    audience: string;
    audienceLevel: string;
    goals: string[];
    channelLanguage: string;
    contentLanguage: string;
    language: string;
    ownerLanguage: string;
    sourceLanguages: string[];
    postingFrequency: number;
    postsPerDay: number;
    tone: string;
    style: string;
    topics: string[];
    excludedTopics: string[];
    restrictions: string[];
    sources: string[];
    approvalPolicy: string;
  }>;
  proposedBrain?: ChannelBrain;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelBrandProposal {
  id: string;
  channelId: string;
  proposedName: string;
  proposedDescription: string;
  positioning: string;
  profileImageUrl?: string;
  status: 'PENDING' | 'APPLIED' | 'REJECTED';
  createdAt: string;
}

export interface Topic {
  id: string;
  channelId: string;
  slug: string;
  name: string;
  description: string;
  keywords: string[];
  excludedKeywords: string[];
  importance: number; // 1-10
  enabled: boolean;
  createdAt: string;
}

export enum SourceTrustTier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
  TIER_4 = 4,
}

export enum SourceHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  FAILING = 'FAILING',
  DISABLED = 'DISABLED',
}

export interface ContentSource {
  id: string;
  channelId: string;
  name: string;
  type: SourceType;
  url: string;
  enabled: boolean;
  priority: number; // 1-10
  trustScore: number; // 0-100
  trustTier?: number; // 1 (Official), 2 (Reputable Tech), 3 (Community), 4 (Unverified)
  provider?: string;
  tags: string[];
  pollingIntervalMinutes: number;
  language: string;
  lastSuccessfulFetch?: string;
  lastError?: string;
  failureCount?: number;
  averageLatencyMs?: number;
  healthStatus?: 'HEALTHY' | 'DEGRADED' | 'FAILING' | 'DISABLED';
  sourceHash?: string;
  contentHash?: string;
  excerpt?: string;
  rawMetadata?: any;
  fetchStatus?: string;
  extractionStatus?: string;
  createdAt: string;
}

export interface ResearchRun {
  id: string;
  workspaceId: string;
  channelId: string;
  query: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  candidatesFound: number;
  provider: string;
  durationMs: number;
  createdAt: string;
}

export interface CandidateScoreBreakdown {
  relevance: number;      // 0-100 (weight 0.20)
  novelty: number;        // 0-100 (weight 0.15)
  sourceQuality: number;  // 0-100 (weight 0.15)
  technicalDepth: number; // 0-100 (weight 0.10)
  audienceValue: number;  // 0-100 (weight 0.15)
  timeliness: number;     // 0-100 (weight 0.15)
  originality: number;    // 0-100 (weight 0.05)
  confidence: number;     // 0-100 (weight 0.05)
  overallScore: number;   // calculated weighted score
  evidenceStrength?: number;
  storyUniqueness?: number;
}

// ==============================================================
// PHASE 3: REAL RESEARCH INTELLIGENCE, EVIDENCE & CLAIMS
// ==============================================================

export type EvidenceType =
  | 'DIRECT_STATEMENT'
  | 'OFFICIAL_DOCUMENT'
  | 'RESEARCH_RESULT'
  | 'DATA_POINT'
  | 'OBSERVATION'
  | 'SECONDARY_REPORT'
  | 'COMMUNITY_SIGNAL';

export interface EvidenceItem {
  id: string;
  sourceId?: string;
  candidateId?: string;
  claimId?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  quotedPassage: string;
  normalizedClaim: string;
  publicationDate?: string;
  retrievalDate: string;
  confidence: number;
  evidenceType: EvidenceType;
  createdAt?: string;
}

export type ClaimVerificationStatus =
  | 'UNVERIFIED'
  | 'SUPPORTED'
  | 'VERIFIED'
  | 'PARTIALLY_SUPPORTED'
  | 'PARTIALLY_VERIFIED'
  | 'CONFLICTING'
  | 'CONTRADICTED'
  | 'REJECTED';

export interface Claim {
  id: string;
  draftId?: string;
  candidateId?: string;
  channelId?: string;
  text: string;
  normalizedText: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  verificationStatus: ClaimVerificationStatus;
  sourceEvidenceIds: string[];
  conflictingEvidenceIds: string[];
  createdAt?: string;
}

export interface StoryCluster {
  id: string;
  channelId: string;
  title: string;
  primarySourceId?: string;
  secondarySourceIds: string[];
  commonClaims: string[];
  divergentClaims: string[];
  earliestPublicationTime?: string;
  latestUpdateTime?: string;
  isMaterialUpdate: boolean;
  createdAt: string;
}

export type BreakingNewsCategory = 'BREAKING' | 'RECENT' | 'CURRENT' | 'EVERGREEN';

export interface ResearchResult {
  query: string;
  provider: string;
  searchTimestamp: string;
  sourceList: { url: string; title: string; snippet?: string; publishedDate?: string }[];
  citations: string[];
  claims: string[];
  confidence: number;
  rawMetadata?: any;
  normalizedEvidence: EvidenceItem[];
}

export interface TemporaryDirective {
  id: string;
  channelId: string;
  directiveText: string;
  createdBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface ContentCandidate {
  id: string;
  workspaceId: string;
  channelId: string;
  researchRunId?: string;
  sourceId?: string;
  storyClusterId?: string;
  title: string;
  canonicalUrl: string;
  normalizedUrl: string;
  author?: string;
  sourceLanguage?: string;
  publishedAt?: string;
  contentType: ContentType;
  summary: string;
  extractedClaims: string[];
  claims?: Claim[];
  evidence?: EvidenceItem[];
  score: CandidateScoreBreakdown;
  scoringVersion?: string;
  isDuplicate: boolean;
  duplicateOfCandidateId?: string;
  duplicateDecisionReason?: string;
  breakingNewsStatus?: BreakingNewsCategory;
  createdAt: string;
}

export interface FactCheckItem {
  claim: string;
  status: 'VERIFIED' | 'UNVERIFIED' | 'UNCERTAIN' | 'CONFLICTING';
  supportingSources: string[];
  confidence: number;
  notes?: string;
  evidenceId?: string;
}

export interface QualityGateEvaluation {
  status: QualityGateStatus; // PASS, WARN, FAIL
  factualityScore: number;
  sourceCoverageScore: number;
  writingQualityScore: number;
  grammarScore: number;
  duplicateLikelihood: number;
  clickbaitScore: number; // lower is better
  hallucinationRisk: number; // lower is better
  reasons: string[];
}

export interface ContentDraft {
  id: string;
  workspaceId: string;
  channelId: string;
  candidateId?: string;
  channelBrainVersion?: number;
  topic: string;
  title: string;
  headline: string;
  body: string;
  explanation: string;
  whyItMatters: string[];
  technicalContext: string;
  whatToWatch: string;
  contentType: ContentType;
  confidenceScore: number; // 0-100
  contentScore: number;    // 0-100
  status: DraftStatus;
  suggestedPublishTime: string;
  mediaUrl?: string;
  mediaPrompt?: string;
  sources: { title: string; url: string; publisher?: string; trustTier?: number }[];
  factCheckItems: FactCheckItem[];
  claims?: Claim[];
  claimIds?: string[];
  evidenceIds?: string[];
  qualityEvaluation?: QualityGateEvaluation;
  telegramMessageId?: number;
  rejectionReason?: string;
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledPost {
  id: string;
  workspaceId: string;
  channelId: string;
  draftId: string;
  scheduledFor: string;
  status: 'PENDING' | 'PUBLISHED' | 'CANCELLED' | 'FAILED' | 'BLOCKED_ENTITLEMENT';
  retryCount: number;
  idempotencyKey: string;
  lastAttemptAt?: string;
  failureReason?: string;
  createdAt: string;
}

export interface PublishedPost {
  id: string;
  workspaceId: string;
  channelId: string;
  draftId: string;
  scheduledPostId?: string;
  telegramMessageId: number;
  telegramChatId: string;
  telegramMessageUrl?: string;
  publishedText: string;
  mediaUrl?: string;
  mediaFileIds?: string[];
  contentFingerprint?: string;
  topic?: string;
  technology?: string;
  analyticsSnapshot?: any;
  publishedAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  channelId?: string;
  actorType: AuditActorType;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PromptTemplate {
  id: string;
  key: string;
  version: number;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  version: string;
  uptimeSeconds: number;
  demoMode: boolean;
  pausePublishing: boolean;
  database: { connected: boolean; provider: string; latencyMs: number };
  telegram: { connected: boolean; mode: string; botConfigured: boolean };
  aiProviders: {
    primary: string;
    available: boolean;
    models: string[];
  };
  jobs: {
    active: number;
    failed: number;
    lastRunAt?: string;
  };
}

// ==============================================================
// PHASE 4: ACCOUNT, COMMERCIAL CONTRACT & EDITORIAL OPERATIONS
// ==============================================================

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'APPROVER' | 'VIEWER';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type TelegramIdentityStatus = 'ACTIVE' | 'REVOKED';

export interface Account {
  id: string;
  externalProvider: string;
  externalUserId: string;
  status: AccountStatus;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalIdentity {
  provider: string;
  externalUserId: string;
  accountId: string;
}

export interface TelegramIdentity {
  id: string;
  accountId: string;
  telegramUserId: string;
  telegramUsernameSnapshot?: string;
  verifiedAt?: string;
  status: TelegramIdentityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  accountId: string;
  role: WorkspaceRole;
  status: 'ACTIVE' | 'INVITED' | 'REVOKED';
  createdAt: string;
}

export interface Product {
  key: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface Plan {
  productKey: string;
  code: string;
  name: string;
  featureDefaults: EntitlementFeatures;
  limitDefaults: EntitlementLimits;
  status: 'ACTIVE' | 'ARCHIVED';
}

export enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  GRACE = 'GRACE',
  PAST_DUE = 'PAST_DUE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface Subscription {
  id: string;
  accountId: string;
  productKey: string;
  planCode: string;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  effectiveAt?: string;
  providerSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntitlementFeatures {
  autonomousGeneration: boolean;
  webResearch: boolean;
  socialResearch: boolean;
  strategyRecommendations: boolean;
  advancedEditorialPlanning: boolean;
  autonomousPublishing?: boolean;
}

export interface EntitlementLimits {
  maxChannels: number;
  postsPerDay: number;
  aiRequestsPerDay: number;
  researchRunsPerDay: number;
  generationIntervalSeconds: number;
  researchIntervalSeconds?: number;
}

export interface Entitlement {
  id?: string;
  productKey: string;
  accountId: string;
  status: SubscriptionStatus;
  planCode: string;
  validUntil?: string;
  features: EntitlementFeatures;
  limits: EntitlementLimits;
  version: number;
  source?: 'MOCK' | 'REMOTE' | 'SNAPSHOT';
  resolvedAt?: string;
}

export type UsageMetric =
  | 'AI_REQUEST'
  | 'CONTENT_GENERATION'
  | 'RESEARCH_RUN'
  | 'POST_PUBLISHED'
  | 'CHANNEL_CREATED';

export interface UsageEvent {
  id: string;
  accountId: string;
  workspaceId?: string;
  channelId?: string;
  productKey: string;
  metric: UsageMetric;
  quantity: number;
  source: string;
  idempotencyKey: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationEvent {
  id: string;
  type: 'usage.recorded' | 'subscription.changed' | 'entitlement.changed' | 'account.linked' | 'channel.linked';
  aggregateId: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  nextAttemptAt?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface AccountLinkToken {
  id: string;
  accountId: string;
  workspaceId?: string;
  expiresAt: string;
  consumedAt?: string;
  status: 'PENDING' | 'CONSUMED' | 'REJECTED' | 'EXPIRED';
}

export interface EditorialPlan {
  id: string;
  date: string;
  channelId: string;
  targetPosts: number;
  contentMixTargets: Record<string, number>;
  selectedTopics: string[];
  preferredWindows: string[];
  plannedCandidateIds: string[];
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'STALE';
  generatedAt: string;
  rationale?: Record<string, unknown>;
}

export type EditorialLearningAction = 'APPROVE' | 'EDIT' | 'REJECT' | 'REGENERATE' | 'TIME_CHANGE' | 'TOPIC_CHANGE' | 'STYLE_CHANGE';

export interface EditorialLearningEvent {
  id: string;
  channelId: string;
  draftId?: string;
  action: EditorialLearningAction;
  signalKey: string;
  signalValue: string;
  confidence: number;
  provenance: 'OWNER_ACTION' | 'EXPLICIT_RULE';
  metadata?: Record<string, unknown>;
  createdAt: string;
}
