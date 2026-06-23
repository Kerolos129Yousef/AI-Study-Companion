import {
  calculateNextReview,
  calculateSchedulingStats,
  initializeFlashcardScheduling,
} from '../../services/spaced-repetition.service.js';

describe('spaced-repetition.service', () => {
  describe('initializeFlashcardScheduling', () => {
    it('returns default interval and ease values', () => {
      expect(initializeFlashcardScheduling()).toEqual({
        interval: 1.0,
        ease: 2.5,
      });
    });
  });

  describe('calculateNextReview', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('increases interval and ease when marked easy', () => {
      const result = calculateNextReview('easy', 2, 2.5);

      expect(result.interval).toBe(5);
      expect(result.ease).toBe(2.7);
      expect(result.nextReview.getTime()).toBeGreaterThan(Date.now());
    });

    it('slightly increases interval and decreases ease when marked hard', () => {
      const result = calculateNextReview('hard', 5, 2.5);

      expect(result.interval).toBe(6);
      expect(result.ease).toBe(2.3);
    });

    it('resets interval and ease when marked again', () => {
      const result = calculateNextReview('again', 10, 2.5);

      expect(result.interval).toBe(1);
      expect(result.ease).toBe(2.2);
      expect(result.nextReview).toBeInstanceOf(Date);
    });

    it('never lets ease drop below 1.3', () => {
      const result = calculateNextReview('again', 1, 1.3);

      expect(result.ease).toBe(1.3);
    });

    it('uses default interval and ease when not provided', () => {
      const result = calculateNextReview('easy');

      expect(result.interval).toBe(2.5);
      expect(result.ease).toBe(2.7);
    });

    it('handles hard review with default parameters', () => {
      const result = calculateNextReview('hard');

      expect(result.interval).toBe(1.2);
      expect(result.ease).toBe(2.3);
    });
  });

  describe('calculateSchedulingStats', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('counts flashcards due in each time window', () => {
      const now = new Date('2026-06-15T12:00:00Z');
      const flashcards = [
        { nextReview: new Date('2026-06-14T12:00:00Z') },
        { nextReview: new Date('2026-06-15T12:00:00Z') },
        { nextReview: new Date('2026-06-18T12:00:00Z') },
        { nextReview: new Date('2026-07-01T12:00:00Z') },
        { nextReview: new Date('2026-08-01T12:00:00Z') },
      ];

      const stats = calculateSchedulingStats(flashcards);

      expect(stats.totalFlashcards).toBe(5);
      expect(stats.dueToday).toBe(2);
      expect(stats.dueThisWeek).toBe(1);
      expect(stats.dueThisMonth).toBe(1);
    });

    it('returns zeros for an empty deck', () => {
      expect(calculateSchedulingStats([])).toEqual({
        totalFlashcards: 0,
        dueToday: 0,
        dueThisWeek: 0,
        dueThisMonth: 0,
      });
    });
  });
});
