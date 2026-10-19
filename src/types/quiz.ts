export type QuestionType = 'BUZZER' | 'MCQ' | 'TEXT' | 'NUMERIC' | 'BLUFF';

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
  progressiveClues?: string[];
  activeClueIndex?: number;
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
  doubleDownTokens?: number;
  sabotageTokens?: number;
  pointHeistAvailable?: boolean;
  activeSabotage?: {
    type: 'ink' | 'frost' | 'scramble';
    fromName: string;
    expiresAt: number;
  } | null;
}

export interface Buzz {
  playerId: string;
  playerName: string;
  timestamp: number;
  elapsedMs: number;
  serverOrder: number;
  doubleDown?: boolean;
}

export interface Submission {
  playerId: string;
  playerName: string;
  answer: string;
  timestamp: number;
  elapsedMs: number;
  status: 'pending' | 'correct' | 'wrong';
  pointsAwarded?: number;
  doubleDown?: boolean;
  pointHeist?: boolean;
  speedBonusAwarded?: number;
  bluff?: string;
  votedForPlayerId?: string;
}

export type GamePhase = 'LOBBY' | 'QUESTION' | 'REVEAL' | 'ROUND_STATS' | 'LEADERBOARD';

export interface QuestionStat {
  correctCount: number;
  totalAttempts: number;
  buzzTimes: number[];
}

export interface RoomTimer {
  durationSec: number;
  remainingSec: number;
  running: boolean;
  autoLock: boolean;
  endsAt: number;
}

export interface BluffEntry {
  playerId: string;
  playerName: string;
  text: string;
  votes: string[]; // playerIds that voted for this
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
  // Interactive Mechanics
  timer?: RoomTimer;
  progressiveClueIndex?: number;
  bluffMode?: {
    active: boolean;
    phase: 'bluffing' | 'voting';
    bluffs: Record<string, BluffEntry>;
  };
  activeSabotages?: Record<
    string,
    {
      type: 'ink' | 'frost' | 'scramble';
      fromName: string;
      expiresAt: number;
    }
  >;
  lastHeistEvent?: {
    fromName: string;
    toName: string;
    points: number;
    timestamp: number;
  } | null;
  superlatives?: {
    award: string;
    icon: string;
    recipientName: string;
    detail: string;
  }[];
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
