import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_QUIZ_PACKS } from './src/data/defaultQuizPacks.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// CORS Support for external deployments (e.g. Netlify, custom domains)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI if API key exists
const apiKey = process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenAI | null = null;
if (apiKey) {
  genAI = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// ---------------- GAME STATE MANAGEMENT ----------------
export interface Question {
  id: string;
  type: 'BUZZER' | 'MCQ' | 'TEXT' | 'NUMERIC' | 'BLUFF';
  category: string;
  question: string;
  options?: string[];
  answer: string;
  points: number;
  mediaType?: 'image' | 'audio' | 'video' | 'none';
  mediaUrl?: string;
  explanation?: string;
  hint?: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  connected: boolean;
  avatar?: string;
  lastBuzzTime?: number;
  lastSeen?: number;
}

export interface Buzz {
  playerId: string;
  playerName: string;
  timestamp: number;
  elapsedMs: number;
  serverOrder: number;
}

export interface Submission {
  playerId: string;
  playerName: string;
  answer: string;
  timestamp: number;
  elapsedMs: number;
  status: 'pending' | 'correct' | 'wrong';
  pointsAwarded?: number;
}

export interface GameRoom {
  code: string;
  phase: 'LOBBY' | 'QUESTION' | 'REVEAL' | 'ROUND_STATS' | 'LEADERBOARD';
  currentQIndex: number;
  inputOpen: boolean;
  questionStartTime: number;
  questions: Question[];
  currentPackTitle: string;
  players: Record<string, Player>;
  buzzes: Buzz[];
  submissions: Record<string, Submission>;
  questionHistory: Record<string, { correctCount: number; totalAttempts: number; buzzTimes: number[] }>;
  soundTrigger?: { sound: string; nonce: number };
  lastUpdated: number;
  hostLastSeen?: number;
  hostConnected?: boolean;
}

const rooms: Record<string, GameRoom> = {};
const roomClients: Record<string, Set<WebSocket>> = {};

// Helper: Get or create room
function getOrCreateRoom(code: string): GameRoom {
  const normalized = (code || 'QUIZ').trim().toUpperCase();
  if (!rooms[normalized]) {
    const defaultPack = DEFAULT_QUIZ_PACKS && DEFAULT_QUIZ_PACKS[0] ? DEFAULT_QUIZ_PACKS[0] : null;
    rooms[normalized] = {
      code: normalized,
      phase: 'LOBBY',
      currentQIndex: 0,
      inputOpen: true, // Keep inputs open for active questions
      questionStartTime: Date.now(),
      questions: defaultPack ? [...defaultPack.questions] : [],
      currentPackTitle: defaultPack ? defaultPack.title : 'General Knowledge: Round 1',
      players: {},
      buzzes: [],
      submissions: {},
      questionHistory: {},
      lastUpdated: Date.now()
    };
  }
  return rooms[normalized];
}

// Broadcast game state to all connected clients in a room
function broadcastToRoom(roomCode: string, actionType: string, payload?: any) {
  const clients = roomClients[roomCode];
  if (!clients) return;

  const room = rooms[roomCode];
  const message = JSON.stringify({
    type: actionType,
    room: room || null,
    payload,
    timestamp: Date.now()
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('Error sending WS message:', err);
      }
    }
  }
}

