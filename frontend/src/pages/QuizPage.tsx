import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { quizService } from '../services';
import { LoadingSpinner } from '../components/Common';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock, BookOpen } from 'lucide-react';
import Layout from '../components/Layout';

export default function QuizPage() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const { data: quizResponse, isLoading, error: quizError } = useQuery({
    queryKey: ['quiz', lectureId],
    queryFn: () => quizService.generateQuiz(lectureId!),
  });

  const questions = quizResponse?.data || [];

  const submitMutation = useMutation({
    mutationFn: () => {
      const formattedAnswers = questions.map((q: any, idx: number) => ({
        question: q.question,
        options: q.options,
        correct: q.correct,
        userAnswer: answers[idx],
      }));
      return quizService.submitQuiz(lectureId!, formattedAnswers);
    },
    onSuccess: (response) => {
      navigate('/quiz/results/1', { state: response.data });
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (quizError) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Error Generating Quiz</h2>
              <p className="text-slate-400 mb-6">{(quizError as any).response?.data?.error || 'Please try again'}</p>
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Unable to Generate Quiz</h2>
              <p className="text-slate-400 mb-6">Please try again or generate a summary first</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentIndex];
  const allAnswered = Object.keys(answers).length === questions.length;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <Layout>
      <div className="p-8">
        {/* Header with progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-slate-400" />
            </button>
            <h1 className="text-3xl font-bold text-white">Quiz</h1>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Question {currentIndex + 1} of {questions.length}</p>
              <p className="text-white font-semibold">{allAnswered ? 'Complete' : 'In Progress'}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="max-w-4xl mx-auto">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-slate-400 text-sm mt-2">{Math.round(progress)}% complete</p>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-4xl mx-auto">
          {/* Question card */}
          <div className="bg-white rounded-xl p-8 mb-8 shadow-lg">
            <div className="mb-6">
              <div className="inline-block px-3 py-1 bg-blue-100 border border-blue-300 rounded-full mb-4">
                <p className="text-sm font-semibold text-blue-700">Question {currentIndex + 1} of {questions.length}</p>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{currentQuestion.question}</h2>
            </div>

            {/* Options - don't pass question to avoid duplication */}
            <div className="space-y-3">
              {currentQuestion.options.map((option: string, index: number) => {
                const letter = String.fromCharCode(65 + index); // A, B, C, D
                const isSelected = answers[currentIndex] === letter;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      setAnswers({ ...answers, [currentIndex]: letter });
                    }}
                    className={`w-full rounded-lg border-2 p-4 text-left transition-all font-medium ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-slate-900 shadow-md'
                        : 'border-slate-300 bg-white text-slate-900 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                     {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question indicator */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {questions.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                    idx === currentIndex
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : answers[idx]
                        ? 'bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {answers[idx] ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="flex-1 py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                disabled={!answers[currentIndex]}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => submitMutation.mutate()}
                disabled={!allAnswered || submitMutation.isPending}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Quiz
                  </>
                )}
              </button>
            )}
          </div>

          {/* Info message */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-300">
              {!allAnswered
                ? `Answer all questions to submit. ${questions.length - Object.keys(answers).length} remaining.`
                : 'All questions answered! Ready to submit.'}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
