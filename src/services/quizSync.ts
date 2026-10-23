import { useEffect, useState, useRef, useCallback } from 'react';
import {
  GameRoom,
  Question,
  GamePhase,
  Buzz,
  Submission,
  ConfidenceLevel,
  SabotageType
} from '../types/quiz';
import { DEFAULT_QUIZ_PACKS } from '../data/defaultQuizPacks';
import { soundEffects } from '../utils/soundEffects';
import mqtt, { MqttClient } from 'mqtt';

interface UseQuizSyncProps {
  roomCode: string;
  role: 'tv' | 'host' | 'player' | null;
  playerId?: string;
  playerName?: string;
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
    timerSeconds: 0,
    clueStep: 0,
    heistActive: false,
    bluffStage: 'ENTER_LIES',
    bluffLies: {},
    bluffOptions: [],
    questions: defaultPack ? [...defaultPack.questions] : [],
    currentPackTitle: defaultPack ? defaultPack.title : 'General Knowledge: Round 1',
    players: {},
    buzzes: [],
    submissions: {},
    questionHistory: {},
    lastUpdated: Date.now(),
    revision: Date.now()
  };
}

export function cleanAnswerString(str: string): string {
  return String(str || '')
    .toLowerCase()
    .replace(/^(the|a|an|king|sir|lord)\s+/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function isAnswerMatch(submitted: string, officialRaw: string): boolean {
  const cleanSub = cleanAnswerString(submitted);
  if (!cleanSub) return false;

  const parts = String(officialRaw || '')
    .split(/[/,]/)
    .map((p) => p.replace(/\(.*?\)/g, '').trim())
    .filter(Boolean);

  const fullOfficialClean = cleanAnswerString(officialRaw.replace(/\(.*?\)/g, ''));
  if (cleanSub === fullOfficialClean) return true;

  for (const part of parts) {
    const cleanPart = cleanAnswerString(part);
    if (!cleanPart) continue;
    if (cleanSub === cleanPart) return true;
    // Allow minor singular/plural difference (e.g. "nacho" vs "nachos")
    if (cleanSub.length >= 4 && (cleanSub + 's' === cleanPart || cleanPart + 's' === cleanSub)) {
      return true;
    }
  }
  return false;
}

function resetQuestionPerPlayerState(players: Record<string, any>) {
  const next: Record<string, any> = {};
  Object.keys(players).forEach((pid) => {
    next[pid] = {
      ...players[pid],
      doubleDownActive: false,
      confidence: 'NORMAL',
      heistTargetId: undefined,
      sabotageEffect: null
    };
  });
  return next;
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
    bluffLies: { ...(prevRoom.bluffLies || {}) },
    bluffOptions: [...(prevRoom.bluffOptions || [])],
    questions: [...prevRoom.questions],
    questionHistory: { ...prevRoom.questionHistory },
    // Monotonic timestamp revision so Host commands are never rejected as older
    revision: Math.max((prevRoom.revision || 1) + 1, now)
  };

  const currentQ = updated.questions[updated.currentQIndex];

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
            maxStreakLost: 0,
            totalAnswerMs: 0,
            answerCount: 0,
            wagerNet: 0,
            connected: true,
            avatar: `avatar-${(Object.keys(updated.players).length % 8) + 1}`,
            lastSeen: now,
            doubleDownUsed: false,
            doubleDownActive: false,
            confidence: 'NORMAL',
            sabotageEffect: null
          };
        } else {
          updated.players[playerId] = {
            ...updated.players[playerId],
            connected: true,
            lastSeen: now,
            name: cleanName && cleanName !== 'Player' ? cleanName : updated.players[playerId].name
          };
        }
      }
      break;
    }

    case 'TOGGLE_DOUBLE_DOWN': {
      if (playerId && updated.players[playerId] && updated.inputOpen && updated.phase === 'QUESTION') {
        const p = updated.players[playerId];
        if (!p.doubleDownUsed && !updated.submissions[playerId]) {
          updated.players[playerId] = {
            ...p,
            doubleDownActive: !p.doubleDownActive
          };
        }
      }
      break;
    }

    case 'SET_CONFIDENCE': {
      const level = payload?.level as ConfidenceLevel;
      if (
        playerId &&
        updated.players[playerId] &&
        ['SAFE', 'NORMAL', 'ALL_IN'].includes(level) &&
        !updated.submissions[playerId]
      ) {
        updated.players[playerId] = {
          ...updated.players[playerId],
          confidence: level
        };
      }
      break;
    }

    case 'SET_HEIST_TARGET': {
      const targetId = payload?.targetPlayerId;
      if (playerId && updated.players[playerId] && targetId && targetId !== playerId) {
        updated.players[playerId] = {
          ...updated.players[playerId],
          heistTargetId: targetId
        };
      }
      break;
    }

    case 'TOGGLE_HEIST_MODE': {
      updated.heistActive = payload?.active ?? !updated.heistActive;
      updated.soundTrigger = { sound: 'unlock', nonce: Math.random() };
      break;
    }

    case 'SABOTAGE_PLAYER': {
      const targetId = payload?.targetPlayerId;
      const sabType = (payload?.sabotageType || 'ICE') as SabotageType;
      if (
        playerId &&
        targetId &&
        updated.players[playerId] &&
        updated.players[targetId] &&
        updated.players[playerId].score >= 5
      ) {
        updated.players[playerId] = {
          ...updated.players[playerId],
          score: Math.max(0, updated.players[playerId].score - 5)
        };
        updated.players[targetId] = {
          ...updated.players[targetId],
          sabotageEffect: {
            type: sabType,
            fromName: updated.players[playerId].name,
            nonce: Math.random()
          }
        };
        updated.soundTrigger = { sound: 'buzzer', nonce: Math.random() };
      }
      break;
    }

    case 'CLEAR_SABOTAGE': {
      if (playerId && updated.players[playerId]) {
        updated.players[playerId] = {
          ...updated.players[playerId],
          sabotageEffect: null
        };
      }
      break;
    }

    case 'NEXT_CLUE': {
      const maxClues = currentQ?.clues?.length || 4;
      updated.clueStep = Math.min(maxClues - 1, (updated.clueStep || 0) + 1);
      updated.soundTrigger = { sound: 'ding', nonce: Math.random() };
      break;
    }

    case 'SUBMIT_LIE': {
      if (!playerId || !updated.inputOpen || updated.phase !== 'QUESTION') break;
      const lieText = String(payload?.lie || '').trim();
      if (!lieText) break;
      if (isAnswerMatch(lieText, currentQ?.answer || '')) break;
      updated.bluffLies = {
        ...(updated.bluffLies || {}),
        [playerId]: lieText
      };
      updated.soundTrigger = { sound: 'ding', nonce: Math.random() };
      break;
    }

    case 'START_BLUFF_VOTE': {
      if (!currentQ) break;
      const liesList = Object.values(updated.bluffLies || {});
      const uniquePool = Array.from(new Set([...liesList, currentQ.answer]));
      uniquePool.sort((a, b) => a.localeCompare(b));
      updated.bluffStage = 'VOTE';
      updated.bluffOptions = uniquePool;
      updated.soundTrigger = { sound: 'whoosh', nonce: Math.random() };
      break;
    }

    case 'START_TIMER': {
      const seconds = Number(payload?.seconds || 20);
      updated.timerSeconds = seconds;
      updated.questionStartTime = now;
      updated.inputOpen = true;
      updated.soundTrigger = { sound: 'ding', nonce: Math.random() };
      break;
    }

    case 'SET_PHASE': {
      const newPhase = payload?.phase as GamePhase;
      if (newPhase && ['LOBBY', 'QUESTION', 'REVEAL', 'ROUND_STATS', 'LEADERBOARD'].includes(newPhase)) {
        updated.phase = newPhase;
        if (newPhase === 'QUESTION') {
          updated.questionStartTime = now;
          updated.timerSeconds = 0;
          updated.clueStep = 0;
          updated.bluffStage = 'ENTER_LIES';
          updated.bluffLies = {};
          updated.bluffOptions = [];
          updated.inputOpen = payload?.inputOpen ?? true;
          updated.buzzes = [];
          updated.submissions = {};
          updated.players = resetQuestionPerPlayerState(updated.players);
          updated.soundTrigger = { sound: 'whoosh', nonce: Math.random() };
        } else if (newPhase === 'REVEAL') {
          updated.inputOpen = false;
          updated.timerSeconds = 0;

          if (currentQ?.type === 'NUMBER') {
            const targetVal = parseFloat(String(currentQ.answer).replace(/[^0-9.-]/g, ''));
            if (!isNaN(targetVal)) {
              let bestDiff = Infinity;
              let closestWinners: string[] = [];
              Object.values(updated.submissions).forEach((sub) => {
                const num = parseFloat(String(sub.answer).replace(/[^0-9.-]/g, ''));
                if (!isNaN(num) && num <= targetVal) {
                  const diff = targetVal - num;
                  if (diff < bestDiff) {
                    bestDiff = diff;
                    closestWinners = [sub.playerId];
                  } else if (diff === bestDiff) {
                    closestWinners.push(sub.playerId);
                  }
                }
              });
              if (closestWinners.length === 0) {
                Object.values(updated.submissions).forEach((sub) => {
                  const num = parseFloat(String(sub.answer).replace(/[^0-9.-]/g, ''));
                  if (!isNaN(num)) {
                    const diff = Math.abs(targetVal - num);
                    if (diff < bestDiff) {
                      bestDiff = diff;
                      closestWinners = [sub.playerId];
                    } else if (diff === bestDiff) {
                      closestWinners.push(sub.playerId);
                    }
                  }
                });
              }
              Object.keys(updated.submissions).forEach((pid) => {
                const isWin = closestWinners.includes(pid);
                const pts = isWin ? currentQ.points || 10 : 0;
                updated.submissions[pid] = {
                  ...updated.submissions[pid],
                  status: isWin ? 'correct' : 'wrong',
                  pointsAwarded: pts
                };
                if (isWin && updated.players[pid]) {
                  updated.players[pid].score += pts;
                  updated.players[pid].streak += 1;
                } else if (updated.players[pid]) {
                  updated.players[pid].maxStreakLost = Math.max(
                    updated.players[pid].maxStreakLost || 0,
                    updated.players[pid].streak || 0
                  );
                  updated.players[pid].streak = 0;
                }
              });
            }
          }

          if (updated.heistActive) {
            Object.keys(updated.players).forEach((pid) => {
              const p = updated.players[pid];
              const targetId = p.heistTargetId;
              if (targetId && updated.players[targetId]) {
                const mySub = updated.submissions[pid];
                const targetSub = updated.submissions[targetId];
                if (mySub?.status === 'correct' && targetSub?.status !== 'correct') {
                  const steal = Math.min(10, updated.players[targetId].score);
                  updated.players[targetId].score = Math.max(0, updated.players[targetId].score - steal);
                  updated.players[pid].score += steal;
                  updated.players[pid].wagerNet = (updated.players[pid].wagerNet || 0) + steal;
                  updated.submissions[pid] = {
                    ...mySub,
                    heistStolen: steal
                  };
                }
              }
            });
          }

          updated.soundTrigger = { sound: 'ding', nonce: Math.random() };
        } else if (newPhase === 'ROUND_STATS' || newPhase === 'LEADERBOARD') {
          updated.inputOpen = false;
          updated.timerSeconds = 0;
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
        updated.timerSeconds = 0;
        updated.clueStep = 0;
        updated.heistActive = false;
        updated.bluffStage = 'ENTER_LIES';
        updated.bluffLies = {};
        updated.bluffOptions = [];
        updated.questionStartTime = now;
        updated.phase = 'QUESTION';
        updated.players = resetQuestionPerPlayerState(updated.players);
        updated.soundTrigger = { sound: 'whoosh', nonce: Math.random() };
      }
      break;
    }

    case 'TOGGLE_LOCK': {
      const wasOpen = updated.inputOpen;
      updated.inputOpen = payload?.open ?? !updated.inputOpen;
      if (!updated.inputOpen) {
        updated.timerSeconds = 0;
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
        const newBuzz: Buzz = {
          playerId,
          playerName: updated.players[playerId]?.name || playerName || 'Player',
          timestamp: now,
          elapsedMs: Math.max(1, elapsed),
          serverOrder: updated.buzzes.length + 1
        };
        updated.buzzes.push(newBuzz);
        updated.soundTrigger = { sound: 'buzzer', nonce: Math.random() };
      }
      break;
    }

    case 'SUBMIT_ANSWER': {
      if (!playerId || !updated.inputOpen || updated.phase !== 'QUESTION') break;
      const answer = String(payload?.answer || '').trim();
      if (!answer) break;
      const elapsed = updated.questionStartTime > 0 ? now - updated.questionStartTime : 0;
      const matched = isAnswerMatch(answer, currentQ?.answer || '');

      let autoStatus: 'pending' | 'correct' | 'wrong' = 'pending';
      if (currentQ?.type === 'NUMBER') {
        autoStatus = 'pending';
      } else if (currentQ?.type === 'MCQ' || currentQ?.type === 'BLUFF') {
        autoStatus = matched ? 'correct' : 'wrong';
      } else {
        autoStatus = matched ? 'correct' : 'pending';
      }

      const playerObj = updated.players[playerId];
      const prevSub = updated.submissions[playerId];
      if (prevSub && playerObj) {
        updated.players[playerId] = {
          ...playerObj,
          score: Math.max(0, playerObj.score - (prevSub.pointsAwarded || 0))
        };
      }

      if (currentQ?.type === 'BLUFF' && updated.bluffStage === 'VOTE' && autoStatus === 'wrong') {
        const liarEntry = Object.entries(updated.bluffLies || {}).find(
          ([liarPid, lieVal]) => liarPid !== playerId && isAnswerMatch(answer, lieVal)
        );
        if (liarEntry) {
          const [liarPid] = liarEntry;
          if (updated.players[liarPid]) {
            updated.players[liarPid] = {
              ...updated.players[liarPid],
              score: updated.players[liarPid].score + 5,
              wagerNet: (updated.players[liarPid].wagerNet || 0) + 5
            };
          }
        }
      }

      const isDoubled = Boolean(playerObj?.doubleDownActive || prevSub?.doubledDown);
      const confidence: ConfidenceLevel = playerObj?.confidence || prevSub?.confidence || 'NORMAL';

      if (playerObj && isDoubled) {
        updated.players[playerId] = {
          ...updated.players[playerId],
          doubleDownUsed: true,
          doubleDownActive: false
        };
      }

      const existingCorrectCount = Object.values(updated.submissions).filter(
        (s) => s.playerId !== playerId && s.status === 'correct'
      ).length;
      const speedBonus = autoStatus === 'correct' ? Math.max(0, 3 - existingCorrectCount) : 0;

      let basePoints = currentQ?.points || 10;
      if (currentQ?.type === 'CLUES') {
        const step = updated.clueStep || 0;
        basePoints = Math.max(5, 20 - step * 5);
      } else if (confidence === 'SAFE') {
        basePoints = 3;
      } else if (confidence === 'ALL_IN') {
        basePoints = 15;
      }

      let pointsAwarded = 0;
      if (autoStatus === 'correct') {
        pointsAwarded = (isDoubled ? basePoints * 2 : basePoints) + speedBonus;
      } else if (autoStatus === 'wrong') {
        if (isDoubled) pointsAwarded -= basePoints;
        if (confidence === 'ALL_IN') pointsAwarded -= 10;
      }

      const subObj: Submission = {
        playerId,
        playerName: updated.players[playerId]?.name || playerName || 'Player',
        answer,
        timestamp: now,
        elapsedMs: Math.max(1, elapsed),
        status: autoStatus,
        pointsAwarded,
        speedBonus,
        doubledDown: isDoubled,
        confidence
      };
      updated.submissions[playerId] = subObj;

      if (!updated.buzzes.some((b) => b.playerId === playerId)) {
        updated.buzzes.push({
          playerId,
          playerName: updated.players[playerId]?.name || playerName || 'Player',
          timestamp: now,
          elapsedMs: Math.max(1, elapsed),
          serverOrder: updated.buzzes.length + 1
        });
      }

      if (updated.players[playerId]) {
        const p = updated.players[playerId];
        const nextScore = Math.max(0, p.score + pointsAwarded);
        const wagerDelta = isDoubled || confidence !== 'NORMAL' ? pointsAwarded : 0;

        updated.players[playerId] = {
          ...p,
          score: nextScore,
          totalAnswerMs: (p.totalAnswerMs || 0) + Math.max(1, elapsed),
          answerCount: (p.answerCount || 0) + 1,
          wagerNet: (p.wagerNet || 0) + wagerDelta
        };

        if (autoStatus === 'correct') {
          updated.players[playerId].streak += 1;
          updated.soundTrigger = { sound: 'correct', nonce: Math.random() };
        } else if (autoStatus === 'wrong') {
          updated.players[playerId].maxStreakLost = Math.max(
            updated.players[playerId].maxStreakLost || 0,
            updated.players[playerId].streak || 0
          );
          updated.players[playerId].streak = 0;
          updated.soundTrigger = { sound: 'wrong', nonce: Math.random() };
        } else {
          updated.soundTrigger = { sound: 'ding', nonce: Math.random() };
        }
      }
      break;
    }

    case 'ADJUDICATE': {
      const targetPid = payload?.playerId;
      const status = payload?.status as 'correct' | 'wrong';
      const basePoints = Number(payload?.points || 10);
      if (targetPid && updated.players[targetPid]) {
        const prevSub = updated.submissions[targetPid];
        const prevAwarded = prevSub?.pointsAwarded || 0;
        const isDoubled = Boolean(prevSub?.doubledDown || updated.players[targetPid].doubleDownActive);
        const confidence = prevSub?.confidence || updated.players[targetPid].confidence || 'NORMAL';

        let cleanScore = Math.max(0, updated.players[targetPid].score - prevAwarded);

        let effectiveBase = basePoints;
        if (confidence === 'SAFE') effectiveBase = 3;
        if (confidence === 'ALL_IN') effectiveBase = 15;

        let newAwarded = 0;
        if (status === 'correct') {
          newAwarded = isDoubled ? effectiveBase * 2 : effectiveBase;
          cleanScore += newAwarded;
          if (prevSub?.status !== 'correct') {
            updated.players[targetPid].streak += 1;
          }
          updated.soundTrigger = { sound: 'correct', nonce: Math.random() };
        } else {
          if (isDoubled) newAwarded -= effectiveBase;
          if (confidence === 'ALL_IN') newAwarded -= 10;
          cleanScore = Math.max(0, cleanScore + newAwarded);
          updated.players[targetPid].maxStreakLost = Math.max(
            updated.players[targetPid].maxStreakLost || 0,
            updated.players[targetPid].streak || 0
          );
          updated.players[targetPid].streak = 0;
          updated.soundTrigger = { sound: 'wrong', nonce: Math.random() };
        }

        updated.players[targetPid].score = cleanScore;
        updated.submissions[targetPid] = {
          ...(prevSub || {
            playerId: targetPid,
            playerName: updated.players[targetPid].name,
            answer: 'Host Ruling',
            timestamp: now,
            elapsedMs: 1000
          }),
          status,
          pointsAwarded: newAwarded,
          doubledDown: isDoubled,
          confidence
        };
      }
      break;
    }

    case 'ADJUST_SCORE': {
      const targetPid = payload?.playerId;
      const delta = Number(payload?.delta || 0);
      if (targetPid && updated.players[targetPid]) {
        updated.players[targetPid].score = Math.max(0, updated.players[targetPid].score + delta);
        updated.soundTrigger = {
          sound: delta >= 0 ? 'correct' : 'wrong',
          nonce: Math.random()
        };
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
      updated.timerSeconds = 0;
      updated.clueStep = 0;
      updated.heistActive = false;
      updated.bluffStage = 'ENTER_LIES';
      updated.bluffLies = {};
      updated.bluffOptions = [];
      updated.phase = 'LOBBY';
      Object.keys(updated.players).forEach((pid) => {
        updated.players[pid] = {
          ...updated.players[pid],
          doubleDownUsed: false,
          doubleDownActive: false,
          confidence: 'NORMAL',
          heistTargetId: undefined,
          sabotageEffect: null
        };
      });
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

    default:
      break;
  }

  updated.lastUpdated = now;
  return updated;
}

export function useQuizSync({ roomCode, role, playerId, playerName }: UseQuizSyncProps) {
  const normalizedCode = (roomCode || 'QUIZ').trim().toUpperCase();
  const storageKey = `quizcast_v6_room_${normalizedCode}`;

  const [room, setRoom] = useState<GameRoom>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Reject legacy cached rooms that still have the spoiler title
        if (
          parsed &&
          Array.isArray(parsed.questions) &&
          parsed.questions.length > 0 &&
          parsed.currentPackTitle !== 'The Secret Singalong Round'
        ) {
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
  const [latencyMs, setLatencyMs] = useState<number>(45);

  const mqttClientsRef = useRef<MqttClient[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastSoundNonceRef = useRef<number>(0);
  const processedNoncesRef = useRef<Set<string>>(new Set());
  const roomRef = useRef<GameRoom>(room);
  roomRef.current = room;

  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (e) {}
      }
    };
    requestWakeLock();
    document.addEventListener('visibilitychange', requestWakeLock);
    return () => {
      document.removeEventListener('visibilitychange', requestWakeLock);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (room) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(room));
      } catch (e) {}
    }
  }, [room, storageKey]);

  const applyRoomState = useCallback((incoming: Partial<GameRoom>, force = false) => {
    if (!incoming) return;
    const current = roomRef.current;
    const currentRev = current.revision || 1;
    const incomingRev = incoming.revision || 1;
    const currentPlayersCount = Object.keys(current.players || {}).length;
    const incomingPlayersCount = Object.keys(incoming.players || {}).length;

    const shouldApply =
      force ||
      incomingRev >= currentRev ||
      incomingPlayersCount > currentPlayersCount;

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

      roomRef.current = mergedRoom;
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
            revision: mergedRoom.revision,
            fromHost: force
          });
        } catch (e) {}
      }
    }
  }, [normalizedCode]);

  const publishToNetwork = useCallback((msg: any, options?: { skipNtfy?: boolean }) => {
    const payloadWithTs = { ...msg, sentAt: Date.now() };
    const rawJson = JSON.stringify(payloadWithTs);
    const mqttTopic = `quizcast_mesh_v7_${normalizedCode}`;
    const httpTopic = `quizcast_ntfy_v7_${normalizedCode.toLowerCase()}`;

    // 1. Publish across all connected MQTT brokers in parallel for instant <50ms delivery
    for (const client of mqttClientsRef.current) {
      if (client && client.connected) {
        try {
          client.publish(mqttTopic, rawJson, { qos: 0 });
        } catch (e) {}
      }
    }

    // 2. HTTPS Relay via ntfy.sh (Throttled to 1 lightweight packet per action so it never hits HTTP 429)
    if (!options?.skipNtfy && msg.type !== 'HEARTBEAT') {
      try {
        let ntfyBody = rawJson;
        if (payloadWithTs.room && rawJson.length > 3200) {
          const { questions, ...lightweightRoom } = payloadWithTs.room;
          ntfyBody = JSON.stringify({
            ...payloadWithTs,
            room: lightweightRoom
          });
        }
        fetch(`https://ntfy.sh/${httpTopic}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: ntfyBody,
          mode: 'cors'
        })
          .then((res) => {
            if (res.ok) setConnected(true);
          })
          .catch(() => {});
      } catch (e) {}
    }

    // 3. Same-device BroadcastChannel
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(payloadWithTs);
      } catch (e) {}
    }
  }, [normalizedCode]);

  useEffect(() => {
    if (!role) return;
    let isCleanedUp = false;
    const mqttTopic = `quizcast_mesh_v7_${normalizedCode}`;
    const httpTopic = `quizcast_ntfy_v7_${normalizedCode.toLowerCase()}`;

    const isDuplicate = (nonce?: string) => {
      if (!nonce) return false;
      if (processedNoncesRef.current.has(nonce)) return true;
      processedNoncesRef.current.add(nonce);
      if (processedNoncesRef.current.size > 300) {
        const arr = Array.from(processedNoncesRef.current);
        processedNoncesRef.current = new Set(arr.slice(100));
      }
      return false;
    };

    const handleNetworkMessage = (data: any) => {
      if (isCleanedUp || !data || !data.type) return;
      if (data.roomCode && data.roomCode !== normalizedCode) return;
      if (data.nonce && isDuplicate(data.nonce)) return;

      if (data.sentAt) {
        const rtt = Math.max(12, Math.min(999, Date.now() - data.sentAt));
        setLatencyMs(rtt);
      }

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
            // Only reply if we are Host, or if we are TV and a Player asked
            if (role === 'host' || data.type === 'PLAYER_JOIN' || data.fromRole === 'player') {
              publishToNetwork({
                type: 'SYNC_ROOM',
                roomCode: normalizedCode,
                room: current,
                revision: current.revision || Date.now(),
                fromHost: role === 'host',
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
            if (role === 'host') {
              publishToNetwork({
                type: 'SYNC_ROOM',
                roomCode: normalizedCode,
                room: updated,
                revision: updated.revision,
                fromHost: true,
                nonce: `conf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
              });
            }
          }
          break;
        }
        case 'HOST_ACTION': {
          // Host actions are ALWAYS authoritative and applied immediately with force = true
          if (data.room) {
            applyRoomState(data.room, true);
          } else if (data.action) {
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
            applyRoomState(data.room, Boolean(data.fromHost));
          }
          break;
        }
        case 'HEARTBEAT': {
          const localRev = roomRef.current.revision || 1;
          if (
            (data.revision && data.revision > localRev) ||
            roomRef.current.phase !== data.phase ||
            roomRef.current.currentQIndex !== data.currentQIndex
          ) {
            publishToNetwork(
              {
                type: 'REQUEST_ROOM_SYNC',
                roomCode: normalizedCode,
                fromRole: role,
                playerId,
                playerName,
                revision: localRev,
                nonce: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
              },
              { skipNtfy: true }
            );
          }
          break;
        }
        default:
          break;
      }
    };

    // 1. Local BroadcastChannel
    try {
      const bc = new BroadcastChannel(`quizcast_bc_v7_${normalizedCode}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data) handleNetworkMessage(event.data);
      };
    } catch (e) {}

    // 2. HTTPS SSE Stream via ntfy.sh
    try {
      const es = new EventSource(`https://ntfy.sh/${httpTopic}/sse`);
      eventSourceRef.current = es;
      es.onopen = () => {
        if (!isCleanedUp) setConnected(true);
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

    // 3. Parallel Dual-Broker MQTT Connection (Zero failover delay)
    const mqttBrokers = [
      'wss://broker.emqx.io:8084/mqtt',
      'wss://broker.hivemq.com:8884/mqtt'
    ];

    const clients: MqttClient[] = [];
    mqttBrokers.forEach((brokerUrl, idx) => {
      try {
        const connectStart = Date.now();
        const client = mqtt.connect(brokerUrl, {
          clientId: `qc_${role}_${idx}_${Math.random().toString(36).substring(2, 8)}`,
          clean: true,
          connectTimeout: 4000,
          reconnectPeriod: 2500,
          keepalive: 25
        });
        clients.push(client);

        client.on('connect', () => {
          if (isCleanedUp) return;
          setConnected(true);
          setLatencyMs(Math.min(250, Math.max(15, Date.now() - connectStart)));
          client.subscribe(mqttTopic, { qos: 0 }, (err) => {
            if (!err && !isCleanedUp && idx === 0) {
              if (role === 'player') {
                publishToNetwork({
                  type: 'PLAYER_JOIN',
                  roomCode: normalizedCode,
                  playerId,
                  playerName: playerName || 'Player',
                  nonce: `join_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
                });
              } else if (role === 'host') {
                publishToNetwork({
                  type: 'SYNC_ROOM',
                  roomCode: normalizedCode,
                  room: roomRef.current,
                  revision: roomRef.current.revision || Date.now(),
                  fromHost: true,
                  nonce: `init_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
                });
              } else if (role === 'tv') {
                publishToNetwork({
                  type: 'REQUEST_ROOM_SYNC',
                  roomCode: normalizedCode,
                  fromRole: 'tv',
                  revision: roomRef.current.revision || 1,
                  nonce: `tv_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
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
      } catch (e) {}
    });
    mqttClientsRef.current = clients;

    // 4. Fast 2s Heartbeat from Host over MQTT only
    const heartbeatTimer = setInterval(() => {
      if (isCleanedUp) return;
      if (role === 'host') {
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
    }, 2000);

    return () => {
      isCleanedUp = true;
      clearInterval(heartbeatTimer);
      mqttClientsRef.current.forEach((c) => {
        try {
          c.removeAllListeners();
          c.end(true);
        } catch (e) {}
      });
      mqttClientsRef.current = [];
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

  // Single-Packet Action Dispatcher (No double-posting)
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
        // Send ONE combined packet containing both the action and authoritative room state
        publishToNetwork({
          type: 'HOST_ACTION',
          roomCode: normalizedCode,
          action: actionObj,
          room: updated,
          revision: updated.revision,
          fromHost: true,
          actionId,
          nonce: actionId
        });
      }
    },
    [normalizedCode, role, playerId, playerName, applyRoomState, publishToNetwork]
  );

  return {
    room,
    connected,
    latencyMs,
    buzzIn: useCallback(() => sendAction('BUZZ_IN'), [sendAction]),
    submitAnswer: useCallback((answer: string) => sendAction('SUBMIT_ANSWER', { answer }), [sendAction]),
    submitLie: useCallback((lie: string) => sendAction('SUBMIT_LIE', { lie }), [sendAction]),
    startBluffVote: useCallback(() => sendAction('START_BLUFF_VOTE'), [sendAction]),
    toggleDoubleDown: useCallback(() => sendAction('TOGGLE_DOUBLE_DOWN'), [sendAction]),
    setConfidence: useCallback((level: ConfidenceLevel) => sendAction('SET_CONFIDENCE', { level }), [sendAction]),
    setHeistTarget: useCallback((targetPlayerId: string) => sendAction('SET_HEIST_TARGET', { targetPlayerId }), [sendAction]),
    toggleHeistMode: useCallback((active?: boolean) => sendAction('TOGGLE_HEIST_MODE', { active }), [sendAction]),
    sabotagePlayer: useCallback((targetPlayerId: string, sabotageType: SabotageType) => sendAction('SABOTAGE_PLAYER', { targetPlayerId, sabotageType }), [sendAction]),
    clearSabotage: useCallback(() => sendAction('CLEAR_SABOTAGE'), [sendAction]),
    nextClue: useCallback(() => sendAction('NEXT_CLUE'), [sendAction]),
    startTimer: useCallback((seconds = 20) => sendAction('START_TIMER', { seconds }), [sendAction]),
    setPhase: useCallback((phase: GamePhase, inputOpen?: boolean) => sendAction('SET_PHASE', { phase, inputOpen }), [sendAction]),
    toggleLock: useCallback((open?: boolean) => sendAction('TOGGLE_LOCK', { open }), [sendAction]),
    changeQuestion: useCallback((index: number) => sendAction('CHANGE_QUESTION', { index }), [sendAction]),
    resetBuzzes: useCallback(() => sendAction('RESET_BUZZES'), [sendAction]),
    adjudicate: useCallback((targetPlayerId: string, status: 'correct' | 'wrong', points: number) => sendAction('ADJUDICATE', { playerId: targetPlayerId, status, points }), [sendAction]),
    adjustScore: useCallback((targetPlayerId: string, delta: number) => sendAction('ADJUST_SCORE', { playerId: targetPlayerId, delta }), [sendAction]),
    updateQuestions: useCallback((questions: Question[], packTitle?: string) => sendAction('UPDATE_QUESTIONS', { questions, packTitle }), [sendAction]),
    addQuestion: useCallback((question: Partial<Question>, insertAt?: number) => sendAction('ADD_QUESTION', { question, insertAt }), [sendAction]),
    editQuestion: useCallback((index: number, question: Partial<Question>) => sendAction('EDIT_QUESTION', { index, question }), [sendAction]),
    deleteQuestion: useCallback((index: number) => sendAction('DELETE_QUESTION', { index }), [sendAction]),
    triggerSound: useCallback((sound: string) => sendAction('TRIGGER_SOUND', { sound }), [sendAction]),
    kickPlayer: useCallback((targetPlayerId: string) => sendAction('KICK_PLAYER', { playerId: targetPlayerId }), [sendAction]),
    updatePlayerName: useCallback((newName: string) => sendAction('JOIN_ROOM', { name: newName }), [sendAction])
  };
}