function cleanAnswerString(str: string): string {
  return String(str || '')
    .toLowerCase()
    .replace(/^(the|a|an|king|sir|lord)\s+/i, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------- GAME ACTION PROCESSING (Shared by WebSocket & REST API) ----------------
export function processRoomAction(action: {
  type: string;
  roomCode?: string;
  playerId?: string;
  playerName?: string;
  role?: string;
  payload?: any;
}): GameRoom {
  const { type, roomCode = 'QUIZ', playerId, playerName, role, payload } = action;
  const normalizedCode = (roomCode || 'QUIZ').trim().toUpperCase();
  const room = getOrCreateRoom(normalizedCode);
  const now = Date.now();

  try {
    switch (type) {
    case 'JOIN_ROOM': {
      if (role === 'player' && playerId) {
        const cleanName = (payload?.name || playerName || 'Player').trim();
        if (!room.players[playerId]) {
          room.players[playerId] = {
            id: playerId,
            name: cleanName,
            score: 0,
            streak: 0,
            connected: true,
            avatar: `avatar-${(Object.keys(room.players).length % 8) + 1}`,
            lastSeen: now
          };
        } else {
          room.players[playerId].connected = true;
          room.players[playerId].lastSeen = now;
          if (cleanName && cleanName !== 'Player') {
            room.players[playerId].name = cleanName;
          }
        }
      }
      room.lastUpdated = now;
      broadcastToRoom(normalizedCode, 'ROOM_UPDATED');
      break;
    }

        case 'BUZZ_IN': {
          if (!playerId || !room.inputOpen || room.phase !== 'QUESTION') return room;

          // Check if already buzzed for this question
          const alreadyBuzzed = room.buzzes.some(b => b.playerId === playerId);
          if (!alreadyBuzzed) {
            const elapsed = room.questionStartTime > 0 ? now - room.questionStartTime : 0;
            const buzzOrder = room.buzzes.length + 1;
            const newBuzz: Buzz = {
              playerId,
              playerName: room.players[playerId]?.name || playerName || 'Player',
              timestamp: now,
              elapsedMs: Math.max(1, elapsed),
              serverOrder: buzzOrder
            };
            room.buzzes.push(newBuzz);

            // Record into question history
            const currentQ = room.questions[room.currentQIndex];
            if (currentQ) {
              if (!room.questionHistory[currentQ.id]) {
                room.questionHistory[currentQ.id] = { correctCount: 0, totalAttempts: 0, buzzTimes: [] };
              }
              room.questionHistory[currentQ.id].buzzTimes.push(newBuzz.elapsedMs);
            }

            // Trigger buzzer sound on TV
            room.soundTrigger = { sound: 'buzzer', nonce: Math.random() };
            room.lastUpdated = now;
            broadcastToRoom(normalizedCode, 'BUZZ_RECORDED', { buzz: newBuzz });
          }
          break;
        }

        case 'SUBMIT_ANSWER': {
          if (!playerId || !room.inputOpen || room.phase !== 'QUESTION') return room;
          const answer = String(payload?.answer || '').trim();
          if (!answer) return room;

          const elapsed = room.questionStartTime > 0 ? now - room.questionStartTime : 0;
          const currentQ = room.questions[room.currentQIndex];
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

          // If previously awarded points, revert before re-evaluating
          const prevSub = room.submissions[playerId];
          if (prevSub && prevSub.status === 'correct' && room.players[playerId]) {
            room.players[playerId].score = Math.max(
              0,
              room.players[playerId].score - (prevSub.pointsAwarded || currentQ?.points || 10)
            );
          }

          const pointsAwarded = autoStatus === 'correct' ? (currentQ?.points || 10) : 0;
          room.submissions[playerId] = {
            playerId,
            playerName: room.players[playerId]?.name || playerName || 'Player',
            answer,
            timestamp: now,
            elapsedMs: Math.max(1, elapsed),
            status: autoStatus,
            pointsAwarded
          };

          // Also register in buzzes queue if not already there
          if (!room.buzzes.some(b => b.playerId === playerId)) {
            room.buzzes.push({
              playerId,
              playerName: room.players[playerId]?.name || playerName || 'Player',
              timestamp: now,
              elapsedMs: Math.max(1, elapsed),
              serverOrder: room.buzzes.length + 1
            });
          }

          if (autoStatus === 'correct' && room.players[playerId]) {
            room.players[playerId].score += pointsAwarded;
            room.players[playerId].streak += 1;
            room.soundTrigger = { sound: 'correct', nonce: Math.random() };
          } else if (autoStatus === 'wrong' && room.players[playerId]) {
            room.players[playerId].streak = 0;
            room.soundTrigger = { sound: 'wrong', nonce: Math.random() };
          } else {
            room.soundTrigger = { sound: 'ding', nonce: Math.random() };
          }

          if (currentQ) {
            if (!room.questionHistory[currentQ.id]) {
              room.questionHistory[currentQ.id] = { correctCount: 0, totalAttempts: 0, buzzTimes: [] };
            }
            room.questionHistory[currentQ.id].totalAttempts += 1;
            if (autoStatus === 'correct') {
              room.questionHistory[currentQ.id].correctCount += 1;
            }
          }

          room.lastUpdated = now;
          broadcastToRoom(normalizedCode, 'SUBMISSION_RECORDED', { playerId, answer, status: autoStatus });
          break;
        }

        case 'SET_PHASE': {
          const newPhase = payload?.phase;
          if (['LOBBY', 'QUESTION', 'REVEAL', 'ROUND_STATS', 'LEADERBOARD'].includes(newPhase)) {
            room.phase = newPhase;
            if (newPhase === 'QUESTION') {
              room.questionStartTime = now;
              room.inputOpen = payload?.inputOpen ?? true;
              room.buzzes = [];
              room.submissions = {};
              room.soundTrigger = { sound: 'whoosh', nonce: Math.random() };
            } else if (newPhase === 'REVEAL') {
              room.inputOpen = false;
              room.soundTrigger = { sound: 'ding', nonce: Math.random() };
            } else if (newPhase === 'ROUND_STATS' || newPhase === 'LEADERBOARD') {
              room.inputOpen = false;
              room.soundTrigger = { sound: 'fanfare', nonce: Math.random() };
            }
            room.lastUpdated = now;
            broadcastToRoom(normalizedCode, 'PHASE_CHANGED');
          }
          break;
        }

        case 'TOGGLE_LOCK': {
          const wasOpen = room.inputOpen;
          room.inputOpen = payload?.open ?? !room.inputOpen;
          if (room.inputOpen && room.questionStartTime === 0) {
            room.questionStartTime = now;
          }
          if (room.inputOpen && !wasOpen) {
            room.soundTrigger = { sound: 'unlock', nonce: Math.random() };
          }
          room.lastUpdated = now;
          broadcastToRoom(normalizedCode, 'LOCK_TOGGLED');
          break;
        }

        case 'CHANGE_QUESTION': {
          const newIndex = payload?.index;
          if (typeof newIndex === 'number' && newIndex >= 0 && newIndex < room.questions.length) {
            room.currentQIndex = newIndex;
            room.buzzes = [];
            room.submissions = {};
            room.inputOpen = true; // Auto open inputs for the new question so players can type immediately!
            room.questionStartTime = now;
            room.phase = 'QUESTION';
            room.soundTrigger = { sound: 'whoosh', nonce: Math.random() };
            room.lastUpdated = now;
            broadcastToRoom(normalizedCode, 'QUESTION_CHANGED');
          }
          break;
        }

        case 'RESET_BUZZES': {
          room.buzzes = [];
          room.submissions = {};
          room.questionStartTime = now;
          room.lastUpdated = now;
          broadcastToRoom(normalizedCode, 'BUZZES_RESET');
          break;
        }

        case 'ADJUDICATE': {
          const targetPlayerId = payload?.playerId;
          const status = payload?.status as 'correct' | 'wrong';
          const points = Number(payload?.points || 10);

          if (targetPlayerId && room.players[targetPlayerId]) {
            const prevSub = room.submissions[targetPlayerId];
            const alreadyAwarded = prevSub?.status === 'correct' ? (prevSub.pointsAwarded ?? points) : 0;

            if (status === 'correct') {
              const delta = Math.max(0, points - alreadyAwarded);
              room.players[targetPlayerId].score += delta;
              if (prevSub?.status !== 'correct') {
                room.players[targetPlayerId].streak += 1;
              }
              room.soundTrigger = { sound: 'correct', nonce: Math.random() };
            } else if (status === 'wrong') {
              room.players[targetPlayerId].score = Math.max(0, room.players[targetPlayerId].score - alreadyAwarded);
              room.players[targetPlayerId].streak = 0;
              room.soundTrigger = { sound: 'wrong', nonce: Math.random() };
            }

            if (prevSub) {
              room.submissions[targetPlayerId] = {
                ...prevSub,
                status,
                pointsAwarded: status === 'correct' ? points : 0
              };
            }

            const currentQ = room.questions[room.currentQIndex];
            if (currentQ) {
              if (!room.questionHistory[currentQ.id]) {
                room.questionHistory[currentQ.id] = { correctCount: 0, totalAttempts: 0, buzzTimes: [] };
              }
              room.questionHistory[currentQ.id].totalAttempts += 1;
              if (status === 'correct') {
                room.questionHistory[currentQ.id].correctCount += 1;
              }
            }

            room.lastUpdated = now;
            broadcastToRoom(normalizedCode, 'ADJUDICATION_UPDATED');
          }
          break;
        }

        case 'ADJUST_SCORE': {
          const targetId = payload?.playerId;
          const delta = Number(payload?.delta || 0);
          if (targetId && room.players[targetId]) {
            room.players[targetId].score = Math.max(0, room.players[targetId].score + delta);
            room.lastUpdated = now;
            broadcastToRoom(normalizedCode, 'SCORE_ADJUSTED');
          }
          break;
        }

        case 'UPDATE_QUESTIONS': {
          if (Array.isArray(payload?.questions)) {
            room.questions = payload.questions;
            room.currentPackTitle = payload?.packTitle || room.currentPackTitle || 'Custom Pack';
            room.currentQIndex = 0;
            room.buzzes = [];
            room.submissions = {};
            room.phase = 'LOBBY';
            room.lastUpdated = now;
            broadcastToRoom(normalizedCode, 'QUESTIONS_UPDATED');
          }
          break;
        }

        case 'ADD_QUESTION': {
          const newQ = payload?.question;
          const insertAt = payload?.insertAt;
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

            if (typeof insertAt === 'number' && insertAt >= 0 && insertAt <= room.questions.length) {
              room.questions.splice(insertAt, 0, questionObj);
            } else {
              room.questions.push(questionObj);
            }
            room.lastUpdated = now;
            broadcastToRoom(normalizedCode, 'QUESTION_ADDED', { question: questionObj });
          }
          break;
        }

        case 'EDIT_QUESTION': {
          const qIndex = payload?.index;
          const updatedQ = payload?.question;
          if (typeof qIndex === 'number' && qIndex >= 0 && qIndex < room.questions.length && updatedQ) {
            room.questions[qIndex] = {
              ...room.questions[qIndex],
              ...updatedQ,
              id: room.questions[qIndex].id
            };
            room.lastUpdated = now;
            broadcastToRoom(normalizedCode, 'QUESTION_UPDATED', { index: qIndex, question: room.questions[qIndex] });
          }
          break;
        }

        case 'DELETE_QUESTION': {
          const delIndex = payload?.index;
          if (typeof delIndex === 'number' && delIndex >= 0 && delIndex < room.questions.length) {
            room.questions.splice(delIndex, 1);
            if (room.currentQIndex >= room.questions.length) {
              room.currentQIndex = Math.max(0, room.questions.length - 1);
            }
            room.lastUpdated = now;
            broadcastToRoom(normalizedCode, 'QUESTION_DELETED', { index: delIndex });
          }
          break;
        }

        case 'TRIGGER_SOUND': {
          room.soundTrigger = { sound: payload?.sound || 'ding', nonce: Math.random() };
          room.lastUpdated = now;
          broadcastToRoom(normalizedCode, 'SOUND_TRIGGERED');
          break;
        }

        case 'KICK_PLAYER': {
          const kickId = payload?.playerId;
          if (kickId && room.players[kickId]) {
            delete room.players[kickId];
            room.buzzes = room.buzzes.filter(b => b.playerId !== kickId);
            delete room.submissions[kickId];
            room.lastUpdated = now;
            broadcastToRoom(normalizedCode, 'PLAYER_KICKED');
          }
          break;
        }

        case 'HEARTBEAT': {
          if (playerId && room.players[playerId]) {
            room.players[playerId].connected = true;
            room.players[playerId].lastSeen = now;
          }
          if (role === 'host') {
            room.hostLastSeen = now;
            room.hostConnected = true;
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error in processRoomAction:', err);
    }

    return room;
  }

// ---------------- WEBSOCKET HANDLING WITH HEARTBEAT ----------------
interface HeartbeatWebSocket extends WebSocket {
  roomCode?: string;
  clientId?: string;
  role?: string;
  isAlive?: boolean;
}

wss.on('connection', (ws: HeartbeatWebSocket) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data: string) => {
    try {
      ws.isAlive = true;
      const msg = JSON.parse(data.toString());
      const normalizedCode = (msg.roomCode || 'QUIZ').trim().toUpperCase();

      if (!roomClients[normalizedCode]) {
        roomClients[normalizedCode] = new Set();
      }
      roomClients[normalizedCode].add(ws);
      ws.roomCode = normalizedCode;
      ws.clientId = msg.playerId;
      ws.role = msg.role;

      processRoomAction(msg);

      // Echo back heartbeat confirmation if heartbeat message
      if (msg.type === 'HEARTBEAT' || msg.type === 'PING') {
        try {
          ws.send(JSON.stringify({
            type: 'SERVER_HEARTBEAT_ACK',
            timestamp: Date.now(),
            role: msg.role
          }));
        } catch (e) {}
      }
    } catch (e) {
      console.error('WS parsing error:', e);
    }
  });

  ws.on('close', () => {
    if (ws.roomCode && roomClients[ws.roomCode]) {
      roomClients[ws.roomCode].delete(ws);
      if (ws.role === 'player' && ws.clientId) {
        const room = rooms[ws.roomCode];
        if (room && room.players[ws.clientId]) {
          room.players[ws.clientId].connected = false;
          broadcastToRoom(ws.roomCode, 'PLAYER_DISCONNECTED');
        }
      }
    }
  });
});

// Periodic Server-Side WebSocket Ping/Pong & Stream Keep-Alive Sweep (Every 15s)
// Prevents cloud proxies (Cloud Run, reverse proxies) and cellular carriers from dropping idle connections
const wsServerHeartbeat = setInterval(() => {
  wss.clients.forEach((client: any) => {
    if (client.isAlive === false) {
      return client.terminate();
    }
    client.isAlive = false;
    try {
      client.ping();
      client.send(JSON.stringify({
        type: 'SERVER_HEARTBEAT',
        timestamp: Date.now()
      }));
    } catch (e) {}
  });
}, 15000);

// Clean up heartbeat timer if server stops
server.on('close', () => {
  clearInterval(wsServerHeartbeat);
});

// ---------------- REST API ROUTES ----------------

// Dedicated Heartbeat Route: Unthrottled check-in for mobile host and TV clients
app.all('/api/room/:code/heartbeat', (req, res) => {
  const code = (req.params.code || 'QUIZ').trim().toUpperCase();
  const room = getOrCreateRoom(code);
  const now = Date.now();
  const data = req.method === 'POST' ? req.body : req.query;
  const { playerId, role } = data || {};

  if (playerId && room.players[playerId]) {
    room.players[playerId].connected = true;
    room.players[playerId].lastSeen = now;
  }
  if (role === 'host') {
    room.hostLastSeen = now;
    room.hostConnected = true;
  }

  const isHostAlive = !!(room.hostLastSeen && (now - room.hostLastSeen < 30000));
  room.hostConnected = isHostAlive;

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    timestamp: now,
    lastUpdated: room.lastUpdated,
    hostConnected: isHostAlive,
    playersCount: Object.keys(room.players).length
  });
});

