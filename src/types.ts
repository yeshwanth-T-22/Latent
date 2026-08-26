// ── Firestore schema types ───────────────────────────────────────────────────

export type HistoryEntryType = 'doubt' | 'quiz' | 'explainback';

export interface HistoryEntry {
  type: HistoryEntryType;
  timestamp: string;
  notes: string;
}

export interface TopicData {
  confidenceScore: number;        // 0–100 self-rated
  trueUnderstandingScore: number; // 0–100 AI-assessed
  lastInteraction?: string;
  history: HistoryEntry[];
  subject?: string;
}

export interface UnderstandingProfile {
  studentId: string;
  topics: Record<string, TopicData>;
  weakSpots: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ── API response types ───────────────────────────────────────────────────────

export interface DoubtResponse {
  answer: string;
}

export interface QuizQuestion {
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface QuizResponse {
  questions: QuizQuestion[];
}

export interface ConfidenceSubmitResponse {
  trueScore: number;
  isWeakSpot: boolean;
  feedback: string;
  gotRight: string[];
  toStrengthen: string[];
}

export interface ExplainBackResponse {
  trueScore: number;
  summary: string;
  gotRight: string[];
  toStrengthen: string[];
}

// ── Report ───────────────────────────────────────────────────────────────────

export interface ReportTopic {
  name: string;
  subject: string;
  confidenceScore: number;
  trueUnderstandingScore: number;
  isWeakSpot: boolean;
  lastInteraction: string | null;
  plan: string[];
}

export interface ReportResponse {
  studentId: string;
  topics: ReportTopic[];
  weakSpots: string[];
  weekLabel: string;
}

// ── Mentor ───────────────────────────────────────────────────────────────────

export interface TrendPoint {
  date: string;
  score: number;
}

export interface TopicTrend {
  topic: string;
  historyPoints: TrendPoint[];
}

export interface MentorResponse {
  studentId: string;
  displayName: string;
  averageUnderstanding: number;
  averageConfidence: number;
  topicsCount: number;
  weakSpotsCount: number;
  trends: TopicTrend[];
  mentorNote: string;
}

// ── Voice ────────────────────────────────────────────────────────────────────

export interface TranscribeResponse {
  transcription: string;
}

// ── Shared ───────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}
