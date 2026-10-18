import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/quiz';
import { sendGeminiChatMessage } from '../services/geminiService';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Scale,
  Mic,
  BookOpen,
  RotateCcw,
  Zap,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuestion?: string;
  currentAnswer?: string;
}

export const AIChatModal: React.FC<AIChatModalProps> = ({
  isOpen,
  onClose,
  currentQuestion,
  currentAnswer
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "👋 Welcome! I am your AI Quizmaster & Adjudicator. Ask me to settle contested answers, generate tiebreaker questions, or provide witty commentary on your game!",
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'adjudicator' | 'host' | 'factchecker'>('adjudicator');
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-4-argon' | 'gemini-3.1-flash-lite'>('gemini-3.1-flash-lite');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend.trim(),
      timestamp: Date.now()
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputText('');
    setLoading(true);

    try {
      // Build conversation payload
      const historyPayload = nextHistory.map((m) => ({
        role: m.role,
        text: m.text
      }));

      // Add context about current active question if relevant
      if (currentQuestion && currentAnswer) {
        historyPayload.unshift({
          role: 'user',
          text: `[Active Game Context: Current Question is "${currentQuestion}". Official Answer is "${currentAnswer}".]`
        }, {
          role: 'model',
          text: `Understood. I will keep this active question and answer in mind when adjudicating or generating questions.`
        });
      }

      const reply = await sendGeminiChatMessage({
        messages: historyPayload,
        role: selectedRole,
        model: selectedModel
      });

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: reply,
        timestamp: Date.now(),
        persona: selectedRole
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ Error: ${err.message || 'Failed to get AI response. Please ensure GEMINI_API_KEY is configured.'}`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        text: 'Chat history cleared. How can I help with your quiz?',
        timestamp: Date.now()
      }
    ]);
  };

  // Quick Action Chips
  const QUICK_PROMPTS = [
    {
      label: 'Judge Answer Dispute',
      prompt: `The official answer is "${currentAnswer || '---'}". A player answered something slightly different. Can you give a fair ruling on whether it should count as correct?`
    },
    {
      label: 'Create Tiebreaker Question',
      prompt: 'Generate a sudden-death numerical tiebreaker question with an exact number answer where the closest team wins!'
    },
    {
      label: 'Roast the Bottom Team',
      prompt: 'Give a witty, playful roast of the teams currently lagging at the bottom of the scoreboard in the style of a UK pub quizmaster.'
    },
    {
      label: 'Fun Trivia Fact',
      prompt: `Tell an intriguing, obscure fun fact related to "${currentAnswer || 'our quiz theme'}".`
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl h-[90vh] max-h-[760px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-tight flex items-center gap-2">
                <span>AI Quizmaster & Adjudicator</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700/60 text-purple-300">
                  Gemini
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Multi-turn real-time assistant for answer disputes, tiebreakers & banter
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              title="Clear conversation history"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              title="Close modal"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Persona & Model Selectors Bar */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Persona selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Role:</span>
            <button
              onClick={() => setSelectedRole('adjudicator')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                selectedRole === 'adjudicator'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scale className="w-3 h-3" /> Adjudicator
            </button>

            <button
              onClick={() => setSelectedRole('host')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                selectedRole === 'host'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3 h-3" /> TV Host
            </button>

            <button
              onClick={() => setSelectedRole('factchecker')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                selectedRole === 'factchecker'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3 h-3" /> Fact-Checker
            </button>
          </div>

          {/* Model selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-slate-300 font-mono text-[11px] focus:outline-none"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (General)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
              <option value="gemini-4-argon">gemini-4-argon (Complex)</option>
            </select>
          </div>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-300">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed relative group ${
                    isUser
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  
                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopyMessage(msg.id, msg.text)}
                    className="absolute top-2 right-2 p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 transition"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>

                  <div className={`text-[10px] mt-1.5 ${isUser ? 'text-amber-900/80' : 'text-slate-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/30 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span>Gemini is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          {QUICK_PROMPTS.map((chip, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => handleSendMessage(chip.prompt)}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white shrink-0 font-medium transition"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            disabled={loading}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask AI Adjudicator (e.g. 'Is Jude Law acceptable for Jude?')..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />

          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold transition shadow-md flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
