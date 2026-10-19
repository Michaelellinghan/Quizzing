import React, { useState, useEffect } from 'react';
import { GameRoom, Player } from '../types/quiz';
import {
  Pencil,
  Check,
  Zap,
  Send,
  Trophy,
  Dices,
  Flame,
  Skull,
  Clock,
  Award,
  CornerDownLeft,
  X,
  Target,
  AlertTriangle
} from 'lucide-react';

interface PlayerViewProps {
  room: GameRoom;
  playerId: string;
  playerName: string;
  onBuzzIn: (options?: { doubleDown?: boolean }) => void;
  onSubmitAnswer: (answer: string, options?: { doubleDown?: boolean; pointHeist?: boolean }) => void;
  latencyMs?: number;
  onUpdatePlayerName: (newName: string) => void;
  onTriggerSabotage?: (targetPlayerId: string, type: 'ink' | 'frost' | 'scramble') => void;
  onClearSabotage?: (targetPlayerId?: string) => void;
  onSubmitBluff?: (text: string) => void;
  onVoteBluff?: (targetPlayerId: string) => void;
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

const PUB_TEAM_NAMES = [
  'Quiz Quiz Bang Bang',
  'Les Quizerables',
  'The Smarty Pints',
  'Tequila Mockingbird',
  'Universally Challenged',
  'Agatha Quiztie',
  'Quiztopher Nolan',
  'E = MC Hammer',
  'Fact or Fiction',
  'The Quizzards of Oz',
  'Sherlock Homies',
  'Menace II Sobriety',
  'Trivia Newton John',
  'Risky Quizness',
  'Let’s Get Quizzical',
  'Know It Owls',
  'John Trivialta',
  'The Brainy Bunch',
  'Red Hot Chili Preppers',
  'Quizness as Usual'
];

export function PlayerView({
  room,
  playerId,
  playerName,
  onBuzzIn,
  onSubmitAnswer,
  onUpdatePlayerName,
  onTriggerSabotage,
  onClearSabotage,
  onSubmitBluff,
  onVoteBluff
}: PlayerViewProps) {
  const hasSavedName = Boolean(playerName && playerName.trim() && playerName.trim() !== 'Player');
  const [isEditingName, setIsEditingName] = useState<boolean>(!hasSavedName);
  const [nameInput, setNameInput] = useState<string>(hasSavedName ? playerName : '');
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [numericAnswer, setNumericAnswer] = useState<string>('');
  const [bluffInput, setBluffInput] = useState<string>('');

  // Interactive Mechanics State
  const [isDoubleDownActive, setIsDoubleDownActive] = useState<boolean>(false);
  const [isPointHeistActive, setIsPointHeistActive] = useState<boolean>(false);
  const [showSabotageModal, setShowSabotageModal] = useState<boolean>(false);
  const [inkTapsRemaining, setInkTapsRemaining] = useState<number>(3);

  const currentQ = room.questions[room.currentQIndex];
  const mySubmission = room.submissions[playerId];
  const myBuzzIndex = room.buzzes.findIndex((b) => b.playerId === playerId);
  const hasBuzzed = myBuzzIndex !== -1;
  const playersList = (Object.values(room.players || {}) as Player[]).sort((a, b) => b.score - a.score);
  const myPlayer = room.players[playerId];

  const doubleDownTokens = myPlayer?.doubleDownTokens ?? 2;
  const sabotageTokens = myPlayer?.sabotageTokens ?? 1;
  const pointHeistAvailable = myPlayer?.pointHeistAvailable ?? true;
  const activeSabotage = myPlayer?.activeSabotage;

  // Clear answers when question or phase changes
  useEffect(() => {
    setTextAnswer('');
    setNumericAnswer('');
    setBluffInput('');
    setIsDoubleDownActive(false);
    setIsPointHeistActive(false);
  }, [room.currentQIndex, room.phase]);

  // Ink tap recovery
  useEffect(() => {
    if (activeSabotage?.type === 'ink') {
      setInkTapsRemaining(3);
    }
  }, [activeSabotage]);

  const handlePickRandomName = () => {
    const randomPick = PUB_TEAM_NAMES[Math.floor(Math.random() * PUB_TEAM_NAMES.length)];
    setNameInput(randomPick);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.trim();
    if (!cleaned) return;
    onUpdatePlayerName(cleaned);
    setIsEditingName(false);
  };

  const handleBuzzWithDoubleDown = () => {
    onBuzzIn({ doubleDown: isDoubleDownActive });
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textAnswer.trim() || !room.inputOpen) return;
    onSubmitAnswer(textAnswer.trim(), {
      doubleDown: isDoubleDownActive,
      pointHeist: isPointHeistActive
    });
  };

