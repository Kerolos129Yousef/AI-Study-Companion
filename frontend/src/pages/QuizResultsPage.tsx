import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Layout from '../components/Layout';
import { ArrowLeft, Trophy, Target, TrendingUp, CheckCircle, XCircle, Award, Share2 } from 'lucide-react';
import { ShareModal } from '../components/ShareModal';

export default function QuizResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const results = location.state;
  const [showShareModal, setShowShareModal] = useState(false);

  if (!results) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Results Available</h2>
              <p className="text-slate-400 mb-6">Please take a quiz first</p>
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

  // Determine performance level
  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { level: 'Excellent', color: 'from-green-600 to-emerald-600', icon: Trophy };
    if (percentage >= 80) return { level: 'Great', color: 'from-blue-600 to-cyan-600', icon: Award };
    if (percentage >= 70) return { level: 'Good', color: 'from-purple-600 to-pink-600', icon: TrendingUp };
    if (percentage >= 60) return { level: 'Fair', color: 'from-yellow-600 to-orange-600', icon: Target };
    return { level: 'Needs Improvement', color: 'from-red-600 to-pink-600', icon: Target };
  };

  const performance = getPerformanceLevel(results.percentage);
  const PerformanceIcon = performance.icon;

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </button>
            <h1 className="text-4xl font-bold text-white">Quiz Results</h1>
          </div>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Score Card */}
          <div className={`bg-gradient-to-br ${performance.color} rounded-xl p-8 text-white shadow-lg`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-semibold opacity-90 mb-2">Performance</p>
                <p className="text-5xl font-bold">{results.percentage}%</p>
              </div>
              <PerformanceIcon className="w-24 h-24 opacity-20" />
            </div>
            <p className="text-lg font-semibold">{performance.level}</p>
            <p className="text-sm opacity-90 mt-2">
              {results.score} out of {results.total} questions correct
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-400 text-sm font-semibold">Correct Answers</p>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">{results.score}</p>
              <p className="text-slate-400 text-sm mt-2">
                {Math.round((results.score / results.total) * 100)}% accuracy
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-400 text-sm font-semibold">Incorrect Answers</p>
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-3xl font-bold text-white">{results.total - results.score}</p>
              <p className="text-slate-400 text-sm mt-2">
                {Math.round(((results.total - results.score) / results.total) * 100)}% to improve
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-400 text-sm font-semibold">Total Questions</p>
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{results.total}</p>
              <p className="text-slate-400 text-sm mt-2">Quiz completed</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-white font-semibold mb-4">Score Breakdown</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Correct</span>
                <span className="text-white font-semibold">{results.score}/{results.total}</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-emerald-600 transition-all duration-500"
                  style={{ width: `${(results.score / results.total) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Question Breakdown</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.questions?.map((q: any, idx: number) => (
                <div
                  key={idx}
                  className={`rounded-lg p-4 border transition-all ${
                    q.isCorrect
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {q.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white mb-2">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="space-y-1 text-sm">
                        <p className={q.isCorrect ? 'text-green-300' : 'text-slate-300'}>
                          Your answer: <span className="font-semibold">{q.userAnswer}</span>
                        </p>
                        {!q.isCorrect && (
                          <p className="text-green-300">
                            Correct answer: <span className="font-semibold">{q.correct}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => navigate('/review')}
              className="py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Review Flashcards
            </button>
            <button
              onClick={() => navigate('/courses')}
              className="py-3 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              More Courses
            </button>
          </div>

          {/* Encouragement Message */}
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6">
            <p className="text-white text-center">
              {results.percentage >= 80
                ? '🎉 Excellent work! You\'ve mastered this material!'
                : results.percentage >= 60
                  ? '👏 Good effort! Review the incorrect answers to improve.'
                  : '💪 Keep practicing! Review the material and try again.'}
            </p>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        title="Quiz Results"
        type="quiz"
        onClose={() => setShowShareModal(false)}
      />
    </Layout>
  );
}
