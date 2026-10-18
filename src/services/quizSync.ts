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

export function useQuizSync({ roomCode, role, playerId, playerName }: UseQuizSyncProps) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const socketRef = useRef<WebSocket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastSoundNonceRef = useRef<number>(0);
  const normalizedCode = (roomCode || 'QUIZ').trim().toUpperCase();

  // Load initial fallback state
  const loadInitialQuestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${normalizedCode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          if (!data.room.questions || data.room.questions.length === 0) {
            // Seed default questions if empty
            await fetch(`/api/room/${normalizedCode}/questions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                questions: DEFAULT_QUIZ_PACKS[0].questions,
                packTitle: DEFAULT_QUIZ_PACKS[0].title
              })
            });
          }
          setRoom(data.room);
        }
      }
    } catch (e) {
      console.warn('Initial fetch room state failed:', e);
    }
  }, [normalizedCode]);

  // Connect to WebSocket & BroadcastChannel
  useEffect(() => {
    if (!role) return;

    loadInitialQuestions();

    // BroadcastChannel for instant local cross-tab fallback
    try {
      const bc = new BroadcastChannel(`quizcast_${normalizedCode}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === 'ROOM_SYNC' && event.data.room) {
          setRoom(event.data.room);
          if (event.data.room.soundTrigger && event.data.room.soundTrigger.nonce !== lastSoundNonceRef.current) {
            lastSoundNonceRef.current = event.data.room.soundTrigger.nonce;
            soundEffects.play(event.data.room.soundTrigger.sound);
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    // Determine WS URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let reconnectTimer: any = null;
    let isCleanedUp = false;

    function connectWs() {
      if (isCleanedUp) return;
      try {
        const pingStart = Date.now();
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          setLatencyMs(Date.now() - pingStart);
          // Send Join
          ws.send(JSON.stringify({
            type: 'JOIN_ROOM',
            roomCode: normalizedCode,
            role,
            playerId,
            playerName
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.room) {
              setRoom(data.room);

              // Sound trigger checking
              if (data.room.soundTrigger && data.room.soundTrigger.nonce !== lastSoundNonceRef.current) {
                lastSoundNonceRef.current = data.room.soundTrigger.nonce;
                soundEffects.play(data.room.soundTrigger.sound);
              }

              // Sync to BroadcastChannel
              if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                  type: 'ROOM_SYNC',
                  room: data.room
                });
              }
            }
          } catch (err) {
            console.error('Error handling WS message:', err);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          if (!isCleanedUp) {
            reconnectTimer = setTimeout(connectWs, 2000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        console.error('WS Connection error:', e);
        if (!isCleanedUp) {
          reconnectTimer = setTimeout(connectWs, 2000);
        }
      }
    }

    connectWs();

    return () => {
      isCleanedUp = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socketRef.current) socketRef.current.close();
      if (broadcastChannelRef.current) broadcastChannelRef.current.close();
    };
  }, [normalizedCode, role, playerId, playerName, loadInitialQuestions]);

  // Action dispatcher
  const sendAction = useCallback((type: string, payload?: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type,
        roomCode: normalizedCode,
        role,
        playerId,
        playerName,
        payload
      }));
    } else {
      console.warn('Socket not open, attempting HTTP / BC sync');
    }
  }, [normalizedCode, role, playerId, playerName]);

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
    sendAction('ADD_QUESTION', { question, insertAt });
  }, [sendAction]);

  const editQuestion = useCallback((index: number, question: Partial<Question>) => {
    sendAction('EDIT_QUESTION', { index, question });
  }, [sendAction]);

  const deleteQuestion = useCallback((index: number) => {
    sendAction('DELETE_QUESTION', { index });
  }, [sendAction]);

  const triggerSound = useCallback((sound: string) => {
    sendAction('TRIGGER_SOUND', { sound });
  }, [sendAction]);

  const kickPlayer = useCallback((targetPlayerId: string) => {
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
