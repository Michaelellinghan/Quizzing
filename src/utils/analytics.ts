import { GameRoom, RoundStatsSummary } from '../types/quiz';

export function calculateRoundAnalytics(room: GameRoom): RoundStatsSummary {
  const questions = room.questions || [];
  const history = room.questionHistory || {};
  const players = Object.values(room.players || {});

  let totalBuzzTimes: number[] = [];
  let fastestBuzz: { playerName: string; timeMs: number; questionText: string } | null = null;
  let hardestQuestion: { question: string; correctPercentage: number } | null = null;
  let easiestQuestion: { question: string; correctPercentage: number } | null = null;

  let totalCorrect = 0;
  let totalAttempts = 0;

  // Question difficulty analysis
  let minAccuracy = 101;
  let maxAccuracy = -1;

  questions.forEach((q) => {
    const stat = history[q.id];
    if (stat) {
      if (stat.buzzTimes && stat.buzzTimes.length > 0) {
        totalBuzzTimes.push(...stat.buzzTimes);
      }

      if (stat.totalAttempts > 0) {
        totalCorrect += stat.correctCount;
        totalAttempts += stat.totalAttempts;
        const acc = Math.round((stat.correctCount / stat.totalAttempts) * 100);

        if (acc < minAccuracy) {
          minAccuracy = acc;
          hardestQuestion = { question: q.question, correctPercentage: acc };
        }
        if (acc > maxAccuracy) {
          maxAccuracy = acc;
          easiestQuestion = { question: q.question, correctPercentage: acc };
        }
      }
    }
  });

  // Calculate fastest recorded buzz from buzzes or question history
  if (room.buzzes && room.buzzes.length > 0) {
    const sorted = [...room.buzzes].sort((a, b) => a.elapsedMs - b.elapsedMs);
    const top = sorted[0];
    const currQ = room.questions[room.currentQIndex];
    if (top && top.elapsedMs > 0) {
      fastestBuzz = {
        playerName: top.playerName,
        timeMs: top.elapsedMs,
        questionText: currQ ? currQ.question : 'Current Question'
      };
    }
  }

  const avgBuzzTimeMs =
    totalBuzzTimes.length > 0
      ? Math.round(totalBuzzTimes.reduce((a, b) => a + b, 0) / totalBuzzTimes.length)
      : 1250;

  const overallAccuracyRate =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  // Player stats
  const playerRankings = players
    .map((p) => {
      // Find attempts by this player
      let playerCorrect = 0;
      let playerBuzzCount = 0;
      let playerSpeeds: number[] = [];

      Object.values(room.submissions || {}).forEach((sub) => {
        if (sub.playerId === p.id) {
          if (sub.status === 'correct') playerCorrect++;
          if (sub.elapsedMs > 0) playerSpeeds.push(sub.elapsedMs);
        }
      });

      room.buzzes.forEach((b) => {
        if (b.playerId === p.id) {
          playerBuzzCount++;
          if (b.elapsedMs > 0) playerSpeeds.push(b.elapsedMs);
        }
      });

      const avgSpeed =
        playerSpeeds.length > 0
          ? Math.round(playerSpeeds.reduce((a, b) => a + b, 0) / playerSpeeds.length)
          : 0;

      return {
        id: p.id,
        name: p.name,
        score: p.score,
        streak: p.streak,
        correctCount: playerCorrect,
        buzzCount: playerBuzzCount,
        avgSpeedMs: avgSpeed
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    roundTitle: room.currentPackTitle || 'Quiz Round',
    totalQuestions: questions.length,
    completedQuestions: Math.min(room.currentQIndex + 1, questions.length),
    averageBuzzTimeMs: avgBuzzTimeMs,
    fastestBuzz,
    hardestQuestion,
    easiestQuestion,
    overallAccuracyRate,
    playerRankings
  };
}
