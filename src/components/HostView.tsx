import React, { useState } from 'react';
import { GameRoom, Question, GamePhase } from '../types/quiz';
import { DEFAULT_QUIZ_PACKS } from '../data/defaultQuizPacks';
import { adjudicateAnswerWithAI } from '../services/geminiService';
import {
  Lock,
  Unlock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Sparkles,
  Trophy,
  BarChart2,
  Tv,
  HelpCircle,
  Plus,
  Minus,
  FolderOpen,
  Volume2,
  UserX,
  Zap,
  Eye,
  Clock,
  Play,
  Pause,
  Lightbulb,
  Dices,
  Skull
} from 'lucide-react';
import { QuestionPackManager } from './QuestionPackManager';
import { AddQuestionModal } from './AddQuestionModal';

interface HostViewProps {
  room: GameRoom;
  onSetPhase: (phase: GamePhase, inputOpen?: boolean) => void;
  onToggleLock: (open?: boolean) => void;
  onChangeQuestion: (index: number) => void;
  onResetBuzzes: () => void;
  onAdjudicate: (playerId: string, status: 'correct' | 'wrong', points: number) => void;
  onAdjustScore: (playerId: string, delta: number) => void;
  onUpdateQuestions: (questions: Question[], packTitle: string) => void;
  onAddQuestion?: (question: Question, insertAt?: number) => void;
  onEditQuestion?: (index: number, question: Partial<Question>) => void;
  onDeleteQuestion?: (index: number) => void;
  onTriggerSound: (sound: string) => void;
  onKickPlayer: (playerId: string) => void;
  onOpenAIChat: () => void;
  onOpenQuizStudio?: () => void;
  onSwitchRole?: () => void;
  onStartTimer?: (durationSec?: number) => void;
  onPauseTimer?: () => void;
  onResetTimer?: (durationSec?: number) => void;
  onSetTimerDuration?: (durationSec: number) => void;
  onToggleAutoLock?: (autoLock?: boolean) => void;
  onRevealNextClue?: () => void;
  onNextClue?: () => void;
  onToggleBluffMode?: (active?: boolean) => void;
  onSetBluffPhase?: (phase: 'bluffing' | 'voting') => void;
  onStartBluffVote?: () => void;
  onToggleHeistMode?: () => void;
}