// Get room state (polled by TV and mobile clients)
app.get('/api/room/:code', (req, res) => {
  const code = (req.params.code || 'QUIZ').trim().toUpperCase();
  const room = getOrCreateRoom(code);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ success: true, room });
});

// Post game action (immediate fallback when WebSockets are blocked or delayed)
app.post('/api/room/:code/action', (req, res) => {
  try {
    const code = (req.params.code || req.body?.roomCode || 'QUIZ').trim().toUpperCase();
    const action = {
      ...req.body,
      roomCode: code
    };
    const updatedRoom = processRoomAction(action);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ success: true, room: updatedRoom });
  } catch (err: any) {
    console.error('Error executing REST action:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update questions or init pack
app.post('/api/room/:code/questions', (req, res) => {
  const code = (req.params.code || 'QUIZ').trim().toUpperCase();
  const room = getOrCreateRoom(code);
  const { questions, packTitle } = req.body;
  if (Array.isArray(questions)) {
    room.questions = questions;
    room.currentPackTitle = packTitle || 'Custom Pack';
    room.currentQIndex = 0;
    room.buzzes = [];
    room.submissions = {};
    broadcastToRoom(code, 'QUESTIONS_UPDATED');
  }
  res.json({ success: true, room });
});

// ---------------- GEMINI AI ENGINE & RESILIENT CALLER ----------------

async function callGeminiSafe(
  preferredModel: string,
  requestPayload: any,
  timeoutMs = 6000
): Promise<{ text: string; modelUsed: string }> {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }

  // Model cascade: try preferred model first, then gemini-3.1-flash-lite, then gemini-3.5-flash
  const candidateModels: string[] = [];
  if (preferredModel) candidateModels.push(preferredModel);
  if (!candidateModels.includes('gemini-3.1-flash-lite')) candidateModels.push('gemini-3.1-flash-lite');
  if (!candidateModels.includes('gemini-3.5-flash')) candidateModels.push('gemini-3.5-flash');

  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const responsePromise = genAI.models.generateContent({
        ...requestPayload,
        model: modelName
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms calling model ${modelName}`)), timeoutMs)
      );

      const response: any = await Promise.race([responsePromise, timeoutPromise]);
      const text = response?.text || '';
      if (text) {
        return { text, modelUsed: modelName };
      }
    } catch (err: any) {
      console.warn(`Gemini call failed or timed out on ${modelName}:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All candidate models failed or timed out.');
}

// 1. Multi-turn AI Chatbot Endpoint (Supports gemini-4-argon, gemini-3.8-flash, gemini-3.1-flash-lite)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, systemInstruction, role = 'adjudicator', model = 'gemini-3.1-flash-lite' } = req.body;

    const defaultInstructions: Record<string, string> = {
      adjudicator: `You are the official AI Adjudicator & Co-Host for "QuizCast Live", a high-energy TV & pub quiz game show.
Your duties:
1. Settle disputes between the host and players on whether an answer is acceptable or close enough (e.g. typos, alternate spellings, synonyms, historical aliases).
2. Give clear, fair rulings with a light-hearted, witty pub-quizmaster tone.
3. Keep responses concise, entertaining, and decisive (max 2-3 short paragraphs).
4. If asked to generate trivia questions or tie-breakers, provide the question, 4 multiple choice options, the exact answer, and a fun fact.`,
      host: `You are a charismatic, witty TV Quiz Show Host (in the style of Bradley Walsh or Alexander Armstrong).
You banter with the host and players, offer humorous commentary on the scoreboard, celebrate winning streaks, and provide cheeky roasts for teams at the bottom of the table. Always keep it warm, family-friendly, and sharp!`,
      factchecker: `You are a hyper-accurate Trivia Fact-Checker. You rigorously verify quiz claims, explain the real science or history behind trivia questions, and explain why wrong answers are wrong.`
    };

    const finalSystemInstruction = systemInstruction || defaultInstructions[role] || defaultInstructions.adjudicator;

    // Convert messages to GenAI format
    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    if (contents.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    let targetModel = 'gemini-3.1-flash-lite';
    if (model === 'gemini-4-argon' || model === 'models/gemini-4-argon') {
      targetModel = 'gemini-4-argon';
    } else if (model === 'gemini-3.8-flash' || model === 'models/gemini-3.8-flash') {
      targetModel = 'gemini-3.8-flash';
    }

    try {
      const { text, modelUsed } = await callGeminiSafe(
        targetModel,
        {
          contents,
          config: {
            systemInstruction: finalSystemInstruction,
            temperature: 0.7,
          }
        },
        6000
      );

      return res.json({
        success: true,
        reply: text,
        modelUsed
      });
    } catch (genError: any) {
      console.warn('Gemini chat fallback engaged:', genError.message);
      // Intelligent in-character conversational fallback
      const lastUserMsg = (messages[messages.length - 1]?.text || '').toLowerCase();
      let fallbackReply = '';

      if (role === 'adjudicator') {
        if (lastUserMsg.includes('judge') || lastUserMsg.includes('correct') || lastUserMsg.includes('acceptable')) {
          fallbackReply = `⚖️ **AI Adjudicator Ruling:** Having reviewed the submitted answers against pub quiz standard regulations: if the core meaning matches, phonetic spelling is close, or the key surname is present, award the points! Remember, the Quizmaster's word is law, but generosity keeps the room smiling.`;
        } else if (lastUserMsg.includes('tiebreaker') || lastUserMsg.includes('question')) {
          fallbackReply = `🎯 **Tie-Breaker Question:**\n\n*Question:* How many seconds does it take for sunlight to travel from the surface of the Sun to Earth?\n*Answer:* 499 seconds (approx 8 minutes and 19 seconds).\n*Adjudication:* Closest guess takes the victory!`;
        } else {
          fallbackReply = `👋 Quizmaster here! I'm monitoring the game board. Keep the questions coming or ask me to adjudicate any disputed answers!`;
        }
      } else if (role === 'host') {
        fallbackReply = `🎙️ Good evening, quizzers! Welcome to QuizCast Live! Remember: no arguing with the buzzer, keep your pints upright, and let's see who's taking home the championship trophy tonight!`;
      } else {
        fallbackReply = `🔍 **Trivia Fact-Check:** Always verify that answers match standard encyclopedic records. When in doubt, common colloquial names and accepted scientific aliases should be credited.`;
      }

      return res.json({
        success: true,
        reply: fallbackReply,
        modelUsed: 'rule-engine-fallback'
      });
    }
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to process AI chat request'
    });
  }
});

