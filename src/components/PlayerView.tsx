import React, { useState, useEffect } from 'react';
import { GameRoom, Player } from '../types/quiz';
import { Pencil, Check, Zap, Send, Trophy } from 'lucide-react';

interface PlayerViewProps {
  room: GameRoom;
  playerId: string;
  playerName: string;
  onBuzzIn: () => void;
  onSubmitAnswer: (answer: string) => void;
  latencyMs?: number;
  onUpdatePlayerName: (newName: string) => void;
}

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500'
];

export function PlayerView({
  room,
  playerId,
  playerName,
  onBuzzIn,
  onSubmitAnswer,
  onUpdatePlayerName
}: PlayerViewProps) {
  const hasSavedName = Boolean(playerName && playerName.trim() && playerName.trim() !== 'Player');
  const [isEditingName, setIsEditingName] = useState<boolean>(!hasSavedName);
  const [nameInput, setNameInput] = useState<string>(hasSavedName ? playerName : '');
  const [textAnswer, setTextAnswer] = useState<string>('');

  const currentQ = room.questions[room.currentQIndex];
  const mySubmission = room.submissions[playerId];
  const myBuzzIndex = room.buzzes.findIndex((b) => b.playerId === playerId);
  const hasBuzzed = myBuzzIndex !== -1;
  const playersList = (Object.values(room.players || {}) as Player[]).sort((a, b) => b.score - a.score);
  const myPlayer = room.players[playerId];

  // Clear text input when question changes
  useEffect(() => {
    setTextAnswer('');
  }, [room.currentQIndex, room.phase]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.trim();
    if (!cleaned) return;
    onUpdatePlayerName(cleaned);
    setIsEditingName(false);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textAnswer.trim() || !room.inputOpen) return;
    onSubmitAnswer(textAnswer.trim());
  };

  // 1. INSTANT NAME PICKER ON QR SCAN
  if (isEditingName) {
    return (
      <div className="h-[100dvh] w-full flex flex-col justify-between p-6 bg-gradient-to-b from-[#1a0b2e] to-[#0f071e]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-black italic tracking-tight text-xl">
            <span>RAPID</span>
            <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 text-sm not-italic font-bold">QUIZ</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-purple-300/70 bg-white/5 px-3 py-1 rounded-full">
            Room {room.code}
          </span>
        </div>

        <form onSubmit={handleSaveName} className="my-auto w-full max-w-sm mx-auto flex flex-col gap-5">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Enter your name
            </h1>
            <p className="text-sm text-purple-200/70">
              Pick the name that will appear on the big screen
            </p>
          </div>

          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name or team..."
            maxLength={20}
            autoFocus
            className="w-full px-5 py-4 rounded-full bg-white/10 border-2 border-purple-400/30 focus:border-pink-500 focus:outline-none text-center text-xl font-bold text-white placeholder:text-purple-300/40"
          />

          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="w-full py-4 rounded-full bg-pink-500 hover:bg-pink-400 active:scale-[0.98] disabled:opacity-40 text-white font-extrabold text-xl shadow-lg shadow-pink-500/30 transition cursor-pointer"
          >
            Join Game
          </button>
        </form>

        <div className="text-center text-xs text-purple-300/40">
          Connected to Room {room.code}
        </div>
      </div>
    );
  }

  // 2. MAIN ZERO-SCROLL HANDSET VIEW
  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto flex flex-col justify-between p-5 bg-gradient-to-b from-[#1a0b2e] to-[#0f071e] overflow-hidden">
      {/* Top Player Pill & Score */}
      <div className="flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => {
            setNameInput(playerName);
            setIsEditingName(true);
          }}
          className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full transition cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center font-bold text-xs">
            {playerName ? playerName.slice(0, 2).toUpperCase() : 'PL'}
          </div>
          <span className="font-bold text-sm truncate max-w-[140px]">{playerName || 'Player'}</span>
          <Pencil className="w-3.5 h-3.5 text-purple-300" />
        </button>

        <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="font-extrabold text-sm">{myPlayer?.score ?? 0}</span>
        </div>
      </div>

      {/* Center Stage: Adapts to Phase with Zero Scrolling */}
      <div className="flex-1 flex flex-col justify-center my-3 overflow-hidden">
        {room.phase === 'LOBBY' && (
          <div className="flex flex-col h-full justify-center space-y-5">
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl font-extrabold leading-tight">
                <span className="text-pink-400">Host</span> is setting up the game.
              </h2>
              <p className="text-xs text-purple-200/70">
                Eyes on the big screen — we're starting soon!
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col max-h-[52dvh]">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-300/70 text-center mb-3">
                Connected players ({playersList.length})
              </p>
              <div className="space-y-2 overflow-y-auto no-scrollbar">
                {playersList.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-white/5 px-3.5 py-2.5 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl ${
                          AVATAR_COLORS[idx % AVATAR_COLORS.length]
                        } flex items-center justify-center font-extrabold text-xs text-white`}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm">
                        {p.name} {p.id === playerId && '(You)'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-purple-300">{p.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {room.phase === 'QUESTION' && currentQ && (
          <div className="flex flex-col h-full justify-between py-1">
            {/* Compact Question Header */}
            <div className="text-center space-y-1.5 shrink-0">
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                Question {room.currentQIndex + 1} of {room.questions.length}
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold leading-snug text-white line-clamp-4 px-1">
                {currentQ.question}
              </h2>
            </div>

            {/* Option Pills / Text Input / Buzzer */}
            <div className="flex-1 flex flex-col justify-center gap-3 my-2">
              {currentQ.type === 'MCQ' && currentQ.options && currentQ.options.length > 0 ? (
                currentQ.options.map((opt) => {
                  const isSelected = mySubmission?.answer === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={!room.inputOpen}
                      onClick={() => onSubmitAnswer(opt)}
                      className={`w-full py-4 px-6 rounded-full font-extrabold text-lg transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                        isSelected
                          ? 'bg-yellow-400 text-slate-950 scale-[1.02] shadow-yellow-400/30'
                          : 'bg-[#ec4899] hover:bg-[#f472b6] text-white active:scale-[0.98] shadow-pink-500/25'
                      } disabled:opacity-50`}
                    >
                      <span>{opt}</span>
                      {isSelected && <Check className="w-5 h-5 stroke-[3]" />}
                    </button>
                  );
                })
              ) : currentQ.type === 'BUZZER' ? (
                <div className="flex flex-col items-center justify-center my-auto">
                  <button
                    type="button"
                    disabled={!room.inputOpen || hasBuzzed}
                    onClick={onBuzzIn}
                    className={`w-52 h-52 rounded-full font-black text-3xl uppercase tracking-wider shadow-2xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                      hasBuzzed
                        ? 'bg-emerald-500 text-white scale-95'
                        : room.inputOpen
                        ? 'bg-gradient-to-b from-pink-500 to-rose-600 text-white active:scale-90 shadow-pink-500/40 border-4 border-pink-300/40'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-10 h-10" />
                    <span>{hasBuzzed ? `#${myBuzzIndex + 1} In!` : room.inputOpen ? 'BUZZ!' : 'Locked'}</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendText} className="flex flex-col gap-3 my-auto">
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    disabled={!room.inputOpen}
                    placeholder={mySubmission ? `Submitted: ${mySubmission.answer}` : 'Type your answer...'}
                    className="w-full px-5 py-4 rounded-full bg-white/10 border-2 border-purple-400/30 focus:border-pink-500 focus:outline-none text-center text-lg font-bold text-white placeholder:text-purple-300/40 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!room.inputOpen || !textAnswer.trim()}
                    className="w-full py-3.5 rounded-full bg-pink-500 hover:bg-pink-400 active:scale-[0.98] disabled:opacity-40 text-white font-bold text-base shadow-lg shadow-pink-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{mySubmission ? 'Update Answer' : 'Submit Answer'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Bottom Status / Feedback */}
            <div className="text-center text-xs text-purple-200/70 shrink-0">
              {hasBuzzed ? (
                <span className="text-emerald-400 font-bold">You buzzed in! Shout your answer.</span>
              ) : mySubmission ? (
                <span className="text-emerald-400 font-bold">Answer recorded: "{mySubmission.answer}"</span>
              ) : (
                <span>Room {room.code} • {room.inputOpen ? 'Tap an option or buzz in' : 'Answers locked'}</span>
              )}
            </div>
          </div>
        )}

        {room.phase === 'REVEAL' && currentQ && (
          <div className="flex flex-col h-full justify-center items-center text-center space-y-4 max-w-sm mx-auto">
            <span className="text-xs uppercase font-extrabold tracking-widest text-pink-400">
              Answer Reveal
            </span>
            <div className="text-3xl font-black text-white px-2">
              {currentQ.answer}
            </div>
            {mySubmission && (
              <div
                className={`w-full py-3 px-4 rounded-2xl font-bold text-sm border ${
                  mySubmission.status === 'correct'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500 text-rose-300'
                }`}
              >
                {mySubmission.status === 'correct'
                  ? `Correct! +${currentQ.points} Points`
                  : 'Incorrect'}
              </div>
            )}
            <p className="text-xs text-purple-200/60">
              Check the big screen for explanations & scores!
            </p>
          </div>
        )}

        {(room.phase === 'LEADERBOARD' || room.phase === 'ROUND_STATS') && (
          <div className="flex flex-col h-full justify-center items-center text-center space-y-4 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">
              {room.phase === 'ROUND_STATS' ? 'Round Completed' : 'Final Standings'}
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full text-center">
              <p className="text-xs text-purple-200/70 uppercase tracking-wider mb-1">Your Total Score</p>
              <p className="text-3xl font-black text-yellow-400 font-mono">{myPlayer?.score ?? 0} pts</p>
            </div>
            <p className="text-xs text-purple-200/60">
              Check the TV screen for full rankings and stats!
            </p>
          </div>
        )}
      </div>

      {/* Bottom Footer Info */}
      <div className="text-center text-[10px] text-purple-300/40 border-t border-white/5 pt-2 shrink-0">
        QuizCast Live Handset • Room {room.code}
      </div>
    </div>
  );
}
