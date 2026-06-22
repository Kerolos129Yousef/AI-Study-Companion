import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sharingAPI } from '../services/api';
import { useAuthStore } from '../store/auth';
import { LoadingSpinner } from '../components/Common';
import Layout from '../components/Layout';
import { useState } from 'react';
import { ArrowLeft, Copy, Check, AlertCircle, ChevronRight, RotateCcw, LogIn } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct: string;
  topic?: string;
  lectureId: string;
  sourceLectureTitle?: string;
}

interface AttemptQuestion {
  id: string;
  question: string;
  options: string[];
  correct: string;
  userAnswer?: string;
  isCorrect: boolean;
  topic?: string;
}

interface MyAttempt {
  score: number;
  total: number;
  takenAt: string;
  questions: AttemptQuestion[];
}

interface SharedQuizData {
  id: string;
  title: string;
  description?: string;
  creator: { name: string; email: string };
  questions: Question[];
  myAttempt: MyAttempt | null;
  shareToken: string;
}

export default function SharedQuizViewPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [copied, setCopied] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; percentage: number; questions: AttemptQuestion[] } | null>(null);
  const [retaking, setRetaking] = useState(false);

  const { data: sharedSet, isLoading, error } = useQuery<SharedQuizData>({
    queryKey: ['shared-quiz', shareToken],
    queryFn: async () => {
      const response = await sharingAPI.getQuizSet(shareToken!);
      return response.data?.data || response.data;
    },
    enabled: !!shareToken,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const answers = (sharedSet!.questions || []).map((q, idx) => ({
        question: q.question,
        options: q.options,
        correct: q.correct,
        userAnswer: selectedAnswers[idx] ?? '',
        topic: q.topic,
        lectureId: q.lectureId,
      }));
      const lectureId = sharedSet!.questions[0]?.lectureId;
      const response = await sharingAPI.submitSharedQuiz(shareToken!, answers, lectureId);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setSubmitted(true);
      setRetaking(false);
      queryClient.invalidateQueries({ queryKey: ['shared-quiz', shareToken] });
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setResult(null);
    setRetaking(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error || !sharedSet) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900 border border-red-800 rounded-xl p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Error Loading Quiz</h2>
              <p className="text-slate-400 mb-6">
                {error instanceof Error ? error.message : 'This quiz set does not exist or is not accessible.'}
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const questions = sharedSet.questions || [];
  const hasAttempt = !!sharedSet.myAttempt && !retaking;
  const displayResult = result || (hasAttempt ? {
    score: sharedSet.myAttempt!.score,
    total: sharedSet.myAttempt!.total,
    percentage: Math.round((sharedSet.myAttempt!.score / sharedSet.myAttempt!.total) * 100),
    questions: sharedSet.myAttempt!.questions,
  } : null);

  const showResults = (submitted || hasAttempt) && displayResult;
  const allAnswered = questions.length > 0 && questions.every((_, idx) => selectedAnswers[idx] !== undefined);

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </button>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-white truncate">{sharedSet.title}</h1>
              {sharedSet.creator && (
                <p className="text-slate-400 text-sm mt-1">
                  Shared by {sharedSet.creator.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex-shrink-0"
          >
            {copied ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy Link</>}
          </button>
        </div>

        {sharedSet.description && (
          <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <p className="text-slate-300">{sharedSet.description}</p>
          </div>
        )}

        {questions.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-lg">
            <p className="text-slate-400">No questions available in this quiz set.</p>
          </div>
        ) : showResults && displayResult ? (
          /* Results view */
          <div className="space-y-6">
            {/* Score card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-400 mb-2">Your Score</p>
              <p className="text-6xl font-bold text-white mb-1">
                {displayResult.score}/{displayResult.total}
              </p>
              <p className={`text-3xl font-bold mb-4 ${
                displayResult.percentage >= 80 ? 'text-emerald-400' :
                displayResult.percentage >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {displayResult.percentage}%
              </p>
              {hasAttempt && sharedSet.myAttempt && (
                <p className="text-slate-500 text-sm mb-4">
                  Taken on {new Date(sharedSet.myAttempt.takenAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              <button
                onClick={handleRetake}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retake Quiz
              </button>
            </div>

            {/* Question review */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Review</h2>
              {displayResult.questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className={`bg-slate-900 border rounded-xl p-6 ${q.isCorrect ? 'border-emerald-700/50' : 'border-red-700/50'}`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 mt-0.5 ${q.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {q.isCorrect ? '✓' : '✗'}
                    </span>
                    <p className="text-white font-medium">{q.question}</p>
                  </div>
                  <div className="space-y-2 ml-8">
                    {q.options.map((opt) => {
                      const isCorrect = opt === q.correct;
                      const isChosen = opt === q.userAnswer;
                      return (
                        <div
                          key={opt}
                          className={`px-4 py-2 rounded-lg text-sm ${
                            isCorrect
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-600/40'
                              : isChosen
                              ? 'bg-red-500/20 text-red-300 border border-red-600/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {opt}
                          {isCorrect && ' ✓'}
                          {isChosen && !isCorrect && ' (your answer)'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Quiz-taking view */
          <div className="space-y-6">
            <p className="text-slate-400">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
            {questions.map((q, idx) => (
              <div key={q.id || idx} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-slate-500 text-sm font-semibold flex-shrink-0 mt-0.5">Q{idx + 1}</span>
                  <div>
                    <p className="text-white font-medium">{q.question}</p>
                    {q.topic && <p className="text-slate-500 text-xs mt-1">{q.topic}</p>}
                  </div>
                </div>
                <div className="space-y-2 ml-8">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSelectedAnswers((prev) => ({ ...prev, [idx]: opt }))}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                        selectedAnswers[idx] === opt
                          ? 'bg-purple-600/30 border border-purple-500 text-white'
                          : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <p className="text-slate-500 text-sm">
                {Object.keys(selectedAnswers).length}/{questions.length} answered
              </p>
              {isAuthenticated ? (
                <button
                  onClick={() => submitMutation.mutate()}
                  disabled={!allAnswered || submitMutation.isPending}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>Submit Quiz <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in to submit
                </button>
              )}
            </div>

            {submitMutation.isError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">
                  {(submitMutation.error as any)?.response?.data?.error || 'Failed to submit quiz. Please try again.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
