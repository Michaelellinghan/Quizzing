import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, QuizPack } from '../types/quiz';
import { DEFAULT_QUIZ_PACKS } from '../data/defaultQuizPacks';
import {
  generateAiRound,
  autocompleteQuestionWithAI,
  magicParseQuestionsWithAI
} from '../services/geminiService';
import {
  X,
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  Zap,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  Save,
  Play,
  FileText,
  Copy,
  Layers,
  CheckCircle2,
  BookOpen,
  Shuffle,
  RefreshCw,
  Search,
  Wand2,
  Download,
  Upload
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
  'Food & Drink',
  'Inside Jokes & Family'
];

const POPULAR_AI_TOPICS = [
  { label: '🍺 Pub Classics', topic: 'British Pub Quiz Classics & General Trivia' },
  { label: '🍿 Movie Night', topic: 'Iconic Movies, Blockbusters & Film Quotes' },
  { label: '🎵 80s & 90s Music', topic: '80s and 90s Pop, Rock and Chart Hits' },
  { label: '⚽ Football & Sports', topic: 'Football, Champions League & World Sports' },
  { label: '🌍 World Geography', topic: 'World Capitals, Flags, Landmarks & Geography' },
  { label: '🔬 Science & Space', topic: 'Space Exploration, Solar System & Science Wonders' },
  { label: '📺 TV & Sitcoms', topic: 'Classic TV Sitcoms, Drama & Comedy Series' },
  { label: '⚡ Sudden Death', topic: 'Number-based tough tiebreaker questions' },
  { label: '🎂 Birthday Roast', topic: 'Hilarious party trivia, aging milestones and fun facts' }
];

