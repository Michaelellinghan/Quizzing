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
    revision: 1
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
            lastSeen: now
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

  const updatePlayerName = useCallback(
    (newName: string) => {
      sendAction('JOIN_ROOM', { name: newName });
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
    updatePlayerName
  };
}
