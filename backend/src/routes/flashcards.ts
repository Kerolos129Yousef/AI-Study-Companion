import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { generateFlashcards } from '../services/claude.service.js';
import { calculateNextReview, initializeFlashcardScheduling } from '../services/spaced-repetition.service.js';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// Get all flashcards for user (no lectureId required)
router.get(
  '/user/all',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const flashcards = await prisma.flashcard.findMany({
      where: { userId: req.userId },
      include: {
        lecture: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with source metadata
    const enriched = flashcards.map(fc => ({
      ...fc,
      sourceLectureTitle: fc.lecture.title,
      sourceLectureCourse: fc.lecture.course?.title,
      sourceCreatedAt: fc.sourceCreatedAt || fc.createdAt,
    }));

    return sendSuccess(res, enriched);
  })
);

// Get flashcards for a lecture
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lectureId } = req.query;

    if (!lectureId) {
      return res.status(400).json({ error: 'lectureId is required' });
    }

    const flashcards = await prisma.flashcard.findMany({
      where: { lectureId: lectureId as string, userId: req.userId },
      include: {
        lecture: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Enrich with source metadata
    const enriched = flashcards.map(fc => ({
      ...fc,
      sourceLectureTitle: fc.lecture.title,
      sourceLectureCourse: fc.lecture.course?.title,
      sourceCreatedAt: fc.sourceCreatedAt || fc.createdAt,
    }));

    return sendSuccess(res, enriched);
  })
);

// Get due flashcards
router.get(
  '/due',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const now = new Date();

    const flashcards = await prisma.flashcard.findMany({
      where: {
        userId: req.userId,
        nextReview: { lte: now },
      },
      include: {
        lecture: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy: { nextReview: 'asc' },
    });

    // Enrich with source metadata
    const enriched = flashcards.map(fc => ({
      ...fc,
      sourceLectureTitle: fc.lecture.title,
      sourceLectureCourse: fc.lecture.course?.title,
      sourceCreatedAt: fc.sourceCreatedAt || fc.createdAt,
    }));

    return sendSuccess(res, enriched);
  })
);

// Generate flashcards via LLM from a lecture's summary.
// Requires summary to exist first (two-step pipeline: PDF → summary → flashcards).
// Each generated card is initialized with SM-2 scheduling defaults (interval=1, ease=2.5).
router.post(
  '/generate',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lectureId } = req.body;

    if (!lectureId) {
      return res.status(400).json({ error: 'lectureId is required' });
    }

    const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });

    if (!lecture || lecture.userId !== req.userId) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    if (!lecture.summary) {
      return res.status(400).json({ error: 'Please generate summary first' });
    }

    let summaryText = lecture.summary;
    try {
      const summaryObj = JSON.parse(lecture.summary);
      summaryText = summaryObj.summary || lecture.summary;
    } catch {
      // Summary is not JSON, using as-is
    }

    // Generate flashcards
    const generatedCards = await generateFlashcards(summaryText);

    // Initialize scheduling data
    const schedulingData = initializeFlashcardScheduling();

    // Save flashcards with source metadata
    const flashcards = await Promise.all(
      generatedCards.map((card) =>
        prisma.flashcard.create({
          data: {
            lectureId,
            userId: req.userId!,
            front: card.front,
            back: card.back,
            sourceLectureTitle: lecture.title,
            sourceCreatedAt: new Date(),
            nextReview: new Date(),
            interval: schedulingData.interval,
            ease: schedulingData.ease,
          },
        })
      )
    );

    return sendSuccess(res, flashcards, 201);
  })
);

// Review flashcard — applies SM-2 spaced repetition scheduling.
// "easy" lengthens interval (×2.5), "hard" shortens (×1.2), "again" resets to 10min.
router.patch(
  '/:id/review',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ease } = req.body;

    if (!['easy', 'hard', 'again'].includes(ease)) {
      return res.status(400).json({ error: 'Invalid ease value' });
    }

    const flashcard = await prisma.flashcard.findUnique({ where: { id: req.params.id } });

    if (!flashcard || flashcard.userId !== req.userId) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }

    const scheduling = calculateNextReview(ease, flashcard.interval, flashcard.ease);

    // Update flashcard with new scheduling data
    const updated = await prisma.flashcard.update({
      where: { id: req.params.id },
      data: {
        nextReview: scheduling.nextReview,
        interval: scheduling.interval,
        ease: scheduling.ease,
        reviewCount: flashcard.reviewCount + 1,
        lastReviewDate: new Date(),
      },
    });

    return sendSuccess(res, { nextReview: updated.nextReview, interval: updated.interval, ease: updated.ease });
  })
);

// Delete flashcard
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const flashcard = await prisma.flashcard.findUnique({ where: { id: req.params.id } });

    if (!flashcard || flashcard.userId !== req.userId) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }

    await prisma.flashcard.delete({ where: { id: req.params.id } });

    return sendSuccess(res, { success: true });
  })
);

export default router;
