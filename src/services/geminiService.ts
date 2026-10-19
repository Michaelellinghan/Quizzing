import { ChatMessage, Question, QuestionType } from '../types/quiz';

export interface ChatRequestOptions {
  messages: { role: 'user' | 'model'; text: string }[];
  systemInstruction?: string;
  role?: 'adjudicator' | 'host' | 'factchecker';
  model?: 'gemini-3.8-flash' | 'gemini-4-argon' | 'gemini-3.1-flash-lite';
}

export const CLOUD_RUN_BACKEND = 'https://ais-pre-gn2ihvmb443kj3zt3zzttc-148054449091.europe-west2.run.app';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('netlify.app') || host.includes('github.io') || host.includes('vercel.app')) {
      return (import.meta as any).env?.VITE_BACKEND_URL || CLOUD_RUN_BACKEND;
    }
  }
  return (import.meta as any).env?.VITE_BACKEND_URL || '';
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 9000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const fullUrl = url.startsWith('http') ? url : `${getApiBaseUrl()}${url}`;
  try {
    const res = await fetch(fullUrl, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function sendGeminiChatMessage(options: ChatRequestOptions): Promise<string> {
  try {
    const response = await fetchWithTimeout('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    }, 9000);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `AI Chat request returned status ${response.status}`);
    }

    const data = await response.json();
    return data.reply || 'Quizmaster response received.';
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('AI request took too long. Please try again or switch model.');
    }
    throw err;
  }
}

export async function generateAiRound(
  topic: string,
  questionCount: number = 5,
  difficulty: string = 'medium'
): Promise<{ questions: Question[]; packTitle: string }> {
  try {
    const response = await fetchWithTimeout('/api/ai/generate-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, questionCount, difficulty })
    }, 10000);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate quiz round');
    }

    const data = await response.json();
    return {
      questions: data.questions,
      packTitle: data.packTitle
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Round generation timed out. Please try again.');
    }
    throw err;
  }
}

export async function generateSingleQuestionWithAI(
  topic: string,
  type: QuestionType = 'MCQ',
  difficulty: string = 'medium'
): Promise<Question> {
  try {
    const response = await fetchWithTimeout('/api/ai/generate-single-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, type, difficulty })
    }, 8000);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate question');
    }

    const data = await response.json();
    return data.question;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Question generation timed out. Please try again.');
    }
    throw err;
  }
}

export async function adjudicateAnswerWithAI(
  question: string,
  officialAnswer: string,
  playerAnswer: string
): Promise<{ isCorrect: boolean; confidence: number; verdict: string; reason: string }> {
  try {
    const response = await fetchWithTimeout('/api/ai/adjudicate-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, officialAnswer, playerAnswer })
    }, 8000);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to adjudicate answer');
    }

    const data = await response.json();
    return data.decision;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('AI Adjudication timed out. Please judge manually.');
    }
    throw err;
  }
}
