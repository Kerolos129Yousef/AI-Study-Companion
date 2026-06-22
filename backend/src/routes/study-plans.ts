import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { generateStudyPlan, StudyPlanContext } from '../services/claude.service.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Get the user's current study plan
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const plan = await prisma.studyPlan.findUnique({
      where: { userId: req.userId! },
    });

    if (!plan) {
      return res.status(404).json({ error: 'No study plan found' });
    }

    res.json({
      id: plan.id,
      examDate: plan.examDate,
      plan: plan.plan,
      dailyGoals: JSON.parse(plan.dailyGoals),
      selectedLectures: JSON.parse(plan.selectedLectures),
      generatedAt: plan.generatedAt,
      updatedAt: plan.updatedAt,
    });
  })
);

// Generate personalized study plan via LLM.
// Aggregates user's full learning context (courses, lectures, flashcard due counts, quiz scores,
// weak topics) and sends it to the AI to produce a prioritized daily study schedule.
// Upserts — each user has at most one active plan; regeneration replaces the previous one.
router.post(
  '/generate',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { examDate, lectureIds } = req.body;

    if (!examDate) {
      return res.status(400).json({ error: 'examDate is required' });
    }

    const userId = req.userId!;
    const now = new Date();
    const exam = new Date(examDate);
    const daysUntilExam = Math.max(1, Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Resolve selected lecture titles for display after save
    const selectedLectureTitles: string[] = [];
    if (Array.isArray(lectureIds) && lectureIds.length > 0) {
      const selectedLectureRows = await prisma.lecture.findMany({
        where: { userId, id: { in: lectureIds as string[] } },
        select: { title: true },
      });
      selectedLectureTitles.push(...selectedLectureRows.map((l) => l.title));
    }

    // Scope lecture-level queries to selected lectures if provided
    const lectureFilter = Array.isArray(lectureIds) && lectureIds.length > 0
      ? { userId, id: { in: lectureIds as string[] } }
      : { userId };

    const flashcardFilter = Array.isArray(lectureIds) && lectureIds.length > 0
      ? { userId, lectureId: { in: lectureIds as string[] } }
      : { userId };

    const quizFilter = Array.isArray(lectureIds) && lectureIds.length > 0
      ? { userId, lectureId: { in: lectureIds as string[] } }
      : { userId };

    // Gather full context in parallel
    const [courses, lectures, flashcardStats, quizzes] = await Promise.all([
      prisma.course.findMany({
        where: { userId },
        select: { title: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lecture.findMany({
        where: lectureFilter,
        select: { title: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.flashcard.aggregate({
        where: flashcardFilter,
        _count: { id: true },
      }),
      prisma.quiz.findMany({
        where: quizFilter,
        select: { id: true, score: true, total: true },
      }),
    ]);

    // QuizQuestion has no lectureId — scope via quiz ids when lectures are filtered
    const hasLectureFilter = Array.isArray(lectureIds) && lectureIds.length > 0;
    const quizIds = quizzes.map((q) => q.id);
    const quizQuestions = await prisma.quizQuestion.findMany({
      where: hasLectureFilter
        ? (quizIds.length > 0 ? { userId, quizId: { in: quizIds } } : { userId: '__none__' })
        : { userId },
      select: { topic: true, isCorrect: true },
    });

    const flashcardsDueToday = await prisma.flashcard.count({
      where: { ...flashcardFilter, nextReview: { lte: now } },
    });

    // Calculate avg quiz score
    const avgQuizScore = quizzes.length > 0
      ? Math.round(quizzes.reduce((sum, q) => sum + (q.score / q.total) * 100, 0) / quizzes.length)
      : 0;

    // Calculate weak areas by topic: aggregates quiz question results to find
    // the lowest-scoring topics, which the AI study plan will prioritize.
    const topicMap: Record<string, { correct: number; total: number }> = {};
    for (const q of quizQuestions) {
      const topic = q.topic || 'General';
      if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
      topicMap[topic].total++;
      if (q.isCorrect) topicMap[topic].correct++;
    }
    const weakAreas = Object.entries(topicMap)
      .map(([topic, perf]) => ({ topic, percentage: Math.round((perf.correct / perf.total) * 100) }))
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 5);

    const context: StudyPlanContext = {
      examDate,
      daysUntilExam,
      courseCount: courses.length,
      courseTitles: courses.map((c) => c.title),
      lectureCount: lectures.length,
      lectureTitles: lectures.map((l) => l.title),
      totalFlashcards: flashcardStats._count.id,
      flashcardsDueToday,
      quizzesTaken: quizzes.length,
      avgQuizScore,
      weakAreas,
    };

    const generated = await generateStudyPlan(context);

    // Upsert — one plan per user
    const saved = await prisma.studyPlan.upsert({
      where: { userId },
      create: {
        userId,
        examDate: exam,
        plan: generated.plan,
        dailyGoals: JSON.stringify(generated.dailyGoals),
        selectedLectures: JSON.stringify(selectedLectureTitles),
      },
      update: {
        examDate: exam,
        plan: generated.plan,
        dailyGoals: JSON.stringify(generated.dailyGoals),
        selectedLectures: JSON.stringify(selectedLectureTitles),
        generatedAt: now,
      },
    });

    res.json({
      id: saved.id,
      examDate: saved.examDate,
      plan: saved.plan,
      dailyGoals: JSON.parse(saved.dailyGoals),
      selectedLectures: JSON.parse(saved.selectedLectures),
      generatedAt: saved.generatedAt,
      updatedAt: saved.updatedAt,
    });
  })
);

// Delete the user's study plan
router.delete(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await prisma.studyPlan.deleteMany({
      where: { userId: req.userId! },
    });
    res.json({ success: true });
  })
);

export default router;
