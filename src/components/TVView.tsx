import React, { useEffect, useState } from 'react';
import { GameRoom, Player } from '../types/quiz';
import { Zap, Trophy, Flame, Sparkles, Maximize2, Volume2, VolumeX } from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { soundEffects } from '../utils/soundEffects';

interface TVViewProps {
  room: GameRoom;
  onSwitchRole: () => void;
  onOpenAIChat?: () => void;
  connected?: boolean;
  latencyMs?: number;
}

export function TVView({ room, onSwitchRole }: TVViewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(soundEffects.isMuted());

  const currentQ = room.questions[room.currentQIndex];
  const players = (Object.values(room.players || {}) as Player[]).sort((a, b) => b.score - a.score);
  const submissionsList = Object.values(room.submissions || {}).sort((a, b) => a.elapsedMs - b.elapsedMs);
  const fastestCorrect = submissionsList.find((s) => s.status === 'correct');

  const isCashBuilder = room.currentPackTitle?.startsWith('Cash Builder:');
  const joinUrl = `${window.location.origin}/?room=${encodeURIComponent(room.code)}&role=player`;

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 340,
      margin: 1,
      color: { dark: '#120924', light: '#ffffff' }
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [joinUrl]);

  useEffect(() => {
    if (room.phase === 'LEADERBOARD') {
      try {
        confetti({
          particleCount: 130,
          spread: 90,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }, [room.phase]);

  useEffect(() => {
    // Sync with either room.timer or room.timerSeconds
    const targetSeconds = room.timer?.remainingSec ?? room.timerSeconds ?? 0;
    if (targetSeconds > 0 && room.phase === 'QUESTION' && room.inputOpen) {
      setRemainingSec(targetSeconds);
      return;
    }

    if (!room.timerSeconds || room.phase !== 'QUESTION' || !room.inputOpen) {
      setRemainingSec(0);
      return;
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - room.questionStartTime) / 1000);
      setRemainingSec(Math.max(0, (room.timerSeconds || 0) - elapsed));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room.timer, room.timerSeconds, room.questionStartTime, room.phase, room.inputOpen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEffects.setMuted(next);
  };

  const displayedOptions =
    currentQ?.type === 'BLUFF' && room.bluffStage === 'VOTE'
      ? room.bluffOptions || []
      : currentQ?.options || [];

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-br from-[#1e0b36] via-[#120722] to-[#090312] text-white flex flex-col justify-between px-8 sm:px-12 py-6 sm:py-8 select-none">
      {/* 1. Minimalist Top Bar (No Cluttered Status Pills) */}
      <header className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 font-black italic tracking-tight text-3xl sm:text-4xl">
            <span>RAPID</span>
            <Zap className="w-8 h-8 sm:w-9 sm:h-9 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 text-xl sm:text-2xl not-italic font-extrabold">TRIVIA</span>
          </div>

          <span className="h-6 w-px bg-white/15 hidden sm:inline" />

          <span className="text-base sm:text-lg font-bold text-purple-200/80 truncate max-w-md hidden sm:inline">
            {room.currentPackTitle}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {room.phase !== 'LOBBY' && (
            <div className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white/10 font-extrabold text-sm sm:text-lg text-purple-100">
              {isCashBuilder
                ? `Question ${room.currentQIndex + 1}`
                : `Question ${room.currentQIndex + 1} of ${room.questions.length}`}
            </div>
          )}

          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-purple-200 transition cursor-pointer"
            title="Mute / Unmute TV Audio"
          >
            {muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-purple-200 transition cursor-pointer"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onSwitchRole}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-bold text-purple-200 transition cursor-pointer"
          >
            Exit TV
          </button>
        </div>
      </header>

      {/* 2. Full-Width Centre Stage (No Right Sidebar Cramping the Question) */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-6xl mx-auto my-auto px-4">
        {/* LOBBY VIEW */}
        {room.phase === 'LOBBY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
            <div className="lg:col-span-6 flex flex-col items-start space-y-6">
              <span className="px-4 py-1.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-300 font-extrabold text-sm uppercase tracking-widest">
                Ready for Players
              </span>
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none">
                Scan to Join
              </h1>
              <p className="text-lg sm:text-xl text-purple-200/80 leading-relaxed">
                Point your phone camera at the QR code to pick your team name and play live on your handset.
              </p>

              <div className="flex items-center gap-6 pt-2">
                {qrDataUrl && (
                  <div className="bg-white p-3.5 sm:p-4 rounded-3xl shadow-2xl shrink-0">
                    <img src={qrDataUrl} alt="Join QR Code" className="w-44 h-44 sm:w-52 sm:h-52" />
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
                    ROOM CODE
                  </p>
                  <p className="text-5xl sm:text-6xl font-black tracking-wider text-yellow-400 font-mono">
                    {room.code}
                  </p>
                  <p className="text-xs sm:text-sm text-purple-300/70">
                    {window.location.host}/?room={room.code}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 min-h-[320px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-extrabold text-purple-200">
                  Joined Teams
                </h2>
                <span className="px-4 py-1 rounded-full bg-pink-500/20 text-pink-300 font-black text-lg">
                  {players.length}
                </span>
              </div>

              {players.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-purple-300/50 text-lg sm:text-xl font-medium text-center">
                  Waiting for players to scan the QR code...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 max-h-[40vh] overflow-y-auto no-scrollbar">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white/10 border border-white/10 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl flex items-center justify-between"
                    >
                      <span className="font-extrabold text-lg sm:text-xl truncate mr-2">{p.name}</span>
                      <span className="text-sm sm:text-base font-bold text-yellow-400 shrink-0">{p.score} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUESTION & REVEAL VIEW */}
        {(room.phase === 'QUESTION' || room.phase === 'REVEAL') && currentQ && (
          <div className="w-full flex flex-col items-center text-center space-y-6 sm:space-y-8">
            {/* Separate Category Row Above Question (Never Overlaps Question Text) */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="px-5 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-extrabold text-sm uppercase tracking-widest">
                {currentQ.category || 'General Knowledge'}
              </span>
              <span className="px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 font-extrabold text-sm">
                {currentQ.points || 10} Points
              </span>
              {remainingSec > 0 && (
                <span
                  className={`px-5 py-1.5 rounded-full font-black text-base ${
                    remainingSec <= 5
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-pink-500 text-white'
                  }`}
                >
                  ⏱ {remainingSec}s
                </span>
              )}
            </div>

            {/* Clean, Spacious Question Text */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-white max-w-5xl px-4">
              {currentQ.question}
            </h1>

            {/* Progressive Clues (If CLUES Question) */}
            {currentQ.type === 'CLUES' && currentQ.clues && (
              <div className="w-full max-w-4xl space-y-3 pt-2">
                {currentQ.clues.slice(0, (room.clueStep || 0) + 1).map((clue, idx) => (
                  <div
                    key={idx}
                    className="px-7 py-3.5 rounded-2xl bg-white/10 border border-emerald-400/30 text-lg sm:text-xl font-bold text-emerald-200 flex items-center justify-between"
                  >
                    <span>
                      Clue {idx + 1}: {clue}
                    </span>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/30">
                      {Math.max(5, 20 - idx * 5)} PTS
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Horizontal Pink Option Pills */}
            {displayedOptions.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 w-full pt-2">
                {displayedOptions.map((opt) => {
                  const isCorrect =
                    room.phase === 'REVEAL' &&
                    opt.toLowerCase().trim() === currentQ.answer.toLowerCase().trim();
                  return (
                    <div
                      key={opt}
                      className={`px-8 sm:px-10 py-4 sm:py-5 rounded-full font-extrabold text-xl sm:text-2xl lg:text-3xl shadow-xl transition-all ${
                        room.phase === 'REVEAL'
                          ? isCorrect
                            ? 'bg-emerald-500 text-white scale-105 ring-4 ring-white'
                            : 'bg-white/10 text-white/35'
                          : 'bg-[#ec4899] text-white'
                      }`}
                    >
                      {opt}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Clean Answer Reveal Card (No Overlapping Watermarks) */}
            {room.phase === 'REVEAL' && (
              <div className="w-full max-w-3xl bg-emerald-950/70 border-2 border-emerald-400 rounded-3xl px-8 sm:px-10 py-6 sm:py-7 shadow-2xl space-y-4">
                {fastestCorrect && (
                  <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-yellow-400/20 border border-yellow-400/50 text-yellow-300 text-xs sm:text-sm font-black uppercase tracking-wider">
                    <Zap className="w-4 h-4 fill-yellow-300" />
                    <span>
                      Fastest Finger: {fastestCorrect.playerName} (
                      {(fastestCorrect.elapsedMs / 1000).toFixed(1)}s)
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                    Official Correct Answer
                  </p>
                  <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">
                    {currentQ.answer}
                  </p>
                </div>

                {currentQ.explanation && (
                  <p className="text-base sm:text-lg text-emerald-100/90 font-medium pt-1">
                    {currentQ.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD / PODIUM VIEW */}
        {(room.phase === 'LEADERBOARD' || room.phase === 'ROUND_STATS') && (
          <div className="w-full max-w-4xl space-y-8">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-400" />
              <h1 className="text-4xl sm:text-5xl font-black">Leaderboard</h1>
            </div>

            <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto w-full">
              {players.slice(0, 8).map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-extrabold text-xl sm:text-2xl ${
                    idx === 0
                      ? 'bg-yellow-400 text-slate-950 shadow-xl'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span>#{idx + 1}</span>
                    <span className="truncate max-w-[200px] sm:max-w-xs">{p.name}</span>
                    {p.streak >= 3 && (
                      <span className="text-xs sm:text-sm px-2.5 py-0.5 rounded-full bg-orange-500 text-white">
                        🔥 {p.streak}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0">{p.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 3. Clean Bottom Strip: Room Code on Left, Player Chips on Right */}
      <footer className="flex items-center justify-between shrink-0 pt-2 gap-4">
        <div className="bg-black/50 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl border border-white/10 flex items-center gap-2.5 sm:gap-3 shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-300">
            ROOM
          </span>
          <span className="text-xl sm:text-2xl font-black tracking-wider text-white font-mono">
            {room.code}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-2.5 justify-end overflow-hidden max-h-16">
          {players.map((p) => {
            const sub = room.submissions[p.id];
            const hasAnswered = Boolean(sub) || room.buzzes.some((b) => b.playerId === p.id);
            const isCorrect = room.phase === 'REVEAL' && sub?.status === 'correct';
            return (
              <div
                key={p.id}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-extrabold flex items-center gap-2 transition ${
                  isCorrect
                    ? 'bg-emerald-500 text-white'
                    : hasAnswered
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/10 text-white/80'
                }`}
              >
                {p.streak >= 3 && <Flame className="w-3.5 h-3.5 text-orange-300 fill-orange-300 shrink-0" />}
                {p.doubleDownActive && <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" />}
                <span className="truncate max-w-[120px]">{p.name}</span>
                {room.phase === 'REVEAL' && sub?.answer && (
                  <span className="opacity-90 font-semibold truncate max-w-[100px]">"{sub.answer}"</span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-black/25 text-xs font-mono">
                  {p.score}
                </span>
              </div>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
