import React, { useState, useEffect } from 'react';
import { Question, QuestionType, QuizPack } from '../types/quiz';
import { DEFAULT_QUIZ_PACKS } from '../data/defaultQuizPacks';
import { generateAiRound } from '../services/geminiService';
import {
  X,
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  HelpCircle,
  Zap,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  Save,
  Play,
  FileText,
  Copy,
  Upload,
  Download,
  Eye,
  Layers,
  CheckCircle2,
  Radio,
  Image as ImageIcon
} from 'lucide-react';

interface QuizStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuestions: Question[];
  currentPackTitle: string;
  onApplyQuestions: (questions: Question[], packTitle: string) => void;
}

const CATEGORY_PRESETS = [
  'General Knowledge',
  'Music & Bands',
  'Movies & TV',
  'Science & Nature',
  'History & Geography',
  'Pop Culture & Memes',
  'Sports & Games',
  'Inside Jokes & Family'
];

const LOCAL_STORAGE_KEY = 'quizcast_saved_custom_packs';

export const QuizStudioModal: React.FC<QuizStudioModalProps> = ({
  isOpen,
  onClose,
  currentQuestions,
  currentPackTitle,
  onApplyQuestions
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'paste' | 'ai' | 'saved' | 'builtin'>('write');

  // Active quiz working list
  const [quizTitle, setQuizTitle] = useState(currentPackTitle || 'My Custom Quiz');
  const [workingQuestions, setWorkingQuestions] = useState<Question[]>([]);

  // Manual Question Form fields
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>('TEXT');
  const [qCategory, setQCategory] = useState('General Knowledge');
  const [qPoints, setQPoints] = useState(10);
  const [qAnswer, setQAnswer] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qMediaUrl, setQMediaUrl] = useState('');
  const [qMediaType, setQMediaType] = useState<'none' | 'image'>('none');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Editing existing question
  const [editingId, setEditingId] = useState<string | null>(null);

  // Bulk Paste fields
  const [pasteText, setPasteText] = useState('');
  const [pasteCategory, setPasteCategory] = useState('Custom Trivia');
  const [pasteDefaultType, setPasteDefaultType] = useState<QuestionType>('TEXT');

  // AI Generator fields
  const [aiTopic, setAiTopic] = useState('80s & 90s Pop Culture');
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Saved Packs in LocalStorage
  const [savedPacks, setSavedPacks] = useState<QuizPack[]>([]);

  // Initialize working questions from current questions
  useEffect(() => {
    if (isOpen) {
      setWorkingQuestions(currentQuestions.length > 0 ? [...currentQuestions] : []);
      setQuizTitle(currentPackTitle || 'My Custom Quiz');
      loadSavedPacks();
    }
  }, [isOpen, currentQuestions, currentPackTitle]);

  const loadSavedPacks = () => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedPacks(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load saved packs from localStorage', e);
    }
    setSavedPacks([]);
  };

  const saveCurrentPackToStorage = (packToSave: QuizPack) => {
    try {
      const existing = savedPacks.filter((p) => p.id !== packToSave.id);
      const updated = [packToSave, ...existing];
      setSavedPacks(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      showToast(`Quiz "${packToSave.title}" saved to your library!`);
    } catch (e) {
      console.error('Failed to save pack to localStorage', e);
    }
  };

  const deleteSavedPack = (packId: string) => {
    const updated = savedPacks.filter((p) => p.id !== packId);
    setSavedPacks(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      showToast('Pack removed from your saved list.');
    } catch (e) {}
  };

  const showToast = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  if (!isOpen) return null;

  // Add or Update Question
  const handleSaveQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qText.trim() || !qAnswer.trim()) return;

    let finalOptions: string[] = [];
    if (qType === 'MCQ') {
      finalOptions = qOptions.map((o) => o.trim()).filter(Boolean);
      if (finalOptions.length === 0) {
        finalOptions = ['Option A', 'Option B', 'Option C', 'Option D'];
      }
      // Ensure answer is in options
      if (!finalOptions.includes(qAnswer.trim())) {
        finalOptions[0] = qAnswer.trim();
      }
    }

    if (editingId) {
      // Update existing
      setWorkingQuestions((prev) =>
        prev.map((q) =>
          q.id === editingId
            ? {
                ...q,
                type: qType,
                category: qCategory.trim() || 'General Knowledge',
                question: qText.trim(),
                options: finalOptions,
                answer: qAnswer.trim(),
                points: Number(qPoints) || 10,
                explanation: qExplanation.trim() || undefined,
                mediaType: qMediaType,
                mediaUrl: qMediaUrl.trim() || undefined
              }
            : q
        )
      );
      setEditingId(null);
      showToast('Question updated successfully!');
    } else {
      // Add new
      const newQ: Question = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: qType,
        category: qCategory.trim() || 'General Knowledge',
        question: qText.trim(),
        options: finalOptions,
        answer: qAnswer.trim(),
        points: Number(qPoints) || 10,
        explanation: qExplanation.trim() || undefined,
        mediaType: qMediaType,
        mediaUrl: qMediaUrl.trim() || undefined
      };
      setWorkingQuestions((prev) => [...prev, newQ]);
      showToast('Question added to your quiz!');
    }

    // Reset form
    setQText('');
    setQAnswer('');
    setQExplanation('');
    setQMediaUrl('');
    setQMediaType('none');
    setQOptions(['', '', '', '']);
  };

  const startEditQuestion = (q: Question) => {
    setEditingId(q.id);
    setQText(q.question);
    setQType(q.type);
    setQCategory(q.category);
    setQPoints(q.points);
    setQAnswer(q.answer);
    setQExplanation(q.explanation || '');
    setQMediaType(q.mediaType === 'image' ? 'image' : 'none');
    setQMediaUrl(q.mediaUrl || '');
    if (q.options && q.options.length > 0) {
      const opts = [...q.options];
      while (opts.length < 4) opts.push('');
      setQOptions(opts.slice(0, 4));
    } else {
      setQOptions(['', '', '', '']);
    }
    setActiveTab('write');
  };

  const removeQuestion = (id: string) => {
    setWorkingQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === workingQuestions.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...workingQuestions];
    const [removed] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, removed);
    setWorkingQuestions(copy);
  };

  // Smart Bulk Text Parser
  const handleParseBulkText = () => {
    if (!pasteText.trim()) return;

    const lines = pasteText.split('\n');
    const parsed: Question[] = [];
    let currentQText = '';
    let currentAns = '';
    let currentOpts: string[] = [];

    const flush = () => {
      if (currentQText && currentAns) {
        parsed.push({
          id: `bulk_${Date.now()}_${parsed.length}`,
          type: currentOpts.length >= 2 ? 'MCQ' : pasteDefaultType,
          category: pasteCategory || 'Imported Trivia',
          question: currentQText.trim(),
          options: currentOpts.length >= 2 ? currentOpts : undefined,
          answer: currentAns.trim(),
          points: 10
        });
      }
      currentQText = '';
      currentAns = '';
      currentOpts = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Format 1: Q: ... / A: ...
      if (/^(Q|Question|#|\d+[\.\)])\s*[:\.]?\s*(.+)/i.test(line)) {
        flush();
        const match = line.match(/^(?:Q|Question|#|\d+[\.\)])\s*[:\.]?\s*(.+)/i);
        currentQText = match ? match[1].trim() : line;
      } else if (/^(A|Answer)\s*[:\.]?\s*(.+)/i.test(line)) {
        const match = line.match(/^(?:A|Answer)\s*[:\.]?\s*(.+)/i);
        currentAns = match ? match[1].trim() : line;
      }
      // Format 2: Question | Answer
      else if (line.includes('|')) {
        flush();
        const parts = line.split('|');
        if (parts.length >= 2) {
          parsed.push({
            id: `bulk_${Date.now()}_${parsed.length}`,
            type: pasteDefaultType,
            category: parts[2]?.trim() || pasteCategory || 'General Knowledge',
            question: parts[0].trim(),
            answer: parts[1].trim(),
            points: 10
          });
        }
      }
      // Format 3: Question - Answer
      else if (line.includes(' - ') && !currentQText) {
        flush();
        const parts = line.split(' - ');
        if (parts.length >= 2) {
          parsed.push({
            id: `bulk_${Date.now()}_${parsed.length}`,
            type: pasteDefaultType,
            category: pasteCategory || 'General Knowledge',
            question: parts[0].trim(),
            answer: parts.slice(1).join(' - ').trim(),
            points: 10
          });
        }
      }
      // MCQ Options like A) Option A
      else if (/^[A-D][\.\)]\s*(.+)/i.test(line)) {
        const optMatch = line.match(/^[A-D][\.\)]\s*(.+)/i);
        if (optMatch) {
          currentOpts.push(optMatch[1].trim());
        }
      }
    }
    flush();

    if (parsed.length > 0) {
      setWorkingQuestions((prev) => [...prev, ...parsed]);
      setPasteText('');
      showToast(`Parsed and added ${parsed.length} questions to your quiz!`);
    } else {
      showToast('Could not find question/answer pairs. Use format: Q: Question? A: Answer');
    }
  };

  // Generate Questions with AI
  const handleGenerateAiRound = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiError('');

    try {
      const result = await generateAiRound(aiTopic, aiCount, aiDifficulty);
      if (result.questions && result.questions.length > 0) {
        setWorkingQuestions((prev) => [...prev, ...result.questions]);
        if (!quizTitle || quizTitle === 'My Custom Quiz') {
          setQuizTitle(result.packTitle);
        }
        showToast(`Generated and added ${result.questions.length} questions on "${aiTopic}"!`);
      }
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate questions. Check internet connection.');
    } finally {
      setAiLoading(false);
    }
  };

  // Apply to Live Game & Play Now
  const handlePlayNow = () => {
    if (workingQuestions.length === 0) {
      showToast('Please add at least 1 question before launching!');
      return;
    }
    const finalTitle = quizTitle.trim() || 'Custom Quiz Round';
    onApplyQuestions(workingQuestions, finalTitle);

    // Also auto-save to saved packs
    const packToSave: QuizPack = {
      id: `pack_${Date.now()}`,
      title: finalTitle,
      description: `${workingQuestions.length} questions • Created ${new Date().toLocaleDateString()}`,
      category: workingQuestions[0]?.category || 'Custom',
      questions: workingQuestions
    };
    saveCurrentPackToStorage(packToSave);
    onClose();
  };

  // Save Pack without closing
  const handleSaveToLibrary = () => {
    if (workingQuestions.length === 0) return;
    const finalTitle = quizTitle.trim() || 'Custom Quiz';
    const packToSave: QuizPack = {
      id: `pack_${Date.now()}`,
      title: finalTitle,
      description: `${workingQuestions.length} questions • Saved ${new Date().toLocaleDateString()}`,
      category: workingQuestions[0]?.category || 'Custom',
      questions: workingQuestions
    };
    saveCurrentPackToStorage(packToSave);
  };

  // Load a pack from library or built-in
  const handleLoadPack = (pack: QuizPack) => {
    setWorkingQuestions([...pack.questions]);
    setQuizTitle(pack.title);
    showToast(`Loaded "${pack.title}" (${pack.questions.length} questions)`);
    setActiveTab('write');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[94vh] max-h-[880px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* TOP BAR */}
        <header className="p-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Quiz Title (e.g. Dave's Birthday Pub Quiz)"
                  className="font-black text-lg sm:text-xl text-white bg-transparent border-b border-dashed border-slate-600 hover:border-amber-400 focus:border-amber-400 focus:outline-none px-1"
                />
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {workingQuestions.length} questions ready • Write questions, paste text, or use AI assist
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToLibrary}
              disabled={workingQuestions.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              title="Save to your browser library"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Save Quiz</span>
            </button>

            <button
              onClick={handlePlayNow}
              disabled={workingQuestions.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 shadow-lg transition cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch On TV & Play</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* NOTIFICATION BANNER */}
        {successBanner && (
          <div className="bg-emerald-950 border-b border-emerald-800 text-emerald-200 text-xs font-bold py-2 px-6 flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 sm:px-6 shrink-0 text-xs font-bold overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('write')}
              className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'write'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingId ? 'Edit Question' : 'Write Question'}</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Text / Quick Import</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'ai'
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-purple-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Co-Writer</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Saved Quizzes ({savedPacks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('builtin')}
              className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'builtin'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Default Rounds ({DEFAULT_QUIZ_PACKS.length})</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 hidden md:block">
            {workingQuestions.length} in this quiz
          </div>
        </div>

        {/* MAIN BODY: 2-COLUMN LAYOUT (Editor on left, Live Question List on right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* LEFT COLUMN: ACTIVE TAB TOOL (7 Columns) */}
          <div className="lg:col-span-7 p-4 sm:p-6 overflow-y-auto border-r border-slate-800 flex flex-col justify-between">
            
            {/* TAB 1: WRITE QUESTION FORM */}
            {activeTab === 'write' && (
              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    {editingId ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingId ? 'Edit Selected Question' : 'Write New Question'}
                  </span>

                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setQText('');
                        setQAnswer('');
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                {/* Question Prompt */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Question Text <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="e.g. Which British rock band released the 1975 anthem 'Bohemian Rhapsody'?"
                    className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:border-amber-400 placeholder-slate-500 shadow-inner resize-none"
                    required
                  />
                </div>

                {/* Question Type Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    How Players Answer:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setQType('TEXT')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        qType === 'TEXT'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">⌨️</span>
                      <span>Free Text Input</span>
                      <span className="text-[10px] text-slate-500 font-normal">Type on phone</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQType('MCQ')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        qType === 'MCQ'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">🔘</span>
                      <span>Multiple Choice</span>
                      <span className="text-[10px] text-slate-500 font-normal">A, B, C, D choices</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQType('BUZZER')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        qType === 'BUZZER'
                          ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">🚨</span>
                      <span>Buzzer Speed</span>
                      <span className="text-[10px] text-slate-500 font-normal">Fastest tap</span>
                    </button>
                  </div>
                </div>

                {/* Multiple Choice Options if MCQ */}
                {qType === 'MCQ' && (
                  <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>4 Options:</span>
                      <span className="text-amber-400 font-mono text-[11px]">Click radio to set as correct answer</span>
                    </div>

                    <div className="space-y-2">
                      {qOptions.map((opt, idx) => {
                        const isCorrect = qAnswer && opt.trim() === qAnswer.trim();
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (opt.trim()) setQAnswer(opt.trim());
                              }}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer ${
                                isCorrect
                                  ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                                  : 'border-slate-600 bg-slate-900 text-slate-400'
                              }`}
                              title="Mark as correct answer"
                            >
                              {isCorrect ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                            </button>

                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const copy = [...qOptions];
                                copy[idx] = e.target.value;
                                setQOptions(copy);
                                if (isCorrect) setQAnswer(e.target.value.trim());
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                              className={`flex-1 p-2 rounded-xl bg-slate-900 border text-xs font-bold text-white focus:outline-none ${
                                isCorrect
                                  ? 'border-emerald-500 text-emerald-200'
                                  : 'border-slate-700 focus:border-amber-400'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Correct Answer Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Correct Answer <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">Case-insensitive fuzzy match</span>
                  </div>
                  <input
                    type="text"
                    value={qAnswer}
                    onChange={(e) => setQAnswer(e.target.value)}
                    placeholder="e.g. Queen"
                    className="w-full p-3 rounded-xl bg-slate-950 border-2 border-emerald-500/60 text-emerald-300 font-extrabold text-sm focus:outline-none focus:border-emerald-400 shadow-inner"
                    required
                  />
                </div>

                {/* Category & Points in 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Category Tag
                    </label>
                    <input
                      type="text"
                      value={qCategory}
                      onChange={(e) => setQCategory(e.target.value)}
                      placeholder="e.g. British Rock"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {CATEGORY_PRESETS.slice(0, 4).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setQCategory(cat)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Points Awarded
                    </label>
                    <select
                      value={qPoints}
                      onChange={(e) => setQPoints(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                    >
                      <option value={10}>10 Points (Standard)</option>
                      <option value={20}>20 Points (Double)</option>
                      <option value={50}>50 Points (Jackpot)</option>
                      <option value={5}>5 Points (Speed Round)</option>
                    </select>
                  </div>
                </div>

                {/* Explanation / Fun Fact */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Fun Fact / Explanation <span className="text-slate-500">(Revealed after answer)</span>
                  </label>
                  <input
                    type="text"
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                    placeholder="e.g. Freddie Mercury composed the song in 1975 at his home in London."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Optional Media Image URL */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Optional Image Clue URL</span>
                    </label>
                    {qMediaUrl && (
                      <span className="text-[10px] text-emerald-400 font-bold">Image Attached</span>
                    )}
                  </div>
                  <input
                    type="url"
                    value={qMediaUrl}
                    onChange={(e) => {
                      setQMediaUrl(e.target.value);
                      setQMediaType(e.target.value.trim() ? 'image' : 'none');
                    }}
                    placeholder="https://images.unsplash.com/... (shows on TV screen)"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Submit Question Button */}
                <button
                  type="submit"
                  disabled={!qText.trim() || !qAnswer.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingId ? 'Save Changes to Question' : 'Add Question to Quiz'}</span>
                </button>
              </form>
            )}

            {/* TAB 2: PASTE TEXT / BULK IMPORT */}
            {activeTab === 'paste' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-extrabold text-sm text-white mb-1">
                    Paste Questions & Answers
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Paste a list of trivia questions from your notes or doc. We automatically extract the questions, answers, and choices!
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 font-mono space-y-1">
                  <div className="text-amber-400 font-bold">Supported Formats:</div>
                  <div>Q: What is the capital of France?</div>
                  <div>A: Paris</div>
                  <div className="text-slate-500">or: What is the largest ocean? | Pacific Ocean</div>
                  <div className="text-slate-500">or: 1. Who painted Mona Lisa? - Leonardo da Vinci</div>
                </div>

                <textarea
                  rows={9}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Q: What is the highest mountain on Earth?
A: Mount Everest

Q: In what year did Apollo 11 land on the moon?
A: 1969`}
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400 resize-none shadow-inner"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Default Category
                    </label>
                    <input
                      type="text"
                      value={pasteCategory}
                      onChange={(e) => setPasteCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Default Answering Style
                    </label>
                    <select
                      value={pasteDefaultType}
                      onChange={(e) => setPasteDefaultType(e.target.value as QuestionType)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    >
                      <option value="TEXT">Free Text (Typing)</option>
                      <option value="BUZZER">Buzzer Speed Tap</option>
                      <option value="MCQ">Multiple Choice</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleParseBulkText}
                  disabled={!pasteText.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Parse & Add All Questions</span>
                </button>
              </div>
            )}

            {/* TAB 3: AI CO-WRITER */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-extrabold text-sm text-white mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>AI Question Co-Writer</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Need inspiration? Enter any theme, pop culture topic, or inside joke topic and our AI will draft entertaining trivia questions for you to review and tweak!
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Topic or Theme
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. 90s Sitcoms, Marvel Superheroes, European Geography..."
                    className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-purple-400 shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Question Count
                    </label>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    >
                      <option value={3}>3 Questions</option>
                      <option value={5}>5 Questions (Recommended)</option>
                      <option value={8}>8 Questions</option>
                      <option value={10}>10 Questions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Difficulty Level
                    </label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    >
                      <option value="easy">Casual / Family Friendly</option>
                      <option value="medium">Standard Pub Quiz</option>
                      <option value="hard">Trivia Buff / Hard</option>
                    </select>
                  </div>
                </div>

                {aiError && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold">
                    ⚠️ {aiError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerateAiRound}
                  disabled={aiLoading || !aiTopic.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{aiLoading ? 'Generating Questions with AI...' : 'Generate & Add to Quiz'}</span>
                </button>
              </div>
            )}

            {/* TAB 4: SAVED CUSTOM PACKS */}
            {activeTab === 'saved' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Your Saved Quizzes</h4>
                    <p className="text-xs text-slate-400">Stored in your browser library</p>
                  </div>
                </div>

                {savedPacks.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                    No custom quizzes saved yet. Write some questions and click "Save Quiz"!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedPacks.map((pack) => (
                      <div
                        key={pack.id}
                        className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div>
                          <h5 className="font-extrabold text-sm text-white">{pack.title}</h5>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {pack.questions.length} questions • {pack.category}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadPack(pack)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition"
                          >
                            <Play className="w-3.5 h-3.5" /> Load
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteSavedPack(pack.id)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 transition"
                            title="Delete pack"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: BUILT-IN PACKS */}
            {activeTab === 'builtin' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Select a pre-built trivia pack to load or customize:
                </p>

                <div className="space-y-2.5">
                  {DEFAULT_QUIZ_PACKS.map((pack) => (
                    <div
                      key={pack.id}
                      className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-extrabold text-sm text-white">{pack.title}</div>
                        <div className="text-xs text-slate-400">{pack.description}</div>
                        <div className="text-[10px] text-amber-400 font-mono mt-1">
                          {pack.questions.length} questions • {pack.category}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLoadPack(pack)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 transition"
                      >
                        Load Pack
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: LIVE QUIZ QUESTIONS LIST & REORDERING (5 Columns) */}
          <div className="lg:col-span-5 bg-slate-950/70 p-4 sm:p-5 flex flex-col justify-between min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Questions in Quiz
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400">
                  {workingQuestions.length}
                </span>
              </div>

              {workingQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setWorkingQuestions([])}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Scrollable Questions List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
              {workingQuestions.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500 italic flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-slate-700" />
                  <span>No questions added yet.</span>
                  <span>Use the form on the left or paste a list!</span>
                </div>
              ) : (
                workingQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex flex-col gap-1.5 text-xs shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-slate-800 text-amber-400 font-black text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {q.type}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[100px]">
                          {q.category}
                        </span>
                      </div>

                      {/* Reorder and Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, 'down')}
                          disabled={idx === workingQuestions.length - 1}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditQuestion(q)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300"
                          title="Edit Question"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-rose-400"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="font-bold text-white text-xs leading-tight">
                      {q.question}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                      <span className="text-emerald-400 font-extrabold truncate max-w-[180px]">
                        ✓ {q.answer}
                      </span>
                      <span className="text-slate-400 font-mono">{q.points} pts</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Quick Launch Button */}
            <div className="mt-3 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={handlePlayNow}
                disabled={workingQuestions.length === 0}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Launch Quiz On TV ({workingQuestions.length} Qs)</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
