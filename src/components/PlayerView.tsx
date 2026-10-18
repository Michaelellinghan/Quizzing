import React, { useState, useEffect } from 'react';
import { GameRoom, Question } from '../types/quiz';
import { soundEffects } from '../utils/soundEffects';
import { Zap, Flame, Trophy, Lock, CheckCircle2, XCircle, Send, Radio, Edit3, Check, User } from 'lucide-react';

interface PlayerViewProps {
  room: GameRoom;
  playerId: string;
  playerName: string;
  onBuzzIn: () => void;
  onSubmitAnswer: (answer: string) => void;
  latencyMs: number;
  onUpdatePlayerName?: (newName: string) => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  room,
  playerId,
  playerName,
  onBuzzIn,
  onSubmitAnswer,
  latencyMs,
  onUpdatePlayerName
}) => {
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [buzzerActiveAnim, setBuzzerActiveAnim] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(() => {
    return !playerName || playerName === 'Player' || !localStorage.getItem('quizcast_player_name');
  });
  const [nameInput, setNameInput] = useState<string>(playerName === 'Player' ? '' : playerName);

  const player = room.players[playerId];
  const currentQ: Question | undefined = room.questions[room.currentQIndex];

  // Check if player has already buzzed in for current question
  const myBuzz = room.buzzes.find((b) => b.playerId === playerId);
  const mySubmission = room.submissions[playerId];

  // Reset local answer choices when question changes
  useEffect(() => {
    setTextAnswer('');
    setSelectedOption(null);
  }, [room.currentQIndex]);

  // Handle buzzer tap with haptic vibration
  const handleBuzzerTap = () => {
    if (!room.inputOpen || myBuzz) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60);
    }
    setBuzzerActiveAnim(true);
    setTimeout(() => setBuzzerActiveAnim(false), 200);

    soundEffects.play('buzzer');
    onBuzzIn();
  };

  const handleOptionSelect = (option: string) => {
    if (!room.inputOpen || mySubmission) return;
    setSelectedOption(option);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
    soundEffects.play('ding');
    onSubmitAnswer(option);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textAnswer.trim()) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
    soundEffects.play('ding');
    onSubmitAnswer(textAnswer.trim());
  };

  const OPTION_LABELS = ['A', 'B', 'C', 'D'];

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col gap-4 flex-1 justify-between min-h-[calc(100vh-80px)]">
      
      {/* 1. PLAYER STATUS HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white text-lg shadow-sm">
            {playerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Player / Team</div>
            <div className="font-extrabold text-white text-base leading-tight truncate max-w-[150px]">
              {playerName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {player && player.streak > 1 && (
            <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-700/60 text-rose-300 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
              <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span>{player.streak}</span>
            </div>
          )}

          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-xl text-sm font-black font-mono shadow-sm">
            {player?.score ?? 0} pts
          </div>
        </div>
      </div>

      {/* 2. GAME HANDSET BODY ACCORDING TO PHASE */}
      <div className="flex-1 flex flex-col justify-center items-center text-center my-auto py-2">
        
        {/* LOBBY STATE */}
        {room.phase === 'LOBBY' && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 w-full flex flex-col items-center gap-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>

            <h2 className="text-2xl font-black text-white">
              You're In The Game!
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed max-w-xs">
              Room <span className="font-mono font-bold text-amber-400">{room.code}</span>
            </p>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 w-full">
              Keep this screen open on your phone. When the host unlocks the question, your buzzer and choices will appear here instantly with low-latency!
            </div>
          </div>
        )}

        {/* QUESTION STATE: BUZZER / MCQ / TEXT */}
        {room.phase === 'QUESTION' && currentQ && (
          <div className="w-full flex flex-col items-center gap-5">
            
            {/* Question Brief Badge */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Q{room.currentQIndex + 1}: {currentQ.category}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                {currentQ.points} Pts
              </span>
            </div>

            {/* Question Text */}
            <h3 className="text-lg md:text-xl font-bold text-white max-w-sm">
              {currentQ.question}
            </h3>

            {/* A. BUZZER MODE with Optional Free-Text Answer Input */}
            {currentQ.type === 'BUZZER' && (
              <div className="w-full flex flex-col items-center py-2 max-w-sm">
                {/* Giant Tactile Buzzer Button */}
                <button
                  type="button"
                  disabled={!!myBuzz}
                  onClick={handleBuzzerTap}
                  className={`relative w-56 h-56 rounded-full flex flex-col items-center justify-center font-black transition-all select-none touch-manipulation cursor-pointer ${
                    myBuzz
                      ? 'bg-amber-500 border-8 border-amber-300 text-slate-950 shadow-[0_0_40px_rgba(245,158,11,0.5)]'
                      : !room.inputOpen
                      ? 'bg-gradient-to-b from-amber-600 to-amber-700 border-8 border-amber-900 text-white shadow-[0_10px_0_#451a03]'
                      : 'bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 border-8 border-rose-900 text-white shadow-[0_14px_0_#4c0519,0_20px_30px_rgba(0,0,0,0.6)] active:translate-y-3 active:shadow-[0_4px_0_#4c0519]'
                  } ${buzzerActiveAnim ? 'scale-95' : ''}`}
                >
                  <div className="flex flex-col items-center justify-center p-3">
                    <Zap className={`w-10 h-10 mb-1 ${myBuzz ? 'text-slate-950 animate-bounce' : 'text-white'}`} />
                    <span className="text-xl font-black tracking-wider uppercase">
                      {myBuzz ? 'BUZZED!' : 'BUZZ IN!'}
                    </span>
                    <span className="text-xs font-semibold mt-1 opacity-90">
                      {myBuzz ? `Position #${myBuzz.serverOrder}` : 'Tap or type below'}
                    </span>
                  </div>
                </button>

                {/* Status Message */}
                <div className="mt-3 w-full">
                  {myBuzz ? (
                    <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold text-center">
                      {myBuzz.serverOrder === 1
                        ? '🎉 YOU BUZZED FIRST! Shout your answer!'
                        : `Buzzed! Position #${myBuzz.serverOrder} in queue`}
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-400 font-semibold animate-pulse text-center">
                      ● Ready! Tap buzzer or submit your written answer below
                    </div>
                  )}
                </div>

                {/* Free Text Input on Buzzer Question */}
                <form onSubmit={handleTextSubmit} className="w-full mt-4 flex flex-col gap-2">
                  <div className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Or Type Written Answer:</span>
                    {mySubmission && (
                      <span className="text-emerald-400">Answer recorded</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      className="flex-1 p-3 rounded-xl bg-slate-900 border-2 border-slate-700 text-white placeholder-slate-500 text-sm font-bold focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={!textAnswer.trim()}
                      className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1 shadow transition cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      {mySubmission ? 'Update' : 'Send'}
                    </button>
                  </div>
                  {mySubmission && (
                    <div className="text-[11px] text-slate-400 text-left">
                      Sent: <span className="text-white font-bold">"{mySubmission.answer}"</span>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* B. MULTIPLE CHOICE MODE */}
            {currentQ.type === 'MCQ' && currentQ.options && (
              <div className="w-full flex flex-col gap-3 py-2 max-w-sm">
                <div className="grid grid-cols-1 gap-2.5">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = selectedOption === opt || mySubmission?.answer === opt;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(opt)}
                        className={`w-full p-4 rounded-2xl border-2 font-bold text-left text-sm flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md scale-102'
                            : 'bg-slate-900 border-slate-700/80 text-white hover:bg-slate-800'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 text-xs font-black flex items-center justify-center shrink-0">
                          {OPTION_LABELS[idx] || idx + 1}
                        </span>
                        <span className="flex-1 truncate">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Or Free Text alternative for MCQ */}
                <form onSubmit={handleTextSubmit} className="w-full mt-2 flex gap-2">
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Or type custom answer..."
                    className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-bold focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={!textAnswer.trim()}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-400 font-bold text-xs flex items-center gap-1 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                {mySubmission && (
                  <div className="p-3 rounded-xl bg-indigo-950/70 border border-indigo-700/60 text-xs text-indigo-200 font-medium">
                    Answer submitted: <span className="font-bold text-white">"{mySubmission.answer}"</span>! Look at TV for reveal.
                  </div>
                )}
              </div>
            )}

            {/* C. FREE TEXT MODE - Full Unlocked Accessible Input */}
            {currentQ.type === 'TEXT' && (
              <form onSubmit={handleTextSubmit} className="w-full max-w-sm flex flex-col gap-3 py-2">
                <div className="text-left text-xs text-slate-400 font-semibold flex items-center justify-between">
                  <span>Enter your answer:</span>
                  <span className="text-[11px] text-amber-400 font-mono">Case-insensitive</span>
                </div>

                {!room.inputOpen && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold text-center">
                    ⏳ Waiting for host to open inputs...
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="send"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder={mySubmission ? `Current: "${mySubmission.answer}"` : "Type your answer here..."}
                    className="w-full p-4 rounded-2xl bg-slate-900 border-2 border-slate-700 text-white placeholder-slate-500 text-lg font-bold focus:outline-none focus:border-amber-400 transition shadow-inner"
                  />
                  {textAnswer && (
                    <button
                      type="button"
                      onClick={() => setTextAnswer('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 rounded-full text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!textAnswer.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition cursor-pointer active:scale-98"
                >
                  <Send className="w-5 h-5" />
                  <span>{mySubmission ? 'Update My Answer' : 'Submit Answer'}</span>
                </button>

                {mySubmission ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-xs text-emerald-200 flex flex-col gap-1.5 text-left">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Answer recorded: <span className="font-extrabold text-white">"{mySubmission.answer}"</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-emerald-800/40">
                      <span>Feel free to edit and update before reveal.</span>
                      <button
                        type="button"
                        onClick={() => setTextAnswer(mySubmission.answer)}
                        className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                      >
                        Load to edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">
                    💡 Type your answer and tap Submit. The host and TV screen will receive it instantly!
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {/* REVEAL STATE */}
        {room.phase === 'REVEAL' && currentQ && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 w-full flex flex-col items-center gap-4 shadow-xl max-w-sm">
            <div className="text-xs uppercase font-extrabold tracking-widest text-emerald-400">
              Answer Reveal
            </div>

            <div className="text-2xl font-black text-white">
              {currentQ.answer}
            </div>

            {mySubmission && (
              <div
                className={`p-3 rounded-2xl border w-full flex items-center justify-center gap-2 text-sm font-bold ${
                  mySubmission.status === 'correct'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500 text-rose-300'
                }`}
              >
                {mySubmission.status === 'correct' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Correct! +{currentQ.points} Points</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span>Incorrect! Better luck next time</span>
                  </>
                )}
              </div>
            )}

            <div className="text-xs text-slate-400">
              Look up at the TV screen for details & explanations!
            </div>
          </div>
        )}

        {/* LEADERBOARD / STATS STATE */}
        {(room.phase === 'LEADERBOARD' || room.phase === 'ROUND_STATS') && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 w-full flex flex-col items-center gap-4 shadow-xl max-w-sm">
            <Trophy className="w-12 h-12 text-amber-400" />
            <h3 className="text-xl font-black text-white">
              {room.phase === 'ROUND_STATS' ? 'Round Analysis' : 'Current Standings'}
            </h3>

            <div className="text-sm text-slate-300">
              Your Current Score: <span className="font-bold text-amber-400 font-mono">{player?.score || 0} pts</span>
            </div>

            <div className="text-xs text-slate-400">
              Check the TV screen for full stats, leaderboards, and podium!
            </div>
          </div>
        )}
      </div>

      {/* 3. FOOTER INFO */}
      <div className="text-center text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
        QuizCast Live Handset • Latency: {latencyMs > 0 ? `${latencyMs}ms` : 'Sub-ms'}
      </div>
    </div>
  );
};
