import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Get all courses for user
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const courses = await prisma.course.findMany({
        where: { userId: req.userId },
        include: {
          lectures: {
            orderBy: { createdAt: 'desc' },
            include: {
              _count: { select: { flashcards: true } },
            },
          },
          _count: { select: { lectures: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Attach quiz stats (quizCount, avgScore) per lecture
      const lectureIds = courses.flatMap((c) => c.lectures.map((l) => l.id));
      const quizAggregates = await prisma.quiz.groupBy({
        by: ['lectureId'],
        where: { lectureId: { in: lectureIds }, userId: req.userId },
        _count: { id: true },
        _avg: { score: true },
      });
      // Build avgScore per lecture (avg of percentages across all quizzes for that lecture)
      const quizScoresByLecture = await prisma.quiz.findMany({
        where: { lectureId: { in: lectureIds }, userId: req.userId },
        select: { lectureId: true, score: true, total: true },
      });
      const lectureScoreMap = new Map<string, { sum: number; count: number }>();
      for (const q of quizScoresByLecture) {
        const pct = q.total > 0 ? Math.round((q.score / q.total) * 100) : 0;
        const entry = lectureScoreMap.get(q.lectureId) ?? { sum: 0, count: 0 };
        entry.sum += pct;
        entry.count += 1;
        lectureScoreMap.set(q.lectureId, entry);
      }
      const quizCountMap = new Map(quizAggregates.map((a) => [a.lectureId, a._count.id]));

      const enrichedCourses = courses.map((course) => ({
        ...course,
        lectures: course.lectures.map((lecture) => {
          const scoreEntry = lectureScoreMap.get(lecture.id);
          return {
            ...lecture,
            flashcardCount: lecture._count.flashcards,
            quizCount: quizCountMap.get(lecture.id) ?? 0,
            avgScore: scoreEntry ? Math.round(scoreEntry.sum / scoreEntry.count) : null,
          };
        }),
      }));

      res.json({ data: enrichedCourses });
    } catch (error: any) {
      res.status(500).json({ error: `Failed to fetch courses: ${error.message}` });
    }
  })
);

// Create course
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { title, description, examDate } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Course title is required' });
      }

      const course = await prisma.course.create({
        data: {
          userId: req.userId,
          title,
          description,
          examDate: examDate ? new Date(examDate) : null,
        },
        include: { _count: { select: { lectures: true } } },
      });

      res.status(201).json({ data: course });
    } catch (error: any) {
      res.status(500).json({ error: `Failed to create course: ${error.message}` });
    }
  })
);

// Get course by ID
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const course = await prisma.course.findUnique({
        where: { id: req.params.id },
        include: { lectures: true },
      });

      if (!course || course.userId !== req.userId) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.json({ data: course });
    } catch (error: any) {
      res.status(500).json({ error: `Failed to fetch course: ${error.message}` });
    }
  })
);

// Update course
router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const course = await prisma.course.findUnique({ where: { id: req.params.id } });

      if (!course || course.userId !== req.userId) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const updated = await prisma.course.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.json({ data: updated });
    } catch (error: any) {
      res.status(500).json({ error: `Failed to update course: ${error.message}` });
    }
  })
);

// Delete course
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const course = await prisma.course.findUnique({ where: { id: req.params.id } });

      if (!course || course.userId !== req.userId) {
        return res.status(404).json({ error: 'Course not found' });
      }

      await prisma.course.delete({ where: { id: req.params.id } });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: `Failed to delete course: ${error.message}` });
    }
  })
);

export default router;
