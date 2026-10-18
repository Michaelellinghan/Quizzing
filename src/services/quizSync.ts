import { useEffect, useState, useRef, useCallback } from 'react';
import { GameRoom, Question, GamePhase } from '../types/quiz';
import { DEFAULT_QUIZ_PACKS } from '../data/defaultQuizPacks';
import { soundEffects } from '../utils/soundEffects';

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
    return (import.meta as any).env?.VITE_BACKEND_URL || `https://${CLOUD_RUN_HOST}`;
  }
  return (import.meta as any).env?.VITE_BACKEND_URL || '';
}

function getBackendWsUrl(): string {
  if (typeof window === 'undefined') return '';
  const currentHost = window.location.hostname;
  if (currentHost.includes('netlify.app') || currentHost.includes('github.io') || currentHost.includes('vercel.app')) {
    const custom = (import.meta as any).env?.VITE_BACKEND_URL;
    if (custom) return custom.replace(/^http/, 'ws') + '/ws';
    return `wss://${CLOUD_RUN_HOST}/ws`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
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

export function useQuizSync({ roomCode, role, playerId, playerName }: UseQuizSyncProps) {
  const normalizedCode = (roomCode || 'QUIZ').trim().toUpperCase();

  // Initialize room immediately so UI NEVER hangs on "Connecting to room..."
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
  const socketRef = useRef<WebSocket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastSoundNonceRef = useRef<number>(0);
  const lastKnownUpdatedRef = useRef<number>(0);

  // Sync to localStorage
  useEffect(() => {
    if (room) {
      try {
        localStorage.setItem(`quizcast_room_${normalizedCode}`, JSON.stringify(room));
      } catch (e) {}
    }
  }, [room, normalizedCode]);

  // Load initial questions from backend if available
  const loadInitialQuestions = useCallback(async () => {
    try {
      const apiBase = getBackendHttpUrl();
      const res = await fetch(`${apiBase}/api/room/${normalizedCode}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          if (!data.room.questions || data.room.questions.length === 0) {
            // Seed default questions if empty
            await fetch(`${apiBase}/api/room/${normalizedCode}/questions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                questions: DEFAULT_QUIZ_PACKS[0].questions,
                packTitle: DEFAULT_QUIZ_PACKS[0].title
              })
            }).catch(() => {});
          }
          if (data.room.lastUpdated >= lastKnownUpdatedRef.current) {
            lastKnownUpdatedRef.current = data.room.lastUpdated;
            setRoom(data.room);
          }
        }
      }
    } catch (e) {
      console.warn('Initial fetch room state failed, continuing with active local state:', e);
    }
  }, [normalizedCode]);

  // Connect to WebSocket, BroadcastChannel, and Active HTTP Polling Fallback
  useEffect(() => {
    if (!role) return;

    loadInitialQuestions();

    const apiBase = getBackendHttpUrl();

    // 1. Immediately register via REST API to ensure phone join is registered instantly
    fetch(`${apiBase}/api/room/${normalizedCode}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode: normalizedCode,
        role,
        playerId,
        playerName: playerName || 'Player'
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.room) {
          lastKnownUpdatedRef.current = data.room.lastUpdated;
          setRoom(data.room);
        }
      })
      .catch(() => {});

    // 2. BroadcastChannel for instant local cross-tab sync (e.g. Host + TV on same computer)
    try {
      const bc = new BroadcastChannel(`quizcast_${normalizedCode}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === 'ROOM_SYNC' && event.data.room) {
          if (event.data.room.lastUpdated >= lastKnownUpdatedRef.current) {
            lastKnownUpdatedRef.current = event.data.room.lastUpdated;
            setRoom(event.data.room);
            if (event.data.room.soundTrigger && event.data.room.soundTrigger.nonce !== lastSoundNonceRef.current) {
              lastSoundNonceRef.current = event.data.room.soundTrigger.nonce;
              soundEffects.play(event.data.room.soundTrigger.sound);
            }
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    // 3. Robust Background Polling: Guarantees TV and Phone stay 100% in sync even if WebSocket is blocked by proxy/carrier
    let isCleanedUp = false;
    const pollIntervalMs = role === 'tv' ? 650 : 800;
    const pollTimer = setInterval(async () => {
      if (isCleanedUp) return;
      try {
        const pingStart = Date.now();
        const res = await fetch(`${apiBase}/api/room/${normalizedCode}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.room) {
            setConnected(true);
            setLatencyMs(Date.now() - pingStart);
            if (data.room.lastUpdated > lastKnownUpdatedRef.current) {
              lastKnownUpdatedRef.current = data.room.lastUpdated;
              setRoom(data.room);

              // Sound trigger checking
              if (data.room.soundTrigger && data.room.soundTrigger.nonce !== lastSoundNonceRef.current) {
                lastSoundNonceRef.current = data.room.soundTrigger.nonce;
                soundEffects.play(data.room.soundTrigger.sound);
              }

              // Propagate to BroadcastChannel
              if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                  type: 'ROOM_SYNC',
                  room: data.room
                });
              }
            }
          }
        }
      } catch (err) {
        // Blip recovery handled on next tick
      }
    }, pollIntervalMs);

    // 4. WebSocket for sub-millisecond push when supported
    const wsUrl = getBackendWsUrl();
    let reconnectTimer: any = null;

    function connectWs() {
      if (isCleanedUp || !wsUrl) return;
      try {
        const pingStart = Date.now();
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          setLatencyMs(Date.now() - pingStart);
          ws.send(JSON.stringify({
            type: 'JOIN_ROOM',
            roomCode: normalizedCode,
            role,
            playerId,
            playerName: playerName || 'Player'
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.room) {
              if (data.room.lastUpdated >= lastKnownUpdatedRef.current) {
                lastKnownUpdatedRef.current = data.room.lastUpdated;
                setRoom(data.room);

                if (data.room.soundTrigger && data.room.soundTrigger.nonce !== lastSoundNonceRef.current) {
                  lastSoundNonceRef.current = data.room.soundTrigger.nonce;
                  soundEffects.play(data.room.soundTrigger.sound);
                }

                if (broadcastChannelRef.current) {
                  broadcastChannelRef.current.postMessage({
                    type: 'ROOM_SYNC',
                    room: data.room
                  });
                }
              }
            }
          } catch (err) {
            console.error('Error handling WS message:', err);
          }
        };

        ws.onclose = () => {
          if (!isCleanedUp) {
            reconnectTimer = setTimeout(connectWs, 4000);
          }
        };

        ws.onerror = () => {
          try { ws.close(); } catch (e) {}
        };
      } catch (e) {
        if (!isCleanedUp) {
          reconnectTimer = setTimeout(connectWs, 4000);
        }
      }
    }

    connectWs();

    return () => {
      isCleanedUp = true;
      clearInterval(pollTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socketRef.current) socketRef.current.close();
      if (broadcastChannelRef.current) broadcastChannelRef.current.close();
    };
  }, [normalizedCode, role, playerId, playerName, loadInitialQuestions]);

  // Local Authoritative State Dispatcher (runs offline and syncs across tabs & WebSockets)
  const applyLocalAction = useCallback((type: string, payload?: any) => {
    setRoom((prev) => {
      if (!prev) return prev;
      const now = Date.now();
      const updated: GameRoom = { ...prev };

      switch (type) {
        case 'SET_PHASE': {
          const newPhase = payload?.phase;
          if (newPhase) {
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
            } else {
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
          updated.inputOpen = payload?.open ?? !updated.inputOpen;
          if (updated.inputOpen && updated.questionStartTime === 0) {
            updated.questionStartTime = now;
          }
          break;
        }

        case 'RESET_BUZZES': {
          updated.buzzes = [];
          updated.submissions = {};
          break;
        }

        case 'BUZZ_IN': {
          if (!playerId) break;
          if (!updated.buzzes.some((b) => b.playerId === playerId)) {
            const elapsed = updated.questionStartTime > 0 ? now - updated.questionStartTime : 0;
            updated.buzzes = [
              ...updated.buzzes,
              {
                playerId,
                playerName: playerName || 'Player',
                timestamp: now,
                elapsedMs: Math.max(1, elapsed),
                serverOrder: updated.buzzes.length + 1
              }
            ];
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

          const cleanSubmitted = answer.toLowerCase().replace(/^(the|a|an)\s+/i, '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
          const cleanOfficial = (currentQ?.answer || '').toLowerCase().replace(/^(the|a|an)\s+/i, '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();

          let autoStatus: 'pending' | 'correct' | 'wrong' = 'pending';
          if (currentQ?.type === 'MCQ' && cleanOfficial) {
            autoStatus = cleanSubmitted === cleanOfficial ? 'correct' : 'wrong';
          } else if (cleanOfficial) {
            if (cleanSubmitted === cleanOfficial || (cleanSubmitted.length >= 3 && (cleanOfficial.includes(cleanSubmitted) || cleanSubmitted.includes(cleanOfficial)))) {
              autoStatus = 'correct';
            } else {
              autoStatus = 'pending';
            }
          }

          const pointsAwarded = autoStatus === 'correct' ? currentQ?.points || 10 : 0;
          updated.submissions = {
            ...updated.submissions,
            [playerId]: {
              playerId,
              playerName: playerName || 'Player',
              answer,
              timestamp: now,
              elapsedMs: Math.max(1, elapsed),
              status: autoStatus,
              pointsAwarded
            }
          };

          if (!updated.buzzes.some((b) => b.playerId === playerId)) {
            updated.buzzes = [
              ...updated.buzzes,
              {
                playerId,
                playerName: playerName || 'Player',
                timestamp: now,
                elapsedMs: Math.max(1, elapsed),
                serverOrder: updated.buzzes.length + 1
              }
            ];
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
          break;
        }

        case 'ADJUDICATE': {
          const targetPid = payload?.playerId;
          const status = payload?.status;
          const points = payload?.points || 10;
          if (targetPid && updated.submissions[targetPid]) {
            updated.submissions[targetPid].status = status;
            if (status === 'correct' && updated.players[targetPid]) {
              updated.players[targetPid].score += points;
              updated.players[targetPid].streak += 1;
            }
          }
          break;
        }

        case 'UPDATE_QUESTIONS': {
          if (Array.isArray(payload?.questions)) {
            updated.questions = payload.questions;
            updated.currentPackTitle = payload.packTitle || 'Custom Pack';
            updated.currentQIndex = 0;
            updated.buzzes = [];
            updated.submissions = {};
          }
          break;
        }

        case 'TRIGGER_SOUND': {
          updated.soundTrigger = { sound: payload?.sound || 'ding', nonce: Math.random() };
          break;
        }

        case 'ADJUST_SCORE': {
          const targetPid = payload?.playerId;
          const delta = payload?.delta || 0;
          if (targetPid && updated.players[targetPid]) {
            updated.players[targetPid].score += delta;
          }
          break;
        }
      }

      updated.lastUpdated = now;

      // Broadcast to all other open tabs on this device (e.g. TV display + Host on laptop)
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'ROOM_SYNC',
            room: updated
          });
        } catch (e) {}
      }

      return updated;
    });
  }, [playerId, playerName]);

  // Action dispatcher: sends to WebSocket server AND REST API AND applies locally for zero-latency response
  const sendAction = useCallback((type: string, payload?: any) => {
    // 1. Immediately apply locally for instant visual feedback
    applyLocalAction(type, payload);

    const actionData = {
      type,
      roomCode: normalizedCode,
      role,
      playerId,
      playerName,
      payload
    };

    // 2. Send over WebSocket if connected
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(actionData));
      } catch (e) {
        console.warn('Error sending WS action:', e);
      }
    }

    // 3. ALWAYS dispatch via REST API: Guarantees phone actions reach the server even across proxies/mobile networks
    const apiBase = getBackendHttpUrl();
    fetch(`${apiBase}/api/room/${normalizedCode}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionData)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.room) {
          lastKnownUpdatedRef.current = data.room.lastUpdated;
          setRoom(data.room);
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({
              type: 'ROOM_SYNC',
              room: data.room
            });
          }
        }
      })
      .catch((err) => {
        console.warn('REST action dispatch error:', err);
      });
  }, [applyLocalAction, normalizedCode, role, playerId, playerName]);

  const buzzIn = useCallback(() => {
    sendAction('BUZZ_IN');
  }, [sendAction]);

  const submitAnswer = useCallback((answer: string) => {
    sendAction('SUBMIT_ANSWER', { answer });
  }, [sendAction]);

  const setPhase = useCallback((phase: GamePhase, inputOpen?: boolean) => {
    sendAction('SET_PHASE', { phase, inputOpen });
  }, [sendAction]);

  const toggleLock = useCallback((open?: boolean) => {
    sendAction('TOGGLE_LOCK', { open });
  }, [sendAction]);

  const changeQuestion = useCallback((index: number) => {
    sendAction('CHANGE_QUESTION', { index });
  }, [sendAction]);

  const resetBuzzes = useCallback(() => {
    sendAction('RESET_BUZZES');
  }, [sendAction]);

  const adjudicate = useCallback((targetPlayerId: string, status: 'correct' | 'wrong', points: number) => {
    sendAction('ADJUDICATE', { playerId: targetPlayerId, status, points });
  }, [sendAction]);

  const adjustScore = useCallback((targetPlayerId: string, delta: number) => {
    sendAction('ADJUST_SCORE', { playerId: targetPlayerId, delta });
  }, [sendAction]);

  const updateQuestions = useCallback((questions: Question[], packTitle: string) => {
    sendAction('UPDATE_QUESTIONS', { questions, packTitle });
  }, [sendAction]);

  const addQuestion = useCallback((question: Question, insertAt?: number) => {
    setRoom((prev) => {
      const copy = [...prev.questions];
      const targetIdx = typeof insertAt === 'number' ? insertAt : copy.length;
      copy.splice(targetIdx, 0, question);
      return { ...prev, questions: copy, lastUpdated: Date.now() };
    });
    sendAction('ADD_QUESTION', { question, insertAt });
  }, [sendAction]);

  const editQuestion = useCallback((index: number, question: Partial<Question>) => {
    setRoom((prev) => {
      const copy = [...prev.questions];
      if (copy[index]) {
        copy[index] = { ...copy[index], ...question };
      }
      return { ...prev, questions: copy, lastUpdated: Date.now() };
    });
    sendAction('EDIT_QUESTION', { index, question });
  }, [sendAction]);

  const deleteQuestion = useCallback((index: number) => {
    setRoom((prev) => {
      const copy = prev.questions.filter((_, i) => i !== index);
      return { ...prev, questions: copy, lastUpdated: Date.now() };
    });
    sendAction('DELETE_QUESTION', { index });
  }, [sendAction]);

  const triggerSound = useCallback((sound: string) => {
    soundEffects.play(sound);
    sendAction('TRIGGER_SOUND', { sound });
  }, [sendAction]);

  const kickPlayer = useCallback((targetPlayerId: string) => {
    setRoom((prev) => {
      const players = { ...prev.players };
      delete players[targetPlayerId];
      return { ...prev, players, lastUpdated: Date.now() };
    });
    sendAction('KICK_PLAYER', { playerId: targetPlayerId });
  }, [sendAction]);

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