export const HostView: React.FC<HostViewProps> = ({
  room,
  onSetPhase,
  onToggleLock,
  onChangeQuestion,
  onResetBuzzes,
  onAdjudicate,
  onAdjustScore,
  onUpdateQuestions,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onTriggerSound,
  onKickPlayer,
  onOpenAIChat,
  onOpenQuizStudio,
  onSwitchRole,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onSetTimerDuration,
  onToggleAutoLock,
  onRevealNextClue,
  onToggleBluffMode,
  onSetBluffPhase
}) => {
  const [showPackModal, setShowPackModal] = useState<boolean>(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState<boolean>(false);
  const [aiAdjudicatingId, setAiAdjudicatingId] = useState<string | null>(null);
  const [aiVerdict, setAiVerdict] = useState<{ id: string; text: string; verdict: string } | null>(null);

  const currentQ: Question | undefined = room.questions[room.currentQIndex];
  const sortedPlayers = Object.values(room.players || {}).sort((a, b) => b.score - a.score);

  // Ask AI to adjudicate an answer
  const handleAiAdjudicate = async (playerId: string, playerAnswer: string) => {
    if (!currentQ) return;
    setAiAdjudicatingId(playerId);
    setAiVerdict(null);

    try {
      const decision = await adjudicateAnswerWithAI(
        currentQ.question,
        currentQ.answer,
        playerAnswer
      );

      setAiVerdict({
        id: playerId,
        verdict: decision.verdict,
        text: `${decision.verdict}: ${decision.reason} (${Math.round(decision.confidence * 100)}% conf)`
      });

      if (decision.verdict === 'ACCEPT') {
        onAdjudicate(playerId, 'correct', currentQ.points);
      }
    } catch (err: any) {
      setAiVerdict({
        id: playerId,
        verdict: 'ERROR',
        text: 'AI Check failed. Please judge manually.'
      });
    } finally {
      setAiAdjudicatingId(null);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col gap-5 pb-16">
      
      {/* 1. TV SCREEN PHASE CONTROLLER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-between">
          <span>TV Screen Display Mode</span>
          <span className="text-amber-400 font-mono">Current: {room.phase}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={() => onSetPhase('LOBBY', false)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              room.phase === 'LOBBY'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Tv className="w-3.5 h-3.5" /> Lobby QR
          </button>

          <button
            onClick={() => onSetPhase('QUESTION', true)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              room.phase === 'QUESTION'
                ? 'bg-blue-600 text-white shadow-md font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" /> Question
          </button>

          <button
            onClick={() => onSetPhase('REVEAL', false)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              room.phase === 'REVEAL'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Reveal
          </button>

          <button
            onClick={() => onSetPhase('ROUND_STATS', false)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              room.phase === 'ROUND_STATS'
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Stats
          </button>

          <button
            onClick={() => onSetPhase('LEADERBOARD', false)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1 ${
              room.phase === 'LEADERBOARD'
                ? 'bg-amber-600 text-white shadow-md font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Podium
          </button>
        </div>
      </div>

      {/* 2. QUESTION NAVIGATOR & SECRET HOST ANSWER CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-2">
          <button
            disabled={room.currentQIndex <= 0}
            onClick={() => onChangeQuestion(room.currentQIndex - 1)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-bold flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className="flex flex-col items-center">
              <span className="font-extrabold text-amber-400 text-sm">
                {room.currentPackTitle?.startsWith('Cash Builder:')
                  ? `Question ${room.currentQIndex + 1}`
                  : `Question ${room.currentQIndex + 1} of ${room.questions.length}`}
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                {room.currentPackTitle}
              </span>
            </div>

            <button
              onClick={() => setShowPackModal(true)}
              className="py-1.5 px-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-300 font-extrabold text-xs flex items-center gap-1 transition cursor-pointer shadow-sm"
              title="Select quiz rounds or choose from 51 celebrity Cash Builder appearances"
            >
              <span>⚡ Celebrities (51)</span>
            </button>

            <button
              onClick={() => (onOpenQuizStudio ? onOpenQuizStudio() : setShowAddQuestionModal(true))}
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/25 to-amber-600/35 hover:from-amber-500/35 hover:to-amber-600/45 border border-amber-500/50 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Write custom questions, paste from notes, or generate with AI"
            >
              <span>✍️ Quiz Studio</span>
            </button>
          </div>

          <button
            disabled={room.currentQIndex >= room.questions.length - 1}
            onClick={() => onChangeQuestion(room.currentQIndex + 1)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-bold flex items-center gap-1 transition"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Question Details */}
        {currentQ ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {currentQ.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                {currentQ.type}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {currentQ.points} Pts
              </span>
            </div>

            <h3 className="text-lg font-bold text-white leading-snug">
              {currentQ.question}
            </h3>

            {/* Secret Host Answer Box */}
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-700/50 shadow-inner">
              <div className="text-[10px] font-extrabold tracking-widest uppercase text-indigo-400 mb-1 flex items-center justify-between">
                <span>Secret Host Answer Key</span>
                <span className="text-[10px] text-indigo-300 font-semibold">(Hidden from players)</span>
              </div>
              <div className="text-xl font-black text-amber-300">
                {currentQ.answer}
              </div>
              {currentQ.explanation && (
                <div className="text-xs text-indigo-200/90 mt-1 italic">
                  💡 {currentQ.explanation}
                </div>
              )}
              <div className="mt-2 pt-2 border-t border-indigo-800/50 flex items-center justify-between text-xs">
                <span className="text-[11px] text-indigo-300">Need to tweak this question?</span>
                <button
                  type="button"
                  onClick={() => (onOpenQuizStudio ? onOpenQuizStudio() : setShowAddQuestionModal(true))}
                  className="text-amber-300 hover:text-amber-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>✏️ Edit or Add Questions</span>
                </button>
              </div>
            </div>

            {/* 20s AUTO-TIMER & CLUES CONTROLLER */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black uppercase text-white">Auto-Timer Controller</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                      (room.timer?.remainingSec ?? 20) <= 5
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-700/50'
                    }`}
                  >
                    {room.timer?.remainingSec ?? 20}s {room.timer?.running ? '▶ Running' : '⏸ Paused'}
                  </span>
                </div>
              </div>

              {/* Timer Duration Presets & Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {[15, 20, 30].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      onSetTimerDuration?.(sec);
                      onResetTimer?.(sec);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition ${
                      room.timer?.durationSec === sec
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    onSetTimerDuration?.(60);
                    onResetTimer?.(60);
                    onStartTimer?.(60);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-mono font-extrabold flex items-center gap-1 hover:bg-amber-500/30 transition cursor-pointer"
                  title="Start 1-minute 60s Cash Builder Clock"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>60s Cash Builder</span>
                </button>

                <button
                  type="button"
                  onClick={() => (room.timer?.running ? onPauseTimer?.() : onStartTimer?.())}
                  className="py-1 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 transition"
                >
                  {room.timer?.running ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Start
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onResetTimer?.()}
                  className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={() => onToggleAutoLock?.()}
                  className={`ml-auto px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                    room.timer?.autoLock
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                  title="Automatically lock answers when timer hits 0s"
                >
                  <span>Auto-Lock at 0s:</span>
                  <span className="font-mono">{room.timer?.autoLock ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* Progressive Clue Ladder */}
              {(currentQ.progressiveClues || currentQ.hint) && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Progressive Clues ({room.progressiveClueIndex ?? 0} revealed)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRevealNextClue?.()}
                    className="py-1 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition"
                  >
                    Reveal Next Clue
                  </button>
                </div>
              )}
            </div>

            {/* Buzzer Lock & Reset Controls */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => onToggleLock()}
                className={`py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer ${
                  room.inputOpen
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                }`}
              >
                {room.inputOpen ? (
                  <>
                    <Lock className="w-4 h-4" /> Lock Answers & Buzzers
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" /> Unlock Answers & Buzzers
                  </>
                )}
              </button>

              <button
                onClick={onResetBuzzes}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Reset Inputs
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">
            No questions loaded. Click below to load a question pack.
          </div>
        )}
      </div>

      {/* 3. LIVE PLAYER BUZZES & RESPONSES ADJUDICATION AREA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Live Submissions & Buzzers
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {room.buzzes.length} buzzed • {Object.keys(room.submissions).length} answered
          </span>
        </div>

        {room.buzzes.length === 0 && Object.keys(room.submissions).length === 0 ? (
          <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
            Waiting for players to buzz in or submit answers...
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {/* Show all submissions and buzzes */}
            {(() => {
              // Gather combined list of player IDs from buzzes and submissions
              const playerIdsSet = new Set<string>();
              room.buzzes.forEach(b => playerIdsSet.add(b.playerId));
              Object.keys(room.submissions).forEach(pid => playerIdsSet.add(pid));

              return Array.from(playerIdsSet).map((pid, idx) => {
                const buzz = room.buzzes.find(b => b.playerId === pid);
                const submission = room.submissions[pid];
                const playerName = buzz?.playerName || submission?.playerName || room.players[pid]?.name || 'Player';
                const isFirst = idx === 0;

                return (
                  <div
                    key={pid}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isFirst
                        ? 'bg-amber-950/30 border-amber-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center">
                          {buzz?.serverOrder || idx + 1}
                        </span>
                        <span className="font-extrabold text-sm text-white">{playerName}</span>
                        {buzz && (
                          <span className="text-[11px] text-slate-400 font-mono">({buzz.elapsedMs}ms)</span>
                        )}
                        {(submission?.doubleDown || buzz?.doubleDown) && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
                            <Zap className="w-2.5 h-2.5 fill-slate-950" /> 2X WAGER
                          </span>
                        )}
                        {submission?.pointHeist && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500 text-white flex items-center gap-1 shadow-sm">
                            🚨 HEIST
                          </span>
                        )}
                        {submission?.speedBonusAwarded ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-400 text-slate-950 flex items-center gap-1">
                            ⚡ +{submission.speedBonusAwarded} SPEED
                          </span>
                        ) : null}
                      </div>

                      {submission && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-bold uppercase ${
                            submission.status === 'correct'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : submission.status === 'wrong'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {submission.status}
                        </span>
                      )}
                    </div>

                    {/* Submitted text / verbal answer */}
                    {submission && (
                      <div className="text-xs bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-slate-200 mb-2 font-mono">
                        Answer: <span className="font-bold text-white">"{submission.answer}"</span>
                      </div>
                    )}

                  {/* AI verdict note if triggered */}
                  {aiVerdict && aiVerdict.id === pid && (
                    <div className="text-xs p-2 rounded-lg bg-purple-950/70 border border-purple-800/60 text-purple-200 mb-2">
                      <Sparkles className="w-3 h-3 inline mr-1 text-amber-300" />
                      {aiVerdict.text}
                    </div>
                  )}

                  {/* Host Quick Adjudication Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onAdjudicate(pid, 'correct', currentQ?.points || 10)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition"
                    >
                      <Check className="w-3.5 h-3.5" /> Correct (+{currentQ?.points || 10})
                    </button>

                    <button
                      onClick={() => onAdjudicate(pid, 'wrong', 0)}
                      className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1 transition"
                    >
                      <X className="w-3.5 h-3.5" /> Wrong
                    </button>

                    {/* AI Dispute Resolution Button */}
                    <button
                      disabled={aiAdjudicatingId === pid}
                      onClick={() =>
                        handleAiAdjudicate(pid, submission?.answer || currentQ?.answer || '')
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-semibold text-xs flex items-center gap-1 transition border border-purple-700/60"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      {aiAdjudicatingId === pid ? 'Evaluating...' : 'Ask AI'}
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
        )}
      </div>

      {/* 4. PLAYER SCORE ADJUSTMENT & MANAGEMENT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Players & Live Scores ({sortedPlayers.length})
          </h3>
          <span className="text-xs text-slate-400">Quick adjust (+/-)</span>
        </div>

        {sortedPlayers.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
            No players currently joined. Share room code {room.code}
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sortedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{player.name}</span>
                  <span className="font-mono text-xs font-black text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                    {player.score} pts
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onAdjustScore(player.id, 5)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => onAdjustScore(player.id, 10)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold"
                  >
                    +10
                  </button>
                  <button
                    onClick={() => onAdjustScore(player.id, -5)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => onKickPlayer(player.id)}
                    title="Remove player"
                    className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. SOUND EFFECTS SOUNDBOARD & PACK CHANGER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Sound Effects Trigger Board */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Trigger Game Show Sounds
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onTriggerSound('buzzer')}
              className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1"
            >
              🚨 Buzzer
            </button>
            <button
              onClick={() => onTriggerSound('ding')}
              className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1"
            >
              🔔 Bell 'Ding'
            </button>
            <button
              onClick={() => onTriggerSound('correct')}
              className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 flex items-center justify-center gap-1"
            >
              ✨ Correct Chime
            </button>
            <button
              onClick={() => onTriggerSound('wrong')}
              className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-rose-400 flex items-center justify-center gap-1"
            >
              ❌ 'Wrong' Buzzer
            </button>
            <button
              onClick={() => onTriggerSound('tick')}
              className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-blue-300 flex items-center justify-center gap-1"
            >
              ⏱️ Timer Tick
            </button>
            <button
              onClick={() => onTriggerSound('fanfare')}
              className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 flex items-center justify-center gap-1"
            >
              🎺 Fanfare
            </button>
          </div>
        </div>

        {/* Question Packs & AI Assistant */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" /> Question Sets & Media
            </h4>
            <p className="text-xs text-slate-400 leading-snug">
              Switch built-in hilarious rounds or upload media-rich sets.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => (onOpenQuizStudio ? onOpenQuizStudio() : setShowAddQuestionModal(true))}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>✍️ Write Questions</span>
            </button>

            <button
              onClick={() => setShowPackModal(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              Packs
            </button>

            <button
              onClick={onOpenAIChat}
              className="flex-1 py-2 px-3 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-700/60 text-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Co-Host
            </button>
          </div>
        </div>
      </div>

      {/* Modal for Adding Questions on the fly & Editing */}
      <AddQuestionModal
        isOpen={showAddQuestionModal}
        onClose={() => setShowAddQuestionModal(false)}
        currentQuestions={room.questions}
        currentQIndex={room.currentQIndex}
        onAddQuestion={(q, insertAt) => {
          onAddQuestion?.(q, insertAt);
        }}
        onEditQuestion={(idx, q) => {
          onEditQuestion?.(idx, q);
        }}
        onDeleteQuestion={(idx) => {
          onDeleteQuestion?.(idx);
        }}
        onJumpToQuestion={(idx) => {
          onChangeQuestion(idx);
        }}
      />

      {/* Modal for Question Pack Manager */}
      {showPackModal && (
        <QuestionPackManager
          currentPackTitle={room.currentPackTitle}
          onSelectPack={(pack) => {
            onUpdateQuestions(pack.questions, pack.title);
            setShowPackModal(false);
          }}
          onClose={() => setShowPackModal(false)}
        />
      )}
    </div>
  );
};
