import React, { useState } from 'react';
import { Question, QuestionType } from '../types/quiz';
import { generateSingleQuestionWithAI } from '../services/geminiService';
import {
  X,
  Plus,
  Sparkles,
  ListPlus,
  Trash2,
  Edit2,
  Check,
  Image as ImageIcon,
  HelpCircle,
  Zap,
  ArrowRight
} from 'lucide-react';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuestions: Question[];
  currentQIndex: number;
  onAddQuestion: (question: Question, insertAt?: number) => void;
  onEditQuestion: (index: number, question: Partial<Question>) => void;
  onDeleteQuestion: (index: number) => void;
  onJumpToQuestion: (index: number) => void;
}

export const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  isOpen,
  onClose,
  currentQuestions,
  currentQIndex,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onJumpToQuestion
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'ai' | 'list'>('create');

  // Manual Question Fields
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>('MCQ');
  const [qCategory, setQCategory] = useState('General Trivia');
  const [qPoints, setQPoints] = useState(10);
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qAnswer, setQAnswer] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qMediaType, setQMediaType] = useState<'none' | 'image'>('none');
  const [qMediaUrl, setQMediaUrl] = useState('');
  const [insertMode, setInsertMode] = useState<'end' | 'next'>('next');
  const [addedNotice, setAddedNotice] = useState(false);

  // AI Generator Fields
  const [aiTopic, setAiTopic] = useState('');
  const [aiType, setAiType] = useState<QuestionType>('MCQ');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGeneratedQ, setAiGeneratedQ] = useState<Question | null>(null);
  const [aiError, setAiError] = useState('');

  // Inline editing of existing questions
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editPoints, setEditPoints] = useState(10);

  if (!isOpen) return null;

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !qAnswer.trim()) return;

    let finalOptions: string[] = [];
    if (qType === 'MCQ') {
      finalOptions = qOptions.map((o) => o.trim()).filter(Boolean);
      if (finalOptions.length === 0) {
        finalOptions = ['Option A', 'Option B', 'Option C', 'Option D'];
      }
    }

    const newQuestion: Question = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: qType,
      category: qCategory.trim() || 'General Knowledge',
      question: qText.trim(),
      options: finalOptions,
      answer: qAnswer.trim(),
      points: Number(qPoints) || 10,
      mediaType: qMediaType,
      mediaUrl: qMediaUrl.trim() || undefined,
      explanation: qExplanation.trim() || undefined
    };

    const targetIndex = insertMode === 'next' ? currentQIndex + 1 : currentQuestions.length;
    onAddQuestion(newQuestion, targetIndex);

    // Reset & flash success
    setQText('');
    setQAnswer('');
    setQExplanation('');
    setQMediaUrl('');
    setQOptions(['', '', '', '']);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiGeneratedQ(null);

    try {
      const q = await generateSingleQuestionWithAI(aiTopic, aiType, aiDifficulty);
      setAiGeneratedQ(q);
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate question with AI');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptAiQuestion = () => {
    if (!aiGeneratedQ) return;
    const targetIndex = insertMode === 'next' ? currentQIndex + 1 : currentQuestions.length;
    onAddQuestion(aiGeneratedQ, targetIndex);
    setAiGeneratedQ(null);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  const startEditing = (idx: number, q: Question) => {
    setEditingIndex(idx);
    setEditPrompt(q.question);
    setEditAnswer(q.answer);
    setEditPoints(q.points);
  };

  const saveEditing = (idx: number) => {
    onEditQuestion(idx, {
      question: editPrompt.trim(),
      answer: editAnswer.trim(),
      points: Number(editPoints) || 10
    });
    setEditingIndex(null);
  };

  const CATEGORY_PRESETS = [
    'General Trivia',
    'Pop Culture',
    'Music',
    'Movies & TV',
    'Science & Nature',
    'History',
    'Geography',
    'Sports',
    'Tiebreaker'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl h-[92vh] max-h-[820px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Add More Questions</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400">
                  {currentQuestions.length} in round
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Add questions on the fly, generate with AI, or edit current questions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 text-xs font-bold gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Quick Add Question
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-purple-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Instant Generator
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" /> Manage Round Questions ({currentQuestions.length})
          </button>
        </div>

        {/* Success toast notification */}
        {addedNotice && (
          <div className="bg-emerald-950 border-b border-emerald-800 px-4 py-2 flex items-center justify-between text-xs font-bold text-emerald-300 animate-fade-in">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Question added to the live game!
            </span>
            <span className="text-[11px] text-emerald-400/80">Now {currentQuestions.length} questions</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* TAB 1: QUICK ADD QUESTION FORM */}
          {activeTab === 'create' && (
            <form onSubmit={handleManualAdd} className="space-y-4">
              
              {/* Question Placement Toggle */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Where to Insert Question?</div>
                  <div className="text-[11px] text-slate-400">Choose placement in the active quiz</div>
                </div>

                <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setInsertMode('next')}
                    className={`px-3 py-1 rounded-lg transition ${
                      insertMode === 'next'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Next (Q{currentQIndex + 2})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsertMode('end')}
                    className={`px-3 py-1 rounded-lg transition ${
                      insertMode === 'end'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    End (Q{currentQuestions.length + 1})
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Question Prompt *
                </label>
                <textarea
                  rows={2}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="e.g. In what year did Apollo 11 land on the Moon?"
                  required
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Type, Points, Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Format</label>
                  <select
                    value={qType}
                    onChange={(e) => setQType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value="MCQ">Multiple Choice (A/B/C/D)</option>
                    <option value="BUZZER">Buzzer Rush</option>
                    <option value="TEXT">Free-Text Input</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Points</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    step={5}
                    value={qPoints}
                    onChange={(e) => setQPoints(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Category</label>
                  <input
                    type="text"
                    value={qCategory}
                    onChange={(e) => setQCategory(e.target.value)}
                    placeholder="e.g. Space"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Quick Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                {CATEGORY_PRESETS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setQCategory(cat)}
                    className={`px-2 py-0.5 rounded-md border shrink-0 transition ${
                      qCategory === cat
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Multiple Choice Options */}
              {qType === 'MCQ' && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Multiple Choice Options</span>
                    <span className="text-[10px] text-slate-400">Option matching Correct Answer will be marked right</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {['A', 'B', 'C', 'D'].map((letter, idx) => (
                      <div key={letter} className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                          {letter}
                        </span>
                        <input
                          type="text"
                          value={qOptions[idx] || ''}
                          onChange={(e) => {
                            const copy = [...qOptions];
                            copy[idx] = e.target.value;
                            setQOptions(copy);
                          }}
                          placeholder={`Option ${letter}`}
                          className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer & Explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-emerald-400 block mb-1">
                    Correct Answer *
                  </label>
                  <input
                    type="text"
                    value={qAnswer}
                    onChange={(e) => setQAnswer(e.target.value)}
                    placeholder="e.g. 1969"
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-emerald-700/80 text-emerald-300 font-bold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Host Fun Fact / Syllable Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                    placeholder="e.g. Neil Armstrong stepped onto the lunar surface"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Media Clue (Image URL) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Media Clue (Optional Image)
                  </label>
                  <select
                    value={qMediaType}
                    onChange={(e) => setQMediaType(e.target.value as any)}
                    className="bg-slate-900 text-xs px-2 py-1 rounded text-slate-200 border border-slate-700"
                  >
                    <option value="none">No Image</option>
                    <option value="image">Attach Image URL</option>
                  </select>
                </div>

                {qMediaType === 'image' && (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={qMediaUrl}
                      onChange={(e) => setQMediaUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... or public image link"
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                    {qMediaUrl && (
                      <div className="w-full h-28 bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                        <img
                          src={qMediaUrl}
                          alt="Preview"
                          className="h-full object-contain mx-auto"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Plus className="w-4 h-4" /> Add Question to Active Quiz
              </button>
            </form>
          )}

          {/* TAB 2: AI INSTANT QUESTION GENERATOR */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" /> AI Instant Trivia Writer
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Type any prompt or theme and Gemini will instantly generate an authentic quiz question ready to drop into your live round.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  What kind of question do you want?
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Tough sudden-death tiebreaker on British history, or funny 80s movie quote"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Quick AI Prompt presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                {[
                  'Sudden Death Tiebreaker',
                  'Marvel Cinematic Universe',
                  'Premier League Football',
                  '90s Pop Music',
                  'Science & Space',
                  'Hilarious Bizarre Facts'
                ].map((promptText) => (
                  <button
                    key={promptText}
                    type="button"
                    onClick={() => setAiTopic(promptText)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-200 shrink-0 font-medium transition"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Question Type</label>
                  <select
                    value={aiType}
                    onChange={(e) => setAiType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                  >
                    <option value="MCQ">Multiple Choice (4 options)</option>
                    <option value="BUZZER">Buzzer Rush</option>
                    <option value="TEXT">Free-Text</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Difficulty</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                  >
                    <option value="easy">Casual / Family</option>
                    <option value="medium">Pub Quiz Standard</option>
                    <option value="hard">Mastermind Tough</option>
                  </select>
                </div>
              </div>

              {aiError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
                  {aiError}
                </div>
              )}

              <button
                disabled={aiLoading || !aiTopic.trim()}
                onClick={handleAiGenerate}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                {aiLoading ? 'Generating with Gemini...' : 'Generate Single Question'}
              </button>

              {/* Generated Question Preview Card */}
              {aiGeneratedQ && (
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-700/60 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-900 text-purple-200">
                      Generated Question
                    </span>
                    <span className="text-xs font-bold text-amber-400">
                      {aiGeneratedQ.points} Points
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white leading-snug">
                    {aiGeneratedQ.question}
                  </h4>

                  {aiGeneratedQ.options && aiGeneratedQ.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {aiGeneratedQ.options.map((opt, i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                          {String.fromCharCode(65 + i)}: {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold">
                    Answer: {aiGeneratedQ.answer}
                  </div>

                  {aiGeneratedQ.explanation && (
                    <div className="text-xs text-slate-400 italic">
                      💡 {aiGeneratedQ.explanation}
                    </div>
                  )}

                  <button
                    onClick={handleAcceptAiQuestion}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <Plus className="w-4 h-4" /> Add This Question to Active Quiz
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FULL QUESTION LIST & INLINE EDITOR */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Total Questions: {currentQuestions.length}</span>
                <span>Active Question: #{currentQIndex + 1}</span>
              </div>

              {currentQuestions.map((q, idx) => {
                const isCurrent = currentQIndex === idx;
                const isEditing = editingIndex === idx;

                return (
                  <div
                    key={q.id || idx}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-amber-950/30 border-amber-500/60 shadow-md'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Question Prompt</label>
                          <input
                            type="text"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Answer</label>
                            <input
                              type="text"
                              value={editAnswer}
                              onChange={(e) => setEditAnswer(e.target.value)}
                              className="w-full p-2 rounded-lg bg-slate-900 border border-emerald-700 text-emerald-300 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Points</label>
                            <input
                              type="number"
                              value={editPoints}
                              onChange={(e) => setEditPoints(Number(e.target.value))}
                              className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEditing(idx)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="py-1.5 px-3 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-mono font-black text-amber-400">
                              #{idx + 1}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                              {q.category}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300">
                              {q.type}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {q.points} Pts
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                                ACTIVE ON TV
                              </span>
                            )}
                          </div>

                          <div className="text-xs sm:text-sm font-bold text-white">
                            {q.question}
                          </div>

                          <div className="text-xs font-semibold text-emerald-400 mt-1">
                            Answer: {q.answer}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              onJumpToQuestion(idx);
                              onClose();
                            }}
                            title="Jump to this question on TV"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => startEditing(idx, q)}
                            title="Edit question"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={currentQuestions.length <= 1}
                            onClick={() => onDeleteQuestion(idx)}
                            title="Delete question"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
