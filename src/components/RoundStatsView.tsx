import React from 'react';
import { GameRoom } from '../types/quiz';
import { calculateRoundAnalytics } from '../utils/analytics';
import {
  BarChart3,
  Zap,
  Target,
  Flame,
  Clock,
  Award,
  AlertCircle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

interface RoundStatsViewProps {
  room: GameRoom;
  isTV?: boolean;
}

export const RoundStatsView: React.FC<RoundStatsViewProps> = ({ room, isTV = false }) => {
  const stats = calculateRoundAnalytics(room);

  return (
    <div className={`w-full flex flex-col justify-between text-white ${isTV ? 'h-full min-h-0 overflow-hidden p-1' : 'flex-1 p-2 sm:p-4'}`}>
      {/* Header Banner */}
      <div className={`text-center ${isTV ? 'mb-2.5 shrink-0' : 'mb-6'}`}>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold text-xs uppercase tracking-widest mb-1">
          <BarChart3 className="w-3.5 h-3.5 text-purple-400" /> Real-Time Round Analytics
        </div>
        <h2 className={`font-black tracking-tight text-white ${isTV ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-2xl sm:text-3xl'}`}>
          {stats.roundTitle} Summary
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Performance breakdown across {stats.completedQuestions} of {stats.totalQuestions} questions
        </p>
      </div>

      {/* 4 Stat Metric Cards Grid */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 ${isTV ? 'mb-3 shrink-0' : 'mb-6'}`}>
        
        {/* Metric 1: Average Reaction Speed */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Avg Reaction Time</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black font-mono text-white">
            {stats.averageBuzzTimeMs} <span className="text-sm font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-blue-300/80 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Buzz speed average
          </div>
        </div>

        {/* Metric 2: Fastest Finger Award */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Fastest Buzzer</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          {stats.fastestBuzz ? (
            <div>
              <div className="text-lg md:text-xl font-black text-amber-300 truncate">
                {stats.fastestBuzz.playerName}
              </div>
              <div className="text-xs font-mono text-amber-400/90 font-bold">
                {stats.fastestBuzz.timeMs} ms reaction
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 italic">No buzzes recorded</div>
          )}
          <div className="text-[11px] text-amber-400/80 mt-1 flex items-center gap-1">
            <Award className="w-3 h-3" /> Quickest trigger finger
          </div>
        </div>

        {/* Metric 3: Overall Round Accuracy */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Round Accuracy</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black font-mono text-emerald-400">
            {stats.overallAccuracyRate}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.overallAccuracyRate}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Question Difficulty Rating */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Hardest Question</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          {stats.hardestQuestion ? (
            <div>
              <div className="text-xs text-slate-300 line-clamp-2 leading-tight">
                "{stats.hardestQuestion.question}"
              </div>
              <div className="text-xs font-bold text-rose-400 mt-1 font-mono">
                Only {stats.hardestQuestion.correctPercentage}% answered correctly
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 italic">Balanced difficulty</div>
          )}
          <div className="text-[11px] text-rose-300/80 mt-1">Stumped the room</div>
        </div>

      </div>

      {/* Player Rankings & Speed Table */}
      <div className={`bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col min-h-0 ${isTV ? 'p-3 flex-1 overflow-hidden' : 'p-4 sm:p-5 flex-1'}`}>
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2 shrink-0">
          <Award className="w-4 h-4 text-amber-400" /> Player Performance Leaderboard
        </h3>

        <div className="overflow-x-auto overflow-y-auto no-scrollbar flex-1 min-h-0">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2 px-3">Rank</th>
                <th className="py-2 px-3">Player / Team</th>
                <th className="py-2 px-3 text-center">Score</th>
                <th className="py-2 px-3 text-center">Streak</th>
                <th className="py-2 px-3 text-center">Buzzes</th>
                <th className="py-2 px-3 text-right">Avg Speed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {stats.playerRankings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                    No player data recorded for this round yet.
                  </td>
                </tr>
              ) : (
                stats.playerRankings.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-900/60 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-400">
                      {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                    </td>
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <span>{p.name}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-amber-400">
                      {p.score} pts
                    </td>
                    <td className="py-3 px-3 text-center">
                      {p.streak > 1 ? (
                        <span className="inline-flex items-center text-xs font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/50">
                          <Flame className="w-3 h-3 mr-0.5 fill-rose-400" /> {p.streak}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-300">
                      {p.buzzCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {p.avgSpeedMs > 0 ? `${p.avgSpeedMs}ms` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
