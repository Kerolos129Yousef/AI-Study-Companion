import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lectureService, flashcardService, quizService, noteService } from '../services';
import { sharingAPI } from '../services/api';
import { LoadingSpinner } from '../components/Common';
import Layout from '../components/Layout';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Sparkles, Plus, Edit2, Trash2, Calendar, FileText,
  CreditCard, HelpCircle, Share2, ChevronDown, ChevronUp, Check, X, BookOpen, Info, AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { ShareModal } from '../components/ShareModal';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type SummaryData = {
  title: string;
  keyTopics?: string[];
  summary: string;
  importantTerms?: { term: string; definition: string }[];
};

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ message, type, onDone }: { message: string; type: 'success' | 'error'; onDone: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl shadow-black/50 animate-in slide-in-from-bottom-4">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
        {type === 'success'
          ? <Check className="w-3.5 h-3.5 text-emerald-400" />
          : <X className="w-3.5 h-3.5 text-red-400" />
        }
      </div>
      <p className={`text-sm ${type === 'success' ? 'text-white' : 'text-red-300'}`}>{message}</p>
      <button onClick={onDone} className="text-slate-500 hover:text-white transition-colors ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Quiz History Row ───────────────────────────────────────────────────── */
function QuizRow({ quiz }: { quiz: any }) {
  const [open, setOpen] = useState(false);
  const pct = quiz.percentage ?? Math.round((quiz.score / quiz.total) * 100);
  const color = pct >= 85 ? 'text-emerald-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="border border-slate-800/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-4 py-3 bg-slate-800/40 hover:bg-slate-800/70 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
          <HelpCircle className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">{pct}%</p>
          <p className="text-slate-500 text-xs">
            {quiz.score}/{quiz.total} correct · {new Date(quiz.takenAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`text-sm font-bold ${color}`}>{pct}%</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {open && quiz.questions && (
        <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-800/60 space-y-2">
          {quiz.questions.map((q: any, idx: number) => (
            <div key={q.id || idx} className={`rounded-lg p-3 ${q.isCorrect ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <div className="flex items-start gap-2">
                {q.isCorrect
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  : <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{idx + 1}. {q.question}</p>
                  <p className="text-xs text-slate-300 mt-1">
                    Your answer: <span className={q.isCorrect ? 'text-emerald-300 font-semibold' : 'text-red-300 font-semibold'}>{q.userAnswer}</span>
                  </p>
                  {!q.isCorrect && (
                    <p className="text-xs text-emerald-300 mt-0.5">
                      Correct: <span className="font-semibold">{q.correct}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function LectureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [flashcardsCount, setFlashcardsCount] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharedFlashcardSet, setSharedFlashcardSet] = useState<any>(null);
  const [sharedQuizSet, setSharedQuizSet] = useState<any>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareType, setShareType] = useState<'flashcard' | 'quiz'>('flashcard');

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  /* ─── Queries ─────────────────────────────────────────────────────────── */
  const { data: lecture, isLoading, error: lectureError } = useQuery({
    queryKey: ['lecture', id],
    queryFn: () => lectureService.getLecture(id!),
    enabled: !!id,
    select: (response) => {
      return Array.isArray(response.data) ? response.data[0] : (response.data?.data || response.data);
    },
  });

  const { data: notesData } = useQuery({
    queryKey: ['notes', id],
    queryFn: () => noteService.getNotes(id!),
    enabled: !!id,
    select: (response) => {
      const data = response.data;
      return Array.isArray(data) ? data : (data?.data || []);
    },
  });

  const { data: quizHistory } = useQuery({
    queryKey: ['quiz-history', id],
    queryFn: () => quizService.getLectureHistory(id!),
    enabled: !!id,
    select: (response) => {
      const data = response.data;
      return Array.isArray(data) ? data : (data?.data || []);
    },
  });

  /* ─── Summary parsing ─────────────────────────────────────────────────── */
  const parseSummaryData = (data: any): SummaryData | null => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (!parsed?.title || !parsed?.summary) return null;
      if (parsed.title.includes('Unable to generate')) return null;
      return {
        title: parsed.title || '',
        summary: typeof parsed.summary === 'string' ? parsed.summary : JSON.stringify(parsed.summary),
        keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
        importantTerms: Array.isArray(parsed.importantTerms) ? parsed.importantTerms : [],
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (lecture?.summary) {
      const parsed = parseSummaryData(lecture.summary);
      if (parsed) {
        setSummary(parsed);
        setSummaryError(null);
      }
    }
  }, [lecture]);

  /* ─── Mutations ───────────────────────────────────────────────────────── */
  const summaryMutation = useMutation({
    mutationFn: () => lectureService.getSummary(id!),
    onSuccess: (response) => {
      let summaryData = response.data;
      while (summaryData?.data && typeof summaryData.data === 'object' && !summaryData?.summary) {
        summaryData = summaryData.data;
      }
      const parsed = parseSummaryData(summaryData);
      if (parsed) {
        setSummary(parsed);
        setSummaryError(null);
        queryClient.setQueryData(['lecture', id], (oldData: any) => {
          if (!oldData) return oldData;
          const updated = { ...oldData };
          if (updated.data?.data) { updated.data.data.summary = JSON.stringify(parsed); }
          else if (updated.data) { updated.data.summary = JSON.stringify(parsed); }
          return updated;
        });
        showToast('success', 'Summary generated successfully!');
      } else {
        setSummaryError('Failed to parse summary response');
        showToast('error', 'Failed to parse summary response');
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || 'Failed to generate summary';
      setSummaryError(msg);
      showToast('error', msg);
    },
  });

  const generateFlashcardsMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('Lecture ID is required');
      return flashcardService.generateFlashcards(id);
    },
    onSuccess: (response) => {
      const count = response.data.data?.length || response.data?.length || 0;
      setFlashcardsCount(count);
      showToast('success', `${count} flashcards generated!`);
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.error || 'Failed to generate flashcards');
    },
  });

  const generateQuizMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('Lecture ID is required');
      return quizService.generateQuiz(id);
    },
    onSuccess: () => {
      navigate(`/quiz/${id}`);
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.error || 'Failed to generate quiz');
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (content: string) => noteService.createNote(id!, content),
    onSuccess: () => {
      setNoteContent('');
      queryClient.invalidateQueries({ queryKey: ['notes', id] });
      showToast('success', 'Note added!');
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.error || 'Failed to add note');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: (content: string) => noteService.updateNote(editingNoteId!, content),
    onSuccess: () => {
      setEditingNoteId(null);
      setEditingContent('');
      queryClient.invalidateQueries({ queryKey: ['notes', id] });
      showToast('success', 'Note updated!');
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.error || 'Failed to update note');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => noteService.deleteNote(noteId),
    onSuccess: () => {
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['notes', id] });
      showToast('success', 'Note deleted!');
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.error || 'Failed to delete note');
    },
  });

  /* ─── Share logic ─────────────────────────────────────────────────────── */
  const createSharedFlashcardSetMutation = useMutation({
    mutationFn: (flashcardIds: string[]) =>
      sharingAPI.createFlashcardSet(flashcardIds, `${lecture?.title} - Flashcards`),
    onSuccess: (response) => {
      setSharedFlashcardSet(response.data?.data || response.data);
      showToast('success', 'Shared set created!');
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.error || 'Failed to create shared set');
    },
  });

  const createSharedQuizSetMutation = useMutation({
    mutationFn: (quizIds: string[]) =>
      sharingAPI.createQuizSet(quizIds, `${lecture?.title} - Quiz`),
    onSuccess: (response) => {
      setSharedQuizSet(response.data?.data || response.data);
      showToast('success', 'Quiz share created!');
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.error || 'Failed to create quiz share');
    },
  });

  const shareFlashcardsMutation = useMutation({
    mutationFn: (userIds: string[]) => {
      if (!sharedFlashcardSet?.id) throw new Error('No shared set');
      return sharingAPI.shareFlashcardWith(sharedFlashcardSet.id, userIds);
    },
    onSuccess: () => showToast('success', 'Flashcards shared!'),
    onError: (error: any) => showToast('error', error.response?.data?.error || 'Failed to share'),
  });

  const shareQuizMutation = useMutation({
    mutationFn: (userIds: string[]) => {
      if (!sharedQuizSet?.id) throw new Error('No shared quiz');
      return sharingAPI.shareQuizWith(sharedQuizSet.id, userIds);
    },
    onSuccess: () => showToast('success', 'Quiz shared!'),
    onError: (error: any) => showToast('error', error.response?.data?.error || 'Failed to share'),
  });

  const togglePublicFlashcardsMutation = useMutation({
    mutationFn: () => {
      if (!sharedFlashcardSet?.id) throw new Error('No shared set');
      return sharingAPI.toggleFlashcardPublic(sharedFlashcardSet.id);
    },
    onSuccess: (response) => {
      const updated = response.data?.data || response.data;
      setSharedFlashcardSet(updated);
      showToast('success', `Set to ${updated.isPublic ? 'public' : 'private'}!`);
    },
    onError: (error: any) => showToast('error', error.response?.data?.error || 'Failed to toggle'),
  });

  const togglePublicQuizMutation = useMutation({
    mutationFn: () => {
      if (!sharedQuizSet?.id) throw new Error('No shared quiz');
      return sharingAPI.toggleQuizPublic(sharedQuizSet.id);
    },
    onSuccess: (response) => {
      const updated = response.data?.data || response.data;
      setSharedQuizSet(updated);
      showToast('success', `Set to ${updated.isPublic ? 'public' : 'private'}!`);
    },
    onError: (error: any) => showToast('error', error.response?.data?.error || 'Failed to toggle'),
  });

  const handleOpenShareModal = async (type: 'flashcard' | 'quiz') => {
    if (!id) return;

    // If we already have a shared set in state, skip creation and open the modal immediately
    if (type === 'flashcard' && sharedFlashcardSet) {
      setShareType('flashcard');
      setShowShareModal(true);
      return;
    }
    if (type === 'quiz' && sharedQuizSet) {
      setShareType('quiz');
      setShowShareModal(true);
      return;
    }

    try {
      setShareLoading(true);
      if (type === 'flashcard') {
        // Check if a shared set already exists for this lecture
        const existingRes = await sharingAPI.getFlashcardSetForLecture(id);
        const existing = existingRes.data?.data ?? existingRes.data;
        if (existing?.id) {
          setSharedFlashcardSet(existing);
          setShareType('flashcard');
          setShowShareModal(true);
          return;
        }
        // None exists — create one from the current flashcards
        const flashcardsRes = await flashcardService.getFlashcards(id);
        const flashcards = flashcardsRes.data?.data || flashcardsRes.data || [];
        if (flashcards.length === 0) { showToast('error', 'No flashcards to share. Generate first!'); return; }
        await createSharedFlashcardSetMutation.mutateAsync(flashcards.map((f: any) => f.id));
      } else {
        // Check if a shared set already exists for this lecture
        const existingRes = await sharingAPI.getQuizSetForLecture(id);
        const existing = existingRes.data?.data ?? existingRes.data;
        if (existing?.id) {
          setSharedQuizSet(existing);
          setShareType('quiz');
          setShowShareModal(true);
          return;
        }
        // None exists — create one from lecture-specific quiz history
        const quizzesRes = await quizService.getLectureHistory(id);
        const quizzes = quizzesRes.data?.data || quizzesRes.data || [];
        if (quizzes.length === 0) { showToast('error', 'No quizzes to share. Generate first!'); return; }
        await createSharedQuizSetMutation.mutateAsync(quizzes.map((q: any) => q.id));
      }
      setShowShareModal(true);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || error.message || 'Failed to prepare sharing');
    } finally {
      setShareLoading(false);
    }
  };

  /* ─── Render states ───────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (lectureError || !lecture) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Lecture not found</h2>
          <p className="text-slate-400 mb-6">This lecture may have been deleted or doesn't exist.</p>
          <button
            onClick={() => navigate('/lectures')}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
          >
            Back to Lectures
          </button>
        </div>
      </Layout>
    );
  }

  /* ─── JSX ─────────────────────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="px-8 py-6">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">
                {lecture.course?.title || 'Course'} · {new Date(lecture.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <h1 className="text-white font-bold text-xl leading-none">{lecture.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShareType('flashcard'); handleOpenShareModal('flashcard'); }}
              disabled={shareLoading || createSharedFlashcardSetMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-400 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl transition-all disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5" />
              {shareLoading && shareType === 'flashcard' ? 'Preparing...' : 'Share Flashcards'}
            </button>
            <button
              onClick={() => { setShareType('quiz'); handleOpenShareModal('quiz'); }}
              disabled={shareLoading || createSharedQuizSetMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-400 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-all disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5" />
              {shareLoading && shareType === 'quiz' ? 'Preparing...' : 'Share Quiz'}
            </button>
          </div>
        </div>

        <div className="flex gap-6 max-w-[1400px]">
          {/* ── Left column ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Summary card */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <h2 className="text-white font-semibold">AI Summary</h2>
                {summary && (
                  <span className="ml-auto text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full font-medium">Generated</span>
                )}
              </div>

              {summary ? (
                <div>
                  <h3 className="text-white font-semibold mb-3">{summary.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-5">{summary.summary}</p>

                  {summary.keyTopics && summary.keyTopics.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Key Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {summary.keyTopics.map((t) => (
                          <span key={t} className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-xs font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {summary.importantTerms && summary.importantTerms.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Important Terms</p>
                      <div className="space-y-2">
                        {summary.importantTerms.map((item) => (
                          <div key={item.term} className="flex gap-4 p-3.5 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 mt-1.5 shrink-0" />
                            <div>
                              <p className="text-white text-sm font-semibold mb-0.5">{item.term}</p>
                              <p className="text-slate-400 text-xs leading-relaxed">{item.definition}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {summaryError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-300">Error generating summary</p>
                        <p className="text-sm text-red-300/80 mt-1">{summaryError}</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => { setSummaryError(null); summaryMutation.mutate(); }}
                    disabled={summaryMutation.isPending}
                    className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {summaryMutation.isPending ? (
                      <><LoadingSpinner size="sm" /><span>Generating Summary...</span></>
                    ) : (
                      <><Sparkles className="w-5 h-5" /><span>Generate Summary</span></>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Actions card */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Actions</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => generateFlashcardsMutation.mutate()}
                  disabled={!summary || generateFlashcardsMutation.isPending}
                  className="flex flex-col items-center gap-2 py-4 px-3 bg-gradient-to-br from-pink-600/20 to-purple-600/20 border border-pink-500/20 hover:border-pink-500/40 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-md shadow-pink-900/30 group-hover:shadow-pink-900/50 transition-shadow">
                    {generateFlashcardsMutation.isPending
                      ? <LoadingSpinner size="sm" />
                      : <CreditCard className="w-4 h-4 text-white" />
                    }
                  </div>
                  <span className="text-xs font-semibold text-pink-300">
                    {generateFlashcardsMutation.isPending ? 'Generating...' : 'Generate Flashcards'}
                  </span>
                </button>

                <button
                  onClick={() => generateQuizMutation.mutate()}
                  disabled={!summary || generateQuizMutation.isPending}
                  className="flex flex-col items-center gap-2 py-4 px-3 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-900/30 group-hover:shadow-blue-900/50 transition-shadow">
                    {generateQuizMutation.isPending
                      ? <LoadingSpinner size="sm" />
                      : <HelpCircle className="w-4 h-4 text-white" />
                    }
                  </div>
                  <span className="text-xs font-semibold text-blue-300">
                    {generateQuizMutation.isPending ? 'Generating...' : 'Take Quiz'}
                  </span>
                </button>

                <button
                  onClick={() => navigate(`/lectures/${id}/review`)}
                  className="flex flex-col items-center gap-2 py-4 px-3 bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-md shadow-purple-900/30 group-hover:shadow-purple-900/50 transition-shadow">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-purple-300">Review Flashcards</span>
                </button>
              </div>

              {!summary && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-300">Generate a summary first to unlock flashcards and quiz</p>
                </div>
              )}

              {flashcardsCount > 0 && (
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300">{flashcardsCount} flashcards ready</p>
                </div>
              )}
            </div>

            {/* Lecture info */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Lecture Info</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="text-slate-400 text-sm">Created {new Date(lecture.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {lecture.fileName && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="text-slate-400 text-sm">{lecture.fileName}</span>
                  </div>
                )}
                {lecture.course?.title && (
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="text-slate-400 text-sm">{lecture.course.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quiz history */}
            {quizHistory && quizHistory.length > 0 && (
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quiz History</p>
                  <span className="text-xs text-slate-600">{quizHistory.length} attempt{quizHistory.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {quizHistory.map((quiz: any) => <QuizRow key={quiz.id} quiz={quiz} />)}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column: Notes ── */}
          <div className="w-[320px] shrink-0">
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 sticky top-24">
              <h2 className="text-white font-semibold mb-4">My Notes</h2>

              {/* Add note */}
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a new note…"
                rows={4}
                className="w-full px-3 py-3 bg-slate-800 border border-slate-700/80 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none mb-2.5"
              />
              <button
                onClick={() => { if (noteContent.trim()) createNoteMutation.mutate(noteContent); }}
                disabled={!noteContent.trim() || createNoteMutation.isPending}
                className="w-full py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-purple-900/20"
              >
                <Plus className="w-4 h-4" />
                {createNoteMutation.isPending ? 'Adding...' : 'Add Note'}
              </button>

              {/* Note list */}
              <div className="mt-5 space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {notesData && Array.isArray(notesData) && notesData.length > 0 ? (
                  notesData.map((note: any) => (
                    <div key={note.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 group">
                      {editingNoteId === note.id ? (
                        <>
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-2.5"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateNoteMutation.mutate(editingContent)}
                              disabled={updateNoteMutation.isPending}
                              className="flex-1 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {updateNoteMutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => { setEditingNoteId(null); setEditingContent(''); }}
                              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-white text-xs leading-relaxed mb-3">{note.content}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-600">
                              {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="flex gap-1.5 opacity-100 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingNoteId(note.id); setEditingContent(note.content); }}
                                className="text-slate-500 hover:text-blue-400 transition-colors p-1 rounded-lg hover:bg-blue-400/10"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(note.id)}
                                className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-400/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {deleteConfirmId === note.id && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                              <p className="text-xs text-red-300">Delete?</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => deleteNoteMutation.mutate(note.id)}
                                  disabled={deleteNoteMutation.isPending}
                                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                                >
                                  {deleteNoteMutation.isPending ? '...' : 'Yes'}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-600 text-sm">No notes yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        type={shareType}
        title={shareType === 'flashcard'
          ? `${lecture?.title || 'Lecture'} Flashcards`
          : `${lecture?.title || 'Lecture'} Quizzes`
        }
        shareToken={shareType === 'flashcard' ? sharedFlashcardSet?.shareToken : sharedQuizSet?.shareToken}
        isPublic={shareType === 'flashcard' ? (sharedFlashcardSet?.isPublic || false) : (sharedQuizSet?.isPublic || false)}
        sharedUsers={shareType === 'flashcard'
          ? (sharedFlashcardSet?.sharedWith?.map((s: any) => ({ id: s.userId, name: s.user?.name || 'Unknown', email: s.user?.email || '' })) || [])
          : (sharedQuizSet?.sharedWith?.map((s: any) => ({ id: s.userId, name: s.user?.name || 'Unknown', email: s.user?.email || '' })) || [])
        }
        onClose={() => setShowShareModal(false)}
        onShareWithUsers={async (userIds) =>
          shareType === 'flashcard' ? shareFlashcardsMutation.mutate(userIds) : shareQuizMutation.mutate(userIds)
        }
        onTogglePublic={async () =>
          shareType === 'flashcard' ? togglePublicFlashcardsMutation.mutate() : togglePublicQuizMutation.mutate()
        }
        isLoading={shareType === 'flashcard'
          ? (shareFlashcardsMutation.isPending || togglePublicFlashcardsMutation.isPending)
          : (shareQuizMutation.isPending || togglePublicQuizMutation.isPending)
        }
      />
    </Layout>
  );
}