  const handleSendNumeric = () => {
    if (!numericAnswer.trim() || !room.inputOpen) return;
    onSubmitAnswer(numericAnswer.trim(), {
      doubleDown: isDoubleDownActive,
      pointHeist: isPointHeistActive
    });
  };

  const handleNumKeyPress = (key: string) => {
    if (key === 'CLEAR') {
      setNumericAnswer('');
    } else if (key === 'BACKSPACE') {
      setNumericAnswer((prev) => prev.slice(0, -1));
    } else if (key === '+1') {
      setNumericAnswer((prev) => String((parseFloat(prev) || 0) + 1));
    } else if (key === '-1') {
      setNumericAnswer((prev) => String((parseFloat(prev) || 0) - 1));
    } else {
      setNumericAnswer((prev) => (prev.length < 10 ? prev + key : prev));
    }
    if (navigator?.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleCleanInkTap = () => {
    const next = inkTapsRemaining - 1;
    if (next <= 0) {
      onClearSabotage?.(playerId);
      setInkTapsRemaining(0);
    } else {
      setInkTapsRemaining(next);
    }
    if (navigator?.vibrate) {
      navigator.vibrate(25);
    }
  };

  const handleSendSabotage = (targetPlayerId: string, type: 'ink' | 'frost' | 'scramble') => {
    onTriggerSabotage?.(targetPlayerId, type);
    setShowSabotageModal(false);
  };

  // Find if this player won a superlative
  const mySuperlative = room.superlatives?.find((s) => s.recipientName === playerName);

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

        <form onSubmit={handleSaveName} className="my-auto w-full max-w-sm mx-auto flex flex-col gap-4">
          <div className="text-center space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Enter your name</h1>
            <p className="text-xs text-purple-200/70">Pick the name that will appear on the big screen</p>
          </div>

          <div className="relative">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name or team..."
              maxLength={22}
              autoFocus
              className="w-full px-5 py-4 rounded-2xl bg-white/10 border-2 border-purple-400/30 focus:border-pink-500 focus:outline-none text-center text-xl font-bold text-white placeholder:text-purple-300/40 shadow-inner"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePickRandomName}
              className="flex-1 py-3 px-4 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/40 text-purple-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
            >
              <Dices className="w-4 h-4 text-amber-400" />
              <span>Random Team Name</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 active:scale-[0.98] disabled:opacity-40 text-white font-black text-xl shadow-lg shadow-pink-500/30 transition cursor-pointer"
          >
            Join Game
          </button>
        </form>

        <div className="text-center text-xs text-purple-300/40">Connected to Room {room.code}</div>
      </div>
    );
  }

  // 2. MAIN ZERO-SCROLL HANDSET VIEW
  const isQuestionNumeric = currentQ?.type === 'NUMERIC' || (currentQ && /^\d+$/.test(currentQ.answer.trim()));
  const isBluffVotingPhase = room.bluffMode?.active && room.bluffMode.phase === 'voting';
  const isBluffWritingPhase = room.bluffMode?.active && room.bluffMode.phase === 'bluffing';

  return (
    <div
      className={`h-[100dvh] w-full max-w-md mx-auto flex flex-col justify-between p-4 bg-gradient-to-b from-[#1a0b2e] to-[#0f071e] overflow-hidden relative select-none ${
        activeSabotage?.type === 'scramble' ? 'animate-bounce' : ''
      }`}
    >
      {/* ON-SCREEN SABOTAGE OVERLAYS */}
      {activeSabotage?.type === 'ink' && (
        <div
          onClick={handleCleanInkTap}
          className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md cursor-pointer animate-fade-in"
        >
          <div className="w-24 h-24 rounded-full bg-slate-900 border-4 border-rose-500 flex items-center justify-center mb-4 animate-pulse">
            <Skull className="w-12 h-12 text-rose-500" />
          </div>
          <h3 className="text-2xl font-black text-white mb-1">INK SPLAT SABOTAGE!</h3>
          <p className="text-sm text-rose-300 font-semibold mb-4">
            {activeSabotage.fromName} splattered black ink over your controller!
          </p>
          <div className="px-6 py-3 rounded-full bg-rose-600 text-white font-extrabold text-lg shadow-xl shadow-rose-600/40 animate-bounce">
            TAP SCREEN TO WIPE INK ({inkTapsRemaining} left)
          </div>
        </div>
      )}

      {activeSabotage?.type === 'frost' && (
        <div className="absolute inset-x-0 top-0 p-2 z-40 bg-sky-500/90 text-slate-950 font-black text-center text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-slate-950" />
          <span>FROST DELAY: {activeSabotage.fromName} froze your buzzer!</span>
        </div>
      )}

      {/* TOP HEADER: Player Identity, Score & Power-Up Counters */}
      <div className="flex items-center justify-between shrink-0 gap-2">
        <button
          type="button"
          onClick={() => {
            setNameInput(playerName);
            setIsEditingName(true);
          }}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full transition cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center font-bold text-xs text-white">
            {playerName ? playerName.slice(0, 2).toUpperCase() : 'PL'}
          </div>
          <span className="font-bold text-xs truncate max-w-[110px]">{playerName || 'Player'}</span>
          <Pencil className="w-3 h-3 text-purple-300" />
        </button>

        {/* 20s Auto-Timer Countdown Pill */}
        {room.phase === 'QUESTION' && room.timer?.running && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black font-mono border transition-all ${
              room.timer.remainingSec <= 5
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse scale-105 shadow-md shadow-rose-600/40'
                : 'bg-indigo-900/80 text-amber-300 border-indigo-500/50'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{room.timer.remainingSec}s</span>
          </div>
        )}

        {/* Score & Streak */}
        <div className="flex items-center gap-2">
          {myPlayer?.streak && myPlayer.streak > 1 ? (
            <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-full text-xs font-extrabold">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{myPlayer.streak}🔥</span>
            </div>
          ) : null}

          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-black text-xs text-white">{myPlayer?.score ?? 0}</span>
          </div>
        </div>
      </div>

      {/* POWER-UP ACTION BAR (During Question Phase) */}
      {room.phase === 'QUESTION' && room.inputOpen && (
        <div className="flex items-center justify-between gap-1.5 shrink-0 my-1">
          {/* Double-Down 2x Token Toggle */}
          <button
            type="button"
            disabled={doubleDownTokens <= 0 || hasBuzzed || Boolean(mySubmission)}
            onClick={() => setIsDoubleDownActive((prev) => !prev)}
            className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all border ${
              isDoubleDownActive
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30 scale-102 font-black'
                : doubleDownTokens > 0
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
                : 'bg-white/5 border-white/5 text-slate-500 opacity-40 cursor-not-allowed'
            }`}
          >
            <Zap className={`w-3 h-3 ${isDoubleDownActive ? 'fill-slate-950' : 'text-amber-400'}`} />
            <span>2x Double Down ({doubleDownTokens})</span>
          </button>

          {/* Point Heist Toggle */}
          <button
            type="button"
            disabled={!pointHeistAvailable || hasBuzzed || Boolean(mySubmission)}
            onClick={() => setIsPointHeistActive((prev) => !prev)}
            className={`py-1.5 px-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all border ${
              isPointHeistActive
                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-300 shadow-md shadow-rose-500/30 scale-102'
                : pointHeistAvailable
                ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                : 'bg-white/5 border-white/5 text-slate-500 opacity-40 cursor-not-allowed'
            }`}
            title="Steal 10 points from 1st place if correct!"
          >
            <Target className="w-3 h-3" />
            <span>Heist</span>
          </button>

          {/* Sabotage Trigger Button */}
          {sabotageTokens > 0 && (
            <button
              type="button"
              onClick={() => setShowSabotageModal(true)}
              className="py-1.5 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Skull className="w-3 h-3 text-purple-300" />
              <span>Sabotage</span>
            </button>
          )}
        </div>
      )}

      {/* CENTER STAGE: Zero Scrolling Adaptive View */}
      <div className="flex-1 flex flex-col justify-center my-2 overflow-hidden">
        {/* LOBBY PHASE */}
        {room.phase === 'LOBBY' && (
          <div className="flex flex-col h-full justify-center space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black leading-tight text-white">
                <span className="text-pink-400">Host</span> is setting up.
              </h2>
              <p className="text-xs text-purple-200/70">Eyes on the TV screen — quiz starting shortly!</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col max-h-[50dvh]">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-300/70 text-center mb-2.5">
                Connected players ({playersList.length})
              </p>
              <div className="space-y-1.5 overflow-y-auto no-scrollbar">
                {playersList.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg ${
                          AVATAR_COLORS[idx % AVATAR_COLORS.length]
                        } flex items-center justify-center font-extrabold text-[11px] text-white`}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-white">
                        {p.name} {p.id === playerId && '(You)'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-purple-300 font-bold">{p.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* QUESTION PHASE */}
        {room.phase === 'QUESTION' && currentQ && (
          <div className="flex flex-col h-full justify-between py-1">
            {/* Question Header & Clues */}
            <div className="text-center space-y-1 shrink-0">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                  Q{room.currentQIndex + 1} of {room.questions.length} • {currentQ.points} pts
                </span>
                {isDoubleDownActive && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono shadow-sm">
                    2X ACTIVE
                  </span>
                )}
                {isPointHeistActive && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono shadow-sm">
                    HEIST ACTIVE
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-black leading-snug text-white line-clamp-3 px-1">
                {currentQ.question}
              </h2>

              {/* Progressive Clue Banner if revealed */}
              {room.progressiveClueIndex && room.progressiveClueIndex > 0 && currentQ.progressiveClues && (
                <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                  💡 Clue: {currentQ.progressiveClues[room.progressiveClueIndex - 1]}
                </div>
              )}
            </div>

            {/* FIBBAGE / BLUFFING MODE: Submitting bluff */}
            {isBluffWritingPhase ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!bluffInput.trim()) return;
                  onSubmitBluff?.(bluffInput.trim());
                }}
                className="flex flex-col gap-3 my-auto"
              >
                <div className="text-center">
                  <span className="text-xs uppercase font-extrabold text-amber-400">Bluffing Round</span>
                  <p className="text-xs text-slate-300">Write a fake answer to trick other players!</p>
                </div>
                <input
                  type="text"
                  value={bluffInput}
                  onChange={(e) => setBluffInput(e.target.value)}
                  placeholder="Enter your convincing lie..."
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/10 border-2 border-amber-400/40 text-center font-bold text-white placeholder:text-purple-300/40"
                />
                <button
                  type="submit"
                  disabled={!bluffInput.trim()}
                  className="w-full py-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider"
                >
                  Submit Fake Answer
                </button>
              </form>
            ) : isBluffVotingPhase && room.bluffMode?.bluffs ? (
              /* FIBBAGE VOTING: Pick the real answer */
              <div className="flex flex-col gap-2 my-auto">
                <span className="text-center text-xs font-bold text-pink-300 mb-1">
                  Pick the TRUE answer:
                </span>
                {Object.values(room.bluffMode.bluffs)
                  .concat([
                    {
                      playerId: 'REAL',
                      playerName: 'Truth',
                      text: currentQ.answer,
                      votes: []
                    }
                  ])
                  .sort(() => 0.5 - Math.random())
                  .map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={!room.inputOpen}
                      onClick={() => onVoteBluff?.(item.playerId)}
                      className="w-full py-3 px-4 rounded-xl font-extrabold text-sm bg-[#ec4899] hover:bg-[#f472b6] text-white active:scale-98 shadow-md"
                    >
                      {item.text}
                    </button>
                  ))}
              </div>
            ) : isQuestionNumeric ? (
              /* NUMERIC KEYPAD INTERFACE */
              <div className="flex flex-col gap-2 my-auto max-w-xs mx-auto w-full">
                {/* Numeric Display */}
                <div className="bg-slate-950/80 border-2 border-purple-500/40 rounded-2xl p-2.5 text-center flex items-center justify-between px-4">
                  <div className="text-xl font-mono font-black text-yellow-400 tracking-wider">
                    {numericAnswer || '0'}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleNumKeyPress('-1')}
                      className="px-2 py-1 rounded bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumKeyPress('+1')}
                      className="px-2 py-1 rounded bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* Keypad Grid 0-9 */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BACKSPACE'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleNumKeyPress(btn)}
                      className="py-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-mono font-bold text-lg flex items-center justify-center transition shadow-sm"
                    >
                      {btn === 'BACKSPACE' ? <CornerDownLeft className="w-5 h-5 text-rose-400" /> : btn}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!room.inputOpen || !numericAnswer.trim()}
                  onClick={handleSendNumeric}
                  className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-400 active:scale-98 text-white font-black text-base shadow-lg shadow-pink-500/30 uppercase tracking-wider disabled:opacity-40"
                >
                  {mySubmission ? `Locked: ${mySubmission.answer}` : 'Lock In Number'}
                </button>
              </div>
            ) : currentQ.type === 'MCQ' && currentQ.options && currentQ.options.length > 0 ? (
              /* MCQ BUTTON PILLS */
              <div className="flex flex-col justify-center gap-2.5 my-2">
                {currentQ.options.map((opt) => {
                  const isSelected = mySubmission?.answer === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={!room.inputOpen}
                      onClick={() =>
                        onSubmitAnswer(opt, {
                          doubleDown: isDoubleDownActive,
                          pointHeist: isPointHeistActive
                        })
                      }
                      className={`w-full py-3.5 px-5 rounded-2xl font-extrabold text-base transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                        isSelected
                          ? 'bg-yellow-400 text-slate-950 scale-[1.02] shadow-yellow-400/30'
                          : 'bg-[#ec4899] hover:bg-[#f472b6] text-white active:scale-[0.98] shadow-pink-500/25'
                      } disabled:opacity-50`}
                    >
                      <span className="truncate">{opt}</span>
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            ) : currentQ.type === 'BUZZER' ? (
              /* BUZZER BUTTON */
              <div className="flex flex-col items-center justify-center my-auto">
                <button
                  type="button"
                  disabled={!room.inputOpen || hasBuzzed}
                  onClick={handleBuzzWithDoubleDown}
                  className={`w-48 h-48 rounded-full font-black text-2xl uppercase tracking-wider shadow-2xl transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    hasBuzzed
                      ? 'bg-emerald-500 text-white scale-95 shadow-emerald-500/40'
                      : room.inputOpen
                      ? isDoubleDownActive
                        ? 'bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 active:scale-90 shadow-amber-500/50 border-4 border-yellow-200'
                        : 'bg-gradient-to-b from-pink-500 to-rose-600 text-white active:scale-90 shadow-pink-500/40 border-4 border-pink-300/40'
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-9 h-9" />
                  <span>{hasBuzzed ? `#${myBuzzIndex + 1} IN!` : room.inputOpen ? 'BUZZ!' : 'LOCKED'}</span>
                  {isDoubleDownActive && !hasBuzzed && (
                    <span className="text-[10px] font-bold text-slate-900 bg-yellow-300/80 px-2 py-0.5 rounded-full">
                      2X WAGER
                    </span>
                  )}
                </button>
              </div>
            ) : (
              /* TEXT INPUT FORM */
              <form onSubmit={handleSendText} className="flex flex-col gap-2.5 my-auto">
                <input
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  disabled={!room.inputOpen}
                  placeholder={mySubmission ? `Submitted: ${mySubmission.answer}` : 'Type your answer...'}
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/10 border-2 border-purple-400/30 focus:border-pink-500 focus:outline-none text-center text-base font-bold text-white placeholder:text-purple-300/40 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!room.inputOpen || !textAnswer.trim()}
                  className="w-full py-3 rounded-2xl bg-pink-500 hover:bg-pink-400 active:scale-[0.98] disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-pink-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{mySubmission ? 'Update Answer' : 'Submit Answer'}</span>
                </button>
              </form>
            )}

            {/* Bottom Status / Feedback */}
            <div className="text-center text-[11px] text-purple-200/70 shrink-0">
              {hasBuzzed ? (
                <span className="text-emerald-400 font-bold">You buzzed in #{myBuzzIndex + 1}! Shout your answer.</span>
              ) : mySubmission ? (
                <span className="text-emerald-400 font-bold">Recorded: "{mySubmission.answer}"</span>
              ) : (
                <span>Room {room.code} • {room.inputOpen ? 'Tap an option or buzz in' : 'Answers locked'}</span>
              )}
            </div>
          </div>
        )}

        {/* REVEAL PHASE */}
        {room.phase === 'REVEAL' && currentQ && (
          <div className="flex flex-col h-full justify-center items-center text-center space-y-3 max-w-sm mx-auto">
            <span className="text-[11px] uppercase font-extrabold tracking-widest text-pink-400">Answer Reveal</span>
            <div className="text-2xl sm:text-3xl font-black text-white px-2 leading-tight">
              {currentQ.answer}
            </div>

            {mySubmission && (
              <div
                className={`w-full py-3 px-4 rounded-2xl font-bold text-xs border ${
                  mySubmission.status === 'correct'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500 text-rose-300'
                }`}
              >
                <div className="text-sm font-extrabold">
                  {mySubmission.status === 'correct'
                    ? `Correct! +${mySubmission.pointsAwarded ?? currentQ.points} Points`
                    : 'Incorrect'}
                </div>
                {mySubmission.speedBonusAwarded ? (
                  <div className="text-yellow-400 font-mono mt-1">
                    ⚡ Fastest Finger Bonus: +{mySubmission.speedBonusAwarded} pts!
                  </div>
                ) : null}
                {mySubmission.doubleDown && mySubmission.status === 'correct' ? (
                  <div className="text-amber-300 font-bold mt-0.5">🪙 2X Double-Down cashed in!</div>
                ) : null}
              </div>
            )}

            <p className="text-[11px] text-purple-200/60">Check the TV screen for full stats & rankings!</p>
          </div>
        )}

        {/* LEADERBOARD & ROUND STATS */}
        {(room.phase === 'LEADERBOARD' || room.phase === 'ROUND_STATS') && (
          <div className="flex flex-col h-full justify-center items-center text-center space-y-3 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
              <Trophy className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white">
              {room.phase === 'ROUND_STATS' ? 'Round Completed' : 'Final Standings'}
            </h2>

            {/* My Superlative Accolade */}
            {mySuperlative && (
              <div className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
                <span className="text-xl">{mySuperlative.icon}</span>
                <div>
                  <div className="font-black text-white uppercase">{mySuperlative.award}</div>
                  <div className="text-[10px] text-amber-200">{mySuperlative.detail}</div>
                </div>
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 w-full text-center">
              <p className="text-[10px] text-purple-200/70 uppercase tracking-wider mb-0.5">Your Total Score</p>
              <p className="text-3xl font-black text-yellow-400 font-mono">{myPlayer?.score ?? 0} pts</p>
            </div>
          </div>
        )}
      </div>

      {/* SABOTAGE TARGET MODAL */}
      {showSabotageModal && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col justify-end p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-purple-400" />
                <span className="font-black text-white text-sm">LAUNCH SABOTAGE</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSabotageModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">Choose a rival team to disrupt:</p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
              {playersList
                .filter((p) => p.id !== playerId)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl text-xs"
                  >
                    <span className="font-bold text-white truncate max-w-[120px]">{p.name}</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendSabotage(p.id, 'ink')}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]"
                      >
                        Ink Splat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendSabotage(p.id, 'frost')}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px]"
                      >
                        Freeze
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER BAR */}
      <div className="text-center text-[10px] text-purple-300/40 border-t border-white/5 pt-1.5 shrink-0 flex items-center justify-between">
        <span>Room {room.code}</span>
        <span>QuizCast Live Handset</span>
      </div>
    </div>
  );
}
