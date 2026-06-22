import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { generateQuiz } from '../services/claude.service.js';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// Generate quiz via LLM — produces 10 MCQs from the lecture summary.
// Minimum 500 characters in summary required to ensure enough content for meaningful questions.
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
      return res.status(400).json({ error: 'Lecture summary not generated yet' });
    }

    const summary = JSON.parse(lecture.summary);
    if (summary.summary.length < 500) {
      return res.status(400).json({ error: 'Lecture too short to generate quiz (min 500 words)' });
    }

    const questions = await generateQuiz(lecture.summary);

    res.json(questions);
  })
);

// Submit quiz — client sends questions with user's selected answers and the known correct answers.
// Server computes the score, persists per-question results, and stores topic metadata for weak-area analysis.
router.post(
  '/submit',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lectureId, answers } = req.body;

    if (!lectureId || !answers) {
      return res.status(400).json({ error: 'lectureId and answers are required' });
    }

    // Get lecture
    const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });

    if (!lecture || lecture.userId !== req.userId) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // Calculate score
    let score = 0;
    const quizQuestions = [];

    for (const answer of answers) {
      const isCorrect = answer.userAnswer === answer.correct;
      if (isCorrect) score++;

      quizQuestions.push({
        question: answer.question,
        options: JSON.stringify(answer.options),
        correct: answer.correct,
        userAnswer: answer.userAnswer,
        isCorrect,
        topic: answer.topic || 'General',
      });
    }

    // Create quiz record with source metadata
    const quiz = await prisma.quiz.create({
      data: {
        lectureId,
        userId: req.userId!,
        score,
        total: answers.length,
        sourceLectureTitle: lecture.title,
        sourceCreatedAt: new Date(),
        questions: {
          create: quizQuestions.map((q) => ({
            ...q,
            userId: req.userId!,
          })),
        },
      },
      include: { questions: true },
    });

    res.status(201).json({
      score: quiz.score,
      total: quiz.total,
      percentage: Math.round((quiz.score / quiz.total) * 100),
      questions: quiz.questions,
    });
  })
);

// Get quiz history for a specific lecture (with full question detail)
router.get(
  '/lecture/:lectureId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const lecture = await prisma.lecture.findUnique({ where: { id: req.params.lectureId } });
    if (!lecture || lecture.userId !== req.userId) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    const quizzes = await prisma.quiz.findMany({
      where: { lectureId: req.params.lectureId, userId: req.userId },
      orderBy: { takenAt: 'desc' },
      include: { questions: true },
    });

    const history = quizzes.map((q) => ({
      id: q.id,
      score: q.score,
      total: q.total,
      percentage: Math.round((q.score / q.total) * 100),
      takenAt: q.takenAt,
      questions: q.questions.map((qu) => ({
        id: qu.id,
        question: qu.question,
        options: typeof qu.options === 'string' ? JSON.parse(qu.options) : qu.options,
        correct: qu.correct,
        userAnswer: qu.userAnswer,
        isCorrect: qu.isCorrect,
        topic: qu.topic,
      })),
    }));

    return sendSuccess(res, history);
  })
);

// Get quiz history
router.get(
  '/history',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizzes = await prisma.quiz.findMany({
      where: { userId: req.userId },
      orderBy: { takenAt: 'desc' },
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
    });

    const history = quizzes.map((q) => ({
      id: q.id,
      lectureId: q.lecture.id,
      lectureTitle: q.lecture.title,
      courseName: q.lecture.course?.title,
      score: q.score,
      total: q.total,
      percentage: Math.round((q.score / q.total) * 100),
      sourceLectureTitle: q.sourceLectureTitle || q.lecture.title,
      sourceCreatedAt: q.sourceCreatedAt || q.takenAt,
      takenAt: q.takenAt,
    }));

    return sendSuccess(res, history);
  })
);

export default router;
