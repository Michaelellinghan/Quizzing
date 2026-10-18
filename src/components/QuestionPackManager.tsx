import React, { useState } from 'react';
import { QuizPack, Question } from '../types/quiz';
import { DEFAULT_QUIZ_PACKS } from '../data/defaultQuizPacks';
import { generateAiRound } from '../services/geminiService';
import {
  X,
  Plus,
  Sparkles,
  Upload,
  Download,
  Check,
  Image as ImageIcon,
  FolderOpen,
  Trash2,
  HelpCircle,
  FileText
} from 'lucide-react';

interface QuestionPackManagerProps {
  currentPackTitle: string;
  onSelectPack: (pack: QuizPack) => void;
  onClose: () => void;
}

export const QuestionPackManager: React.FC<QuestionPackManagerProps> = ({
  currentPackTitle,
  onSelectPack,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'packs' | 'custom' | 'json' | 'ai'>('packs');

  // Custom single question builder
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<'BUZZER' | 'MCQ' | 'TEXT'>('BUZZER');
  const [newQCategory, setNewQCategory] = useState('Custom Trivia');
  const [newQPoints, setNewQPoints] = useState(10);
  const [newQOptions, setNewQOptions] = useState('');
  const [newQAnswer, setNewQAnswer] = useState('');
  const [newQExplanation, setNewQExplanation] = useState('');
  const [newQMediaType, setNewQMediaType] = useState<'none' | 'image' | 'audio' | 'video'>('none');
  const [newQMediaUrl, setNewQMediaUrl] = useState('');

  // Bulk JSON state
  const [bulkJson, setBulkJson] = useState(JSON.stringify(DEFAULT_QUIZ_PACKS[0].questions, null, 2));
  const [bulkPackTitle, setBulkPackTitle] = useState('Imported Custom Pack');
  const [jsonError, setJsonError] = useState('');

  // AI Round Generator state
  const [aiTopic, setAiTopic] = useState('80s Rock & Synthpop');
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Temporary list of custom questions
  const [customList, setCustomList] = useState<Question[]>([]);

  // Add single question to custom list
  const handleAddQuestion = () => {
    if (!newQText.trim() || !newQAnswer.trim()) return;

    let optionsArr: string[] = [];
    if (newQType === 'MCQ') {
      optionsArr = newQOptions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (optionsArr.length === 0) {
        optionsArr = ['Option A', 'Option B', 'Option C', 'Option D'];
      }
    }

    const q: Question = {
      id: `custom_${Date.now()}`,
      type: newQType,
      category: newQCategory.trim() || 'General Trivia',
      question: newQText.trim(),
      options: optionsArr,
      answer: newQAnswer.trim(),
      points: Number(newQPoints) || 10,
      mediaType: newQMediaType,
      mediaUrl: newQMediaUrl.trim() || undefined,
      explanation: newQExplanation.trim() || undefined
    };

    setCustomList((prev) => [...prev, q]);
    setNewQText('');
    setNewQAnswer('');
    setNewQOptions('');
    setNewQExplanation('');
    setNewQMediaUrl('');
  };

  const handleLaunchCustomPack = () => {
    if (customList.length === 0) return;
    const pack: QuizPack = {
      id: `custom_pack_${Date.now()}`,
      title: 'Custom Created Question Pack',
      description: `${customList.length} user-created questions`,
      category: 'User Custom',
      questions: customList
    };
    onSelectPack(pack);
  };

  // Bulk JSON import
  const handleImportJson = () => {
    try {
      setJsonError('');
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setJsonError('JSON must be a non-empty array of question objects.');
        return;
      }
      const pack: QuizPack = {
        id: `imported_${Date.now()}`,
        title: bulkPackTitle.trim() || 'Imported Pack',
        description: `Imported with ${parsed.length} questions`,
        category: 'Imported',
        questions: parsed
      };
      onSelectPack(pack);
    } catch (err: any) {
      setJsonError(`Invalid JSON: ${err.message}`);
    }
  };

  // Generate with AI
  const handleGenerateAiRound = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiError('');

    try {
      const result = await generateAiRound(aiTopic, aiCount, aiDifficulty);
      const pack: QuizPack = {
        id: `ai_${Date.now()}`,
        title: result.packTitle,
        description: `AI-generated round on ${aiTopic}`,
        category: aiTopic,
        questions: result.questions
      };
      onSelectPack(pack);
    } catch (e: any) {
      setAiError(e.message || 'Failed to generate AI round');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl h-[92vh] max-h-[820px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white">
              Question Packs & Media Manager
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 text-xs font-bold gap-2">
          <button
            onClick={() => setActiveTab('packs')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'packs'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Built-in Rounds ({DEFAULT_QUIZ_PACKS.length})
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'custom'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Create Question
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-purple-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Generator
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'json'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            JSON Import / Export
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* TAB 1: BUILT-IN PACKS */}
          {activeTab === 'packs' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Choose from pre-loaded hilarious and high-energy quiz rounds:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DEFAULT_QUIZ_PACKS.map((pack) => {
                  const isActive = currentPackTitle === pack.title;

                  return (
                    <div
                      key={pack.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        isActive
                          ? 'bg-amber-950/30 border-amber-500 text-white shadow-md'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-amber-400">
                            {pack.category}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {pack.questions.length} questions
                          </span>
                        </div>
                        <h4 className="font-extrabold text-base text-white mt-1">
                          {pack.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {pack.description}
                        </p>
                      </div>

                      <button
                        onClick={() => onSelectPack(pack)}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                          isActive
                            ? 'bg-emerald-600 text-white cursor-default'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Active Pack
                          </>
                        ) : (
                          'Load This Pack'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE SINGLE QUESTION */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-white">Add Single Question</h4>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Question Prompt</label>
                <input
                  type="text"
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  placeholder="e.g. In which city was the world's first public railway opened?"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Type</label>
                  <select
                    value={newQType}
                    onChange={(e) => setNewQType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                  >
                    <option value="BUZZER">Buzzer Rush</option>
                    <option value="MCQ">Multiple Choice</option>
                    <option value="TEXT">Free-Text</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Category</label>
                  <input
                    type="text"
                    value={newQCategory}
                    onChange={(e) => setNewQCategory(e.target.value)}
                    placeholder="e.g. History"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                  >
                  </input>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Points</label>
                  <input
                    type="number"
                    value={newQPoints}
                    onChange={(e) => setNewQPoints(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>

              {/* Media Upload / URL */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Media Attachment (Optional)
                  </label>
                  <select
                    value={newQMediaType}
                    onChange={(e) => setNewQMediaType(e.target.value as any)}
                    className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-200"
                  >
                    <option value="none">No Media</option>
                    <option value="image">Image URL</option>
                  </select>
                </div>

                {newQMediaType === 'image' && (
                  <input
                    type="url"
                    value={newQMediaUrl}
                    onChange={(e) => setNewQMediaUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or direct image link"
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                )}
              </div>

              {newQType === 'MCQ' && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Multiple Choice Options (comma-separated, 4 options)
                  </label>
                  <input
                    type="text"
                    value={newQOptions}
                    onChange={(e) => setNewQOptions(e.target.value)}
                    placeholder="Sydney, Melbourne, Canberra, Perth"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Correct Answer</label>
                  <input
                    type="text"
                    value={newQAnswer}
                    onChange={(e) => setNewQAnswer(e.target.value)}
                    placeholder="e.g. Canberra"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Explanation / Host Note</label>
                  <input
                    type="text"
                    value={newQExplanation}
                    onChange={(e) => setNewQExplanation(e.target.value)}
                    placeholder="e.g. Capital was chosen as compromise in 1908"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleAddQuestion}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-4 h-4" /> Add Question to Set ({customList.length} staged)
              </button>

              {customList.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Staged Questions ({customList.length})
                    </span>
                    <button
                      onClick={handleLaunchCustomPack}
                      className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
                    >
                      Activate Staged Pack
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {customList.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-300"
                      >
                        <span className="truncate max-w-[80%] font-medium">
                          {idx + 1}. {item.question}
                        </span>
                        <span className="font-bold text-amber-400">{item.answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AI GENERATOR */}
          {activeTab === 'ai' && (
            <div className="space-y-5">
              <div>
                <h4 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" /> Generate Dynamic Quiz Round with Gemini
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Gemini will write an entertaining, broadcast-ready question set with fun facts and multiple choice options.
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Round Topic</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. 90s British Sitcoms, World Capitals, Marvel Cinematic Universe..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Number of Questions</label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                  >
                    <option value={3}>3 Questions (Quick Fire)</option>
                    <option value={5}>5 Questions (Standard)</option>
                    <option value={8}>8 Questions (Full Round)</option>
                    <option value={10}>10 Questions (Mastermind)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Difficulty</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                  >
                    <option value="easy">Casual / Family Friendly</option>
                    <option value="medium">Pub Quiz Standard</option>
                    <option value="hard">University Challenge Tough</option>
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
                onClick={handleGenerateAiRound}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
                {aiLoading ? 'Generating Round with Gemini...' : 'Generate & Load AI Round'}
              </button>
            </div>
          )}

          {/* TAB 4: JSON BULK IMPORT/EXPORT */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-white">JSON Question Pack</h4>
                  <p className="text-xs text-slate-400">Paste your question array below</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(bulkJson);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  Copy JSON
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Pack Title</label>
                <input
                  type="text"
                  value={bulkPackTitle}
                  onChange={(e) => setBulkPackTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>

              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                rows={10}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 font-mono text-xs focus:outline-none"
              />

              {jsonError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
                  {jsonError}
                </div>
              )}

              <button
                onClick={handleImportJson}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                <Upload className="w-4 h-4" /> Import and Activate Pack
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
