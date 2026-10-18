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
  const currentHost = window.location.hostname;
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return '';
  }
  // Do not poll the ephemeral AI Studio preview backend on Netlify unless VITE_BACKEND_URL is explicitly configured
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
    currentPackTitle: defaultPack ? defaultPack.title : 'The Secret Singalong Round',
    players: {},
    buzzes: [],
    submissions: {},
    questionHistory: {},
    lastUpdated: Date.now(),
    revision: 1
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

  // Master Room State Update (prevents stale revision 1 tabs from overwriting active games)
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
      const mergedRoom: GameRoom = {
        ...current,
        ...incoming,
        // Preserve existing questions if lightweight sync omitted them
        questions:
          Array.isArray(incoming.questions) && incoming.questions.length > 0
            ? incoming.questions
            : current.questions
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

  // Unified multi-transport publisher
  const publishToNetwork = useCallback((msg: any, options?: { skipNtfy?: boolean }) => {
    const rawJson = JSON.stringify(msg);
    const mqttTopic = `quizcast_mesh_v5_${normalizedCode}`;
    const httpTopic = `quizcast_ntfy_v5_${normalizedCode.toLowerCase()}`;

    // 1. MQTT Cloud Publish (Full payload)
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      try {
        mqttClientRef.current.publish(mqttTopic, rawJson, { qos: 0 });
      } catch (e) {}
    }

    // 2. HTTPS / SSE Relay Publish via ntfy.sh (Port 443)
    // Skip routine heartbeats to avoid HTTP 429 rate limits, and keep SYNC_ROOM under 4KB
    if (!options?.skipNtfy && msg.type !== 'HEARTBEAT') {
      try {
        let ntfyBody = rawJson;
        if (msg.type === 'SYNC_ROOM' && msg.room && rawJson.length > 3500) {
          // Strip bulky static questions array so ntfy.sh doesn't turn >4KB payload into a file attachment
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

    // 3. BroadcastChannel (Same-device instant sync)
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(msg);
      } catch (e) {}
    }

    // 4. Optional Express REST API (only if VITE_BACKEND_URL is explicitly configured)
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
            // Reply with current room state if we have players or a revision > 1 (or if a player joined)
            if (data.type === 'PLAYER_JOIN' || (current.revision || 1) >= (data.revision || 1)) {
              publishToNetwork({
                type: 'SYNC_ROOM',
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

  // Persist latest state to localStorage
  useEffect(() => {
    if (room) {
      try {
        localStorage.setItem(`quizcast_room_${normalizedCode}`, JSON.stringify(room));
      } catch (e) {}
    }
  }, [room, normalizedCode]);

  // Master Room State Update (handles sound triggers, revision increments, and broadcast)
  const applyRoomState = useCallback((incoming: GameRoom, force = false) => {
    if (!incoming) return;
    const currentRev = roomRef.current.revision || 1;
    const incomingRev = incoming.revision || 1;

    // Apply if incoming has equal/higher revision, or forced (e.g. initial sync from host/TV)
    if (force || incomingRev >= currentRev || role === 'player') {
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
            room: incoming,
            force
          });
        } catch (e) {}
      }
    }
  }, [role]);

  // Unified multi-transport message publisher:
  // Sends message across: 1) MQTT Cloud, 2) HTTPS / SSE Relay (ntfy.sh), 3) BroadcastChannel, 4) Local REST API
  const publishToNetwork = useCallback((msg: any) => {
    const rawJson = JSON.stringify(msg);
    const mqttTopic = `quizcast_mesh_v5_${normalizedCode}`;
    const httpTopic = `quizcast_ntfy_v5_${normalizedCode.toLowerCase()}`;

    // 1. MQTT Cloud Publish
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      try {
        mqttClientRef.current.publish(mqttTopic, rawJson, { qos: 0 });
      } catch (e) {}
    }

    // 2. HTTPS / SSE Relay Publish (over standard port 443, immune to cellular port blocking)
    try {
      fetch(`https://ntfy.sh/${httpTopic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawJson,
        mode: 'cors'
      }).catch(() => {});
    } catch (e) {}

    // 3. BroadcastChannel (Same-device instant 0ms sync)
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(msg);
      } catch (e) {}
    }

    // 4. Express REST API (if available)
    const apiBase = getBackendHttpUrl();
    if (apiBase && (msg.type === 'PLAYER_ACTION' || msg.type === 'HOST_ACTION')) {
      try {
        fetch(`${apiBase}/api/room/${normalizedCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...msg.action,
            roomCode: normalizedCode
          })
        }).catch(() => {});
      } catch (e) {}
    }
  }, [normalizedCode]);

  // Main Real-Time Network Engine (Dual-Mesh: MQTT + HTTPS SSE + BroadcastChannel)
  useEffect(() => {
    if (!role) return;

    let isCleanedUp = false;
    const mqttTopic = `quizcast_mesh_v5_${normalizedCode}`;
    const httpTopic = `quizcast_ntfy_v5_${normalizedCode.toLowerCase()}`;
    const pingStart = Date.now();

    // Deduplication helper to prevent feedback loops across multi-transport
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

    // Central Incoming Message Dispatcher
    const handleNetworkMessage = (data: any) => {
      if (isCleanedUp || !data || !data.type) return;
      if (data.roomCode && data.roomCode !== normalizedCode) return;
      if (data.nonce && isDuplicate(data.nonce)) return;

      const isAuthority = role === 'tv' || role === 'host';

      switch (data.type) {
        // A. A player joined or asked for full room state
        case 'PLAYER_JOIN':
        case 'REQUEST_ROOM_SYNC': {
          if (isAuthority) {
            // Register player in authority room
            let current = roomRef.current;
            if (data.playerId) {
              current = reduceGameAction(current, {
                type: 'JOIN_ROOM',
                playerId: data.playerId,
                playerName: data.playerName || 'Player',
                role: 'player'
              });
              applyRoomState(current);
            }

            // Immediately reply with authoritative full room state
            publishToNetwork({
              type: 'SYNC_ROOM',
              roomCode: normalizedCode,
              room: current,
              revision: current.revision || 1,
              isFullSync: true,
              targetPlayerId: data.playerId,
              nonce: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
            });
          }
          break;
        }

        // B. Player performed an action (buzzed in, submitted answer, etc.)
        case 'PLAYER_ACTION': {
          if (data.action) {
            // Both Authority and handsets can process the action deterministically
            const updated = reduceGameAction(roomRef.current, data.action);
            applyRoomState(updated);

            // If we are the Authority (TV or Host), broadcast the confirmed room state
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

        // C. Host performed a host action (changed question, started round, revealed answer)
        case 'HOST_ACTION': {
          if (data.action) {
            const updated = reduceGameAction(roomRef.current, data.action);
            applyRoomState(updated);
          }
          break;
        }

        // D. Authoritative room state broadcast
        case 'SYNC_ROOM': {
          if (data.room) {
            // If targetPlayerId is specified and not us, ignore
            if (data.targetPlayerId && role === 'player' && data.targetPlayerId !== playerId) {
              return;
            }
            applyRoomState(data.room, data.isFullSync || false);
          }
          break;
        }

        // E. Heartbeat from TV / Host
        case 'HEARTBEAT': {
          if (role === 'player') {
            const localRev = roomRef.current.revision || 1;
            // If host has advanced questions or revision is ahead, request sync
            if ((data.revision && data.revision > localRev) || roomRef.current.phase !== data.phase) {
              publishToNetwork({
                type: 'REQUEST_ROOM_SYNC',
                roomCode: normalizedCode,
                playerId,
                playerName,
                nonce: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
              });
            }
          }
          break;
        }

        default:
          break;
      }
    };

    // 1. Setup Local BroadcastChannel (Same-Device Instant Sync)
    try {
      const bc = new BroadcastChannel(`quizcast_bc_v5_${normalizedCode}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data) {
          handleNetworkMessage(event.data);
        }
      };
    } catch (e) {}

    // 2. Setup HTTPS / SSE Stream (Over standard port 443 via ntfy.sh)
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

      es.onerror = () => {
        // Fallback / reconnect handled by EventSource automatically
      };
    } catch (e) {}

    // 3. Setup MQTT Cloud Mesh (High-Speed Low-Latency WebSocket transport)
    const mqttBrokers = [
      'wss://broker.emqx.io:8084/mqtt',
      'wss://broker.hivemq.com:8884/mqtt'
    ];
    let brokerIndex = 0;

    function connectMqtt() {
      if (isCleanedUp) return;
      const brokerUrl = mqttBrokers[brokerIndex % mqttBrokers.length];
      const clientUuid = `qc_${role}_${Math.random().toString(36).substring(2, 9)}`;

      try {
        const client = mqtt.connect(brokerUrl, {
          clientId: clientUuid,
          clean: true,
          connectTimeout: 4000,
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
              // Immediately announce join or broadcast state
              if (role === 'player') {
                const joinMsg = {
                  type: 'PLAYER_JOIN',
                  roomCode: normalizedCode,
                  playerId,
                  playerName: playerName || 'Player',
                  nonce: `join_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
                };
                publishToNetwork(joinMsg);
              } else if (role === 'tv' || role === 'host') {
                publishToNetwork({
                  type: 'SYNC_ROOM',
                  roomCode: normalizedCode,
                  room: roomRef.current,
                  revision: roomRef.current.revision || 1,
                  isFullSync: true,
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

        client.on('error', () => {
          client.end(true);
          brokerIndex++;
          if (!isCleanedUp) {
            setTimeout(connectMqtt, 3000);
          }
        });
      } catch (e) {
        brokerIndex++;
        if (!isCleanedUp) {
          setTimeout(connectMqtt, 3000);
        }
      }
    }

    connectMqtt();

    // 4. Heartbeat timer:
    // TV and Host broadcast authoritative heartbeat every 2000ms.
    // Player requests room sync if not yet in sync.
    const heartbeatTimer = setInterval(() => {
      if (isCleanedUp) return;

      if (role === 'tv' || role === 'host') {
        publishToNetwork({
          type: 'HEARTBEAT',
          roomCode: normalizedCode,
          revision: roomRef.current.revision || 1,
          phase: roomRef.current.phase,
          currentQIndex: roomRef.current.currentQIndex,
          inputOpen: roomRef.current.inputOpen,
          playerCount: Object.keys(roomRef.current.players).length,
          timestamp: Date.now()
        });
      } else if (role === 'player') {
        // If player has not received any questions or is in empty room, request sync
        if (!roomRef.current.questions || roomRef.current.questions.length === 0 || roomRef.current.phase === 'LOBBY') {
          publishToNetwork({
            type: 'REQUEST_ROOM_SYNC',
            roomCode: normalizedCode,
            playerId,
            playerName: playerName || 'Player',
            nonce: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
          });
        }
      }
    }, 2000);

    // 5. Tier 4: Background HTTPS Port 443 Polling (Guaranteed failover over Port 443)
    const apiBase = getBackendHttpUrl();
    let pollInterval: any = null;
    if (apiBase) {
      pollInterval = setInterval(async () => {
        if (isCleanedUp) return;
        try {
          const res = await fetch(`${apiBase}/api/room/${normalizedCode}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data?.room) {
              handleNetworkMessage({
                type: 'SYNC_ROOM',
                roomCode: normalizedCode,
                room: data.room,
                revision: data.room.revision || 1,
                nonce: `poll_${Date.now()}`
              });
            }
          }
        } catch (e) {}
      }, 1500);
    }

    // Initial player sync request immediately on component mount
    if (role === 'player' && playerId) {
      setTimeout(() => {
        publishToNetwork({
          type: 'PLAYER_JOIN',
          roomCode: normalizedCode,
          playerId,
          playerName: playerName || 'Player',
          nonce: `init_join_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        });
      }, 300);
    }

    return () => {
      isCleanedUp = true;
      clearInterval(heartbeatTimer);
      if (pollInterval) clearInterval(pollInterval);
      if (mqttClientRef.current) {
        try {
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

  // Universal Action Dispatcher:
  // Dispatches actions according to role:
  // - Player: Sends PLAYER_ACTION across network + applies optimistically locally
  // - Host / TV: Applies action to room state + broadcasts HOST_ACTION & SYNC_ROOM
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

      // 1. Optimistically apply locally
      const updated = reduceGameAction(roomRef.current, actionObj);
      applyRoomState(updated);

      // 2. Transmit action to all connected devices (phones, TVs, laptops on Netlify)
      if (role === 'player') {
        publishToNetwork({
          type: 'PLAYER_ACTION',
          roomCode: normalizedCode,
          action: actionObj,
          actionId,
          nonce: actionId
        });
      } else {
        // TV or Host Authority
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
