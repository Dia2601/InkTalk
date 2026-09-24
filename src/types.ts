export type CharacterBadge = 'main' | 'sub' | 'unexpected';
export type CharacterStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export interface User {
  id: string;
  username: string;
  diamonds: number;
  lastLoginDate: string;
  claimedWelcomeBonus: boolean;
  role?: 'PLAYER' | 'ADMIN';
  createdAt: string;
}

export interface Work {
  id: string;
  title: string;
  author: string;
  era: string;
  summary: string;
  chapters?: string[];
  createdAt: string;
}

export interface Character {
  id: string;
  workId: string;
  workTitle: string;
  workAuthor: string;
  name: string;
  role: string; // e.g. "Người vợ đức hạnh", "Người con thơ ngây", "Góc nhìn người hầu"
  badge: CharacterBadge;
  personality: string;
  voiceTone: string;
  pronouns: string; // e.g. "thiếp - chàng", "cháu - bác", "lão - ông giáo"
  perspective: string;
  knownFacts: string[];
  knowledgeBoundaries: string[];
  shortIntro: string;
  imageUrl: string; // Provided by Admin upload (Mandatory for publish)
  isPublished: boolean;
  status?: CharacterStatus;
  version?: number;
  updatedAt?: string;
  createdAt: string;
}

export interface CharacterVersion {
  id: string;
  characterId: string;
  versionNumber: number;
  snapshotData: Character;
  changeSummary: string;
  createdAt: string;
}

export interface CharacterDraft {
  id: string;
  characterId?: string;
  formData: any;
  lastSavedAt: string;
}

export interface ResearchRecord {
  id: string;
  workTitle: string;
  author: string;
  workAuthor?: string;
  excerpt?: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  result?: any;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataIntegrityReport {
  timestamp: string;
  worksCount: number;
  charactersCount: number;
  charactersByStatus: Record<string, number>;
  versionsCount: number;
  draftsCount: number;
  imagesCount: number;
  cluesCount: number;
  mysteryRulesCount: number;
  researchRecordsCount: number;
  usersCount: number;
  sessionsCount: number;
  messagesCount: number;
  backupsCount: number;
  checks: {
    databaseEngine: string;
    walMode: boolean;
    atomicPersistence: boolean;
    diskStorageAccessible: boolean;
    circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    dataIntegrityPassed: boolean;
  };
}

export interface Clue {
  id: string;
  characterId: string;
  workId: string;
  title: string;
  description: string;
  sourceHint: string;
  triggerKeywords: string[];
  semanticContext: string;
  isDecoded?: boolean;
}

export interface ClueCombination {
  clueIds: string[];
  relationshipReveal: string;
}

export interface DeductionSolution {
  prompt: string;
  correctClueIds: string[];
  explanation: string;
  finalReveal: string;
}

export interface MysteryRule {
  id: string;
  characterId: string;
  requiredClueIds: string[];
  validCombinations: ClueCombination[];
  deductionSolution: DeductionSolution;
  minQuestionsForDeduction: number;
  replayMinQuestions: number;
}

export interface CanonData {
  id: string;
  workId: string;
  timeline: { time: string; event: string; canonQuote?: string }[];
  verifiedQuotes: string[];
  coreThemes: string[];
  conflict: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'player' | 'character' | 'system';
  text: string;
  timestamp: string;
  clueUnlocked?: Clue;
  selfCheckPassed?: boolean;
  debugInfo?: {
    characterLock: boolean;
    canonLock: boolean;
    knowledgeBoundaryCompliant: boolean;
    intent: string;
    questionCount: number;
  };
}

export interface GameSession {
  id: string;
  userId: string;
  characterId: string;
  questionCount: number;
  isReplay: boolean;
  unlockedClueIds: string[];
  decodedCombinationIds: string[];
  failedAttempts: number;
  testLockedUntilQuestion: number;
  completed: boolean;
  createdAt: string;
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface ReadingJourney {
  charactersExplored: number;
  worksExplored: number;
  cluesSolved: number;
  totalMessages: number;
  completedMysteries: number;
  streakDays: number;
  badges: AchievementBadge[];
}

export type CheckStatus = 'PASS' | 'WARNING' | 'NEED_REVIEW' | 'BLOCKED';

export interface PrePublishItem {
  id: string;
  category: string;
  label: string;
  status: CheckStatus;
  message: string;
  canAutoFix?: boolean;
}

export interface PrePublishReport {
  overallStatus: CheckStatus;
  items: PrePublishItem[];
}

export interface AiTestCaseResult {
  category: string;
  testPrompt: string;
  response: string;
  checks: {
    characterLock: boolean;
    canonLock: boolean;
    knowledgeBoundary: boolean;
    noRomance: boolean;
    mysteryProtected: boolean;
    responseDepth: boolean;
  };
  passed: boolean;
  notes: string;
}

export interface AiTestSuiteReport {
  passedCount: number;
  totalCount: number;
  results: AiTestCaseResult[];
}

export type AiTestStatus = 'NOT_RUN' | 'RUNNING' | 'COMPLETED' | 'ERROR';

export interface CharacterAiTestRecord {
  characterId: string;
  status: AiTestStatus;
  passedCount: number;
  totalCount: number;
  report?: AiTestSuiteReport | null;
  lastRunAt?: string;
  errorMessage?: string;
}

