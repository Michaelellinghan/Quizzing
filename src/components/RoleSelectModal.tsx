import React, { useState } from 'react';
import { Tv, Smartphone, User, Zap, Radio, ShieldCheck, Sparkles } from 'lucide-react';

interface RoleSelectModalProps {
  initialRoomCode: string;
  onLaunchRole: (role: 'tv' | 'host' | 'player', roomCode: string, playerName?: string) => void;
  onOpenQuizStudio?: () => void;
}

export const RoleSelectModal: React.FC<RoleSelectModalProps> = ({
  initialRoomCode,
  onLaunchRole,
  onOpenQuizStudio
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode || 'QUIZ');
  const [playerName, setPlayerName] = useState('');
  const [nameError, setNameError] = useState('');

  const handleLaunchPlayer = () => {
    if (!playerName.trim()) {
      setNameError('Please enter your player or team name');
      return;
    }
    setNameError('');
    onLaunchRole('player', roomCode.trim().toUpperCase() || 'QUIZ', playerName.trim());
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col gap-6 my-auto">
      
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs uppercase tracking-widest mb-3">
          <Zap className="w-4 h-4" /> Multi-Screen Synchronized Game Suite
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
          RAPID <span className="bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">⚡ TRIVIA</span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Cast a stunning spectator screen to your TV while hosting from your phone, with low-latency buzzers for all players, media-rich question sets, and real-time round analytics!
        </p>

        {/* Room Code Selector */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 px-4 py-2 rounded-2xl shadow-inner">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-400 uppercase">Room Code:</span>
            <input
              type="text"
              value={roomCode}
              maxLength={8}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="bg-transparent text-amber-400 font-mono font-black text-lg w-24 text-center focus:outline-none tracking-widest"
              placeholder="QUIZ"
            />
          </div>

          <span className="text-xs text-slate-500">
            Share this 4-letter code with all devices in the room
          </span>
        </div>
      </div>

      {/* Question Studio & Custom Quiz Creator Banner */}
      <div className="bg-gradient-to-r from-amber-500/20 via-purple-500/15 to-rose-500/20 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-4 text-left">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 border border-amber-400/50 text-white flex items-center justify-center shrink-0 shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-white text-base sm:text-xl">Make Your Own Questions</span>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider">Fast & Easy</span>
            </div>
            <p className="text-xs text-slate-200 mt-1 max-w-xl leading-relaxed">
              Create your dream quiz in seconds: use <strong>1-Click AI Generation</strong> on any topic, rapid 1-line typing (<code className="text-amber-300 font-mono">Question | Answer</code>), magic AI auto-fill, or paste messy notes from your phone!
            </p>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap text-[11px] font-bold">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-900/60 text-purple-200 border border-purple-700/50">⚡ 1-Click AI Pack</span>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-900/60 text-amber-200 border border-amber-700/50">✍️ 1-Line Rapid Entry</span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">✨ Magic Auto-Fill</span>
              <span className="px-2.5 py-0.5 rounded-md bg-blue-900/60 text-blue-200 border border-blue-700/50">📋 Paste Notes & CSV</span>
            </div>
          </div>
        </div>

        {onOpenQuizStudio && (
          <button
            onClick={onOpenQuizStudio}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl transition flex items-center justify-center gap-2 shrink-0 cursor-pointer hover:scale-105"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>Open Quiz Studio & Creator</span>
          </button>
        )}
      </div>

      {/* Role Selection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Role 1: TV Spectator Screen */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 flex flex-col justify-between shadow-xl transition-all group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <Tv className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">
              TV Spectator Display
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Designed for your TV screen or projector. Shows the big questions, join QR code, buzzer spotlights, sound effects, and round statistics.
            </p>
          </div>

          <button
            onClick={() => onLaunchRole('tv', roomCode.trim().toUpperCase() || 'QUIZ')}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <Tv className="w-4 h-4" /> Launch TV Display
          </button>
        </div>

        {/* Role 2: Host Phone Controller */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 flex flex-col justify-between shadow-xl transition-all group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">
              Host Phone Controller
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Open on the quizmaster's phone. View secret answers, unlock buzzers, adjudicate answers, adjust scores, and manage question packs.
            </p>
          </div>

          <button
            onClick={() => onLaunchRole('host', roomCode.trim().toUpperCase() || 'QUIZ')}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" /> Launch Host Phone
          </button>
        </div>

        {/* Role 3: Player Handset */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 flex flex-col justify-between shadow-xl transition-all group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">
              Player Handset
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Open on player phones. Giant tactile buzzer button with low-latency response and live score tracking.
            </p>

            <div className="mb-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  setNameError('');
                }}
                placeholder="Enter Team or Player Name"
                maxLength={20}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-400 placeholder-slate-500"
              />
              {nameError && (
                <div className="text-[11px] text-rose-400 font-semibold mt-1">
                  {nameError}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleLaunchPlayer}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" /> Join as Player
          </button>
        </div>

      </div>

      {/* Sync Engine Details */}
      <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Synchronized with sub-millisecond WebSocket engine & BroadcastChannel failover</span>
      </div>
    </div>
  );
};
