export type GamePhase = 'LOBBY' | 'QUESTION' | 'REVEAL' | 'ROUND_STATS' | 'LEADERBOARD';

export type QuestionType = 'BUZZER' | 'MCQ' | 'TEXT' | 'NUMERIC' | 'NUMBER' | 'BLUFF' | 'CLUES';

export type ConfidenceLevel = 'SAFE' | 'NORMAL' | 'ALL_IN';

export type SabotageType = 'ICE' | 'DRUNK' | 'MIRROR' | 'INK' | 'FREEZE' | 'SCRAMBLE';

export interface Question {
  id: string;
  type: QuestionType;
  category: string;
  question: string;
  options?: string[];
  clues?: string[];
  progressiveClues?: string[];
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
  maxStreakLost?: number;
  totalAnswerMs?: number;
  answerCount?: number;
  wagerNet?: number;
  connected: boolean;
  avatar?: string;
  lastBuzzTime?: number;
  lastSeen?: number;
  doubleDownUsed?: boolean;
  doubleDownActive?: boolean;
  doubleDownTokens?: number;
  sabotageTokens?: number;
  pointHeistAvailable?: boolean;
  confidence?: ConfidenceLevel;
  heistTargetId?: string;
  sabotageEffect?: {
    type: SabotageType;
    fromName: string;
    nonce: number;
  } | null;
  activeSabotage?: {
    type: 'INK' | 'FREEZE' | 'SCRAMBLE';
    fromName: string;
    until: number;
  } | null;
}

export interface Buzz {
  playerId: string;
  playerName: string;
  timestamp: number;
  elapsedMs: number;
  serverOrder: number;
  doubleDown?: boolean;
  doubledDown?: boolean;
}

export interface Submission {
  playerId: string;
  playerName: string;
  answer: string;
  timestamp: number;
  elapsedMs: number;
  status: 'pending' | 'correct' | 'wrong';
  pointsAwarded?: number;
  speedBonus?: number;
  speedBonusAwarded?: number;
  doubleDown?: boolean;
  doubledDown?: boolean;
  pointHeist?: boolean;
  confidence?: ConfidenceLevel;
  heistStolen?: number;
  fooledCount?: number;
  isBluff?: boolean;
}

export interface GameRoom {
  code: string;
  phase: GamePhase;
  currentQIndex: number;
  inputOpen: boolean;
  questionStartTime: number;
  timerSeconds?: number;
  timer?: {
    durationSec: number;
    remainingSec: number;
    running: boolean;
    autoLock?: boolean;
  };
  clueStep?: number;
  progressiveClueIndex?: number;
  heistActive?: boolean;
  lastHeistEvent?: {
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    points: number;
    timestamp: number;
  };
  activeSabotages?: Record<
    string,
    {
      type: 'INK' | 'FREEZE' | 'SCRAMBLE';
      fromName: string;
      until: number;
    }
  >;
  superlatives?: {
    title: string;
    award?: string;
    recipient: string;
    recipientName?: string;
    stat: string;
    detail?: string;
    icon: string;
  }[];
  bluffMode?: boolean;
  bluffPhase?: 'bluffing' | 'voting';
  bluffStage?: 'ENTER_LIES' | 'VOTE' | 'COLLECTING' | 'VOTING' | 'REVEAL';
  bluffLies?: Record<string, string>;
  bluffs?: Record<string, string>;
  bluffOptions?: string[];
  bluffVotes?: Record<string, string>;
  questions: Question[];
  currentPackTitle: string;
  players: Record<string, Player>;
  buzzes: Buzz[];
  submissions: Record<string, Submission>;
  questionHistory: Record<string, { correctCount: number; totalAttempts: number; buzzTimes: number[] }>;
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