// 2. AI Round Generator Endpoint
app.post('/api/ai/generate-round', async (req, res) => {
  try {
    const { topic = 'General Trivia', questionCount = 5, difficulty = 'medium' } = req.body;

    const prompt = `Generate a high quality, entertaining pub/TV quiz round of ${questionCount} questions on the topic "${topic}".
Difficulty: ${difficulty}.
Include a mix of question types: BUZZER, MCQ (multiple choice with 4 options), and TEXT (short free-text).
Format as strict JSON array conforming to this schema:
[
  {
    "id": "q1",
    "type": "MCQ",
    "category": "${topic}",
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Correct Answer",
    "points": 10,
    "explanation": "Fun fact or explanation of the answer",
    "mediaType": "none",
    "mediaUrl": ""
  }
]
Only return the valid raw JSON array, without markdown backticks or commentary.`;

    let questions: Question[] = [];

    try {
      const { text } = await callGeminiSafe(
        'gemini-3.1-flash-lite',
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json'
          }
        },
        7000
      );

      const rawText = text || '[]';
      try {
        questions = JSON.parse(rawText);
      } catch {
        const jsonMatch = rawText.match(/\[.*\]/s);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (apiErr) {
      console.warn('API generate round error, using dynamic generator fallback:', apiErr);
      // Dynamic fallback pack on topic
      const count = Math.max(3, Math.min(Number(questionCount) || 5, 10));
      questions = Array.from({ length: count }).map((_, i) => ({
        id: `gen_q_${Date.now()}_${i}`,
        type: i % 3 === 0 ? 'TEXT' : i % 3 === 1 ? 'MCQ' : 'BUZZER',
        category: topic,
        question: `[${topic}] Question ${i + 1}: Name a prominent feature, historical event, or iconic figure associated with ${topic}?`,
        options: i % 3 === 1 ? ['Option 1', 'Option 2', 'Option 3', 'Option 4'] : [],
        answer: `${topic} Answer #${i + 1}`,
        points: (i + 1) * 10,
        explanation: `Key trivia fact regarding ${topic} question #${i + 1}.`,
        mediaType: 'none'
      }));
    }

    questions = (questions || []).map((q, idx) => ({
      ...q,
      id: q.id || `ai_q_${Date.now()}_${idx}`,
      points: Number(q.points) || 10,
      type: q.type || (q.options && q.options.length > 0 ? 'MCQ' : 'TEXT')
    }));

    res.json({
      success: true,
      questions,
      packTitle: `${topic} (${difficulty.toUpperCase()})`
    });
  } catch (error: any) {
    console.error('AI generate round error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate round'
    });
  }
});

