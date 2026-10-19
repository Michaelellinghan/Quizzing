import { useEffect, useState, useRef, useCallback } from 'react';
import { GameRoom, Question, GamePhase, Buzz, Submission } from '../types/quiz';
import { DEFAULT_QUIZ_PACKS } from '../data/defaultQuizPacks';
import { soundEffects } from '../utils/soundEffects';
import mqtt, { MqttClient } from 'mqtt';

interface UseQuizSyncProps {
  roomCode: string;
  role: 'tv' | 'host' | 'player' | null;
  playerId?: string;
  playerName?: string;
}

export const CLOUD_RUN_HOST = 'ais-pre-gn2ihvmb443kj3zt3zzttc-148054449091.europe-west2.run.app';

function getBackendHttpUrl(): string {
  if (typeof window === 'undefined') return '';
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return '';
}

function createDefaultRoom(code: string): GameRoom {
  const norm = (code || 'QUIZ').trim().toUpperCase();
  const defaultPack = DEFAULT_QUIZ_PACKS && DEFAULT_QUIZ_PACKS[0] ? DEFAULT_QUIZ_PACKS[0] : null;
  return {
    code: norm,
    phase: 'LOBBY',
    currentQIndex: 0,
    inputOpen: true,
    questionStartTime: Date.now(),
    questions: defaultPack ? [...defaultPack.questions] : [],
    currentPackTitle: defaultPack ? defaultPack.title : 'General Knowledge: Round 1',
    players: {},
    buzzes: [],
    submissions: {},
    questionHistory: {},
    lastUpdated: Date.now(),
    revision: 1,
    timer: {
      durationSec: 20,
      remainingSec: 20,
      running: false,
      autoLock: true,
      endsAt: 0
    },
    progressiveClueIndex: 0,
    activeSabotages: {},
    superlatives: []
  };
}

