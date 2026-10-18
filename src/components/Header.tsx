import React, { useState } from 'react';
import { Tv, Smartphone, User, Sparkles, Volume2, VolumeX, Maximize2, Minimize2, Copy, Check, Radio } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface HeaderProps {
  roomCode: string;
  role: 'tv' | 'host' | 'player' | null;
  onSwitchRole: () => void;
  onOpenAIChat: () => void;
  onOpenQuizStudio?: () => void;
  connected: boolean;
  latencyMs: number;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  role,
  onSwitchRole,
  onOpenAIChat,
  onOpenQuizStudio,
  connected,
  latencyMs
}) => {
  const [muted, setMuted] = useState(soundEffects.isMuted());
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleMute = () => {
    const next = !muted;
    soundEffects.setMuted(next);
    setMuted(next);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const roleLabels = {
    tv: { label: 'TV Spectator', icon: Tv, color: 'text-indigo-400 bg-indigo-950/80 border-indigo-700/50' },
    host: { label: 'Host Phone', icon: Smartphone, color: 'text-amber-400 bg-amber-950/80 border-amber-700/50' },
    player: { label: 'Player Handset', icon: User, color: 'text-emerald-400 bg-emerald-950/80 border-emerald-700/50' }
  };

  const currentRoleInfo = role ? roleLabels[role] : null;

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sticky top-0 z-40 flex items-center justify-between gap-3 shadow-md">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-black text-white text-lg shadow-sm">
            Q
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            QuizCast <span className="text-amber-400 font-black">Live</span>
          </span>
        </div>

        {/* Live sync badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700 text-slate-300">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <span className="hidden sm:inline">{connected ? `Real-Time (${latencyMs > 0 ? `${latencyMs}ms` : 'Sub-ms'})` : 'Connecting...'}</span>
          <span className="sm:hidden text-[11px] font-bold">{connected ? 'Live' : 'Connecting'}</span>
        </div>

        {/* Room Code Badge */}
        {roomCode && (
          <button
            onClick={copyRoomCode}
            title="Click to copy room code"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-amber-400 transition"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Room: {roomCode}</span>
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
          </button>
        )}

        {/* Role Badge */}
        {currentRoleInfo && (
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${currentRoleInfo.color}`}>
            <currentRoleInfo.icon className="w-3.5 h-3.5" />
            <span>{currentRoleInfo.label}</span>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Quiz Creator Studio Button */}
        {onOpenQuizStudio && (
          <button
            onClick={onOpenQuizStudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition shadow-sm cursor-pointer"
            title="Write your own questions, import, or manage quizzes"
          >
            <span>✍️ Quiz Studio</span>
          </button>
        )}

        {/* Gemini AI Assistant Button */}
        <button
          onClick={onOpenAIChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 text-purple-200 transition shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
          <span>AI Co-Host</span>
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={toggleMute}
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
        >
          {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Fullscreen (especially useful for TV display) */}
        {role === 'tv' && (
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter TV Fullscreen'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}

        {/* Switch Role */}
        <button
          onClick={onSwitchRole}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
        >
          Switch Role
        </button>
      </div>
    </header>
  );
};