// 2b. AI Single Question Generator
app.post('/api/ai/generate-single-question', async (req, res) => {
  try {
    const { topic = 'General Trivia', type = 'MCQ', difficulty = 'medium' } = req.body;

    const prompt = `Generate a single engaging, family-friendly pub/TV quiz question on the topic "${topic}".
Type: ${type} (can be BUZZER, MCQ, or TEXT).
Difficulty: ${difficulty}.
Return strict JSON:
{
  "type": "${type}",
  "category": "${topic}",
  "question": "Question text here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "Correct answer",
  "points": 10,
  "explanation": "Brief fun fact or backstory",
  "mediaType": "none",
  "mediaUrl": ""
}
Only output valid raw JSON without markdown formatting.`;

    let question: Question | null = null;

    try {
      const { text } = await callGeminiSafe(
        'gemini-3.1-flash-lite',
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' }
        },
        5000
      );

      const rawText = text || '{}';
      question = JSON.parse(rawText);
    } catch (apiErr) {
      console.warn('Single question API error, generating template fallback:', apiErr);
      question = {
        id: `q_fallback_${Date.now()}`,
        type: (type as any) || 'TEXT',
        category: topic,
        question: `What is the most famous historical landmark or iconic creation associated with ${topic}?`,
        options: type === 'MCQ' ? ['Option A', 'Option B', 'Option C', 'Option D'] : [],
        answer: `${topic} Landmark`,
        points: 10,
        explanation: `Historical trivia concerning ${topic}.`,
        mediaType: 'none'
      };
    }

    if (question) {
      question.id = question.id || `ai_q_${Date.now()}`;
      question.points = Number(question.points) || 10;
      if (question.type !== 'MCQ') {
        question.options = [];
      }
    }

    res.json({ success: true, question });
  } catch (error: any) {
    console.error('Generate single question error:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate single question' });
  }
});

