import React, { useEffect, useState } from 'react';
import { GameRoom, Question } from '../types/quiz';
import { generateQrDataUrl } from '../utils/qrCode';
import { soundEffects } from '../utils/soundEffects';
import { RoundStatsView } from './RoundStatsView';
import {
  Trophy,
  Flame,
  QrCode,
  Zap,
  CheckCircle2,
  Clock,
  Users,
  Award,
  Radio,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowRight,
  Tv,
  X,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Target,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TVViewProps {
  room: GameRoom;
  onSwitchRole?: () => void;
  onOpenAIChat?: () => void;
  connected?: boolean;
  latencyMs?: number;
}

export const TVView: React.FC<TVViewProps> = ({
  room,
  onSwitchRole,
  onOpenAIChat,
  connected = true,
  latencyMs = 0
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(soundEffects.getIsUnlocked());
  const [muted, setMuted] = useState<boolean>(soundEffects.isMuted());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [aspectRatioMode, setAspectRatioMode] = useState<'16-9-fit' | 'fill'>('16-9-fit');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const currentQ: Question | undefined = room.questions[room.currentQIndex];
  const sortedPlayers = Object.values(room.players || {}).sort((a, b) => b.score - a.score);
  const activeBuzz = room.buzzes && room.buzzes.length > 0 ? room.buzzes[0] : null;

  // Strict Zero-Scroll Lock on TV Display
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Listen for audio unlock
  useEffect(() => {
    soundEffects.onUnlock(() => setAudioUnlocked(true));
  }, []);

  // Keyboard shortcut: Press 'Q' anywhere on TV to toggle full-screen join QR code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'q' || e.key === 'Q') {
        setShowQrModal((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowQrModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleEnableAudio = () => {
    soundEffects.resume().then(() => {
      setAudioUnlocked(true);
      soundEffects.play('ding');
    });
  };

  const toggleMute = () => {
    const next = !muted;
    soundEffects.setMuted(next);
    setMuted(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Dynamic Join URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : '';
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const joinUrl = `${origin}${pathname}/?room=${encodeURIComponent(room.code)}&role=player`;
  const displayUrl = `${host}${pathname}/?room=${room.code}`;

  const handleCopyLink = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(joinUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2200);
    }
  };

  // High-Resolution & High-Error-Correction QR Code Generation for TV distances
  useEffect(() => {
    generateQrDataUrl(joinUrl, {
      width: 520,
      margin: 1,
      darkColor: '#090d16',
      lightColor: '#ffffff',
      errorCorrectionLevel: 'H'
    }).then((url) => setQrCodeUrl(url));
  }, [joinUrl]);

  // Launch confetti on reveal or game victory
  useEffect(() => {
    if (room.phase === 'REVEAL' || room.phase === 'LEADERBOARD') {
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }, [room.phase]);

  const OPTION_LABELS = ['A', 'B', 'C', 'D'];

  return (
    <div className={`w-full h-full max-h-screen max-w-screen overflow-hidden flex items-center justify-center bg-black select-none ${aspectRatioMode === '16-9-fit' ? 'p-1 sm:p-2' : ''}`}>
      <div className={`w-full h-full ${
        aspectRatioMode === '16-9-fit'
          ? 'max-w-[177.78vh] max-h-[56.25vw] aspect-video rounded-3xl border border-slate-800/80 shadow-[0_0_50px_rgba(0,0,0,0.8)]'
          : ''
      } flex flex-col justify-between p-3 sm:p-4 lg:p-5 bg-slate-950 overflow-hidden relative`}>
      
      {/* 1. TOP BROADCAST CONTROL STRIP (Ultra-compact ~42px, zero vertical waste) */}
      <header className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 shadow-lg mb-3">
        {/* Left: TV Logo & Live Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-black text-white text-sm shadow-sm">
              ⚡
            </span>
            <span className="font-extrabold text-base tracking-tight text-white">
              RAPID <span className="text-amber-400 font-black">⚡ TRIVIA</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/80 border border-rose-800 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>LIVE BROADCAST</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/90 border border-slate-700 text-slate-300">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{connected ? `Mesh Live (${latencyMs > 0 ? `${latencyMs}ms` : '<10ms'})` : 'Connecting...'}</span>
          </div>

          <span className="text-xs text-slate-400 font-medium truncate max-w-[180px] hidden md:inline">
            {room.currentPackTitle}
          </span>
        </div>

        {/* Center: Prominent TV Room Code */}
        <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1 rounded-xl border border-slate-800">
          <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ROOM:</span>
          <span className="font-mono font-black text-amber-400 text-base tracking-wider">
            {room.code}
          </span>
        </div>

        {/* Right: Controls & Broadcast settings */}
        <div className="flex items-center gap-2">
          {/* Quick QR Code toggle */}
          <button
            onClick={() => setShowQrModal(true)}
            title="Display Join QR Code on TV"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 transition cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Aspect Ratio Mode Switcher */}
          <button
            onClick={() => setAspectRatioMode((prev) => (prev === '16-9-fit' ? 'fill' : '16-9-fit'))}
            title={aspectRatioMode === '16-9-fit' ? 'Aspect Ratio: 16:9 Fit (Click for Fill Screen)' : 'Aspect Ratio: Full Fill (Click for 16:9 Lock)'}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">{aspectRatioMode === '16-9-fit' ? '16:9 Fit' : 'Fill'}</span>
          </button>

          {!audioUnlocked ? (
            <button
              onClick={handleEnableAudio}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition animate-pulse cursor-pointer"
            >
              <span>🔊</span>
              <span>Enable Audio</span>
            </button>
          ) : (
            <button
              onClick={toggleMute}
              title={muted ? 'Unmute sounds' : 'Mute sounds'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortedPlayers.length}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter TV Fullscreen'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onSwitchRole && (
            <button
              onClick={onSwitchRole}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
            >
              Exit TV
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN 16:9 STAGE & SIDEBAR GRID (Zero scroll, flex-1 min-h-0) */}
      <div className="grid grid-cols-12 gap-3 lg:gap-5 flex-1 min-h-0 items-stretch">
        
        {/* Main TV Stage (8 or 9 Columns) */}
        <div className="col-span-8 lg:col-span-9 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-0">
          
          {/* Ambient Glow */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* SCREEN PHASE A: LOBBY (16:9 Horizontal Side-by-Side layout) */}
          {room.phase === 'LOBBY' && (
            <div className="flex-1 min-h-0 flex flex-col justify-center items-center">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-center">
                
                {/* Left side: QR Code & Join Prompt */}
                <div className="lg:col-span-7 flex flex-col justify-center items-center lg:items-start text-center lg:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs uppercase tracking-widest mb-3">
                    <Zap className="w-3.5 h-3.5" /> Ready for Players
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight text-white leading-tight">
                    RAPID <span className="bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">⚡ TRIVIA</span>
                  </h1>

                  <p className="text-sm sm:text-base lg:text-lg text-slate-300 font-medium mt-1 mb-5 line-clamp-2">
                    {room.currentPackTitle}
                  </p>

                  {/* Dynamic Broadcast-Grade QR Card */}
                  <div
                    onClick={() => setShowQrModal(true)}
                    className="bg-slate-950/95 border-2 border-slate-700/80 hover:border-amber-400/80 p-4 sm:p-5 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row items-center gap-5 max-w-lg cursor-pointer group transition-all relative overflow-hidden"
                  >
                    {/* Glowing highlight */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                    {/* QR Code Container with Viewfinder Framing */}
                    <div className="relative p-2.5 bg-white rounded-2xl shadow-xl shrink-0 group-hover:scale-102 transition">
                      {/* Viewfinder corner brackets */}
                      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-500 pointer-events-none" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-500 pointer-events-none" />
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-amber-500 pointer-events-none" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-500 pointer-events-none" />

                      {qrCodeUrl ? (
                        <div className="relative overflow-hidden rounded-xl">
                          <img src={qrCodeUrl} alt="Join QR Code" className="w-28 h-28 sm:w-36 sm:h-36 object-contain" />
                          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent top-0 animate-pulse pointer-events-none" />
                        </div>
                      ) : (
                        <div className="w-28 h-28 sm:w-36 sm:h-36 bg-slate-900 rounded-xl flex items-center justify-center">
                          <QrCode className="w-10 h-10 text-slate-500 animate-pulse" />
                        </div>
                      )}
                    </div>

                    <div className="text-left flex flex-col gap-2 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5" /> Scan to Join TV Game
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          Press Q
                        </span>
                      </div>

                      <div className="text-base sm:text-xl font-black text-white flex items-center gap-2">
                        <span>Room:</span>
                        <span className="font-mono text-amber-400 font-black tracking-widest bg-slate-900 px-3 py-1 rounded-xl border border-slate-700 shadow-inner">
                          {room.code}
                        </span>
                      </div>

                      {/* Direct URL pill with 1-click copy */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium transition max-w-[220px] truncate"
                          title="Click to copy join link"
                        >
                          {copiedUrl ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 text-slate-400 shrink-0" />}
                          <span className="truncate">{displayUrl}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(joinUrl, '_blank');
                          }}
                          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition shrink-0"
                          title="Test player handset in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-tight">
                        Point your camera to buzz in & play live on your phone.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right side: Connected Players Grid */}
                <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col max-h-[50vh] min-h-0">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" /> Joined Teams ({sortedPlayers.length})
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold animate-pulse">
                      ● Active
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5">
                    {sortedPlayers.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500 italic">
                        Waiting for players to scan QR code...
                      </div>
                    ) : (
                      sortedPlayers.map((player) => (
                        <div
                          key={player.id}
                          className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-bold text-white shadow-sm"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            {player.name}
                          </span>
                          <span className="text-[10px] text-slate-400">Connected</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 text-center shrink-0">
                    Host can start the round from their phone
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SCREEN PHASE B: QUESTION & REVEAL (Ultra-tight 16:9 vertical management) */}
          {(room.phase === 'QUESTION' || room.phase === 'REVEAL') && currentQ && (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              
              {/* Question Header Meta Strip */}
              <div className="flex items-center justify-between gap-3 mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    {currentQ.category || 'General Trivia'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300">
                    {room.currentPackTitle.startsWith('Cash Builder:')
                      ? `Question ${room.currentQIndex + 1}`
                      : `Question ${room.currentQIndex + 1} of ${room.questions.length}`}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 border border-indigo-700/60 text-indigo-300">
                    {currentQ.points} Pts
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                    {currentQ.type}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      room.inputOpen
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {room.inputOpen ? 'BUZZERS OPEN' : 'LOCKED'}
                  </span>
                </div>
              </div>

              {/* Broadcast 20s Countdown Timer Bar */}
              {room.timer && (
                <div className="w-full mb-3 shrink-0">
                  <div className="flex items-center justify-between text-xs font-mono font-black mb-1">
                    <span className="flex items-center gap-1.5 text-amber-400 uppercase tracking-widest text-[10px]">
                      <Clock className="w-3.5 h-3.5" /> Countdown Clock
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-black ${
                        room.timer.remainingSec <= 5
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-800 text-amber-300'
                      }`}
                    >
                      {room.timer.remainingSec}s / {room.timer.durationSec}s
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                        room.timer.remainingSec <= 5
                          ? 'bg-gradient-to-r from-rose-600 to-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      }`}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (room.timer.remainingSec / (room.timer.durationSec || 20)) * 100)
                        )}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Point Heist Event Notification */}
              {room.lastHeistEvent && Date.now() - room.lastHeistEvent.timestamp < 9000 && (
                <div className="mb-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg animate-bounce shrink-0">
                  <Target className="w-4 h-4 text-white" />
                  <span>
                    🚨 POINT HEIST! {room.lastHeistEvent.toName} stole {room.lastHeistEvent.points} pts from{' '}
                    {room.lastHeistEvent.fromName}!
                  </span>
                </div>
              )}

              {/* Center Content Stage */}
              <div className="flex-1 min-h-0 flex flex-col justify-center items-center text-center my-auto py-1">
                {/* Media Image Clue: Scaled to max 30vh */}
                {currentQ.mediaType === 'image' && currentQ.mediaUrl && (
                  <div className="mb-3 max-h-[30vh] max-w-lg rounded-2xl overflow-hidden border border-slate-700 shadow-xl bg-black shrink-0">
                    <img
                      src={currentQ.mediaUrl}
                      alt="Question Clue"
                      className="max-h-[30vh] w-full object-contain mx-auto"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Progressive Clue Banner */}
                {room.progressiveClueIndex && room.progressiveClueIndex > 0 && currentQ.progressiveClues && (
                  <div className="mb-2.5 px-4 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs sm:text-sm font-bold max-w-xl animate-fade-in shrink-0">
                    💡 Clue {room.progressiveClueIndex}: {currentQ.progressiveClues[room.progressiveClueIndex - 1]}
                  </div>
                )}

                {/* Question Prompt */}
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight max-w-4xl tracking-tight mb-3">
                  {currentQ.question}
                </h2>

                {/* Buzzer Spotlight on TV when a player buzzes */}
                {activeBuzz && room.phase === 'QUESTION' && (
                  <div className="w-full max-w-xl my-2 p-3.5 rounded-2xl bg-amber-500/20 border-2 border-amber-400 tv-buzzer-spotlight shrink-0">
                    <div className="text-[11px] uppercase tracking-widest font-black text-amber-300 flex items-center justify-center gap-1.5">
                      <span>🚨 FIRST TO BUZZ IN</span>
                      {activeBuzz.doubleDown && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                          2X WAGER
                        </span>
                      )}
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{activeBuzz.playerName}</div>
                    <div className="text-xs font-mono text-amber-200">
                      {activeBuzz.elapsedMs} ms • #{activeBuzz.serverOrder} in line
                    </div>
                  </div>
                )}

                {/* Multiple Choice Options Grid: Scaled to fit 16:9 comfortably */}
                {currentQ.type === 'MCQ' && currentQ.options && currentQ.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-3xl mt-2">
                    {currentQ.options.map((option, idx) => {
                      const isCorrect =
                        room.phase === 'REVEAL' &&
                        option.trim().toLowerCase() === currentQ.answer.trim().toLowerCase();

                      return (
                        <div
                          key={idx}
                          className={`p-3 sm:p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                            isCorrect
                              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                              : 'bg-slate-950/80 border-slate-700/80 text-white'
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 text-amber-400 font-extrabold'
                            }`}
                          >
                            {OPTION_LABELS[idx] || idx + 1}
                          </span>
                          <span className="text-sm sm:text-base font-bold flex-1 truncate">{option}</span>
                          {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reveal Answer Banner */}
                {room.phase === 'REVEAL' && (
                  <div className="w-full max-w-2xl mt-3 p-4 sm:p-5 rounded-2xl bg-emerald-950/70 border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-fade-in shrink-0">
                    {/* Fastest Finger Speed Bonus Spotlight */}
                    {(() => {
                      const correctSubs = Object.values(room.submissions).filter((s) => s.status === 'correct');
                      correctSubs.sort((a, b) => a.elapsedMs - b.elapsedMs);
                      const fastest = correctSubs[0];
                      if (fastest) {
                        return (
                          <div className="mb-2.5 py-1 px-3 rounded-full bg-yellow-400/20 border border-yellow-400 text-yellow-300 font-black text-xs inline-flex items-center gap-1.5 shadow-sm">
                            <Zap className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            <span>
                              ⚡ FASTEST FINGER: {fastest.playerName} (+5 PTS) in {(fastest.elapsedMs / 1000).toFixed(1)}s!
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">
                      Official Correct Answer
                    </div>
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{currentQ.answer}</div>
                    {currentQ.explanation && (
                      <p className="text-xs sm:text-sm text-emerald-200 font-medium mt-2 border-t border-emerald-800/60 pt-2 line-clamp-2">
                        {currentQ.explanation}
                      </p>
                    )}

                    {/* Team Answers Display on TV */}
                    {Object.keys(room.submissions).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-emerald-800/60 text-left">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 mb-1.5">
                          Team Submissions:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.values(room.submissions).map((sub) => (
                            <span
                              key={sub.playerId}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 ${
                                sub.status === 'correct'
                                  ? 'bg-emerald-900/80 border-emerald-400 text-white'
                                  : 'bg-rose-950/80 border-rose-500/80 text-rose-200'
                              }`}
                            >
                              <span>{sub.playerName}:</span>
                              <span className="font-mono">"{sub.answer}"</span>
                              {sub.status === 'correct' ? ' ✓' : ' ✗'}
                              {sub.doubleDown && (
                                <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">
                                  2X
                                </span>
                              )}
                              {sub.pointHeist && (
                                <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.2 rounded font-black">
                                  HEIST
                                </span>
                              )}
                              {sub.speedBonusAwarded ? (
                                <span className="text-[9px] bg-yellow-400 text-slate-950 px-1.5 py-0.2 rounded font-black">
                                  +{sub.speedBonusAwarded} SPEED
                                </span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Subtle Bar */}
              <div className="border-t border-slate-800/60 pt-2 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
                <span>QuizCast Live TV Broadcast</span>
                <span className="font-mono">16:9 Screen Format</span>
              </div>
            </div>
          )}

          {/* SCREEN PHASE C: ROUND STATS SCREEN (100% contained in 16:9) */}
          {room.phase === 'ROUND_STATS' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <RoundStatsView room={room} isTV={true} />
            </div>
          )}

          {/* SCREEN PHASE D: LEADERBOARD PODIUM SCREEN (16:9 optimized heights) */}
          {room.phase === 'LEADERBOARD' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between items-center text-center my-auto py-2">
              <div className="shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs uppercase tracking-widest mb-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" /> Grand Standings
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
                  QuizCast Leaderboard
                </h2>
              </div>

              {/* Top 3 Podium */}
              <div className="flex items-end justify-center gap-3 sm:gap-6 w-full max-w-xl px-2 my-auto">
                {/* 2nd Place */}
                {sortedPlayers[1] && (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800 border-2 border-slate-400 flex items-center justify-center text-xl font-black text-slate-300 mb-1 shadow-md">
                      🥈
                    </div>
                    <div className="font-extrabold text-white text-xs sm:text-sm truncate max-w-[110px]">
                      {sortedPlayers[1].name}
                    </div>
                    <div className="text-amber-400 font-black text-sm sm:text-base">
                      {sortedPlayers[1].score} pts
                    </div>
                    <div className="w-full bg-slate-800/90 border border-slate-700 rounded-t-xl h-20 sm:h-28 mt-1.5 flex items-center justify-center font-black text-xl text-slate-400">
                      2
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {sortedPlayers[0] && (
                  <div className="flex-1 flex flex-col items-center scale-105">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl font-black text-amber-300 mb-1 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                      👑
                    </div>
                    <div className="font-extrabold text-white text-sm sm:text-base truncate max-w-[130px]">
                      {sortedPlayers[0].name}
                    </div>
                    <div className="text-amber-400 font-black text-base sm:text-lg">
                      {sortedPlayers[0].score} pts
                    </div>
                    <div className="w-full bg-gradient-to-t from-amber-600 to-amber-500 border border-amber-400 rounded-t-xl h-28 sm:h-36 mt-1.5 flex items-center justify-center font-black text-2xl text-slate-950">
                      1
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {sortedPlayers[2] && (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-950/60 border-2 border-amber-700 flex items-center justify-center text-xl font-black text-amber-600 mb-1 shadow-md">
                      🥉
                    </div>
                    <div className="font-extrabold text-white text-xs sm:text-sm truncate max-w-[110px]">
                      {sortedPlayers[2].name}
                    </div>
                    <div className="text-amber-400 font-black text-sm sm:text-base">
                      {sortedPlayers[2].score} pts
                    </div>
                    <div className="w-full bg-slate-800/90 border border-slate-700 rounded-t-xl h-14 sm:h-20 mt-1.5 flex items-center justify-center font-black text-lg text-slate-500">
                      3
                    </div>
                  </div>
                )}
              </div>

              {/* Ranks 4+ compact 2-column strip */}
              {sortedPlayers.length > 3 && (
                <div className="w-full max-w-xl grid grid-cols-2 gap-2 shrink-0">
                  {sortedPlayers.slice(3, 7).map((player, idx) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white font-bold text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-4 text-slate-500 font-mono text-[10px]">{idx + 4}</span>
                        <span className="truncate">{player.name}</span>
                      </div>
                      <span className="font-mono text-amber-400 text-xs shrink-0">{player.score} pts</span>
                    </div>
                  ))}
                </div>
              )}

              {/* End-of-Night Superlatives Awards Showcase */}
              {room.superlatives && room.superlatives.length > 0 && (
                <div className="w-full max-w-xl mt-2 p-3 rounded-2xl bg-slate-950/85 border border-amber-500/30 shrink-0 shadow-lg">
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2 flex items-center justify-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> End-of-Night Superlatives
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {room.superlatives.slice(0, 6).map((sup, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-left flex items-center gap-2"
                      >
                        <span className="text-xl">{sup.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-black uppercase text-amber-400 truncate">
                            {sup.award || sup.title}
                          </div>
                          <div className="text-xs font-bold text-white truncate">
                            {sup.recipientName || sup.recipient}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate">
                            {sup.detail || sup.stat}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right TV Sidebar (4 or 3 Columns): Combined Buzzers & Submissions + Scores */}
        <div className="col-span-4 lg:col-span-3 flex flex-col gap-3 min-h-0">
          
          {/* Live Activity Box: Buzzers & Written Submissions */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h3 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{room.phase === 'QUESTION' ? 'Live Buzzers & Answers' : 'Question Submissions'}</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                {Object.keys(room.submissions).length} / {sortedPlayers.length || 0} in
              </span>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar min-h-0">
              {room.buzzes.length === 0 && Object.keys(room.submissions).length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center text-xs text-slate-500">
                  Ready for buzzers & answers
                </div>
              ) : (
                (() => {
                  // Collect unique player IDs with activity
                  const activePlayerIds = new Set<string>();
                  room.buzzes.forEach((b) => activePlayerIds.add(b.playerId));
                  Object.keys(room.submissions).forEach((pid) => activePlayerIds.add(pid));

                  return Array.from(activePlayerIds).map((pid) => {
                    const player = room.players[pid];
                    const buzz = room.buzzes.find((b) => b.playerId === pid);
                    const sub = room.submissions[pid];
                    const displayName = buzz?.playerName || sub?.playerName || player?.name || 'Player';

                    return (
                      <div
                        key={pid}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                          sub?.status === 'correct'
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                            : sub?.status === 'wrong'
                            ? 'bg-rose-950/30 border-rose-500/40 text-slate-300'
                            : buzz?.serverOrder === 1
                            ? 'bg-amber-500/20 border-amber-500/60 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {buzz ? (
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                buzz.serverOrder === 1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {buzz.serverOrder}
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 bg-emerald-600 text-white">
                              ✓
                            </span>
                          )}
                          <span className="font-extrabold truncate max-w-[95px]">{displayName}</span>
                          {(buzz?.doubleDown || sub?.doubleDown) && (
                            <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black shrink-0 shadow-sm">
                              2X
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {room.phase === 'REVEAL' && sub ? (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                sub.status === 'correct'
                                  ? 'text-emerald-400 bg-emerald-950 border border-emerald-800'
                                  : 'text-rose-400 bg-rose-950 border border-rose-800'
                              }`}
                            >
                              "{sub.answer}" {sub.status === 'correct' ? '✓' : '✗'}
                            </span>
                          ) : sub ? (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                              Answer In ✓
                            </span>
                          ) : buzz ? (
                            <span className="font-mono text-[10px] text-amber-300">
                              {buzz.elapsedMs}ms
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

          {/* Live Scoreboard Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h3 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Leaderboard
              </h3>
              <span className="text-[10px] text-slate-400 font-bold">
                {sortedPlayers.length} Teams
              </span>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar min-h-0">
              {sortedPlayers.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center text-xs text-slate-500">
                  Waiting for players...
                </div>
              ) : (
                sortedPlayers.map((player, idx) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-4 text-center font-black text-slate-400 text-xs shrink-0">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </span>
                      <div className="flex flex-col truncate">
                        <span className="font-bold text-white truncate max-w-[95px]">
                          {player.name}
                        </span>
                        {player.streak > 1 && (
                          <span className="text-[9px] text-rose-400 flex items-center font-semibold">
                            <Flame className="w-2.5 h-2.5 mr-0.5" /> {player.streak} streak
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono font-extrabold text-amber-400 text-xs shrink-0">
                      {player.score} pts
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Docked Dynamic QR Join Widget (Always available for mid-game arrivals) */}
          <div
            onClick={() => setShowQrModal(true)}
            className="bg-slate-900/95 border border-slate-800 hover:border-amber-400/80 rounded-2xl p-2.5 shadow-lg flex items-center justify-between gap-2.5 cursor-pointer group transition shrink-0"
            title="Click or press 'Q' to expand Join QR Code on TV"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative p-1 bg-white rounded-xl shadow-sm shrink-0 group-hover:scale-105 transition overflow-hidden">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Join QR Code" className="w-10 h-10 object-contain" />
                ) : (
                  <QrCode className="w-10 h-10 text-slate-900" />
                )}
                <div className="absolute inset-x-0 h-0.5 bg-amber-500 top-0 animate-pulse pointer-events-none" />
              </div>
              <div className="min-w-0 text-left">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-amber-400" />
                  <span>Join On Phone</span>
                </div>
                <div className="text-xs font-mono font-bold text-white truncate">
                  Room: <span className="text-amber-400 font-black">{room.code}</span>
                </div>
              </div>
            </div>

            <span className="px-2 py-1 rounded-lg bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 text-[10px] font-black transition flex items-center gap-1 shrink-0">
              <Maximize2 className="w-3 h-3" /> Q
            </span>
          </div>

        </div>

      </div>

      {/* Cinematic TV Mobile Join QR Showcase Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-slate-900 border-2 border-amber-400/80 p-6 sm:p-8 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col md:flex-row items-center gap-6 sm:gap-8 max-w-2xl w-full text-center md:text-left relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close (Esc or Q)"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left: Viewfinder QR Code Stage */}
            <div className="relative p-3.5 bg-white rounded-3xl shadow-2xl shrink-0">
              {/* Corner targeting reticles */}
              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-3 border-l-3 border-amber-500 pointer-events-none" />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-3 border-r-3 border-amber-500 pointer-events-none" />
              <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-3 border-l-3 border-amber-500 pointer-events-none" />
              <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-3 border-r-3 border-amber-500 pointer-events-none" />

              {qrCodeUrl ? (
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    src={qrCodeUrl}
                    alt="Join QR Code"
                    className="w-52 h-52 sm:w-64 sm:h-64 object-contain"
                  />
                  {/* High-tech scanning laser line */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent top-0 animate-pulse pointer-events-none" />
                </div>
              ) : (
                <div className="w-52 h-52 sm:w-64 sm:h-64 bg-slate-900 rounded-2xl flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-slate-500 animate-pulse" />
                </div>
              )}
            </div>

            {/* Right: Join Instructions & Direct Links */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-xs uppercase tracking-widest w-fit mx-auto md:mx-0">
                <Smartphone className="w-3.5 h-3.5" /> Mobile Handset Controller
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Scan with Camera
              </h2>

              <div className="flex items-center justify-center md:justify-start gap-2 text-sm sm:text-base font-bold text-slate-300">
                <span>Room Code:</span>
                <span className="font-mono text-xl sm:text-2xl text-amber-400 font-black tracking-widest bg-slate-950 px-3.5 py-1 rounded-xl border border-slate-700 shadow-inner">
                  {room.code}
                </span>
              </div>

              {/* URL with 1-click copy */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5 text-xs text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Or enter web address on phone:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white text-xs truncate flex-1 font-semibold select-all">
                    {displayUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition flex items-center gap-1 shrink-0"
                    title="Copy full join URL"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(joinUrl, '_blank')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                    title="Open test handset in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Roster count */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {sortedPlayers.length} {sortedPlayers.length === 1 ? 'Player' : 'Players'} connected
                </span>
                <span className="text-slate-500 text-[11px]">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-amber-400 text-[10px]">Q</kbd> to close
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};