function cleanAnswerString(str: string): string {
  return String(str || '')
    .toLowerCase()
    .replace(/^(the|a|an|king|sir|lord)\s+/i, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function reduceGameAction(
  prevRoom: GameRoom,
  action: {
    type: string;
    playerId?: string;
    playerName?: string;
    role?: string;
    payload?: any;
  }
): GameRoom {
  const { type, playerId, playerName, role, payload } = action;
  const now = Date.now();
  const updated: GameRoom = {
    ...prevRoom,
    players: { ...prevRoom.players },
    buzzes: [...prevRoom.buzzes],
    submissions: { ...prevRoom.submissions },
    questions: [...prevRoom.questions],
    questionHistory: { ...prevRoom.questionHistory },
    revision: (prevRoom.revision || 1) + 1
  };

  switch (type) {
    case 'JOIN_ROOM': {
      if (role === 'player' && playerId) {
        const cleanName = (payload?.name || playerName || 'Player').trim();
        if (!updated.players[playerId]) {
          updated.players[playerId] = {
            id: playerId,
            name: cleanName,
            score: 0,
            streak: 0,
            connected: true,
            avatar: `avatar-${(Object.keys(updated.players).length % 8) + 1}`,
            lastSeen: now,
            doubleDownTokens: 2,
            sabotageTokens: 1,
            pointHeistAvailable: true,
            activeSabotage: null
          };
        } else {
          updated.players[playerId] = {
            ...updated.players[playerId],
            connected: true,
            lastSeen: now,
            name: cleanName && cleanName !== 'Player' ? cleanName : updated.players[playerId].name,
            doubleDownTokens: updated.players[playerId].doubleDownTokens ?? 2,
            sabotageTokens: updated.players[playerId].sabotageTokens ?? 1,
            pointHeistAvailable: updated.players[playerId].pointHeistAvailable ?? true
          };
        }
      }
      break;
    }

    case 'SET_PHASE': {
      const newPhase = payload?.phase as GamePhase;
      if (newPhase && ['LOBBY', 'QUESTION', 'REVEAL', 'ROUND_STATS', 'LEADERBOARD'].includes(newPhase)) {
        updated.phase = newPhase;
        if (newPhase === 'QUESTION') {
          updated.questionStartTime = now;
          updated.inputOpen = payload?.inputOpen ?? true;
          updated.buzzes = [];
          updated.submissions = {};
          updated.progressiveClueIndex = 0;
          updated.lastHeistEvent = null;
          // Auto-start 20s timer on Question phase
          const dur = updated.timer?.durationSec || 20;
          updated.timer = {
            durationSec: dur,
            remainingSec: dur,
            running: true,
            autoLock: updated.timer?.autoLock ?? true,
            endsAt: now + dur * 1000
          };
          updated.soundTrigger = { sound: 'whoosh', nonce: Math.random() };
        } else if (newPhase === 'REVEAL') {
          updated.inputOpen = false;
          if (updated.timer) {
            updated.timer = { ...updated.timer, running: false };
          }

          // 1. FASTEST FINGER SPEED BONUSES:
          // Find all correct submissions for this question sorted by speed
          const correctSubs = Object.values(updated.submissions).filter((s) => s.status === 'correct');
          correctSubs.sort((a, b) => a.elapsedMs - b.elapsedMs);
          const bonuses = [5, 3, 1];
          correctSubs.forEach((sub, rank) => {
            if (rank < bonuses.length && !sub.speedBonusAwarded) {
              const bonusPts = bonuses[rank];
              sub.speedBonusAwarded = bonusPts;
              if (updated.players[sub.playerId]) {
                updated.players[sub.playerId].score += bonusPts;
              }
            }
          });

          // 2. POINT HEIST:
          // Check if any player activated Point Heist and answered correctly
          const heistSub = Object.values(updated.submissions).find((s) => s.pointHeist && s.status === 'correct');
          if (heistSub && updated.players[heistSub.playerId]) {
            const others = Object.values(updated.players)
              .filter((p) => p.id !== heistSub.playerId)
              .sort((a, b) => b.score - a.score);
            const leader = others[0];
            if (leader && leader.score > 0) {
              const stolen = Math.min(10, leader.score);
              leader.score -= stolen;
              updated.players[heistSub.playerId].score += stolen;
              updated.lastHeistEvent = {
                fromName: leader.name,
                toName: heistSub.playerName,
                points: stolen,
                timestamp: now
              };
            }
          }

          updated.soundTrigger = { sound: 'ding', nonce: Math.random() };
        } else if (newPhase === 'ROUND_STATS') {
          updated.inputOpen = false;
          if (updated.timer) {
            updated.timer = { ...updated.timer, running: false };
          }
          updated.soundTrigger = { sound: 'fanfare', nonce: Math.random() };
        } else if (newPhase === 'LEADERBOARD') {
          updated.inputOpen = false;
          if (updated.timer) {
            updated.timer = { ...updated.timer, running: false };
          }

          // Compute End-of-Night Superlatives!
          const playersArr = Object.values(updated.players);
          if (playersArr.length > 0) {
            const superlatives: { award: string; icon: string; recipientName: string; detail: string }[] = [];
            const sortedByScore = [...playersArr].sort((a, b) => b.score - a.score);
            superlatives.push({
              award: 'Grand Champion',
              icon: '👑',
              recipientName: sortedByScore[0].name,
              detail: `${sortedByScore[0].score} total points scored`
            });

            // Speed Demon
            let fastestBuzzTime = Infinity;
            let fastestBuzzPlayer = '';
            updated.buzzes.forEach((b) => {
              if (b.elapsedMs < fastestBuzzTime) {
                fastestBuzzTime = b.elapsedMs;
                fastestBuzzPlayer = b.playerName;
              }
            });
            if (fastestBuzzPlayer && fastestBuzzTime < 15000) {
              superlatives.push({
                award: 'Speed Demon',
                icon: '⚡',
                recipientName: fastestBuzzPlayer,
                detail: `Fastest buzz in ${Math.round(fastestBuzzTime)}ms`
              });
            }

            // Streak Master
            const bestStreak = [...playersArr].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];
            if (bestStreak && bestStreak.streak > 0) {
              superlatives.push({
                award: 'Streak Master',
                icon: '🔥',
                recipientName: bestStreak.name,
                detail: `${bestStreak.streak} question win streak`
              });
            }

            // Sharpshooter
            const correctCounts: Record<string, number> = {};
            Object.values(updated.submissions).forEach((s) => {
              if (s.status === 'correct') {
                correctCounts[s.playerName] = (correctCounts[s.playerName] || 0) + 1;
              }
            });
            const sharpshooter = Object.entries(correctCounts).sort((a, b) => b[1] - a[1])[0];
            if (sharpshooter && sharpshooter[1] > 0) {
              superlatives.push({
                award: 'Sharpshooter',
                icon: '🎯',
                recipientName: sharpshooter[0],
                detail: `${sharpshooter[1]} verified correct answers`
              });
            }

            // High Roller
            const doubleDownWins = Object.values(updated.submissions).filter((s) => s.doubleDown && s.status === 'correct');
            if (doubleDownWins.length > 0) {
              superlatives.push({
                award: 'High Roller',
                icon: '🎲',
                recipientName: doubleDownWins[0].playerName,
                detail: `Bold 2x Double-Down victory`
              });
            }

            if (sortedByScore.length >= 2) {
              superlatives.push({
                award: 'Crowd Favorite',
                icon: '🌟',
                recipientName: sortedByScore[sortedByScore.length - 1].name,
                detail: `Maximum energy and pub quiz heart!`
              });
            }

            updated.superlatives = superlatives;
          }

          updated.soundTrigger = { sound: 'fanfare', nonce: Math.random() };
        }
      }
      break;
    }

    case 'CHANGE_QUESTION': {
      const idx = payload?.index;
      if (typeof idx === 'number' && idx >= 0 && idx < updated.questions.length) {
        updated.currentQIndex = idx;
        updated.buzzes = [];
        updated.submissions = {};
        updated.inputOpen = true;
        updated.questionStartTime = now;
        updated.phase = 'QUESTION';
        updated.progressiveClueIndex = 0;
        updated.lastHeistEvent = null;
        const dur = updated.timer?.durationSec || 20;
        updated.timer = {
          durationSec: dur,
          remainingSec: dur,
          running: true,
          autoLock: updated.timer?.autoLock ?? true,
          endsAt: now + dur * 1000
        };
        updated.soundTrigger = { sound: 'whoosh', nonce: Math.random() };
      }
      break;
    }

    case 'TOGGLE_LOCK': {
      const wasOpen = updated.inputOpen;
      updated.inputOpen = payload?.open ?? !updated.inputOpen;
      if (updated.inputOpen && updated.questionStartTime === 0) {
        updated.questionStartTime = now;
      }
      if (updated.inputOpen && !wasOpen) {
        updated.soundTrigger = { sound: 'unlock', nonce: Math.random() };
      }
      break;
    }

    case 'RESET_BUZZES': {
      updated.buzzes = [];
      updated.submissions = {};
      updated.questionStartTime = now;
      break;
    }

    case 'BUZZ_IN': {
      if (!playerId || !updated.inputOpen || updated.phase !== 'QUESTION') break;
      if (!updated.buzzes.some((b) => b.playerId === playerId)) {
        const elapsed = updated.questionStartTime > 0 ? now - updated.questionStartTime : 0;
        const isDoubleDown = Boolean(payload?.doubleDown);
        if (isDoubleDown && updated.players[playerId] && (updated.players[playerId].doubleDownTokens ?? 2) > 0) {
          updated.players[playerId].doubleDownTokens = Math.max(0, (updated.players[playerId].doubleDownTokens ?? 2) - 1);
        }

        const newBuzz: Buzz = {
          playerId,
          playerName: updated.players[playerId]?.name || playerName || 'Player',
          timestamp: now,
          elapsedMs: Math.max(1, elapsed),
          serverOrder: updated.buzzes.length + 1,
          doubleDown: isDoubleDown
        };
        updated.buzzes.push(newBuzz);

        const currentQ = updated.questions[updated.currentQIndex];
        if (currentQ) {
          if (!updated.questionHistory[currentQ.id]) {
            updated.questionHistory[currentQ.id] = { correctCount: 0, totalAttempts: 0, buzzTimes: [] };
          }
          updated.questionHistory[currentQ.id].buzzTimes.push(newBuzz.elapsedMs);
        }

        updated.soundTrigger = { sound: 'buzzer', nonce: Math.random() };
      }
      break;
    }

    case 'SUBMIT_ANSWER': {
      if (!playerId || !updated.inputOpen || updated.phase !== 'QUESTION') break;
      const answer = String(payload?.answer || '').trim();
      if (!answer) break;

      const elapsed = updated.questionStartTime > 0 ? now - updated.questionStartTime : 0;
      const currentQ = updated.questions[updated.currentQIndex];
      const cleanSubmitted = cleanAnswerString(answer);
      const rawOfficial = String(currentQ?.answer || '');
      const acceptableAnswers = rawOfficial
        .split(/\s*\/\s*/)
        .map((part) => cleanAnswerString(part))
        .filter(Boolean);

      let autoStatus: 'pending' | 'correct' | 'wrong' = 'pending';
      if (currentQ?.type === 'MCQ' && acceptableAnswers.length > 0) {
        autoStatus = acceptableAnswers.includes(cleanSubmitted) ? 'correct' : 'wrong';
      } else if (currentQ?.type === 'NUMERIC') {
        const numSubmitted = parseFloat(cleanSubmitted.replace(/[^0-9.-]/g, ''));
        const numOfficial = parseFloat(rawOfficial.replace(/[^0-9.-]/g, ''));
        if (!isNaN(numSubmitted) && !isNaN(numOfficial)) {
          const diff = Math.abs(numSubmitted - numOfficial);
          autoStatus = diff === 0 || (numOfficial !== 0 && diff / Math.abs(numOfficial) <= 0.05) ? 'correct' : 'wrong';
        } else {
          autoStatus = acceptableAnswers.includes(cleanSubmitted) ? 'correct' : 'wrong';
        }
      } else if (acceptableAnswers.length > 0) {
        if (acceptableAnswers.includes(cleanSubmitted)) {
          autoStatus = 'correct';
        } else {
          autoStatus = 'pending';
        }
      }

      const prevSub = updated.submissions[playerId];
      if (prevSub && prevSub.status === 'correct' && updated.players[playerId]) {
        updated.players[playerId].score = Math.max(
          0,
          updated.players[playerId].score - (prevSub.pointsAwarded || currentQ?.points || 10)
        );
      }

      const isDoubleDown = Boolean(payload?.doubleDown || prevSub?.doubleDown);
      const isPointHeist = Boolean(payload?.pointHeist || prevSub?.pointHeist);

      if (isDoubleDown && updated.players[playerId] && (updated.players[playerId].doubleDownTokens ?? 2) > 0 && !prevSub?.doubleDown) {
        updated.players[playerId].doubleDownTokens = Math.max(0, (updated.players[playerId].doubleDownTokens ?? 2) - 1);
      }
      if (isPointHeist && updated.players[playerId] && !prevSub?.pointHeist) {
        updated.players[playerId].pointHeistAvailable = false;
      }

      let basePoints = currentQ?.points || 10;
      if (isDoubleDown) {
        basePoints *= 2;
      }

      const pointsAwarded = autoStatus === 'correct' ? basePoints : 0;
      const subObj: Submission = {
        playerId,
        playerName: updated.players[playerId]?.name || playerName || 'Player',
        answer,
        timestamp: now,
        elapsedMs: Math.max(1, elapsed),
        status: autoStatus,
        pointsAwarded,
        doubleDown: isDoubleDown,
        pointHeist: isPointHeist
      };
      updated.submissions[playerId] = subObj;

      if (!updated.buzzes.some((b) => b.playerId === playerId)) {
        updated.buzzes.push({
          playerId,
          playerName: updated.players[playerId]?.name || playerName || 'Player',
          timestamp: now,
          elapsedMs: Math.max(1, elapsed),
          serverOrder: updated.buzzes.length + 1,
          doubleDown: isDoubleDown
        });
      }

      if (autoStatus === 'correct' && updated.players[playerId]) {
        updated.players[playerId].score += pointsAwarded;
        updated.players[playerId].streak += 1;
        updated.soundTrigger = { sound: 'correct', nonce: Math.random() };
      } else if (autoStatus === 'wrong' && updated.players[playerId]) {
        updated.players[playerId].streak = 0;
        updated.soundTrigger = { sound: 'wrong', nonce: Math.random() };
      } else {
        updated.soundTrigger = { sound: 'ding', nonce: Math.random() };
      }

      if (currentQ) {
        if (!updated.questionHistory[currentQ.id]) {
          updated.questionHistory[currentQ.id] = { correctCount: 0, totalAttempts: 0, buzzTimes: [] };
        }
        updated.questionHistory[currentQ.id].totalAttempts += 1;
        if (autoStatus === 'correct') {
          updated.questionHistory[currentQ.id].correctCount += 1;
        }
      }
      break;
    }

    case 'ADJUDICATE': {
      const targetPid = payload?.playerId;
      const status = payload?.status as 'correct' | 'wrong';
      const points = Number(payload?.points || 10);
      if (targetPid && updated.players[targetPid]) {
        const prevSub = updated.submissions[targetPid];
        const alreadyAwarded = prevSub?.status === 'correct' ? (prevSub.pointsAwarded ?? points) : 0;

        if (status === 'correct') {
          const delta = Math.max(0, points - alreadyAwarded);
          updated.players[targetPid].score += delta;
          if (prevSub?.status !== 'correct') {
            updated.players[targetPid].streak += 1;
          }
          updated.soundTrigger = { sound: 'correct', nonce: Math.random() };
        } else if (status === 'wrong') {
          updated.players[targetPid].score = Math.max(0, updated.players[targetPid].score - alreadyAwarded);
          updated.players[targetPid].streak = 0;
          updated.soundTrigger = { sound: 'wrong', nonce: Math.random() };
        }

        if (prevSub) {
          updated.submissions[targetPid] = {
            ...prevSub,
            status,
            pointsAwarded: status === 'correct' ? points : 0
          };
        }
      }
      break;
    }

    case 'ADJUST_SCORE': {
      const targetPid = payload?.playerId;
      const delta = Number(payload?.delta || 0);
      if (targetPid && updated.players[targetPid]) {
        updated.players[targetPid].score = Math.max(0, updated.players[targetPid].score + delta);
      }
      break;
    }

    case 'UPDATE_QUESTIONS': {
      const matchedPack = DEFAULT_QUIZ_PACKS.find((p) => p.title === payload?.packTitle);
      if (Array.isArray(payload?.questions) && payload.questions.length > 0) {
        updated.questions = payload.questions;
      } else if (matchedPack) {
        updated.questions = [...matchedPack.questions];
      }
      updated.currentPackTitle = payload?.packTitle || updated.currentPackTitle || 'Custom Pack';
      updated.currentQIndex = 0;
      updated.buzzes = [];
      updated.submissions = {};
      updated.phase = 'LOBBY';
      break;
    }

    case 'ADD_QUESTION': {
      const newQ = payload?.question;
      if (newQ && newQ.question && newQ.answer) {
        const questionObj: Question = {
          id: newQ.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: newQ.type || 'BUZZER',
          category: newQ.category || 'Bonus Question',
          question: newQ.question.trim(),
          options: Array.isArray(newQ.options) ? newQ.options : [],
          answer: newQ.answer.trim(),
          points: Number(newQ.points) || 10,
          mediaType: newQ.mediaType || 'none',
          mediaUrl: newQ.mediaUrl || undefined,
          explanation: newQ.explanation || undefined,
          hint: newQ.hint || undefined
        };
        const insertAt = payload?.insertAt;
        if (typeof insertAt === 'number' && insertAt >= 0 && insertAt <= updated.questions.length) {
          updated.questions.splice(insertAt, 0, questionObj);
        } else {
          updated.questions.push(questionObj);
        }
      }
      break;
    }

    case 'EDIT_QUESTION': {
      const qIndex = payload?.index;
      const qData = payload?.question;
      if (typeof qIndex === 'number' && qIndex >= 0 && qIndex < updated.questions.length && qData) {
        updated.questions[qIndex] = {
          ...updated.questions[qIndex],
          ...qData
        };
      }
      break;
    }

    case 'DELETE_QUESTION': {
      const delIndex = payload?.index;
      if (typeof delIndex === 'number' && delIndex >= 0 && delIndex < updated.questions.length) {
        updated.questions.splice(delIndex, 1);
        if (updated.currentQIndex >= updated.questions.length) {
          updated.currentQIndex = Math.max(0, updated.questions.length - 1);
        }
      }
      break;
    }

    case 'TRIGGER_SOUND': {
      updated.soundTrigger = { sound: payload?.sound || 'ding', nonce: Math.random() };
      break;
    }

    case 'KICK_PLAYER': {
      const kickId = payload?.playerId;
      if (kickId && updated.players[kickId]) {
        delete updated.players[kickId];
        updated.buzzes = updated.buzzes.filter((b) => b.playerId !== kickId);
        delete updated.submissions[kickId];
      }
      break;
    }

    case 'START_TIMER': {
      const dur = Number(payload?.durationSec) || updated.timer?.durationSec || 20;
      updated.timer = {
        durationSec: dur,
        remainingSec: dur,
        running: true,
        autoLock: payload?.autoLock ?? (updated.timer?.autoLock ?? true),
        endsAt: now + dur * 1000
      };
      updated.soundTrigger = { sound: 'unlock', nonce: Math.random() };
      break;
    }

    case 'PAUSE_TIMER': {
      if (updated.timer) {
        updated.timer = { ...updated.timer, running: false };
      }
      break;
    }

    case 'RESET_TIMER': {
      const dur = Number(payload?.durationSec) || updated.timer?.durationSec || 20;
      updated.timer = {
        durationSec: dur,
        remainingSec: dur,
        running: false,
        autoLock: updated.timer?.autoLock ?? true,
        endsAt: 0
      };
      break;
    }

    case 'SET_TIMER_DURATION': {
      const dur = Math.max(5, Number(payload?.durationSec) || 20);
      if (updated.timer) {
        updated.timer = {
          ...updated.timer,
          durationSec: dur,
          remainingSec: dur
        };
      }
      break;
    }

    case 'TOGGLE_AUTO_LOCK': {
      if (updated.timer) {
        updated.timer = {
          ...updated.timer,
          autoLock: payload?.autoLock ?? !updated.timer.autoLock
        };
      }
      break;
    }

    case 'TIMER_TICK': {
      if (updated.timer && updated.timer.running && updated.phase === 'QUESTION') {
        const newRem = Math.max(0, updated.timer.remainingSec - 1);
        updated.timer = {
          ...updated.timer,
          remainingSec: newRem
        };
        if (newRem <= 0) {
          updated.timer.running = false;
          if (updated.timer.autoLock) {
            updated.inputOpen = false;
            updated.soundTrigger = { sound: 'buzzer', nonce: Math.random() };
          }
        } else if (newRem <= 5) {
          updated.soundTrigger = { sound: 'tick', nonce: Math.random() };
        }
      }
      break;
    }

    case 'TRIGGER_SABOTAGE': {
      const targetPid = payload?.targetPlayerId;
      const sabType = (payload?.type || 'ink') as 'ink' | 'frost' | 'scramble';
      const attacker = updated.players[playerId || ''];
      if (targetPid && updated.players[targetPid] && attacker && (attacker.sabotageTokens ?? 1) > 0) {
        attacker.sabotageTokens = Math.max(0, (attacker.sabotageTokens ?? 1) - 1);
        const sabObj = {
          type: sabType,
          fromName: attacker.name,
          expiresAt: now + 6000
        };
        updated.players[targetPid].activeSabotage = sabObj;
        if (!updated.activeSabotages) updated.activeSabotages = {};
        updated.activeSabotages[targetPid] = sabObj;
        updated.soundTrigger = { sound: 'whoosh', nonce: Math.random() };
      }
      break;
    }

    case 'CLEAR_SABOTAGE': {
      const targetPid = payload?.targetPlayerId || playerId;
      if (targetPid && updated.players[targetPid]) {
        updated.players[targetPid].activeSabotage = null;
        if (updated.activeSabotages) {
          delete updated.activeSabotages[targetPid];
        }
      }
      break;
    }

    case 'REVEAL_NEXT_CLUE': {
      const currentQ = updated.questions[updated.currentQIndex];
      const clues = currentQ?.progressiveClues || (currentQ?.hint ? [currentQ.hint] : []);
      const nextIdx = (updated.progressiveClueIndex ?? 0) + 1;
      if (nextIdx <= clues.length) {
        updated.progressiveClueIndex = nextIdx;
        updated.soundTrigger = { sound: 'ding', nonce: Math.random() };
      }
      break;
    }

    case 'TOGGLE_BLUFF_MODE': {
      const active = payload?.active ?? !(updated.bluffMode?.active);
      updated.bluffMode = {
        active,
        phase: 'bluffing',
        bluffs: {}
      };
      updated.soundTrigger = { sound: 'whoosh', nonce: Math.random() };
      break;
    }

    case 'SET_BLUFF_PHASE': {
      const phase = (payload?.phase || 'voting') as 'bluffing' | 'voting';
      if (updated.bluffMode) {
        updated.bluffMode.phase = phase;
      }
      break;
    }

    case 'SUBMIT_BLUFF': {
      const text = String(payload?.text || '').trim();
      if (playerId && text && updated.bluffMode) {
        updated.bluffMode.bluffs[playerId] = {
          playerId,
          playerName: updated.players[playerId]?.name || playerName || 'Player',
          text,
          votes: []
        };
      }
      break;
    }

    case 'VOTE_BLUFF': {
      const votedTargetId = payload?.targetPlayerId;
      if (playerId && votedTargetId && updated.bluffMode) {
        const entry = updated.bluffMode.bluffs[votedTargetId];
        if (entry && !entry.votes.includes(playerId)) {
          entry.votes.push(playerId);
          if (updated.players[votedTargetId]) {
            updated.players[votedTargetId].score += 5;
          }
        }
      }
      break;
    }

    default:
      break;
  }

  updated.lastUpdated = now;
  return updated;
}

export function useQuizSync({ roomCode, role, playerId, playerName }: UseQuizSyncProps) {
  const normalizedCode = (roomCode || 'QUIZ').trim().toUpperCase();

  const [room, setRoom] = useState<GameRoom>(() => {
    try {
      const saved = localStorage.getItem(`quizcast_room_${normalizedCode}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return {
            ...parsed,
            revision: parsed.revision || 1
          };
        }
      }
    } catch (e) {}
    return createDefaultRoom(normalizedCode);
  });

  const [connected, setConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);

  const mqttClientRef = useRef<MqttClient | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastSoundNonceRef = useRef<number>(0);
  const processedNoncesRef = useRef<Set<string>>(new Set());
  const roomRef = useRef<GameRoom>(room);
  roomRef.current = room;

  useEffect(() => {
    if (room) {
      try {
        localStorage.setItem(`quizcast_room_${normalizedCode}`, JSON.stringify(room));
      } catch (e) {}
    }
  }, [room, normalizedCode]);

  const applyRoomState = useCallback((incoming: Partial<GameRoom>, force = false) => {
    if (!incoming) return;
    const current = roomRef.current;
    const currentRev = current.revision || 1;
    const incomingRev = incoming.revision || 1;
    const currentPlayersCount = Object.keys(current.players || {}).length;
    const incomingPlayersCount = Object.keys(incoming.players || {}).length;

    const shouldApply =
      force ||
      incomingRev > currentRev ||
      (incomingRev === currentRev && incomingPlayersCount > currentPlayersCount);

    if (shouldApply) {
      let resolvedQuestions = current.questions;
      if (Array.isArray(incoming.questions) && incoming.questions.length > 0) {
        resolvedQuestions = incoming.questions;
      } else if (incoming.currentPackTitle && incoming.currentPackTitle !== current.currentPackTitle) {
        const matchedPack = DEFAULT_QUIZ_PACKS.find((p) => p.title === incoming.currentPackTitle);
        if (matchedPack) {
          resolvedQuestions = [...matchedPack.questions];
        }
      }

      const mergedRoom: GameRoom = {
        ...current,
        ...incoming,
        questions: resolvedQuestions
      };

      setRoom(mergedRoom);

      if (mergedRoom.soundTrigger && mergedRoom.soundTrigger.nonce !== lastSoundNonceRef.current) {
        lastSoundNonceRef.current = mergedRoom.soundTrigger.nonce;
        soundEffects.play(mergedRoom.soundTrigger.sound);
      }

      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'SYNC_ROOM',
            roomCode: normalizedCode,
            room: mergedRoom,
            revision: mergedRoom.revision
          });
        } catch (e) {}
      }
    }
  }, [normalizedCode]);

  const publishToNetwork = useCallback((msg: any, options?: { skipNtfy?: boolean }) => {
    const rawJson = JSON.stringify(msg);
    const mqttTopic = `quizcast_mesh_v5_${normalizedCode}`;
    const httpTopic = `quizcast_ntfy_v5_${normalizedCode.toLowerCase()}`;

    // 1. MQTT Cloud Publish
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      try {
        mqttClientRef.current.publish(mqttTopic, rawJson, { qos: 0 });
      } catch (e) {}
    }

    // 2. HTTPS / SSE Relay via ntfy.sh (Port 443)
    if (!options?.skipNtfy && msg.type !== 'HEARTBEAT') {
      try {
        let ntfyBody = rawJson;
        if (msg.type === 'SYNC_ROOM' && msg.room && rawJson.length > 3500) {
          const { questions, ...lightweightRoom } = msg.room;
          ntfyBody = JSON.stringify({
            ...msg,
            room: lightweightRoom
          });
        }
        fetch(`https://ntfy.sh/${httpTopic}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: ntfyBody,
          mode: 'cors'
        }).catch(() => {});
      } catch (e) {}
    }

    // 3. BroadcastChannel (Same-device sync)
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(msg);
      } catch (e) {}
    }

    // 4. Optional Custom Backend REST API (only if VITE_BACKEND_URL is set)
    const apiBase = getBackendHttpUrl();
    if (apiBase && (msg.type === 'PLAYER_ACTION' || msg.type === 'HOST_ACTION' || msg.type === 'PLAYER_JOIN')) {
      const actionPayload =
        msg.type === 'PLAYER_JOIN'
          ? { type: 'JOIN_ROOM', playerId: msg.playerId, playerName: msg.playerName, role: 'player' }
          : msg.action;

      if (actionPayload) {
        try {
          fetch(`${apiBase}/api/room/${normalizedCode}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...actionPayload,
              roomCode: normalizedCode
            })
          }).catch(() => {});
        } catch (e) {}
      }
    }
  }, [normalizedCode]);

  useEffect(() => {
    if (!role) return;

    let isCleanedUp = false;
    const mqttTopic = `quizcast_mesh_v5_${normalizedCode}`;
    const httpTopic = `quizcast_ntfy_v5_${normalizedCode.toLowerCase()}`;
    const pingStart = Date.now();

    const isDuplicate = (nonce?: string) => {
      if (!nonce) return false;
      if (processedNoncesRef.current.has(nonce)) return true;
      processedNoncesRef.current.add(nonce);
      if (processedNoncesRef.current.size > 200) {
        const arr = Array.from(processedNoncesRef.current);
        processedNoncesRef.current = new Set(arr.slice(50));
      }
      return false;
    };

    const handleNetworkMessage = (data: any) => {
      if (isCleanedUp || !data || !data.type) return;
      if (data.roomCode && data.roomCode !== normalizedCode) return;
      if (data.nonce && isDuplicate(data.nonce)) return;

      const isAuthority = role === 'tv' || role === 'host';

      switch (data.type) {
        case 'PLAYER_JOIN':
        case 'REQUEST_ROOM_SYNC': {
          if (isAuthority) {
            let current = roomRef.current;
            if (data.playerId && data.type === 'PLAYER_JOIN') {
              current = reduceGameAction(current, {
                type: 'JOIN_ROOM',
                playerId: data.playerId,
                playerName: data.playerName || 'Player',
                role: 'player'
              });
              applyRoomState(current, true);
            }

            if (data.type === 'PLAYER_JOIN' || (current.revision || 1) >= (data.revision || 1)) {
              publishToNetwork({
                type: 'SYNC_ROOM',
                roomCode: normalizedCode,
                room: current,
                revision: current.revision || 1,
                targetPlayerId: data.playerId,
                nonce: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
              });
            }
          }
          break;
        }

        case 'PLAYER_ACTION': {
          if (data.action) {
            const updated = reduceGameAction(roomRef.current, data.action);
            applyRoomState(updated, true);

            if (isAuthority) {
              publishToNetwork({
                type: 'SYNC_ROOM',
                roomCode: normalizedCode,
                room: updated,
                revision: updated.revision,
                actionOriginId: data.actionId,
                nonce: `conf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
              });
            }
          }
          break;
        }

        case 'HOST_ACTION': {
          if (data.action) {
            const updated = reduceGameAction(roomRef.current, data.action);
            applyRoomState(updated, true);
          }
          break;
        }

        case 'SYNC_ROOM': {
          if (data.room) {
            if (data.targetPlayerId && role === 'player' && data.targetPlayerId !== playerId) {
              return;
            }
            applyRoomState(data.room, false);
          }
          break;
        }

        case 'HEARTBEAT': {
          const localRev = roomRef.current.revision || 1;
          if ((data.revision && data.revision > localRev) || (role === 'player' && roomRef.current.phase !== data.phase)) {
            publishToNetwork({
              type: 'REQUEST_ROOM_SYNC',
              roomCode: normalizedCode,
              playerId,
              playerName,
              revision: localRev,
              nonce: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
            });
          }
          break;
        }

        default:
          break;
      }
    };

    // 1. Setup Local BroadcastChannel
    try {
      const bc = new BroadcastChannel(`quizcast_bc_v5_${normalizedCode}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data) {
          handleNetworkMessage(event.data);
        }
      };
    } catch (e) {}

    // 2. Setup HTTPS / SSE Stream via ntfy.sh
    try {
      const es = new EventSource(`https://ntfy.sh/${httpTopic}/sse`);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!isCleanedUp) {
          setConnected(true);
          setLatencyMs(Math.max(1, Date.now() - pingStart));
        }
      };

      es.onmessage = (event) => {
        if (isCleanedUp || !event.data) return;
        try {
          const raw = JSON.parse(event.data);
          if (raw.event === 'message' && raw.message) {
            const parsed = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw.message;
            handleNetworkMessage(parsed);
          }
        } catch (e) {}
      };
    } catch (e) {}

    // 3. Setup MQTT Cloud Mesh with automatic failover
    const mqttBrokers = [
      'wss://broker.emqx.io:8084/mqtt',
      'wss://broker.hivemq.com:8884/mqtt',
      'wss://test.mosquitto.org:8081/mqtt'
    ];
    let brokerIndex = 0;
    let reconnectTimeout: any = null;

    function connectMqtt() {
      if (isCleanedUp) return;
      const brokerUrl = mqttBrokers[brokerIndex % mqttBrokers.length];
      const clientUuid = `qc_${role}_${Math.random().toString(36).substring(2, 9)}`;

      try {
        const client = mqtt.connect(brokerUrl, {
          clientId: clientUuid,
          clean: true,
          connectTimeout: 4000,
          reconnectPeriod: 0,
          keepalive: 30
        });
        mqttClientRef.current = client;

        const rotateBroker = () => {
          try {
            client.removeAllListeners();
            client.end(true);
          } catch (e) {}
          brokerIndex++;
          if (!isCleanedUp) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connectMqtt, 1500);
          }
        };

        client.on('connect', () => {
          if (isCleanedUp) return;
          setConnected(true);
          setLatencyMs(Math.max(1, Date.now() - pingStart));

          client.subscribe(mqttTopic, { qos: 0 }, (err) => {
            if (!err && !isCleanedUp) {
              if (role === 'player') {
                publishToNetwork({
                  type: 'PLAYER_JOIN',
                  roomCode: normalizedCode,
                  playerId,
                  playerName: playerName || 'Player',
                  nonce: `join_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
                });
              } else {
                publishToNetwork({
                  type: 'REQUEST_ROOM_SYNC',
                  roomCode: normalizedCode,
                  revision: roomRef.current.revision || 1,
                  nonce: `auth_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
                });
                publishToNetwork({
                  type: 'SYNC_ROOM',
                  roomCode: normalizedCode,
                  room: roomRef.current,
                  revision: roomRef.current.revision || 1,
                  nonce: `init_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
                });
              }
            }
          });
        });

        client.on('message', (_topic, msgBuffer) => {
          if (isCleanedUp) return;
          try {
            const data = JSON.parse(msgBuffer.toString());
            handleNetworkMessage(data);
          } catch (e) {}
        });

        client.on('error', rotateBroker);
        client.on('close', rotateBroker);
        client.on('offline', rotateBroker);
      } catch (e) {
        brokerIndex++;
        if (!isCleanedUp) {
          reconnectTimeout = setTimeout(connectMqtt, 2000);
        }
      }
    }

    connectMqtt();

    // 4. Heartbeat timer (MQTT & BroadcastChannel only)
    const heartbeatTimer = setInterval(() => {
      if (isCleanedUp) return;

      if (role === 'tv' || role === 'host') {
        publishToNetwork(
          {
            type: 'HEARTBEAT',
            roomCode: normalizedCode,
            revision: roomRef.current.revision || 1,
            phase: roomRef.current.phase,
            currentQIndex: roomRef.current.currentQIndex,
            inputOpen: roomRef.current.inputOpen,
            playerCount: Object.keys(roomRef.current.players).length,
            timestamp: Date.now()
          },
          { skipNtfy: true }
        );
      }
    }, 3000);

    const initTimer = setTimeout(() => {
      if (isCleanedUp) return;
      if (role === 'player' && playerId) {
        publishToNetwork({
          type: 'PLAYER_JOIN',
          roomCode: normalizedCode,
          playerId,
          playerName: playerName || 'Player',
          nonce: `init_join_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        });
      } else if (role === 'tv' || role === 'host') {
        publishToNetwork({
          type: 'REQUEST_ROOM_SYNC',
          roomCode: normalizedCode,
          revision: roomRef.current.revision || 1,
          nonce: `init_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        });
      }
    }, 400);

    return () => {
      isCleanedUp = true;
      clearInterval(heartbeatTimer);
      clearTimeout(initTimer);
      clearTimeout(reconnectTimeout);
      if (mqttClientRef.current) {
        try {
          mqttClientRef.current.removeAllListeners();
          mqttClientRef.current.end(true);
        } catch (e) {}
      }
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch (e) {}
      }
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.close();
        } catch (e) {}
      }
    };
  }, [normalizedCode, role, playerId, playerName, applyRoomState, publishToNetwork]);

  const sendAction = useCallback(
    (type: string, payload?: any) => {
      const actionObj = {
        type,
        playerId,
        playerName,
        role: role || undefined,
        payload
      };

      const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const updated = reduceGameAction(roomRef.current, actionObj);
      applyRoomState(updated, true);

      if (role === 'player') {
        publishToNetwork({
          type: 'PLAYER_ACTION',
          roomCode: normalizedCode,
          action: actionObj,
          actionId,
          nonce: actionId
        });
      } else {
        publishToNetwork({
          type: 'HOST_ACTION',
          roomCode: normalizedCode,
          action: actionObj,
          actionId,
          nonce: actionId
        });
        publishToNetwork({
          type: 'SYNC_ROOM',
          roomCode: normalizedCode,
          room: updated,
          revision: updated.revision,
          nonce: `sync_${actionId}`
        });
      }
    },
    [normalizedCode, role, playerId, playerName, applyRoomState, publishToNetwork]
  );

  // Authoritative 1s Timer Ticker for TV or Host
  useEffect(() => {
    if (role !== 'tv' && role !== 'host') return;
    if (!room.timer?.running || room.phase !== 'QUESTION') return;

    const interval = setInterval(() => {
      sendAction('TIMER_TICK');
    }, 1000);

    return () => clearInterval(interval);
  }, [role, room.timer?.running, room.phase, sendAction]);

  const buzzIn = useCallback(
    (options?: { doubleDown?: boolean }) => {
      sendAction('BUZZ_IN', options);
    },
    [sendAction]
  );

  const submitAnswer = useCallback(
    (answer: string, options?: { doubleDown?: boolean; pointHeist?: boolean }) => {
      sendAction('SUBMIT_ANSWER', { answer, ...options });
    },
    [sendAction]
  );

  const setPhase = useCallback(
    (phase: GamePhase, inputOpen?: boolean) => {
      sendAction('SET_PHASE', { phase, inputOpen });
    },
    [sendAction]
  );

  const toggleLock = useCallback(
    (open?: boolean) => {
      sendAction('TOGGLE_LOCK', { open });
    },
    [sendAction]
  );

  const changeQuestion = useCallback(
    (index: number) => {
      sendAction('CHANGE_QUESTION', { index });
    },
    [sendAction]
  );

  const resetBuzzes = useCallback(() => {
    sendAction('RESET_BUZZES');
  }, [sendAction]);

  const adjudicate = useCallback(
    (targetPlayerId: string, status: 'correct' | 'wrong', points: number) => {
      sendAction('ADJUDICATE', { playerId: targetPlayerId, status, points });
    },
    [sendAction]
  );

  const adjustScore = useCallback(
    (targetPlayerId: string, delta: number) => {
      sendAction('ADJUST_SCORE', { playerId: targetPlayerId, delta });
    },
    [sendAction]
  );

  const updateQuestions = useCallback(
    (questions: Question[], packTitle?: string) => {
      sendAction('UPDATE_QUESTIONS', { questions, packTitle });
    },
    [sendAction]
  );

  const addQuestion = useCallback(
    (question: Partial<Question>, insertAt?: number) => {
      sendAction('ADD_QUESTION', { question, insertAt });
    },
    [sendAction]
  );

  const editQuestion = useCallback(
    (index: number, question: Partial<Question>) => {
      sendAction('EDIT_QUESTION', { index, question });
    },
    [sendAction]
  );

  const deleteQuestion = useCallback(
    (index: number) => {
      sendAction('DELETE_QUESTION', { index });
    },
    [sendAction]
  );

  const triggerSound = useCallback(
    (sound: string) => {
      sendAction('TRIGGER_SOUND', { sound });
    },
    [sendAction]
  );

  const kickPlayer = useCallback(
    (targetPlayerId: string) => {
      sendAction('KICK_PLAYER', { playerId: targetPlayerId });
    },
    [sendAction]
  );

  const updatePlayerName = useCallback(
    (newName: string) => {
      sendAction('JOIN_ROOM', { name: newName });
    },
    [sendAction]
  );

  const startTimer = useCallback(
    (durationSec?: number) => {
      sendAction('START_TIMER', { durationSec });
    },
    [sendAction]
  );

  const pauseTimer = useCallback(() => {
    sendAction('PAUSE_TIMER');
  }, [sendAction]);

  const resetTimer = useCallback(
    (durationSec?: number) => {
      sendAction('RESET_TIMER', { durationSec });
    },
    [sendAction]
  );

  const setTimerDuration = useCallback(
    (durationSec: number) => {
      sendAction('SET_TIMER_DURATION', { durationSec });
    },
    [sendAction]
  );

  const toggleAutoLock = useCallback(
    (autoLock?: boolean) => {
      sendAction('TOGGLE_AUTO_LOCK', { autoLock });
    },
    [sendAction]
  );

  const triggerSabotage = useCallback(
    (targetPlayerId: string, type: 'ink' | 'frost' | 'scramble') => {
      sendAction('TRIGGER_SABOTAGE', { targetPlayerId, type });
    },
    [sendAction]
  );

  const clearSabotage = useCallback(
    (targetPlayerId?: string) => {
      sendAction('CLEAR_SABOTAGE', { targetPlayerId });
    },
    [sendAction]
  );

  const revealNextClue = useCallback(() => {
    sendAction('REVEAL_NEXT_CLUE');
  }, [sendAction]);

  const toggleBluffMode = useCallback(
    (active?: boolean) => {
      sendAction('TOGGLE_BLUFF_MODE', { active });
    },
    [sendAction]
  );

  const setBluffPhase = useCallback(
    (phase: 'bluffing' | 'voting') => {
      sendAction('SET_BLUFF_PHASE', { phase });
    },
    [sendAction]
  );

  const submitBluff = useCallback(
    (text: string) => {
      sendAction('SUBMIT_BLUFF', { text });
    },
    [sendAction]
  );

  const voteBluff = useCallback(
    (targetPlayerId: string) => {
      sendAction('VOTE_BLUFF', { targetPlayerId });
    },
    [sendAction]
  );

  return {
    room,
    connected,
    latencyMs,
    buzzIn,
    submitAnswer,
    setPhase,
    toggleLock,
    changeQuestion,
    resetBuzzes,
    adjudicate,
    adjustScore,
    updateQuestions,
    addQuestion,
    editQuestion,
    deleteQuestion,
    triggerSound,
    kickPlayer,
    updatePlayerName,
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerDuration,
    toggleAutoLock,
    triggerSabotage,
    clearSabotage,
    revealNextClue,
    toggleBluffMode,
    setBluffPhase,
    submitBluff,
    voteBluff
  };
}