// 3. AI Answer Adjudicator
app.post('/api/ai/adjudicate-answer', async (req, res) => {
  try {
    const { question, officialAnswer, playerAnswer } = req.body;
    const cleanPlayer = String(playerAnswer || '').trim().toLowerCase();
    const cleanOfficial = String(officialAnswer || '').trim().toLowerCase();

    // Fast-path exact match
    if (cleanPlayer === cleanOfficial || cleanPlayer.replace(/^(the|a|an)\s+/i, '') === cleanOfficial.replace(/^(the|a|an)\s+/i, '')) {
      return res.json({
        success: true,
        decision: {
          isCorrect: true,
          confidence: 1.0,
          verdict: 'ACCEPT',
          reason: 'Exact match.'
        }
      });
    }

    const prompt = `You are a TV quiz show adjudicator.
Question: "${question}"
Official Correct Answer: "${officialAnswer}"
Player's Answer: "${playerAnswer}"

Determine if the player's answer should be accepted as correct, considering minor typos, phonetic spelling, first/last names, colloquialisms, or synonyms.
Return strict JSON:
{
  "isCorrect": boolean,
  "confidence": number,
  "verdict": "ACCEPT" or "REJECT" or "MARGINAL",
  "reason": "Short one-sentence explanation"
}`;

    try {
      const { text } = await callGeminiSafe(
        'gemini-3.1-flash-lite',
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json'
          }
        },
        5000
      );

      const decision = JSON.parse(text || '{}');
      return res.json({ success: true, decision });
    } catch (apiErr) {
      console.warn('AI Adjudication fallback logic engaged:', apiErr);
      // Smart fuzzy fallback
      const stripArticle = (s: string) => s.toLowerCase().replace(/^(the|a|an)\s+/i, '').replace(/[^a-z0-9]/g, '');
      const p = stripArticle(cleanPlayer);
      const o = stripArticle(cleanOfficial);

      const isSub = p.length > 2 && (o.includes(p) || p.includes(o));
      return res.json({
        success: true,
        decision: {
          isCorrect: isSub,
          confidence: isSub ? 0.85 : 0.2,
          verdict: isSub ? 'ACCEPT' : 'REJECT',
          reason: isSub
            ? 'Player answer closely matches the key identifying terms.'
            : 'Answer differs significantly from official answer.'
        }
      });
    }
  } catch (error: any) {
    console.error('Adjudicate error:', error);
    res.status(500).json({ error: error?.message || 'Failed to adjudicate' });
  }
});

// ---------------- VITE MIDDLEWARE / STATIC ASSETS ----------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`QuizCast Live server running on http://0.0.0.0:${port}`);
  });
}

startServer();
