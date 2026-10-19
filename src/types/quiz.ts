export type QuestionType = 'BUZZER' | 'MCQ' | 'TEXT';

export interface Question {
  id: string;
  type: QuestionType;
  category: string;
  question: string;
  options?: string[];
  answer: string;
  points: number;
  mediaType?: 'image' | 'audio' | 'video' | 'none';
  mediaUrl?: string;
  explanation?: string;
  hint?: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  connected: boolean;
  avatar?: string;
  lastBuzzTime?: number;
  lastSeen?: number;
}

export interface Buzz {
  playerId: string;
  playerName: string;
  timestamp: number;
  elapsedMs: number;
  serverOrder: number;
}

export interface Submission {
  playerId: string;
  playerName: string;
  answer: string;
  timestamp: number;
  elapsedMs: number;
  status: 'pending' | 'correct' | 'wrong';
  pointsAwarded?: number;
}

export type GamePhase = 'LOBBY' | 'QUESTION' | 'REVEAL' | 'ROUND_STATS' | 'LEADERBOARD';

export interface QuestionStat {
  correctCount: number;
  totalAttempts: number;
  buzzTimes: number[];
}

export interface GameRoom {
  code: string;
  phase: GamePhase;
  currentQIndex: number;
  inputOpen: boolean;
  questionStartTime: number;
  questions: Question[];
  currentPackTitle: string;
  players: Record<string, Player>;
  buzzes: Buzz[];
  submissions: Record<string, Submission>;
  questionHistory: Record<string, QuestionStat>;
  soundTrigger?: { sound: string; nonce: number };
  lastUpdated: number;
  revision?: number;
  hostLastSeen?: number;
  hostConnected?: boolean;
}

export interface QuizPack {
  id: string;
  title: string;
  description: string;
  category?: string;
  icon?: string;
  questions: Question[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  persona?: string;
}

export interface RoundStatsSummary {
  roundTitle: string;
  totalQuestions: number;
  completedQuestions: number;
  averageBuzzTimeMs: number;
  fastestBuzz: { playerName: string; timeMs: number; questionText: string } | null;
  hardestQuestion: { question: string; correctPercentage: number } | null;
  easiestQuestion: { question: string; correctPercentage: number } | null;
  overallAccuracyRate: number;
  playerRankings: {
    id: string;
    name: string;
    score: number;
    streak: number;
    correctCount: number;
    buzzCount: number;
    avgSpeedMs: number;
  }[];
}
