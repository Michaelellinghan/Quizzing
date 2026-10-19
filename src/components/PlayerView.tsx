import React, { useState, useEffect } from 'react';
import { GameRoom, Player, ConfidenceLevel, SabotageType } from '../types/quiz';
import {
  Pencil,
  Check,
  Zap,
  Send,
  Trophy,
  Flame,
  Shuffle,
  Sparkles,
  Snowflake,
  Crosshair,
  Bomb
} from 'lucide-react';

interface PlayerViewProps {
  room: GameRoom;
  playerId: string;
  playerName: string;
  onBuzzIn: () => void;
  onSubmitAnswer: (answer: string) => void;
  onSubmitLie?: (lie: string) => void;
  onToggleDoubleDown?: () => void;
  onSetConfidence?: (level: ConfidenceLevel) => void;
  onSetHeistTarget?: (targetPlayerId: string) => void;
  onSabotagePlayer?: (targetPlayerId: string, sabotageType: SabotageType) => void;
  onClearSabotage?: () => void;
  latencyMs?: number;
  onUpdatePlayerName: (newName: string) => void;
}

const FUN_PUB_NAMES = [
  'Quizly Bears',
  'Smarty Pints',
  'Les Quizerables',
  'Agatha Quiztie',
  'Quiz Team Aguilera',
  'The Incurables',
  'No Eye Deer',
  'Tequila Mockingbird',
  'Universally Challenged',
  'Norfolk Enchants',
  'Obi-Wan Kenobi Nil',
  'The Fact Hunt'
];

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
  onSubmitLie,
  onToggleDoubleDown,
  onSetConfidence,
  onSetHeistTarget,
  onSabotagePlayer,
  onClearSabotage,
  onUpdatePlayerName
}: PlayerViewProps) {
  const hasSavedName = Boolean(playerName && playerName.trim() && playerName.trim() !== 'Player');
  const [isEditingName, setIsEditingName] = useState<boolean>(!hasSavedName);
  const [nameInput, setNameInput] = useState<string>(hasSavedName ? playerName : '');
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [numAnswer, setNumAnswer] = useState<string>('');
  const [iceTapsLeft, setIceTapsLeft] = useState<number>(0);
  const [showSabotageMenu, setShowSabotageMenu] = useState<boolean>(false);

  const currentQ = room.questions[room.currentQIndex];
  const mySubmission = room.submissions[playerId];
  const myLie = room.bluffLies?.[playerId];
  const myBuzzIndex = room.buzzes.findIndex((b) => b.playerId === playerId);
  const hasBuzzed = myBuzzIndex !== -1;
  const playersList = (Object.values(room.players || {}) as Player[]).sort((a, b) => b.score - a.score);
  const otherPlayers = playersList.filter((p) => p.id !== playerId);
  const myPlayer = room.players[playerId];
  const activeSabotage = myPlayer?.sabotageEffect;

  useEffect(() => {
    setTextAnswer('');
    setNumAnswer('');
    setShowSabotageMenu(false);
  }, [room.currentQIndex, room.phase]);

  useEffect(() => {
    if (activeSabotage?.type === 'ICE') {
      setIceTapsLeft(5);
    } else if (activeSabotage?.type === 'DRUNK' || activeSabotage?.type === 'MIRROR') {
      const timer = setTimeout(() => {
        onClearSabotage?.();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeSabotage?.nonce]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.trim();
    if (!cleaned) return;
    onUpdatePlayerName(cleaned);
    setIsEditingName(false);
  };

  const handleRandomName = () => {
    const pick = FUN_PUB_NAMES[Math.floor(Math.random() * FUN_PUB_NAMES.length)];
    setNameInput(pick);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textAnswer.trim() || !room.inputOpen) return;
    if (currentQ?.type === 'BLUFF' && room.bluffStage === 'ENTER_LIES') {
      onSubmitLie?.(textAnswer.trim());
    } else {
      onSubmitAnswer(textAnswer.trim());
    }
  };

  const handleNumPad = (key: string) => {
    if (!room.inputOpen) return;
    if (key === 'C') {
      setNumAnswer('');
    } else if (key === 'enter') {
      if (numAnswer.trim()) onSubmitAnswer(numAnswer.trim());
    } else if (numAnswer.length < 9) {
      setNumAnswer((prev) => prev + key);
    }
  };

  if (isEditingName) {
    return (
      <div className="h-full w-full flex flex-col justify-between p-5 bg-gradient-to-b from-[#1a0b2e] to-[#0f071e]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-black italic tracking-tight text-xl">
            <span>RAPID</span>
            <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 text-sm not-italic font-bold">TRIVIA</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-purple-300/70 bg-white/5 px-3 py-1 rounded-full">
            Room {room.code}
          </span>
        </div>

        <form onSubmit={handleSaveName} className="my-auto w-full max-w-sm mx-auto flex flex-col gap-3.5">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Pick your name
            </h1>
            <p className="text-xs text-purple-200/70">
              Type your name or roll a pub quiz team name
            </p>
          </div>

          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name or team..."
            maxLength={22}
            autoFocus
            className="w-full px-5 py-3.5 rounded-full bg-white/10 border-2 border-purple-400/30 focus:border-pink-500 focus:outline-none text-center text-lg font-bold text-white placeholder:text-purple-300/40"
          />

          <button
            type="button"
            onClick={handleRandomName}
            className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-[0.98] text-purple-200 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <Shuffle className="w-3.5 h-3.5 text-pink-400" />
            <span>Random Fun Team Name</span>
          </button>

          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="w-full py-3.5 rounded-full bg-[#ec4899] hover:bg-[#f472b6] active:scale-[0.98] disabled:opacity-40 text-white font-extrabold text-lg shadow-lg shadow-pink-500/30 transition"
          >
            Join Game
          </button>
        </form>

        <div className="text-center text-[11px] text-purple-300/40">
          Connected to Room {room.code}
        </div>
      </div>
    );
  }

  const sabotageClass =
    activeSabotage?.type === 'DRUNK'
      ? 'blur-[1.5px] rotate-2 scale-[0.98] transition-all'
      : activeSabotage?.type === 'MIRROR'
      ? 'scale-x-[-1] transition-all'
      : '';

  return (
    <div
      className={`h-full w-full max-w-md mx-auto flex flex-col justify-between p-4 bg-gradient-to-b from-[#1a0b2e] to-[#0f071e] overflow-hidden relative ${sabotageClass}`}
    >
      {activeSabotage?.type === 'ICE' && iceTapsLeft > 0 && (
        <div
          onClick={() => {
            if (iceTapsLeft <= 1) {
              setIceTapsLeft(0);
              onClearSabotage?.();
            } else {
              setIceTapsLeft(iceTapsLeft - 1);
            }
          }}
          className="absolute inset-0 z-50 bg-sky-500/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none"
        >
          <Snowflake className="w-16 h-16 text-white animate-spin mb-3" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">
            FROZEN BY {activeSabotage.fromName}!
          </h2>
          <p className="text-base font-extrabold text-sky-100 mt-2">
            Tap {iceTapsLeft} more {iceTapsLeft === 1 ? 'time' : 'times'} to shatter the ice!
          </p>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => {
            setNameInput(playerName);
            setIsEditingName(true);
          }}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3 py-1 rounded-full transition"
        >
          <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center font-bold text-[11px]">
            {playerName.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-bold text-xs truncate max-w-[110px]">{playerName}</span>
          <Pencil className="w-3 h-3 text-purple-300" />
        </button>

        <div className="flex items-center gap-1.5">
          {otherPlayers.length > 0 && (myPlayer?.score || 0) >= 5 && room.phase === 'QUESTION' && (
            <button
              type="button"
              onClick={() => setShowSabotageMenu(!showSabotageMenu)}
              className="flex items-center gap-1 bg-rose-500/20 border border-rose-400/40 text-rose-300 px-2.5 py-1 rounded-full text-[11px] font-extrabold"
            >
              <Bomb className="w-3 h-3" />
              <span>Sabotage</span>
            </button>
          )}
          {(myPlayer?.streak || 0) >= 3 && (
            <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-400/40 text-orange-300 px-2 py-1 rounded-full text-[11px] font-extrabold">
              <Flame className="w-3 h-3 fill-orange-400 text-orange-400" />
              <span>{myPlayer?.streak}</span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-extrabold text-xs">{myPlayer?.score ?? 0}</span>
          </div>
        </div>
      </div>

      {showSabotageMenu && (
        <div className="absolute inset-x-4 top-14 z-40 bg-[#241342] border border-pink-500/40 rounded-3xl p-4 shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-pink-300">
              Spend 5 pts to Sabotage a Rival
            </span>
            <button
              type="button"
              onClick={() => setShowSabotageMenu(false)}
              className="text-xs font-bold text-purple-300"
            >
              Close
            </button>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
            {otherPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-2xl">
                <span className="font-bold text-xs truncate max-w-[110px]">
                  {p.name} ({p.score})
                </span>
                <div className="flex items-center gap-1">
                  {(['ICE', 'DRUNK', 'MIRROR'] as SabotageType[]).map((sType) => (
                    <button
                      key={sType}
                      type="button"
                      onClick={() => {
                        onSabotagePlayer?.(p.id, sType);
                        setShowSabotageMenu(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-pink-500 text-white text-[10px] font-black"
                    >
                      {sType}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Center Stage */}
      <div className="flex-1 flex flex-col justify-center my-1 overflow-hidden">
        {room.phase === 'LOBBY' && (
          <div className="flex flex-col h-full justify-center space-y-3">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-extrabold leading-tight">
                <span className="text-pink-400">Host</span> is choosing the round.
              </h2>
              <p className="text-xs text-purple-200/70">
                Eyes on the TV — get your fingers ready!
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-3.5 flex flex-col max-h-[48vh]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-300/70 text-center mb-2">
                Connected players ({playersList.length})
              </p>
              <div className="space-y-1.5 overflow-y-auto no-scrollbar">
                {playersList.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-2xl"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-xl ${
                          AVATAR_COLORS[idx % AVATAR_COLORS.length]
                        } flex items-center justify-center font-extrabold text-[11px] text-white`}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-xs">
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
          <div className="flex flex-col h-full justify-between py-0.5">
            <div className="text-center space-y-1 shrink-0">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                  {room.currentPackTitle?.startsWith('Cash Builder:')
                    ? `Question ${room.currentQIndex + 1}`
                    : `Q${room.currentQIndex + 1}/${room.questions.length}`}
                </span>

                {currentQ.type === 'CLUES' && (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    Clue {(room.clueStep || 0) + 1} · {Math.max(5, 20 - (room.clueStep || 0) * 5)} pts
                  </span>
                )}

                {onToggleDoubleDown && !myPlayer?.doubleDownUsed && !mySubmission && (
                  <button
                    type="button"
                    disabled={!room.inputOpen}
                    onClick={onToggleDoubleDown}
                    className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition ${
                      myPlayer?.doubleDownActive
                        ? 'bg-yellow-400 text-slate-950 border-yellow-300'
                        : 'bg-white/5 text-yellow-300 border-yellow-400/40'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{myPlayer?.doubleDownActive ? '2x ACTIVE' : '2x Token'}</span>
                  </button>
                )}
              </div>

              {!mySubmission && currentQ.type !== 'CLUES' && currentQ.type !== 'NUMBER' && (
                <div className="flex items-center justify-center gap-1">
                  {(
                    [
                      { id: 'SAFE', label: 'Safe (+3)' },
                      { id: 'NORMAL', label: 'Std (+10)' },
                      { id: 'ALL_IN', label: 'All-In (+15/-10)' }
                    ] as { id: ConfidenceLevel; label: string }[]
                  ).map((c) => {
                    const active = (myPlayer?.confidence || 'NORMAL') === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSetConfidence?.(c.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition ${
                          active
                            ? 'bg-pink-500 text-white border-pink-400'
                            : 'bg-white/5 text-purple-300 border-white/10'
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {room.heistActive && otherPlayers.length > 0 && (
                <div className="flex items-center justify-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  <Crosshair className="w-3 h-3 text-rose-400 shrink-0" />
                  <span className="text-[10px] font-bold text-rose-300 shrink-0">Steal 10:</span>
                  {otherPlayers.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSetHeistTarget?.(p.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                        myPlayer?.heistTargetId === p.id
                          ? 'bg-rose-500 text-white'
                          : 'bg-white/10 text-purple-200'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              <h2 className="text-sm sm:text-base font-extrabold leading-snug text-white line-clamp-2 px-1">
                {currentQ.type === 'CLUES' && currentQ.clues
                  ? currentQ.clues[room.clueStep || 0]
                  : currentQ.question}
              </h2>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2 my-1">
              {(currentQ.type === 'MCQ' && currentQ.options && currentQ.options.length > 0) ||
              (currentQ.type === 'BLUFF' && room.bluffStage === 'VOTE') ? (
                (currentQ.type === 'BLUFF' ? room.bluffOptions || [] : currentQ.options || []).map((opt) => {
                  const isSelected = mySubmission?.answer === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={!room.inputOpen}
                      onClick={() => onSubmitAnswer(opt)}
                      className={`w-full py-2.5 px-5 rounded-full font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                        isSelected
                          ? 'bg-yellow-400 text-slate-950 scale-[1.02]'
                          : 'bg-[#ec4899] hover:bg-[#f472b6] text-white active:scale-[0.98]'
                      } disabled:opacity-50`}
                    >
                      <span className="truncate">{opt}</span>
                      {isSelected && <Check className="w-4 h-4 stroke-[3] shrink-0" />}
                    </button>
                  );
                })
              ) : currentQ.type === 'NUMBER' ? (
                <div className="flex flex-col gap-1 max-w-[240px] w-full mx-auto">
                  <div className="w-full py-1.5 px-4 rounded-xl bg-orange-950/60 border border-orange-500/40 text-center font-black text-lg text-orange-200">
                    {numAnswer || (mySubmission ? mySubmission.answer : '0')}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'enter'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        disabled={!room.inputOpen}
                        onClick={() => handleNumPad(k)}
                        className={`py-2 rounded-xl font-black text-sm uppercase transition active:scale-95 ${
                          k === 'C' || k === 'enter'
                            ? 'bg-orange-800 text-orange-100'
                            : 'bg-orange-500 text-slate-950'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              ) : currentQ.type === 'BUZZER' ? (
                <div className="flex flex-col items-center justify-center my-auto">
                  <button
                    type="button"
                    disabled={!room.inputOpen || hasBuzzed}
                    onClick={onBuzzIn}
                    className={`w-40 h-40 rounded-full font-black text-2xl uppercase tracking-wider shadow-2xl transition-all flex flex-col items-center justify-center gap-1.5 ${
                      hasBuzzed
                        ? 'bg-emerald-500 text-white scale-95'
                        : room.inputOpen
                        ? 'bg-gradient-to-b from-pink-500 to-rose-600 text-white active:scale-90 border-4 border-pink-300/40'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    <Zap className="w-8 h-8" />
                    <span>{hasBuzzed ? `#${myBuzzIndex + 1} In!` : room.inputOpen ? 'BUZZ!' : 'Locked'}</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendText} className="flex flex-col gap-2 my-auto">
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    disabled={!room.inputOpen}
                    placeholder={
                      currentQ.type === 'BLUFF'
                        ? myLie
                          ? `Fake answer saved: "${myLie}"`
                          : 'Write a convincing fake answer...'
                        : mySubmission
                        ? `Locked in: ${mySubmission.answer}`
                        : 'Type your answer...'
                    }
                    className="w-full px-5 py-3 rounded-full bg-white/10 border-2 border-purple-400/30 focus:border-pink-500 focus:outline-none text-center text-base font-bold text-white placeholder:text-purple-300/50"
                  />
                  <button
                    type="submit"
                    disabled={!room.inputOpen || !textAnswer.trim()}
                    className="w-full py-3 rounded-full bg-[#ec4899] hover:bg-[#f472b6] active:scale-[0.98] disabled:opacity-40 text-white font-extrabold text-base shadow-lg flex items-center justify-center gap-2 transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {currentQ.type === 'BLUFF'
                        ? myLie
                          ? 'Update Fake Answer'
                          : 'Submit Fake Answer'
                        : mySubmission
                        ? 'Update Answer'
                        : 'Submit Answer'}
                    </span>
                  </button>
                  {mySubmission && (
                    <p className="text-center text-xs font-bold text-emerald-400">
                      Submitted: "{mySubmission.answer}"
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        )}

        {(room.phase === 'REVEAL' || room.phase === 'ROUND_STATS' || room.phase === 'LEADERBOARD') && (
          <div className="flex flex-col items-center justify-center text-center space-y-3 my-auto">
            {room.phase === 'REVEAL' && currentQ ? (
              <>
                <span className="text-xs font-bold uppercase tracking-widest text-purple-300">
                  Official Answer
                </span>
                <div className="w-full py-4 px-5 rounded-3xl bg-[#ec4899] text-white font-extrabold text-xl shadow-lg">
                  {currentQ.answer}
                </div>
                {mySubmission && (
                  <div
                    className={`w-full py-3 px-4 rounded-2xl text-sm font-extrabold border ${
                      mySubmission.status === 'correct'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : mySubmission.status === 'wrong'
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                        : 'bg-amber-500/20 border-amber-400 text-amber-200'
                    }`}
                  >
                    {mySubmission.status === 'correct'
                      ? `Correct! "${mySubmission.answer}" (+${mySubmission.pointsAwarded || 10} pts)`
                      : mySubmission.status === 'wrong'
                      ? `Incorrect ("${mySubmission.answer}")`
                      : `Submitted "${mySubmission.answer}" — Awaiting Host Ruling`}
                  </div>
                )}
              </>
            ) : (
              <>
                <Trophy className="w-12 h-12 text-yellow-400" />
                <h2 className="text-2xl font-extrabold">Check the TV Podium!</h2>
                <p className="text-purple-200">
                  Total Score: <span className="text-yellow-400 font-extrabold">{myPlayer?.score ?? 0}</span> pts
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Logo */}
      <div className="pt-0.5 flex items-center justify-center shrink-0">
        <div className="flex items-center gap-1 font-black italic tracking-tight text-xs opacity-70">
          <span>RAPID</span>
          <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-400 text-[10px] not-italic font-bold">TRIVIA · ROOM {room.code}</span>
        </div>
      </div>
    </div>
  );
}
