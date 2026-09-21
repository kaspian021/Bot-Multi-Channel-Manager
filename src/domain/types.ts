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

export interface ContentSource {
  id: string;
  channelId: string;
  name: string;
  type: SourceType;
  url: string;
  enabled: boolean;
  priority: number; // 1-10
  trustScore: number; // 0-100
  tags: string[];
  pollingIntervalMinutes: number;
  language: string;
  lastSuccessfulFetch?: string;
  lastError?: string;
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
}

export interface ContentCandidate {
  id: string;
  workspaceId: string;
  channelId: string;
  researchRunId?: string;
  sourceId?: string;
  title: string;
  canonicalUrl: string;
  normalizedUrl: string;
  author?: string;
  sourceLanguage?: string;
  publishedAt?: string;
  contentType: ContentType;
  summary: string;
  extractedClaims: string[];
  score: CandidateScoreBreakdown;
  isDuplicate: boolean;
  duplicateOfCandidateId?: string;
  duplicateDecisionReason?: string;
  createdAt: string;
}

export interface FactCheckItem {
  claim: string;
  status: 'VERIFIED' | 'UNVERIFIED' | 'UNCERTAIN';
  supportingSources: string[];
  confidence: number;
  notes?: string;
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
  sources: { title: string; url: string; publisher?: string }[];
  factCheckItems: FactCheckItem[];
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
  status: 'PENDING' | 'PUBLISHED' | 'CANCELLED' | 'FAILED';
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
  publishedText: string;
  mediaUrl?: string;
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
