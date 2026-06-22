export interface SchedulingResult {
  nextReview: Date;
  interval: number;
  ease: number;
}

export interface FlashcardSchedulingData {
  interval: number;
  ease: number;
  lastReviewDate?: Date;
}

// SM-2 spaced repetition algorithm: calculates next review date based on user's
// self-assessed difficulty. Ease factor adjusts the interval growth rate over time.
export function calculateNextReview(
  ease: 'easy' | 'hard' | 'again',
  currentInterval: number = 1.0,
  currentEase: number = 2.5
): SchedulingResult {
  const now = new Date();
  let daysToAdd = 1;
  let newEase = currentEase;
  let newInterval = currentInterval;

  if (ease === 'easy') {
    newInterval = currentInterval * 2.5;
    newEase = Math.max(1.3, currentEase + 0.2);
    daysToAdd = Math.ceil(newInterval);
  } else if (ease === 'hard') {
    newInterval = Math.max(1, currentInterval * 1.2);
    newEase = Math.max(1.3, currentEase - 0.2);
    daysToAdd = 1;
  } else if (ease === 'again') {
    // "Again" resets interval and schedules re-review in ~10 minutes
    newInterval = 1.0;
    newEase = Math.max(1.3, currentEase - 0.3);
    daysToAdd = 0.0069; // 10 minutes in days (10/1440)
  }

  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + daysToAdd);

  return {
    nextReview,
    interval: newInterval,
    ease: newEase,
  };
}

export function calculateSchedulingStats(flashcards: any[]): {
  totalFlashcards: number;
  dueToday: number;
  dueThisWeek: number;
  dueThisMonth: number;
} {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    totalFlashcards: flashcards.length,
    dueToday: flashcards.filter((card) => new Date(card.nextReview) <= now).length,
    dueThisWeek: flashcards.filter(
      (card) => new Date(card.nextReview) <= oneWeekFromNow && new Date(card.nextReview) > now
    ).length,
    dueThisMonth: flashcards.filter(
      (card) => new Date(card.nextReview) <= oneMonthFromNow && new Date(card.nextReview) > oneWeekFromNow
    ).length,
  };
}

export function initializeFlashcardScheduling(): FlashcardSchedulingData {
  return {
    interval: 1.0,
    ease: 2.5,
  };
}