const READY_TEMPLATES: { title: string; category: string; description: string; questions: Question[] }[] = [
  {
    title: '🏆 The Ultimate Pub Quiz Round',
    category: 'Pub Trivia',
    description: '10 crowd-pleasing, authentic pub trivia questions covering music, history, film, and science.',
    questions: [
      {
        id: 'pub_1',
        type: 'MCQ',
        category: 'Music',
        question: 'Which band had the best-selling studio album in the UK with "Sgt. Pepper\'s Lonely Hearts Club Band"?',
        options: ['The Beatles', 'The Rolling Stones', 'Queen', 'Pink Floyd'],
        answer: 'The Beatles',
        points: 10,
        explanation: 'Released in 1967, it spent 27 weeks at number one on the UK Albums Chart.'
      },
      {
        id: 'pub_2',
        type: 'TEXT',
        category: 'Geography',
        question: 'What is the capital city of Australia?',
        answer: 'Canberra',
        points: 10,
        explanation: 'Canberra was selected as a compromise between Sydney and Melbourne in 1908.'
      },
      {
        id: 'pub_3',
        type: 'MCQ',
        category: 'Movies',
        question: 'What was the first feature-length animated movie released by Disney in 1937?',
        options: ['Snow White and the Seven Dwarfs', 'Pinocchio', 'Fantasia', 'Bambi'],
        answer: 'Snow White and the Seven Dwarfs',
        points: 10,
        explanation: 'It was known during production as "Disney\'s Folly" before becoming a colossal hit.'
      },
      {
        id: 'pub_4',
        type: 'BUZZER',
        category: 'History',
        question: 'In which year did the Titanic sink in the North Atlantic?',
        answer: '1912',
        points: 10,
        explanation: 'The RMS Titanic struck an iceberg late on April 14 and sank in the early hours of April 15, 1912.'
      },
      {
        id: 'pub_5',
        type: 'TEXT',
        category: 'Science',
        question: 'What is the chemical symbol for the element Gold?',
        answer: 'Au',
        points: 10,
        explanation: 'Au comes from the Latin word "aurum", meaning shining dawn.'
      },
      {
        id: 'pub_6',
        type: 'MCQ',
        category: 'Food & Drink',
        question: 'Which country is the birthplace of the cocktail known as the Mojito?',
        options: ['Cuba', 'Mexico', 'Spain', 'Puerto Rico'],
        answer: 'Cuba',
        points: 10,
        explanation: 'The cocktail originated in Havana, Cuba, and was famously enjoyed by Ernest Hemingway.'
      },
      {
        id: 'pub_7',
        type: 'TEXT',
        category: 'Sports',
        question: 'How many players are on the pitch for one team in a standard game of rugby union?',
        answer: '15',
        points: 10,
        explanation: 'Rugby Union has 15 players per side, whereas Rugby League has 13.'
      },
      {
        id: 'pub_8',
        type: 'MCQ',
        category: 'Pop Culture',
        question: 'In the sitcom Friends, what is Chandler Bing\'s middle name?',
        options: ['Muriel', 'Eustace', 'Francis', 'Nora'],
        answer: 'Muriel',
        points: 10,
        explanation: 'Chandler Muriel Bing is revealed in Season 7.'
      },
      {
        id: 'pub_9',
        type: 'TEXT',
        category: 'Nature',
        question: 'What is the largest living mammal on planet Earth?',
        answer: 'Blue Whale',
        points: 10,
        explanation: 'A blue whale can weigh up to 200 metric tonnes and measure up to 30 metres.'
      },
      {
        id: 'pub_10',
        type: 'BUZZER',
        category: 'Tiebreaker',
        question: 'How many bones are there in an adult human body?',
        answer: '206',
        points: 10,
        explanation: 'Infants are born with roughly 270 bones, many of which fuse together as they mature.'
      }
    ]
  },
  {
    title: '⚡ 5 Sudden Death Tiebreakers',
    category: 'Tiebreakers',
    description: '5 numerical questions perfect for deciding deadlocks and high-stakes buzzer rounds.',
    questions: [
      {
        id: 'tb_1',
        type: 'BUZZER',
        category: 'Tiebreaker',
        question: 'In what year was the first iPhone released by Apple?',
        answer: '2007',
        points: 10,
        explanation: 'Steve Jobs unveiled the iPhone on January 9, 2007, and it launched on June 29, 2007.'
      },
      {
        id: 'tb_2',
        type: 'BUZZER',
        category: 'Tiebreaker',
        question: 'How many miles are there in an official marathon (to the nearest whole mile)?',
        answer: '26',
        points: 10,
        explanation: 'The official distance is 26 miles and 385 yards (42.195 km).'
      },
      {
        id: 'tb_3',
        type: 'BUZZER',
        category: 'Tiebreaker',
        question: 'How many seconds does it take for light from the Sun to reach Earth?',
        answer: '500',
        points: 10,
        explanation: 'It takes approximately 8 minutes and 20 seconds, or roughly 499-500 seconds.'
      },
      {
        id: 'tb_4',
        type: 'BUZZER',
        category: 'Tiebreaker',
        question: 'In what year was the Eiffel Tower in Paris completed for the World\'s Fair?',
        answer: '1889',
        points: 10,
        explanation: 'It opened on March 31, 1889, as the entrance arch for the 1889 World\'s Fair.'
      },
      {
        id: 'tb_5',
        type: 'BUZZER',
        category: 'Tiebreaker',
        question: 'How many keys are on a standard full-size acoustic piano?',
        answer: '88',
        points: 10,
        explanation: 'A standard piano features 52 white keys and 36 black keys, totalling 88.'
      }
    ]
  }
];

const LOCAL_STORAGE_KEY = 'quizcast_saved_custom_packs';

