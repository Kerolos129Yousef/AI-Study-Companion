import { useQuery, useMutation } from '@tanstack/react-query';
import { flashcardService } from '../services';
import { sharingAPI } from '../services/api';
import { LoadingSpinner } from '../components/Common';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useState, useEffect } from 'react';
import { RotateCw, CheckCircle, XCircle, ArrowLeft, AlertCircle, Copy, Check } from 'lucide-react';
import type { Flashcard } from '../types';

export default function FlashcardReviewPage() {
  const navigate = useNavigate();
  const { lectureId } = useParams<{ lectureId?: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copyPending, setCopyPending] = useState(false);
  const [copied, setCopied] = useState(false);

  // If lectureId is provided, fetch flashcards for that lecture, otherwise fetch due flashcards
  const { data: flashcardsResponse, isLoading, error: flashcardsError } = useQuery({
    queryKey: lectureId ? ['flashcards', 'lecture', lectureId] : ['flashcards', 'due'],
    queryFn: () => (lectureId ? flashcardService.getFlashcards(lectureId) : flashcardService.getDueFlashcards()),
  });

  useEffect(() => {
    if (flashcardsError) {
      console.error('[FLASHCARDS] Error fetching flashcards:', flashcardsError);
      console.error('[FLASHCARDS] Error details:', (flashcardsError as any).response?.data);
    }
  }, [flashcardsError]);

  const flashcards: Flashcard[] = Array.isArray(flashcardsResponse?.data?.data) ? flashcardsResponse.data.data : [];

  // Reset currentIndex if out of bounds
  useEffect(() => {
    if (currentIndex >= flashcards.length && flashcards.length > 0) {
      setCurrentIndex(0);
    }
  }, [flashcards.length, currentIndex]);

  // Log empty array for debugging
  useEffect(() => {
    if (flashcards.length === 0 && !isLoading) {
      console.log('[FLASHCARDS] No flashcards returned. Full response:', JSON.stringify(flashcardsResponse, null, 2));
    }
  }, [flashcards, isLoading, flashcardsResponse]);

  const reviewMutation = useMutation({
    mutationFn: (ease: 'easy' | 'hard' | 'again') => {
      const currentFlashcard = flashcards[currentIndex];
      if (!currentFlashcard?.id) {
        return Promise.reject(new Error('No flashcard available'));
      }
      return flashcardService.reviewFlashcard(currentFlashcard.id, ease);
    },
    onSuccess: () => {
      setReviewed(reviewed + 1);
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        if (lectureId) {
          navigate(`/lectures/${lectureId}`);
        } else {
          navigate('/dashboard');
        }
      }
    },
  });

  const handleCopyShareLink = async () => {
    if (!lectureId) return;
    try {
      setCopyPending(true);

      let token = shareToken;
      if (!token) {
        // Check if a shared set already exists for this lecture
        const existingRes = await sharingAPI.getFlashcardSetForLecture(lectureId);
        const existing = existingRes.data?.data ?? existingRes.data;
        if (existing?.shareToken) {
          token = existing.shareToken;
          // Ensure it's public
          if (!existing.isPublic) {
            const toggled = await sharingAPI.toggleFlashcardPublic(existing.id);
            token = (toggled.data?.data ?? toggled.data).shareToken;
          }
        } else {
          // Create a new shared set from current flashcards
          const flashcardsRes = await flashcardService.getFlashcards(lectureId);
          const cards = flashcardsRes.data?.data || flashcardsRes.data || [];
          if (cards.length === 0) return;
          const createRes = await sharingAPI.createFlashcardSet(
            cards.map((f: any) => f.id),
            'Flashcard Set'
          );
          const created = createRes.data?.data ?? createRes.data;
          // Make it public
          const toggled = await sharingAPI.toggleFlashcardPublic(created.id);
          token = (toggled.data?.data ?? toggled.data).shareToken;
        }
        setShareToken(token);
      }

      const url = `${window.location.origin}/shared/flashcard/${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    } finally {
      setCopyPending(false);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(!isFlipped);
      }
      if (e.key === '1') reviewMutation.mutate('easy');
      if (e.key === '2') reviewMutation.mutate('hard');
      if (e.key === '3') reviewMutation.mutate('again');
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, currentIndex, flashcards, reviewMutation]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  // Error state
  if (flashcardsError) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-md mx-auto">
            <div className="bg-slate-900 border border-red-800 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Error Loading Flashcards</h2>
              <p className="text-slate-400 mb-6">
                {(flashcardsError as any)?.response?.data?.error || 'Failed to load flashcards. Please try again.'}
              </p>
              <button
                onClick={() => navigate(lectureId ? `/lectures/${lectureId}` : '/dashboard')}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
              >
                {lectureId ? 'Back to Lecture' : 'Back to Dashboard'}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Empty state
  if (!flashcards || flashcards.length === 0) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-md mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCw className="w-8 h-8 text-slate-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">No Flashcards {lectureId ? 'for this Lecture' : 'Due'}</h2>
              <p className="text-slate-400 mb-6">
                {lectureId
                  ? 'Generate flashcards from this lecture to start studying.'
                  : 'You have no flashcards due for review right now. Generate flashcards from a lecture to start studying.'}
              </p>
              <button
                onClick={() => navigate(lectureId ? `/lectures/${lectureId}` : '/courses')}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
              >
                {lectureId ? 'Back to Lecture' : 'Go to Courses'}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Safety check: ensure currentCard exists
  const currentCard = flashcards[currentIndex];
  if (!currentCard) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-md mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-slate-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Flashcard Not Found</h2>
              <p className="text-slate-400 mb-6">The flashcard you're trying to review is no longer available.</p>
              <button
                onClick={() => navigate(lectureId ? `/lectures/${lectureId}` : '/dashboard')}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
              >
                {lectureId ? 'Back to Lecture' : 'Back to Dashboard'}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const progress = ((reviewed + 1) / flashcards.length) * 100;

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => {
              if (lectureId) {
                navigate(`/lectures/${lectureId}`);
              } else {
                navigate(-1);
              }
            }}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h1 className="text-3xl font-bold text-white">
            {lectureId ? 'Lecture Flashcards' : 'Flashcard Review'}
          </h1>
          <div className="flex items-center gap-4">
            {lectureId && (
              <button
                onClick={handleCopyShareLink}
                disabled={copyPending}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {copied ? (
                  <><Check className="w-4 h-4" />Copied!</>
                ) : copyPending ? (
                  <><LoadingSpinner size="sm" />Preparing...</>
                ) : (
                  <><Copy className="w-4 h-4" />Copy Share Link</>
                )}
              </button>
            )}
            <div className="text-right">
              <p className="text-slate-400 text-sm">Card {currentIndex + 1} of {flashcards.length}</p>
              <p className="text-white font-semibold">{reviewed} reviewed</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-12 max-w-2xl mx-auto">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-slate-400 text-sm mt-2">{Math.round(progress)}% complete</p>
        </div>

        {/* Flashcard */}
        <div className="flex justify-center mb-12">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full max-w-2xl h-96 cursor-pointer perspective"
            style={{
              perspective: '1000px',
            }}
          >
            <div
              className="relative w-full h-full transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front */}
              <div
                className="absolute w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 flex flex-col items-center justify-center shadow-2xl"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <p className="text-slate-300 text-sm mb-4">Question</p>
                <p className="text-white text-3xl font-bold text-center">{currentCard.front}</p>
                <p className="text-slate-200 text-sm mt-8">Click to reveal answer</p>
              </div>

              {/* Back */}
              <div
                className="absolute w-full h-full bg-gradient-to-br from-pink-600 to-purple-600 rounded-2xl p-8 flex flex-col items-center justify-center shadow-2xl"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <p className="text-slate-300 text-sm mb-4">Answer</p>
                <p className="text-white text-3xl font-bold text-center">{currentCard.back}</p>
                <p className="text-slate-200 text-sm mt-8">Click to see question</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rating Buttons */}
        <div className="max-w-2xl mx-auto">
          <p className="text-slate-400 text-center mb-4 text-sm">How well did you know this?</p>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => reviewMutation.mutate('again')}
              disabled={reviewMutation.isPending}
              className="py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-5 h-5" />
              <span>Again (3)</span>
            </button>

            <button
              onClick={() => reviewMutation.mutate('hard')}
              disabled={reviewMutation.isPending}
              className="py-4 px-6 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCw className="w-5 h-5" />
              <span>Hard (2)</span>
            </button>

            <button
              onClick={() => reviewMutation.mutate('easy')}
              disabled={reviewMutation.isPending}
              className="py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Easy (1)</span>
            </button>
          </div>

          <p className="text-slate-500 text-center text-xs mt-4">
            Keyboard shortcuts: Space to flip, 1/2/3 for Easy/Hard/Again
          </p>
        </div>
      </div>

    </Layout>
  );
}
