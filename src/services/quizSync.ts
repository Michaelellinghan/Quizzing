import { useEffect, useState, useRef, useCallback } from 'react';
import { GameRoom, Question, GamePhase, Player, Buzz, Submission } from '../types/quiz';
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
  const currentHost = window.location.hostname;
  if (currentHost.includes('netlify.app') || currentHost.includes('github.io') || currentHost.includes('vercel.app')) {
    return (import.meta as any).env?.VITE_BACKEND_URL || '';
  }
  return (import.meta as any).env?.VITE_BACKEND_URL || '';
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
    currentPackTitle: defaultPack ? defaultPack.title : 'The Secret Singalong Round',
    players: {},
    buzzes: [],
    submissions: {},
    questionHistory: {},
    lastUpdated: Date.now()
  };
}

// Deterministic Game Action Reducer (Shared across TV, Host, and Player handsets)
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
    questionHistory: { ...prevRoom.questionHistory }
  };

  switch (type) {
    case 'JOIN_ROOM': {
      if (role === 'player' && playerId) {
        const cleanName = (playerName || 'Player').trim();
        if (!updated.players[playerId]) {
          updated.players[playerId] = {
            id: playerId,
            name: cleanName,
            score: 0,
            streak: 0,
            connected: true,
            avatar: `avatar-${(Object.keys(updated.players).length % 8) + 1}`
          };
        } else {
          updated.players[playerId] = {
            ...updated.players[playerId],
            connected: true,
            name: cleanName && cleanName !== 'Player' ? cleanName : updated.players[playerId].name
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
          updated.soundTrigger = { sound: 'whoosh', nonce: Math.random() };
        } else if (newPhase === 'REVEAL') {
          updated.inputOpen = false;
          updated.soundTrigger = { sound: 'ding', nonce: Math.random() };
        } else if (newPhase === 'ROUND_STATS' || newPhase === 'LEADERBOARD') {
          updated.inputOpen = false;
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
      if (!playerId || !updated.inputOpen) break;
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
      if (!playerId) break;
      const answer = String(payload?.answer || '').trim();
      if (!answer) break;

      const elapsed = updated.questionStartTime > 0 ? now - updated.questionStartTime : 0;
      const currentQ = updated.questions[updated.currentQIndex];

      const cleanSubmitted = answer
        .toLowerCase()
        .replace(/^(the|a|an)\s+/i, '')
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .trim();
      const cleanOfficial = (currentQ?.answer || '')
        .toLowerCase()
        .replace(/^(the|a|an)\s+/i, '')
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .trim();

      let autoStatus: 'pending' | 'correct' | 'wrong' = 'pending';
      if (currentQ?.type === 'MCQ' && cleanOfficial) {
        autoStatus = cleanSubmitted === cleanOfficial ? 'correct' : 'wrong';
      } else if (cleanOfficial) {
        if (
          cleanSubmitted === cleanOfficial ||
          (cleanSubmitted.length >= 3 &&
            (cleanOfficial.includes(cleanSubmitted) || cleanSubmitted.includes(cleanOfficial)))
        ) {
          autoStatus = 'correct';
        } else {
          autoStatus = 'pending';
        }
      }

      // Revert previous points if changing answer
      const prevSub = updated.submissions[playerId];
      if (prevSub && prevSub.status === 'correct' && updated.players[playerId]) {
        updated.players[playerId].score -= prevSub.pointsAwarded || currentQ?.points || 10;
      }

      const pointsAwarded = autoStatus === 'correct' ? currentQ?.points || 10 : 0;
      const subObj: Submission = {
        playerId,
        playerName: updated.players[playerId]?.name || playerName || 'Player',
        answer,
        timestamp: now,
        elapsedMs: Math.max(1, elapsed),
        status: autoStatus,
        pointsAwarded
      };
      updated.submissions[playerId] = subObj;

      // Add to buzzes if not present
      if (!updated.buzzes.some((b) => b.playerId === playerId)) {
        updated.buzzes.push({
          playerId,
          playerName: updated.players[playerId]?.name || playerName || 'Player',
          timestamp: now,
          elapsedMs: Math.max(1, elapsed),
          serverOrder: updated.buzzes.length + 1
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
        if (status === 'correct') {
          updated.players[targetPid].score += points;
          updated.players[targetPid].streak += 1;
          updated.soundTrigger = { sound: 'correct', nonce: Math.random() };
        } else if (status === 'wrong') {
          updated.players[targetPid].score = Math.max(0, updated.players[targetPid].score - Math.abs(points));
          updated.players[targetPid].streak = 0;
          updated.soundTrigger = { sound: 'wrong', nonce: Math.random() };
        }

        if (updated.submissions[targetPid]) {
          updated.submissions[targetPid].status = status;
          updated.submissions[targetPid].pointsAwarded = status === 'correct' ? points : 0;
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
      if (Array.isArray(payload?.questions)) {
        updated.questions = payload.questions;
        updated.currentPackTitle = payload?.packTitle || updated.currentPackTitle || 'Custom Pack';
        updated.currentQIndex = 0;
        updated.buzzes = [];
        updated.submissions = {};
        updated.phase = 'LOBBY';
      }
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

    default:
      break;
  }

  updated.lastUpdated = now;
  return updated;
}

export function useQuizSync({ roomCode, role, playerId, playerName }: UseQuizSyncProps) {
  const normalizedCode = (roomCode || 'QUIZ').trim().toUpperCase();

  // Initialize room immediately from localStorage or default pack
  const [room, setRoom] = useState<GameRoom>(() => {
    try {
      const saved = localStorage.getItem(`quizcast_room_${normalizedCode}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return createDefaultRoom(normalizedCode);
  });

  const [connected, setConnected] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number>(0);

  const mqttClientRef = useRef<MqttClient | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastSoundNonceRef = useRef<number>(0);
  const lastKnownUpdatedRef = useRef<number>(room?.lastUpdated || 0);
  const roomRef = useRef<GameRoom>(room);
  roomRef.current = room;

  // Persist latest state to localStorage
  useEffect(() => {
    if (room) {
      try {
        localStorage.setItem(`quizcast_room_${normalizedCode}`, JSON.stringify(room));
      } catch (e) {}
    }
  }, [room, normalizedCode]);

  // Handle incoming room state update safely
  const applyIncomingRoom = useCallback((incoming: GameRoom) => {
    if (!incoming || typeof incoming.lastUpdated !== 'number') return;
    if (incoming.lastUpdated >= lastKnownUpdatedRef.current) {
      lastKnownUpdatedRef.current = incoming.lastUpdated;
      setRoom(incoming);

      // Sound trigger
      if (incoming.soundTrigger && incoming.soundTrigger.nonce !== lastSoundNonceRef.current) {
        lastSoundNonceRef.current = incoming.soundTrigger.nonce;
        soundEffects.play(incoming.soundTrigger.sound);
      }

      // Propagate across same-device tabs via BroadcastChannel
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'ROOM_SYNC',
            room: incoming
          });
        } catch (e) {}
      }
    }
  }, []);

  // Connect to Universal Real-Time Mesh: MQTT Cloud + BroadcastChannel + Local API fallback
  useEffect(() => {
    if (!role) return;

    let isCleanedUp = false;
    const mqttTopic = `quizcast_v4_room_${normalizedCode}`;

    // 1. Tier 1: Local cross-tab BroadcastChannel for zero-latency same-computer sync
    try {
      const bc = new BroadcastChannel(`quizcast_bc_${normalizedCode}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === 'ROOM_SYNC' && event.data.room) {
          applyIncomingRoom(event.data.room);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    // 2. Tier 2: MQTT Cloud Real-Time Mesh (Instant sync across phones, TVs, laptops, Netlify)
    const clientUuid = `qc_${role}_${Math.random().toString(36).substring(2, 9)}`;
    const mqttBrokers = [
      'wss://broker.emqx.io:8084/mqtt',
      'wss://broker.hivemq.com:8884/mqtt'
    ];
    let brokerIndex = 0;

    function connectMqtt() {
      if (isCleanedUp) return;
      const brokerUrl = mqttBrokers[brokerIndex % mqttBrokers.length];
      const pingStart = Date.now();

      try {
        const client = mqtt.connect(brokerUrl, {
          clientId: clientUuid,
          clean: true,
          connectTimeout: 5000,
          reconnectPeriod: 3000,
          keepalive: 30
        });
        mqttClientRef.current = client;

        client.on('connect', () => {
          if (isCleanedUp) return;
          setConnected(true);
          setLatencyMs(Math.max(1, Date.now() - pingStart));

          client.subscribe(mqttTopic, { qos: 0 }, (err) => {
            if (!err && !isCleanedUp) {
              // If we are a player joining, request latest room state from TV / Host
              if (role === 'player') {
                client.publish(
                  mqttTopic,
                  JSON.stringify({
                    type: 'REQUEST_ROOM_SYNC',
                    requesterId: playerId,
                    requesterName: playerName,
                    timestamp: Date.now()
                  })
                );
              } else if (role === 'tv' || role === 'host') {
                // TV / Host announces current room state to any waiting phones
                client.publish(
                  mqttTopic,
                  JSON.stringify({
                    type: 'ROOM_ANNOUNCE',
                    room: roomRef.current,
                    senderRole: role
                  })
                );
              }
            }
          });
        });

        client.on('message', (_t, msgBuffer) => {
          if (isCleanedUp) return;
          try {
            const data = JSON.parse(msgBuffer.toString());

            // A. Someone requested room sync (e.g. phone just scanned QR code)
            if (data.type === 'REQUEST_ROOM_SYNC') {
              if (role === 'tv' || role === 'host') {
                client.publish(
                  mqttTopic,
                  JSON.stringify({
                    type: 'ROOM_ANNOUNCE',
                    room: roomRef.current,
                    senderRole: role
                  })
                );
              }
              // Also auto-add player to room if not present
              if (data.requesterId) {
                const updated = reduceGameAction(roomRef.current, {
                  type: 'JOIN_ROOM',
                  playerId: data.requesterId,
                  playerName: data.requesterName,
                  role: 'player'
                });
                applyIncomingRoom(updated);
              }
            }

            // B. Room state announce or action broadcast
            else if (data.type === 'ROOM_ANNOUNCE' || data.type === 'GAME_ACTION_BROADCAST') {
              if (data.room) {
                applyIncomingRoom(data.room);
              }
            }
          } catch (err) {
            console.warn('MQTT message parse error:', err);
          }
        });

        client.on('error', () => {
          client.end(true);
          brokerIndex++;
          if (!isCleanedUp) {
            setTimeout(connectMqtt, 3000);
          }
        });
      } catch (err) {
        brokerIndex++;
        if (!isCleanedUp) {
          setTimeout(connectMqtt, 3000);
        }
      }
    }

    connectMqtt();

    // 3. Tier 3: Local backend polling (runs if app is hosted with local Express backend)
    const apiBase = getBackendHttpUrl();
    let pollTimer: any = null;
    if (apiBase) {
      pollTimer = setInterval(async () => {
        if (isCleanedUp) return;
        try {
          const res = await fetch(`${apiBase}/api/room/${normalizedCode}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data?.room) {
              applyIncomingRoom(data.room);
            }
          }
        } catch (e) {}
      }, 900);
    }

    // Auto-register player on join
    if (role === 'player' && playerId) {
      const updated = reduceGameAction(roomRef.current, {
        type: 'JOIN_ROOM',
        playerId,
        playerName: playerName || 'Player',
        role: 'player'
      });
      applyIncomingRoom(updated);
    }

    return () => {
      isCleanedUp = true;
      if (pollTimer) clearInterval(pollTimer);
      if (mqttClientRef.current) {
        try {
          mqttClientRef.current.end(true);
        } catch (e) {}
      }
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.close();
        } catch (e) {}
      }
    };
  }, [normalizedCode, role, playerId, playerName, applyIncomingRoom]);

  // Universal Action Dispatcher:
  // 1. Runs deterministic reducer locally for zero-latency response
  // 2. Broadcasts instantly to MQTT mesh (phones + TV + host on Netlify / remote)
  // 3. Broadcasts to same-device tabs via BroadcastChannel
  // 4. Posts to Express backend if reachable
  const sendAction = useCallback(
    (type: string, payload?: any) => {
      const actionObj = {
        type,
        playerId,
        playerName,
        role: role || undefined,
        payload
      };

      // 1. Immediately update local state
      const updated = reduceGameAction(roomRef.current, actionObj);
      lastKnownUpdatedRef.current = updated.lastUpdated;
      setRoom(updated);

      // Play local sound if action triggered one
      if (updated.soundTrigger && updated.soundTrigger.nonce !== lastSoundNonceRef.current) {
        lastSoundNonceRef.current = updated.soundTrigger.nonce;
        soundEffects.play(updated.soundTrigger.sound);
      }

      // 2. Broadcast across all tabs on this device
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'ROOM_SYNC',
            room: updated
          });
        } catch (e) {}
      }

      // 3. Publish to Global MQTT Cloud Mesh (connects phone to TV on Netlify in <50ms)
      if (mqttClientRef.current && mqttClientRef.current.connected) {
        try {
          const mqttTopic = `quizcast_v4_room_${normalizedCode}`;
          mqttClientRef.current.publish(
            mqttTopic,
            JSON.stringify({
              type: 'GAME_ACTION_BROADCAST',
              action: type,
              senderRole: role,
              senderId: playerId,
              room: updated
            }),
            { qos: 0 }
          );
        } catch (e) {
          console.warn('MQTT publish error:', e);
        }
      }

      // 4. Also post to REST API if backend is running
      const apiBase = getBackendHttpUrl();
      if (apiBase) {
        fetch(`${apiBase}/api/room/${normalizedCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...actionObj,
            roomCode: normalizedCode
          })
        }).catch(() => {});
      }
    },
    [normalizedCode, role, playerId, playerName]
  );

  const buzzIn = useCallback(() => {
    sendAction('BUZZ_IN');
  }, [sendAction]);

  const submitAnswer = useCallback(
    (answer: string) => {
      sendAction('SUBMIT_ANSWER', { answer });
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
    kickPlayer
  };
}