export const QuizStudioModal: React.FC<QuizStudioModalProps> = ({
  isOpen,
  onClose,
  currentQuestions,
  currentPackTitle,
  onApplyQuestions
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'rapid' | 'paste' | 'templates' | 'saved' | 'builtin'>('ai');

  // Active quiz working list
  const [quizTitle, setQuizTitle] = useState(currentPackTitle || 'My Custom Quiz');
  const [workingQuestions, setWorkingQuestions] = useState<Question[]>([]);

  // Rapid 1-Line Entry state
  const [rapidText, setRapidText] = useState('');
  const rapidInputRef = useRef<HTMLInputElement>(null);

  // Manual Question Form fields
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>('TEXT');
  const [qCategory, setQCategory] = useState('General Knowledge');
  const [qPoints, setQPoints] = useState(10);
  const [qAnswer, setQAnswer] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [isAutocompleting, setIsAutocompleting] = useState(false);

  // Editing existing question
  const [editingId, setEditingId] = useState<string | null>(null);

  // Bulk Paste fields
  const [pasteText, setPasteText] = useState('');
  const [pasteCategory, setPasteCategory] = useState('Custom Trivia');
  const [pasteDefaultType, setPasteDefaultType] = useState<QuestionType>('TEXT');
  const [isMagicParsing, setIsMagicParsing] = useState(false);

  // AI Generator fields
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Search/Filter for working questions
  const [listSearch, setListSearch] = useState('');

  // Notifications
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  const saveCurrentPackToStorage = (packToSave: QuizPack) => {
    try {
      const existing = savedPacks.filter((p) => p.id !== packToSave.id);
      const updated = [packToSave, ...existing];
      setSavedPacks(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      showToast(`Quiz "${packToSave.title}" saved to your browser library!`);
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

  if (!isOpen) return null;

  // 1. RAPID 1-LINE SUBMISSION
  const handleRapidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = rapidText.trim();
    if (!raw) return;

    let question = raw;
    let answer = '';

    if (raw.includes('|')) {
      const parts = raw.split('|');
      question = parts[0].trim();
      answer = parts.slice(1).join('|').trim();
    } else if (raw.includes(' - ')) {
      const parts = raw.split(' - ');
      question = parts[0].trim();
      answer = parts.slice(1).join(' - ').trim();
    } else if (raw.includes('?')) {
      const qMarkIdx = raw.lastIndexOf('?');
      question = raw.substring(0, qMarkIdx + 1).trim();
      answer = raw.substring(qMarkIdx + 1).trim();
    }

    if (!answer) {
      // Default placeholder if only question was provided
      answer = 'Answer required';
    }

    const newQ: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'TEXT',
      category: 'Quick Fire',
      question,
      answer,
      points: 10
    };

    setWorkingQuestions((prev) => [...prev, newQ]);
    setRapidText('');
    showToast(`Added: "${question.slice(0, 32)}..."`);
    rapidInputRef.current?.focus();
  };

  // 2. AI AUTO-COMPLETE FOR GUIDED FORM
  const handleAutoFillWithAI = async () => {
    if (!qText.trim()) {
      showToast('Please type a question prompt first!');
      return;
    }
    setIsAutocompleting(true);
    try {
      const result = await autocompleteQuestionWithAI(qText.trim(), qCategory, qType);
      if (result.question) setQText(result.question);
      if (result.answer) setQAnswer(result.answer);
      if (result.category) setQCategory(result.category);
      if (result.explanation) setQExplanation(result.explanation);
      if (result.type) setQType(result.type);
      if (result.options && Array.isArray(result.options) && result.options.length > 0) {
        const padded = [...result.options];
        while (padded.length < 4) padded.push('');
        setQOptions(padded.slice(0, 4));
      }
      showToast('✨ AI auto-filled question details!');
    } catch (err: any) {
      showToast('Could not auto-fill. Please type answer manually.');
    } finally {
      setIsAutocompleting(false);
    }
  };

  // 3. MANUAL GUIDED QUESTION SAVE
  const handleSaveQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qText.trim() || !qAnswer.trim()) return;

    let finalOptions: string[] = [];
    if (qType === 'MCQ') {
      finalOptions = qOptions.map((o) => o.trim()).filter(Boolean);
      if (finalOptions.length === 0) {
        finalOptions = [qAnswer.trim(), 'Option B', 'Option C', 'Option D'];
      } else if (!finalOptions.includes(qAnswer.trim())) {
        finalOptions[0] = qAnswer.trim();
      }
    }

    if (editingId) {
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
                explanation: qExplanation.trim() || undefined
              }
            : q
        )
      );
      setEditingId(null);
      showToast('Question updated!');
    } else {
      const newQ: Question = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: qType,
        category: qCategory.trim() || 'General Knowledge',
        question: qText.trim(),
        options: finalOptions,
        answer: qAnswer.trim(),
        points: Number(qPoints) || 10,
        explanation: qExplanation.trim() || undefined
      };
      setWorkingQuestions((prev) => [...prev, newQ]);
      showToast('Question added to your quiz!');
    }

    // Reset form
    setQText('');
    setQAnswer('');
    setQExplanation('');
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
    if (q.options && q.options.length > 0) {
      const opts = [...q.options];
      while (opts.length < 4) opts.push('');
      setQOptions(opts.slice(0, 4));
    } else {
      setQOptions(['', '', '', '']);
    }
    setActiveTab('rapid');
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

  // 4. BULK TEXT MAGIC AI PARSE
  const handleMagicAiParse = async () => {
    if (!pasteText.trim()) return;
    setIsMagicParsing(true);
    try {
      const parsed = await magicParseQuestionsWithAI(pasteText, pasteCategory, pasteDefaultType);
      if (parsed && parsed.length > 0) {
        setWorkingQuestions((prev) => [...prev, ...parsed]);
        setPasteText('');
        showToast(`✨ Successfully imported ${parsed.length} questions!`);
      } else {
        handleLocalRegexParse();
      }
    } catch (err: any) {
      handleLocalRegexParse();
    } finally {
      setIsMagicParsing(false);
    }
  };

  // Fast Local Regex Parser fallback
  const handleLocalRegexParse = () => {
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

      if (/^(Q|Question|#|\d+[\.\)])\s*[:\.]?\s*(.+)/i.test(line)) {
        flush();
        const match = line.match(/^(?:Q|Question|#|\d+[\.\)])\s*[:\.]?\s*(.+)/i);
        currentQText = match ? match[1].trim() : line;
      } else if (/^(A|Answer)\s*[:\.]?\s*(.+)/i.test(line)) {
        const match = line.match(/^(?:A|Answer)\s*[:\.]?\s*(.+)/i);
        currentAns = match ? match[1].trim() : line;
      } else if (line.includes('|')) {
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
      } else if (line.includes('\t')) {
        flush();
        const parts = line.split('\t');
        if (parts.length >= 2) {
          parsed.push({
            id: `bulk_${Date.now()}_${parsed.length}`,
            type: pasteDefaultType,
            category: pasteCategory || 'General Knowledge',
            question: parts[0].trim(),
            answer: parts[1].trim(),
            points: 10
          });
        }
      } else if (line.includes(' - ') && !currentQText) {
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
      } else if (/^[A-D][\.\)]\s*(.+)/i.test(line)) {
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
      showToast('Could not find question/answer pairs. Use format: Question | Answer');
    }
  };

  const loadSamplePaste = () => {
    setPasteText(`What is the capital city of France? | Paris
Who directed the movie Jurassic Park? | Steven Spielberg
In what year was the first Moon landing? | 1969
What is the largest planet in our solar system? | Jupiter
Which element has the chemical symbol O? | Oxygen`);
  };

  // 5. 1-CLICK AI GENERATOR
  const handleGenerateAiRound = async (topicOverride?: string) => {
    const targetTopic = (topicOverride || aiTopic).trim();
    if (!targetTopic) {
      showToast('Please type a topic first!');
      return;
    }
    setAiLoading(true);
    setAiError('');

    try {
      const result = await generateAiRound(targetTopic, aiCount, aiDifficulty);
      if (result.questions && result.questions.length > 0) {
        setWorkingQuestions((prev) => [...prev, ...result.questions]);
        if (!quizTitle || quizTitle === 'My Custom Quiz') {
          setQuizTitle(result.packTitle);
        }
        showToast(`⚡ Generated ${result.questions.length} questions on "${targetTopic}"!`);
      }
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate questions. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // 6. APPLY TO LIVE GAME & PLAY NOW
  const handlePlayNow = () => {
    if (workingQuestions.length === 0) {
      showToast('Please add at least 1 question before launching!');
      return;
    }
    const finalTitle = quizTitle.trim() || 'Custom Quiz Round';
    onApplyQuestions(workingQuestions, finalTitle);

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

  // 7. TEMPLATE LOADER
  const handleLoadTemplate = (tpl: typeof READY_TEMPLATES[0]) => {
    setWorkingQuestions([...tpl.questions]);
    setQuizTitle(tpl.title);
    showToast(`Loaded template: "${tpl.title}"`);
  };

  // 8. SHUFFLE QUESTIONS
  const handleShuffle = () => {
    if (workingQuestions.length < 2) return;
    const shuffled = [...workingQuestions].sort(() => Math.random() - 0.5);
    setWorkingQuestions(shuffled);
    showToast('Questions reordered randomly!');
  };

  const filteredQuestions = workingQuestions.filter((q) => {
    if (!listSearch.trim()) return true;
    const s = listSearch.toLowerCase();
    return q.question.toLowerCase().includes(s) || q.answer.toLowerCase().includes(s) || q.category.toLowerCase().includes(s);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-[95vh] max-h-[920px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <header className="p-3.5 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Quiz Title (e.g. Saturday Night Pub Trivia)"
                  className="font-black text-base sm:text-xl text-white bg-transparent border-b border-dashed border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:outline-none px-1"
                />
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                <span className="font-bold text-amber-400">{workingQuestions.length} questions</span> in this quiz • Instant AI, 1-line rapid entry, or paste from notes
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (workingQuestions.length === 0) return;
                const pack: QuizPack = {
                  id: `pack_${Date.now()}`,
                  title: quizTitle.trim() || 'Custom Quiz',
                  description: `${workingQuestions.length} questions`,
                  category: workingQuestions[0]?.category || 'Custom',
                  questions: workingQuestions
                };
                saveCurrentPackToStorage(pack);
              }}
              disabled={workingQuestions.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              title="Save to your library"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Save</span>
            </button>

            <button
              onClick={handlePlayNow}
              disabled={workingQuestions.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-lg transition cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch On TV & Play Now</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* NOTIFICATION TOAST */}
        {successBanner && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 text-emerald-200 text-xs font-bold py-2 px-6 flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 sm:px-6 shrink-0 text-xs font-bold overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ai'
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-purple-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ 1-Click AI Quiz</span>
            </button>

            <button
              onClick={() => setActiveTab('rapid')}
              className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'rapid'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>✍️ Rapid & Custom Write</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'paste'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>📋 Paste Notes / CSV</span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'templates'
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>📚 Ready Templates</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'saved'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Saved ({savedPacks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('builtin')}
              className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'builtin'
                  ? 'border-indigo-400 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Celebrities (51)</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 hidden lg:block">
            {workingQuestions.length} questions in round
          </div>
        </div>

        {/* MAIN BODY: 2-COLUMN (Creation Tool on Left, Live Quiz List on Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* LEFT COLUMN: ACTIVE CREATION TOOL (7 Cols) */}
          <div className="lg:col-span-7 p-4 sm:p-6 overflow-y-auto border-r border-slate-800 flex flex-col justify-between space-y-5">
            
            {/* TAB 1: 1-CLICK AI GENERATOR */}
            {activeTab === 'ai' && (
              <div className="space-y-5">
                <div className="bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-800/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-purple-200 font-extrabold text-sm mb-1">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Instant AI Quiz Generator</span>
                  </div>
                  <p className="text-xs text-purple-300/80 leading-relaxed">
                    Name any subject, theme, or party topic and Gemini will write a complete, authentic trivia round with verified answers, multiple choice options, and host fun facts in seconds.
                  </p>
                </div>

                {/* Topic Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Quiz Topic or Theme
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGenerateAiRound();
                      }}
                      placeholder="e.g. 90s British Sitcoms, Marvel Superheroes, European Geography..."
                      className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:border-purple-400"
                    />
                    <button
                      disabled={aiLoading || !aiTopic.trim()}
                      onClick={() => handleGenerateAiRound()}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 transition"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{aiLoading ? 'Generating...' : 'Generate Round'}</span>
                    </button>
                  </div>
                </div>

                {/* Popular 1-Tap Topic Chips */}
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
                    <span>Popular 1-Tap Topics:</span>
                    <span className="text-[10px] text-purple-300">Click to fill & create</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_AI_TOPICS.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setAiTopic(item.topic);
                          handleGenerateAiRound(item.topic);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500 text-xs font-bold text-slate-300 hover:text-purple-200 transition cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Settings: Count & Difficulty */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Question Count
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[5, 10, 15].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setAiCount(cnt)}
                          className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                            aiCount === cnt
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {cnt} Qs
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Difficulty Level
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'easy', label: 'Casual' },
                        { id: 'medium', label: 'Pub' },
                        { id: 'hard', label: 'Tough' }
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setAiDifficulty(lvl.id)}
                          className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                            aiDifficulty === lvl.id
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {aiError && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
                    {aiError}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RAPID 1-LINE & GUIDED WRITER */}
            {activeTab === 'rapid' && (
              <div className="space-y-5">
                
                {/* 1. Lightning Rapid 1-Line Entry Bar */}
                <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-purple-500/15 border-2 border-amber-500/40 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span>Lightning 1-Line Entry</span>
                    </span>
                    <span className="text-[11px] text-amber-300/80 font-mono">
                      Format: Question | Answer
                    </span>
                  </div>

                  <form onSubmit={handleRapidSubmit} className="flex gap-2">
                    <input
                      ref={rapidInputRef}
                      type="text"
                      value={rapidText}
                      onChange={(e) => setRapidText(e.target.value)}
                      placeholder='e.g. What is the capital of Peru? | Lima (Press Enter)'
                      className="flex-1 p-3 rounded-xl bg-slate-950 border border-amber-500/40 text-white text-sm font-bold focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={!rapidText.trim()}
                      className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md cursor-pointer transition shrink-0"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Add</span>
                    </button>
                  </form>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Type question, type <code className="text-amber-400">|</code> or <code className="text-amber-400">-</code>, type answer, press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white text-[10px]">Enter</kbd>. Keep typing to build a 10-question quiz in 60 seconds!
                  </p>
                </div>

                {/* 2. Guided Form with AI Auto-Fill */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      {editingId ? <Edit2 className="w-3.5 h-3.5 text-amber-400" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{editingId ? 'Edit Selected Question' : 'Guided Detailed Builder (with Magic Auto-Fill)'}</span>
                    </span>

                    {editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setQText('');
                          setQAnswer('');
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  {/* Question Prompt with Auto-Fill Button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300">
                        Question Prompt <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoFillWithAI}
                        disabled={isAutocompleting || !qText.trim()}
                        className="text-xs font-extrabold text-amber-300 hover:text-amber-200 disabled:opacity-40 flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-lg cursor-pointer transition"
                        title="Gemini will auto-fill the answer, multiple choice options, category, and fun fact!"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>{isAutocompleting ? 'Auto-filling...' : '✨ Magic Auto-Fill'}</span>
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      placeholder="e.g. In what year did Neil Armstrong walk on the Moon?"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>

                  {/* Question Type Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'TEXT', label: '⌨️ Free Text', desc: 'Type on phone' },
                      { id: 'MCQ', label: '🔘 Multi-Choice', desc: '4 choices' },
                      { id: 'BUZZER', label: '🚨 Buzzer', desc: 'Speed tap' }
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setQType(fmt.id as any)}
                        className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-0.5 transition cursor-pointer ${
                          qType === fmt.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{fmt.label}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{fmt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Multiple Choice Options if MCQ */}
                  {qType === 'MCQ' && (
                    <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                        <span>Options A, B, C, D:</span>
                        <span className="text-amber-400 font-mono text-[10px]">Click circle to mark correct answer</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {qOptions.map((opt, idx) => {
                          const isCorrect = qAnswer && opt.trim() === qAnswer.trim();
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (opt.trim()) setQAnswer(opt.trim());
                                }}
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 cursor-pointer text-[10px] ${
                                  isCorrect
                                    ? 'border-emerald-400 bg-emerald-500 text-slate-950 font-black'
                                    : 'border-slate-600 bg-slate-800 text-slate-400'
                                }`}
                              >
                                {isCorrect ? '✓' : String.fromCharCode(65 + idx)}
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
                                className="flex-1 p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Answer & Category */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-emerald-400 block mb-1">
                        Correct Answer *
                      </label>
                      <input
                        type="text"
                        value={qAnswer}
                        onChange={(e) => setQAnswer(e.target.value)}
                        placeholder="e.g. 1969"
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-emerald-600 text-emerald-300 font-extrabold text-xs focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={qCategory}
                        onChange={(e) => setQCategory(e.target.value)}
                        placeholder="e.g. Space & History"
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Fun Fact / Explanation */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">
                      Host Fun Fact (Revealed after answer)
                    </label>
                    <input
                      type="text"
                      value={qExplanation}
                      onChange={(e) => setQExplanation(e.target.value)}
                      placeholder="e.g. Neil Armstrong famously stepped on the lunar surface on July 20, 1969"
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveQuestion()}
                    disabled={!qText.trim() || !qAnswer.trim()}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{editingId ? 'Save Changes' : 'Add Question to Quiz'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PASTE NOTES / CSV */}
            {activeTab === 'paste' && (
              <div className="space-y-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-extrabold text-blue-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Universal Paste / Import
                    </span>
                    <button
                      type="button"
                      onClick={loadSamplePaste}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Fill Sample Questions
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Paste raw text from Notes, Word, WhatsApp, email, or a spreadsheet. Click <strong className="text-purple-300">✨ Magic AI Parse</strong> to turn any unstructured text into clean questions, or use fast pattern parse for <code className="text-amber-400">Question | Answer</code>.
                  </p>
                </div>

                <div>
                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={`Paste here...\n\nExample formats:\nWhat is the capital of Japan? | Tokyo\n1. Who wrote Hamlet? - William Shakespeare\nQ: What is the highest mountain? A: Mount Everest`}
                    className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-blue-400 leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={isMagicParsing || !pasteText.trim()}
                    onClick={handleMagicAiParse}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isMagicParsing ? 'AI Parsing Your Text...' : '✨ Magic AI Parse & Clean'}</span>
                  </button>

                  <button
                    disabled={!pasteText.trim()}
                    onClick={handleLocalRegexParse}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition border border-slate-700"
                    title="Instant local regex parse"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Fast Parse</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: READY TEMPLATES */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" /> Pre-Made Quiz Templates
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Load a battle-tested ready round with 1 click. You can play it as-is or tweak questions to your liking.
                  </p>
                </div>

                <div className="space-y-3">
                  {READY_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.title}
                      className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 flex items-center justify-between gap-4 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm">{tpl.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {tpl.questions.length} Questions
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{tpl.description}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLoadTemplate(tpl)}
                        className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shrink-0 cursor-pointer transition shadow-md flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Load Round</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: SAVED QUIZZES */}
            {activeTab === 'saved' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-amber-400" /> Saved Quizzes in Your Browser
                  </h4>
                  <span className="text-xs text-slate-400">{savedPacks.length} saved</span>
                </div>

                {savedPacks.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                    No saved quizzes yet. Build a quiz and click "Save" in the top bar to keep it forever!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {savedPacks.map((pack) => (
                      <div
                        key={pack.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between gap-3 transition"
                      >
                        <div>
                          <div className="font-bold text-white text-sm">{pack.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {pack.questions.length} questions • {pack.description}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setWorkingQuestions([...pack.questions]);
                              setQuizTitle(pack.title);
                              showToast(`Loaded "${pack.title}"!`);
                            }}
                            className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer transition"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSavedPack(pack.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer transition"
                            title="Delete saved quiz"
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

            {/* TAB 6: 51 CELEBRITIES / DEFAULT PACKS */}
            {activeTab === 'builtin' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Choose from 51 celebrity appearances & standard rounds:</span>
                  <span className="font-mono text-purple-300">{DEFAULT_QUIZ_PACKS.length} available</span>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {DEFAULT_QUIZ_PACKS.map((pack) => (
                    <div
                      key={pack.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/60 flex items-center justify-between gap-3 transition"
                    >
                      <div>
                        <div className="font-bold text-white text-xs sm:text-sm">{pack.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {pack.questions.length} questions • {pack.category}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setWorkingQuestions([...pack.questions]);
                          setQuizTitle(pack.title);
                          showToast(`Loaded "${pack.title}"!`);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs cursor-pointer transition shrink-0"
                      >
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: LIVE QUIZ REVIEW & REORDER (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-950/80 p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
            
            {/* Header with Search and Shuffle */}
            <div className="space-y-2.5 shrink-0 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-white">Quiz Questions</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {workingQuestions.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleShuffle}
                    disabled={workingQuestions.length < 2}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Shuffle question order"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Clear all questions from this quiz?')) {
                        setWorkingQuestions([]);
                      }
                    }}
                    disabled={workingQuestions.length === 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 disabled:opacity-30 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    title="Clear list"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Search filter if more than 3 questions */}
              {workingQuestions.length > 3 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder="Filter questions..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </div>

            {/* Questions Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {filteredQuestions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-600" />
                  <p className="text-xs font-bold text-slate-400">Quiz is currently empty</p>
                  <p className="text-[11px] max-w-xs text-slate-500">
                    Use <strong>1-Click AI Quiz</strong>, type a question in <strong>Rapid Write</strong>, or <strong>Paste Text</strong> to get started.
                  </p>
                </div>
              ) : (
                filteredQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-amber-400">#{idx + 1}</span>
                        <span className="px-2 py-0.2 rounded-md bg-slate-800 text-slate-300 font-bold text-[10px]">
                          {q.category}
                        </span>
                        <span className="text-[10px] text-slate-400">{q.type}</span>
                      </div>

                      {/* Reorder and Edit Actions */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveQuestion(idx, 'up')}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300"
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === workingQuestions.length - 1}
                          onClick={() => moveQuestion(idx, 'down')}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300"
                          title="Move down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditQuestion(q)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-white leading-snug">
                      {q.question}
                    </div>

                    <div className="text-xs font-extrabold text-emerald-400">
                      Answer: {q.answer}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Play Now Bar */}
            <div className="shrink-0 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handlePlayNow}
                disabled={workingQuestions.length === 0}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-30 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play This Quiz on TV ({workingQuestions.length} Questions)</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
